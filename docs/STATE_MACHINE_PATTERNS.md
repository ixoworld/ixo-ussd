# State Machine Development Patterns

This document outlines the established patterns for developing state machines in the generic USSD Example App project.

## 🎯 Quick Start Checklist

When creating a new state machine, follow this checklist:

- [ ] Use `.js` extensions in all relative imports
- [ ] Handle input in `context: ({ input }) => ({ ... })` function
- [ ] Use `setup()` function with proper TypeScript types
- [ ] Create corresponding test file with `.test.ts` suffix
- [ ] Add exports to `src/machines/example/index.ts`
- [ ] Run `pnpm tsc --noEmit` and `pnpm lint` before committing
- [ ] Follow the established file naming convention

## 🏗️ Architecture Principles

### Single Responsibility

Each machine should have **one clear purpose**:

- ✅ `welcomeMachine` - Entry point and routing only
- ✅ `topupMachine` - Balance management only
- ❌ `everythingMachine` - Multiple unrelated concerns

### Clear Interfaces

Machines communicate through well-defined inputs and outputs:

```typescript
// Input: What the machine needs to start
input: {
  sessionId: string;
  phoneNumber: string;
}

// Output: What the machine provides when done
output: {
  route: "nextMachine" | "error";
  context: MachineContext;
}
```

### Type Safety First

All machines must be fully typed with zero TypeScript errors:

```bash
# This must pass before any PR
pnpm tsc --noEmit
```

## 🔧 Required Development Tools

### Pre-commit Checks

Always run these commands before committing:

```bash
# Check TypeScript compilation
pnpm tsc --noEmit

# Check and fix linting issues
pnpm lint

# Run tests
pnpm test

# Optional: Run specific machine demo
pnpm tsx src/machines/example/machineName-demo.ts
```

### VS Code Extensions

Recommended extensions for development:

- **TypeScript Importer** - Auto-adds `.js` extensions
- **ESLint** - Real-time linting
- **XState VSCode** - State machine visualization

## 📁 File Organization Standards

### Directory Structure

```
src/machines/example/
├── index.ts                    # Barrel exports
├── types.ts                    # Shared types
├── parentMachine.ts   # Main orchestrator
├── welcomeMachine.ts          # Sub-machine
├── welcomeMachine.test.ts     # Unit tests
├── welcomeMachine-demo.ts     # Interactive demo
├── guards/                    # Modular guards
│   ├── index.ts              # Guard barrel exports
│   ├── navigation.guards.ts  # Navigation logic
│   └── validation.guards.ts  # Input validation
```

### Naming Conventions

- **Machines**: `camelCaseMachine.ts` (e.g., `welcomeMachine.ts`)
- **Tests**: `machineName.test.ts`
- **Demos**: `machineName-demo.ts`
- **Guards**: `domain.guards.ts` (e.g., `validation.guards.ts`)
- **Flows**: `businessArea.flow.ts` (e.g., `topup.flow.ts`)

## 🧪 Testing Standards

### Required Test Coverage

Every machine must have tests covering:

- [ ] Initial state verification
- [ ] All state transitions
- [ ] Context updates
- [ ] Error handling and retries
- [ ] Output generation
- [ ] Back navigation

### Test Template

```typescript
import { createActor } from "xstate";
import { machineName } from "./machineName.js";

describe("Machine Name", () => {
  const mockInput = {
    sessionId: "test-session",
    phoneNumber: "+260123456789",
  };

  it("should start in correct initial state", () => {
    const actor = createActor(machineName, { input: mockInput });
    actor.start();

    expect(actor.getSnapshot().value).toBe("expectedInitialState");
  });

  // Add more tests following the pattern...
});
```

## 📋 Code Review Checklist

### For Reviewers

When reviewing state machine PRs, check:

- [ ] **TypeScript**: `pnpm tsc --noEmit` passes
- [ ] **Linting**: `pnpm lint` passes
- [ ] **Imports**: All relative imports use `.js` extensions
- [ ] **Input Handling**: Input accessed only in context function
- [ ] **Type Safety**: All functions properly typed
- [ ] **Tests**: Comprehensive test coverage
- [ ] **Documentation**: README updated if new patterns introduced
- [ ] **File Structure**: Follows established naming conventions

### For Authors

Before requesting review:

- [ ] Run all pre-commit checks
- [ ] Test the machine with demo file
- [ ] Update exports in `index.ts`
- [ ] Add JSDoc comments for complex logic
- [ ] Verify machine works in isolation
- [ ] Check integration with main orchestrator

## 🚨 Common Issues & Solutions

### Import Errors

```typescript
// ❌ Problem: Missing .js extension
import { machine } from "./machine";

// ✅ Solution: Add .js extension
import { machine } from "./machine.js";
```

### Input Access Errors

```typescript
// ❌ Problem: Accessing input in actions
actions: {
  badAction: assign({
    field: ({ input }) => input.value, // Error: input undefined
  }),
}

// ✅ Solution: Handle input in context
context: ({ input }) => ({
  field: input?.value || defaultValue,
}),
```

### Type Errors in Outputs

```typescript
// ❌ Problem: Untyped output function
output: {
  context: ({ context }) => context, // Implicit any
}

// ✅ Solution: Explicit typing
output: {
  context: ({ context }: { context: MachineContext }) => context,
}
```

## 🔄 Migration Guide

### From Old Pattern to New Pattern

If you encounter old-style machines, migrate them using this pattern:

1. **Add setup() function**:

```typescript
// Old
export const machine = createMachine({...});

// New
export const machine = setup({
  types: { context: {} as Context, events: {} as Event },
  actions: {...},
  guards: {...},
}).createMachine({...});
```

2. **Move input to context**:

```typescript
// Old
context: { field: '' },

// New
context: ({ input }) => ({ field: input?.field || '' }),
```

3. **Add proper exports**:

```typescript
export type MachineName = typeof machine;
export type { MachineContext, MachineEvent };
```

## 📞 Getting Help

### When You're Stuck

1. **Check existing machines** for similar patterns
2. **Run the demo files** to see working examples
3. **Review this documentation** for established patterns
4. **Ask in team chat** with specific error messages
5. **Check XState v5 docs** for framework-specific issues

### Updating This Guide

If you discover new patterns or solutions:

1. Update this document
2. Add examples to the README
3. Share with the team
4. Consider adding to the demo files

## 🎯 Success Metrics

A well-implemented machine should:

- ✅ Compile without TypeScript errors
- ✅ Pass all linting checks
- ✅ Have comprehensive test coverage
- ✅ Work correctly in isolation
- ✅ Integrate seamlessly with orchestrator
- ✅ Follow all established patterns
- ✅ Be easily understood by other developers

Remember: **Consistency is key!** Following these patterns ensures our codebase remains maintainable and scalable as we add more machines.

## 🎬 Demo Files - Interactive Development Tools

Demo files (`machineName-demo.ts`) are **essential development tools** that provide immediate visual feedback and serve as living documentation for state machines.

### Purpose and Benefits

**Development Benefits:**

- ⚡ **Instant Feedback** - See state transitions in real-time without full app setup
- 🐛 **Quick Debugging** - Isolate issues and test fixes immediately
- 🔄 **Rapid Iteration** - Test changes without restarting servers or UIs
- 📊 **Visual State Flow** - Understand complex state logic through console output

**Documentation Benefits:**

- 📚 **Living Examples** - Always up-to-date usage examples that can't get stale
- 🎓 **Onboarding Tool** - Help new developers understand machine behavior
- 🔍 **Code Review Aid** - Reviewers can see intended behavior quickly
- 📖 **API Documentation** - Show exactly how to interact with machines

### When to Use Demo Files

**During Development:**

```bash
# Quick feedback loop while building
pnpm tsx src/machines/example/core/welcomeMachine-demo.ts
```

**For Code Reviews:**

```bash
# Show reviewers how the machine works
pnpm tsx src/machines/example/user-services/topupMachine-demo.ts
```

**For Debugging:**

```bash
# Isolate issues without full application context
# Add temporary logging to understand state flow
```

**For Stakeholder Demos:**

```bash
# Show business stakeholders how features work
# Validate requirements with domain experts
```

### Demo File Requirements

**Every machine should demonstrate:**

- [ ] **Happy Path Flow** - Primary use case working correctly
- [ ] **Error Scenarios** - How machine handles failures and recovers
- [ ] **Edge Cases** - Boundary conditions and unusual inputs
- [ ] **Integration Points** - Outputs for machine orchestration
- [ ] **Business Logic** - Key decision points and validations

### Expected Demo Output

```
🚀 Welcome Machine Demo

==================================================
DEMO 1: Know More Selection
==================================================
📍 State: idle
📍 State: preMenu
📍 State: routeToKnowMore
🎯 Output: { route: 'knowMore', context: { selectedOption: '1' } }
✅ Know More route selected!

==================================================
DEMO 2: Error Handling & Recovery
==================================================
📍 State: walletIdEntry
💳 Wallet ID: invalid-wallet
🔐 Verified: false
❌ First attempt failed, back to wallet entry
💳 Wallet ID: valid-wallet-456
🔐 Verified: true
✅ Second attempt successful!

🎉 Demo Complete!
📊 Machine Summary:
   • Handles USSD session initiation
   • Manages wallet verification with retry
   • Routes to appropriate service machines
   • Supports error recovery patterns
```

### Integration with Workflow

**Add to package.json:**

```json
{
  "scripts": {
    "demo:welcome": "tsx src/machines/example/core/welcomeMachine-demo.ts",
    "demo:all": "npm run demo:welcome && npm run demo:topup"
  }
}
```

**Development Process:**

1. Write machine with basic structure
2. **Write demo** to test behavior visually
3. **Run demo** to verify state transitions
4. Iterate until demo shows correct behavior
5. Write unit tests based on demo scenarios
6. Use demo in code reviews to show intended behavior

Demo files are not optional - they're a critical part of our development workflow that ensures quality and maintainability!

## 🛠️ Practical Development Examples

### Example 1: Creating a Simple Information Machine

**Use Case**: Display product catalog with navigation

**Step 1: Create the machine file**
```typescript
// src/machines/example/catalog/productCatalogMachine.ts
import { setup, assign } from "xstate";
import { withNavigation } from "../utils/navigation-mixin.js";
import { NavigationPatterns } from "../utils/navigation-patterns.js";

export const productCatalogMachine = setup({
  types: {
    context: {} as {
      sessionId: string;
      phoneNumber: string;
      message: string;
      selectedCategory?: string;
    },
    events: {} as
      | { type: "INPUT"; input: string }
      | { type: "ERROR"; error: string },
  },

  actions: {
    showCatalogMenu: assign(() => ({
      message: "Product Catalog\n1. Electronics\n2. Clothing\n3. Books\n0. Back"
    })),

    showCategoryProducts: assign(({ context, event }) => ({
      selectedCategory: event.type === "INPUT" ? event.input : undefined,
      message: `Products in category ${event.input}:\n- Product A\n- Product B\n0. Back`
    })),
  },

  guards: {
    isValidCategory: ({ event }) =>
      event.type === "INPUT" && ["1", "2", "3"].includes(event.input),
  },
}).createMachine({
  initial: "catalogMenu",

  context: ({ input }) => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    message: "",
  }),

  states: {
    catalogMenu: {
      entry: "showCatalogMenu",
      on: {
        INPUT: withNavigation([
          {
            target: "showProducts",
            guard: "isValidCategory",
            actions: "showCategoryProducts"
          }
        ], NavigationPatterns.informationChild)
      }
    },

    showProducts: {
      on: {
        INPUT: withNavigation([], {
          backTarget: "catalogMenu",
          exitTarget: "routeToMain"
        })
      }
    },

    routeToMain: { type: "final" }
  }
});
```

**Step 2: Create demo file**
```typescript
// src/machines/example/catalog/productCatalogMachine-demo.ts
import { createActor } from "xstate";
import { productCatalogMachine } from "./productCatalogMachine.js";

console.log("🛍️ Product Catalog Demo\n");

const actor = createActor(productCatalogMachine, {
  input: { sessionId: "demo", phoneNumber: "+260123456789" }
});

actor.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
  console.log(`💬 Message: ${snapshot.context.message}`);
});

actor.start();
actor.send({ type: "INPUT", input: "1" }); // Select Electronics
actor.send({ type: "INPUT", input: "0" }); // Back to menu
```

**Step 3: Test and iterate**
```bash
pnpm tsx src/machines/example/catalog/productCatalogMachine-demo.ts
```

### Example 2: Creating a Data Collection Machine

**Use Case**: Collect user feedback with validation

```typescript
// src/machines/example/feedback/feedbackMachine.ts
export const feedbackMachine = setup({
  types: {
    context: {} as {
      sessionId: string;
      phoneNumber: string;
      message: string;
      rating?: string;
      comment?: string;
      nextParentState?: "FEEDBACK_COMPLETE" | "CANCELLED";
    },
    events: {} as
      | { type: "INPUT"; input: string }
      | { type: "ERROR"; error: string },
  },

  actions: {
    askForRating: assign(() => ({
      message: "Rate our service:\n1. Excellent\n2. Good\n3. Fair\n4. Poor\n0. Back"
    })),

    saveRating: assign(({ event }) => ({
      rating: event.type === "INPUT" ? event.input : undefined,
      message: "Please share your comments (max 100 chars):"
    })),

    saveComment: assign(({ event }) => ({
      comment: event.type === "INPUT" ? event.input : undefined,
      message: "Thank you for your feedback!\n1. Submit another\n0. Back to main",
      nextParentState: "FEEDBACK_COMPLETE" as const
    })),
  },

  guards: {
    isValidRating: ({ event }) =>
      event.type === "INPUT" && ["1", "2", "3", "4"].includes(event.input),
    isValidComment: ({ event }) =>
      event.type === "INPUT" && event.input.length > 0 && event.input.length <= 100,
  },
}).createMachine({
  initial: "askRating",

  output: ({ context }) => ({ result: context.nextParentState }),

  states: {
    askRating: {
      entry: "askForRating",
      on: {
        INPUT: withNavigation([
          {
            target: "askComment",
            guard: "isValidRating",
            actions: "saveRating"
          }
        ], NavigationPatterns.userServicesChild)
      }
    },

    askComment: {
      on: {
        INPUT: withNavigation([
          {
            target: "complete",
            guard: "isValidComment",
            actions: "saveComment"
          }
        ], { backTarget: "askRating", exitTarget: "routeToMain" })
      }
    },

    complete: {
      on: {
        INPUT: withNavigation([
          { target: "askRating", guard: "isInput1" }
        ], NavigationPatterns.userServicesChild)
      }
    },

    routeToMain: { type: "final" }
  }
});
```

### Example 3: Integrating with Parent Machine

**Add to parent machine:**
```typescript
// In parentMachine.ts
import { feedbackMachine } from "./feedback/feedbackMachine.js";

// Add to actors
actors: {
  feedbackMachine,
  // ... other machines
},

// Add state
feedbackService: {
  on: {
    INPUT: { actions: sendTo("feedbackChild", ({ event }) => event) },
  },
  invoke: {
    id: "feedbackChild",
    src: "feedbackMachine",
    input: ({ context }) => ({
      sessionId: context.sessionId,
      phoneNumber: context.phoneNumber,
    }),
    onDone: [
      {
        target: "preMenu",
        guard: ({ event }) => event.output?.result === "FEEDBACK_COMPLETE",
      },
      { target: "preMenu" } // Default case
    ],
  },
},
```

## 🎯 Development Best Practices

### 1. Start Simple, Add Complexity
- Begin with basic menu navigation
- Add business logic incrementally
- Test each addition with demo files

### 2. Use Consistent Patterns
- Follow existing machine structures
- Use navigation mixins for consistency
- Apply proper TypeScript typing

### 3. Test Early and Often
- Write demo files before complex logic
- Run `pnpm tsc --noEmit` frequently
- Test integration with parent machines

### 4. Document Your Decisions
- Add JSDoc comments for complex logic
- Update demo files when behavior changes
- Keep README updated with new patterns
