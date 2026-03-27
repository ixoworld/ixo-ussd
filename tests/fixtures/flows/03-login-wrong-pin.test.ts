/**
 * Generated Test: 03-login-wrong-pin
 *
 * This test was automatically generated from a recorded USSD session.
 *
 * Session Details:
 * - Flow: 03-login-wrong-pin
 * - Session ID: rec-03-login-wrong-pin-1774620323235-8
 * - Phone: +260971230001
 * - Service Code: *2233#
 * - Recorded: 2026-03-27T14:05:28.284Z
 * - Turns: 10
 *
 * Run with:
 *    pnpm test:flows:run              # Run all flow tests
 *    pnpm test:flows                  # Run in watch mode
 *
 * @generated
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getFirstCustomerId, closeDbPool } from "./setup.js";

// Dynamic Customer IDs — resolved from DB at runtime
let CUSTOMER_ID: string;

// Test Configuration
const SERVER_URL =
  process.env.USSD_TEST_SERVER_URL || "http://127.0.0.1:3005/api/ussd";
const SESSION_ID = `flow-test-03-login-wrong-pin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

describe("03-login-wrong-pin - USSD Flow Test", () => {
  beforeAll(async () => {
    CUSTOMER_ID = await getFirstCustomerId();
    console.log(`🔑 Customer ID from DB: ${CUSTOMER_ID}`);
    console.log("🚀 Starting USSD flow test");
    console.log(`📡 Server: ${SERVER_URL}`);
    console.log(`📱 Phone: ${PHONE_NUMBER}`);
    console.log(`🔢 Service: ${SERVICE_CODE}`);
  });

  afterAll(async () => {
    await closeDbPool();
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

  it('Turn 3: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest("2*1");

    // Expected server response
    const expected = "CON Enter your Customer ID to log in:\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 4: Input: "CE3D5D483"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(`2*1*${CUSTOMER_ID}`);

    // Expected server response
    const expected = "CON Verifying Customer ID...\n1. Continue\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 5: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(`2*1*${CUSTOMER_ID}*1`);

    // Expected server response
    const expected = "CON Enter your PIN:\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 6: Input: "99999"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1*99999"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(`2*1*${CUSTOMER_ID}*1*99999`);

    // Expected server response
    const expected = "CON Verifying PIN...\n1. Continue\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 7: Input: "43219"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1*99999*43219"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(`2*1*${CUSTOMER_ID}*1*99999*43219`);

    // Expected server response
    const expected = "CON Verifying PIN...\n1. Continue\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 8: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1*99999*43219*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(
      `2*1*${CUSTOMER_ID}*1*99999*43219*1`
    );

    // Login success — customer name and ID are dynamic
    expect(response).toMatch(
      /CON Welcome, .+!\nLogin successful for Customer ID: C[0-9A-F]+\.\n1\. Continue/
    );
  }, 10000); // 10 second timeout for this test

  it('Turn 9: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1*99999*43219*1*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(
      `2*1*${CUSTOMER_ID}*1*99999*43219*1*1`
    );

    // Expected server response
    const expected =
      "CON Welcome to USSD Example App\n1. Know More\n2. Account Menu\n*. Exit";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test

  it('Turn 10: Input: "1"', async () => {
    // Simulate realistic user interaction timing (2-second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cumulative USSD text: "2*1*CE3D5D483*1*99999*43219*1*1*1"
    // Send user input (USSD requires cumulative text)
    const response = await sendUssdRequest(
      `2*1*${CUSTOMER_ID}*1*99999*43219*1*1*1`
    );

    // Expected server response
    const expected =
      "CON Welcome to USSD Example App Information Center\n1. Interested in Product\n2. Pricing & accessories\n3. Can we deliver to you?\n0. Back";

    // Assert response matches expected
    expect(response).toBe(expected);
  }, 10000); // 10 second timeout for this test
});
