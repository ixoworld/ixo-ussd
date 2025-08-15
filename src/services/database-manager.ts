/**
 * Centralized Database Connection Manager
 *
 * Provides idempotent pool management to prevent "Called end on pool more than once" errors
 * during test teardown and application shutdown.
 */
import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { createModuleLogger } from "./logger.js";
import { ENV } from "../config.js";
import type { Database } from "../db/index.js";

const logger = createModuleLogger("database-manager");

interface DatabaseConnectionConfig {
  database?: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  maxConnections?: number;
}

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private pool: Pool | null = null;
  private kysely: Kysely<Database> | null = null;
  private isEnding: boolean = false;
  private hasEnded: boolean = false;
  private connectionConfig: DatabaseConnectionConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance of DatabaseManager
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connections with configuration
   */
  async initialize(config?: DatabaseConnectionConfig): Promise<void> {
    logger.info("🔌 DatabaseManager.initialize() called");

    if (this.pool && !this.hasEnded) {
      try {
        await this.pool.query("SELECT 1");
        logger.info("Database connection valid, reusing existing connection");
        return;
      } catch (error) {
        logger.warn("Existing connection invalid, reinitializing");
        await this.close(); // Clean up invalid pool
      }
    }
    if (this.hasEnded) {
      // Reset state if previously ended
      this.hasEnded = false;
      this.isEnding = false;
      this.pool = null;
      this.kysely = null;
    }

    const dbConfig: DatabaseConnectionConfig = {
      database: config?.database || process.env.PG_DATABASE,
      user: config?.user || process.env.PG_USER,
      password: config?.password || process.env.PG_PASSWORD,
      host: config?.host || process.env.PG_HOST || "localhost",
      port:
        config?.port ||
        (process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432),
      maxConnections: config?.maxConnections || 5,
    };

    this.connectionConfig = dbConfig;

    logger.info(
      {
        database: dbConfig.database,
        user: dbConfig.user,
        host: dbConfig.host,
        port: dbConfig.port,
        maxConnections: dbConfig.maxConnections,
      },
      "🔌 Initializing database connections"
    );

    const ssl =
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false;

    try {
      // Create PostgreSQL pool
      this.pool = new Pool({
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        host: dbConfig.host,
        port: dbConfig.port,
        max: dbConfig.maxConnections,
        ssl,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });

      // Add event listeners for monitoring and debugging
      this.pool.on("error", err => {
        logger.error(
          {
            error: err.message,
            code: (err as any).code || "unknown",
            database: dbConfig.database,
            host: dbConfig.host,
          },
          "PostgreSQL pool error on idle client"
        );
      });

      this.pool.on("connect", client => {
        logger.debug(
          {
            connectionId: (client as any).processID || "unknown",
            database: dbConfig.database,
          },
          "PostgreSQL client connected"
        );
      });

      this.pool.on("remove", client => {
        logger.debug(
          {
            connectionId: (client as any).processID || "unknown",
            database: dbConfig.database,
          },
          "PostgreSQL client removed from pool"
        );
      });

      // Create Kysely instance
      this.kysely = new Kysely({
        dialect: new PostgresDialect({
          pool: this.pool,
        }),
      });

      // Test connection
      await this.pool.query("SELECT NOW()");
      logger.info("✅ Database connections initialized successfully");
    } catch (error) {
      // Create safe config for logging (exclude sensitive information)
      const safeConfig = {
        database: dbConfig.database,
        user: dbConfig.user,
        host: dbConfig.host,
        port: dbConfig.port,
        maxConnections: dbConfig.maxConnections,
        // password intentionally excluded for security
      };

      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          config: safeConfig,
        },
        "Failed to initialize database connections"
      );
      throw error;
    }
  }

  /**
   * Get the PostgreSQL pool instance
   */
  getPool(): Pool {
    if (!this.pool || this.hasEnded) {
      throw new Error(
        "Database not initialized or has been closed. Call initialize() first."
      );
    }
    return this.pool;
  }

  /**
   * Get the Kysely instance
   */
  getKysely(): Kysely<Database> {
    if (!this.kysely || this.hasEnded) {
      throw new Error(
        "Database not initialized or has been closed. Call initialize() first."
      );
    }
    return this.kysely;
  }

  /**
   * Check if database connections are ready
   */
  isReady(): boolean {
    return !!(this.pool && this.kysely && !this.hasEnded && !this.isEnding);
  }

  /**
   * Idempotent cleanup - ensures pool is only ended once
   */
  async close(): Promise<void> {
    // Return immediately if already ending or ended
    if (this.isEnding || this.hasEnded) {
      logger.debug("Database close already in progress or completed");
      return;
    }

    // Mark as ending to prevent concurrent close attempts
    this.isEnding = true;

    logger.info("Starting database connection cleanup");

    try {
      // Close Kysely first (this should close gracefully)
      if (this.kysely) {
        await this.kysely.destroy();
        this.kysely = null;
        logger.debug("Kysely instance destroyed");
      }

      // Close PostgreSQL pool
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        logger.debug("PostgreSQL pool ended");
      }

      this.hasEnded = true;
      logger.info("Database connections closed successfully");
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Error during database cleanup"
      );

      // Mark as ended even if there was an error to prevent retry loops
      this.hasEnded = true;

      // In test environment, log but don't throw to avoid breaking test teardown
      if (ENV.IS_TEST) {
        logger.warn(
          "Non-critical cleanup error in test environment, continuing..."
        );
      } else {
        throw error;
      }
    } finally {
      this.isEnding = false;
    }
  }

  /**
   * Force reset for testing (use with caution)
   * Only available in test environment for safety
   */
  async forceReset(): Promise<void> {
    // Safety check: only allow in test environment
    if (!ENV.IS_DEV_OR_TEST) {
      throw new Error(
        "forceReset() is only allowed in test or development environment for safety"
      );
    }

    logger.warn("Force resetting database manager (test mode only)");

    this.isEnding = false;
    this.hasEnded = false;

    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error) {
        // Ignore errors during force reset
        logger.debug("Ignoring error during force reset");
      }
    }

    this.pool = null;
    this.kysely = null;
    this.connectionConfig = null;
  }

  /**
   * Get current connection status for debugging
   */
  getStatus() {
    // Create safe config for status (exclude sensitive information)
    const safeConfig = this.connectionConfig
      ? {
          database: this.connectionConfig.database,
          user: this.connectionConfig.user,
          host: this.connectionConfig.host,
          port: this.connectionConfig.port,
          maxConnections: this.connectionConfig.maxConnections,
          // password intentionally excluded for security
        }
      : null;

    return {
      hasPool: !!this.pool,
      hasKysely: !!this.kysely,
      isEnding: this.isEnding,
      hasEnded: this.hasEnded,
      isReady: this.isReady(),
      config: safeConfig,
    };
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();
export default databaseManager;
