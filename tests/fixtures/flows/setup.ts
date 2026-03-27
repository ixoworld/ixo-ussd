/**
 * Flow Tests Setup
 *
 * This setup file is specifically for generated flow tests that need to connect
 * to a real running USSD server instead of using mocked services.
 *
 * Unlike the main test setup (tests/setup.ts), this does NOT:
 * - Initialize mocked database services
 * - Initialize mocked IXO services
 * - Initialize mocked Matrix services
 * - Set up beforeEach hooks that reset mocks
 *
 * Flow tests make actual HTTP requests to a running server.
 */

import dotenv from "dotenv";
import path from "path";
import pg from "pg";

// Load environment variables from .env file (not .env.test)
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// Set minimal required environment variables for flow tests
const defaultValues = {
  CHAIN_NETWORK: process.env.CHAIN_NETWORK || "devnet",
  MATRIX_HOME_SERVER:
    process.env.MATRIX_HOME_SERVER || "https://devmx.ixo.earth",
  FEEGRANT_URL: process.env.FEEGRANT_URL || "https://feegrant.devnet.ixo.earth",
};

for (const [key, value] of Object.entries(defaultValues)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

console.log("🌐 Flow test environment initialized");
console.log("📡 Tests will connect to real USSD server");
console.log(
  `🔗 Server URL: ${process.env.USSD_TEST_SERVER_URL || "http://127.0.0.1:3005/api/ussd"}`
);
console.log("");
console.log(
  "⚠️  Make sure the USSD server is running before executing flow tests!"
);
console.log("   Start server with: pnpm dev");
console.log("");

// ──────────────────────────────────────────────
// Database helpers for dynamic Customer ID resolution
// ──────────────────────────────────────────────
let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl)
      throw new Error(
        "DATABASE_URL not set — cannot query DB for dynamic values"
      );
    _pool = new pg.Pool({ connectionString: dbUrl });
  }
  return _pool;
}

export async function getFirstCustomerId(): Promise<string> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT customer_id FROM customers ORDER BY created_at ASC LIMIT 1"
  );
  if (result.rows.length === 0) throw new Error("No customers found in DB");
  return result.rows[0].customer_id;
}

export async function getCustomerIds(): Promise<string[]> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT customer_id FROM customers ORDER BY created_at ASC"
  );
  return result.rows.map((r: any) => r.customer_id);
}

export async function promoteToLeadGenerator(
  customerId: string
): Promise<void> {
  const pool = getPool();
  await pool.query("UPDATE customers SET role = $1 WHERE customer_id = $2", [
    "lead_generator",
    customerId,
  ]);
}

export async function closeDbPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
