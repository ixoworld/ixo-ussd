#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Validation CLI Command
 *
 * CLI command for comprehensive validation of Mermaid diagrams, business rules,
 * and generated code quality.
 *
 * Usage:
 *   pnpm validate [options]
 *   node src/generators/cli/validate.js [options]
 *
 * @module validate
 * @version 1.0.0
 */

import { program } from "commander";
import { existsSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";
import {
  validateMermaidFile,
  validateBusinessRulesFromParsed,
} from "../utils/validation.js";
import { validateGeneratedCode } from "../utils/code-validation.js";
import {
  ErrorHandler,
  ErrorCategory,
  ErrorSeverity,
} from "../utils/error-handling.js";
import {
  createProgressReporter,
  LogLevel,
} from "../utils/progress-reporter.js";
import { MermaidParser } from "../mermaid-parser.js";

/**
 * Validation CLI configuration interface
 */
interface ValidationCLIConfig {
  source?: string;
  generatedDir?: string;
  checkMermaid: boolean;
  checkBusinessRules: boolean;
  checkGeneratedCode: boolean;
  checkTypeScript: boolean;
  checkESLint: boolean;
  strictMode: boolean;
  generateReport: boolean;
  reportDir: string;
  verbose: boolean;
  pattern?: string;
}

/**
 * Default validation CLI configuration
 */
const DEFAULT_VALIDATION_CLI_CONFIG: ValidationCLIConfig = {
  checkMermaid: true,
  checkBusinessRules: true,
  checkGeneratedCode: true,
  checkTypeScript: true,
  checkESLint: false, // Disabled by default to avoid external dependencies
  strictMode: false,
  generateReport: true,
  reportDir: ".validation-reports",
  verbose: false,
};

/**
 * Main CLI program setup
 */
function setupValidationCLI(): void {
  program
    .name("validate")
    .description(
      "Comprehensive validation for Mermaid diagrams and generated code"
    )
    .version("1.0.0")
    .option("-s, --source <path>", "Path to Mermaid source file to validate")
    .option(
      "-g, --generated-dir <path>",
      "Directory containing generated code to validate"
    )
    .option("--no-mermaid", "Skip Mermaid syntax validation")
    .option("--no-business-rules", "Skip business rule validation")
    .option("--no-generated-code", "Skip generated code validation")
    .option("--no-typescript", "Skip TypeScript compilation checks")
    .option(
      "--eslint",
      "Enable ESLint validation (requires ESLint to be installed)"
    )
    .option(
      "--strict",
      "Enable strict mode validation",
      DEFAULT_VALIDATION_CLI_CONFIG.strictMode
    )
    .option("--no-report", "Disable validation report generation")
    .option(
      "--report-dir <path>",
      "Directory for validation reports",
      DEFAULT_VALIDATION_CLI_CONFIG.reportDir
    )
    .option(
      "--verbose",
      "Enable verbose logging",
      DEFAULT_VALIDATION_CLI_CONFIG.verbose
    )
    .option(
      "-p, --pattern <pattern>",
      "Only validate files matching this pattern"
    )
    .action(async options => {
      await handleValidationCommand(options);
    });

  // Add help examples
  program.addHelpText(
    "after",
    `
Examples:
  $ pnpm validate
  $ pnpm validate --source docs/flows.md
  $ pnpm validate --generated-dir src/machines/generated
  $ pnpm validate --strict --verbose
  $ pnpm validate --no-business-rules --eslint
  $ pnpm validate --pattern "user*" --verbose
`
  );
}

/**
 * Handle the validation command
 */
async function handleValidationCommand(options: any): Promise<void> {
  try {
    // Validate and normalize options
    const config = await validateAndNormalizeValidationOptions(options);

    // Create progress reporter and error handler
    const reporter = createProgressReporter({
      verbose: config.verbose,
      logLevel: config.verbose ? LogLevel.VERBOSE : LogLevel.INFO,
      showTimestamps: true,
      showProgress: true,
      useColors: true,
    });

    const errorHandler = new ErrorHandler({
      generateReports: config.generateReport,
      reportDir: config.reportDir,
      includeStackTraces: config.verbose,
      minSeverity: config.verbose ? ErrorSeverity.DEBUG : ErrorSeverity.WARNING,
    });

    reporter.info("🔍 Starting comprehensive validation...");

    // Setup validation steps
    const steps = [];
    if (config.checkMermaid) steps.push("mermaid");
    if (config.checkBusinessRules) steps.push("business-rules");
    if (config.checkGeneratedCode) steps.push("generated-code");

    steps.forEach(step => {
      reporter.addStep(step, `Validate ${step.replace("-", " ")}`);
    });
    reporter.addStep("report", "Generate validation report");

    let hasErrors = false;

    // Step 1: Validate Mermaid syntax
    if (config.checkMermaid && config.source) {
      reporter.startStep("mermaid");

      if (!existsSync(config.source)) {
        errorHandler.error(
          ErrorCategory.FILE_SYSTEM,
          `Source file not found: ${config.source}`
        );
        hasErrors = true;
      } else {
        const mermaidResult = validateMermaidFile(config.source, {
          strictMode: config.strictMode,
          validateNaming: config.strictMode,
        });

        if (!mermaidResult.isValid) {
          errorHandler.addValidationErrors(mermaidResult.errors);
          hasErrors = true;
        }

        errorHandler.addValidationWarnings(mermaidResult.warnings);

        reporter.completeStep(
          "mermaid",
          `Found ${mermaidResult.errors.length} errors, ${mermaidResult.warnings.length} warnings`
        );
      }
    } else if (config.checkMermaid) {
      reporter.skipStep("mermaid", "No source file specified");
    }

    // Step 2: Validate business rules
    if (config.checkBusinessRules && config.source) {
      reporter.startStep("business-rules");

      try {
        const parser = new MermaidParser();
        const parseResult = await parser.parseFile(config.source);

        if (parseResult.errors.length > 0) {
          parseResult.errors.forEach(error => {
            errorHandler.error(ErrorCategory.PARSING, error.message, {
              line: error.line,
              suggestion: error.suggestion,
            });
          });
          hasErrors = true;
        }

        if (parseResult.machines.length > 0) {
          const businessResult = validateBusinessRulesFromParsed(
            parseResult.machines,
            {
              strictMode: config.strictMode,
              checkBusinessRules: true,
            }
          );

          if (!businessResult.isValid) {
            errorHandler.addValidationErrors(businessResult.errors);
            hasErrors = true;
          }

          errorHandler.addValidationWarnings(businessResult.warnings);

          reporter.completeStep(
            "business-rules",
            `Validated ${parseResult.machines.length} machine(s)`
          );
        } else {
          reporter.completeStep(
            "business-rules",
            "No machines found to validate"
          );
        }
      } catch (error) {
        errorHandler.error(
          ErrorCategory.PARSING,
          `Failed to parse Mermaid file: ${error}`
        );
        hasErrors = true;
        reporter.failStep(
          "business-rules",
          error instanceof Error ? error.message : String(error)
        );
      }
    } else if (config.checkBusinessRules) {
      reporter.skipStep("business-rules", "No source file specified");
    }

    // Step 3: Validate generated code
    if (config.checkGeneratedCode && config.generatedDir) {
      reporter.startStep("generated-code");

      if (!existsSync(config.generatedDir)) {
        errorHandler.warning(
          ErrorCategory.FILE_SYSTEM,
          `Generated code directory not found: ${config.generatedDir}`
        );
        reporter.skipStep("generated-code", "Directory not found");
      } else {
        const generatedFiles = await findGeneratedFiles(
          config.generatedDir,
          config.pattern
        );

        if (generatedFiles.length === 0) {
          reporter.completeStep("generated-code", "No generated files found");
        } else {
          const codeResult = await validateGeneratedCode(generatedFiles, {
            checkTypeScript: config.checkTypeScript,
            checkESLint: config.checkESLint,
            checkImports: true,
            checkXState: true,
          });

          if (!codeResult.isValid) {
            errorHandler.addValidationErrors(codeResult.errors);
            hasErrors = true;
          }

          errorHandler.addValidationWarnings(codeResult.warnings);

          reporter.completeStep(
            "generated-code",
            `Validated ${generatedFiles.length} file(s)`
          );
        }
      }
    } else if (config.checkGeneratedCode) {
      reporter.skipStep("generated-code", "No generated directory specified");
    }

    // Step 4: Generate report
    reporter.startStep("report");

    const reportPath = errorHandler.saveReport();
    const summary = errorHandler.getSummary();

    reporter.completeStep(
      "report",
      config.generateReport
        ? `Report saved to ${reportPath}`
        : "Report generation disabled"
    );

    // Final results
    reporter.printSummary();

    console.log("\n" + summary);

    if (hasErrors || errorHandler.hasErrors()) {
      console.log("\n❌ Validation failed with errors");
      process.exit(1);
    } else if (errorHandler.getStatistics().total > 0) {
      console.log("\n⚠️  Validation completed with warnings");
      process.exit(0);
    } else {
      console.log("\n✅ Validation passed successfully");
      process.exit(0);
    }
  } catch (error) {
    console.error(
      "❌ Validation failed:",
      error instanceof Error ? error.message : String(error)
    );
    if (options.verbose && error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

/**
 * Validate and normalize validation CLI options
 */
async function validateAndNormalizeValidationOptions(
  options: any
): Promise<ValidationCLIConfig> {
  const config: ValidationCLIConfig = {
    source: options.source ? resolve(options.source) : undefined,
    generatedDir: options.generatedDir
      ? resolve(options.generatedDir)
      : undefined,
    checkMermaid: options.mermaid !== false,
    checkBusinessRules: options.businessRules !== false,
    checkGeneratedCode: options.generatedCode !== false,
    checkTypeScript: options.typescript !== false,
    checkESLint: options.eslint || false,
    strictMode: options.strict || DEFAULT_VALIDATION_CLI_CONFIG.strictMode,
    generateReport: options.report !== false,
    reportDir: resolve(
      options.reportDir || DEFAULT_VALIDATION_CLI_CONFIG.reportDir
    ),
    verbose: options.verbose || DEFAULT_VALIDATION_CLI_CONFIG.verbose,
    pattern: options.pattern,
  };

  // Auto-detect source and generated directories if not specified
  if (!config.source && !config.generatedDir) {
    // Look for common source files
    const commonSources = [
      "docs/requirements/USSD-menu-mermaid.md",
      "docs/flows.md",
      "README.md",
    ];

    for (const source of commonSources) {
      if (existsSync(source)) {
        config.source = resolve(source);
        break;
      }
    }

    // Look for common generated directories
    const commonGenerated = [
      "src/machines/generated",
      "src/generated",
      "generated",
    ];

    for (const dir of commonGenerated) {
      if (existsSync(dir)) {
        config.generatedDir = resolve(dir);
        break;
      }
    }
  }

  return config;
}

/**
 * Find generated files in directory
 */
async function findGeneratedFiles(
  dir: string,
  pattern?: string
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  function scanDirectory(currentDir: string): void {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && isGeneratedFile(entry)) {
        // Apply pattern filter if specified
        if (pattern && !entry.includes(pattern)) {
          continue;
        }

        try {
          const content = require("fs").readFileSync(fullPath, "utf-8");
          files.push({ path: fullPath, content });
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }

  scanDirectory(dir);
  return files;
}

/**
 * Check if file is a generated file
 */
function isGeneratedFile(filename: string): boolean {
  return (
    filename.endsWith(".ts") &&
    (filename.includes(".generated.") ||
      filename.includes(".test.") ||
      filename.includes(".demo.") ||
      filename.includes(".service."))
  );
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  setupValidationCLI();
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
  main as validateCLI,
  handleValidationCommand,
  validateAndNormalizeValidationOptions,
};
