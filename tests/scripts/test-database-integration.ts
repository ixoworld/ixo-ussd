#!/usr/bin/env node
/**
 * Test Database Integration
 *
 * Tests the complete flow from phone record creation to IXO account creation
 * to verify database integration is working correctly.
 */

import dotenv from "dotenv";
import { dataService } from "../../src/services/database-storage.js";
import { createIxoAccount } from "../../src/services/ixo/ixo-profile.js";
import { postgresService } from "../../src/services/postgres.js";

// Load environment variables
dotenv.config();

async function testDatabaseIntegration() {
  console.log("🧪 Testing Database Integration");
  console.log("=".repeat(50));

  const testPhoneNumber = "+260971234567";
  const testPin = "1234";

  try {
    // Step 1: Test phone record creation (simulates USSD dial)
    console.log("\n1️⃣ Creating phone record...");
    const phoneRecord =
      await dataService.createOrUpdatePhoneRecord(testPhoneNumber);
    console.log(`✅ Phone record created:`);
    console.log(`   ID: ${phoneRecord.id}`);
    console.log(`   Phone: ${phoneRecord.phoneNumber}`);
    console.log(`   Visits: ${phoneRecord.numberOfVisits}`);

    // Step 2: Test customer record creation (simulates account creation)
    console.log("\n2️⃣ Creating customer record...");
    const customerRecord = await dataService.createCustomerRecord(
      phoneRecord.id,
      {
        fullName: "Test User",
        email: "test@example.com",
        pin: testPin,
        preferredLanguage: "eng",
        lastCompletedAction: "account_creation",
      }
    );
    console.log(`✅ Customer record created:`);
    console.log(`   Customer ID: ${customerRecord.customerId}`);
    console.log(`   Full Name: ${customerRecord.fullName}`);
    console.log(`   Email: ${customerRecord.email}`);

    // Step 3: Test IXO account creation
    console.log("\n3️⃣ Creating IXO blockchain account...");
    const ixoAccount = await createIxoAccount({
      userId: testPhoneNumber,
      pin: testPin,
      lastMenuLocation: "account_creation",
      lastCompletedAction: "blockchain_setup",
    });
    console.log(`✅ IXO account created:`);
    console.log(`   Address: ${ixoAccount.address}`);
    console.log(`   DID: ${ixoAccount.did}`);

    // Step 4: Check if we need to manually create IXO address record
    console.log("\n4️⃣ Checking database for IXO address record...");
    const userRecord = await postgresService.getUserByPhone(testPhoneNumber);

    if (userRecord && userRecord.ixo_addresses.length > 0) {
      console.log(`✅ IXO address record found in database:`);
      console.log(`   Address: ${userRecord.ixo_addresses[0].address}`);
      // console.log(`   DID: ${userRecord.ixo_addresses[0].did}`);
    } else {
      console.log(`⚠️  No IXO address record found in database`);
      console.log(`   This means the integration is missing!`);

      // TODO: This is where we need to add the missing integration
      console.log(`\n💡 Missing Integration Identified:`);
      console.log(`   - IXO account service creates blockchain account`);
      console.log(`   - But doesn't create database record`);
      console.log(
        `   - Need to add database integration to account creation flow`
      );
    }

    console.log("\n🎉 Database integration test completed!");
  } catch (error) {
    console.error("\n💥 Test failed:");
    console.error(
      `   ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  } finally {
    // Clean up database connections
    await postgresService.close();
  }
}

// Run the test
testDatabaseIntegration();
