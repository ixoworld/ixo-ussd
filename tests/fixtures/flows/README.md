# Generated Flow Tests

This directory contains automatically generated Vitest tests created from recorded USSD sessions.

## Quick Start

```bash
# Record all flows against a clean ephemeral database
pnpm test:integration:record

# Replay all recorded flows
pnpm test:integration

# Run flow tests against an already-running server
pnpm test:flows:run
```

## How It Works

The integration test pipeline:

1. **Starts** an ephemeral Postgres container (via testcontainers)
2. **Initializes** the database schema
3. **Starts** the USSD server against the test database
4. **Records** all flows by sending USSD requests programmatically
5. **Generates** JSON fixtures and Vitest test files
6. **Tears down** everything

## Directory Structure

```
tests/fixtures/flows/
├── README.md           # This file
├── setup.ts            # Flow test setup (DB helpers, env config)
├── 01-*.json           # Pre-auth flow fixtures
├── 01-*.test.ts        # Pre-auth flow tests
├── 02-*.json           # Account creation fixtures
├── 02-*.test.ts        # Account creation tests
├── 03-*.json           # Login flow fixtures
├── 03-*.test.ts        # Login flow tests
└── 04-*.json/test.ts   # Navigation edge case fixtures/tests
```

## Default Flows (example machine)

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

## Adding Custom Flows (for forks)

If your fork adds new USSD machine types with additional flows:

1. **Create a custom recorder** — copy `tests/scripts/record-all-flows.ts` and add phases for your new flows
2. **Set `USSD_MACHINE_TYPE`** — configure the test runner to use your machine type
3. **Follow the naming convention** — use numbered prefixes (`05-*`, `06-*`) to control execution order
4. **Record and commit** — run `pnpm test:integration:record` and commit the generated fixtures

### Example: Adding a new flow

```typescript
// In your custom record-all-flows.ts
recorded.push({
  fixture: await recordFlow(
    "05-my-custom-flow",
    [
      "", // Initial dial
      "2", // Account Menu
      "1", // Login
      customerId, // Dynamic customer ID
      TEST_PIN, // PIN
      "1", // Continue
      // ... your custom flow steps
    ],
    "Description of my custom flow"
  ),
  metadata: { needsCustomerId: true, recordedCustomerId: customerId },
});
```

## Environment Variables

| Variable               | Default                          | Description                  |
| ---------------------- | -------------------------------- | ---------------------------- |
| `USSD_MACHINE_TYPE`    | `example`                        | Which USSD machine to use    |
| `SERVER_URL`           | `http://127.0.0.1:3005/api/ussd` | Server URL for recording     |
| `DATABASE_URL`         | (from container)                 | PostgreSQL connection string |
| `USSD_TEST_SERVER_URL` | `http://127.0.0.1:3005/api/ussd` | Server URL for test replay   |

## Troubleshooting

### Tests fail with response mismatch

The server responses have changed since flows were recorded. Re-record:

```bash
pnpm test:integration:record
```

### Container fails to start

Make sure Docker is running and accessible.

### Tests timeout

Increase `testTimeout` in `vitest.flows.config.ts` or check server logs for errors.
