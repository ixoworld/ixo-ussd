import { config, ENV } from "../../config.js";
import { getIxoConfig } from "../../services/ixo/config.js";

export type TestEnvironment = "real" | "mocked";

export interface EnvironmentConfig {
  environment: TestEnvironment;
  useRealDatabase: boolean;
  useRealIxoServices: boolean;
  useRealMatrix: boolean;
  mockDataPath?: string;
  logLevel: "debug" | "info" | "warn" | "error" | "silent";
}

export interface MockedServices {
  database: boolean;
  ixoQueries: boolean;
  ixoTransactions: boolean;
  matrix: boolean;
  userService: boolean;
}

export class EnvironmentSetup {
  private currentConfig: EnvironmentConfig;
  private originalEnvVars: Record<string, string | undefined> = {};

  constructor() {
    this.currentConfig = this.getDefaultConfig();
  }

  /**
   * Get the default environment configuration
   */
  private getDefaultConfig(): EnvironmentConfig {
    const environment =
      (process.env.TEST_ENVIRONMENT as TestEnvironment) || "mocked";

    return {
      environment,
      useRealDatabase:
        environment === "real" && process.env.USE_REAL_DATABASE === "true",
      useRealIxoServices:
        environment === "real" && process.env.USE_REAL_IXO_SERVICES === "true",
      useRealMatrix:
        environment === "real" && process.env.USE_REAL_MATRIX === "true",
      mockDataPath: process.env.MOCK_DATA_PATH || "src/test/fixtures/mock-data",
      logLevel: (process.env.TEST_LOG_LEVEL as any) || "warn",
    };
  }

  /**
   * Set up environment for testing
   */
  setupEnvironment(config: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
    // Merge with current config
    this.currentConfig = {
      ...this.currentConfig,
      ...config,
    };

    // Store original environment variables
    this.storeOriginalEnvVars();

    // Set environment variables based on config
    this.setEnvironmentVariables();

    // Validate configuration
    this.validateConfiguration();

    console.log(`🔧 Environment setup: ${this.currentConfig.environment}`);
    console.log(`📊 Configuration:`, {
      database: this.currentConfig.useRealDatabase ? "real" : "mocked",
      ixoServices: this.currentConfig.useRealIxoServices ? "real" : "mocked",
      matrix: this.currentConfig.useRealMatrix ? "real" : "mocked",
      logLevel: this.currentConfig.logLevel,
    });

    return this.currentConfig;
  }

  /**
   * Restore original environment
   */
  restoreEnvironment(): void {
    // Restore original environment variables
    for (const [key, value] of Object.entries(this.originalEnvVars)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    console.log("🔄 Environment restored to original state");
  }

  /**
   * Get current environment configuration
   */
  getCurrentConfig(): EnvironmentConfig {
    return { ...this.currentConfig };
  }

  /**
   * Check if running in mocked environment
   */
  isMocked(): boolean {
    return this.currentConfig.environment === "mocked";
  }

  /**
   * Check if running in real environment
   */
  isReal(): boolean {
    return this.currentConfig.environment === "real";
  }

  /**
   * Get mocked services status
   */
  getMockedServices(): MockedServices {
    return {
      database: !this.currentConfig.useRealDatabase,
      ixoQueries: !this.currentConfig.useRealIxoServices,
      ixoTransactions: !this.currentConfig.useRealIxoServices,
      matrix: !this.currentConfig.useRealMatrix,
      userService: !this.currentConfig.useRealDatabase,
    };
  }

  /**
   * Set up mocked environment (convenience method)
   */
  setupMockedEnvironment(): EnvironmentConfig {
    return this.setupEnvironment({
      environment: "mocked",
      useRealDatabase: false,
      useRealIxoServices: false,
      useRealMatrix: false,
      logLevel: "silent",
    });
  }

  /**
   * Set up real environment (convenience method)
   */
  setupRealEnvironment(
    options: {
      useRealDatabase?: boolean;
      useRealIxoServices?: boolean;
      useRealMatrix?: boolean;
    } = {}
  ): EnvironmentConfig {
    return this.setupEnvironment({
      environment: "real",
      useRealDatabase: options.useRealDatabase ?? true,
      useRealIxoServices: options.useRealIxoServices ?? true,
      useRealMatrix: options.useRealMatrix ?? true,
      logLevel: "info",
    });
  }

  /**
   * Store original environment variables
   */
  private storeOriginalEnvVars(): void {
    const envVarsToStore = [
      "TEST_ENVIRONMENT",
      "USE_REAL_DATABASE",
      "USE_REAL_IXO_SERVICES",
      "USE_REAL_MATRIX",
      "MOCK_DATA_PATH",
      "TEST_LOG_LEVEL",
      "NODE_ENV",
      "DATABASE_URL",
    ];

    for (const varName of envVarsToStore) {
      this.originalEnvVars[varName] = process.env[varName];
    }
  }

  /**
   * Set environment variables based on configuration
   */
  private setEnvironmentVariables(): void {
    process.env.TEST_ENVIRONMENT = this.currentConfig.environment;
    process.env.USE_REAL_DATABASE =
      this.currentConfig.useRealDatabase.toString();
    process.env.USE_REAL_IXO_SERVICES =
      this.currentConfig.useRealIxoServices.toString();
    process.env.USE_REAL_MATRIX = this.currentConfig.useRealMatrix.toString();
    process.env.TEST_LOG_LEVEL = this.currentConfig.logLevel;

    if (this.currentConfig.mockDataPath) {
      process.env.MOCK_DATA_PATH = this.currentConfig.mockDataPath;
    }

    // Set NODE_ENV for testing
    // Note: This must be set before any config imports to ensure proper environment detection
    // This is one of the few legitimate places where direct NODE_ENV manipulation is required
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "test";
    }

    // Set test database URLs if using mocked environment
    if (!this.currentConfig.useRealDatabase) {
      process.env.DATABASE_URL =
        process.env.TEST_DATABASE_URL ||
        "postgresql://test:test@localhost:5432/test_db";
    }
  }

  /**
   * Validate environment configuration
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // Check for conflicting configurations
    if (this.currentConfig.environment === "mocked") {
      if (
        this.currentConfig.useRealDatabase ||
        this.currentConfig.useRealIxoServices ||
        this.currentConfig.useRealMatrix
      ) {
        errors.push("Mocked environment should not use real services");
      }
    }

    // Skip validation in test environment unless explicitly requested
    const isTestEnv = ENV.IS_ANY_TEST;
    const skipValidation = isTestEnv && !process.env.FORCE_ENV_VALIDATION;

    // Check for required environment variables in real mode (skip in test environment)
    if (this.currentConfig.environment === "real" && !skipValidation) {
      if (this.currentConfig.useRealDatabase) {
        if (!config.DATABASE.URL && !config.DATABASE.PG.database) {
          errors.push("Real database requires DATABASE_URL or database config");
        }
      }

      if (this.currentConfig.useRealIxoServices) {
        if (!getIxoConfig().chainRpcUrl) {
          errors.push("Real IXO services require RPC endpoint configuration");
        }
      }

      if (this.currentConfig.useRealMatrix) {
        if (!config.MATRIX?.homeServerUrl) {
          errors.push("Real Matrix requires homeserver URL configuration");
        }
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Environment configuration errors:\n${errors.map(e => `  - ${e}`).join("\n")}`;
      console.error("❌ " + errorMessage);
      throw new Error(errorMessage);
    }

    if (skipValidation && this.currentConfig.environment === "real") {
      console.log("⚠️ Environment validation skipped in test mode");
    } else {
      console.log("✅ Environment configuration validated");
    }
  }

  /**
   * Get environment-specific database URL
   */
  getDatabaseUrl(): string {
    if (this.currentConfig.useRealDatabase) {
      return config.DATABASE.URL || "";
    } else {
      return (
        process.env.TEST_DATABASE_URL ||
        "postgresql://test:test@localhost:5432/test_db"
      );
    }
  }

  /**
   * Create a summary of the current environment setup
   */
  getEnvironmentSummary(): string {
    const config = this.currentConfig;
    const mockedServices = this.getMockedServices();

    const lines = [
      `Environment: ${config.environment.toUpperCase()}`,
      `Log Level: ${config.logLevel}`,
      "",
      "Services:",
      `  Database: ${mockedServices.database ? "MOCKED" : "REAL"}`,
      `  IXO Services: ${mockedServices.ixoQueries ? "MOCKED" : "REAL"}`,
      `  Matrix: ${mockedServices.matrix ? "MOCKED" : "REAL"}`,
      "",
      "URLs:",
      `  Database: ${this.getDatabaseUrl()}`,
    ];

    if (config.mockDataPath) {
      lines.push(`  Mock Data: ${config.mockDataPath}`);
    }

    return lines.join("\n");
  }
}

// Singleton instance for global use
export const environmentSetup = new EnvironmentSetup();
