/**
 * Code Generator - Orchestrates the complete code generation process
 *
 * This module coordinates the entire code generation pipeline from Mermaid
 * parsing to final file output, integrating all generator components.
 *
 * @module code-generator
 * @version 1.0.0
 */

import { MermaidParser } from "./mermaid-parser.js";
import { MachineGenerator } from "./machine-generator.js";
import { MachineTemplateGenerator } from "./templates/machine-template.js";
import { TestTemplateGenerator } from "./templates/test-template.js";
import { DemoTemplateGenerator } from "./templates/demo-template.js";
import { TransitionTestTemplateGenerator } from "./templates/transition-test-template.js";
import { ErrorTestTemplateGenerator } from "./templates/error-test-template.js";
import { ServiceTemplateGenerator } from "./templates/service-template.js";
import { DirectoryManager, FileWriter } from "./utils/file-utils.js";
import type {
  GeneratorConfig,
  GenerationResult,
  GeneratedFile,
  GeneratedMachineSpec,
  ParseError,
  ParseWarning,
} from "./types/generator-types.js";

/**
 * Complete code generation configuration
 */
export interface CodeGeneratorConfig extends GeneratorConfig {
  /** Template configuration */
  templates: {
    machine: {
      variant: "standard" | "minimal" | "comprehensive";
      strictMode: boolean;
      customImports: string[];
    };
    tests: {
      style: "smoke" | "comprehensive";
      includeIntegration: boolean;
      includePerformance: boolean;
      includeTransitionTests: boolean;
      includeErrorTests: boolean;
    };
    demos: {
      style: "interactive" | "automated";
      includeVisuals: boolean;
      includePerformance: boolean;
    };
    services: {
      generate: boolean;
      variant: "basic" | "comprehensive" | "minimal";
      includeErrorHandling: boolean;
      includeValidation: boolean;
    };
  };

  /** File naming configuration */
  naming: {
    machinePrefix: string;
    machineSuffix: string;
    testSuffix: string;
    demoSuffix: string;
  };

  /** Output organization */
  organization: {
    groupByCategory: boolean;
    createIndexFiles: boolean;
    generateReadme: boolean;
  };
}

/**
 * Default code generator configuration
 */
export const DEFAULT_CODE_GENERATOR_CONFIG: CodeGeneratorConfig = {
  sourcePath: "docs/requirements/USSD-menu-mermaid.md",
  outputDir: "src/machines/generated",
  generateDemos: true,
  generateTests: true,
  overwrite: false,
  verbose: true,
  dryRun: false,
  templates: {
    machine: {
      variant: "standard",
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
      generate: true,
      variant: "basic",
      includeErrorHandling: true,
      includeValidation: true,
    },
  },
  naming: {
    machinePrefix: "",
    machineSuffix: "Machine",
    testSuffix: ".generated.test",
    demoSuffix: ".generated-demo",
  },
  organization: {
    groupByCategory: true,
    createIndexFiles: true,
    generateReadme: true,
  },
};

/**
 * Main code generator orchestrator
 */
export class CodeGenerator {
  private config: CodeGeneratorConfig;
  private parser: MermaidParser;
  private machineGenerator: MachineGenerator;
  private templateGenerator: MachineTemplateGenerator;
  private testGenerator: TestTemplateGenerator;
  private demoGenerator: DemoTemplateGenerator;
  private transitionTestGenerator: TransitionTestTemplateGenerator;
  private errorTestGenerator: ErrorTestTemplateGenerator;
  private serviceGenerator: ServiceTemplateGenerator;

  constructor(config: Partial<CodeGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CODE_GENERATOR_CONFIG, ...config };

    // Initialize generators
    this.parser = new MermaidParser();
    this.machineGenerator = new MachineGenerator();
    this.templateGenerator = new MachineTemplateGenerator({
      variant: this.config.templates.machine.variant,
      strictMode: this.config.templates.machine.strictMode,
      customImports: this.config.templates.machine.customImports,
    });
    this.testGenerator = new TestTemplateGenerator({
      testStyle: this.config.templates.tests.style,
      includeIntegration: this.config.templates.tests.includeIntegration,
      includePerformance: this.config.templates.tests.includePerformance,
    });
    this.demoGenerator = new DemoTemplateGenerator({
      demoStyle: this.config.templates.demos.style,
      includeVisuals: this.config.templates.demos.includeVisuals,
      includePerformance: this.config.templates.demos.includePerformance,
    });
    this.transitionTestGenerator = new TransitionTestTemplateGenerator({
      includePathCoverage: true,
      includeTransitionValidation: true,
      includeStateInvariants: true,
      maxPathDepth: 5,
    });
    this.errorTestGenerator = new ErrorTestTemplateGenerator({
      includeBoundaryTests: true,
      includeMalformedInputTests: true,
      includeConcurrencyTests: false,
      includeResourceTests: false,
    });
    this.serviceGenerator = new ServiceTemplateGenerator({
      variant: this.config.templates.services.variant,
      includeErrorHandling: this.config.templates.services.includeErrorHandling,
      includeValidation: this.config.templates.services.includeValidation,
      includeLogging: true,
      includeCaching: false,
    });
  }

  /**
   * Generate all machine files from Mermaid source
   */
  async generateFromMermaid(sourcePath?: string): Promise<GenerationResult> {
    const startTime = Date.now();
    const source = sourcePath || this.config.sourcePath;

    this.log(`🚀 Starting code generation from ${source}`);

    try {
      // Step 1: Parse Mermaid diagram
      this.log("📖 Parsing Mermaid diagram...");
      const parseResult = await this.parser.parseMermaidFile(source);

      if (parseResult.errors.length > 0) {
        this.logErrors("Parsing errors:", parseResult.errors);
      }

      if (parseResult.warnings.length > 0) {
        this.logWarnings("Parsing warnings:", parseResult.warnings);
      }

      if (parseResult.machines.length === 0) {
        return this.createEmptyResult(
          "No machines found in Mermaid diagram",
          parseResult.errors
        );
      }

      this.log(
        `✅ Found ${parseResult.machines.length} machine(s) to generate`
      );

      // Step 2: Generate machine specifications
      this.log("🔧 Converting to machine specifications...");
      const machineSpecs = parseResult.machines.map(machine =>
        this.machineGenerator.generateMachineSpec(machine)
      );

      // Step 3: Generate code files
      this.log("📝 Generating code files...");
      const generatedFiles = this.generateAllFiles(machineSpecs);

      // Step 4: Write files to disk
      if (!this.config.dryRun) {
        this.log("💾 Writing files to disk...");
        await this.writeFiles(generatedFiles);
      } else {
        this.log("🔍 Dry run - files not written to disk");
      }

      // Step 5: Generate organization files
      if (this.config.organization.createIndexFiles) {
        this.log("📋 Generating index files...");
        const indexFiles = this.generateIndexFiles(machineSpecs);
        generatedFiles.push(...indexFiles);

        if (!this.config.dryRun) {
          await this.writeFiles(indexFiles);
        }
      }

      const duration = Date.now() - startTime;
      this.log(`🎉 Code generation completed in ${duration}ms`);

      return {
        generatedFiles,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        stats: {
          machinesGenerated: machineSpecs.length,
          filesCreated: generatedFiles.length,
          linesOfCode: this.calculateTotalLines(generatedFiles),
          duration,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(`❌ Code generation failed: ${errorMessage}`);

      return {
        generatedFiles: [],
        errors: [{ message: errorMessage, severity: "error" }],
        warnings: [],
        stats: {
          machinesGenerated: 0,
          filesCreated: 0,
          linesOfCode: 0,
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate all file types for machine specifications
   */
  private generateAllFiles(specs: GeneratedMachineSpec[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    for (const spec of specs) {
      // Generate machine file
      const machineFile = this.generateMachineFile(spec);
      files.push(machineFile);

      // Generate test files
      if (this.config.generateTests) {
        const testFile = this.generateTestFile(spec);
        files.push(testFile);

        // Generate additional test files
        if (this.config.templates.tests.includeTransitionTests) {
          const transitionTestFile = this.generateTransitionTestFile(spec);
          files.push(transitionTestFile);
        }

        if (this.config.templates.tests.includeErrorTests) {
          const errorTestFile = this.generateErrorTestFile(spec);
          files.push(errorTestFile);
        }
      }

      // Generate demo file
      if (this.config.generateDemos) {
        const demoFile = this.generateDemoFile(spec);
        files.push(demoFile);
      }

      // Generate service file
      if (this.config.templates.services.generate) {
        const serviceFile = this.generateServiceFile(spec);
        files.push(serviceFile);
      }
    }

    return files;
  }

  /**
   * Generate machine file
   */
  private generateMachineFile(spec: GeneratedMachineSpec): GeneratedFile {
    const content = this.templateGenerator.generateMachine(spec);
    const fileName = this.getMachineFileName(spec);
    const filePath = this.getOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "machine",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate test file
   */
  private generateTestFile(spec: GeneratedMachineSpec): GeneratedFile {
    const content = this.testGenerator.generateTestSuite(spec);
    const fileName = this.getTestFileName(spec);
    const filePath = this.getOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "test",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate demo file
   */
  private generateDemoFile(spec: GeneratedMachineSpec): GeneratedFile {
    const content = this.demoGenerator.generateDemo(spec);
    const fileName = this.getDemoFileName(spec);
    const filePath = this.getOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "demo",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate transition test file
   */
  private generateTransitionTestFile(
    spec: GeneratedMachineSpec
  ): GeneratedFile {
    const content = this.transitionTestGenerator.generateTransitionTests(spec);
    const fileName = this.getTransitionTestFileName(spec);
    const filePath = this.getOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "test",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate error test file
   */
  private generateErrorTestFile(spec: GeneratedMachineSpec): GeneratedFile {
    const content = this.errorTestGenerator.generateErrorTests(spec);
    const fileName = this.getErrorTestFileName(spec);
    const filePath = this.getOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "test",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate service file
   */
  private generateServiceFile(spec: GeneratedMachineSpec): GeneratedFile {
    const content = this.serviceGenerator.generateService(spec);
    const fileName = this.getServiceFileName(spec);
    const filePath = this.getServiceOutputPath(spec, fileName);

    return {
      path: filePath,
      type: "service",
      content,
      overwritten: false,
      size: content.length,
    };
  }

  /**
   * Generate index files for organization
   */
  private generateIndexFiles(specs: GeneratedMachineSpec[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (this.config.organization.groupByCategory) {
      // Group by category and create index files
      const categories = new Set(specs.map(s => s.category));

      categories.forEach(category => {
        const categorySpecs = specs.filter(s => s.category === category);
        const indexContent = this.generateCategoryIndex(
          category,
          categorySpecs
        );

        files.push({
          path: this.getCategoryIndexPath(category),
          type: "service",
          content: indexContent,
          overwritten: false,
          size: indexContent.length,
        });
      });
    }

    // Generate main index file
    const mainIndexContent = this.generateMainIndex(specs);
    files.push({
      path: `${this.config.outputDir}/index.ts`,
      type: "service",
      content: mainIndexContent,
      overwritten: false,
      size: mainIndexContent.length,
    });

    return files;
  }

  /**
   * Generate category index file content
   */
  private generateCategoryIndex(
    category: string,
    specs: GeneratedMachineSpec[]
  ): string {
    const exports = specs
      .map(
        spec =>
          `export { default as ${spec.id} } from "./${spec.name}.generated.js";`
      )
      .join("\n");

    return `/**
 * ${category} Machines - Auto-generated index
 *
 * This file exports all ${category} machines.
 *
 * @generated true
 */

${exports}

// Export types
${specs
  .map(
    spec =>
      `export type { Context as ${spec.id}Context, Events as ${spec.id}Events } from "./${spec.name}.generated.js";`
  )
  .join("\n")}`;
  }

  /**
   * Generate main index file content
   */
  private generateMainIndex(specs: GeneratedMachineSpec[]): string {
    const categoryGroups = new Map<string, GeneratedMachineSpec[]>();

    specs.forEach(spec => {
      if (!categoryGroups.has(spec.category)) {
        categoryGroups.set(spec.category, []);
      }
      categoryGroups.get(spec.category)!.push(spec);
    });

    const categoryExports = Array.from(categoryGroups.entries())
      .map(([category]) => {
        const categoryPath = DirectoryManager.getMachineCategoryPath(
          "",
          category
        )
          .split("/")
          .pop();
        return `export * from "./${categoryPath}/index.js";`;
      })
      .join("\n");

    return `/**
 * Generated Machines - Auto-generated main index
 * 
 * This file exports all generated machines organized by category.
 * 
 * @generated true
 */

${categoryExports}`;
  }

  /**
   * Write files to disk
   */
  private async writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const result = FileWriter.writeGeneratedFile(file.path, file.content, {
        overwrite: this.config.overwrite,
        backup: true,
      });

      if (!result.success) {
        throw new Error(`Failed to write file ${file.path}: ${result.message}`);
      }

      file.overwritten = !result.success;
      this.log(`📄 Generated: ${file.path}`);
    }
  }

  /**
   * Get machine file name
   */
  private getMachineFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}.generated.ts`;
  }

  /**
   * Get test file name
   */
  private getTestFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}${this.config.naming.testSuffix}.ts`;
  }

  /**
   * Get demo file name
   */
  private getDemoFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}${this.config.naming.demoSuffix}.ts`;
  }

  /**
   * Get transition test file name
   */
  private getTransitionTestFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}.transitions.test.ts`;
  }

  /**
   * Get error test file name
   */
  private getErrorTestFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}.errors.test.ts`;
  }

  /**
   * Get service file name
   */
  private getServiceFileName(spec: GeneratedMachineSpec): string {
    return `${this.config.naming.machinePrefix}${spec.name}${this.config.naming.machineSuffix}.service.ts`;
  }

  /**
   * Get output path for a file
   */
  private getOutputPath(spec: GeneratedMachineSpec, fileName: string): string {
    if (this.config.organization.groupByCategory) {
      const categoryPath = DirectoryManager.getMachineCategoryPath(
        this.config.outputDir,
        spec.category
      );
      return `${categoryPath}/${fileName}`;
    }

    return `${this.config.outputDir}/${fileName}`;
  }

  /**
   * Get service output path (services go in src/services/)
   */
  private getServiceOutputPath(
    spec: GeneratedMachineSpec,
    fileName: string
  ): string {
    const serviceDir = "src/services";

    if (this.config.organization.groupByCategory) {
      return `${serviceDir}/${spec.category}/${fileName}`;
    }

    return `${serviceDir}/${fileName}`;
  }

  /**
   * Get category index file path
   */
  private getCategoryIndexPath(category: string): string {
    const categoryPath = DirectoryManager.getMachineCategoryPath(
      this.config.outputDir,
      category
    );
    return `${categoryPath}/index.ts`;
  }

  /**
   * Calculate total lines of code
   */
  private calculateTotalLines(files: GeneratedFile[]): number {
    return files.reduce(
      (total, file) => total + file.content.split("\n").length,
      0
    );
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(
    message: string,
    errors: ParseError[] = []
  ): GenerationResult {
    return {
      generatedFiles: [],
      errors: [{ message, severity: "error" }, ...errors],
      warnings: [],
      stats: {
        machinesGenerated: 0,
        filesCreated: 0,
        linesOfCode: 0,
        duration: 0,
      },
    };
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      // eslint-disable-next-line no-console
      console.log(message);
    }
  }

  /**
   * Log errors
   */
  private logErrors(title: string, errors: ParseError[]): void {
    if (this.config.verbose && errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`❌ ${title}`);
      errors.forEach(error => {
        const location = error.line ? ` (line ${error.line})` : "";
        // eslint-disable-next-line no-console
        console.error(`  - ${error.message}${location}`);
        if (error.suggestion) {
          // eslint-disable-next-line no-console
          console.error(`    💡 ${error.suggestion}`);
        }
      });
    }
  }

  /**
   * Log warnings
   */
  private logWarnings(title: string, warnings: ParseWarning[]): void {
    if (this.config.verbose && warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️  ${title}`);
      warnings.forEach(warning => {
        const location = warning.line ? ` (line ${warning.line})` : "";
        // eslint-disable-next-line no-console
        console.warn(`  - ${warning.message}${location}`);
        if (warning.suggestion) {
          // eslint-disable-next-line no-console
          console.warn(`    💡 ${warning.suggestion}`);
        }
      });
    }
  }
}

/**
 * Convenience function for code generation
 */
export async function generateCode(
  config?: Partial<CodeGeneratorConfig>
): Promise<GenerationResult> {
  const generator = new CodeGenerator(config);
  return generator.generateFromMermaid();
}
