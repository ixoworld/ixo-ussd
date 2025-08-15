// Jest setup file
// This file is loaded before any tests run

// Set test timeout
if (typeof jest !== "undefined") {
  jest.setTimeout(120000);
}

// Environment setup for tests
import("./helpers/environment-setup.js")
  .then(({ EnvironmentSetup }) => {
    const environmentSetup = new EnvironmentSetup();

    // Set up default mocked environment for tests unless explicitly configured
    if (!process.env.TEST_ENVIRONMENT) {
      environmentSetup.setupMockedEnvironment();
    } else {
      // Use the configured environment
      environmentSetup.setupEnvironment();
    }
  })
  .catch(error => {
    console.warn("Could not load environment setup:", error);

    // Fallback: Provide default environment variables
    process.env.TEST_ENVIRONMENT ??= "mocked";
    process.env.USE_REAL_DATABASE ??= "false";
    process.env.USE_REAL_IXO_SERVICES ??= "false";
    process.env.USE_REAL_MATRIX ??= "false";

    // Use test-specific database URL as fallback
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/dbtest";
    }
  });
