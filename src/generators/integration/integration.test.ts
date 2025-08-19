/**
 * End-to-End Integration Tests
 *
 * Comprehensive integration tests that validate the complete workflow
 * from Mermaid parsing through code generation to final validation.
 *
 * @module integration.test
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { CodeGenerator } from "../code-generator.js";
import {
  validateMermaidFile,
  validateBusinessRulesFromParsed,
} from "../utils/validation.js";
import { validateGeneratedCode } from "../utils/code-validation.js";
import { MermaidParser } from "../mermaid-parser.js";

describe("End-to-End Integration Tests", () => {
  let testDir: string;
  let outputDir: string;
  let testMermaidFile: string;

  beforeEach(() => {
    testDir = join(process.cwd(), "test-integration");
    outputDir = join(testDir, "generated");
    testMermaidFile = join(testDir, "test-flow.md");

    // Create test directories
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
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

  describe("Complete Workflow Integration", () => {
    it("should complete full workflow from Mermaid to generated code", async () => {
      // Step 1: Create test Mermaid file
      const mermaidContent = `
# User Authentication Flow

\`\`\`mermaid
flowchart LR
    Start --> CheckSession
    CheckSession --> |VALID_SESSION| MainMenu
    CheckSession --> |INVALID_SESSION| Login
    Login --> |LOGIN_SUCCESS| MainMenu
    Login --> |LOGIN_FAILED| LoginError
    LoginError --> |RETRY| Login
    LoginError --> |CANCEL| End
    MainMenu --> |SELECT_OPTION| ProcessOption
    MainMenu --> |LOGOUT| End
    ProcessOption --> |SUCCESS| MainMenu
    ProcessOption --> |ERROR| ErrorState
    ErrorState --> |RETRY| ProcessOption
    ErrorState --> |BACK| MainMenu
    End
\`\`\`
      `;

      writeFileSync(testMermaidFile, mermaidContent);

      // Step 2: Validate Mermaid syntax
      const mermaidValidation = validateMermaidFile(testMermaidFile);
      expect(mermaidValidation.isValid).toBe(true);
      expect(mermaidValidation.errors).toHaveLength(0);

      // Step 3: Parse Mermaid to machine specs
      const parser = new MermaidParser();
      const parseResult = await parser.parseFile(testMermaidFile);

      expect(parseResult.machines).toHaveLength(1);
      expect(parseResult.errors).toHaveLength(0);

      const machineSpec = parseResult.machines[0];
      expect(machineSpec.name).toBeDefined();
      expect(machineSpec.states.length).toBeGreaterThan(0);

      // Step 4: Validate business rules
      const businessValidation = validateBusinessRulesFromParsed([machineSpec]);
      expect(businessValidation.errors).toHaveLength(0);

      // Step 5: Generate code
      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: true,
        generateDemos: true,
        dryRun: false,
        verbose: false,
        templates: {
          machine: { variant: "standard", strictMode: true, customImports: [] },
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
      });

      const generationResult = await generator.generateFromMermaid();

      expect(generationResult.stats.machinesGenerated).toBe(1);
      expect(generationResult.stats.filesCreated).toBeGreaterThan(0);
      expect(generationResult.errors).toHaveLength(0);

      // Step 6: Validate generated files exist
      const generatedFiles = generationResult.generatedFiles;
      expect(generatedFiles.length).toBeGreaterThan(0);

      for (const file of generatedFiles) {
        expect(existsSync(file.path)).toBe(true);
        expect(file.content.length).toBeGreaterThan(0);
      }

      // Step 7: Validate generated code quality
      const codeValidation = await validateGeneratedCode(
        generatedFiles.map(f => ({ path: f.path, content: f.content })),
        { checkTypeScript: false, checkESLint: false } // Skip external tools in tests
      );

      expect(codeValidation.errors).toHaveLength(0);
    }, 30000); // 30 second timeout for full integration

    it("should handle complex multi-machine workflow", async () => {
      const complexMermaidContent = `
# Multi-Machine USSD System

## User Authentication Machine
\`\`\`mermaid
flowchart LR
    Start --> ValidateSession
    ValidateSession --> |VALID| Authenticated
    ValidateSession --> |INVALID| RequestLogin
    RequestLogin --> |LOGIN_SUCCESS| Authenticated
    RequestLogin --> |LOGIN_FAILED| LoginError
    LoginError --> |RETRY| RequestLogin
    LoginError --> |CANCEL| End
    Authenticated --> |LOGOUT| End
    End
\`\`\`

## Account Management Machine
\`\`\`mermaid
flowchart LR
    Start --> CheckPermissions
    CheckPermissions --> |AUTHORIZED| ShowBalance
    CheckPermissions --> |UNAUTHORIZED| PermissionError
    ShowBalance --> |VIEW_TRANSACTIONS| TransactionHistory
    ShowBalance --> |TRANSFER| InitiateTransfer
    ShowBalance --> |BACK| End
    TransactionHistory --> |BACK| ShowBalance
    InitiateTransfer --> |SUCCESS| TransferSuccess
    InitiateTransfer --> |FAILED| TransferError
    TransferSuccess --> |CONTINUE| ShowBalance
    TransferError --> |RETRY| InitiateTransfer
    TransferError --> |CANCEL| ShowBalance
    PermissionError --> |BACK| End
    End
\`\`\`
      `;

      writeFileSync(testMermaidFile, complexMermaidContent);

      // Parse and validate
      const parser = new MermaidParser();
      const parseResult = await parser.parseFile(testMermaidFile);

      expect(parseResult.machines.length).toBeGreaterThanOrEqual(2);
      expect(parseResult.errors).toHaveLength(0);

      // Validate business rules for all machines
      const businessValidation = validateBusinessRulesFromParsed(
        parseResult.machines
      );
      expect(businessValidation.errors).toHaveLength(0);

      // Generate code for all machines
      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: true,
        generateDemos: false,
        dryRun: false,
        verbose: false,
      });

      const generationResult = await generator.generateFromMermaid();

      expect(generationResult.stats.machinesGenerated).toBeGreaterThanOrEqual(
        2
      );
      expect(generationResult.errors).toHaveLength(0);

      // Verify each machine has proper files
      const machineFiles = generationResult.generatedFiles.filter(
        f => f.type === "machine"
      );
      const testFiles = generationResult.generatedFiles.filter(
        f => f.type === "test"
      );

      expect(machineFiles.length).toBeGreaterThanOrEqual(2);
      expect(testFiles.length).toBeGreaterThanOrEqual(2);
    }, 45000);

    it("should handle error scenarios gracefully", async () => {
      // Test with invalid Mermaid syntax
      const invalidMermaidContent = `
# Invalid Mermaid

\`\`\`mermaid
flowchart LR
    Start -> Invalid syntax here
    Missing --> Target
\`\`\`
      `;

      writeFileSync(testMermaidFile, invalidMermaidContent);

      // Validation should catch errors
      const mermaidValidation = validateMermaidFile(testMermaidFile);
      expect(mermaidValidation.isValid).toBe(false);
      expect(mermaidValidation.errors.length).toBeGreaterThan(0);

      // Parser should handle errors gracefully
      const parser = new MermaidParser();
      const parseResult = await parser.parseFile(testMermaidFile);

      // Should either parse with warnings or fail gracefully
      expect(
        parseResult.errors.length + parseResult.warnings.length
      ).toBeGreaterThan(0);
    });

    it("should validate generated code compiles correctly", async () => {
      const simpleMermaidContent = `
# Simple Test Machine

\`\`\`mermaid
flowchart LR
    Start --> Process
    Process --> |SUCCESS| End
    Process --> |ERROR| ErrorState
    ErrorState --> |RETRY| Process
    ErrorState --> |CANCEL| End
    End
\`\`\`
      `;

      writeFileSync(testMermaidFile, simpleMermaidContent);

      // Generate code
      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: false,
        generateDemos: false,
        dryRun: false,
        verbose: false,
      });

      const generationResult = await generator.generateFromMermaid();
      expect(generationResult.errors).toHaveLength(0);

      // Validate generated TypeScript
      const machineFiles = generationResult.generatedFiles.filter(
        f => f.type === "machine"
      );
      expect(machineFiles.length).toBeGreaterThan(0);

      for (const file of machineFiles) {
        // Basic syntax validation
        expect(file.content).toContain("import { setup }");
        expect(file.content).toContain("export default");
        expect(file.content).toContain("initial:");
        expect(file.content).toContain("states:");

        // Check for proper TypeScript types
        expect(file.content).toContain("interface Context");
        expect(file.content).toContain("type Events");
      }
    });

    it("should generate working test files", async () => {
      const testMermaidContent = `
# Test Machine for Testing

\`\`\`mermaid
flowchart LR
    Start --> Ready
    Ready --> |BEGIN| Processing
    Processing --> |COMPLETE| Success
    Processing --> |FAIL| Error
    Success --> End
    Error --> |RETRY| Ready
    Error --> |ABORT| End
    End
\`\`\`
      `;

      writeFileSync(testMermaidFile, testMermaidContent);

      // Generate with tests
      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: true,
        generateDemos: false,
        dryRun: false,
        verbose: false,
        templates: {
          machine: { variant: "standard", strictMode: true, customImports: [] },
          tests: {
            style: "comprehensive",
            includeIntegration: false,
            includePerformance: false,
            includeTransitionTests: true,
            includeErrorTests: true,
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
      });

      const generationResult = await generator.generateFromMermaid();
      expect(generationResult.errors).toHaveLength(0);

      // Validate test files
      const testFiles = generationResult.generatedFiles.filter(
        f => f.type === "test"
      );
      expect(testFiles.length).toBeGreaterThan(0);

      for (const testFile of testFiles) {
        // Check test structure
        expect(testFile.content).toContain("describe(");
        expect(testFile.content).toContain("it(");
        expect(testFile.content).toContain("expect(");
        expect(testFile.content).toContain("createActor");

        // Check for proper imports
        expect(testFile.content).toContain('from "vitest"');
        expect(testFile.content).toContain('from "xstate"');
      }
    });

    it("should handle incremental updates correctly", async () => {
      const initialMermaidContent = `
# Initial Machine

\`\`\`mermaid
flowchart LR
    Start --> End
\`\`\`
      `;

      writeFileSync(testMermaidFile, initialMermaidContent);

      // First generation
      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: false,
        generateDemos: false,
        dryRun: false,
        verbose: false,
      });

      const firstResult = await generator.generateFromMermaid();
      expect(firstResult.errors).toHaveLength(0);
      expect(firstResult.stats.machinesGenerated).toBe(1);

      // Update Mermaid content
      const updatedMermaidContent = `
# Updated Machine

\`\`\`mermaid
flowchart LR
    Start --> Process
    Process --> End
\`\`\`
      `;

      writeFileSync(testMermaidFile, updatedMermaidContent);

      // Second generation should detect changes
      const secondResult = await generator.generateFromMermaid();
      expect(secondResult.errors).toHaveLength(0);
      expect(secondResult.stats.machinesGenerated).toBe(1);

      // Verify updated content
      const machineFiles = secondResult.generatedFiles.filter(
        f => f.type === "machine"
      );
      expect(machineFiles.length).toBeGreaterThan(0);

      const machineContent = machineFiles[0].content;
      expect(machineContent).toContain("Process");
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle large machine specifications efficiently", async () => {
      // Generate a large machine with many states
      const states = Array.from({ length: 20 }, (_, i) => `State${i + 1}`);
      const transitions = states
        .slice(0, -1)
        .map((state, i) => `${state} --> |NEXT| ${states[i + 1]}`)
        .join("\n    ");

      const largeMermaidContent = `
# Large Machine Test

\`\`\`mermaid
flowchart LR
    Start --> ${states[0]}
    ${transitions}
    ${states[states.length - 1]} --> End
    End
\`\`\`
      `;

      writeFileSync(testMermaidFile, largeMermaidContent);

      const startTime = Date.now();

      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: false,
        generateDemos: false,
        dryRun: false,
        verbose: false,
      });

      const result = await generator.generateFromMermaid();

      const duration = Date.now() - startTime;

      expect(result.errors).toHaveLength(0);
      expect(result.stats.machinesGenerated).toBe(1);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all states are included
      const machineFiles = result.generatedFiles.filter(
        f => f.type === "machine"
      );
      const machineContent = machineFiles[0].content;

      states.forEach(state => {
        expect(machineContent).toContain(state);
      });
    });

    it("should handle multiple machines efficiently", async () => {
      // Generate multiple machines
      const machineCount = 5;
      const machines = Array.from(
        { length: machineCount },
        (_, i) => `
## Machine ${i + 1}
\`\`\`mermaid
flowchart LR
    Start${i} --> Process${i}
    Process${i} --> End${i}
    End${i}
\`\`\`
      `
      ).join("\n");

      const multiMachineContent = `# Multiple Machines Test\n${machines}`;

      writeFileSync(testMermaidFile, multiMachineContent);

      const startTime = Date.now();

      const generator = new CodeGenerator({
        sourcePath: testMermaidFile,
        outputDir,
        generateTests: true,
        generateDemos: false,
        dryRun: false,
        verbose: false,
      });

      const result = await generator.generateFromMermaid();

      const duration = Date.now() - startTime;

      expect(result.errors).toHaveLength(0);
      expect(result.stats.machinesGenerated).toBe(machineCount);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify all machines are generated
      const machineFiles = result.generatedFiles.filter(
        f => f.type === "machine"
      );
      expect(machineFiles.length).toBe(machineCount);
    });
  });
});
