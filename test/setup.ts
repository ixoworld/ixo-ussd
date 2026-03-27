import { vi } from "vitest";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), ".env.test");
console.log("Loading test environment variables from:", envPath);
dotenv.config({ path: envPath });

// Set required environment variables for tests if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgres://test:test@localhost:5432/ixo-ussd-test";
}
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = "silent";
}
if (!process.env.PIN_ENCRYPTION_KEY) {
  process.env.PIN_ENCRYPTION_KEY = "test-encryption-key-for-unit-tests-only";
}

// Import EnvironmentSetup after env vars are set (config.ts validates on import)
const { EnvironmentSetup } = await import(
  "../tests/helpers/environment-setup.js"
);

// Initialize environment setup for tests
const environmentSetup = new EnvironmentSetup();
console.log("🔧 Test environment initialized:");
console.log(environmentSetup.getEnvironmentSummary());

// Mock Pino logger to be silent during tests
vi.mock("pino", () => {
  const createMockLogger = () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => createMockLogger()),
    // Add properties that Fastify expects
    level: "silent",
    levelVal: 0,
    serializers: {},
    [Symbol.for("pino.serializers")]: {},
    [Symbol.for("pino.stdSerializers")]: {},
  });

  return {
    default: createMockLogger,
    pino: createMockLogger,
  };
});

// Mock external HTTP calls by default
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock user service for E2E tests to avoid database connections
vi.mock("../src/services/user.js", () => ({
  userService: {
    registerUserVisit: vi.fn().mockResolvedValue({
      id: "test-user-id",
      phoneNumber: "+254712345678",
      name: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
      ixoAddress: [], // No existing accounts initially
    }),
    getUserByPhoneAndAddress: vi.fn().mockResolvedValue(null),
    updateIxoAddressPin: vi.fn().mockResolvedValue(undefined),
    provisionIxoAccountAndUpdateUser: vi.fn().mockResolvedValue(undefined),
  },
  verifyIxoAddressPin: vi.fn().mockResolvedValue(true),
}));

// Set test timeout globally (30 seconds for USSD flows)
if (typeof globalThis !== "undefined") {
  // Vitest global timeout is handled in config
}
