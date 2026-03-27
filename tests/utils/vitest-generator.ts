import { SessionFixture } from "../helpers/session-recorder.js";

/**
 * Metadata that controls how generated tests handle dynamic values like Customer IDs.
 */
export interface FlowMetadata {
  /** If true, this flow needs to query DB for customer ID before running */
  needsCustomerId?: boolean;
  /** If true, promote first customer to lead_generator before this flow */
  needsLeadGeneratorPromotion?: boolean;
  /** If true, this flow needs a second customer ID */
  needsSecondCustomerId?: boolean;
  /** Placeholder customer ID used during recording (will be replaced at runtime) */
  recordedCustomerId?: string;
  /** Second placeholder customer ID used during recording */
  recordedSecondCustomerId?: string;
  /** If true, response contains a generated Customer ID — use regex matching */
  hasCustomerIdInResponse?: boolean;
  /** If true, login success responses use regex matching for customer name */
  hasLoginSuccessResponse?: boolean;
}

/**
 * VitestGenerator generates Vitest test files from SessionFixture objects.
 *
 * The generated tests replay the session against a running USSD server via HTTP,
 * comparing actual responses with expected responses from the recorded session.
 *
 * @example
 * ```typescript
 * const generator = new VitestGenerator();
 * const testCode = generator.generateTestFile(fixture, 'login-flow');
 * fs.writeFileSync('tests/flows/login-flow.test.ts', testCode);
 * ```
 */
export class VitestGenerator {
  /**
   * Generate a complete Vitest test file from a SessionFixture
   */
  generateTestFile(
    fixture: SessionFixture,
    flowName: string,
    metadata?: FlowMetadata
  ): string {
    const parts: string[] = [];
    parts.push(this.generateFileHeader(fixture, flowName));
    parts.push(this.generateImports(metadata));
    if (metadata?.needsCustomerId) {
      parts.push(this.generateDbVariables(metadata));
    }
    parts.push(this.generateTestConfig(fixture));
    parts.push(this.generateHttpHelper());
    parts.push(this.generateTestSuite(fixture, flowName, metadata));
    return parts.join("\n\n");
  }

  private generateFileHeader(
    fixture: SessionFixture,
    flowName: string
  ): string {
    return `/**
 * Generated Test: ${flowName}
 *
 * This test was automatically generated from a recorded USSD session.
 *
 * Session Details:
 * - Flow: ${fixture.flowName}
 * - Session ID: ${fixture.sessionId}
 * - Phone: ${fixture.phoneNumber}
 * - Service Code: ${fixture.serviceCode}
 * - Recorded: ${fixture.timestamp}
 * - Turns: ${fixture.turns.length}
 *
 * Run with:
 *    pnpm test:flows:run              # Run all flow tests
 *    pnpm test:flows                  # Run in watch mode
 *
 * @generated
 */`;
  }

  private generateDbVariables(metadata: FlowMetadata): string {
    const lines: string[] = [];
    lines.push(`// Dynamic Customer IDs — resolved from DB at runtime`);
    lines.push(`let CUSTOMER_ID: string;`);
    if (metadata.needsSecondCustomerId) {
      lines.push(`let SECOND_CUSTOMER_ID: string;`);
    }
    return lines.join("\n");
  }

  private generateImports(metadata?: FlowMetadata): string {
    const lines: string[] = [];
    lines.push(
      `import { describe, it, expect, beforeAll, afterAll } from "vitest";`
    );
    if (metadata?.needsCustomerId) {
      const helpers = ["getFirstCustomerId"];
      if (metadata.needsSecondCustomerId) helpers.push("getCustomerIds");
      if (metadata.needsLeadGeneratorPromotion)
        helpers.push("promoteToLeadGenerator");
      helpers.push("closeDbPool");
      lines.push(`import { ${helpers.join(", ")} } from "./setup.js";`);
    }
    return lines.join("\n");
  }

  private generateTestConfig(fixture: SessionFixture): string {
    const flowNameForId = fixture.flowName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    return `// Test Configuration
const SERVER_URL = process.env.USSD_TEST_SERVER_URL || "http://127.0.0.1:3005/api/ussd";
const SESSION_ID = \`flow-test-${flowNameForId}-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
const PHONE_NUMBER = "${fixture.phoneNumber}";
const SERVICE_CODE = "${fixture.serviceCode}";
const REQUEST_TIMEOUT = 5000;`;
  }

  private generateHttpHelper(): string {
    return `/**
 * Send a USSD request to the server
 */
async function sendUssdRequest(text: string): Promise<string> {
  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Vitest-Generated-Test/1.0",
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      serviceCode: SERVICE_CODE,
      phoneNumber: PHONE_NUMBER,
      text,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Server returned error: \${response.status} \${errorText}\`);
  }

  return response.text();
}`;
  }

  private generateTestSuite(
    fixture: SessionFixture,
    flowName: string,
    metadata?: FlowMetadata
  ): string {
    const parts: string[] = [];
    parts.push(`describe("${flowName} - USSD Flow Test", () => {`);
    parts.push(this.indent(this.generateBeforeAll(metadata), 1));
    parts.push(this.indent(this.generateAfterAll(metadata), 1));

    fixture.turns.forEach((turn, index) => {
      const cumulativeText = this.buildCumulativeText(fixture.turns, index);
      parts.push(
        this.indent(
          this.generateTestCase(turn, index, cumulativeText, metadata),
          1
        )
      );
    });

    parts.push("});");
    return parts.join("\n\n");
  }

  private buildCumulativeText(
    turns: Array<{ textSent: string }>,
    currentIndex: number
  ): string {
    const inputs: string[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      const input = turns[i].textSent;
      if (input !== "") {
        inputs.push(input);
      }
    }
    return inputs.join("*");
  }

  private generateBeforeAll(metadata?: FlowMetadata): string {
    const lines: string[] = [];
    lines.push(`beforeAll(async () => {`);
    if (metadata?.needsCustomerId) {
      lines.push(`  CUSTOMER_ID = await getFirstCustomerId();`);
      lines.push(`  console.log(\`🔑 Customer ID from DB: \${CUSTOMER_ID}\`);`);
    }
    if (metadata?.needsSecondCustomerId) {
      lines.push(`  const ids = await getCustomerIds();`);
      lines.push(`  SECOND_CUSTOMER_ID = ids[1];`);
      lines.push(
        `  console.log(\`🔑 Second Customer ID from DB: \${SECOND_CUSTOMER_ID}\`);`
      );
    }
    if (metadata?.needsLeadGeneratorPromotion) {
      lines.push(`  await promoteToLeadGenerator(CUSTOMER_ID);`);
      lines.push(
        `  console.log(\`👑 Promoted \${CUSTOMER_ID} to lead_generator\`);`
      );
    }
    lines.push(`  console.log("🚀 Starting USSD flow test");`);
    lines.push(`  console.log(\`📡 Server: \${SERVER_URL}\`);`);
    lines.push(`  console.log(\`📱 Phone: \${PHONE_NUMBER}\`);`);
    lines.push(`  console.log(\`🔢 Service: \${SERVICE_CODE}\`);`);
    lines.push(`});`);
    return lines.join("\n");
  }

  private generateAfterAll(metadata?: FlowMetadata): string {
    if (metadata?.needsCustomerId) {
      return `afterAll(async () => {
  await closeDbPool();
  console.log("✅ USSD flow test completed");
});`;
    }
    return `afterAll(() => {
  console.log("✅ USSD flow test completed");
});`;
  }

  private containsRecordedId(text: string, metadata?: FlowMetadata): boolean {
    if (!metadata) return false;
    if (
      metadata.recordedCustomerId &&
      text.includes(metadata.recordedCustomerId)
    )
      return true;
    if (
      metadata.recordedSecondCustomerId &&
      text.includes(metadata.recordedSecondCustomerId)
    )
      return true;
    return false;
  }

  private substituteCustomerIds(text: string, metadata: FlowMetadata): string {
    let result = text;
    if (metadata.recordedCustomerId) {
      result = result.split(metadata.recordedCustomerId).join("${CUSTOMER_ID}");
    }
    if (metadata.recordedSecondCustomerId) {
      result = result
        .split(metadata.recordedSecondCustomerId)
        .join("${SECOND_CUSTOMER_ID}");
    }
    return result;
  }

  private escapeForTemplateLiteral(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/` /g, "\\`")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  /**
   * Check whether a server reply contains a newly generated Customer ID.
   */
  private responseHasDynamicCustomerId(
    reply: string,
    metadata?: FlowMetadata
  ): boolean {
    if (!metadata?.hasCustomerIdInResponse) return false;
    return (
      /Your Customer ID: C[0-9A-F]+/.test(reply) ||
      /Customer ID: C[0-9A-F]+/.test(reply)
    );
  }

  /**
   * Check whether a server reply is a login success message.
   */
  private isLoginSuccessResponse(
    reply: string,
    metadata?: FlowMetadata
  ): boolean {
    if (!metadata?.hasLoginSuccessResponse) return false;
    return (
      reply.includes("Welcome, ") &&
      reply.includes("Login successful for Customer ID:")
    );
  }

  private generateTestCase(
    turn: { textSent: string; serverReply: string; timestamp: string },
    index: number,
    cumulativeText: string,
    metadata?: FlowMetadata
  ): string {
    const turnNumber = index + 1;
    const inputDescription =
      turn.textSent === "" ? "Initial dial" : `Input: "${turn.textSent}"`;
    const escapedDescription = this.escapeString(inputDescription);

    const delayCode =
      turnNumber > 1
        ? `\n  // Simulate realistic user interaction timing (2-second delay)\n  await new Promise(resolve => setTimeout(resolve, 2000));\n`
        : "";

    const inputHasId = this.containsRecordedId(cumulativeText, metadata);
    const responseHasId = this.containsRecordedId(turn.serverReply, metadata);
    const responseHasDynamic = this.responseHasDynamicCustomerId(
      turn.serverReply,
      metadata
    );
    const isLoginSuccess = this.isLoginSuccessResponse(
      turn.serverReply,
      metadata
    );

    // Build the sendUssdRequest argument
    let requestArg: string;
    if (inputHasId && metadata) {
      const substituted = this.substituteCustomerIds(cumulativeText, metadata);
      const escaped = this.escapeForTemplateLiteral(substituted);
      requestArg = `\`${escaped}\``;
    } else {
      requestArg = `"${this.escapeString(cumulativeText)}"`;
    }

    // Build cumulative comment
    const cumulativeComment =
      cumulativeText !== "" && cumulativeText !== turn.textSent
        ? `\n  // Cumulative USSD text: "${this.escapeString(cumulativeText)}"`
        : "";

    // Build assertion
    let assertionBlock: string;

    if (responseHasDynamic) {
      const parts = turn.serverReply.split(/C[0-9A-F]+/);
      const assertions: string[] = [];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          const escapedPart = this.escapeString(trimmed.split("\n")[0]);
          if (escapedPart.length > 5) {
            assertions.push(`  expect(response).toContain("${escapedPart}");`);
          }
        }
      }
      assertions.push(`  expect(response).toMatch(/Customer ID: C[0-9A-F]+/);`);
      assertionBlock = assertions.join("\n");
    } else if (isLoginSuccess) {
      assertionBlock = `  // Login success — customer name and ID are dynamic
  expect(response).toMatch(/CON Welcome, .+!\\nLogin successful for Customer ID: C[0-9A-F]+\\.\\n1\\. Continue/);`;
    } else if (responseHasId && metadata) {
      const substituted = this.substituteCustomerIds(
        turn.serverReply,
        metadata
      );
      const escaped = this.escapeForTemplateLiteral(substituted);
      assertionBlock = `  // Expected server response (with dynamic Customer ID)
  const expected = \`${escaped}\`;

  // Assert response matches expected
  expect(response).toBe(expected);`;
    } else {
      const escapedExpected = this.escapeString(turn.serverReply);
      assertionBlock = `  // Expected server response
  const expected = "${escapedExpected}";

  // Assert response matches expected
  expect(response).toBe(expected);`;
    }

    return `it("Turn ${turnNumber}: ${escapedDescription}", async () => {${delayCode}${cumulativeComment}
  // Send user input (USSD requires cumulative text)
  const response = await sendUssdRequest(${requestArg});

${assertionBlock}
}, 10000); // 10 second timeout for this test`;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  private indent(text: string, levels: number): string {
    const indentation = "  ".repeat(levels);
    return text
      .split("\n")
      .map(line => (line.trim() ? indentation + line : line))
      .join("\n");
  }

  validateGeneratedCode(code: string): boolean {
    try {
      if (!code.includes("describe("))
        throw new Error("Missing describe block");
      if (!code.includes("import")) throw new Error("Missing imports");
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      if (openBraces !== closeBraces) throw new Error("Unbalanced braces");
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      if (openParens !== closeParens) throw new Error("Unbalanced parentheses");
      return true;
    } catch (error) {
      console.error(
        "❌ Generated code validation failed:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }
}
