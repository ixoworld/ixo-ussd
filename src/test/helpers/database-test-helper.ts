/**
 * Database Test Helper
 *
 * Provides test-specific database connection management to prevent
 * "Called end on pool more than once" errors during E2E test teardown.
 */
import { databaseManager } from "../../services/database-manager.js";
import { createModuleLogger } from "../../services/logger.js";
import { ENV, config } from "../../config.js";

const logger = createModuleLogger("database-test-helper");

// Module-level state
let isInitialized = false;
let testIdCounter = 0;

/**
 * Validate required environment variables for database connection
 * Uses centralized config which handles both DATABASE_URL and individual vars
 */
function validateEnvironment(): void {
  try {
    // Test that we can get valid database config
    const dbConfig = config.DATABASE.PG;

    // Validate required fields
    if (!dbConfig.database || !dbConfig.user || !dbConfig.host) {
      throw new Error("Missing required database configuration");
    }

    if (isNaN(dbConfig.port) || dbConfig.port <= 0 || dbConfig.port > 65535) {
      throw new Error(`Invalid port: ${dbConfig.port}`);
    }

    logger.debug("Database configuration validated successfully");
  } catch (error) {
    throw new Error(
      `Database configuration validation failed: ${error instanceof Error ? error.message : String(error)}. ` +
        "Please ensure DATABASE_URL is valid or all required PG_* environment variables are properly set."
    );
  }
}

/**
 * Initialize database for testing
 * Call this once before all tests
 */
export async function initializeForTests(): Promise<void> {
  if (isInitialized) {
    logger.debug("Database already initialized for tests");
    return;
  }

  try {
    // Validate environment variables before proceeding
    validateEnvironment();

    // Use centralized database configuration
    const dbConfig = config.DATABASE.PG;

    // Initialize with test-specific configuration
    await databaseManager.initialize({
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      maxConnections: 5, // Smaller pool for tests
    });

    isInitialized = true;
    logger.info("Database initialized for tests");
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to initialize database for tests"
    );
    throw error;
  }
}

/**
 * Ensure database is ready for the current test
 * Call this in beforeEach hooks
 */
export async function ensureReady(): Promise<void> {
  const testId = ++testIdCounter;

  if (!databaseManager.isReady()) {
    logger.debug({ testId }, "Database not ready, initializing...");
    await initializeForTests();
  } else {
    logger.debug({ testId }, "Database already ready");
  }
}

/**
 * Clean up after all tests
 * Call this once in afterAll hooks
 */
export async function cleanup(): Promise<void> {
  if (!isInitialized) {
    logger.debug("Database not initialized, nothing to clean up");
    return;
  }

  try {
    await databaseManager.close();
    isInitialized = false;
    logger.info("Database cleaned up after tests");
  } catch (error) {
    // Log but don't throw during cleanup
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Non-critical error during database cleanup"
    );
  }
}

/**
 * Force reset for problematic test scenarios
 * Use with caution - only for test recovery
 * Only available in test environment for safety
 */
export async function forceReset(): Promise<void> {
  // Safety check: only allow in test environment
  if (!ENV.IS_DEV_OR_TEST) {
    throw new Error(
      "forceReset() is only allowed in test or development environment for safety. " +
        `Current environment: ${ENV.CURRENT}`
    );
  }

  logger.warn("Force resetting database helper");

  try {
    await databaseManager.forceReset();
    isInitialized = false;
    testIdCounter = 0;
  } catch (error) {
    // Ignore errors during force reset
    logger.debug("Ignoring error during force reset");
  }
}

/**
 * Get database connection status for debugging
 */
export function getStatus() {
  return {
    isInitialized,
    testIdCounter,
    databaseManager: databaseManager.getStatus(),
  };
}

// For backward compatibility, export a default object with all functions
export default {
  initializeForTests,
  ensureReady,
  cleanup,
  forceReset,
  getStatus,
};
