/* eslint-disable no-console */
/**
 * Parent (App) Machine Demo
 *
 * Demonstrates the main orchestrator flow:
 * - Starting a USSD session (DIAL_USSD)
 * - Navigating main menu
 * - Delegating to child machines (Know More, Account Menu)
 * - Handling login and account creation returns
 *
 * Run with: pnpm tsx src/machines/example/parentMachine-demo.ts
 */

import { createActor } from "xstate";
import { appMachine } from "./parentMachine.js";

console.log("🚀 Parent (App) Machine Demo\n");

const baseInput = {
  sessionId: "demo-session-" + Date.now(),
  phoneNumber: "+260971234567",
  serviceCode: "*2233#",
};

function logSnapshot(tag: string) {
  return (snapshot: any) => {
    console.log(`\n[${tag}] 📍 State:`, snapshot.value);
    if (snapshot.context?.message) {
      console.log(`[${tag}] 💬 Message:\n${snapshot.context.message}`);
    }
    if (snapshot.context?.error) {
      console.log(`[${tag}] ❌ Error: ${snapshot.context.error}`);
    }
  };
}

// Demo 1: Start and show preMenu
console.log("=".repeat(50));
console.log("DEMO 1: Start session and show preMenu");
console.log("=".repeat(50));

const actor1 = createActor(appMachine, { input: baseInput });
actor1.subscribe(logSnapshot("DEMO1"));
actor1.start();
actor1.send({
  type: "DIAL_USSD",
  phoneNumber: baseInput.phoneNumber,
  serviceCode: baseInput.serviceCode,
});

// Demo 2: Navigate to Know More and return
console.log("\n" + "=".repeat(50));
console.log("DEMO 2: Navigate to Know More and return to main menu");
console.log("=".repeat(50));

const actor2 = createActor(appMachine, { input: baseInput });
actor2.subscribe(logSnapshot("DEMO2"));
actor2.start();
actor2.send({
  type: "DIAL_USSD",
  phoneNumber: baseInput.phoneNumber,
  serviceCode: baseInput.serviceCode,
});
actor2.send({ type: "INPUT", input: "1" }); // Select Know More
// child runs and should route back to preMenu on completion

// Demo 3: Navigate to Account Menu → choose Login, then back
console.log("\n" + "=".repeat(50));
console.log("DEMO 3: Account Menu → Login path");
console.log("=".repeat(50));

const actor3 = createActor(appMachine, { input: baseInput });
actor3.subscribe(logSnapshot("DEMO3"));
actor3.start();
actor3.send({
  type: "DIAL_USSD",
  phoneNumber: baseInput.phoneNumber,
  serviceCode: baseInput.serviceCode,
});
actor3.send({ type: "INPUT", input: "2" }); // Go to Account Menu
// For demo purposes we won't simulate full login machine inputs here, as loginMachine handles its own flow.

// Demo 4: Exit from preMenu
console.log("\n" + "=".repeat(50));
console.log("DEMO 4: Exit from preMenu");
console.log("=".repeat(50));

const actor4 = createActor(appMachine, { input: baseInput });
actor4.subscribe(logSnapshot("DEMO4"));
actor4.start();
actor4.send({
  type: "DIAL_USSD",
  phoneNumber: baseInput.phoneNumber,
  serviceCode: baseInput.serviceCode,
});
actor4.send({ type: "INPUT", input: "*" }); // Exit

console.log("\n🎉 Parent (App) Machine Demo Complete!");
