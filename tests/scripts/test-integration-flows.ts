#!/usr/bin/env node
/**
 * Integration Flow Test Runner
 *
 * Full pipeline:
 * 1. Spins up an ephemeral Postgres via testcontainers
 * 2. Runs init SQL to create the schema
 * 3. Starts the USSD server pointing at the test database
 * 4. Waits for /health to respond
 * 5. Runs all flow tests via vitest (default) or records flows (--record)
 * 6. Tears down server + container
 *
 * Usage:
 *   pnpm test:integration            # run flow tests
 *   pnpm test:integration:record      # record all USSD flows
 */
import { spawn, ChildProcess } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import pg from "pg";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SERVER_PORT = 3005;
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}/api/ussd`;
const HEALTH_URL = `http://127.0.0.1:${SERVER_PORT}/health`;
const MAX_STARTUP_WAIT_MS = 60_000;
const HEALTH_CHECK_INTERVAL_MS = 1_000;

const isRecordMode = process.argv.includes("--record");

const PG_USER = "test_user";
const PG_PASSWORD = "test_password";
const PG_DATABASE = "ixo-ussd-test";
const PG_IMAGE = "postgres:16-alpine";

// ---------------------------------------------------------------------------
// Database lifecycle (testcontainers)
// ---------------------------------------------------------------------------
async function startDatabase(): Promise<StartedTestContainer> {
  console.log("🐘 Starting ephemeral Postgres container...");

  const container = await new GenericContainer(PG_IMAGE)
    .withEnvironment({
      POSTGRES_USER: PG_USER,
      POSTGRES_PASSWORD: PG_PASSWORD,
      POSTGRES_DB: PG_DATABASE,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage("database system is ready to accept connections", 2)
    )
    .withStartupTimeout(60_000)
    .start();

  const mappedPort = container.getMappedPort(5432);
  const host = container.getHost();
  console.log(`✅ Postgres running at ${host}:${mappedPort}`);

  return container;
}

function getDatabaseUrl(container: StartedTestContainer): string {
  const port = container.getMappedPort(5432);
  const host = container.getHost();
  return `postgres://${PG_USER}:${PG_PASSWORD}@${host}:${port}/${PG_DATABASE}`;
}

async function initSchema(databaseUrl: string): Promise<void> {
  console.log("📜 Running database init SQL...");

  // Try multiple SQL file names for compatibility across forks
  const candidates = [
    resolve(process.cwd(), "migrations/postgres/000-init-all.sql"),
    resolve(process.cwd(), "migrations/postgres/001-init.sql"),
  ];

  let sqlPath: string | null = null;
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      sqlPath = candidate;
      break;
    }
  }

  if (!sqlPath) {
    throw new Error("No init SQL file found in migrations/postgres/");
  }

  console.log(`  Using: ${sqlPath}`);
  const sql = readFileSync(sqlPath, "utf-8");

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }

  console.log("✅ Schema initialised");
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------
function buildServerEnv(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);

  const { NODE_OPTIONS, ...cleanEnv } = process.env;
  return {
    ...cleanEnv,
    NODE_ENV: "dev",
    PORT: String(SERVER_PORT),
    USSD_MACHINE_TYPE: process.env.USSD_MACHINE_TYPE || "example",
    DATABASE_URL: databaseUrl,
    PG_USER: url.username,
    PG_PASSWORD: url.password,
    PG_HOST: url.hostname,
    PG_PORT: url.port,
    PG_DATABASE: url.pathname.slice(1),
    PG_SSL: "false",
    PIN_ENCRYPTION_KEY:
      process.env.PIN_ENCRYPTION_KEY || "test-encryption-key-1234",
    SMS_ENABLED: "false",
    LOG_LEVEL: process.env.LOG_LEVEL || "error",
  };
}

async function waitForServer(): Promise<boolean> {
  const startTime = Date.now();
  console.log(`⏳ Waiting for server at ${HEALTH_URL}...`);

  while (Date.now() - startTime < MAX_STARTUP_WAIT_MS) {
    try {
      const response = await fetch(HEALTH_URL, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        console.log("✅ Server is ready");
        return true;
      }
    } catch {
      // Server not ready yet
    }

    await delay(HEALTH_CHECK_INTERVAL_MS);
  }

  console.error("❌ Server failed to start within timeout");
  return false;
}

function startServer(databaseUrl: string): ChildProcess {
  console.log("🚀 Starting USSD server...");

  const server = spawn("node", ["--loader", "ts-node/esm", "src/index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: true,
    env: buildServerEnv(databaseUrl),
  });

  server.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.log(`[server] ${line}`);
  });

  server.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    if (line) console.error(`[server:err] ${line}`);
  });

  return server;
}

function killServer(server: ChildProcess): void {
  if (!server.pid) return;
  console.log("\n🛑 Stopping server...");

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function waitForServerExit(server: ChildProcess): Promise<void> {
  if (!server.pid) return;
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      process.kill(server.pid, 0);
      await delay(100);
    } catch {
      return;
    }
  }

  try {
    process.kill(-server.pid, "SIGKILL");
  } catch {
    try {
      server.kill("SIGKILL");
    } catch {
      /* already dead */
    }
  }
}

// ---------------------------------------------------------------------------
// Record flows
// ---------------------------------------------------------------------------
async function runRecordFlows(databaseUrl: string): Promise<number> {
  console.log("🔴 Recording all USSD flows...\n");
  const { NODE_OPTIONS: _nodeOpts1, ...cleanEnv1 } = process.env;
  return new Promise(resolve => {
    const recordProcess = spawn(
      "node",
      ["--loader", "ts-node/esm", "tests/scripts/record-all-flows.ts"],
      {
        stdio: "inherit",
        shell: true,
        env: {
          ...cleanEnv1,
          SERVER_URL: SERVER_URL,
          DATABASE_URL: databaseUrl,
        },
      }
    );
    recordProcess.on("close", code => {
      resolve(code ?? 1);
    });
  });
}

// ---------------------------------------------------------------------------
// Flow tests
// ---------------------------------------------------------------------------
async function runFlowTests(databaseUrl: string): Promise<number> {
  console.log("🧪 Running flow tests...\n");
  const { NODE_OPTIONS: _nodeOpts2, ...cleanEnv2 } = process.env;

  return new Promise(resolve => {
    const testProcess = spawn(
      "pnpm",
      ["vitest", "run", "--config", "vitest.flows.config.ts"],
      {
        stdio: "inherit",
        shell: true,
        env: {
          ...cleanEnv2,
          USSD_TEST_SERVER_URL: SERVER_URL,
          DATABASE_URL: databaseUrl,
        },
      }
    );

    testProcess.on("close", code => {
      resolve(code ?? 1);
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  let container: StartedTestContainer | null = null;
  let server: ChildProcess | null = null;
  let exitCode = 1;

  try {
    // 1. Start database
    container = await startDatabase();
    const databaseUrl = getDatabaseUrl(container);
    console.log(`📎 DATABASE_URL=${databaseUrl}`);

    // 2. Init schema
    await initSchema(databaseUrl);

    // 3. Start server
    server = startServer(databaseUrl);

    // 4. Wait for health
    const serverReady = await waitForServer();
    if (!serverReady) {
      throw new Error("Server failed to become ready within timeout");
    }

    // 5. Run flow tests or record flows
    if (isRecordMode) {
      exitCode = await runRecordFlows(databaseUrl);
    } else {
      exitCode = await runFlowTests(databaseUrl);
    }
  } catch (error) {
    console.error("❌ Error running integration tests:", error);
    exitCode = 1;
  } finally {
    // 6. Tear down
    if (server) {
      killServer(server);
      await waitForServerExit(server);
    }

    if (container) {
      console.log("🗑️  Stopping Postgres container...");
      await container.stop();
      console.log("✅ Container removed");
    }
  }

  process.exit(exitCode);
}

main();
