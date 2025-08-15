#!/usr/bin/env node
/**
 * Test Script for Progressive Data Service
 *
 * Tests the progressive data service by creating 10 new customers
 * and verifying the timestamp-based customer ID generation.
 */

import { dataService } from "../../services/database-storage.js";
import { generateUniqueCustomerId } from "../../utils/customer-id.js";
import { databaseManager } from "../../services/database-manager.js";

// Test data for 10 customers
const testCustomers = [
  {
    phoneNumber: "+260971234001",
    fullName: "Alice Mwanza",
    email: "alice@example.com",
    pin: "1234",
  },
  {
    phoneNumber: "+260971234002",
    fullName: "Bob Tembo",
    email: "bob@example.com",
    pin: "2345",
  },
  {
    phoneNumber: "+260971234003",
    fullName: "Carol Banda",
    email: "carol@example.com",
    pin: "3456",
  },
  {
    phoneNumber: "+260971234004",
    fullName: "David Phiri",
    email: "david@example.com",
    pin: "4567",
  },
  {
    phoneNumber: "+260971234005",
    fullName: "Eva Zulu",
    email: "eva@example.com",
    pin: "5678",
  },
  {
    phoneNumber: "+260971234006",
    fullName: "Frank Mulenga",
    email: "frank@example.com",
    pin: "6789",
  },
  {
    phoneNumber: "+260971234007",
    fullName: "Grace Chanda",
    email: "grace@example.com",
    pin: "7890",
  },
  {
    phoneNumber: "+260971234008",
    fullName: "Henry Sakala",
    email: "henry@example.com",
    pin: "8901",
  },
  {
    phoneNumber: "+260971234009",
    fullName: "Ivy Mwale",
    email: "ivy@example.com",
    pin: "9012",
  },
  {
    phoneNumber: "+260971234010",
    fullName: "Jack Lungu",
    email: "jack@example.com",
    pin: "0123",
  },
];

async function testCustomerIdGeneration() {
  console.log("\n🔢 Testing Customer ID Generation...");

  const customerIds: string[] = [];

  // Generate 10 customer IDs with small delays to see timestamp progression
  for (let i = 0; i < 10; i++) {
    const customerId = generateUniqueCustomerId();
    customerIds.push(customerId);
    console.log(`  ${i + 1}. Generated: ${customerId}`);

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Check for uniqueness
  const uniqueIds = new Set(customerIds);
  const isUnique = uniqueIds.size === customerIds.length;

  console.log(`\n✅ Generated ${customerIds.length} customer IDs`);
  console.log(`✅ Unique IDs: ${uniqueIds.size}`);
  console.log(`${isUnique ? "✅" : "❌"} All IDs are unique: ${isUnique}`);

  return isUnique;
}

async function testProgressiveDataCreation() {
  console.log("\n📊 Testing Progressive Data Creation...");

  const results = [];

  for (let i = 0; i < testCustomers.length; i++) {
    const customer = testCustomers[i];

    console.log(`\n--- Customer ${i + 1}: ${customer.fullName} ---`);

    try {
      // Step 1: Create phone record
      console.log(
        `  📱 Creating phone record for ${customer.phoneNumber.slice(-4)}...`
      );
      const phoneRecord = await dataService.createOrUpdatePhoneRecord(
        customer.phoneNumber
      );
      console.log(`  ✅ Phone record created: ID ${phoneRecord.id}`);

      // Step 2: Create customer record
      console.log(`  👤 Creating customer record...`);
      const customerRecord = await dataService.createCustomerRecord(
        phoneRecord.id,
        {
          fullName: customer.fullName,
          email: customer.email,
          pin: customer.pin,
          preferredLanguage: "eng",
          lastCompletedAction: "account_created",
        }
      );
      console.log(`  ✅ Customer created: ${customerRecord.customerId}`);

      results.push({
        phoneId: phoneRecord.id,
        customerId: customerRecord.customerId,
        customerDbId: customerRecord.id,
        fullName: customerRecord.fullName,
        email: customerRecord.email,
      });
    } catch (error) {
      console.error(`  ❌ Failed to create customer ${i + 1}:`, error);
      results.push({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function testCustomerRetrieval() {
  console.log("\n🔍 Testing Customer Retrieval...");

  for (let i = 0; i < Math.min(3, testCustomers.length); i++) {
    const customer = testCustomers[i];

    try {
      console.log(
        `  📞 Looking up customer by phone ${customer.phoneNumber.slice(-4)}...`
      );
      const retrievedCustomer = await dataService.getCustomerByPhone(
        customer.phoneNumber
      );

      if (retrievedCustomer) {
        console.log(
          `  ✅ Found: ${retrievedCustomer.customerId} - ${retrievedCustomer.fullName}`
        );
      } else {
        console.log(`  ❌ Customer not found`);
      }
    } catch (error) {
      console.error(`  ❌ Error retrieving customer:`, error);
    }
  }
}

async function displayDatabaseStats() {
  console.log("\n📈 Database Statistics...");

  try {
    const db = databaseManager.getKysely();

    // Count records in each table
    const phoneCount = await db
      .selectFrom("phones")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirst();

    const customerCount = await db
      .selectFrom("customers")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirst();

    const householdCount = await db
      .selectFrom("households")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirst();

    console.log(`  📱 Phones: ${phoneCount?.count || 0}`);
    console.log(`  👤 Customers: ${customerCount?.count || 0}`);
    console.log(`  🏠 Households: ${householdCount?.count || 0}`);
  } catch (error) {
    console.error("  ❌ Error getting database stats:", error);
  }
}

async function main() {
  console.log("🧪 Progressive Data Service Test");
  console.log("================================");

  try {
    // Initialize database
    console.log("🔌 Initializing database connection...");
    await databaseManager.initialize();
    console.log("✅ Database connected");

    // Test 1: Customer ID generation
    const idsUnique = await testCustomerIdGeneration();
    if (!idsUnique) {
      console.error("❌ Customer ID generation test failed!");
      process.exit(1);
    }

    // Test 2: Progressive data creation
    const results = await testProgressiveDataCreation();

    // Test 3: Customer retrieval
    await testCustomerRetrieval();

    // Test 4: Database statistics
    await displayDatabaseStats();

    // Summary
    console.log("\n📋 Test Summary:");
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    console.log(`  ✅ Successful: ${successful}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📊 Total: ${results.length}`);

    if (failed === 0) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log("\n⚠️  Some tests failed. Check the logs above.");
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await databaseManager.close();
      console.log("🔌 Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
