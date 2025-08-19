/**
 * XState v5 Machine Demo Template Generator
 *
 * This module provides templates for generating interactive demo files
 * for XState v5 machines following the established demo patterns.
 *
 * @module demo-template
 * @version 1.0.0
 */

import type {
  GeneratedMachineSpec,
  GeneratedStateSpec,
} from "../types/generator-types.js";

/**
 * Demo template configuration
 */
export interface DemoTemplateConfig {
  /** Demo style: interactive or automated */
  demoStyle: "interactive" | "automated";

  /** Whether to include visual state representation */
  includeVisuals: boolean;

  /** Whether to include performance monitoring */
  includePerformance: boolean;

  /** Custom demo utilities */
  customUtilities: string[];
}

/**
 * Default demo template configuration
 */
export const DEFAULT_DEMO_CONFIG: DemoTemplateConfig = {
  demoStyle: "interactive",
  includeVisuals: true,
  includePerformance: false,
  customUtilities: [],
};

/**
 * Demo template generator class
 */
export class DemoTemplateGenerator {
  private config: DemoTemplateConfig;

  constructor(config: Partial<DemoTemplateConfig> = {}) {
    this.config = { ...DEFAULT_DEMO_CONFIG, ...config };
  }

  /**
   * Generate complete demo file
   */
  generateDemo(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateDemoHeader(spec),
      this.generateDemoImports(spec),
      this.generateDemoSetup(spec),
      this.generateDemoScenarios(spec),
      this.generateDemoRunner(spec),
    ];

    return parts.join("\n\n");
  }

  /**
   * Generate demo file header
   */
  private generateDemoHeader(spec: GeneratedMachineSpec): string {
    return `/**
 * ${spec.name} Demo - Interactive Machine Demonstration
 *
 * Auto-generated interactive demo for ${spec.name} XState v5 machine.
 * This demo allows you to test the machine behavior interactively.
 *
 * Usage:
 *   pnpm tsx src/generators/demos/${spec.name}.generated-demo.ts
 *
 * @module ${spec.name}.demo
 * @generated true
 * @version 1.0.0
 */`;
  }

  /**
   * Generate demo imports
   */
  private generateDemoImports(spec: GeneratedMachineSpec): string {
    const imports = [
      'import { createActor } from "xstate";',
      'import * as readline from "readline";',
      `import { ${spec.id}, type Context, type Events } from "./${spec.name}.generated.js";`,
      ...this.config.customUtilities,
    ];

    if (this.config.includeVisuals) {
      imports.push('import { inspect } from "@xstate/inspect";');
    }

    return imports.join("\n");
  }

  /**
   * Generate demo setup code
   */
  private generateDemoSetup(spec: GeneratedMachineSpec): string {
    const visualSetup = this.config.includeVisuals
      ? `
// Enable XState inspection for visual debugging
inspect({
  iframe: false,
});`
      : "";

    return `${visualSetup}

/**
 * Demo configuration and setup
 */
const DEMO_CONFIG = {
  showStateTransitions: true,
  showContextChanges: true,
  showEventHistory: true,
  autoAdvance: false,
};

/**
 * Create readline interface for user interaction
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Demo state tracking
 */
let eventHistory: Events[] = [];
let stateHistory: string[] = [];

/**
 * Utility functions for demo
 */
function logState(snapshot: any) {
  console.log(\`\\n📍 Current State: \${JSON.stringify(snapshot.value)}\`);
  
  if (DEMO_CONFIG.showContextChanges) {
    console.log(\`📋 Context: \${JSON.stringify(snapshot.context, null, 2)}\`);
  }
  
  stateHistory.push(JSON.stringify(snapshot.value));
}

function logEvent(event: Events) {
  console.log(\`\\n🎯 Event: \${JSON.stringify(event)}\`);
  eventHistory.push(event);
}

function showHelp() {
  console.log(\`
📖 ${spec.name} Demo Help
========================

Available Commands:
- help: Show this help message
- state: Show current state and context
- history: Show event and state history
- events: List available events
- quit: Exit the demo

Available Events:
${this.generateEventHelp(spec)}

Example Usage:
- Type 'START' to send START event
- Type 'BACK' to send BACK event
- Type 'ERROR Test error' to send ERROR event with message
\`);
}`;
  }

  /**
   * Generate event help text
   */
  private generateEventHelp(spec: GeneratedMachineSpec): string {
    const basicEvents = [
      "- START: Start the machine",
      "- BACK: Navigate back",
      "- MAIN: Return to main menu",
      "- ERROR [message]: Send error event",
    ];

    const customEvents = spec.events.map(event => {
      const payloadDesc =
        event.payload.length > 0
          ? ` [${event.payload.map(p => p.name).join(", ")}]`
          : "";
      return `- ${event.type}${payloadDesc}: ${event.description || "Custom event"}`;
    });

    return [...basicEvents, ...customEvents].join("\n");
  }

  /**
   * Generate demo scenarios
   */
  private generateDemoScenarios(spec: GeneratedMachineSpec): string {
    const scenarios = this.generateScenarioFunctions(spec);

    return `/**
 * Demo scenarios for testing different machine paths
 */
const demoScenarios = {
${scenarios}
};

/**
 * Run a specific demo scenario
 */
async function runScenario(scenarioName: keyof typeof demoScenarios) {
  console.log(\`\\n🎬 Running scenario: \${scenarioName}\`);
  console.log("=" .repeat(50));
  
  const scenario = demoScenarios[scenarioName];
  await scenario();
  
  console.log(\`\\n✅ Scenario '\${scenarioName}' completed\`);
}`;
  }

  /**
   * Generate scenario functions
   */
  private generateScenarioFunctions(spec: GeneratedMachineSpec): string {
    const basicScenario = `  basicFlow: async () => {
    const actor = createActor(${spec.id});
    actor.start();
    
    console.log("Testing basic machine flow...");
    logState(actor.getSnapshot());
    
    // Test START event
    actor.send({ type: "START" });
    logState(actor.getSnapshot());
    
    // Test navigation
    actor.send({ type: "BACK" });
    logState(actor.getSnapshot());
    
    actor.stop();
  },`;

    const stateScenarios = spec.states
      .map(state => {
        return `  ${state.name}State: async () => {
    const actor = createActor(${spec.id});
    actor.start();
    
    console.log("Testing ${state.name} state...");
    
    // TODO: Add navigation logic to reach ${state.name} state
    // Example: actor.send({ type: "NAVIGATE_TO_${state.name.toUpperCase()}" });
    
    logState(actor.getSnapshot());
    
    ${this.generateStateScenarioEvents(state)}
    
    actor.stop();
  },`;
      })
      .join("\n\n");

    return `${basicScenario}

${stateScenarios}

  errorHandling: async () => {
    const actor = createActor(${spec.id});
    actor.start();
    
    console.log("Testing error handling...");
    
    // Test error scenarios
    actor.send({ type: "ERROR", error: "Test error message" });
    logState(actor.getSnapshot());
    
    actor.stop();
  },`;
  }

  /**
   * Generate scenario events for a specific state
   */
  private generateStateScenarioEvents(state: GeneratedStateSpec): string {
    if (state.transitions.length === 0) {
      return "// No specific events to test for this state";
    }

    return state.transitions
      .map(transition => {
        return `    // Test ${transition.event} event
    actor.send({ type: "${transition.event}" });
    logState(actor.getSnapshot());`;
      })
      .join("\n");
  }

  /**
   * Generate main demo runner
   */
  private generateDemoRunner(spec: GeneratedMachineSpec): string {
    return `/**
 * Interactive demo runner
 */
async function runInteractiveDemo() {
  console.log(\`
🚀 ${spec.name} Interactive Demo
${"=".repeat(40)}

Welcome to the interactive demo for ${spec.name}!
Type 'help' for available commands and events.
Type 'quit' to exit.
\`);

  const actor = createActor(${spec.id});
  actor.start();
  
  // Show initial state
  logState(actor.getSnapshot());
  
  // Set up state change listener
  actor.subscribe((snapshot) => {
    if (DEMO_CONFIG.showStateTransitions) {
      console.log(\`\\n🔄 State changed to: \${JSON.stringify(snapshot.value)}\`);
    }
  });

  // Interactive command loop
  const askQuestion = () => {
    rl.question("\\n> ", async (input) => {
      const command = input.trim().toLowerCase();
      
      if (command === "quit" || command === "exit") {
        console.log("\\n👋 Thanks for using the demo!");
        actor.stop();
        rl.close();
        return;
      }
      
      if (command === "help") {
        showHelp();
        askQuestion();
        return;
      }
      
      if (command === "state") {
        logState(actor.getSnapshot());
        askQuestion();
        return;
      }
      
      if (command === "history") {
        console.log("\\n📚 Event History:", eventHistory);
        console.log("📚 State History:", stateHistory);
        askQuestion();
        return;
      }
      
      if (command === "events") {
        console.log("\\n📋 Available Events:");
        showHelp();
        askQuestion();
        return;
      }
      
      if (command.startsWith("scenario ")) {
        const scenarioName = command.replace("scenario ", "");
        if (scenarioName in demoScenarios) {
          await runScenario(scenarioName as keyof typeof demoScenarios);
        } else {
          console.log(\`❌ Unknown scenario: \${scenarioName}\`);
          console.log("Available scenarios:", Object.keys(demoScenarios).join(", "));
        }
        askQuestion();
        return;
      }
      
      // Try to parse as event
      try {
        const event = parseEventInput(input);
        logEvent(event);
        actor.send(event);
        logState(actor.getSnapshot());
      } catch (error) {
        console.log(\`❌ Invalid command or event: \${input}\`);
        console.log("Type 'help' for available commands.");
      }
      
      askQuestion();
    });
  };
  
  askQuestion();
}

/**
 * Parse user input into event object
 */
function parseEventInput(input: string): Events {
  const parts = input.trim().split(" ");
  const eventType = parts[0].toUpperCase();
  
  // Handle basic events
  if (eventType === "START") return { type: "START" };
  if (eventType === "BACK") return { type: "BACK" };
  if (eventType === "MAIN") return { type: "MAIN" };
  if (eventType === "ERROR") {
    const error = parts.slice(1).join(" ") || "Demo error";
    return { type: "ERROR", error };
  }
  
  // Handle custom events
  ${this.generateCustomEventParsing(spec)}
  
  throw new Error(\`Unknown event type: \${eventType}\`);
}

/**
 * Main demo entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const scenarioName = args[0];
    if (scenarioName in demoScenarios) {
      await runScenario(scenarioName as keyof typeof demoScenarios);
    } else {
      console.log(\`❌ Unknown scenario: \${scenarioName}\`);
      console.log("Available scenarios:", Object.keys(demoScenarios).join(", "));
    }
  } else {
    await runInteractiveDemo();
  }
}

// Run the demo
main().catch(console.error);`;
  }

  /**
   * Generate custom event parsing logic
   */
  private generateCustomEventParsing(spec: GeneratedMachineSpec): string {
    if (spec.events.length === 0) {
      return "// No custom events defined";
    }

    return spec.events
      .map(event => {
        if (event.payload.length === 0) {
          return `  if (eventType === "${event.type}") return { type: "${event.type}" };`;
        } else {
          const payloadAssignment = event.payload
            .map((field, index) => {
              return `${field.name}: parts[${index + 1}] || ""`;
            })
            .join(", ");

          return `  if (eventType === "${event.type}") {
    return { type: "${event.type}", ${payloadAssignment} };
  }`;
        }
      })
      .join("\n");
  }
}

/**
 * Convenience function to generate demo code
 */
export function generateDemoCode(
  spec: GeneratedMachineSpec,
  config?: Partial<DemoTemplateConfig>
): string {
  const generator = new DemoTemplateGenerator(config);
  return generator.generateDemo(spec);
}
