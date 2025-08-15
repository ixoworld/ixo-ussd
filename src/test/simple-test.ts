/**
 * Standalone Simple Test
 *
 * Tests the new modular state machine architecture directly
 * without starting the full server.
 */

import { sessionService } from "../services/session.js";

async function testKnowMoreMachineInvocation() {
  console.log("🚀 Testing Know More Machine Invocation");
  console.log("=".repeat(50));

  const sessionId = `knowmore-test-${Date.now()}`;
  const phoneNumber = "+260971234567";
  const serviceCode = "*2233#";

  try {
    // Step 1: Dial *2233#
    console.log("\n📞 Step 1: Dialing *2233#");
    const response1 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "",
    });
    console.log(`Response: ${response1.formattedResponse}`);

    // Debug session state
    console.log("\n🔍 Debug after dial:");
    const debug1 = sessionService.debugSession(sessionId);
    console.log(`State: ${debug1.state}`);
    console.log(`Context message: ${debug1.context?.message}`);

    // Step 2: Select option 1 (Know More)
    console.log("\n📝 Step 2: Selecting option 1 (Know More)");
    const response2 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "1",
    });
    console.log(`Response: ${response2.formattedResponse}`);

    // Debug session state after selecting Know More
    console.log("\n🔍 Debug after selecting Know More:");
    const debug2 = sessionService.debugSession(sessionId);
    console.log(`State: ${debug2.state}`);
    console.log(`Context message: ${debug2.context?.message}`);
    console.log(
      `Is knowMoreMachine invoked? ${debug2.state === "knowMoreService" ? "YES" : "NO"}`
    );

    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check state again
    console.log("\n🔍 Debug after waiting:");
    const debug3 = sessionService.debugSession(sessionId);
    console.log(`State: ${debug3.state}`);
    console.log(`Context message: ${debug3.context?.message}`);

    console.log("\n✅ Know More machine invocation test completed!");

    return {
      sessionId,
      finalState: debug3.state,
      wasInvoked: debug3.state === "knowMoreService",
    };
  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      sessionId,
      finalState: "error",
      wasInvoked: false,
    };
  }
}

async function testWalletFlow() {
  console.log("\n\n🔐 Testing Wallet Authentication Flow");
  console.log("=".repeat(50));

  const sessionId = `wallet-test-${Date.now()}`;
  const phoneNumber = "+260971234567";
  const serviceCode = "*2233#";

  try {
    // Step 1: Dial *2233#
    console.log("\n📞 Step 1: Dialing *2233#");
    const response1 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "",
    });
    console.log(`Response: ${response1.formattedResponse}`);

    // Step 2: Select option 2 (Enter Wallet ID)
    console.log("\n📝 Step 2: Selecting option 2 (Enter Wallet ID)");
    const response2 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "2",
    });
    console.log(`Response: ${response2.formattedResponse}`);

    // Step 3: Enter wallet ID
    console.log("\n🆔 Step 3: Entering wallet ID");
    const response3 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "C21009802",
    });
    console.log(`Response: ${response3.formattedResponse}`);

    // Wait for verification to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Check if we're in user main menu
    console.log("\n🏠 Step 4: Should be in user main menu now");
    const debugInfo = sessionService.debugSession(sessionId);
    console.log("Debug info:", JSON.stringify(debugInfo, null, 2));

    console.log("\n✅ Wallet flow test completed!");
  } catch (error) {
    console.error("❌ Wallet test failed:", error);
  }
}

async function testAgentFlow() {
  console.log("\n\n👨‍💼 Testing Agent Authentication Flow");
  console.log("=".repeat(50));

  const sessionId = `agent-test-${Date.now()}`;
  const phoneNumber = "+260971234567";
  const serviceCode = "*2233#";

  try {
    // Step 1: Dial *2233#
    console.log("\n📞 Step 1: Dialing *2233#");
    const response1 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "",
    });
    console.log(`Response: ${response1.formattedResponse}`);

    // Step 2: Select option 3 (Agent Menu)
    console.log("\n📝 Step 2: Selecting option 3 (Agent Menu)");
    const response2 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "3",
    });
    console.log(`Response: ${response2.formattedResponse}`);

    // Step 3: Enter agent ID
    console.log("\n🆔 Step 3: Entering agent ID");
    const response3 = await sessionService.processSession({
      sessionId,
      phoneNumber,
      serviceCode,
      text: "AGT001",
    });
    console.log(`Response: ${response3.formattedResponse}`);

    // Wait for verification to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Check if we're in agent main menu
    console.log("\n🏠 Step 4: Should be in agent main menu now");
    const debugInfo = sessionService.debugSession(sessionId);
    console.log("Debug info:", JSON.stringify(debugInfo, null, 2));

    console.log("\n✅ Agent flow test completed!");
  } catch (error) {
    console.error("❌ Agent test failed:", error);
  }
}

async function main() {
  console.log("🧪 Simple State Machine Integration Test");
  console.log("========================================");

  const knowMoreResult = await testKnowMoreMachineInvocation();
  await testWalletFlow();
  await testAgentFlow();

  console.log("\n🎉 All tests completed!");
  console.log("\n📊 Know More Machine Test Results:");
  console.log(`   Session ID: ${knowMoreResult.sessionId}`);
  console.log(`   Final State: ${knowMoreResult.finalState}`);
  console.log(
    `   Was Invoked: ${knowMoreResult.wasInvoked ? "✅ YES" : "❌ NO"}`
  );
  console.log("\nActive sessions:", sessionService.getActiveSessions());
}

main().catch(console.error);
