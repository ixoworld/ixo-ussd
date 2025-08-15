#!/usr/bin/env node

/**
 * Machine Validation Script
 *
 * Validates that state machines follow established patterns:
 * - TypeScript compilation
 * - ESLint compliance
 * - File naming conventions
 * - Import patterns
 * - Test coverage
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const MACHINES_DIR = "src/machines/example";
const DOMAIN_DIRS = [
  "information",
  "account-menu",
  "account-login",
  "account-creation",
];
const REQUIRED_PATTERNS = {
  imports: /from\s+['"]\.\/.*\.js['"];?/,
  setupFunction: /setup\s*\(/,
  contextFunction: /context:\s*\(\s*{\s*input\s*}\s*\)\s*:/,
  typedOutput: /context:\s*\(\s*{\s*context\s*}:\s*{\s*context:/,
};

console.log("🔍 Validating State Machines...\n");

let hasErrors = false;

// 1. TypeScript Compilation Check
console.log("📝 Checking TypeScript compilation...");
try {
  execSync("pnpm tsc --noEmit", { stdio: "pipe" });
  console.log("✅ TypeScript compilation passed\n");
} catch (error) {
  console.log("❌ TypeScript compilation failed:");
  console.log(error.stdout.toString());
  hasErrors = true;
}

// 2. ESLint Check
console.log("🔧 Checking ESLint compliance...");
try {
  execSync("pnpm lint", { stdio: "pipe" });
  console.log("✅ ESLint checks passed\n");
} catch (error) {
  console.log("❌ ESLint checks failed:");
  console.log(error.stdout.toString());
  hasErrors = true;
}

// 3. File Pattern Validation
console.log("📁 Checking file patterns...");

// Get machine files from all domain directories
const machineFiles = [];
const testFiles = [];

// Check root directory
const rootFiles = readdirSync(MACHINES_DIR);
machineFiles.push(
  ...rootFiles
    .filter(file => file.endsWith("Machine.ts"))
    .map(file => path.join(MACHINES_DIR, file))
);
testFiles.push(
  ...rootFiles
    .filter(file => file.endsWith(".test.ts"))
    .map(file => path.join(MACHINES_DIR, file))
);

// Check domain directories
for (const domainDir of DOMAIN_DIRS) {
  const domainPath = path.join(MACHINES_DIR, domainDir);
  if (existsSync(domainPath)) {
    const domainFiles = readdirSync(domainPath);
    machineFiles.push(
      ...domainFiles
        .filter(file => file.endsWith("Machine.ts"))
        .map(file => path.join(domainPath, file))
    );
    testFiles.push(
      ...domainFiles
        .filter(file => file.endsWith(".test.ts"))
        .map(file => path.join(domainPath, file))
    );
  }
}

console.log(`Found ${machineFiles.length} machine files`);
console.log(`Found ${testFiles.length} test files`);

// Check that each machine has a corresponding test
for (const machineFile of machineFiles) {
  const baseName = path.basename(machineFile, ".ts");
  const machineDir = path.dirname(machineFile);
  const expectedTestFile = path.join(machineDir, `${baseName}.test.ts`);
  const expectedDemoFile = path.join(machineDir, `${baseName}-demo.ts`);

  if (!existsSync(expectedTestFile)) {
    console.log(`❌ Missing test file for ${baseName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${baseName} has test file`);
  }

  if (!existsSync(expectedDemoFile)) {
    console.log(`⚠️  Missing demo file for ${baseName} (recommended)`);
    // Don't set hasErrors = true since demos are recommended but not required
  } else {
    console.log(`✅ ${baseName} has demo file`);
  }
}

// 4. Content Pattern Validation
console.log("\n🔍 Checking code patterns...");

for (const machineFile of machineFiles) {
  const fileName = path.basename(machineFile);
  const content = readFileSync(machineFile, "utf-8");

  console.log(`\nValidating ${fileName}:`);

  // Check for .js imports
  const imports = content.match(/from\s+['"]\.\/[^'"]*['"]/g) || [];
  const hasJsExtensions = imports.every(imp => imp.includes(".js"));

  if (!hasJsExtensions) {
    console.log("  ❌ Missing .js extensions in imports");
    hasErrors = true;
  } else {
    console.log("  ✅ Imports use .js extensions");
  }

  // Check for setup function
  if (!REQUIRED_PATTERNS.setupFunction.test(content)) {
    console.log("  ❌ Missing setup() function");
    hasErrors = true;
  } else {
    console.log("  ✅ Uses setup() function");
  }

  // Check for context function pattern
  if (!REQUIRED_PATTERNS.contextFunction.test(content)) {
    console.log("  ❌ Context should use ({ input }) => pattern");
    hasErrors = true;
  } else {
    console.log("  ✅ Uses proper context function");
  }

  // Check for typed output functions
  if (
    content.includes("type: 'final'") &&
    !REQUIRED_PATTERNS.typedOutput.test(content)
  ) {
    console.log("  ⚠️  Final states should have typed output functions");
  } else if (content.includes("type: 'final'")) {
    console.log("  ✅ Final states have typed outputs");
  }
}

// 5. Index.ts Export Check
console.log("\n📦 Checking exports...");
const indexFile = path.join(MACHINES_DIR, "index.ts");

if (!existsSync(indexFile)) {
  console.log("❌ Missing index.ts file");
  hasErrors = true;
} else {
  const indexContent = readFileSync(indexFile, "utf-8");

  for (const machineFile of machineFiles) {
    const machineName = path.basename(machineFile, ".ts");

    if (!indexContent.includes(machineName)) {
      console.log(`❌ ${machineName} not exported in index.ts`);
      hasErrors = true;
    } else {
      console.log(`✅ ${machineName} exported in index.ts`);
    }
  }
}

// 6. Summary
console.log("\n" + "=".repeat(50));
if (hasErrors) {
  console.log("❌ Validation failed! Please fix the issues above.");
  console.log("\n📚 Resources:");
  console.log(
    "  - State Machine Patterns: docs/development/STATE_MACHINE_PATTERNS.md"
  );
  console.log("  - Demo Files Guide: docs/development/DEMO_FILES_GUIDE.md");
  console.log("  - Machine README: src/machines/README.md");
  console.log("  - Template: src/machines/example/MACHINE_TEMPLATE.ts");
  process.exit(1);
} else {
  console.log(
    "✅ All validations passed! Your machines follow the established patterns."
  );
  console.log("\n🎉 Ready for commit!");
}
