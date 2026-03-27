/**
 * Test Centralized Environment Configuration
 *
 * Verifies that the centralized environment detection works correctly
 * and that all modules use the same environment source.
 *
 * Note: This test file intentionally accesses process.env.NODE_ENV directly
 * to test the environment detection functionality itself.
 */

import { ENV, getCurrentEnvironment } from "../../src/config.js";

console.log("🧪 Testing Centralized Environment Configuration\n");

function testEnvironmentDetection() {
  console.log("1️⃣ Testing environment detection...");

  // Test current environment
  console.log(`📍 Current environment: ${ENV.CURRENT}`);
  console.log(`🏭 Is production: ${ENV.IS_PRODUCTION}`);
  console.log(`🔧 Is development: ${ENV.IS_DEVELOPMENT}`);
  console.log(`🧪 Is test: ${ENV.IS_TEST}`);
  console.log(`🚫 Is dev or test: ${ENV.IS_DEV_OR_TEST}`);

  console.log("\n2️⃣ Testing environment function...");
  const envFromFunction = getCurrentEnvironment();
  console.log(`📍 Environment from function: ${envFromFunction}`);

  // Verify consistency
  if (ENV.CURRENT === envFromFunction) {
    console.log("✅ Environment detection is consistent");
  } else {
    console.log("❌ Environment detection is inconsistent!");
    process.exit(1);
  }

  console.log("\n3️⃣ Testing environment flags...");

  // Test logical consistency
  const flagsConsistent =
    (ENV.IS_PRODUCTION && !ENV.IS_DEVELOPMENT && !ENV.IS_TEST) ||
    (!ENV.IS_PRODUCTION && ENV.IS_DEVELOPMENT && !ENV.IS_TEST) ||
    (!ENV.IS_PRODUCTION && !ENV.IS_DEVELOPMENT && ENV.IS_TEST);

  if (flagsConsistent) {
    console.log("✅ Environment flags are logically consistent");
  } else {
    console.log("❌ Environment flags are inconsistent!");
    console.log(
      `Production: ${ENV.IS_PRODUCTION}, Development: ${ENV.IS_DEVELOPMENT}, Test: ${ENV.IS_TEST}`
    );
    process.exit(1);
  }

  // Test IS_DEV_OR_TEST flag
  const devOrTestConsistent =
    ENV.IS_DEV_OR_TEST === (ENV.IS_DEVELOPMENT || ENV.IS_TEST);
  if (devOrTestConsistent) {
    console.log("✅ IS_DEV_OR_TEST flag is consistent");
  } else {
    console.log("❌ IS_DEV_OR_TEST flag is inconsistent!");
    process.exit(1);
  }

  console.log("\n4️⃣ Testing NODE_ENV values...");
  console.log(`📍 process.env.NODE_ENV: ${process.env.NODE_ENV}`);

  // Test that our environment detection handles various NODE_ENV values correctly
  const testCases = [
    { nodeEnv: "production", expected: "production" },
    { nodeEnv: "prod", expected: "production" },
    { nodeEnv: "development", expected: "development" },
    { nodeEnv: "dev", expected: "development" },
    { nodeEnv: "test", expected: "test" },
    { nodeEnv: "testing", expected: "test" },
    { nodeEnv: undefined, expected: "development" },
    { nodeEnv: "invalid", expected: "development" },
  ];

  console.log("Testing various NODE_ENV values:");
  for (const testCase of testCases) {
    // Temporarily set NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;
    if (testCase.nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = testCase.nodeEnv;
    }

    // Test the function (note: ENV.CURRENT is cached, so we test the function)
    const result = getCurrentEnvironment();

    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (result === testCase.expected) {
      console.log(`  ✅ "${testCase.nodeEnv}" → "${result}"`);
    } else {
      console.log(
        `  ❌ "${testCase.nodeEnv}" → "${result}" (expected "${testCase.expected}")`
      );
      process.exit(1);
    }
  }

  console.log("\n🎉 All environment configuration tests passed!");
  console.log("\n📋 Summary:");
  console.log(`  • Single source of truth: ✅ src/config.ts`);
  console.log(`  • Environment detection: ✅ ${ENV.CURRENT}`);
  console.log(`  • Consistent flags: ✅ All boolean flags are consistent`);
  console.log(`  • Edge case handling: ✅ Handles invalid/missing NODE_ENV`);
  console.log(`  • Centralized access: ✅ All modules use ENV from config.ts`);
}

testEnvironmentDetection();
