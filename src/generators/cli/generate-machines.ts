#!/usr/bin/env node

/**
 * Generate Machines CLI Command
 *
 * CLI command for generating XState v5 machines from Mermaid diagrams.
 * Supports various options for customization and output control.
 *
 * Usage:
 *   pnpm generate:machines [options]
 *   node src/generators/cli/generate-machines.js [options]
 *
 * @module generate-machines
 * @version 1.0.0
 */

import { program } from "commander";
import { existsSync } from "fs";
import { resolve, relative } from "path";
import { CodeGenerator, type CodeGeneratorConfig } from "../code-generator.js";
import {
  createProgressReporter,
  LogLevel,
} from "../utils/progress-reporter.js";
import { createIncrementalManager } from "../utils/incremental-updates.js";
import type { MachineCategory } from "../types/generator-types.js";

/**
 * CLI configuration interface
 */
interface CLIConfig {
  source: string;
  output: string;
  category?: MachineCategory;
  variant: "standard" | "minimal" | "comprehensive";
  tests: boolean;
  demos: boolean;
  services: boolean;
  overwrite: boolean;
  dryRun: boolean;
  verbose: boolean;
  watch: boolean;
  incremental: boolean;
}

/**
 * Default CLI configuration
 */
const DEFAULT_CLI_CONFIG: CLIConfig = {
  source: "docs/requirements/USSD-menu-mermaid.md",
  output: "src/machines/generated",
  variant: "standard",
  tests: true,
  demos: true,
  services: true,
  overwrite: false,
  dryRun: false,
  verbose: false,
  watch: false,
  incremental: true,
};

/**
 * Main CLI program setup
 */
function setupCLI(): void {
  program
    .name("generate-machines")
    .description("Generate XState v5 machines from Mermaid diagrams")
    .version("1.0.0")
    .option(
      "-s, --source <path>",
      "Path to Mermaid source file",
      DEFAULT_CLI_CONFIG.source
    )
    .option(
      "-o, --output <path>",
      "Output directory for generated files",
      DEFAULT_CLI_CONFIG.output
    )
    .option(
      "-c, --category <category>",
      "Filter by machine category (user-machine, agent-machine, account-machine, info-machine, core-machine)"
    )
    .option(
      "-v, --variant <variant>",
      "Machine template variant (standard, minimal, comprehensive)",
      DEFAULT_CLI_CONFIG.variant
    )
    .option("--no-tests", "Skip test file generation")
    .option("--no-demos", "Skip demo file generation")
    .option("--no-services", "Skip service file generation")
    .option(
      "--overwrite",
      "Overwrite existing files",
      DEFAULT_CLI_CONFIG.overwrite
    )
    .option(
      "--dry-run",
      "Show what would be generated without writing files",
      DEFAULT_CLI_CONFIG.dryRun
    )
    .option("--verbose", "Enable verbose logging", DEFAULT_CLI_CONFIG.verbose)
    .option(
      "--watch",
      "Watch source file for changes and regenerate",
      DEFAULT_CLI_CONFIG.watch
    )
    .option(
      "--no-incremental",
      "Disable incremental updates (force full regeneration)"
    )
    .action(async options => {
      await handleGenerateCommand(options);
    });

  // Add help examples
  program.addHelpText(
    "after",
    `
Examples:
  $ pnpm generate:machines
  $ pnpm generate:machines --source docs/my-diagram.md --output src/machines/custom
  $ pnpm generate:machines --variant comprehensive --verbose
  $ pnpm generate:machines --category user-machine --no-demos
  $ pnpm generate:machines --dry-run --verbose
  $ pnpm generate:machines --watch --verbose
`
  );
}

/**
 * Handle the generate command
 */
async function handleGenerateCommand(options: any): Promise<void> {
  try {
    // Validate and normalize options
    const config = await validateAndNormalizeOptions(options);

    if (config.verbose) {
      // eslint-disable-next-line no-console
      console.log("🚀 Starting machine generation...");
      // eslint-disable-next-line no-console
      console.log("📋 Configuration:", JSON.stringify(config, null, 2));
    }

    // Validate source file
    if (!existsSync(config.source)) {
      // eslint-disable-next-line no-console
      console.error(`❌ Error: Source file not found: ${config.source}`);
      process.exit(1);
    }

    if (config.watch) {
      await runWatchMode(config);
    } else {
      await runSingleGeneration(config);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "❌ Generation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (options.verbose && error instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

/**
 * Validate and normalize CLI options
 */
async function validateAndNormalizeOptions(options: any): Promise<CLIConfig> {
  const config: CLIConfig = {
    source: resolve(options.source || DEFAULT_CLI_CONFIG.source),
    output: resolve(options.output || DEFAULT_CLI_CONFIG.output),
    category: options.category,
    variant: options.variant || DEFAULT_CLI_CONFIG.variant,
    tests: options.tests !== false,
    demos: options.demos !== false,
    services: options.services !== false,
    overwrite: options.overwrite || DEFAULT_CLI_CONFIG.overwrite,
    dryRun: options.dryRun || DEFAULT_CLI_CONFIG.dryRun,
    verbose: options.verbose || DEFAULT_CLI_CONFIG.verbose,
    watch: options.watch || DEFAULT_CLI_CONFIG.watch,
    incremental: options.incremental !== false,
  };

  // Validate variant
  const validVariants = ["standard", "minimal", "comprehensive"];
  if (!validVariants.includes(config.variant)) {
    throw new Error(
      `Invalid variant: ${config.variant}. Must be one of: ${validVariants.join(", ")}`
    );
  }

  // Validate category if provided
  if (config.category) {
    const validCategories = [
      "user-machine",
      "agent-machine",
      "account-machine",
      "info-machine",
      "core-machine",
    ];
    if (!validCategories.includes(config.category)) {
      throw new Error(
        `Invalid category: ${config.category}. Must be one of: ${validCategories.join(", ")}`
      );
    }
  }

  return config;
}

/**
 * Run single generation
 */
async function runSingleGeneration(config: CLIConfig): Promise<void> {
  const startTime = Date.now();

  // Create progress reporter
  const reporter = createProgressReporter({
    verbose: config.verbose,
    logLevel: config.verbose ? LogLevel.VERBOSE : LogLevel.INFO,
    showTimestamps: true,
    showProgress: true,
    useColors: true,
  });

  // Setup progress steps
  reporter.addStep("validate", "Validate source file");
  reporter.addStep("incremental", "Check incremental updates");
  reporter.addStep("generate", "Generate machines");
  reporter.addStep("write", "Write files to disk");
  reporter.addStep("summary", "Generate summary");

  try {
    // Step 1: Validate source file
    reporter.startStep("validate");
    reporter.verbose(
      `📖 Reading source: ${relative(process.cwd(), config.source)}`
    );
    reporter.completeStep("validate");

    // Step 2: Check incremental updates
    reporter.startStep("incremental");
    const incrementalManager = createIncrementalManager(config.output);

    if (config.incremental) {
      const needsUpdate = !incrementalManager.areGeneratedFilesUpToDate([
        config.source,
      ]);
      if (!needsUpdate) {
        reporter.completeStep("incremental", "Files are up to date");
        reporter.skipStep("generate", "No changes detected");
        reporter.skipStep("write", "No files to write");
        reporter.skipStep("summary", "No generation performed");
        reporter.info("✅ All files are up to date - no generation needed");
        return;
      }
    }
    reporter.completeStep("incremental");

    // Step 3: Generate machines
    reporter.startStep("generate");

    // Create generator configuration
    const generatorConfig: Partial<CodeGeneratorConfig> = {
      sourcePath: config.source,
      outputDir: config.output,
      generateTests: config.tests,
      generateDemos: config.demos,
      overwrite: config.overwrite,
      dryRun: config.dryRun,
      verbose: config.verbose,
      templates: {
        machine: {
          variant: config.variant,
          strictMode: true,
          customImports: [],
        },
        tests: {
          style: "smoke",
          includeIntegration: false,
          includePerformance: false,
          includeTransitionTests: true,
          includeErrorTests: true,
        },
        demos: {
          style: "interactive",
          includeVisuals: true,
          includePerformance: false,
        },
        services: {
          generate: config.services,
          variant: "basic",
          includeErrorHandling: true,
          includeValidation: true,
        },
      },
      organization: {
        groupByCategory: true,
        createIndexFiles: true,
        generateReadme: true,
      },
    };

    // Generate machines
    const generator = new CodeGenerator(generatorConfig);
    const result = await generator.generateFromMermaid();
    reporter.completeStep(
      "generate",
      `Generated ${result.stats.machinesGenerated} machine(s)`
    );

    // Step 4: Update incremental tracking
    if (!config.dryRun) {
      reporter.startStep("write");
      incrementalManager.updateSourceFiles([config.source]);
      const generatedFilePaths = result.generatedFiles.map(f => f.path);
      incrementalManager.trackGeneratedFiles(generatedFilePaths);
      reporter.completeStep(
        "write",
        `Tracked ${generatedFilePaths.length} file(s)`
      );
    } else {
      reporter.skipStep("write", "Dry run mode");
    }

    // Step 5: Report results
    reporter.startStep("summary");
    const duration = Date.now() - startTime;

    if (result.errors.length > 0) {
      reporter.error("❌ Generation completed with errors:");
      result.errors.forEach(error => {
        const location = error.line ? ` (line ${error.line})` : "";
        reporter.error(`  - ${error.message}${location}`);
        if (error.suggestion) {
          reporter.error(`    💡 ${error.suggestion}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      reporter.warn("⚠️  Generation completed with warnings:");
      result.warnings.forEach(warning => {
        const location = warning.line ? ` (line ${warning.line})` : "";
        reporter.warn(`  - ${warning.message}${location}`);
        if (warning.suggestion) {
          reporter.warn(`    💡 ${warning.suggestion}`);
        }
      });
    }

    if (result.stats.machinesGenerated > 0) {
      reporter.info("✅ Generation completed successfully!");
      reporter.info(`📊 Statistics:`);
      reporter.info(
        `  - Machines generated: ${result.stats.machinesGenerated}`
      );
      reporter.info(`  - Files created: ${result.stats.filesCreated}`);
      reporter.info(
        `  - Lines of code: ${result.stats.linesOfCode.toLocaleString()}`
      );
      reporter.info(`  - Duration: ${duration}ms`);

      if (config.dryRun) {
        reporter.info("🔍 Dry run mode - no files were written to disk");
      } else {
        reporter.info(
          `📁 Output directory: ${relative(process.cwd(), config.output)}`
        );
      }

      // List generated files if verbose
      if (config.verbose && result.generatedFiles.length > 0) {
        reporter.verbose("\n📄 Generated files:");
        result.generatedFiles.forEach(file => {
          const relativePath = relative(process.cwd(), file.path);
          const size = (file.size / 1024).toFixed(1);
          reporter.verbose(`  - ${relativePath} (${size} KB, ${file.type})`);
        });
      }
    } else {
      reporter.info("ℹ️  No machines found to generate");
    }

    // Filter by category if specified
    if (config.category && result.generatedFiles.length > 0) {
      const categoryFiles = result.generatedFiles.filter(file =>
        file.path.includes(config.category!)
      );

      if (categoryFiles.length === 0) {
        reporter.info(`ℹ️  No machines found for category: ${config.category}`);
      } else {
        reporter.info(
          `🎯 Filtered ${categoryFiles.length} files for category: ${config.category}`
        );
      }
    }

    reporter.completeStep("summary");
    reporter.printSummary();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reporter.error(`❌ Generation failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Run watch mode
 */
async function runWatchMode(config: CLIConfig): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("👀 Watch mode enabled - monitoring source file for changes...");
  // eslint-disable-next-line no-console
  console.log(`📁 Watching: ${relative(process.cwd(), config.source)}`);
  // eslint-disable-next-line no-console
  console.log("Press Ctrl+C to stop watching\n");

  // Import fs.watch dynamically to avoid issues in environments without it
  const { watch } = await import("fs");

  let isGenerating = false;

  const watcher = watch(config.source, async eventType => {
    if (eventType === "change" && !isGenerating) {
      isGenerating = true;

      // eslint-disable-next-line no-console
      console.log(
        `🔄 File changed, regenerating... (${new Date().toLocaleTimeString()})`
      );

      try {
        await runSingleGeneration(config);
        // eslint-disable-next-line no-console
        console.log("✅ Regeneration complete\n");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          "❌ Regeneration failed:",
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        isGenerating = false;
      }
    }
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    // eslint-disable-next-line no-console
    console.log("\n👋 Stopping watch mode...");
    watcher.close();
    process.exit(0);
  });

  // Run initial generation
  await runSingleGeneration(config);
  // eslint-disable-next-line no-console
  console.log("✅ Initial generation complete - watching for changes...\n");
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  setupCLI();
  await program.parseAsync(process.argv);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    // eslint-disable-next-line no-console
    console.error("❌ CLI Error:", error);
    process.exit(1);
  });
}

export {
  main as generateMachinesCLI,
  handleGenerateCommand,
  validateAndNormalizeOptions,
};
