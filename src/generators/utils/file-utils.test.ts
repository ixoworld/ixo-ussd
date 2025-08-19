/**
 * File Utils Tests - Comprehensive test suite for file system utilities
 *
 * Tests cover file reading, directory management, file writing, and validation
 * following the established testing patterns in the project.
 *
 * @module file-utils.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  FileReader,
  DirectoryManager,
  FileWriter,
  FileValidator,
  fileUtils,
} from "./file-utils.js";
import type { GeneratedFile } from "../types/generator-types.js";

describe("FileReader", () => {
  let testFilePath: string;
  let testDir: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-file-utils");
    testFilePath = join(testDir, "test-mermaid.md");

    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("readMermaidFile", () => {
    it("should read a valid Mermaid file", () => {
      const content = `
# Test Mermaid File

\`\`\`mermaid
flowchart LR
A --> B
\`\`\`
      `;

      writeFileSync(testFilePath, content);
      const result = FileReader.readMermaidFile(testFilePath);

      expect(result).toBe(content);
    });

    it("should throw error for non-existent file", () => {
      expect(() => {
        FileReader.readMermaidFile("/nonexistent/file.md");
      }).toThrow("Mermaid file not found");
    });

    it("should throw error for empty file", () => {
      writeFileSync(testFilePath, "");

      expect(() => {
        FileReader.readMermaidFile(testFilePath);
      }).toThrow("Mermaid file is empty");
    });

    it("should throw error for whitespace-only file", () => {
      writeFileSync(testFilePath, "   \n\t  \n  ");

      expect(() => {
        FileReader.readMermaidFile(testFilePath);
      }).toThrow("Mermaid file is empty");
    });
  });

  describe("isFileReadable", () => {
    it("should return true for readable file", () => {
      writeFileSync(testFilePath, "test content");
      expect(FileReader.isFileReadable(testFilePath)).toBe(true);
    });

    it("should return false for non-existent file", () => {
      expect(FileReader.isFileReadable("/nonexistent/file.md")).toBe(false);
    });

    it("should return false for directory", () => {
      expect(FileReader.isFileReadable(testDir)).toBe(false);
    });
  });

  describe("getFileMetadata", () => {
    it("should return correct metadata for existing file", () => {
      const content = "test content";
      writeFileSync(testFilePath, content);

      const metadata = FileReader.getFileMetadata(testFilePath);

      expect(metadata.exists).toBe(true);
      expect(metadata.isFile).toBe(true);
      expect(metadata.isDirectory).toBe(false);
      expect(metadata.size).toBe(content.length);
      expect(metadata.lastModified).toBeInstanceOf(Date);
    });

    it("should return default metadata for non-existent file", () => {
      const metadata = FileReader.getFileMetadata("/nonexistent/file.md");

      expect(metadata.exists).toBe(false);
      expect(metadata.isFile).toBe(false);
      expect(metadata.isDirectory).toBe(false);
      expect(metadata.size).toBe(0);
    });
  });
});

describe("DirectoryManager", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-directories");
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("ensureDirectory", () => {
    it("should create new directory", () => {
      const result = DirectoryManager.ensureDirectory(testDir);

      expect(result.success).toBe(true);
      expect(result.path).toBe(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it("should succeed for existing directory", () => {
      mkdirSync(testDir, { recursive: true });
      const result = DirectoryManager.ensureDirectory(testDir);

      expect(result.success).toBe(true);
      expect(result.message).toContain("already exists");
    });

    it("should fail if path exists but is not directory", () => {
      const filePath = join(testDir, "file.txt");
      mkdirSync(testDir, { recursive: true });
      writeFileSync(filePath, "test");

      const result = DirectoryManager.ensureDirectory(filePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain("not a directory");
    });
  });

  describe("createGeneratorDirectories", () => {
    it("should create all required directories", () => {
      const result = DirectoryManager.createGeneratorDirectories(testDir);

      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, "src/generators/types"))).toBe(true);
      expect(
        existsSync(join(testDir, "src/machines/supamoto-wallet/core"))
      ).toBe(true);
    });
  });

  describe("getMachineCategoryPath", () => {
    it("should return correct paths for machine categories", () => {
      const testCases = [
        { category: "info-machine", expected: "information" },
        { category: "user-machine", expected: "user-services" },
        { category: "agent-machine", expected: "agent" },
        { category: "core-machine", expected: "core" },
        { category: "unknown", expected: "user-services" },
      ];

      testCases.forEach(({ category, expected }) => {
        const path = DirectoryManager.getMachineCategoryPath(testDir, category);
        expect(path).toContain(expected);
      });
    });
  });
});

describe("FileWriter", () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-file-writer");
    testFilePath = join(testDir, "test-file.ts");
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("writeGeneratedFile", () => {
    it("should write file successfully", () => {
      const content = "export const test = 'hello';";
      const result = FileWriter.writeGeneratedFile(testFilePath, content);

      expect(result.success).toBe(true);
      expect(result.path).toBe(testFilePath);
      expect(existsSync(testFilePath)).toBe(true);
    });

    it("should create directory if it doesn't exist", () => {
      const content = "export const test = 'hello';";
      const result = FileWriter.writeGeneratedFile(testFilePath, content);

      expect(result.success).toBe(true);
      expect(existsSync(testDir)).toBe(true);
    });

    it("should fail if file exists and overwrite is disabled", () => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFilePath, "existing content");

      const result = FileWriter.writeGeneratedFile(
        testFilePath,
        "new content",
        { overwrite: false }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("already exists");
    });

    it("should create backup when requested", () => {
      const originalContent = "original content";
      const newContent = "new content";

      mkdirSync(testDir, { recursive: true });
      writeFileSync(testFilePath, originalContent);

      const result = FileWriter.writeGeneratedFile(testFilePath, newContent, {
        overwrite: true,
        backup: true,
      });

      expect(result.success).toBe(true);
      expect(existsSync(`${testFilePath}.backup`)).toBe(true);
    });
  });

  describe("writeGeneratedFiles", () => {
    it("should write multiple files", () => {
      const files: GeneratedFile[] = [
        {
          path: join(testDir, "file1.ts"),
          content: "export const file1 = true;",
          type: "machine",
          overwritten: false,
          size: 0,
        },
        {
          path: join(testDir, "file2.ts"),
          content: "export const file2 = true;",
          type: "test",
          overwritten: false,
          size: 0,
        },
      ];

      const results = FileWriter.writeGeneratedFiles(files);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(existsSync(join(testDir, "file1.ts"))).toBe(true);
      expect(existsSync(join(testDir, "file2.ts"))).toBe(true);
    });
  });

  describe("generateMachineFileName", () => {
    it("should generate correct filenames for different types", () => {
      const testCases = [
        {
          name: "TestMachine",
          type: "machine" as const,
          expected: "testmachineMachine.generated.ts",
        },
        {
          name: "TestMachine",
          type: "test" as const,
          expected: "testmachineMachine.generated.test.ts",
        },
        {
          name: "TestMachine",
          type: "demo" as const,
          expected: "testmachineMachine.generated-demo.ts",
        },
      ];

      testCases.forEach(({ name, type, expected }) => {
        const result = FileWriter.generateMachineFileName(name, type);
        expect(result).toBe(expected);
      });
    });

    it("should sanitize machine names", () => {
      const result = FileWriter.generateMachineFileName(
        "Test Machine With Spaces!",
        "machine"
      );
      expect(result).toBe("test-machine-with-spacesMachine.generated.ts");
    });
  });
});

describe("FileValidator", () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-file-validator");
    testFilePath = join(testDir, "test-file.md");

    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validateMermaidFile", () => {
    it("should validate correct Mermaid file", () => {
      const content = `
# Test File

\`\`\`mermaid
flowchart LR
A --> B
\`\`\`
      `;

      writeFileSync(testFilePath, content);
      const result = FileValidator.validateMermaidFile(testFilePath);

      expect(result.success).toBe(true);
    });

    it("should fail for non-existent file", () => {
      const result = FileValidator.validateMermaidFile("/nonexistent/file.md");
      expect(result.success).toBe(false);
      expect(result.message).toContain("does not exist");
    });

    it("should fail for file without Mermaid content", () => {
      writeFileSync(testFilePath, "Just regular markdown content");
      const result = FileValidator.validateMermaidFile(testFilePath);

      expect(result.success).toBe(false);
      expect(result.message).toContain("does not contain Mermaid diagrams");
    });
  });

  describe("isGeneratedFile", () => {
    it("should identify generated files", () => {
      expect(FileValidator.isGeneratedFile("test.generated.ts")).toBe(true);
      expect(FileValidator.isGeneratedFile("test.generated.test.ts")).toBe(
        true
      );
      expect(FileValidator.isGeneratedFile("test.ts")).toBe(false);
    });
  });

  describe("validateTypeScriptSyntax", () => {
    it("should validate correct TypeScript", () => {
      const content = `
export interface Test {
  name: string;
}

export const test: Test = {
  name: "hello"
};
      `;

      const result = FileValidator.validateTypeScriptSyntax(content);
      expect(result.success).toBe(true);
    });

    it("should detect unbalanced brackets", () => {
      const content = "export const test = { name: 'hello'";
      const result = FileValidator.validateTypeScriptSyntax(content);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unbalanced brackets");
    });

    it("should warn about missing exports/imports", () => {
      const content = "const test = 'hello';";
      const result = FileValidator.validateTypeScriptSyntax(content);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No exports or imports");
    });
  });
});

describe("fileUtils", () => {
  it("should export all utility classes", () => {
    expect(fileUtils.reader).toBe(FileReader);
    expect(fileUtils.directory).toBe(DirectoryManager);
    expect(fileUtils.writer).toBe(FileWriter);
    expect(fileUtils.validator).toBe(FileValidator);
  });
});
