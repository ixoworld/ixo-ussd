import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Jest-style globals
    environment: "node", // Fast execution for Node.js backend
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30_000, // 30s - covers USSD session TTL flows
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        global: {
          branches: 10,
          functions: 15,
          lines: 20,
          statements: 20,
        },
      },
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "src/test/**/*",
        "src/**/__tests__/**/*",
        "src/**/__mocks__/**/*",
        "src/index.ts",
        "src/i18n/**/*",
        "vitest.config.ts",
      ],
    },
    // Test file patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // Exclude Docker-dependent integration tests
    exclude: [
      "dist/**",
      "**/node_modules/**",
      "**/src/test/integration/**", // Exclude integration tests that require Docker containers
      "**/src/test/e2e/recorded-flows.test.ts", // Exclude recorded flows - run manually with test:replay
    ],
  },
  // Support for path aliases from tsconfig.json
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
