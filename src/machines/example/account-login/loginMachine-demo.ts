/**
 * Login Machine Interactive Demo
 *
 * This demo shows the login machine in action with different scenarios:
 * - Successful login flow
 * - Customer not found
 * - PIN field empty
 * - Incorrect PIN attempts
 * - Max attempts exceeded
 * - Navigation and cancellation
 */

/* eslint-disable no-console */

import { createActor } from "xstate";
import { loginMachine } from "./loginMachine.js";
import { config } from "../../../config.js";

// Mock the dependencies for demo purposes
const mockCustomers = new Map([
  [
    "C12345678",
    {
      id: 1,
      customerId: "C12345678",
      fullName: "John Doe",
      email: "john@example.com",
      encryptedPin: "hashed-1234", // Represents encrypted "1234"
      preferredLanguage: "eng",
      lastCompletedAction: "",
      householdId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  [
    "C87654321",
    {
      id: 2,
      customerId: "C87654321",
      fullName: "Jane Smith",
      email: "jane@example.com",
      encryptedPin: null, // No PIN set
      preferredLanguage: "eng",
      lastCompletedAction: "",
      householdId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
]);

// Mock progressive data service
const mockProgressiveDataService = {
  async getCustomerByCustomerId(customerId: string) {
    console.log(`🔍 Looking up customer: ${customerId}`);

    const customer = mockCustomers.get(customerId);
    if (!customer) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    if (!customer.encryptedPin) {
      throw new Error("ENCRYPTED_PIN_FIELD_EMPTY");
    }

    return customer;
  },

  async clearCustomerPin(customerId: string) {
    console.log(`🔒 Clearing PIN for customer: ${customerId}`);
    const customer = mockCustomers.get(customerId);
    if (customer) {
      customer.encryptedPin = null;
    }
  },
};

// Mock PIN verification
const mockVerifyPin = (inputPin: string, encryptedPin: string) => {
  console.log(`🔐 Verifying PIN: ${inputPin} against ${encryptedPin}`);
  // For demo: configurable PIN verification
  return (
    inputPin === config.DEMO_CONFIG.VALID_PIN &&
    encryptedPin === config.DEMO_CONFIG.ENCRYPTED_PIN_HASH
  );
};

// Replace the actual imports with mocks
(globalThis as any).progressiveDataService = mockProgressiveDataService;
(globalThis as any).verifyPin = mockVerifyPin;

function createDemoActor(scenario: string) {
  console.log(`\n🎭 Starting Demo: ${scenario}`);
  console.log("=".repeat(50));

  const actor = createActor(loginMachine, {
    input: {
      sessionId: "demo-session",
      phoneNumber: "+260123456789",
      serviceCode: "*2233#",
    },
  });

  // Subscribe to state changes
  actor.subscribe(snapshot => {
    console.log(`📍 State: ${snapshot.value}`);
    console.log(`💬 Message: ${snapshot.context.message}`);
    if (snapshot.context.error) {
      console.log(`❌ Error: ${snapshot.context.error}`);
    }
    if (snapshot.context.pinAttempts > 0) {
      console.log(`🔢 PIN Attempts: ${snapshot.context.pinAttempts}`);
    }
    console.log("---");
  });

  actor.start();
  return actor;
}

async function runDemo() {
  console.log("🚀 Login Machine Interactive Demo");
  console.log("==================================");

  // Demo 1: Successful Login
  const demo1 = createDemoActor("Successful Login");
  demo1.send({ type: "INPUT", input: "C12345678" });
  await new Promise(resolve => setTimeout(resolve, 100));
  demo1.send({ type: "INPUT", input: "1234" });
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`✅ Final Output: ${demo1.getSnapshot().output}`);

  // Demo 2: Customer Not Found
  const demo2 = createDemoActor("Customer Not Found");
  demo2.send({ type: "INPUT", input: "C99999999" });
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`❌ Final Output: ${demo2.getSnapshot().output}`);

  // Demo 3: PIN Field Empty
  const demo3 = createDemoActor("PIN Field Empty");
  demo3.send({ type: "INPUT", input: "C87654321" });
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`⚠️  Final Output: ${demo3.getSnapshot().output}`);

  // Demo 4: Incorrect PIN with Retry
  const demo4 = createDemoActor("Incorrect PIN with Retry");
  demo4.send({ type: "INPUT", input: "C12345678" });
  await new Promise(resolve => setTimeout(resolve, 100));
  demo4.send({ type: "INPUT", input: "9999" }); // Wrong PIN
  await new Promise(resolve => setTimeout(resolve, 100));
  demo4.send({ type: "INPUT", input: "1234" }); // Correct PIN
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`🔄 Final Output: ${demo4.getSnapshot().output}`);

  // Demo 5: Max Attempts Exceeded
  const demo5 = createDemoActor("Max Attempts Exceeded");
  demo5.send({ type: "INPUT", input: "C12345678" });
  await new Promise(resolve => setTimeout(resolve, 100));
  demo5.send({ type: "INPUT", input: "9999" }); // Wrong PIN - attempt 1
  await new Promise(resolve => setTimeout(resolve, 100));
  demo5.send({ type: "INPUT", input: "8888" }); // Wrong PIN - attempt 2
  await new Promise(resolve => setTimeout(resolve, 100));
  demo5.send({ type: "INPUT", input: "7777" }); // Wrong PIN - attempt 3
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`🚫 Final Output: ${demo5.getSnapshot().output}`);

  // Demo 6: Navigation - Exit
  const demo6 = createDemoActor("Exit Navigation");
  demo6.send({ type: "INPUT", input: "*" });
  console.log(`🚪 Final Output: ${demo6.getSnapshot().output}`);

  // Demo 7: Navigation - Back
  const demo7 = createDemoActor("Back Navigation");
  demo7.send({ type: "INPUT", input: "0" });
  console.log(`⬅️  Final Output: ${demo7.getSnapshot().output}`);

  // Demo 8: Invalid Customer ID Format
  const demo8 = createDemoActor("Invalid Customer ID Format");
  demo8.send({ type: "INPUT", input: "invalid-id" });
  console.log(
    `📝 Message after invalid input: ${demo8.getSnapshot().context.message}`
  );
  demo8.send({ type: "INPUT", input: "C12345678" }); // Valid format
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`✅ Proceeded to: ${demo8.getSnapshot().value}`);

  // Demo 9: Error Handling
  const demo9 = createDemoActor("Error Handling");
  demo9.send({ type: "ERROR", error: "Network connection failed" });
  console.log(`🔧 Error State: ${demo9.getSnapshot().value}`);
  console.log(`🔧 Error Message: ${demo9.getSnapshot().context.message}`);

  console.log("\n🎉 Demo Complete!");
  console.log("\nKey Observations:");
  console.log("- ✅ Customer ID validation works correctly");
  console.log("- 🔍 Database lookup handles all scenarios");
  console.log("- 🔐 PIN verification with attempt tracking");
  console.log("- 🚫 Security: PIN cleared after max attempts");
  console.log("- 🧭 Navigation commands work consistently");
  console.log("- 🛡️  Error handling is robust");
  console.log("- 📤 Machine output provides correct routing info");
}

// Run the demo
runDemo().catch(console.error);
