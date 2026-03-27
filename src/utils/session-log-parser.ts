import fs from "fs";
import path from "path";
import {
  SessionFixture,
  ConversationTurn,
} from "../../tests/helpers/session-recorder.js";

/**
 * Session metadata extracted from log file header
 */
export interface SessionMetadata {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  startTime: string;
  nodeVersion?: string;
  platform?: string;
  environment?: string;
}

/**
 * Parsed log entry representing a single line in the log
 */
export interface LogEntry {
  timestamp: string;
  type: "USER_INPUT" | "SERVER_RESPONSE" | "METADATA" | "OTHER";
  content: string;
  raw: string;
}

/**
 * SessionLogParser parses session log files from logs/sessions/ directory
 * and converts them into SessionFixture format for test generation.
 *
 * Log Format:
 * - Header with JSON metadata block
 * - Timestamped entries: [ISO-8601-timestamp] content
 * - User inputs: [timestamp] USER INPUT: <input>
 * - Server responses: [timestamp] CON/END <response>
 *
 * @example
 * ```typescript
 * const parser = new SessionLogParser();
 * const fixture = parser.parseLogFile('logs/sessions/session-2025-10-25-05-45-15.log');
 * console.log(fixture.turns.length); // Number of conversation turns
 * ```
 */
export class SessionLogParser {
  /**
   * Parse a session log file and convert it to SessionFixture format
   *
   * @param logFilePath - Absolute or relative path to the log file
   * @returns SessionFixture object ready for test generation
   * @throws Error if file doesn't exist or parsing fails
   */
  parseLogFile(logFilePath: string): SessionFixture {
    // Resolve path
    const resolvedPath = path.isAbsolute(logFilePath)
      ? logFilePath
      : path.join(process.cwd(), logFilePath);

    // Check file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Log file not found: ${resolvedPath}`);
    }

    // Read file content
    const content = fs.readFileSync(resolvedPath, "utf-8");

    // Parse metadata
    const metadata = this.extractMetadata(content);

    // Parse log entries
    const entries = this.parseLogEntries(content);

    // Build conversation turns
    const turns = this.buildConversationTurns(entries, metadata.sessionId);

    // Extract flow name from filename or use default
    const flowName = this.extractFlowName(logFilePath);

    // Build SessionFixture
    const fixture: SessionFixture = {
      flowName,
      timestamp: metadata.startTime,
      sessionId: metadata.sessionId,
      phoneNumber: metadata.phoneNumber,
      serviceCode: metadata.serviceCode,
      turns,
    };

    return fixture;
  }

  /**
   * Extract metadata from log file header
   */
  private extractMetadata(content: string): SessionMetadata {
    // Find JSON metadata block between === lines
    const metadataMatch = content.match(
      /={80}\s*USSD INTERACTIVE TEST SESSION LOG\s*={80}\s*(\{[\s\S]*?\})\s*={80}/
    );

    if (!metadataMatch) {
      throw new Error(
        "Could not find metadata block in log file. Expected JSON between === lines."
      );
    }

    try {
      const metadata = JSON.parse(metadataMatch[1]) as SessionMetadata;

      // Validate required fields
      if (!metadata.sessionId) {
        throw new Error("Missing sessionId in metadata");
      }
      if (!metadata.phoneNumber) {
        throw new Error("Missing phoneNumber in metadata");
      }
      if (!metadata.serviceCode) {
        throw new Error("Missing serviceCode in metadata");
      }
      if (!metadata.startTime) {
        throw new Error("Missing startTime in metadata");
      }

      return metadata;
    } catch (error) {
      throw new Error(
        `Failed to parse metadata JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse all log entries from content
   */
  private parseLogEntries(content: string): LogEntry[] {
    const entries: LogEntry[] = [];
    const lines = content.split("\n");

    // Regex to match timestamped lines: [2025-10-25T05:45:15.754Z] content
    const timestampRegex =
      /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]\s*(.*)$/;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(timestampRegex);

      if (match) {
        const timestamp = match[1];
        const content = match[2];

        // Check if this is a USER INPUT line
        if (content.startsWith("USER INPUT: ")) {
          const cleanContent = content.replace("USER INPUT: ", "");
          entries.push({
            timestamp,
            type: "USER_INPUT",
            content: cleanContent,
            raw: line,
          });
          i++;
        }
        // Check if content starts with CON/END (server response on same line as timestamp)
        else if (content.match(/^(CON|END)\s/)) {
          // Server response starts on the same line as timestamp
          let serverResponse = content;
          i++;

          // Continue collecting lines until we hit a timestamp or separator
          // Note: Empty lines within the response are preserved for formatting
          while (i < lines.length) {
            const followingLine = lines[i];
            if (
              followingLine.match(timestampRegex) ||
              followingLine.startsWith("=")
            ) {
              break;
            }
            serverResponse += "\n" + followingLine;
            i++;
          }

          // Trim trailing empty lines from the response (log formatting)
          serverResponse = serverResponse.replace(/\n+$/, "");

          entries.push({
            timestamp,
            type: "SERVER_RESPONSE",
            content: serverResponse,
            raw: line,
          });
        }
        // Check if content is empty (server response follows on next line)
        else if (content.trim() === "") {
          // Look ahead for server response
          i++;
          if (i < lines.length) {
            const nextLine = lines[i];
            if (nextLine.match(/^(CON|END)\s/)) {
              // Collect all lines of the server response
              let serverResponse = nextLine;
              i++;

              // Continue collecting lines until we hit a timestamp or separator
              // Note: Empty lines within the response are preserved for formatting
              while (i < lines.length) {
                const followingLine = lines[i];
                if (
                  followingLine.match(timestampRegex) ||
                  followingLine.startsWith("=")
                ) {
                  break;
                }
                serverResponse += "\n" + followingLine;
                i++;
              }

              // Trim trailing empty lines from the response (log formatting)
              serverResponse = serverResponse.replace(/\n+$/, "");

              entries.push({
                timestamp,
                type: "SERVER_RESPONSE",
                content: serverResponse,
                raw: nextLine,
              });
            }
          }
        }
        // Other timestamped content
        else {
          entries.push({
            timestamp,
            type: "OTHER",
            content,
            raw: line,
          });
          i++;
        }
      } else {
        i++;
      }
    }

    return entries;
  }

  /**
   * Build conversation turns from log entries
   * A turn consists of a user input followed by a server response
   */
  private buildConversationTurns(
    entries: LogEntry[],
    sessionId: string
  ): ConversationTurn[] {
    const turns: ConversationTurn[] = [];

    // Find pairs of USER_INPUT followed by SERVER_RESPONSE
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.type === "USER_INPUT") {
        // Look for next SERVER_RESPONSE
        const nextResponse = entries
          .slice(i + 1)
          .find(e => e.type === "SERVER_RESPONSE");

        if (nextResponse) {
          const turn: ConversationTurn = {
            textSent: entry.content,
            serverReply: nextResponse.content,
            sessionId,
            timestamp: entry.timestamp,
          };
          turns.push(turn);
        }
      }
    }

    // Handle initial dial (empty input) - look for first SERVER_RESPONSE before any USER_INPUT
    const firstUserInputIndex = entries.findIndex(e => e.type === "USER_INPUT");
    const firstServerResponse = entries.find(e => e.type === "SERVER_RESPONSE");

    if (
      firstServerResponse &&
      (firstUserInputIndex === -1 ||
        entries.indexOf(firstServerResponse) < firstUserInputIndex)
    ) {
      // This is the initial dial response
      const initialTurn: ConversationTurn = {
        textSent: "", // Empty input for initial dial
        serverReply: firstServerResponse.content,
        sessionId,
        timestamp: firstServerResponse.timestamp,
      };
      turns.unshift(initialTurn); // Add at beginning
    }

    return turns;
  }

  /**
   * Extract flow name from log filename
   * Falls back to "unknown-flow" if cannot extract
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private extractFlowName(_logFilePath: string): string {
    // For now, return a generic name. User will provide flow name via CLI.
    return "unknown-flow";
  }

  /**
   * Validate that a SessionFixture has all required fields
   */
  validateFixture(fixture: SessionFixture): boolean {
    try {
      if (!fixture.flowName || typeof fixture.flowName !== "string") {
        throw new Error("flowName is required and must be a string");
      }
      if (!fixture.timestamp || typeof fixture.timestamp !== "string") {
        throw new Error("timestamp is required and must be a string");
      }
      if (!fixture.sessionId || typeof fixture.sessionId !== "string") {
        throw new Error("sessionId is required and must be a string");
      }
      if (!fixture.phoneNumber || typeof fixture.phoneNumber !== "string") {
        throw new Error("phoneNumber is required and must be a string");
      }
      if (!fixture.serviceCode || typeof fixture.serviceCode !== "string") {
        throw new Error("serviceCode is required and must be a string");
      }
      if (!Array.isArray(fixture.turns)) {
        throw new Error("turns must be an array");
      }

      // Validate each turn
      for (const turn of fixture.turns) {
        if (typeof turn.textSent !== "string") {
          throw new Error("turn.textSent must be a string");
        }
        if (typeof turn.serverReply !== "string") {
          throw new Error("turn.serverReply must be a string");
        }
        if (typeof turn.sessionId !== "string") {
          throw new Error("turn.sessionId must be a string");
        }
        if (typeof turn.timestamp !== "string") {
          throw new Error("turn.timestamp must be a string");
        }
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        "❌ Fixture validation failed:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }
}
