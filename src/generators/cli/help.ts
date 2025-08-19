/* eslint-disable no-console */

/**
 * CLI Help Documentation
 *
 * This module provides comprehensive help documentation and usage examples
 * for all CLI commands in the code generation system.
 *
 * @module help
 * @version 1.0.0
 */

/**
 * Machine generation help content
 */
export const MACHINE_GENERATION_HELP = `
🚀 Machine Generation Command

DESCRIPTION:
  Generate XState v5 machines from Mermaid diagrams with comprehensive
  TypeScript support, test suites, and service integrations.

USAGE:
  pnpm generate:machines [options]
  node src/generators/cli/generate-machines.js [options]

OPTIONS:
  -s, --source <path>        Path to Mermaid source file
                             (default: docs/requirements/USSD-menu-mermaid.md)
  
  -o, --output <path>        Output directory for generated files
                             (default: src/machines/generated)
  
  -c, --category <category>  Filter by machine category:
                             • user-machine    - User interaction flows
                             • agent-machine   - Agent workflow processes
                             • account-machine - Account management operations
                             • info-machine    - Information display flows
                             • core-machine    - Core system routing
  
  -v, --variant <variant>    Machine template variant:
                             • standard        - Balanced functionality (default)
                             • minimal         - Lightweight implementation
                             • comprehensive   - Full-featured with all options
  
  --no-tests                 Skip test file generation
  --no-demos                 Skip demo file generation
  --no-services              Skip service file generation
  --no-incremental           Disable incremental updates (force full regeneration)
  
  --overwrite                Overwrite existing files without prompting
  --dry-run                  Show what would be generated without writing files
  --verbose                  Enable detailed logging and progress reporting
  --watch                    Watch source file for changes and auto-regenerate

EXAMPLES:
  # Basic generation with default settings
  pnpm generate:machines
  
  # Generate from custom source with verbose output
  pnpm generate:machines --source docs/my-flows.md --verbose
  
  # Generate only user machines with comprehensive variant
  pnpm generate:machines --category user-machine --variant comprehensive
  
  # Generate without tests and demos (machines only)
  pnpm generate:machines --no-tests --no-demos
  
  # Dry run to preview what would be generated
  pnpm generate:machines --dry-run --verbose
  
  # Watch mode for development
  pnpm generate:machines --watch --verbose
  
  # Force full regeneration (ignore incremental updates)
  pnpm generate:machines --no-incremental --overwrite

OUTPUT STRUCTURE:
  src/machines/generated/
  ├── user-machine/
  │   ├── UserFlowMachine.generated.ts      # Main machine
  │   ├── UserFlowMachine.generated.test.ts # Basic tests
  │   ├── UserFlowMachine.transitions.test.ts # Transition tests
  │   ├── UserFlowMachine.errors.test.ts    # Error handling tests
  │   ├── UserFlowMachine.generated-demo.ts # Interactive demo
  │   └── index.ts                          # Category exports
  ├── agent-machine/
  │   └── ...
  └── index.ts                              # Main exports
  
  src/services/
  ├── user-machine/
  │   └── UserFlowMachine.service.ts        # Service integration
  └── ...

INCREMENTAL UPDATES:
  The generator tracks file changes and only regenerates machines when:
  • Source Mermaid file has been modified
  • Generated files are missing or corrupted
  • Template configuration has changed
  
  Use --no-incremental to force full regeneration.

INTEGRATION:
  Generated files integrate seamlessly with the existing build system:
  • TypeScript compilation via tsconfig.json
  • ESLint and Prettier formatting
  • Vitest test execution
  • Import/export compatibility with existing code
`;

/**
 * Test generation help content
 */
export const TEST_GENERATION_HELP = `
🧪 Test Generation Command

DESCRIPTION:
  Generate comprehensive test suites for existing XState v5 machines
  with support for incremental updates and various testing strategies.

USAGE:
  pnpm generate:tests [options]
  node src/generators/cli/generate-tests.js [options]

OPTIONS:
  -s, --source <path>        Path to Mermaid source file (for full regeneration)
  
  -m, --machines-dir <path>  Directory containing machine files to test
                             (default: src/machines)
  
  -o, --output <path>        Output directory for test files
                             (default: src/machines/generated)
  
  --style <style>            Test generation style:
                             • smoke          - Basic functionality tests (default)
                             • comprehensive  - Full test coverage with edge cases
  
  --no-transition            Skip transition test generation
  --no-error                 Skip error handling test generation
  --include-integration      Include integration tests with external services
  --no-incremental           Disable incremental updates (regenerate all tests)
  
  -p, --pattern <pattern>    Only process machines matching this pattern
  
  --overwrite                Overwrite existing test files
  --dry-run                  Show what would be generated without writing files
  --verbose                  Enable detailed logging and progress reporting
  --watch                    Watch machine files for changes and auto-regenerate

EXAMPLES:
  # Generate tests for all machines
  pnpm generate:tests
  
  # Generate comprehensive tests with integration
  pnpm generate:tests --style comprehensive --include-integration
  
  # Generate tests for specific machines
  pnpm generate:tests --pattern "user" --verbose
  
  # Full regeneration from source
  pnpm generate:tests --source docs/flows.md --no-incremental
  
  # Watch mode for development
  pnpm generate:tests --watch --verbose
  
  # Generate only transition tests
  pnpm generate:tests --no-error --style comprehensive

TEST TYPES GENERATED:
  1. Smoke Tests (.generated.test.ts)
     • Machine creation and startup
     • Initial state verification
     • Basic event handling
     • Context management
  
  2. Transition Tests (.transitions.test.ts)
     • State-specific transition testing
     • Path coverage analysis
     • Guard and action validation
     • Navigation flow verification
  
  3. Error Tests (.errors.test.ts)
     • Invalid input handling
     • Boundary value testing
     • Edge case scenarios
     • Error recovery flows
  
  4. Integration Tests (when enabled)
     • Service integration testing
     • External API mocking
     • End-to-end flow validation

INCREMENTAL UPDATES:
  Tests are regenerated when:
  • Machine files have been modified
  • Test files are missing
  • Test configuration has changed
  
  Use --no-incremental to force regeneration of all tests.
`;

/**
 * General CLI help content
 */
export const GENERAL_CLI_HELP = `
🛠️  Code Generation CLI

DESCRIPTION:
  Comprehensive code generation system for XState v5 machines from Mermaid diagrams.
  Supports machine generation, test creation, and service integration.

AVAILABLE COMMANDS:
  generate:machines    Generate XState v5 machines from Mermaid diagrams
  generate:tests       Generate comprehensive test suites for machines
  generate:help        Show this help information

QUICK START:
  1. Create or update your Mermaid diagram in docs/requirements/
  2. Run: pnpm generate:machines
  3. Run: pnpm generate:tests
  4. Run: pnpm test to verify generated code

WORKFLOW INTEGRATION:
  # Development workflow
  pnpm generate:machines --watch &    # Auto-generate on changes
  pnpm generate:tests --watch &       # Auto-generate tests
  pnpm test:watch                     # Auto-run tests
  
  # Pre-commit workflow
  pnpm generate:machines --dry-run    # Verify generation
  pnpm generate:tests --dry-run       # Verify test generation
  pnpm lint                           # Check code quality
  pnpm test                           # Run all tests

CONFIGURATION:
  Generation behavior can be customized through:
  • Command-line options (see individual command help)
  • Template variants (standard, minimal, comprehensive)
  • Incremental update settings
  • Output organization options

FILE ORGANIZATION:
  src/
  ├── machines/
  │   ├── generated/           # Auto-generated machines
  │   └── custom/              # Hand-written machines
  ├── services/                # Service integrations
  └── test/                    # Test utilities

BEST PRACTICES:
  • Use --dry-run to preview changes before generation
  • Enable --verbose for detailed progress information
  • Use incremental updates for faster development cycles
  • Generate comprehensive tests for production code
  • Use watch mode during active development

TROUBLESHOOTING:
  • Use --verbose for detailed error information
  • Check Mermaid syntax if parsing fails
  • Use --no-incremental to force full regeneration
  • Verify file permissions for output directories

For detailed help on specific commands:
  pnpm generate:machines --help
  pnpm generate:tests --help
`;

/**
 * Display help for a specific command
 */
export function displayHelp(command?: string): void {
  switch (command) {
    case "machines":
    case "generate:machines":
      console.log(MACHINE_GENERATION_HELP);
      break;

    case "tests":
    case "generate:tests":
      console.log(TEST_GENERATION_HELP);
      break;

    default:
      console.log(GENERAL_CLI_HELP);
      break;
  }
}

/**
 * Display usage examples
 */
export function displayExamples(): void {
  console.log(`
🎯 Common Usage Examples

BASIC WORKFLOWS:
  # Generate everything from scratch
  pnpm generate:machines && pnpm generate:tests
  
  # Development with auto-regeneration
  pnpm generate:machines --watch --verbose
  
  # Preview changes before committing
  pnpm generate:machines --dry-run --verbose

SPECIFIC USE CASES:
  # Generate only user interaction machines
  pnpm generate:machines --category user-machine
  
  # Generate comprehensive tests for production
  pnpm generate:tests --style comprehensive --include-integration
  
  # Update tests for specific machines
  pnpm generate:tests --pattern "payment" --verbose

TROUBLESHOOTING:
  # Force complete regeneration
  pnpm generate:machines --no-incremental --overwrite
  
  # Debug generation issues
  pnpm generate:machines --dry-run --verbose
  
  # Clean and regenerate everything
  rm -rf src/machines/generated && pnpm generate:machines

INTEGRATION WITH BUILD SYSTEM:
  # Pre-commit checks
  pnpm generate:machines --dry-run && pnpm lint && pnpm test
  
  # CI/CD pipeline
  pnpm generate:machines --no-incremental && pnpm build && pnpm test
`);
}

/**
 * Display version information
 */
export function displayVersion(): void {
  console.log(`
📦 Code Generation CLI v1.0.0

Components:
  • Mermaid Parser      v1.0.0
  • Machine Generator   v1.0.0
  • Test Generator      v1.0.0
  • Service Generator   v1.0.0
  • CLI Interface       v1.0.0

Dependencies:
  • XState             v5.x
  • TypeScript         v5.x
  • Vitest             v3.x
  • Commander          v14.x
`);
}

/**
 * Main help CLI entry point
 */
export function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes("--version") || args.includes("-V")) {
    displayVersion();
  } else if (args.includes("--examples")) {
    displayExamples();
  } else {
    displayHelp(command);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
