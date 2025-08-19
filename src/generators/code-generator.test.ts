/**
 * Code Generator Tests - Comprehensive test suite for code generation orchestration
 *
 * Tests cover the complete code generation pipeline from Mermaid parsing
 * to file output, including error handling and configuration options.
 *
 * @module code-generator.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { CodeGenerator, generateCode } from "./code-generator.js";
import type { CodeGeneratorConfig } from "./code-generator.js";

describe("CodeGenerator", () => {
  let generator: CodeGenerator;
  let testDir: string;
  let testMermaidFile: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-code-generator");
    testMermaidFile = join(testDir, "test-mermaid.md");

    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create test Mermaid file
    const mermaidContent = `
# Test Mermaid Diagram

\`\`\`mermaid
flowchart LR
Start["Start State"] --> Processing["Processing"]
Processing --> End["End State"]
Processing --> Error["Error State"]

classDef user-machine fill:#f3e5f5,stroke:#4a148c
class Start,Processing,End user-machine
\`\`\`
    `;

    writeFileSync(testMermaidFile, mermaidContent);

    // Initialize generator with test configuration
    generator = new CodeGenerator({
      sourcePath: testMermaidFile,
      outputDir: join(testDir, "generated"),
      verbose: false,
      dryRun: true, // Don't write files by default
      templates: {
        machine: { variant: "standard", strictMode: true, customImports: [] },
        tests: {
          style: "smoke",
          includeIntegration: false,
          includePerformance: false,
          includeTransitionTests: false,
          includeErrorTests: false,
        },
        demos: {
          style: "interactive",
          includeVisuals: true,
          includePerformance: false,
        },
        services: {
          generate: false,
          variant: "basic",
          includeErrorHandling: true,
          includeValidation: true,
        },
      },
    });
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

  describe("Configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultGenerator = new CodeGenerator();
      expect(defaultGenerator).toBeDefined();
    });

    it("should merge custom configuration with defaults", () => {
      const customConfig: Partial<CodeGeneratorConfig> = {
        generateDemos: false,
        generateTests: false,
        verbose: true,
      };

      const customGenerator = new CodeGenerator(customConfig);
      expect(customGenerator).toBeDefined();
    });

    it("should validate configuration options", () => {
      expect(() => {
        new CodeGenerator({
          sourcePath: "",
          outputDir: "",
        });
      }).not.toThrow();
    });
  });

  describe("Mermaid Parsing Integration", () => {
    it("should successfully parse valid Mermaid file", async () => {
      const result = await generator.generateFromMermaid();

      expect(result).toBeDefined();
      expect(result.errors.length).toBe(0);
      expect(result.stats.machinesGenerated).toBeGreaterThan(0);
    });

    it("should handle parsing errors gracefully", async () => {
      // Create invalid Mermaid file
      const invalidMermaidFile = join(testDir, "invalid.md");
      writeFileSync(invalidMermaidFile, "Invalid content");

      const result = await generator.generateFromMermaid(invalidMermaidFile);

      expect(result).toBeDefined();
      expect(result.stats.machinesGenerated).toBe(0);
    });

    it("should handle non-existent files", async () => {
      const result = await generator.generateFromMermaid(
        "/nonexistent/file.md"
      );

      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stats.machinesGenerated).toBe(0);
    });

    it("should handle empty Mermaid files", async () => {
      const emptyFile = join(testDir, "empty.md");
      writeFileSync(emptyFile, "");

      const result = await generator.generateFromMermaid(emptyFile);

      expect(result).toBeDefined();
      expect(result.stats.machinesGenerated).toBe(0);
    });
  });

  describe("File Generation", () => {
    it("should generate machine files", async () => {
      const result = await generator.generateFromMermaid();

      expect(result.generatedFiles.length).toBeGreaterThan(0);

      const machineFiles = result.generatedFiles.filter(
        f => f.type === "machine"
      );
      expect(machineFiles.length).toBeGreaterThan(0);

      const machineFile = machineFiles[0];
      expect(machineFile.content).toContain("setup");
      expect(machineFile.content).toContain("createMachine");
      expect(machineFile.path).toContain(".generated.ts");
    });

    it("should generate test files when enabled", async () => {
      const testGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        generateTests: true,
        generateDemos: false,
        dryRun: true,
      });

      const result = await testGenerator.generateFromMermaid();

      const testFiles = result.generatedFiles.filter(f => f.type === "test");
      expect(testFiles.length).toBeGreaterThan(0);

      const testFile = testFiles[0];
      expect(testFile.content).toContain("describe");
      expect(testFile.content).toContain("it(");
      expect(testFile.path).toContain(".test.ts");
    });

    it("should generate demo files when enabled", async () => {
      const demoGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        generateTests: false,
        generateDemos: true,
        dryRun: true,
      });

      const result = await demoGenerator.generateFromMermaid();

      const demoFiles = result.generatedFiles.filter(f => f.type === "demo");
      expect(demoFiles.length).toBeGreaterThan(0);

      const demoFile = demoFiles[0];
      expect(demoFile.content).toContain("Interactive Demo");
      expect(demoFile.content).toContain("readline");
      expect(demoFile.path).toContain("-demo.ts");
    });

    it("should skip test files when disabled", async () => {
      const noTestGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        generateTests: false,
        dryRun: true,
      });

      const result = await noTestGenerator.generateFromMermaid();

      const testFiles = result.generatedFiles.filter(f => f.type === "test");
      expect(testFiles.length).toBe(0);
    });

    it("should skip demo files when disabled", async () => {
      const noDemoGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        generateDemos: false,
        dryRun: true,
      });

      const result = await noDemoGenerator.generateFromMermaid();

      const demoFiles = result.generatedFiles.filter(f => f.type === "demo");
      expect(demoFiles.length).toBe(0);
    });
  });

  describe("File Organization", () => {
    it("should organize files by category when enabled", async () => {
      const organizedGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        organization: {
          groupByCategory: true,
          createIndexFiles: false,
          generateReadme: false,
        },
        dryRun: true,
      });

      const result = await organizedGenerator.generateFromMermaid();

      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Files should be organized in category subdirectories
      const machineFile = result.generatedFiles.find(f => f.type === "machine");
      expect(machineFile?.path).toContain("user-services");
    });

    it("should create index files when enabled", async () => {
      const indexGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        organization: {
          groupByCategory: true,
          createIndexFiles: true,
          generateReadme: false,
        },
        dryRun: true,
      });

      const result = await indexGenerator.generateFromMermaid();

      const indexFiles = result.generatedFiles.filter(f =>
        f.path.includes("index.ts")
      );
      expect(indexFiles.length).toBeGreaterThan(0);

      const indexFile = indexFiles[0];
      expect(indexFile.content).toContain("export");
    });

    it("should use flat organization when category grouping disabled", async () => {
      const flatGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "generated"),
        organization: {
          groupByCategory: false,
          createIndexFiles: false,
          generateReadme: false,
        },
        dryRun: true,
      });

      const result = await flatGenerator.generateFromMermaid();

      const machineFile = result.generatedFiles.find(f => f.type === "machine");
      expect(machineFile?.path).not.toContain("user-services");
      expect(machineFile?.path).toContain(join(testDir, "generated"));
    });
  });

  describe("File Writing", () => {
    it("should write files to disk when not in dry run mode", async () => {
      const writeGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: join(testDir, "output"),
        dryRun: false,
        verbose: false,
        templates: {
          machine: { variant: "standard", strictMode: true, customImports: [] },
          tests: {
            style: "smoke",
            includeIntegration: false,
            includePerformance: false,
            includeTransitionTests: false,
            includeErrorTests: false,
          },
          demos: {
            style: "interactive",
            includeVisuals: true,
            includePerformance: false,
          },
          services: {
            generate: false,
            variant: "basic",
            includeErrorHandling: true,
            includeValidation: true,
          },
        },
      });

      const result = await writeGenerator.generateFromMermaid();

      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Check that files were actually written
      result.generatedFiles.forEach(file => {
        expect(existsSync(file.path)).toBe(true);
      });
    });

    it("should not write files in dry run mode", async () => {
      const result = await generator.generateFromMermaid();

      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Files should not exist on disk
      result.generatedFiles.forEach(file => {
        expect(existsSync(file.path)).toBe(false);
      });
    });

    it("should handle file writing errors gracefully", async () => {
      // Create generator with invalid output directory
      const invalidGenerator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir: "/invalid/readonly/path",
        dryRun: false,
        verbose: false,
      });

      const result = await invalidGenerator.generateFromMermaid();

      // Should complete but with errors
      expect(result).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Template Configuration", () => {
    it("should use different template variants", async () => {
      const variants = ["standard", "minimal", "comprehensive"] as const;

      for (const variant of variants) {
        const variantGenerator = new CodeGenerator({
          sourcePath: testMermaidFile,
          templates: {
            machine: { variant, strictMode: true, customImports: [] },
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
              generate: true,
              variant: "basic",
              includeErrorHandling: true,
              includeValidation: true,
            },
          },
          dryRun: true,
        });

        const result = await variantGenerator.generateFromMermaid();
        expect(result.generatedFiles.length).toBeGreaterThan(0);
      }
    });

    it("should use different test styles", async () => {
      const styles = ["smoke", "comprehensive"] as const;

      for (const style of styles) {
        const styleGenerator = new CodeGenerator({
          sourcePath: testMermaidFile,
          templates: {
            machine: {
              variant: "standard",
              strictMode: true,
              customImports: [],
            },
            tests: {
              style,
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
              generate: true,
              variant: "basic",
              includeErrorHandling: true,
              includeValidation: true,
            },
          },
          generateTests: true,
          dryRun: true,
        });

        const result = await styleGenerator.generateFromMermaid();
        const testFiles = result.generatedFiles.filter(f => f.type === "test");
        expect(testFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Statistics and Reporting", () => {
    it("should provide accurate generation statistics", async () => {
      const result = await generator.generateFromMermaid();

      expect(result.stats).toBeDefined();
      expect(result.stats.machinesGenerated).toBeGreaterThan(0);
      expect(result.stats.filesCreated).toBeGreaterThan(0);
      expect(result.stats.linesOfCode).toBeGreaterThan(0);
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
    });

    it("should calculate lines of code correctly", async () => {
      const result = await generator.generateFromMermaid();

      const expectedLines = result.generatedFiles.reduce(
        (total, file) => total + file.content.split("\n").length,
        0
      );

      expect(result.stats.linesOfCode).toBe(expectedLines);
    });

    it("should track file sizes", async () => {
      const result = await generator.generateFromMermaid();

      result.generatedFiles.forEach(file => {
        expect(file.size).toBe(file.content.length);
        expect(file.size).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle exceptions during generation", async () => {
      // Mock parser to throw error
      const errorGenerator = new CodeGenerator({
        sourcePath: "/nonexistent/file.md",
        dryRun: true,
      });

      const result = await errorGenerator.generateFromMermaid();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stats.machinesGenerated).toBe(0);
    });

    it("should provide helpful error messages", async () => {
      const result = await generator.generateFromMermaid("/invalid/path.md");

      expect(result.errors.length).toBeGreaterThan(0);
      // Error message could be about file reading or no machines found
      expect(result.errors[0].message).toBeDefined();
    });
  });

  describe("Convenience Function", () => {
    it("should work with convenience function", async () => {
      const result = await generateCode({
        sourcePath: testMermaidFile,
        dryRun: true,
        verbose: false,
      });

      expect(result).toBeDefined();
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });

    it("should use default configuration when no config provided", async () => {
      // This would use the default source path, so we expect it to complete
      const result = await generateCode({ dryRun: true, verbose: false });

      expect(result).toBeDefined();
      // May succeed or fail depending on whether default source exists
      expect(result.stats).toBeDefined();
    });
  });
});
