# Testing Guide

IXO USSD has two tiers of automated tests: **unit tests** and **integration flow tests**.

## Overview

| Tier        | Command                 | Tests | What it does                          |
| ----------- | ----------------------- | ----- | ------------------------------------- |
| Unit        | `pnpm test`             | 126   | Fast, mocked services                 |
| Integration | `pnpm test:integration` | 88    | Full pipeline with ephemeral Postgres |

---

## Unit Tests

Unit tests validate individual modules with mocked database, IXO blockchain, and Matrix services.

### Running

```bash
# Run once
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Configuration

- **Config file:** `vitest.config.ts`
- **Setup file:** `tests/setup.ts` — initialises mocked services before each test
- **Test locations:** `src/**/*.test.ts`, `tests/**/*.test.ts` (excluding `tests/fixtures/flows/`)

### What Gets Mocked

The test setup (`tests/setup.ts`) replaces real services with in-memory mocks:

- **Database** — In-memory store, no PostgreSQL required
- **IXO blockchain** — Mocked API responses for account creation, claims, etc.
- **Matrix** — Mocked messaging service

This means unit tests run fast and don't require any external dependencies.

---

## Integration Flow Tests

Integration flow tests replay recorded USSD sessions against a live server backed by a real PostgreSQL database.

### Running

```bash
# Full pipeline (recommended) — requires Docker
pnpm test:integration

# Tests only (server must already be running)
pnpm test:flows:run
```

### Prerequisites

- **Docker** — Required for [testcontainers](https://node.testcontainers.org/) to spin up an ephemeral Postgres container. [Install Docker](https://docs.docker.com/get-docker/)

### How It Works

The `pnpm test:integration` command runs a full lifecycle:

1. **Start database** — Ephemeral Postgres container via testcontainers
2. **Init schema** — Runs `migrations/postgres/000-init-all.sql`
3. **Start server** — USSD server pointing at the test database
4. **Wait for health** — Polls `/health` until the server is ready
5. **Run tests** — Vitest with `vitest.flows.config.ts`
6. **Tear down** — Stops server and removes the container

### Configuration

- **Config file:** `vitest.flows.config.ts`
- **Setup file:** `tests/fixtures/flows/setup.ts` — minimal setup, no mocks
- **Test timeout:** 60 seconds per test (configurable in the config file)
- **Test location:** `tests/fixtures/flows/**/*.test.ts`

### Sequential Execution

Flow tests run **sequentially** because later phases depend on data created by earlier ones. For example, login flows (phase 3) require an account created in phase 2. The numbered file prefixes (`01-`, `02-`, etc.) control execution order.

---

## Recording New Flows

Flow tests are generated from programmatic recordings defined in `tests/scripts/record-all-flows.ts`.

### Re-record all flows

```bash
pnpm test:integration:record
```

This runs the same pipeline as `test:integration`, but instead of replaying tests, it walks every flow definition and regenerates all JSON fixtures and test files.

### Record flows only (server already running)

```bash
pnpm record:flows
```

### Adding a new flow definition

Edit `tests/scripts/record-all-flows.ts` and add your flow steps:

```typescript
recorded.push({
  fixture: await recordFlow(
    "05-my-custom-flow",
    [
      "", // Initial dial
      "2", // Select menu option
      "1", // Sub-option
      customerId, // Dynamic value from earlier phase
      TEST_PIN, // PIN entry
    ],
    "Description of my custom flow"
  ),
  metadata: { needsCustomerId: true, recordedCustomerId: customerId },
});
```

Then run: `pnpm test:integration:record`

The recorder generates two files per flow:

- `tests/fixtures/flows/<name>.json` — Session fixture with turns and metadata
- `tests/fixtures/flows/<name>.test.ts` — Vitest test that replays the fixture

---

## For Forks: Adding Custom Flows

If your fork adds custom USSD machines with new user flows:

1. **Copy** `tests/scripts/record-all-flows.ts` to customise flow definitions
2. **Add phases** with numbered prefixes (`05-*`, `06-*`) to control execution order
3. **Set `USSD_MACHINE_TYPE`** if your fork uses a different machine type
4. **Record:** `pnpm test:integration:record`
5. **Commit** the generated fixtures and test files

---

## Available Scripts

| Script                         | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| `pnpm test`                    | Run unit tests (once, verbose)                         |
| `pnpm test:watch`              | Run unit tests in watch mode                           |
| `pnpm test:coverage`           | Run unit tests with coverage                           |
| `pnpm test:integration`        | Full integration pipeline (container + server + tests) |
| `pnpm test:integration:record` | Full pipeline in record mode (regenerate fixtures)     |
| `pnpm record:flows`            | Record flows only (server must be running)             |
| `pnpm test:flows`              | Run flow tests in watch mode (server must be running)  |
| `pnpm test:flows:run`          | Run flow tests once (server must be running)           |

---

## Troubleshooting

### Docker not running

```
Error: connect ECONNREFUSED /var/run/docker.sock
```

Start Docker Desktop or the Docker daemon. The integration pipeline uses testcontainers which requires a Docker-compatible runtime.

### Server fails to start

- Check that port 3005 is not already in use: `lsof -i :3005`
- Review server logs in the pipeline output (lines prefixed with `[server]`)
- Ensure the database schema migration ran without errors

### Test timeouts

- Default timeout is 60 seconds per test (set in `vitest.flows.config.ts`)
- If the server is slow to respond, increase `testTimeout`
- Check for server errors in the console output

### Response mismatch

If server code has changed since flows were recorded, tests will fail with mismatched expected responses. Re-record:

```bash
pnpm test:integration:record
```

### Flow tests won't run with `pnpm test`

This is by design. Flow tests are **excluded** from the main `vitest.config.ts` because they require a running server. Use `pnpm test:integration` or `pnpm test:flows:run` instead.
