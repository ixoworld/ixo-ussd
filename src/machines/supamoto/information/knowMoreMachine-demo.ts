/* eslint-disable no-console */
import { createActor } from "xstate";
import { knowMoreMachine } from "./knowMoreMachine.js";

/**
 * Know More Machine Demo
 *
 * Demonstrates the know more machine functionality including:
 * - Information menu navigation
 * - Product information display with pagination
 * - Service information display
 * - About and contact information
 * - Error handling and recovery
 */

console.log("🚀 Know More Machine Demo\n");

const mockInput = {
  sessionId: "demo-session-789",
  phoneNumber: "+260987654321",
  serviceCode: "*2233#",
};

// Demo 1: Product Information with Pagination
console.log("=".repeat(50));
console.log("DEMO 1: Product Information with Pagination");
console.log("=".repeat(50));

const actor1 = createActor(knowMoreMachine, { input: mockInput });
actor1.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.context.selectedInfo) {
    console.log(`📋 Selected Info: ${snapshot.context.selectedInfo}`);
  }
  if (snapshot.context.infoContent) {
    console.log(`📄 Content:\n${snapshot.context.infoContent}`);
  }
  if (snapshot.context.currentInfoPage && snapshot.context.totalInfoPages) {
    console.log(
      `📖 Page: ${snapshot.context.currentInfoPage}/${snapshot.context.totalInfoPages}`
    );
  }
  if (snapshot.output) {
    console.log(`🎯 Output:`, snapshot.output);
  }
  console.log("");
});

actor1.start();
console.log("📱 User started know more flow (automatic)");

actor1.send({ type: "SELECT_1" }); // Product Information
console.log("📱 User selected product information");

actor1.send({ type: "NEXT_PAGE" });
console.log("📱 User navigated to next page");

actor1.send({ type: "PREVIOUS_PAGE" });
console.log("📱 User navigated to previous page");

console.log("✅ Product information flow complete!\n");

// Demo 2: Service Information
console.log("=".repeat(50));
console.log("DEMO 2: Service Information");
console.log("=".repeat(50));

const actor2 = createActor(knowMoreMachine, { input: mockInput });
actor2.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.context.infoContent) {
    console.log(`📄 Content:\n${snapshot.context.infoContent}`);
  }
  console.log("");
});

actor2.start();
actor2.send({ type: "SELECT_2" }); // Service Information
console.log("📱 User selected service information");

console.log("✅ Service information displayed!\n");

// Demo 3: About Information
console.log("=".repeat(50));
console.log("DEMO 3: About Information");
console.log("=".repeat(50));

const actor3 = createActor(knowMoreMachine, { input: mockInput });
actor3.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.context.infoContent) {
    console.log(`📄 Content:\n${snapshot.context.infoContent}`);
  }
  console.log("");
});

actor3.start();
actor3.send({ type: "SELECT_3" }); // About Information
console.log("📱 User selected about information");

console.log("✅ About information displayed!\n");

// Demo 4: Contact Information
console.log("=".repeat(50));
console.log("DEMO 4: Contact Information");
console.log("=".repeat(50));

const actor4 = createActor(knowMoreMachine, { input: mockInput });
actor4.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.context.infoContent) {
    console.log(`📄 Content:\n${snapshot.context.infoContent}`);
  }
  console.log("");
});

actor4.start();
actor4.send({ type: "SELECT_4" }); // Contact Information
console.log("📱 User selected contact information");

console.log("✅ Contact information displayed!\n");

// Demo 5: Navigation Flow
console.log("=".repeat(50));
console.log("DEMO 5: Navigation Flow");
console.log("=".repeat(50));

const actor5 = createActor(knowMoreMachine, { input: mockInput });
actor5.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.output) {
    console.log(`🎯 Output:`, snapshot.output);
  }
  console.log("");
});

actor5.start();
console.log("📱 User started know more flow (automatic)");

actor5.send({ type: "SELECT_1" });
console.log("📱 User selected product information");

actor5.send({ type: "BACK_TO_MENU" });
console.log("📱 User navigated back to info menu");

actor5.send({ type: "BACK_TO_MAIN" });
console.log("📱 User navigated back to main menu");

console.log("✅ Navigation flow complete!\n");

// Demo 6: Error Handling
console.log("=".repeat(50));
console.log("DEMO 6: Error Handling");
console.log("=".repeat(50));

const actor6 = createActor(knowMoreMachine, { input: mockInput });
actor6.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  if (snapshot.context.error) {
    console.log(`❌ Error: ${snapshot.context.error}`);
  }
  console.log("");
});

actor6.start();
console.log("📱 User started know more flow (automatic)");

actor6.send({ type: "ERROR", error: "Network connection failed" });
console.log("📱 Error occurred");

actor6.send({ type: "BACK_TO_MENU" });
console.log("📱 User recovered from error");

console.log("✅ Error handling complete!\n");

console.log("\n🎉 Know More Machine Demo Complete!");
console.log("\n📊 Machine Summary:");
console.log("   • Handles information request flows");
console.log("   • Displays product, service, about, and contact information");
console.log("   • Supports pagination for multi-page content");
console.log("   • Provides proper navigation and back functionality");
console.log("   • Includes error handling and recovery");
console.log("   • Routes back to main menu when requested");
console.log("   • Type-safe with XState v5 setup() pattern");
