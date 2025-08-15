# App State Machines

This directory contains the modular state machine architecture for a generic USSD App, built with XState v5.

## 🏗️ Architecture Overview

The system follows a **modular, hierarchical state machine pattern** where:

- **Main Orchestrator** (`appMachine.ts`) coordinates high-level flows
- **Focused Sub-machines** handle specific domains
- **Shared Components** (guards, types, flows) provide reusable logic

```
src/machines/app/
├── index.ts                           # Main barrel export
├── types.ts                           # Shared types
├── appMachine.ts                      # Main orchestrator
├── MACHINE_TEMPLATE.ts               # Developer template
│
├── information/                      # Information request machines
│   └── index.ts
│   ├── welcomeMachine.ts
│   ├── welcomeMachine.test.ts
│   └── welcomeMachine-demo.ts
│
├── information/                      # Information request machines
│   └── index.ts
│
├── account-menu/                     # Account management machines
│   └── index.ts
│
├── guards/                          # Modular guard functions
│   ├── index.ts
│   ├── navigation.guards.ts
│   ├── validation.guards.ts
│   ├── ixo.guards.ts
│   ├── app.guards.ts
│   ├── system.guards.ts
│   ├── composite.guards.ts
│   └── guardUtils.ts
│
└── shared/                          # Shared components
    └── index.ts
```

## 📋 Development Patterns

### 1. File Naming Convention

Each machine follows a consistent file structure:

```
machineName.ts           # Main machine implementation
machineName.test.ts      # Unit tests
machineName-demo.ts      # Interactive demo (optional)
```

### 2. Import Pattern

**Always use `.js` extensions** for relative imports (ES modules requirement):

```typescript
// ✅ Correct
import { welcomeMachine } from "./welcomeMachine.js";
import { navigationGuards } from "./guards/navigation.guards.js";

// ❌ Incorrect
import { welcomeMachine } from "./welcomeMachine";
```

### 3. XState v5 Machine Pattern

Use the `setup()` function for type safety and organization:

```typescript
import { setup, assign } from "xstate";

export const machineName = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
    input: {} as MachineInput,
  },
  actions: {
    actionName: assign({
      field: ({ context, event }) => newValue,
    }),
  },
  guards: {
    guardName: ({ context, event }) => boolean,
  },
}).createMachine({
  id: "machineName",
  initial: "initialState",

  context: ({ input }) => ({
    field1: input?.field1 || defaultValue,
    field2: input?.field2 || defaultValue,
  }),

  states: {
    // State definitions
  },
});
```

### 4. Input Handling Pattern

Handle machine input in the context function:

```typescript
// ✅ Correct - XState v5 pattern
context: ({ input }) => ({
  sessionId: input?.sessionId || '',
  phoneNumber: input?.phoneNumber || '',
}),

// ❌ Incorrect - Don't access input in actions
actions: {
  badAction: assign({
    sessionId: ({ input }) => input.sessionId, // input not available here
  }),
}
```

### 5. Output Pattern for Final States

Use typed outputs for machine orchestration:

```typescript
routingState: {
  type: 'final',
  output: {
    route: 'nextMachine' as const,
    context: ({ context }: { context: MachineContext }) => context,
  },
},
```

### 6. Type Safety Pattern

Export types alongside machines:

```typescript
export interface MachineContext {
  field1: string;
  field2: boolean;
}

export type MachineEvent =
  | { type: "EVENT_1" }
  | { type: "EVENT_2"; data: string };

export const machine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as MachineEvent,
  },
  // ...
});

export type Machine = typeof machine;
```

## 🧪 Testing Patterns

### Unit Test Structure

```typescript
import { createActor } from "xstate";
import { machineName } from "./machineName.js";

describe("Machine Name", () => {
  const mockInput = {
    sessionId: "test-session",
    // ... other required input
  };

  it("should start in correct initial state", () => {
    const actor = createActor(machineName, { input: mockInput });
    actor.start();

    expect(actor.getSnapshot().value).toBe("expectedState");
  });

  it("should handle transitions correctly", () => {
    const actor = createActor(machineName, { input: mockInput });
    actor.start();

    actor.send({ type: "EVENT_NAME" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("nextState");
    expect(snapshot.context.field).toBe("expectedValue");
  });
});
```

### Demo Files - Interactive Development Tools

Demo files (`machineName-demo.ts`) are **essential development tools** that serve multiple purposes:

**🎯 Purpose:**

- **Development & Debugging** - Visual state flow and real-time feedback
- **Documentation** - Living examples of machine behavior
- **Manual Testing** - Verify flows without full application setup
- **Onboarding** - Help new developers understand machines

**🚀 How to Run:**

```bash
# Run any demo file
pnpm tsx src/machines/app/information/knowMoreMachine-demo.ts

# Add to package.json for convenience
"demo:knowmore": "tsx src/machines/app/information/knowMoreMachine-demo.ts"
```

**📋 Demo File Structure:**

```typescript
/* eslint-disable no-console */
import { createActor } from "xstate";
import { machineName } from "./machineName.js";

/**
 * Machine Name Demo
 *
 * Demonstrates:
 * - Key functionality 1
 * - Key functionality 2
 * - Error scenarios
 */

console.log("🚀 Machine Name Demo\n");

const mockInput = {
  sessionId: "demo-session-123",
  phoneNumber: "+260123456789",
  // ... realistic test data
};

// Demo 1: Happy Path
console.log("=".repeat(50));
console.log("DEMO 1: Happy Path Flow");
console.log("=".repeat(50));

const actor1 = createActor(machineName, { input: mockInput });
actor1.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);

  // Log business-relevant context
  if (snapshot.context.importantField) {
    console.log(`📊 Field: ${snapshot.context.importantField}`);
  }

  // Log outputs for orchestration
  if (snapshot.output) {
    console.log(`🎯 Output:`, snapshot.output);
  }
});

actor1.start();
actor1.send({ type: "START_EVENT" });
actor1.send({ type: "NEXT_EVENT" });

console.log("✅ Happy path completed!\n");

// Demo 2: Error Scenario
console.log("=".repeat(50));
console.log("DEMO 2: Error Handling");
console.log("=".repeat(50));

const actor2 = createActor(machineName, { input: mockInput });
actor2.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
});

actor2.start();
actor2.send({ type: "ERROR_EVENT" });
// ... demonstrate error recovery

console.log("✅ Error handling demonstrated!\n");

console.log("🎉 Demo Complete!");
console.log("\n📊 Machine Summary:");
console.log("   • Key capability 1");
console.log("   • Key capability 2");
console.log("   • Error handling patterns");
```

**🔧 When to Use Demo Files:**

- **During Development** - Quick feedback loop while building
- **For Code Reviews** - Reviewers can see intended behavior
- **For Debugging** - Isolate and identify issues quickly
- **For Documentation** - Show new team members how machines work
- **For Manual Testing** - Verify flows before integration

**✅ Demo File Best Practices:**

- Cover all major flows (happy path, errors, edge cases)
- Use descriptive logging with emojis for clarity
- Include realistic test data
- Add summary information about machine capabilities
- Demonstrate all outputs for orchestration

## 🛡️ Guard Patterns

### Modular Guard Organization

Guards are organized by domain in the `guards/` directory:

```typescript
// guards/navigation.guards.ts
export const isBack = ({ event }) => event.type === "BACK";
export const isMenuSelection = ({ event }) => /^SELECT_\d+$/.test(event.type);

// guards/validation.guards.ts
export const isValidPin = ({ context }) => /^\d{5}$/.test(context.pin);
export const isValidAmount = ({ context }) => context.amount > 0;

// guards/composite.guards.ts
import { and, or, not } from "xstate";
export const canProceed = and(["isValidPin", "hasBalance"]);
```

### Guard Usage in Machines

```typescript
import { navigationGuards } from "./guards/navigation.guards.js";
import { validationGuards } from "./guards/validation.guards.js";

export const machine = setup({
  guards: {
    ...navigationGuards,
    ...validationGuards,
    // Machine-specific guards
    customGuard: ({ context }) => context.customField === "value",
  },
}).createMachine({
  // Use guards in transitions
  states: {
    someState: {
      on: {
        EVENT: {
          guard: "isValidPin",
          target: "nextState",
        },
      },
    },
  },
});
```

## 🔄 Flow Integration

### Flow File Pattern

```typescript
// flows/businessLogic.flow.ts
import { assign } from "xstate";

export const businessLogicActions = {
  processData: assign({
    result: ({ context, event }) => processBusinessLogic(context, event),
  }),
};

export const businessLogicGuards = {
  canProcess: ({ context }) => context.readyForProcessing,
};
```

## 📦 Export Patterns

### Barrel Exports (index.ts)

```typescript
// Main machine exports
export { appMachine } from "./appMachine.js";

// Sub-machine exports
export { knowMoreMachine } from "./information/knowMoreMachine.js";

// Types
export type {
  AppMachine,
  AppMachineContext,
  AppMachineEvent,
} from "./appMachine.js";

// Shared exports
export * from "./guards/index.js";
```

## ⚡ Performance Patterns

### Lazy Loading

```typescript
// For heavy machines, use dynamic imports
states: {
  complexFlow: {
    invoke: {
      src: () => import('./complexMachine.js').then(m => m.complexMachine),
    },
  },
}
```

## 🚨 Common Pitfalls

### ❌ Don't Do This

```typescript
// Missing .js extension
import { machine } from './machine';

// Accessing input in actions
actions: {
  badAction: assign({
    field: ({ input }) => input.value, // input not available
  }),
}

// Untyped output functions
output: {
  context: ({ context }) => context, // Missing type annotation
}
```

### ✅ Do This Instead

```typescript
// Correct import
import { machine } from './machine.js';

// Handle input in context
context: ({ input }) => ({
  field: input?.value || defaultValue,
}),

// Typed output functions
output: {
  context: ({ context }: { context: MachineContext }) => context,
}
```

## 🔧 Development Workflow

1. **Before starting new machines:**

   ```bash
   pnpm tsc --noEmit  # Check for TypeScript errors
   pnpm lint          # Check for linting issues
   ```

2. **Create machine files following the pattern:**
   - `machineName.ts` (implementation)
   - `machineName.test.ts` (tests)
   - `machineName-demo.ts` (demo, optional)

3. **Update exports in `index.ts`**

4. **Run tests and demos to verify functionality**

5. **Update this README if new patterns emerge**

## 📚 Resources

- [XState v5 Documentation](https://stately.ai/docs/)
- [TypeScript with XState](https://stately.ai/docs/typescript)
- [Testing XState Machines](https://stately.ai/docs/testing)
