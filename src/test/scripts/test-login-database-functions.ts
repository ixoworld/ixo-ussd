/**
 * Test script for login database functions
 * Tests getCustomerByCustomerId and clearCustomerPin functions
 */

import { databaseManager } from "../../services/database-manager.js";
import { dataService } from "../../services/database-storage.js";
import { createModuleLogger } from "../../services/logger.js";

const logger = createModuleLogger("test-login-db");

async function testLoginDatabaseFunctions() {
  console.log("🧪 Testing Login Database Functions");
  console.log("===================================");

  try {
    // Initialize database
    await databaseManager.initialize();
    console.log("✅ Database initialized");

    // Test 1: Get customer by customer ID (existing customer)
    console.log("\n📋 Test 1: Get existing customer by customer ID");

    // First, let's find an existing customer
    const db = databaseManager.getKysely();
    const existingCustomer = await db
      .selectFrom("customers")
      .select(["customer_id", "full_name", "encrypted_pin"])
      .limit(1)
      .executeTakeFirst();

    if (existingCustomer) {
      console.log(`🔍 Testing with customer: ${existingCustomer.customer_id}`);

      const customer = await dataService.getCustomerByCustomerId(
        existingCustomer.customer_id
      );

      if (customer) {
        console.log("✅ Customer found:");
        console.log(`   - Customer ID: ${customer.customerId}`);
        console.log(`   - Full Name: ${customer.fullName}`);
        console.log(`   - Has PIN: ${!!customer.encryptedPin}`);
        console.log(`   - Language: ${customer.preferredLanguage}`);
      } else {
        console.log("❌ Customer not found (unexpected)");
      }
    } else {
      console.log("⚠️  No existing customers found in database");
    }

    // Test 2: Get customer by customer ID (non-existing customer)
    console.log("\n📋 Test 2: Get non-existing customer by customer ID");
    const nonExistentCustomer =
      await dataService.getCustomerByCustomerId("C99999999");

    if (nonExistentCustomer === null) {
      console.log("✅ Correctly returned null for non-existent customer");
    } else {
      console.log("❌ Should have returned null for non-existent customer");
    }

    // Test 3: Clear customer PIN (if we have a customer with PIN)
    if (existingCustomer && existingCustomer.encrypted_pin) {
      console.log("\n📋 Test 3: Clear customer PIN");
      console.log(
        `🔒 Customer ${existingCustomer.customer_id} has PIN, testing clear...`
      );

      // Clear the PIN
      await dataService.clearCustomerPin(existingCustomer.customer_id);
      console.log("✅ PIN cleared successfully");

      // Verify PIN was cleared
      const customerAfterClear = await dataService.getCustomerByCustomerId(
        existingCustomer.customer_id
      );

      if (customerAfterClear && !customerAfterClear.encryptedPin) {
        console.log("✅ Verified PIN was cleared");
      } else {
        console.log("❌ PIN was not cleared properly");
      }

      // Restore the PIN for future tests (optional)
      console.log("🔄 Restoring PIN for future tests...");
      await db
        .updateTable("customers")
        .set({ encrypted_pin: existingCustomer.encrypted_pin })
        .where("customer_id", "=", existingCustomer.customer_id)
        .execute();
      console.log("✅ PIN restored");
    } else {
      console.log(
        "\n📋 Test 3: Skip PIN clear test (no customer with PIN found)"
      );
    }

    // Test 4: Clear PIN for non-existent customer (should throw error)
    console.log("\n📋 Test 4: Clear PIN for non-existent customer");
    try {
      await dataService.clearCustomerPin("C99999999");
      console.log("❌ Should have thrown error for non-existent customer");
    } catch (error) {
      console.log("✅ Correctly threw error for non-existent customer:");
      console.log(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log("\n🎉 All database function tests completed!");
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Test failed"
    );
    console.error("❌ Test failed:", error);
  } finally {
    // Clean up
    await databaseManager.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the test
testLoginDatabaseFunctions().catch(console.error);
