/**
 * Test USSD flow with curl commands
 * Run this script using this command:
 *
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const BASE_URL = "https://ixo-ussd-server.onrender.com/api/ussd";
// const BASE_URL = "http://localhost:3000/api/ussd";
const SESSION_ID = "123456";
const PHONE_NUMBER = "+265888234567";
// const PHONE_NUMBER = "+265123456789";
const SERVICE_CODE = "*2233#";
// const SERVICE_CODE = "*384*46361#";

async function makeRequest(text: string) {
  const command = `curl -X POST ${BASE_URL} \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "${SESSION_ID}","phoneNumber": "${PHONE_NUMBER}","text": "${text}","serviceCode": "${SERVICE_CODE}"}'`;

  try {
    const { stdout } = await execAsync(command);
    console.log("\nRequest:", text);
    console.log("Response:", stdout);
    return stdout;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

async function testUSSDFlow() {
  console.log("Starting USSD flow test...\n");

  // 1. Start at Pre Menu
  await makeRequest("");

  // 2. Enter wallet ID (option 2)
  await makeRequest("2");

  // 3. Enter wallet ID "C21009802"
  await makeRequest("2*C21009802");

  // 4. Press 1 to continue after verification
  await makeRequest("2*C21009802*1");

  // 5. Top Up & Balance (option 1)
  await makeRequest("2*C21009802*1*1");

  // 6. Check balance (option 2)
  await makeRequest("2*C21009802*1*1*2");

  // 7. Enter PIN "1234"
  await makeRequest("2*C21009802*1*1*2*1234");

  // 8. Press 1 to continue after PIN verification
  await makeRequest("2*C21009802*1*1*2*1234*1");

  console.log("\nUSSD flow test completed!");
}

// Run the test
testUSSDFlow().catch(console.error);
