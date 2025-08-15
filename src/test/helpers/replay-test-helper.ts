import fs from "fs";
import path from "path";
import { SessionFixture } from "./session-recorder.js";

export interface ReplayResult {
  success: boolean;
  turnIndex: number;
  expected: string;
  actual: string;
  error?: string;
}

export interface ReplaySession {
  fixture: SessionFixture;
  results: ReplayResult[];
  success: boolean;
  totalTurns: number;
  passedTurns: number;
  failedTurns: number;
}

export class ReplayTestHelper {
  private fixturesDir: string;

  constructor(fixturesDir?: string) {
    this.fixturesDir =
      fixturesDir ||
      path.join(process.cwd(), "src", "test", "fixtures", "flows");
  }

  /**
   * Load a fixture file from the fixtures directory
   */
  loadFixture(filename: string): SessionFixture {
    try {
      const filepath = path.join(this.fixturesDir, filename);

      if (!fs.existsSync(filepath)) {
        throw new Error(`Fixture file not found: ${filepath}`);
      }

      const fileContent = fs.readFileSync(filepath, "utf-8");
      const fixture = JSON.parse(fileContent) as SessionFixture;

      // Validate fixture structure
      this.validateFixture(fixture);

      console.log(`📂 Loaded fixture: ${filename}`);
      console.log(`🎯 Flow: ${fixture.flowName}`);
      console.log(`📞 Phone: ${fixture.phoneNumber}`);
      console.log(`🔢 Service: ${fixture.serviceCode}`);
      console.log(`📊 Turns: ${fixture.turns.length}`);

      return fixture;
    } catch (error) {
      console.error(
        `❌ Error loading fixture ${filename}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Load all fixture files from the fixtures directory
   */
  loadAllFixtures(): SessionFixture[] {
    try {
      if (!fs.existsSync(this.fixturesDir)) {
        console.warn(`⚠️ Fixtures directory not found: ${this.fixturesDir}`);
        return [];
      }

      const files = fs
        .readdirSync(this.fixturesDir)
        .filter(file => file.endsWith(".json"))
        .sort();

      console.log(`📁 Found ${files.length} fixture files`);

      const fixtures: SessionFixture[] = [];
      for (const file of files) {
        try {
          const fixture = this.loadFixture(file);
          fixtures.push(fixture);
        } catch (error) {
          console.error(`⚠️ Skipping invalid fixture: ${file}`);
        }
      }

      console.log(`✅ Successfully loaded ${fixtures.length} fixtures`);
      return fixtures;
    } catch (error) {
      console.error(
        "❌ Error loading fixtures:",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Replay a session using a mock USSD handler function
   */
  async replaySession(
    fixture: SessionFixture,
    ussdHandler: (
      input: string,
      sessionId: string,
      phoneNumber: string,
      serviceCode: string
    ) => Promise<string>
  ): Promise<ReplaySession> {
    console.log(`\n🎬 Starting replay of: ${fixture.flowName}`);
    console.log(`📅 Original session: ${fixture.timestamp}`);

    const results: ReplayResult[] = [];
    let passedTurns = 0;
    let failedTurns = 0;

    try {
      for (let i = 0; i < fixture.turns.length; i++) {
        const turn = fixture.turns[i];
        console.log(`\n🔄 Turn ${i + 1}/${fixture.turns.length}`);
        console.log(`📤 Input: "${turn.textSent}"`);
        console.log(`🎯 Expected: "${turn.serverReply}"`);

        try {
          // Call the USSD handler with the input
          const actualResponse = await ussdHandler(
            turn.textSent,
            fixture.sessionId,
            fixture.phoneNumber,
            fixture.serviceCode
          );

          console.log(`📥 Actual: "${actualResponse}"`);

          // Assert exact string equality
          const success = this.assertResponse(turn.serverReply, actualResponse);

          const result: ReplayResult = {
            success,
            turnIndex: i,
            expected: turn.serverReply,
            actual: actualResponse,
          };

          if (success) {
            console.log(`✅ Turn ${i + 1} passed`);
            passedTurns++;
          } else {
            console.log(`❌ Turn ${i + 1} failed`);
            failedTurns++;
          }

          results.push(result);
        } catch (error) {
          console.log(
            `💥 Turn ${i + 1} threw error:`,
            error instanceof Error ? error.message : String(error)
          );

          const result: ReplayResult = {
            success: false,
            turnIndex: i,
            expected: turn.serverReply,
            actual: "",
            error: error instanceof Error ? error.message : String(error),
          };

          results.push(result);
          failedTurns++;
        }
      }

      const success = failedTurns === 0;

      console.log(`\n📊 Replay Summary for ${fixture.flowName}:`);
      console.log(`✅ Passed: ${passedTurns}/${fixture.turns.length}`);
      console.log(`❌ Failed: ${failedTurns}/${fixture.turns.length}`);
      console.log(
        `🎯 Success Rate: ${((passedTurns / fixture.turns.length) * 100).toFixed(1)}%`
      );
      console.log(`🏆 Overall: ${success ? "PASSED" : "FAILED"}`);

      return {
        fixture,
        results,
        success,
        totalTurns: fixture.turns.length,
        passedTurns,
        failedTurns,
      };
    } catch (error) {
      console.error(
        `💥 Fatal error during replay:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Assert exact string equality between expected and actual responses
   */
  assertResponse(expected: string, actual: string): boolean {
    // Exact string comparison
    return expected === actual;
  }

  /**
   * Get the fixtures directory path
   */
  getFixturesDir(): string {
    return this.fixturesDir;
  }

  /**
   * Check if fixtures directory exists
   */
  fixturesDirectoryExists(): boolean {
    return fs.existsSync(this.fixturesDir);
  }

  /**
   * Get list of available fixture files
   */
  getAvailableFixtures(): string[] {
    if (!this.fixturesDirectoryExists()) {
      return [];
    }

    return fs
      .readdirSync(this.fixturesDir)
      .filter(file => file.endsWith(".json"))
      .sort();
  }

  /**
   * Validate fixture structure
   */
  private validateFixture(fixture: SessionFixture): void {
    if (!fixture.flowName || typeof fixture.flowName !== "string") {
      throw new Error(
        "Invalid fixture: flowName is required and must be a string"
      );
    }
    if (!fixture.timestamp || typeof fixture.timestamp !== "string") {
      throw new Error(
        "Invalid fixture: timestamp is required and must be a string"
      );
    }
    if (!fixture.sessionId || typeof fixture.sessionId !== "string") {
      throw new Error(
        "Invalid fixture: sessionId is required and must be a string"
      );
    }
    if (!fixture.phoneNumber || typeof fixture.phoneNumber !== "string") {
      throw new Error(
        "Invalid fixture: phoneNumber is required and must be a string"
      );
    }
    if (!fixture.serviceCode || typeof fixture.serviceCode !== "string") {
      throw new Error(
        "Invalid fixture: serviceCode is required and must be a string"
      );
    }
    if (!Array.isArray(fixture.turns)) {
      throw new Error("Invalid fixture: turns must be an array");
    }

    // Validate each turn
    for (let i = 0; i < fixture.turns.length; i++) {
      const turn = fixture.turns[i];
      if (typeof turn.textSent !== "string") {
        throw new Error(
          `Invalid fixture: turn[${i}].textSent must be a string`
        );
      }
      if (typeof turn.serverReply !== "string") {
        throw new Error(
          `Invalid fixture: turn[${i}].serverReply must be a string`
        );
      }
      if (typeof turn.sessionId !== "string") {
        throw new Error(
          `Invalid fixture: turn[${i}].sessionId must be a string`
        );
      }
      if (typeof turn.timestamp !== "string") {
        throw new Error(
          `Invalid fixture: turn[${i}].timestamp must be a string`
        );
      }
      if (isNaN(Date.parse(turn.timestamp))) {
        throw new Error(
          `Invalid fixture: turn[${i}].timestamp must be a valid ISO 8601 date string`
        );
      }
    }

    // Validate main timestamp format
    if (isNaN(Date.parse(fixture.timestamp))) {
      throw new Error(
        "Invalid fixture: timestamp must be a valid ISO 8601 date string"
      );
    }
  }
}
