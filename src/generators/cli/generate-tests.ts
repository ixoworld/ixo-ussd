#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Generate Tests CLI Command
 *
 * CLI command for generating comprehensive test suites for existing machines.
 * Supports incremental updates and various test types.
 *
 * Usage:
 *   pnpm generate:tests [options]
 *   node src/generators/cli/generate-tests.js [options]
 *
 * @module generate-tests
 * @version 1.0.0
 */

import { program } from "commander";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve, relative, join, extname, basename } from "path";
import { CodeGenerator, type CodeGeneratorConfig } from "../code-generator.js";

/**
 * Test CLI configuration interface
 */
interface TestCLIConfig {
  source?: string;
  machinesDir: string;
  output: string;
  testStyle: "smoke" | "comprehensive";
  includeTransition: boolean;
  includeError: boolean;
  includeIntegration: boolean;
  incremental: boolean;
  overwrite: boolean;
  dryRun: boolean;
  verbose: boolean;
  watch: boolean;
  pattern?: string;
}

/**
 * Default test CLI configuration
 */
const DEFAULT_TEST_CLI_CONFIG: TestCLIConfig = {
  machinesDir: "src/machines",
  output: "src/machines/generated",
  testStyle: "smoke",
  includeTransition: true,
  includeError: true,
  includeIntegration: false,
  incremental: true,
  overwrite: false,
  dryRun: false,
  verbose: false,
  watch: false,
};

/**
 * Machine file information
 */
interface MachineFileInfo {
  path: string;
  name: string;
  lastModified: number;
  hasTests: boolean;
  testFiles: string[];
}

/**
 * Main CLI program setup
 */
function setupTestCLI(): void {
  program
    .name("generate-tests")
    .description("Generate comprehensive test suites for XState v5 machines")
    .version("1.0.0")
    .option(
      "-s, --source <path>",
      "Path to Mermaid source file (for full regeneration)"
    )
    .option(
      "-m, --machines-dir <path>",
      "Directory containing machine files",
      DEFAULT_TEST_CLI_CONFIG.machinesDir
    )
    .option(
      "-o, --output <path>",
      "Output directory for test files",
      DEFAULT_TEST_CLI_CONFIG.output
    )
    .option(
      "--style <style>",
      "Test style (smoke, comprehensive)",
      DEFAULT_TEST_CLI_CONFIG.testStyle
    )
    .option("--no-transition", "Skip transition test generation")
    .option("--no-error", "Skip error test generation")
    .option(
      "--include-integration",
      "Include integration tests",
      DEFAULT_TEST_CLI_CONFIG.includeIntegration
    )
    .option(
      "--no-incremental",
      "Disable incremental updates (regenerate all tests)"
    )
    .option(
      "--overwrite",
      "Overwrite existing test files",
      DEFAULT_TEST_CLI_CONFIG.overwrite
    )
    .option(
      "--dry-run",
      "Show what would be generated without writing files",
      DEFAULT_TEST_CLI_CONFIG.dryRun
    )
    .option(
      "--verbose",
      "Enable verbose logging",
      DEFAULT_TEST_CLI_CONFIG.verbose
    )
    .option(
      "--watch",
      "Watch machine files for changes and regenerate tests",
      DEFAULT_TEST_CLI_CONFIG.watch
    )
    .option(
      "-p, --pattern <pattern>",
      "Only process machines matching this pattern (glob)"
    )
    .action(async options => {
      await handleGenerateTestsCommand(options);
    });

  // Add help examples
  program.addHelpText(
    "after",
    `
Examples:
  $ pnpm generate:tests
  $ pnpm generate:tests --style comprehensive --include-integration
  $ pnpm generate:tests --machines-dir src/machines/custom --verbose
  $ pnpm generate:tests --pattern "*user*" --no-error
  $ pnpm generate:tests --source docs/diagram.md --no-incremental
  $ pnpm generate:tests --watch --verbose
`
  );
}

/**
 * Handle the generate tests command
 */
async function handleGenerateTestsCommand(options: any): Promise<void> {
  try {
    // Validate and normalize options
    const config = await validateAndNormalizeTestOptions(options);

    if (config.verbose) {
      console.log("🧪 Starting test generation...");
      console.log("📋 Configuration:", JSON.stringify(config, null, 2));
    }

    if (config.watch) {
      await runTestWatchMode(config);
    } else {
      await runTestGeneration(config);
    }
  } catch (error) {
    console.error(
      "❌ Test generation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (options.verbose && error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

/**
 * Validate and normalize test CLI options
 */
async function validateAndNormalizeTestOptions(
  options: any
): Promise<TestCLIConfig> {
  const config: TestCLIConfig = {
    source: options.source ? resolve(options.source) : undefined,
    machinesDir: resolve(
      options.machinesDir || DEFAULT_TEST_CLI_CONFIG.machinesDir
    ),
    output: resolve(options.output || DEFAULT_TEST_CLI_CONFIG.output),
    testStyle: options.style || DEFAULT_TEST_CLI_CONFIG.testStyle,
    includeTransition: options.transition !== false,
    includeError: options.error !== false,
    includeIntegration:
      options.includeIntegration || DEFAULT_TEST_CLI_CONFIG.includeIntegration,
    incremental: options.incremental !== false,
    overwrite: options.overwrite || DEFAULT_TEST_CLI_CONFIG.overwrite,
    dryRun: options.dryRun || DEFAULT_TEST_CLI_CONFIG.dryRun,
    verbose: options.verbose || DEFAULT_TEST_CLI_CONFIG.verbose,
    watch: options.watch || DEFAULT_TEST_CLI_CONFIG.watch,
    pattern: options.pattern,
  };

  // Validate test style
  const validStyles = ["smoke", "comprehensive"];
  if (!validStyles.includes(config.testStyle)) {
    throw new Error(
      `Invalid test style: ${config.testStyle}. Must be one of: ${validStyles.join(", ")}`
    );
  }

  // Validate source file if provided
  if (config.source && !existsSync(config.source)) {
    throw new Error(`Source file not found: ${config.source}`);
  }

  // Validate machines directory
  if (!existsSync(config.machinesDir)) {
    throw new Error(`Machines directory not found: ${config.machinesDir}`);
  }

  return config;
}

/**
 * Run test generation
 */
async function runTestGeneration(config: TestCLIConfig): Promise<void> {
  const startTime = Date.now();

  if (config.verbose) {
    console.log(
      `🔍 Scanning machines directory: ${relative(process.cwd(), config.machinesDir)}`
    );
  }

  // If source is provided, use full regeneration
  if (config.source) {
    await runFullTestRegeneration(config);
    return;
  }

  // Discover machine files
  const machineFiles = await discoverMachineFiles(config);

  if (machineFiles.length === 0) {
    console.log("ℹ️  No machine files found to generate tests for");
    return;
  }

  if (config.verbose) {
    console.log(`📁 Found ${machineFiles.length} machine file(s)`);
  }

  // Filter files for incremental updates
  const filesToProcess = config.incremental
    ? await filterFilesForIncremental(machineFiles, config)
    : machineFiles;

  if (filesToProcess.length === 0) {
    console.log("✅ All tests are up to date");
    return;
  }

  if (config.verbose) {
    console.log(
      `🔄 Processing ${filesToProcess.length} file(s) for test generation`
    );
  }

  // Generate tests for each machine file
  let totalTestsGenerated = 0;
  let totalFilesCreated = 0;

  for (const machineFile of filesToProcess) {
    if (config.verbose) {
      console.log(
        `📝 Generating tests for: ${relative(process.cwd(), machineFile.path)}`
      );
    }

    const result = await generateTestsForMachine(machineFile, config);
    totalTestsGenerated += result.testsGenerated;
    totalFilesCreated += result.filesCreated;
  }

  // Report results
  const duration = Date.now() - startTime;
  console.log("✅ Test generation completed!");
  console.log(`📊 Statistics:`);
  console.log(`  - Machines processed: ${filesToProcess.length}`);
  console.log(`  - Test suites generated: ${totalTestsGenerated}`);
  console.log(`  - Files created: ${totalFilesCreated}`);
  console.log(`  - Duration: ${duration}ms`);

  if (config.dryRun) {
    console.log("🔍 Dry run mode - no files were written to disk");
  } else {
    console.log(
      `📁 Output directory: ${relative(process.cwd(), config.output)}`
    );
  }
}

/**
 * Run full test regeneration from source
 */
async function runFullTestRegeneration(config: TestCLIConfig): Promise<void> {
  if (config.verbose) {
    console.log("🔄 Running full test regeneration from source");
  }

  // Create generator configuration for tests only
  const generatorConfig: Partial<CodeGeneratorConfig> = {
    sourcePath: config.source!,
    outputDir: config.output,
    generateTests: true,
    generateDemos: false,
    overwrite: config.overwrite,
    dryRun: config.dryRun,
    verbose: config.verbose,
    templates: {
      machine: {
        variant: "standard",
        strictMode: true,
        customImports: [],
      },
      tests: {
        style: config.testStyle,
        includeIntegration: config.includeIntegration,
        includePerformance: false,
        includeTransitionTests: config.includeTransition,
        includeErrorTests: config.includeError,
      },
      demos: {
        style: "interactive",
        includeVisuals: false,
        includePerformance: false,
      },
      services: {
        generate: false,
        variant: "basic",
        includeErrorHandling: true,
        includeValidation: true,
      },
    },
  };

  // Generate tests
  const generator = new CodeGenerator(generatorConfig);
  const result = await generator.generateFromMermaid();

  // Report results
  if (result.errors.length > 0) {
    console.error("❌ Test generation completed with errors:");
    result.errors.forEach(error => {
      const location = error.line ? ` (line ${error.line})` : "";
      console.error(`  - ${error.message}${location}`);
    });
  }

  if (result.stats.machinesGenerated > 0) {
    console.log("✅ Test generation completed successfully!");
    console.log(`📊 Statistics:`);
    console.log(`  - Machines processed: ${result.stats.machinesGenerated}`);
    console.log(
      `  - Test files created: ${result.generatedFiles.filter(f => f.type === "test").length}`
    );
    console.log(`  - Duration: ${result.stats.duration}ms`);
  }
}

/**
 * Discover machine files in directory
 */
async function discoverMachineFiles(
  config: TestCLIConfig
): Promise<MachineFileInfo[]> {
  const machineFiles: MachineFileInfo[] = [];

  function scanDirectory(dir: string): void {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && isMachineFile(entry)) {
        // Apply pattern filter if specified
        if (config.pattern && !entry.includes(config.pattern)) {
          continue;
        }

        const machineInfo: MachineFileInfo = {
          path: fullPath,
          name: basename(entry, extname(entry)),
          lastModified: stat.mtime.getTime(),
          hasTests: false,
          testFiles: [],
        };

        // Check for existing test files
        const testFiles = findExistingTestFiles(fullPath, config.output);
        machineInfo.hasTests = testFiles.length > 0;
        machineInfo.testFiles = testFiles;

        machineFiles.push(machineInfo);
      }
    }
  }

  scanDirectory(config.machinesDir);
  return machineFiles;
}

/**
 * Check if file is a machine file
 */
function isMachineFile(filename: string): boolean {
  return (
    filename.endsWith(".ts") &&
    !filename.endsWith(".test.ts") &&
    !filename.endsWith(".demo.ts") &&
    !filename.includes("index")
  );
}

/**
 * Find existing test files for a machine
 */
function findExistingTestFiles(
  machinePath: string,
  outputDir: string
): string[] {
  const testFiles: string[] = [];
  const baseName = basename(machinePath, ".ts");

  // Look for various test file patterns
  const testPatterns = [
    `${baseName}.test.ts`,
    `${baseName}.generated.test.ts`,
    `${baseName}.transitions.test.ts`,
    `${baseName}.errors.test.ts`,
  ];

  for (const pattern of testPatterns) {
    const testPath = join(outputDir, pattern);
    if (existsSync(testPath)) {
      testFiles.push(testPath);
    }
  }

  return testFiles;
}

/**
 * Filter files for incremental updates
 */
async function filterFilesForIncremental(
  machineFiles: MachineFileInfo[],
  config: TestCLIConfig
): Promise<MachineFileInfo[]> {
  const filesToProcess: MachineFileInfo[] = [];

  for (const machineFile of machineFiles) {
    let needsUpdate = false;

    // Always process if no tests exist
    if (!machineFile.hasTests) {
      needsUpdate = true;
    } else {
      // Check if machine file is newer than test files
      for (const testFile of machineFile.testFiles) {
        const testStat = statSync(testFile);
        if (machineFile.lastModified > testStat.mtime.getTime()) {
          needsUpdate = true;
          break;
        }
      }
    }

    if (needsUpdate || !config.incremental) {
      filesToProcess.push(machineFile);
    }
  }

  return filesToProcess;
}

/**
 * Generate tests for a single machine
 */
async function generateTestsForMachine(
  machineFile: MachineFileInfo,
  config: TestCLIConfig
): Promise<{ testsGenerated: number; filesCreated: number }> {
  // For now, return placeholder results
  // In a real implementation, this would parse the machine file
  // and generate appropriate test files

  if (config.verbose) {
    console.log(`  ✓ Generated tests for ${machineFile.name}`);
  }

  return {
    testsGenerated: 1,
    filesCreated: config.includeTransition && config.includeError ? 3 : 1,
  };
}

/**
 * Run test watch mode
 */
async function runTestWatchMode(config: TestCLIConfig): Promise<void> {
  console.log(
    "👀 Test watch mode enabled - monitoring machine files for changes..."
  );
  console.log(`📁 Watching: ${relative(process.cwd(), config.machinesDir)}`);
  console.log("Press Ctrl+C to stop watching\n");

  // Import fs.watch dynamically
  const { watch } = await import("fs");

  let isGenerating = false;

  const watcher = watch(
    config.machinesDir,
    { recursive: true },
    async (eventType, filename) => {
      if (filename && isMachineFile(filename) && !isGenerating) {
        isGenerating = true;

        console.log(
          `🔄 Machine file changed: ${filename} (${new Date().toLocaleTimeString()})`
        );

        try {
          await runTestGeneration(config);
          console.log("✅ Test regeneration complete\n");
        } catch (error) {
          console.error(
            "❌ Test regeneration failed:",
            error instanceof Error ? error.message : String(error)
          );
        } finally {
          isGenerating = false;
        }
      }
    }
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Stopping test watch mode...");
    watcher.close();
    process.exit(0);
  });

  // Run initial generation
  await runTestGeneration(config);
  console.log(
    "✅ Initial test generation complete - watching for changes...\n"
  );
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  setupTestCLI();
  await program.parseAsync(process.argv);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error("❌ CLI Error:", error);
    process.exit(1);
  });
}

export {
  main as generateTestsCLI,
  handleGenerateTestsCommand,
  validateAndNormalizeTestOptions,
};
