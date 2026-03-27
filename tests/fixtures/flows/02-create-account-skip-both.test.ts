/**
 * Generated Test: 02-create-account-skip-both
 *
 * This test was automatically generated from a recorded USSD session.
 *
 * Session Details:
 * - Flow: 02-create-account-skip-both
 * - Session ID: rec-02-create-account-skip-both-1774620308586-5
 * - Phone: +260971230001
 * - Service Code: *2233#
 * - Recorded: 2026-03-27T14:05:13.115Z
 * - Turns: 9
 *
 * Run with:
 *    pnpm test:flows:run              # Run all flow tests
 *    pnpm test:flows                  # Run in watch mode
 *
 * @generated
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Test Configuration
const SERVER_URL =
  process.env.USSD_TEST_SERVER_URL || "http://127.0.0.1:3005/api/ussd";
const SESSION_ID = `flow-test-02-create-account-skip-both-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const PHONE_NUMBER = "+260971230001";
const SERVICE_CODE = "*2233#";
const REQUEST_TIMEOUT = 5000;

/**
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
    throw new Error(`Server returned error: ${response.status} ${errorText}`);
  }

  return response.text();
}

describe("02-create-account-skip-both - USSD Flow Test", () => {
  beforeAll(async () => {
    console.log("🚀 Starting USSD flow test");
    console.log(`📡 Server: ${SERVER_URL}`);
    console.log(`📱 Phone: ${PHONE_NUMBER}`);
    console.log(`🔢 Service: ${SERVICE_CODE}`);
  });

  afterAll(() => {
    console.log("✅ USSD flow test completed");
  });

  it("Turn 1: Initial dial", async () => {
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("");

    // Expected server response
    const expected =
      "CON Welcome to USSD Example App\n1. Know More\n2. Account Menu\n*. Exit";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 2: Input: "2"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2");

    // Expected server response
    const expected =
      "CON Account Menu\n\nDo you have an existing account?\n1. Yes, log me in\n2. No, create my account\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 3: Input: "2"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2");

    // Expected server response
    const expected =
      "CON Welcome to USSD Example App\nEnter your full name:\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 4: Input: "Alice Brown"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2*Alice Brown");

    // Expected server response
    const expected =
      "CON Enter your email address (optional):\n00. Skip\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 5: Input: "00"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown*00"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2*Alice Brown*00");

    // Expected server response
    const expected = "CON Create a 5-digit PIN for your account:\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 6: Input: "43219"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown*00*43219"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2*Alice Brown*00*43219");

    // Expected server response
    const expected = "CON Confirm your 5-digit PIN:\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 7: Input: "43219"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown*00*43219*43219"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2*Alice Brown*00*43219*43219");

    // Expected server response
    const expected = "CON Creating your account...\n1. View your Customer ID";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 8: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown*00*43219*43219*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*2*Alice Brown*00*43219*43219*1");

    expect(response).toContain("CON Account created successfully!");
    expect(response).toContain("Save your Customer ID to access services.");
    expect(response).toMatch(/Customer ID: C[0-9A-F]+/);
  }, 10000); // 10 second timeout for this test

  it('Turn 9: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*2*Alice Brown*00*43219*43219*1*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(
      "2*2*Alice Brown*00*43219*43219*1*1"
    );

    // Expected server response
    const expected =
      "CON Account Menu\n\nDo you have an existing account?\n1. Yes, log me in\n2. No, create my account\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test
});
