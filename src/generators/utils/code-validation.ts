/**
 * Generated Code Validation
 *
 * This module provides validation for generated TypeScript code including
 * compilation checks, syntax validation, and code quality analysis.
 *
 * @module code-validation
 * @version 1.0.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, basename } from "path";
import { spawn } from "child_process";
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../types/generator-types.js";

/**
 * Code validation configuration
 */
export interface CodeValidationConfig {
  /** Enable TypeScript compilation checks */
  checkTypeScript: boolean;

  /** Enable ESLint validation */
  checkESLint: boolean;

  /** Enable Prettier formatting checks */
  checkPrettier: boolean;

  /** Enable import/export validation */
  checkImports: boolean;

  /** Enable XState specific validation */
  checkXState: boolean;

  /** Temporary directory for validation */
  tempDir: string;

  /** TypeScript config file path */
  tsconfigPath: string;

  /** ESLint config file path */
  eslintConfigPath?: string;
}

/**
 * Default code validation configuration
 */
export const DEFAULT_CODE_VALIDATION_CONFIG: CodeValidationConfig = {
  checkTypeScript: true,
  checkESLint: true,
  checkPrettier: true,
  checkImports: true,
  checkXState: true,
  tempDir: ".validation-temp",
  tsconfigPath: "tsconfig.json",
};

/**
 * Generated code validator
 */
export class CodeValidator {
  private config: CodeValidationConfig;
  private errors: ValidationError[];
  private warnings: ValidationWarning[];

  constructor(config: Partial<CodeValidationConfig> = {}) {
    this.config = { ...DEFAULT_CODE_VALIDATION_CONFIG, ...config };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate generated code files
   */
  async validateGeneratedCode(
    files: Array<{ path: string; content: string }>
  ): Promise<ValidationResult> {
    this.reset();

    if (files.length === 0) {
      this.addWarning("No files", 0, "No files provided for validation");
      return this.getResult();
    }

    // Create temporary directory for validation
    const tempDir = this.createTempDirectory();

    try {
      // Write files to temp directory
      const tempFiles = await this.writeFilesToTemp(files, tempDir);

      // Run validation checks
      if (this.config.checkTypeScript) {
        await this.validateTypeScript(tempFiles, tempDir);
      }

      if (this.config.checkESLint) {
        await this.validateESLint(tempFiles, tempDir);
      }

      if (this.config.checkPrettier) {
        await this.validatePrettier(tempFiles, tempDir);
      }

      if (this.config.checkImports) {
        await this.validateImports(tempFiles);
      }

      if (this.config.checkXState) {
        await this.validateXState(tempFiles);
      }
    } finally {
      // Cleanup temp directory
      this.cleanupTempDirectory(tempDir);
    }

    return this.getResult();
  }

  /**
   * Create temporary directory for validation
   */
  private createTempDirectory(): string {
    const tempDir = join(process.cwd(), this.config.tempDir);

    try {
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
    } catch (error) {
      // If we can't create temp directory, use a fallback
      return join(process.cwd(), ".temp-validation");
    }

    return tempDir;
  }

  /**
   * Write files to temporary directory
   */
  private async writeFilesToTemp(
    files: Array<{ path: string; content: string }>,
    tempDir: string
  ): Promise<string[]> {
    const tempFiles: string[] = [];

    for (const file of files) {
      const fileName = basename(file.path);
      const tempFilePath = join(tempDir, fileName);

      // Ensure directory exists
      const fileDir = dirname(tempFilePath);
      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }

      writeFileSync(tempFilePath, file.content);
      tempFiles.push(tempFilePath);
    }

    return tempFiles;
  }

  /**
   * Validate TypeScript compilation
   */
  private async validateTypeScript(
    files: string[],
    tempDir: string
  ): Promise<void> {
    try {
      // Create a temporary tsconfig for validation
      const tempTsConfig = this.createTempTsConfig(tempDir);

      // Run TypeScript compiler
      const result = await this.runCommand(
        "npx",
        ["tsc", "--noEmit", "--project", tempTsConfig],
        tempDir
      );

      if (result.exitCode !== 0) {
        this.parseTypeScriptErrors(result.stderr);
      }
    } catch (error) {
      this.addError(
        "TypeScript validation failed",
        0,
        `Failed to run TypeScript compiler: ${error}`
      );
    }
  }

  /**
   * Create temporary TypeScript configuration
   */
  private createTempTsConfig(tempDir: string): string {
    const tempTsConfigPath = join(tempDir, "tsconfig.json");

    // Read existing tsconfig or create minimal one
    let baseConfig = {};
    if (existsSync(this.config.tsconfigPath)) {
      try {
        const configContent = readFileSync(this.config.tsconfigPath, "utf-8");
        baseConfig = JSON.parse(configContent);
      } catch {
        // Use default config if parsing fails
      }
    }

    const tempConfig = {
      ...baseConfig,
      compilerOptions: {
        ...((baseConfig as any).compilerOptions || {}),
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "node",
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
      },
      include: ["*.ts"],
      exclude: ["node_modules", "dist"],
    };

    writeFileSync(tempTsConfigPath, JSON.stringify(tempConfig, null, 2));
    return tempTsConfigPath;
  }

  /**
   * Parse TypeScript compiler errors
   */
  private parseTypeScriptErrors(stderr: string): void {
    const lines = stderr.split("\n");

    for (const line of lines) {
      if (line.trim() === "") continue;

      // Parse TypeScript error format: file(line,col): error TS####: message
      const errorMatch = line.match(
        /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS(\d+):\s*(.+)$/
      );

      if (errorMatch) {
        const [, , lineNum, , severity, code, message] = errorMatch;

        if (severity === "error") {
          this.addError(
            "TypeScript compilation error",
            parseInt(lineNum),
            `TS${code}: ${message}`,
            "Check TypeScript syntax and type definitions"
          );
        } else {
          this.addWarning(
            "TypeScript compilation warning",
            parseInt(lineNum),
            `TS${code}: ${message}`
          );
        }
      } else if (line.includes("error") || line.includes("Error")) {
        this.addError("TypeScript compilation error", 0, line.trim());
      }
    }
  }

  /**
   * Validate with ESLint
   */
  private async validateESLint(
    files: string[],
    tempDir: string
  ): Promise<void> {
    try {
      const eslintArgs = ["eslint", "--format", "json", ...files];

      if (this.config.eslintConfigPath) {
        eslintArgs.push("--config", this.config.eslintConfigPath);
      }

      const result = await this.runCommand("npx", eslintArgs, tempDir);

      if (result.stdout) {
        this.parseESLintOutput(result.stdout);
      }
    } catch (error) {
      this.addWarning(
        "ESLint validation failed",
        0,
        `Failed to run ESLint: ${error}`
      );
    }
  }

  /**
   * Parse ESLint JSON output
   */
  private parseESLintOutput(stdout: string): void {
    try {
      const results = JSON.parse(stdout);

      for (const result of results) {
        for (const message of result.messages) {
          if (message.severity === 2) {
            this.addError(
              "ESLint error",
              message.line,
              `${message.ruleId}: ${message.message}`,
              "Fix ESLint rule violation"
            );
          } else {
            this.addWarning(
              "ESLint warning",
              message.line,
              `${message.ruleId}: ${message.message}`
            );
          }
        }
      }
    } catch {
      this.addWarning(
        "ESLint output parsing failed",
        0,
        "Could not parse ESLint output"
      );
    }
  }

  /**
   * Validate with Prettier
   */
  private async validatePrettier(
    files: string[],
    tempDir: string
  ): Promise<void> {
    try {
      for (const filePath of files) {
        const result = await this.runCommand(
          "npx",
          ["prettier", "--check", filePath],
          tempDir
        );

        if (result.exitCode !== 0) {
          this.addWarning(
            "Prettier formatting",
            0,
            `File ${basename(filePath)} is not properly formatted`,
            "Run prettier --write to fix formatting"
          );
        }
      }
    } catch (error) {
      this.addWarning(
        "Prettier validation failed",
        0,
        `Failed to run Prettier: ${error}`
      );
    }
  }

  /**
   * Validate imports and exports
   */
  private async validateImports(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        this.validateFileImports(content);
      } catch (error) {
        this.addError(
          "Import validation failed",
          0,
          `Failed to read file ${file}: ${error}`
        );
      }
    }
  }

  /**
   * Validate imports in a single file
   */
  private validateFileImports(content: string): void {
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Check import statements
      if (line.startsWith("import ")) {
        this.validateImportStatement(line, lineNumber);
      }

      // Check export statements
      if (line.startsWith("export ")) {
        this.validateExportStatement(line);
      }
    }
  }

  /**
   * Validate import statement
   */
  private validateImportStatement(line: string, lineNumber: number): void {
    // Check for relative imports
    if (line.includes('from "./') || line.includes("from '../")) {
      // Validate relative import paths
      const pathMatch = line.match(/from\s+["']([^"']+)["']/);
      if (pathMatch) {
        const importPath = pathMatch[1];
        if (!importPath.endsWith(".js")) {
          this.addWarning(
            "Import path extension",
            lineNumber,
            `Import path '${importPath}' should include .js extension for ESM compatibility`
          );
        }
      }
    }

    // Check for XState imports
    if (line.includes('from "xstate"')) {
      if (
        !line.includes("createActor") &&
        !line.includes("setup") &&
        !line.includes("assign")
      ) {
        this.addWarning(
          "XState import",
          lineNumber,
          "Consider importing specific XState functions for better tree-shaking"
        );
      }
    }
  }

  /**
   * Validate export statement
   */
  private validateExportStatement(line: string): void {
    // Check for default exports in generated files
    if (line.includes("export default")) {
      // This is expected for machine files
      return;
    }

    // Check for proper type exports
    if (line.includes("export type") || line.includes("export interface")) {
      // Type exports are good
      return;
    }
  }

  /**
   * Validate XState specific patterns
   */
  private async validateXState(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        this.validateXStatePatterns(content);
      } catch (error) {
        this.addError(
          "XState validation failed",
          0,
          `Failed to read file ${file}: ${error}`
        );
      }
    }
  }

  /**
   * Validate XState patterns in content
   */
  private validateXStatePatterns(content: string): void {
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Check for setup() function usage
      if (line.includes("setup(") && !content.includes("import { setup }")) {
        this.addError(
          "Missing XState import",
          lineNumber,
          "setup() function is used but not imported from xstate"
        );
      }

      // Check for createActor usage
      if (
        line.includes("createActor(") &&
        !content.includes("import { createActor }")
      ) {
        this.addError(
          "Missing XState import",
          lineNumber,
          "createActor() function is used but not imported from xstate"
        );
      }

      // Check for proper machine definition
      if (line.includes("setup({") || line.includes("setup( {")) {
        this.validateMachineSetup(content, lineNumber);
      }
    }
  }

  /**
   * Validate XState machine setup
   */
  private validateMachineSetup(content: string, lineNumber: number): void {
    // Check for required machine properties
    const requiredProperties = ["types", "initial", "states"];

    for (const prop of requiredProperties) {
      if (!content.includes(`${prop}:`)) {
        this.addWarning(
          "Missing machine property",
          lineNumber,
          `Machine setup should include '${prop}' property`
        );
      }
    }

    // Check for context definition
    if (content.includes("context:") && !content.includes("input =>")) {
      this.addWarning(
        "Static context",
        lineNumber,
        "Consider using input-based context for better reusability"
      );
    }
  }

  /**
   * Run command and capture output
   */
  private async runCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return new Promise(resolve => {
      const child = spawn(command, args, { cwd, shell: true });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", data => {
        stdout += data.toString();
      });

      child.stderr?.on("data", data => {
        stderr += data.toString();
      });

      child.on("close", code => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on("error", error => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: error.message,
        });
      });
    });
  }

  /**
   * Cleanup temporary directory
   */
  private cleanupTempDirectory(tempDir: string): void {
    try {
      if (existsSync(tempDir)) {
        // Simple cleanup - in production, use a proper cleanup library
        const { rmSync } = require("fs");
        rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors in tests
    }
  }

  /**
   * Add validation error
   */
  private addError(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.errors.push({
      type,
      line,
      message,
      suggestion,
      severity: "error",
    });
  }

  /**
   * Add validation warning
   */
  private addWarning(
    type: string,
    line: number,
    message: string,
    suggestion?: string
  ): void {
    this.warnings.push({
      type,
      line,
      message,
      suggestion,
      severity: "warning",
    });
  }

  /**
   * Reset validation state
   */
  private reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Get validation result
   */
  private getResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: {
        totalIssues: this.errors.length + this.warnings.length,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }
}

/**
 * Convenience function for code validation
 */
export async function validateGeneratedCode(
  files: Array<{ path: string; content: string }>,
  config?: Partial<CodeValidationConfig>
): Promise<ValidationResult> {
  const validator = new CodeValidator(config);
  return validator.validateGeneratedCode(files);
}
