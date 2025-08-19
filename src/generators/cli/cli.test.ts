/**
 * CLI Commands Tests
 *
 * Comprehensive test suite for CLI command functionality including
 * argument parsing, validation, and integration with generators.
 *
 * @module cli.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { validateAndNormalizeOptions } from "./generate-machines.js";
import { validateAndNormalizeTestOptions } from "./generate-tests.js";
import { displayHelp, displayExamples, displayVersion } from "./help.js";

describe("CLI Commands", () => {
  let testDir: string;
  let testMermaidFile: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-cli");
    testMermaidFile = join(testDir, "test.md");

    // Create test directory and file
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    writeFileSync(
      testMermaidFile,
      `
# Test Mermaid
\`\`\`mermaid
flowchart LR
Start --> End
\`\`\`
    `
    );
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

  describe("Generate Machines CLI", () => {
    describe("Option Validation", () => {
      it("should validate and normalize default options", async () => {
        const options = {
          source: testMermaidFile,
        };

        const config = await validateAndNormalizeOptions(options);

        expect(config.source).toBe(testMermaidFile);
        expect(config.variant).toBe("standard");
        expect(config.tests).toBe(true);
        expect(config.demos).toBe(true);
        expect(config.services).toBe(true);
        expect(config.overwrite).toBe(false);
        expect(config.dryRun).toBe(false);
        expect(config.verbose).toBe(false);
        expect(config.watch).toBe(false);
        expect(config.incremental).toBe(true);
      });

      it("should validate and normalize custom options", async () => {
        const options = {
          source: testMermaidFile,
          output: join(testDir, "output"),
          category: "user-machine",
          variant: "comprehensive",
          tests: false,
          demos: false,
          services: false,
          overwrite: true,
          dryRun: true,
          verbose: true,
          watch: true,
          incremental: false,
        };

        const config = await validateAndNormalizeOptions(options);

        expect(config.category).toBe("user-machine");
        expect(config.variant).toBe("comprehensive");
        expect(config.tests).toBe(false);
        expect(config.demos).toBe(false);
        expect(config.services).toBe(false);
        expect(config.overwrite).toBe(true);
        expect(config.dryRun).toBe(true);
        expect(config.verbose).toBe(true);
        expect(config.watch).toBe(true);
        expect(config.incremental).toBe(false);
      });

      it("should reject invalid variant", async () => {
        const options = {
          source: testMermaidFile,
          variant: "invalid",
        };

        await expect(validateAndNormalizeOptions(options)).rejects.toThrow(
          "Invalid variant: invalid"
        );
      });

      it("should reject invalid category", async () => {
        const options = {
          source: testMermaidFile,
          category: "invalid-category",
        };

        await expect(validateAndNormalizeOptions(options)).rejects.toThrow(
          "Invalid category: invalid-category"
        );
      });

      it("should accept valid categories", async () => {
        const validCategories = [
          "user-machine",
          "agent-machine",
          "account-machine",
          "info-machine",
          "core-machine",
        ];

        for (const category of validCategories) {
          const options = {
            source: testMermaidFile,
            category,
          };

          const config = await validateAndNormalizeOptions(options);
          expect(config.category).toBe(category);
        }
      });

      it("should accept valid variants", async () => {
        const validVariants = ["standard", "minimal", "comprehensive"];

        for (const variant of validVariants) {
          const options = {
            source: testMermaidFile,
            variant,
          };

          const config = await validateAndNormalizeOptions(options);
          expect(config.variant).toBe(variant);
        }
      });

      it("should resolve relative paths to absolute paths", async () => {
        const options = {
          source: "test.md",
          output: "output",
        };

        const config = await validateAndNormalizeOptions(options);

        expect(config.source).toContain(process.cwd());
        expect(config.output).toContain(process.cwd());
      });
    });
  });

  describe("Generate Tests CLI", () => {
    describe("Option Validation", () => {
      it("should validate and normalize default test options", async () => {
        const options = {
          machinesDir: testDir,
        };

        const config = await validateAndNormalizeTestOptions(options);

        expect(config.machinesDir).toBe(testDir);
        expect(config.testStyle).toBe("smoke");
        expect(config.includeTransition).toBe(true);
        expect(config.includeError).toBe(true);
        expect(config.includeIntegration).toBe(false);
        expect(config.incremental).toBe(true);
        expect(config.overwrite).toBe(false);
        expect(config.dryRun).toBe(false);
        expect(config.verbose).toBe(false);
        expect(config.watch).toBe(false);
      });

      it("should validate and normalize custom test options", async () => {
        const options = {
          source: testMermaidFile,
          machinesDir: testDir,
          output: join(testDir, "tests"),
          style: "comprehensive",
          transition: false,
          error: false,
          includeIntegration: true,
          incremental: false,
          overwrite: true,
          dryRun: true,
          verbose: true,
          watch: true,
          pattern: "user",
        };

        const config = await validateAndNormalizeTestOptions(options);

        expect(config.source).toBe(testMermaidFile);
        expect(config.testStyle).toBe("comprehensive");
        expect(config.includeTransition).toBe(false);
        expect(config.includeError).toBe(false);
        expect(config.includeIntegration).toBe(true);
        expect(config.incremental).toBe(false);
        expect(config.overwrite).toBe(true);
        expect(config.dryRun).toBe(true);
        expect(config.verbose).toBe(true);
        expect(config.watch).toBe(true);
        expect(config.pattern).toBe("user");
      });

      it("should reject invalid test style", async () => {
        const options = {
          machinesDir: testDir,
          style: "invalid",
        };

        await expect(validateAndNormalizeTestOptions(options)).rejects.toThrow(
          "Invalid test style: invalid"
        );
      });

      it("should accept valid test styles", async () => {
        const validStyles = ["smoke", "comprehensive"];

        for (const style of validStyles) {
          const options = {
            machinesDir: testDir,
            style,
          };

          const config = await validateAndNormalizeTestOptions(options);
          expect(config.testStyle).toBe(style);
        }
      });

      it("should reject non-existent source file", async () => {
        const options = {
          source: "/nonexistent/file.md",
          machinesDir: testDir,
        };

        await expect(validateAndNormalizeTestOptions(options)).rejects.toThrow(
          "Source file not found"
        );
      });

      it("should reject non-existent machines directory", async () => {
        const options = {
          machinesDir: "/nonexistent/directory",
        };

        await expect(validateAndNormalizeTestOptions(options)).rejects.toThrow(
          "Machines directory not found"
        );
      });
    });
  });

  describe("Help System", () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should display general help by default", () => {
      displayHelp();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Code Generation CLI")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("AVAILABLE COMMANDS")
      );
    });

    it("should display machine generation help", () => {
      displayHelp("machines");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Machine Generation Command")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("generate:machines")
      );
    });

    it("should display test generation help", () => {
      displayHelp("tests");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test Generation Command")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("generate:tests")
      );
    });

    it("should display examples", () => {
      displayExamples();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Common Usage Examples")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("BASIC WORKFLOWS")
      );
    });

    it("should display version information", () => {
      displayVersion();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Code Generation CLI v1.0.0")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Components")
      );
    });
  });

  describe("Integration Tests", () => {
    it("should handle CLI argument parsing edge cases", async () => {
      // Test empty options
      const emptyConfig = await validateAndNormalizeOptions({});
      expect(emptyConfig).toBeDefined();

      // Test undefined values
      const undefinedConfig = await validateAndNormalizeOptions({
        source: undefined,
        output: undefined,
        category: undefined,
      });
      expect(undefinedConfig).toBeDefined();
    });

    it("should handle boolean option variations", async () => {
      // Test explicit false values
      const falseConfig = await validateAndNormalizeOptions({
        source: testMermaidFile,
        tests: false,
        demos: false,
        services: false,
        overwrite: false,
        dryRun: false,
        verbose: false,
        watch: false,
        incremental: false,
      });

      expect(falseConfig.tests).toBe(false);
      expect(falseConfig.demos).toBe(false);
      expect(falseConfig.services).toBe(false);
      expect(falseConfig.overwrite).toBe(false);
      expect(falseConfig.dryRun).toBe(false);
      expect(falseConfig.verbose).toBe(false);
      expect(falseConfig.watch).toBe(false);
      expect(falseConfig.incremental).toBe(false);
    });

    it("should handle path resolution correctly", async () => {
      const relativeConfig = await validateAndNormalizeOptions({
        source: "./test.md",
        output: "./output",
      });

      expect(relativeConfig.source).toMatch(/test\.md$/);
      expect(relativeConfig.output).toMatch(/output$/);
      expect(relativeConfig.source).toContain(process.cwd());
      expect(relativeConfig.output).toContain(process.cwd());
    });
  });

  describe("Error Handling", () => {
    it("should provide meaningful error messages for validation failures", async () => {
      const invalidOptions = [
        { variant: "invalid", expectedError: "Invalid variant" },
        { category: "invalid", expectedError: "Invalid category" },
      ];

      for (const { variant, category, expectedError } of invalidOptions) {
        const options = {
          source: testMermaidFile,
          ...(variant && { variant }),
          ...(category && { category }),
        };

        await expect(validateAndNormalizeOptions(options)).rejects.toThrow(
          expectedError
        );
      }
    });

    it("should handle test validation errors", async () => {
      const invalidTestOptions = [
        { style: "invalid", expectedError: "Invalid test style" },
        { source: "/nonexistent.md", expectedError: "Source file not found" },
        {
          machinesDir: "/nonexistent",
          expectedError: "Machines directory not found",
        },
      ];

      for (const {
        style,
        source,
        machinesDir,
        expectedError,
      } of invalidTestOptions) {
        const options = {
          ...(style && { style }),
          ...(source && { source }),
          ...(machinesDir && { machinesDir }),
          ...(!machinesDir && { machinesDir: testDir }),
        };

        await expect(validateAndNormalizeTestOptions(options)).rejects.toThrow(
          expectedError
        );
      }
    });
  });
});
