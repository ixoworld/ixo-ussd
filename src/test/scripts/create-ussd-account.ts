/**
 * Creates an IXO account specifically for USSD use
 *
 * This script creates an IXO account with a phone number as the userId,
 * making it compatible with the USSD service.
 *
 * Usage:
 *   npm run build
 *   ts-node scripts/create-ussd-account.ts [phoneNumber] [password]
 */
import dotenv from "dotenv";
import fs from "fs";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import path from "path";
import { CHAIN_RPC_URL } from "../../constants/ixo-blockchain.js";
import { createIxoAccount } from "../../services/ixo/ixo-profile.js";

// Load environment variables from project root .env file
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded .env file from", envPath);
} else {
  console.warn("No .env file found at", envPath);
  dotenv.config(); // Try default location
}

// Format phone number to E.164 format (for international standard)
function formatPhoneNumber(input: string): string {
  if (!input) {
    throw new Error("Phone number is required");
  }

  // Use libphonenumber to parse and format the phone number
  const phoneNumber = parsePhoneNumberFromString(input);

  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error(`Invalid phone number: ${input}`);
  }

  // Return in E.164 format (e.g., +254712345678) without the + sign
  return phoneNumber.format("E.164").substring(1);
}

// Store console output to help with error recovery
let consoleOutput = "";
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;

// Monkey-patch console methods to capture output
console.log = function (...args) {
  const output = args.map(arg => String(arg)).join(" ");
  consoleOutput += output + "\n";
  originalConsoleLog.apply(console, args);
};

console.debug = function (...args) {
  const output = args.map(arg => String(arg)).join(" ");
  consoleOutput += output + "\n";
  originalConsoleDebug.apply(console, args);
};

// Create our own implementation of IXO account creation that can handle Matrix failures gracefully
async function createUssdAccount(phoneNumber: string) {
  console.debug(`Creating IXO account for user ID: ${phoneNumber}`);

  // 1. First try to use the full account creation flow
  try {
    const pin = process.argv[3] || "1234";
    const account = await createIxoAccount({
      userId: phoneNumber,
      pin,
      lastMenuLocation: "createAccount",
      lastCompletedAction: "createAccount",
    });

    return {
      success: true,
      complete: true,
      account,
    };
  } catch (error: any) {
    // If the error is specifically about Matrix room setup, we can continue with a partial account
    if (
      error.message &&
      (error.message.includes("Matrix room") ||
        error.message.includes("not in room") ||
        error.message.includes("room access"))
    ) {
      console.warn(
        "\n⚠️ Matrix room setup failed, but blockchain account was created"
      );
      console.warn("The error was:", error.message);

      // Extract account details from the console output
      let address = "",
        did = "",
        matrixUsername = "";

      // Look for generated wallet address in console output
      const addressMatch = consoleOutput.match(
        /Generated wallet with address: (ixo[a-z0-9]+)/i
      );
      if (addressMatch && addressMatch[1]) {
        address = addressMatch[1];
      }

      // Look for DID in console output
      const didMatch = consoleOutput.match(/DID created: (did:ixo:[a-z0-9]+)/i);
      if (didMatch && didMatch[1]) {
        did = didMatch[1];
      }

      // Look for Matrix username in console output
      const matrixMatch = consoleOutput.match(
        /Matrix account created with user ID: (@ixo_[a-z0-9]+:[a-z0-9.]+)/i
      );
      if (matrixMatch && matrixMatch[1]) {
        matrixUsername = matrixMatch[1];
      }

      if (address) {
        console.debug(
          "Extracted partial account information from console output"
        );
        return {
          success: true,
          complete: false,
          account: {
            userId: phoneNumber,
            address,
            did: did || `did:ixo:${address}`,
            matrixUsername,
            matrixRoomId: null,
            mnemonic: "UNKNOWN - Account was partially created",
            matrixMnemonic: "UNKNOWN - Account was partially created",
          },
        };
      }
    }

    // For other errors, or if we couldn't extract the information, rethrow
    throw error;
  }
}

// Get user input from command line arguments
const rawPhoneNumber = process.argv[2];
if (!rawPhoneNumber) {
  console.error("Phone number is required.");
  console.error(
    "Usage: ts-node scripts/create-ussd-account.ts [phoneNumber] [password]"
  );
  process.exit(1);
}

try {
  const phoneNumber = formatPhoneNumber(rawPhoneNumber);
  const password = process.argv[3] || "USSD2024!";

  // Display configuration in use
  console.log("\nEnvironment Configuration:");
  ["CHAIN_NETWORK", "FEEGRANT_URL", "MATRIX_HOMESERVER_URL"].forEach(key => {
    console.log(`${key}: ${process.env[key] || "NOT SET"}`);
  });

  // Show derived URL
  console.log(
    `Chain RPC URL: ${CHAIN_RPC_URL || process.env.CHAIN_RPC_URL || "NOT SET"}`
  );

  console.log("\nAccount Parameters:");
  console.log(`Phone Number: ${phoneNumber}`);
  console.log(
    `Password: ${password.substring(0, 1)}${"*".repeat(password.length - 2)}${password.substring(password.length - 1)}`
  );

  // Validate required environment variables
  const requiredEnvVars = [
    "FEEGRANT_URL",
    "FEEGRANT_AUTH",
    "MATRIX_HOMESERVER_URL",
    "MATRIX_ROOM_BOT_URL",
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

  // Check if we have a valid chain RPC URL from somewhere
  if (!CHAIN_RPC_URL && !process.env.CHAIN_RPC_URL) {
    missingEnvVars.push("CHAIN_NETWORK or CHAIN_RPC_URL");
  }

  if (missingEnvVars.length > 0) {
    console.error("\nError: Missing required environment variables:");
    missingEnvVars.forEach(key => console.error(`- ${key}`));
    console.error(
      "\nPlease create a .env file in the project root with these variables."
    );
    process.exit(1);
  }
  main();
} catch (error: any) {
  console.error("\nError:", error.message);
  process.exit(1);
}

async function main() {
  console.log("\nCreating IXO account for USSD use...");

  try {
    const startTime = Date.now();

    const result = await createUssdAccount(rawPhoneNumber);
    const account = result.account;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.complete) {
      console.log(
        "\n✅ USSD Account created successfully in",
        duration,
        "seconds!"
      );
    } else {
      console.log(
        "\n⚠️ USSD Account created partially in",
        duration,
        "seconds!"
      );
      console.log("Matrix room setup failed but blockchain account is usable.");
    }

    console.log("\nAccount Details:");
    console.log("-".repeat(50));
    console.log("Phone Number:", account.userId);
    console.log("Blockchain Address:", account.address);
    console.log("DID:", account.did);

    if ("matrixUsername" in account) {
      console.log("Matrix Username:", account.matrixUsername);
    } else {
      console.log("Matrix Username: N/A");
    }
    if ("matrixRoomId" in account) {
      console.log("Matrix Room ID:", account.matrixRoomId);
    } else {
      console.log("Matrix Room ID: N/A");
    }
    if ("matrixMnemonic" in account) {
      console.log("Matrix Mnemonic:", account.matrixMnemonic);
    } else {
      console.log("Matrix Mnemonic: N/A");
    }
    console.log("-".repeat(50));

    // Save sensitive information to a file
    const sensitiveData = {
      phoneNumber: account.userId,
      mnemonic: account.mnemonic,
      ...("matrixMnemonic" in account
        ? { matrixMnemonic: account.matrixMnemonic }
        : {}),
      createdAt: new Date().toISOString(),
      partialAccount: !result.complete,
    };

    const outputFile = `./ussd-account-${rawPhoneNumber}-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(sensitiveData, null, 2));
    console.log(
      `\n⚠️  IMPORTANT: Sensitive account data saved to ${outputFile}`
    );
    console.log("Please store this file securely and then delete it.");

    // Instructions for USSD service
    console.log("\nUSSD Service Integration:");
    console.log("-".repeat(50));
    console.log("This account is now ready to be used with the USSD service.");
    console.log("To test the USSD service with this account:");
    console.log(
      `1. Dial the USSD code (e.g., ${process.env.KE_SERVICE_CODES || "*2233#"})`
    );
    console.log("2. Follow the menu prompts");
    console.log(
      "3. The system will automatically use this account for the phone number"
    );
    console.log("-".repeat(50));

    const finalResult = {
      userId: account.userId,
      address: account.address,
      did: account.did,
      ...("matrixMnemonic" in account
        ? { matrixMnemonic: account.matrixMnemonic }
        : {}),
    };
    console.log(finalResult);
  } catch (error: any) {
    console.error("\n❌ Failed to create account:");
    console.error(error);
    process.exit(1);
  }
}
