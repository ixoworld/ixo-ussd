import path from "path";
import { environmentSetup } from "./helpers/environment-setup.js";
import { mockServiceFactory } from "./helpers/mock-services.js";
import dotenv from "dotenv";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), ".env.test");
console.log("Loading test environment variables from:", envPath);
dotenv.config({ path: envPath });

// Initialize environment setup for tests
const testConfig = environmentSetup.setupEnvironment();
console.log("🔧 Test environment initialized:");
console.log(environmentSetup.getEnvironmentSummary());

// Store original console methods
// const originalConsole = { ...console };

// Only mock console methods to avoid noise in test output
// global.console = {
//   ...console,
//   log: (...args: any[]) => {
//     if (args[0]?.includes("database") || args[0]?.includes("Database")) {
//       originalConsole.log(...args);
//     }
//   },
//   debug: jest.fn(),
//   error: (...args: any[]) => {
//     originalConsole.error(...args);
//   },
// };

// Set default test values for required environment variables if not set
const defaultTestValues = {
  CHAIN_NETWORK: "testnet",
  MATRIX_HOME_SERVER: "https://test.matrix.org",
  MATRIX_REGISTRATION_TOKEN: "test_token",
  MATRIX_BOT_URL: "https://test.bot.matrix.org",
  FEEGRANT_URL: "https://test.feegrant.com",
  FEEGRANT_AUTH: "test_auth_token",
  SERVICE_CODES: "*1234#",
};

// Set default values for missing environment variables
for (const [envVar, defaultValue] of Object.entries(defaultTestValues)) {
  if (!process.env[envVar]) {
    process.env[envVar] = defaultValue;
  }
}

// Verify required environment variables are now set
const requiredEnvVars = [
  "CHAIN_NETWORK",
  "MATRIX_HOME_SERVER",
  "MATRIX_REGISTRATION_TOKEN",
  "MATRIX_BOT_URL",
  "FEEGRANT_URL",
  "FEEGRANT_AUTH",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Log test environment configuration
console.log("Test environment configured with:");
console.log(`- Chain Network: ${process.env.CHAIN_NETWORK}`);
console.log(`- Matrix Homeserver: ${process.env.MATRIX_HOME_SERVER}`);
console.log(`- Feegrant URL: ${process.env.FEEGRANT_URL}`);

// Setup global test hooks
beforeEach(async () => {
  // Reset mock services if using mocked environment
  if (testConfig.environment === "mocked") {
    mockServiceFactory.reset();
  }
});
