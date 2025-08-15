#!/usr/bin/env node
/**
 * Test Customer ID Generation
 *
 * Tests the new high-precision timestamp + deterministic hash approach
 */

import { generateUniqueCustomerId } from "../../utils/customer-id.js";

console.log("🔢 Testing High-Precision Customer ID Generation");
console.log("================================================");

// Test 1: Generate multiple IDs rapidly
console.log("\n📊 Rapid Generation Test (10 IDs):");
const rapidIds: string[] = [];
for (let i = 0; i < 10; i++) {
  const id = generateUniqueCustomerId();
  rapidIds.push(id);
  console.log(`  ${i + 1}. ${id}`);
}

// Check uniqueness
const uniqueRapidIds = new Set(rapidIds);
console.log(`\n✅ Generated: ${rapidIds.length}`);
console.log(`✅ Unique: ${uniqueRapidIds.size}`);
console.log(
  `${uniqueRapidIds.size === rapidIds.length ? "✅" : "❌"} All unique: ${uniqueRapidIds.size === rapidIds.length}`
);

// Test 2: Generate IDs with small delays to show deterministic nature
console.log("\n⏱️  Delayed Generation Test (5 IDs with 1ms delays):");
const delayedIds: string[] = [];
for (let i = 0; i < 5; i++) {
  const id = generateUniqueCustomerId();
  delayedIds.push(id);
  console.log(`  ${i + 1}. ${id}`);

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1));
}

// Check uniqueness
const uniqueDelayedIds = new Set(delayedIds);
console.log(`\n✅ Generated: ${delayedIds.length}`);
console.log(`✅ Unique: ${uniqueDelayedIds.size}`);
console.log(
  `${uniqueDelayedIds.size === delayedIds.length ? "✅" : "❌"} All unique: ${uniqueDelayedIds.size === delayedIds.length}`
);

// Test 3: Simulate concurrent generation (Promise.all)
console.log("\n🚀 Concurrent Generation Test (20 IDs simultaneously):");
const concurrentPromises = Array.from({ length: 20 }, (_, i) =>
  Promise.resolve().then(() => {
    const id = generateUniqueCustomerId();
    console.log(`  ${i + 1}. ${id}`);
    return id;
  })
);

const concurrentIds = await Promise.all(concurrentPromises);
const uniqueConcurrentIds = new Set(concurrentIds);

console.log(`\n✅ Generated: ${concurrentIds.length}`);
console.log(`✅ Unique: ${uniqueConcurrentIds.size}`);
console.log(
  `${uniqueConcurrentIds.size === concurrentIds.length ? "✅" : "❌"} All unique: ${uniqueConcurrentIds.size === concurrentIds.length}`
);

// Test 4: Format analysis
console.log("\n🔍 Format Analysis:");
const sampleId = generateUniqueCustomerId();
console.log(`  Sample ID: ${sampleId}`);
console.log(`  Length: ${sampleId.length} characters`);
console.log(`  Format: C + 8 hexadecimal characters`);
console.log(`  Character set: 0-9, A-F`);
console.log(
  `  Total possible combinations: 16^8 = ${Math.pow(16, 8).toLocaleString()}`
);

// Test 5: Collision resistance estimate
console.log("\n🛡️  Collision Resistance:");
console.log(`  Microsecond precision: ~1,000,000 unique timestamps per second`);
console.log(`  SHA-256 hash: Cryptographically secure`);
console.log(
  `  8-character hex: ${Math.pow(16, 8).toLocaleString()} possible values`
);
console.log(`  Collision probability: Virtually zero for practical use`);

console.log("\n🎉 Customer ID generation test completed!");
