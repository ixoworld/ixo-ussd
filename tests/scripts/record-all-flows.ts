#!/usr/bin/env ts-node
/**
 * Record All USSD Flows
 *
 * Programmatically walks every USSD user flow against a running server,
 * generating JSON fixture files and Vitest test files.
 *
 * Usage:
 *   pnpm record:flows
 *
 * Prerequisites:
 *   - USSD server running at SERVER_URL (default: http://127.0.0.1:3005/api/ussd)
 *   - PostgreSQL database accessible via DATABASE_URL
 *   - Clean/seeded database state
 *
 * Environment Variables:
 *   - SERVER_URL: Override USSD server endpoint
 *   - DATABASE_URL: PostgreSQL connection string for mid-flow DB queries
 *
 * Flows recorded (example machine):
 *   Phase 1: Pre-auth (Know More menu navigation, back navigation)
 *   Phase 2: Account creation (full, skip email, skip both, PIN mismatch)
 *   Phase 3: Login (success, wrong PIN, invalid customer ID)
 *   Phase 4: Navigation edge cases (exit from any menu, back navigation chain)
 *
 * To add custom flows for your fork:
 *   1. Copy this file or extend the phases
 *   2. Add new flow definitions following the same pattern
 *   3. Run: pnpm record:flows
 */

import fs from "fs";
import path from "path";
import pg from "pg";
import { SessionFixture } from "../helpers/session-recorder.js";
import { VitestGenerator, FlowMetadata } from "../utils/vitest-generator.js";

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:3005/api/ussd";
const DATABASE_URL = process.env.DATABASE_URL;
const PHONE_NUMBER = "+260971230001";
const SERVICE_CODE = "*2233#";
const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "flows");
const REQUEST_DELAY_MS = 500;

// PIN used during account creation flows (user-chosen, 5 digits)
const TEST_PIN = "43219";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
let sessionCounter = 0;

function generateSessionId(flowName: string): string {
  sessionCounter++;
  const ts = Date.now();
  return `rec-${flowName.replace(/[^a-zA-Z0-9-]/g, "")}-${ts}-${sessionCounter}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build cumulative USSD text from individual inputs up to the given index.
 * Initial dial (empty string "") is skipped in cumulation.
 */
function buildCumulativeText(inputs: string[], upToIndex: number): string {
  const parts: string[] = [];
  for (let i = 0; i <= upToIndex; i++) {
    if (inputs[i] !== "") {
      parts.push(inputs[i]);
    }
  }
  return parts.join("*");
}

/**
 * Send a single USSD request and return the raw response text.
 */
async function sendUssdRequest(
  sessionId: string,
  cumulativeText: string
): Promise<string> {
  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "FlowRecorder/1.0",
    },
    body: JSON.stringify({
      sessionId,
      serviceCode: SERVICE_CODE,
      phoneNumber: PHONE_NUMBER,
      text: cumulativeText,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server error ${response.status}: ${errorText}`);
  }

  return response.text();
}

// ──────────────────────────────────────────────
// Database helpers
// ──────────────────────────────────────────────
let dbPool: pg.Pool | null = null;

function getDbPool(): pg.Pool {
  if (!dbPool) {
    if (!DATABASE_URL) {
      throw new Error(
        "DATABASE_URL environment variable is required for DB queries"
      );
    }
    dbPool = new pg.Pool({ connectionString: DATABASE_URL });
  }
  return dbPool;
}

async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const pool = getDbPool();
  const result = await pool.query(sql, params);
  return result.rows;
}

async function getFirstCustomerId(): Promise<string | null> {
  const rows = await dbQuery(
    "SELECT customer_id FROM customers ORDER BY created_at ASC LIMIT 1"
  );
  return rows.length > 0 ? rows[0].customer_id : null;
}

async function closeDb(): Promise<void> {
  if (dbPool) {
    await dbPool.end();
    dbPool = null;
  }
}

// ──────────────────────────────────────────────
// Core recording function
// ──────────────────────────────────────────────
/**
 * Record a single USSD flow by sending a sequence of inputs.
 * Returns a SessionFixture with all recorded turns.
 */
async function recordFlow(
  flowName: string,
  inputs: string[],
  description: string
): Promise<SessionFixture> {
  const sessionId = generateSessionId(flowName);
  console.log(`\n🔴 Recording: ${flowName}`);
  console.log(`   ${description}`);
  console.log(`   Session: ${sessionId}`);
  console.log(`   Steps: ${inputs.length}`);

  const turns: SessionFixture["turns"] = [];

  for (let i = 0; i < inputs.length; i++) {
    const cumulativeText = buildCumulativeText(inputs, i);
    const individualInput = inputs[i];

    try {
      const response = await sendUssdRequest(sessionId, cumulativeText);
      turns.push({
        textSent: individualInput,
        serverReply: response,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      const prefix = response.startsWith("END ") ? "🔚" : "📱";
      console.log(
        `   ${prefix} [${i + 1}/${inputs.length}] "${individualInput}" → ${response.substring(0, 60)}...`
      );

      // Break early if session ended
      if (response.startsWith("END ")) {
        if (i < inputs.length - 1) {
          console.log(`   ⚠️  Session ended early at step ${i + 1}`);
        }
        break;
      }

      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      console.error(
        `   ❌ Error at step ${i + 1}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  const fixture: SessionFixture = {
    flowName,
    timestamp: new Date().toISOString(),
    sessionId,
    phoneNumber: PHONE_NUMBER,
    serviceCode: SERVICE_CODE,
    turns,
  };

  console.log(`   ✅ Recorded ${turns.length} turns`);
  return fixture;
}

/**
 * Save a fixture to JSON and generate its test file.
 */
function saveFixtureAndTest(
  fixture: SessionFixture,
  metadata?: FlowMetadata
): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const jsonPath = path.join(FIXTURES_DIR, `${fixture.flowName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(fixture, null, 2));
  console.log(`   📁 Saved fixture: ${jsonPath}`);

  const generator = new VitestGenerator();
  const testCode = generator.generateTestFile(
    fixture,
    fixture.flowName,
    metadata
  );
  const testPath = path.join(FIXTURES_DIR, `${fixture.flowName}.test.ts`);
  fs.writeFileSync(testPath, testCode);
  console.log(`   📝 Generated test: ${testPath}`);
}

/**
 * Delete all existing stale .json and .test.ts files in fixtures/flows/
 * Preserves setup.ts and README.md
 */
function cleanFixturesDir(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(FIXTURES_DIR);
  let deleted = 0;
  for (const file of files) {
    if (file === "setup.ts" || file === "README.md") continue;
    if (file.endsWith(".test.ts") || file.endsWith(".json")) {
      fs.unlinkSync(path.join(FIXTURES_DIR, file));
      deleted++;
    }
  }
  console.log(`🗑️  Cleaned ${deleted} stale files from ${FIXTURES_DIR}`);
}

// ──────────────────────────────────────────────
// Main recording orchestrator
// ──────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("  USSD Flow Recorder — Recording all example machine flows");
  console.log(`  Server: ${SERVER_URL}`);
  console.log(`  Phone: ${PHONE_NUMBER}`);
  console.log(`  Output: ${FIXTURES_DIR}`);
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );

  // Step 0: Clean existing fixtures
  cleanFixturesDir();

  const recorded: Array<{ fixture: SessionFixture; metadata?: FlowMetadata }> =
    [];
  let customerId: string | null = null;

  try {
    // ════════════════════════════════════════════
    // Phase 1: Pre-auth flows — Empty DB
    // ════════════════════════════════════════════
    console.log("\n\n═══ Phase 1: Pre-auth flows ═══");

    // Flow 1: know-more-flow
    // The know-more menu has: 1. Interested in Product, 2. Pricing & accessories, 3. Can we deliver to you?
    // All options route to sendSMS which shows a generic info message
    recorded.push({
      fixture: await recordFlow(
        "01-know-more-flow",
        [
          "", // Initial dial → welcome menu
          "1", // Know More → info menu
          "1", // Interested in Product → SMS sent message
          "1", // Back to Main Menu → main menu
        ],
        "Browse know more menu, select first option, return to main"
      ),
    });

    // Flow 2: know-more-back-navigation
    recorded.push({
      fixture: await recordFlow(
        "01-know-more-back-navigation",
        [
          "", // Initial dial → welcome menu
          "1", // Know More → info menu
          "2", // Pricing & accessories → SMS sent message
          "0", // Back → info menu
          "3", // Can we deliver to you? → SMS sent message
          "0", // Back → info menu
          "0", // Back → main menu
        ],
        "Navigate through know more menu options with back navigation"
      ),
    });

    // ════════════════════════════════════════════
    // Phase 2: Account creation flows
    // Note: example machine has no national ID step
    // Flow: name → email → PIN → confirm PIN → creating account
    // ════════════════════════════════════════════
    console.log("\n\n═══ Phase 2: Account creation flows ═══");

    // Flow 3: create-account-full
    recorded.push({
      fixture: await recordFlow(
        "02-create-account-full",
        [
          "", // Initial dial → welcome menu
          "2", // Account Menu → account menu
          "2", // Create Account → enter name
          "John Doe", // Name → enter email
          "john@test.com", // Email → enter PIN
          TEST_PIN, // PIN → confirm PIN
          TEST_PIN, // Confirm PIN → creating account...
          "1", // Continue → success page
          "1", // Return to main menu
        ],
        "Full account creation with all fields"
      ),
      metadata: { hasCustomerIdInResponse: true },
    });

    // Flow 4: create-account-skip-email
    recorded.push({
      fixture: await recordFlow(
        "02-create-account-skip-email",
        [
          "", // Initial dial
          "2", // Account Menu
          "2", // Create Account → enter name
          "Jane Smith", // Name → enter email
          "00", // Skip email → enter PIN
          TEST_PIN, // PIN → confirm PIN
          TEST_PIN, // Confirm PIN → creating account
          "1", // Continue → success
          "1", // Return to main menu
        ],
        "Account creation skipping email"
      ),
      metadata: { hasCustomerIdInResponse: true },
    });

    // Flow 5: create-account-skip-both (only email can be skipped in example machine)
    recorded.push({
      fixture: await recordFlow(
        "02-create-account-skip-both",
        [
          "", // Initial dial
          "2", // Account Menu
          "2", // Create Account → enter name
          "Alice Brown", // Name → enter email
          "00", // Skip email → enter PIN
          TEST_PIN, // PIN → confirm PIN
          TEST_PIN, // Confirm PIN → creating account
          "1", // Continue → success
          "1", // Return to main menu
        ],
        "Account creation skipping email (example machine has no national ID field)"
      ),
      metadata: { hasCustomerIdInResponse: true },
    });

    // Flow 6: create-account-pin-mismatch
    recorded.push({
      fixture: await recordFlow(
        "02-create-account-pin-mismatch",
        [
          "", // Initial dial
          "2", // Account Menu
          "2", // Create Account → enter name
          "Charlie Davis", // Name → enter email
          "00", // Skip email → enter PIN
          TEST_PIN, // PIN → confirm PIN
          "99999", // Wrong confirm PIN → mismatch error, back to PIN entry
          TEST_PIN, // Re-enter PIN → confirm PIN
          TEST_PIN, // Correct confirm PIN → creating account
          "1", // Continue → success
          "1", // Return to main menu
        ],
        "Account creation with PIN mismatch then correct"
      ),
      metadata: { hasCustomerIdInResponse: true },
    });

    // ════════════════════════════════════════════
    // Phase 3: Login flows — Uses accounts from Phase 2
    // ════════════════════════════════════════════
    console.log("\n\n═══ Phase 3: Login flows ═══");

    // Query DB for the first customer ID created in Phase 2
    customerId = await getFirstCustomerId();
    if (!customerId) {
      throw new Error(
        "No customer found in DB after account creation flows. Did Phase 2 succeed?"
      );
    }
    console.log(`  🔑 Using customer ID from DB: ${customerId}`);

    // Flow 7: login-success
    // After login success, example machine shows "User services are currently under development"
    recorded.push({
      fixture: await recordFlow(
        "03-login-success",
        [
          "", // Initial dial → welcome menu
          "2", // Account Menu
          "1", // Login → enter customer ID
          customerId, // Customer ID → verifying...
          "1", // Continue (verifying) → enter PIN
          TEST_PIN, // PIN → verifying PIN...
          "1", // Continue (verifying PIN) → login success message
          "1", // Continue → user services placeholder
          "1", // Return to main menu
        ],
        "Successful login with correct credentials"
      ),
      metadata: {
        needsCustomerId: true,
        recordedCustomerId: customerId,
        hasLoginSuccessResponse: true,
      },
    });

    // Flow 8: login-wrong-pin
    recorded.push({
      fixture: await recordFlow(
        "03-login-wrong-pin",
        [
          "", // Initial dial
          "2", // Account Menu
          "1", // Login → enter customer ID
          customerId, // Customer ID → verifying...
          "1", // Continue → enter PIN
          "99999", // Wrong PIN → error + retry
          TEST_PIN, // Correct PIN → verifying PIN...
          "1", // Continue → login success
          "1", // Continue → user services
          "1", // Return to main menu
        ],
        "Login with wrong PIN then correct PIN"
      ),
      metadata: {
        needsCustomerId: true,
        recordedCustomerId: customerId,
        hasLoginSuccessResponse: true,
      },
    });

    // Flow 9: login-invalid-customer-id
    recorded.push({
      fixture: await recordFlow(
        "03-login-invalid-customer-id",
        [
          "", // Initial dial
          "2", // Account Menu
          "1", // Login → enter customer ID
          "CNOTEXIST99", // Invalid customer ID → verifying...
          "1", // Continue → customer not found error
        ],
        "Login attempt with non-existent customer ID"
      ),
    });

    // ════════════════════════════════════════════
    // Phase 4: Navigation edge cases
    // ════════════════════════════════════════════
    console.log("\n\n═══ Phase 4: Navigation edge cases ═══");

    // Flow 10: exit-from-any-menu
    recorded.push({
      fixture: await recordFlow(
        "04-exit-from-any-menu",
        [
          "", // Initial dial → welcome menu
          "1", // Know More → info menu
          "1", // Interested in Product → SMS sent page
          "*", // Exit from depth 3 → goodbye/end
        ],
        "Test exit from deep menu via * input"
      ),
    });

    // Flow 11: back-navigation-chain
    recorded.push({
      fixture: await recordFlow(
        "04-back-navigation-chain",
        [
          "", // Initial dial → welcome menu
          "2", // Account Menu → account menu
          "0", // Back → welcome menu
          "1", // Know More → info menu
          "1", // Interested in Product → SMS sent page
          "0", // Back → info menu
          "0", // Back → welcome menu
          "2", // Account Menu → account menu
          "2", // Create Account → name entry
          "0", // Back → account menu
          "0", // Back → welcome menu
        ],
        "Navigate deep and back out through multiple menus"
      ),
    });

    // ════════════════════════════════════════════
    // Save all fixtures and generate tests
    // ════════════════════════════════════════════
    console.log("\n\n═══ Saving fixtures and generating tests ═══");

    for (const { fixture, metadata } of recorded) {
      saveFixtureAndTest(fixture, metadata);
    }

    // ════════════════════════════════════════════
    // Summary
    // ════════════════════════════════════════════
    console.log(
      "\n\n═══════════════════════════════════════════════════════════════"
    );
    console.log(`  ✅ Successfully recorded ${recorded.length} flows`);
    console.log(`  📁 Fixtures saved to: ${FIXTURES_DIR}`);
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );

    for (const { fixture } of recorded) {
      const turnCount = fixture.turns.length;
      const lastReply = fixture.turns[turnCount - 1]?.serverReply || "";
      const ended = lastReply.startsWith("END ") ? "🔚" : "📱";
      console.log(`  ${ended} ${fixture.flowName} (${turnCount} turns)`);
    }
  } catch (error) {
    console.error("\n\n❌ FATAL ERROR:", error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

// ──────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
