/* eslint-disable no-console */
/**
 * Account Menu Machine Demo
 *
 * Interactive demonstration of the new modular account menu architecture.
 * Run with: pnpm tsx src/machines/app/account-menu/accountMenuMachine-demo.ts
 */

import { createActor } from "xstate";
import { accountMenuMachine } from "./accountMenuMachine.js";

console.log("🎯 Account Menu Machine Demo");
console.log("============================");

// Create actor with sample input
const actor = createActor(accountMenuMachine, {
  input: {
    sessionId: "demo-session-" + Date.now(),
    phoneNumber: "+260971234567",
    serviceCode: "*2233#",
  },
});

// Subscribe to state changes
actor.subscribe(snapshot => {
  console.log(`\n📱 Current State: ${snapshot.value}`);
  console.log(`💬 Message: ${snapshot.context.message}`);

  if (snapshot.status === "done") {
    console.log(`✅ Final Output:`, snapshot.output);
  }
});

console.log("\n🚀 Starting Account Menu Demo...");

// Start the machine
actor.start();

console.log("\n📋 Testing Account Menu Flow:");

// Test 1: Select Login (option 1)
console.log("\n1️⃣ User selects 'Yes, log me in' (option 1)");
actor.send({ type: "INPUT", input: "1" });

// Check if it completed
if (actor.getSnapshot().status === "done") {
  console.log("✅ Account menu completed - should route to login");

  // Create new actor for next test
  const actor2 = createActor(accountMenuMachine, {
    input: {
      sessionId: "demo-session-2-" + Date.now(),
      phoneNumber: "+260971234567",
      serviceCode: "*2233#",
    },
  });

  actor2.subscribe(snapshot => {
    if (snapshot.status === "done") {
      console.log(`✅ Test 2 Output:`, snapshot.output);
    }
  });

  actor2.start();

  // Test 2: Select Create Account (option 2)
  console.log("\n2️⃣ User selects 'No, create my account' (option 2)");
  actor2.send({ type: "INPUT", input: "2" });

  // Test 3: Cancel (option 0)
  const actor3 = createActor(accountMenuMachine, {
    input: {
      sessionId: "demo-session-3-" + Date.now(),
      phoneNumber: "+260971234567",
      serviceCode: "*2233#",
    },
  });

  actor3.subscribe(snapshot => {
    if (snapshot.status === "done") {
      console.log(`✅ Test 3 Output:`, snapshot.output);
    }
  });

  actor3.start();

  console.log("\n3️⃣ User selects 'Back' (option 0)");
  actor3.send({ type: "INPUT", input: "0" });
}

console.log("\n🎉 Account Menu Demo Complete!");
console.log("\n📊 Architecture Summary:");
console.log("   • ✅ Account Menu Machine: Routes between login/creation");
console.log("   • ✅ Login Machine: Handles existing user authentication");
console.log("   • ✅ Account Creation Machine: Handles new user registration");
console.log("   • ✅ Modular Design: Each machine has single responsibility");
console.log(
  "   • ✅ Clean Routing: Main machine delegates to appropriate child"
);
console.log("   • ✅ Type Safety: Full TypeScript support with XState v5");

console.log("\n🔄 Next Steps:");
console.log("   • Test login machine independently");
console.log("   • Test account creation machine independently");
console.log("   • Integrate with main example wallet machine");
console.log("   • Add IXO account creation to account creation flow");
