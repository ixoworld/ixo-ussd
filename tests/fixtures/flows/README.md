# Integration Flow Tests

This directory contains integration tests that replay recorded USSD sessions against a live server with an ephemeral database. Each flow is stored as a JSON fixture paired with a generated Vitest test file.

## Quick Start

```bash
# Run the full pipeline (Docker required): container → server → tests → teardown
pnpm test:integration

# Record new flows (regenerates all fixtures and tests)
pnpm test:integration:record

# Run flow tests only (server must already be running)
pnpm test:flows:run
```

## What Are Flow Tests?

Flow tests are **integration tests** that replay complete USSD interaction sequences. Unlike unit tests (which mock the database, IXO, and Matrix services), flow tests:

- Send real HTTP requests to a running USSD server
- Use a real PostgreSQL database (ephemeral, via testcontainers)
- Validate the complete request → state machine → response pipeline
- Run sequentially (flows share database state across phases)

Each test case sends a USSD request and asserts the server's exact response text.

## How to Run

### Full Pipeline (Recommended)

```bash
pnpm test:integration
```

This command handles the entire lifecycle:

1. Spins up an **ephemeral Postgres** container (via [testcontainers](https://node.testcontainers.org/))
2. Runs `migrations/postgres/000-init-all.sql` to create the schema
3. Starts the USSD server against the test database
4. Waits for `/health` to respond
5. Runs all flow tests via Vitest
6. Tears down the server and container

**Prerequisite:** Docker must be running.

### Tests Only (Manual Server)

If you already have a server running with a clean database:

```bash
pnpm test:flows:run
```

This skips the container/server lifecycle and runs tests directly.

## How to Record New Flows

### Re-record all flows

```bash
pnpm test:integration:record
```

This runs the same pipeline as `test:integration`, but instead of replaying tests, it executes `tests/scripts/record-all-flows.ts` which programmatically walks every flow and generates fresh JSON fixtures and test files.

### Add a new flow definition

Edit `tests/scripts/record-all-flows.ts` to add flow steps:

```typescript
recorded.push({
  fixture: await recordFlow(
    "05-my-custom-flow",
    [
      "", // Initial dial
      "2", // Account Menu
      "1", // Login
      customerId, // Dynamic value from earlier phase
      TEST_PIN, // PIN
      "1", // Continue
      // ... your flow steps
    ],
    "Description of my custom flow"
  ),
  metadata: { needsCustomerId: true, recordedCustomerId: customerId },
});
```

Then record: `pnpm test:integration:record`

## File Structure

Each flow produces a **pair** of files:

```
tests/fixtures/flows/
├── setup.ts                              # Flow test setup (env config, no mocks)
├── 01-know-more-flow.json                # Recorded fixture (turns + metadata)
├── 01-know-more-flow.test.ts             # Generated Vitest test
├── 02-create-account-full.json
├── 02-create-account-full.test.ts
├── 03-login-success.json
├── 03-login-success.test.ts
└── ...
```

- **`.json` fixtures** — Contain session metadata and an array of turns (input → expected response)
- **`.test.ts` files** — Generated Vitest tests that load the fixture and replay each turn
- **Numbered prefixes** (`01-`, `02-`, etc.) control execution order since flows share database state

## Default Flows (Example Machine)

| Phase | Flow                             | Description                            |
| ----- | -------------------------------- | -------------------------------------- |
| 1     | `01-know-more-flow`              | Browse info menu, select option        |
| 1     | `01-know-more-back-navigation`   | Navigate info menu with back           |
| 2     | `02-create-account-full`         | Full account creation                  |
| 2     | `02-create-account-skip-email`   | Account creation, skip email           |
| 2     | `02-create-account-skip-both`    | Account creation, skip optional fields |
| 2     | `02-create-account-pin-mismatch` | PIN mismatch then correct              |
| 3     | `03-login-success`               | Successful login                       |
| 3     | `03-login-wrong-pin`             | Wrong PIN then correct                 |
| 3     | `03-login-invalid-customer-id`   | Non-existent customer ID               |
| 4     | `04-exit-from-any-menu`          | Exit via \* from deep menu             |
| 4     | `04-back-navigation-chain`       | Multi-level back navigation            |

## For Forks: Adding Custom Flows

If your fork adds new USSD machines with additional flows:

1. **Copy** `tests/scripts/record-all-flows.ts` to your fork
2. **Add phases** for your custom flows using numbered prefixes (`05-*`, `06-*`)
3. **Set `USSD_MACHINE_TYPE`** in the test runner environment if your fork uses a different machine type
4. **Record**: `pnpm test:integration:record`
5. **Commit** the generated fixtures and tests

## Key Design Decisions

- **Ephemeral database** — Each test run starts from a clean schema, ensuring reproducibility
- **Sequential execution** — Flows run in order because later phases depend on data created by earlier ones (e.g., login requires a previously created account)
- **Dynamic value substitution** — The recorder captures values like Customer IDs at runtime and injects them into later flow steps
- **Cumulative USSD text** — Each turn sends the full accumulated input (e.g., `"1*2*3"`) matching real USSD gateway behaviour

## Environment Variables

| Variable               | Default                          | Description                  |
| ---------------------- | -------------------------------- | ---------------------------- |
| `USSD_MACHINE_TYPE`    | `example`                        | Which USSD machine to use    |
| `SERVER_URL`           | `http://127.0.0.1:3005/api/ussd` | Server URL for recording     |
| `DATABASE_URL`         | (from container)                 | PostgreSQL connection string |
| `USSD_TEST_SERVER_URL` | `http://127.0.0.1:3005/api/ussd` | Server URL for test replay   |

## Troubleshooting

### Tests fail with response mismatch

Server responses have changed since flows were recorded. Re-record:

```bash
pnpm test:integration:record
```

### Docker / container fails to start

Ensure Docker is running: `docker info`. The pipeline uses [testcontainers](https://node.testcontainers.org/) which requires a Docker-compatible runtime.

### Tests timeout

- Increase `testTimeout` in `vitest.flows.config.ts` (default: 60s)
- Check server logs for startup errors
- Ensure the database schema migration ran successfully
