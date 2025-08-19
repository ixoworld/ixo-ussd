/**
 * File System Utilities - Helper functions for code generation file operations
 *
 * This module provides utilities for reading Mermaid files, managing output directories,
 * and handling file operations safely during the code generation process.
 *
 * @module file-utils
 * @version 1.0.0
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "fs";
import { join, dirname, basename, resolve } from "path";
import type { GeneratedFile } from "../types/generator-types.js";

/**
 * File operation result interface
 */
export interface FileOperationResult {
  success: boolean;
  message: string;
  path?: string;
  error?: Error;
}

/**
 * Directory creation options
 */
export interface DirectoryOptions {
  recursive?: boolean;
  mode?: number;
}

/**
 * File writing options
 */
export interface WriteFileOptions {
  overwrite?: boolean;
  backup?: boolean;
  encoding?:
    | "utf-8"
    | "ascii"
    | "base64"
    | "binary"
    | "hex"
    | "latin1"
    | "ucs2"
    | "utf16le";
}

/**
 * File reading utilities
 */
export class FileReader {
  /**
   * Read a Mermaid file and return its content
   */
  static readMermaidFile(filePath: string): string {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`Mermaid file not found: ${filePath}`);
      }

      const content = readFileSync(filePath, "utf-8");

      if (content.trim() === "") {
        throw new Error(`Mermaid file is empty: ${filePath}`);
      }

      return content;
    } catch (error) {
      throw new Error(
        `Failed to read Mermaid file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a file exists and is readable
   */
  static isFileReadable(filePath: string): boolean {
    try {
      const stats = statSync(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  static getFileMetadata(filePath: string): {
    exists: boolean;
    size: number;
    lastModified: Date;
    isFile: boolean;
    isDirectory: boolean;
  } {
    try {
      if (!existsSync(filePath)) {
        return {
          exists: false,
          size: 0,
          lastModified: new Date(0),
          isFile: false,
          isDirectory: false,
        };
      }

      const stats = statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch {
      return {
        exists: false,
        size: 0,
        lastModified: new Date(0),
        isFile: false,
        isDirectory: false,
      };
    }
  }

  /**
   * Read the default USSD menu Mermaid file
   */
  static readUSSDMenuDiagram(): string {
    const defaultPath = join(
      process.cwd(),
      "docs/requirements/USSD-menu-mermaid.md"
    );
    return this.readMermaidFile(defaultPath);
  }
}

/**
 * Directory management utilities
 */
export class DirectoryManager {
  /**
   * Ensure a directory exists, creating it if necessary
   */
  static ensureDirectory(
    dirPath: string,
    options: DirectoryOptions = {}
  ): FileOperationResult {
    try {
      const resolvedPath = resolve(dirPath);

      if (existsSync(resolvedPath)) {
        const stats = statSync(resolvedPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            message: `Path exists but is not a directory: ${resolvedPath}`,
          };
        }
        return {
          success: true,
          message: `Directory already exists: ${resolvedPath}`,
          path: resolvedPath,
        };
      }

      mkdirSync(resolvedPath, {
        recursive: options.recursive ?? true,
        mode: options.mode ?? 0o755,
      });

      return {
        success: true,
        message: `Directory created: ${resolvedPath}`,
        path: resolvedPath,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create the standard generator output directory structure
   */
  static createGeneratorDirectories(baseDir: string): FileOperationResult {
    const directories = [
      join(baseDir, "src/generators/types"),
      join(baseDir, "src/generators/templates"),
      join(baseDir, "src/generators/cli"),
      join(baseDir, "src/generators/utils"),
      join(baseDir, "src/machines/supamoto-wallet/core"),
      join(baseDir, "src/machines/supamoto-wallet/information"),
      join(baseDir, "src/machines/supamoto-wallet/user-services"),
      join(baseDir, "src/machines/supamoto-wallet/agent"),
      join(baseDir, "src/services"),
    ];

    const results: FileOperationResult[] = [];

    for (const dir of directories) {
      const result = this.ensureDirectory(dir);
      results.push(result);

      if (!result.success) {
        return {
          success: false,
          message: `Failed to create directory structure: ${result.message}`,
          error: result.error,
        };
      }
    }

    return {
      success: true,
      message: `Created ${directories.length} directories successfully`,
    };
  }

  /**
   * Get machine category directory path
   */
  static getMachineCategoryPath(baseDir: string, category: string): string {
    const categoryMap: Record<string, string> = {
      "info-machine": "information",
      "user-machine": "user-services",
      "agent-machine": "agent",
      "account-machine": "user-services",
      "core-machine": "core",
    };

    const subDir = categoryMap[category] || "user-services";
    return join(baseDir, "src/machines/supamoto-wallet", subDir);
  }
}

/**
 * File writing utilities
 */
export class FileWriter {
  /**
   * Write a generated file to disk
   */
  static writeGeneratedFile(
    filePath: string,
    content: string,
    options: WriteFileOptions = {}
  ): FileOperationResult {
    try {
      const resolvedPath = resolve(filePath);
      const dir = dirname(resolvedPath);

      // Ensure directory exists
      const dirResult = DirectoryManager.ensureDirectory(dir);
      if (!dirResult.success) {
        return dirResult;
      }

      // Check if file exists and handle overwrite
      if (existsSync(resolvedPath) && !options.overwrite) {
        return {
          success: false,
          message: `File already exists and overwrite is disabled: ${resolvedPath}`,
        };
      }

      // Create backup if requested
      if (options.backup && existsSync(resolvedPath)) {
        const backupPath = `${resolvedPath}.backup`;
        const originalContent = readFileSync(
          resolvedPath,
          options.encoding || "utf-8"
        );
        writeFileSync(backupPath, originalContent, options.encoding || "utf-8");
      }

      // Write the file
      writeFileSync(resolvedPath, content, options.encoding || "utf-8");

      return {
        success: true,
        message: `File written successfully: ${resolvedPath}`,
        path: resolvedPath,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Write multiple generated files
   */
  static writeGeneratedFiles(
    files: GeneratedFile[],
    options: WriteFileOptions = {}
  ): FileOperationResult[] {
    return files.map(file =>
      this.writeGeneratedFile(file.path, file.content, options)
    );
  }

  /**
   * Generate a safe filename for a machine
   */
  static generateMachineFileName(
    machineName: string,
    type: "machine" | "test" | "demo"
  ): string {
    // Sanitize machine name
    const safeName = machineName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const suffixes = {
      machine: ".generated.ts",
      test: ".generated.test.ts",
      demo: ".generated-demo.ts",
    };

    return `${safeName}Machine${suffixes[type]}`;
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  /**
   * Validate that a file is a valid Mermaid file
   */
  static validateMermaidFile(filePath: string): FileOperationResult {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          message: `File does not exist: ${filePath}`,
        };
      }

      const content = readFileSync(filePath, "utf-8");

      // Check for Mermaid code blocks
      if (
        !content.includes("```mermaid") &&
        !content.includes("flowchart") &&
        !content.includes("graph")
      ) {
        return {
          success: false,
          message: `File does not contain Mermaid diagrams: ${filePath}`,
        };
      }

      return {
        success: true,
        message: `Valid Mermaid file: ${filePath}`,
        path: filePath,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error validating file: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if a file is a generated file (has .generated. in name)
   */
  static isGeneratedFile(filePath: string): boolean {
    return basename(filePath).includes(".generated.");
  }

  /**
   * Validate TypeScript file syntax (basic check)
   */
  static validateTypeScriptSyntax(content: string): FileOperationResult {
    try {
      // Basic syntax checks
      const issues: string[] = [];

      // Check for balanced brackets
      const openBrackets = (content.match(/[{[(]/g) || []).length;
      const closeBrackets = (content.match(/[}\])]/g) || []).length;

      if (openBrackets !== closeBrackets) {
        issues.push("Unbalanced brackets detected");
      }

      // Check for basic TypeScript patterns
      if (!content.includes("export") && !content.includes("import")) {
        issues.push(
          "No exports or imports found - may not be a valid TypeScript module"
        );
      }

      if (issues.length > 0) {
        return {
          success: false,
          message: `TypeScript syntax issues: ${issues.join(", ")}`,
        };
      }

      return {
        success: true,
        message: "Basic TypeScript syntax validation passed",
      };
    } catch (error) {
      return {
        success: false,
        message: `Error validating TypeScript syntax: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}

/**
 * Utility functions for common file operations
 */
export const fileUtils = {
  reader: FileReader,
  directory: DirectoryManager,
  writer: FileWriter,
  validator: FileValidator,
};
