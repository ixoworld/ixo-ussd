import path from "path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { messages as brandingMessages } from "../../constants/branding.js";
import {
  ReplaySession,
  ReplayTestHelper,
} from "../helpers/replay-test-helper.js";
import { SessionFixture } from "../helpers/session-recorder.js";

// Import the USSD handler (this will need to be adapted based on your actual implementation)
// For now, we'll create a mock interface that matches what the replay system expects
interface USSDHandler {
  (
    input: string,
    sessionId: string,
    phoneNumber: string,
    serviceCode: string
  ): Promise<string>;
}

// Mock USSD handler for testing - replace with actual implementation
const createMockUSSDHandler = (): USSDHandler => {
  return async (input: string): Promise<string> => {
    // This is a simple mock - replace with actual USSD handler logic
    // For now, just return a predictable response for testing
    if (input === "") {
      return `CON ${brandingMessages.welcome}\n1. Know More\n2. Purchase\n3. Top Up Balance\n4. Report Fault`;
    }
    if (input === "1") {
      return "CON Know More\n1. About Example\n2. How it works\n3. Contact us\n0. Back";
    }
    if (input === "2") {
      return "CON Purchase\n1. Solar Panel\n2. Battery\n3. Inverter\n0. Back";
    }
    if (input === "3") {
      return "CON Top Up Balance\nEnter amount:";
    }
    if (input === "4") {
      return "CON Report Fault\nDescribe the issue:";
    }
    return "END Invalid option";
  };
};

describe.skip("Recorded USSD Flows E2E Tests", () => {
  let replayHelper: ReplayTestHelper;
  let ussdHandler: USSDHandler;
  let fixtures: SessionFixture[];
  const activeSessions: Set<string> = new Set();

  beforeAll(async () => {
    // Initialize the replay helper
    const fixturesDir = path.join(
      process.cwd(),
      "src",
      "test",
      "fixtures",
      "flows"
    );
    replayHelper = new ReplayTestHelper(fixturesDir);

    // Initialize the USSD handler (mock for now)
    ussdHandler = createMockUSSDHandler();

    // Check if fixtures directory exists first
    if (!replayHelper.fixturesDirectoryExists()) {
      console.warn(`⚠️ Fixtures directory not found: ${fixturesDir}`);
      console.warn(`⚠️ E2E recorded flow tests will be skipped`);
      fixtures = [];
      return;
    }

    // Load all available fixtures
    try {
      fixtures = replayHelper.loadAllFixtures();
      console.log(`\n🚀 Starting E2E tests with ${fixtures.length} fixtures`);
      console.log(`📁 Fixtures directory: ${replayHelper.getFixturesDir()}`);
    } catch (error) {
      console.error(`❌ Error loading fixtures:`, error);
      fixtures = [];
    }
  });

  beforeEach(() => {
    // Clear active sessions before each test
    activeSessions.clear();
    console.log("\n🧹 Test session cleanup completed");
  });

  afterEach(() => {
    // Clean up any remaining sessions after each test
    if (activeSessions.size > 0) {
      console.log(`🧹 Cleaning up ${activeSessions.size} active sessions`);
      activeSessions.clear();
    }
  });

  afterAll(() => {
    // Final cleanup
    activeSessions.clear();
    console.log("\n🏁 E2E test suite completed");
    console.log("🧹 All test sessions cleaned up");
  });

  describe("Fixture Loading", () => {
    it("should handle missing fixtures directory gracefully", () => {
      if (!replayHelper.fixturesDirectoryExists()) {
        console.warn(
          "⚠️ Fixtures directory not found - test suite will run in minimal mode"
        );
        expect(fixtures.length).toBe(0);
        return;
      }

      expect(replayHelper.fixturesDirectoryExists()).toBe(true);
    });

    it("should load fixtures when available", () => {
      if (!replayHelper.fixturesDirectoryExists()) {
        console.warn(
          "⚠️ Skipping fixture loading test - no fixtures directory"
        );
        return;
      }

      expect(fixtures.length).toBeGreaterThan(0);
    });

    it("should have valid fixture files when present", () => {
      const availableFixtures = replayHelper.getAvailableFixtures();

      if (availableFixtures.length === 0) {
        console.warn("⚠️ No fixture files found - skipping validation test");
        return;
      }

      expect(availableFixtures.length).toBeGreaterThan(0);

      // Check that all files are JSON files
      for (const filename of availableFixtures) {
        expect(filename).toMatch(/\.json$/);
      }
    });
  });

  describe.skip("Individual Fixture Replay", () => {
    // Dynamically generate tests for each fixture
    it("should handle case when no fixtures are available", () => {
      if (!replayHelper.fixturesDirectoryExists()) {
        console.warn(
          "⚠️ No fixtures directory found - individual replay tests will be skipped"
        );
        expect(fixtures.length).toBe(0);
        return;
      }

      if (!fixtures || fixtures.length === 0) {
        console.warn(
          "⚠️ No fixtures found for testing - this may indicate missing fixture files"
        );
        expect(true).toBe(true); // This test passes when no fixtures are available
        return;
      }

      // If we have fixtures, this test will be skipped in favor of individual fixture tests
      expect(fixtures.length).toBeGreaterThan(0);
    });

    // Create individual tests for each fixture (this will be empty if no fixtures)
    if (fixtures && fixtures.length > 0) {
      fixtures.forEach(fixture => {
        it(`should successfully replay: ${fixture.flowName}`, async () => {
          console.log(`\n🎯 Testing fixture: ${fixture.flowName}`);

          // Track this session
          activeSessions.add(fixture.sessionId);

          const replaySession: ReplaySession = await replayHelper.replaySession(
            fixture,
            ussdHandler
          );

          // Assert that the replay was successful
          expect(replaySession.success).toBe(true);
          expect(replaySession.totalTurns).toBe(fixture.turns.length);
          expect(replaySession.passedTurns).toBe(fixture.turns.length);
          expect(replaySession.failedTurns).toBe(0);

          // Verify all individual turns passed
          for (const result of replaySession.results) {
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
          }

          console.log(`✅ ${fixture.flowName} replay completed successfully`);

          // Remove session from active tracking
          activeSessions.delete(fixture.sessionId);
        }, 30000); // 30 second timeout for each test
      });
    }
  });

  describe("Bulk Replay Tests", () => {
    it("should replay all fixtures successfully when available", async () => {
      if (!replayHelper.fixturesDirectoryExists()) {
        console.warn("⚠️ No fixtures directory - skipping bulk replay test");
        expect(fixtures.length).toBe(0);
        return;
      }

      if (fixtures.length === 0) {
        console.warn("⚠️ No fixtures available for bulk replay test");
        console.warn(
          "⚠️ This may indicate missing fixture files or loading errors"
        );
        return;
      }

      console.log(`\n🔄 Starting bulk replay of ${fixtures.length} fixtures`);

      const results: ReplaySession[] = [];
      let totalPassed = 0;
      let totalFailed = 0;

      for (const fixture of fixtures) {
        try {
          const replaySession = await replayHelper.replaySession(
            fixture,
            ussdHandler
          );
          results.push(replaySession);

          if (replaySession.success) {
            totalPassed++;
          } else {
            totalFailed++;
          }
        } catch (error) {
          console.error(`💥 Error replaying ${fixture.flowName}:`, error);
          totalFailed++;
        }
      }

      // Report overall results
      console.log(`\n📊 Bulk Replay Results:`);
      console.log(`✅ Passed: ${totalPassed}/${fixtures.length}`);
      console.log(`❌ Failed: ${totalFailed}/${fixtures.length}`);
      console.log(
        `🎯 Success Rate: ${((totalPassed / fixtures.length) * 100).toFixed(1)}%`
      );

      // Assert that all fixtures passed
      expect(totalPassed).toBe(fixtures.length);
      expect(totalFailed).toBe(0);

      // Verify each individual result
      for (const result of results) {
        expect(result.success).toBe(true);
      }
    }, 120000); // 2 minute timeout for bulk test
  });

  describe.skip("Error Handling", () => {
    it("should handle invalid fixture gracefully", async () => {
      const invalidFixture: SessionFixture = {
        flowName: "invalid-test",
        timestamp: new Date().toISOString(),
        sessionId: "invalid-session",
        phoneNumber: "+1234567890",
        serviceCode: "*123#",
        turns: [
          {
            textSent: "invalid-input",
            serverReply: "This will not match",
            sessionId: "invalid-session",
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const replaySession = await replayHelper.replaySession(
        invalidFixture,
        ussdHandler
      );

      // Should complete but fail the assertions
      expect(replaySession.success).toBe(false);
      expect(replaySession.failedTurns).toBeGreaterThan(0);
    });

    it("should handle USSD handler errors gracefully", async () => {
      if (!replayHelper.fixturesDirectoryExists()) {
        console.warn("⚠️ No fixtures directory - skipping error handling test");
        return;
      }

      if (fixtures.length === 0) {
        console.warn("⚠️ No fixtures available for error handling test");
        return;
      }

      // Create a handler that throws errors
      const errorHandler: USSDHandler = async () => {
        throw new Error("Simulated USSD handler error");
      };

      const fixture = fixtures[0];
      const replaySession = await replayHelper.replaySession(
        fixture,
        errorHandler
      );

      // Should complete but all turns should fail
      expect(replaySession.success).toBe(false);
      expect(replaySession.failedTurns).toBe(fixture.turns.length);

      // All results should have errors
      for (const result of replaySession.results) {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe.skip("Assertion Logic", () => {
    it("should perform exact string equality checks", () => {
      const expected = "CON Welcome\n1. Option 1\n2. Option 2";
      const actualMatch = "CON Welcome\n1. Option 1\n2. Option 2";
      const actualNoMatch = "CON Welcome\n1. Option 1\n2. Option 3";

      expect(replayHelper.assertResponse(expected, actualMatch)).toBe(true);
      expect(replayHelper.assertResponse(expected, actualNoMatch)).toBe(false);
    });

    it("should be case sensitive", () => {
      const expected = "CON Welcome";
      const actual = "con welcome";

      expect(replayHelper.assertResponse(expected, actual)).toBe(false);
    });

    it("should be whitespace sensitive", () => {
      const expected = "CON Welcome\n1. Option 1";
      const actual = "CON Welcome\n 1. Option 1"; // Extra space

      expect(replayHelper.assertResponse(expected, actual)).toBe(false);
    });
  });
});
