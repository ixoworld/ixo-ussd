/* eslint-disable no-console */
/**
 * Account Creation Machine Demo
 *
 * Interactive demonstration of the account creation flow.
 * Now includes background IXO account creation!
 * Run with: pnpm tsx src/machines/app/account-creation/accountCreationMachine-demo.ts
 */

import { createActor } from "xstate";
import { accountCreationMachine } from "./accountCreationMachine.js";

// Mock the progressive data service for demo
const mockProgressiveDataService = {
  createOrUpdatePhoneRecord: async (phoneNumber: string) => {
    console.log(`📞 Creating phone record for ${phoneNumber}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    return {
      id: 1,
      phoneNumber,
      firstSeen: new Date(),
      lastSeen: new Date(),
      numberOfVisits: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  createCustomerRecord: async (phoneId: number, customerData: any) => {
    console.log(`👤 Creating customer record:`, {
      phoneId,
      fullName: customerData.fullName,
      email: customerData.email,
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return {
      id: 1,
      customerId: `C${Math.floor(10000000 + Math.random() * 90000000)
        .toString(16)
        .toUpperCase()}`,
      fullName: customerData.fullName,
      email: customerData.email,
      encryptedPin: "encrypted_" + customerData.pin,
      preferredLanguage: customerData.preferredLanguage,
      lastCompletedAction: customerData.lastCompletedAction,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};

// Replace the import with our mock
(global as any).progressiveDataService = mockProgressiveDataService;

console.log("🚀 Account Creation Machine Demo");
console.log("================================");

const mockInput = {
  sessionId: "demo-session-" + Date.now(),
  phoneNumber: "+260971230000",
  serviceCode: "*2233#",
};

const actor = createActor(accountCreationMachine, { input: mockInput });

// Subscribe to state changes
actor.subscribe(snapshot => {
  console.log(`\n📍 State: ${snapshot.value}`);
  console.log(`💬 Message: ${snapshot.context.message}`);
  console.log(`🎯 Next Parent State: ${snapshot.context.nextParentState}`);

  if (snapshot.context.error) {
    console.log(`❌ Error: ${snapshot.context.error}`);
  }

  if (snapshot.status === "done") {
    console.log(`✅ Final Output:`, snapshot.output);
    console.log("\n🎉 Demo completed!");
    process.exit(0);
  }
});

// Start the machine
actor.start();

console.log("\n🎬 Starting demo flow...");

// Demo flow: Complete account creation
setTimeout(() => {
  console.log("\n👤 Entering full name: 'John Doe'");
  actor.send({ type: "INPUT", input: "John Doe" });
}, 1000);

setTimeout(() => {
  console.log("\n📧 Entering email: 'john@example.com'");
  actor.send({ type: "INPUT", input: "john@example.com" });
}, 2000);

setTimeout(() => {
  console.log("\n🔐 Entering PIN: '10101'");
  actor.send({ type: "INPUT", input: "10101" });
}, 3000);

setTimeout(() => {
  console.log("\n🔐 Confirming PIN: '10101'");
  actor.send({ type: "INPUT", input: "10101" });
}, 4000);

// The machine will automatically proceed to create the account via the service

// Alternative demo flows (uncomment to test):

// Demo: PIN mismatch flow
/*
setTimeout(() => {
  console.log("\n👤 Entering full name: 'Jane Smith'");
  actor.send({ type: "INPUT", input: "Jane Smith" });
}, 1000);

setTimeout(() => {
  console.log("\n📧 Skipping email with '00'");
  actor.send({ type: "INPUT", input: "00" });
}, 2000);

setTimeout(() => {
  console.log("\n🔐 Entering PIN: '1234'");
  actor.send({ type: "INPUT", input: "1234" });
}, 3000);

setTimeout(() => {
  console.log("\n🔐 Confirming PIN with mismatch: '5678'");
  actor.send({ type: "INPUT", input: "5678" });
}, 4000);

setTimeout(() => {
  console.log("\n🔐 Re-entering PIN: '1234'");
  actor.send({ type: "INPUT", input: "1234" });
}, 5000);

setTimeout(() => {
  console.log("\n🔐 Confirming PIN correctly: '1234'");
  actor.send({ type: "INPUT", input: "1234" });
}, 6000);
*/

// Demo: Cancellation flow
/*
setTimeout(() => {
  console.log("\n❌ Cancelling with '*'");
  actor.send({ type: "INPUT", input: "*" });
}, 1000);
*/

// Demo: Back navigation
/*
setTimeout(() => {
  console.log("\n👤 Entering full name: 'Test User'");
  actor.send({ type: "INPUT", input: "Test User" });
}, 1000);

setTimeout(() => {
  console.log("\n⬅️ Going back with '0'");
  actor.send({ type: "INPUT", input: "0" });
}, 2000);

setTimeout(() => {
  console.log("\n👤 Re-entering full name: 'Final User'");
  actor.send({ type: "INPUT", input: "Final User" });
}, 3000);

setTimeout(() => {
  console.log("\n📧 Skipping email with '00'");
  actor.send({ type: "INPUT", input: "00" });
}, 4000);

setTimeout(() => {
  console.log("\n🔐 Entering PIN: '9999'");
  actor.send({ type: "INPUT", input: "9999" });
}, 5000);

setTimeout(() => {
  console.log("\n🔐 Confirming PIN: '9999'");
  actor.send({ type: "INPUT", input: "9999" });
}, 6000);
*/

console.log("\n🔄 Background Processing Note:");
console.log(
  "After account creation completes, IXO blockchain account creation"
);
console.log(
  "will continue in the background without blocking the user experience."
);
console.log(
  "Check logs/ixo-creation-failures.log for any background processing issues."
);

// Cleanup after 30 seconds if demo doesn't complete
setTimeout(() => {
  console.log("\n⏰ Demo timeout - exiting");
  process.exit(0);
}, 30000);
