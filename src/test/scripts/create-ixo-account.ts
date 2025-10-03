/**
 * Standalone script to create an IXO account
 *
 * This script can be run directly to create an IXO account without
 * USSD dependencies or test frameworks.
 *
 * Usage:
 *   npm run build
 *   ts-node scripts/create-ixo-account.ts [userId] [password]
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { CHAIN_RPC_URL } from "../../constants/ixo-blockchain.js";
import { createIxoAccount } from "../../services/ixo/ixo-profile.js";

// Load environment variables from project root .env file
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded .env file from", envPath);
} else {
  console.warn("No .env file found at", envPath);
  dotenv.config(); // Try default location
}

// Get user input from command line arguments or use defaults
const userId = process.argv[2] || `user-${Date.now()}@example.com`;
const pin = process.argv[3] || "1234";

// Display configuration in use
console.log("\nEnvironment Configuration:");
["CHAIN_NETWORK", "FEEGRANT_URL", "MATRIX_HOME_SERVER"].forEach(key => {
  const value = process.env[key];
  if (value) {
    // Mask sensitive values
    if (key.includes("TOKEN") || key.includes("AUTH")) {
      console.log(
        `${key}: ${value.substring(0, 3)}...${value.substring(value.length - 3)}`
      );
    } else {
      console.log(`${key}: ${value}`);
    }
  } else {
    console.log(`${key}: NOT SET`);
  }
});

// Show derived URL
console.log(`Chain RPC URL: ${CHAIN_RPC_URL}`);

console.log("\nAccount Parameters:");
console.log(`User ID: ${userId}`);

// Validate required environment variables
const requiredEnvVars = [
  "FEEGRANT_URL",
  "FEEGRANT_AUTH",
  "MATRIX_HOME_SERVER",
  "MATRIX_BOT_URL",
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

// Also check if we have a valid chain RPC URL from somewhere
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

async function main() {
  console.log("\nCreating IXO account...");

  try {
    const startTime = Date.now();

    const account = await createIxoAccount({
      userId,
      pin,
      lastMenuLocation: "createAccount",
      lastCompletedAction: "createAccount",
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ Account created successfully in", duration, "seconds!");
    console.log("\nAccount Details:");
    console.log("-".repeat(50));
    console.log("User ID:", account.userId);
    console.log("Address:", account.address);
    console.log("DID:", account.did);
    console.log("-".repeat(50));

    // Save sensitive information to a file
    const sensitiveData = {
      userId: account.userId,
      address: account.address,
      did: account.did,
      mnemonic: account.mnemonic,
      createdAt: new Date().toISOString(),
    };

    const outputFile = `./account-${sensitiveData.address}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(sensitiveData, null, 2));
    console.log(
      `\n⚠️  IMPORTANT: Sensitive account data saved to ${outputFile}`
    );
    console.log("Please store this file securely and then delete it.");

    const result = {
      userId: account.userId,
      address: account.address,
      did: account.did,
    };
    console.log(result);
  } catch (error) {
    console.error("\n❌ Failed to create account:");
    console.error(error);
    process.exit(1);
  }
}

main();
