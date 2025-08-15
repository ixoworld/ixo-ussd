# Demo Files Guide - Interactive State Machine Development

Demo files are essential development tools in the generic USSD Example App that provide immediate visual feedback, serve as living documentation, and bridge the gap between unit tests and full application testing.

## 🎯 What Are Demo Files?

Demo files (`machineName-demo.ts`) are executable TypeScript files that:

- Create actors from state machines
- Send events to demonstrate flows
- Log state transitions and context changes
- Show outputs for machine orchestration
- Provide immediate visual feedback

## 🚀 Why Demo Files Matter

### Development Benefits

- ⚡ **Instant Feedback** - See state transitions in real-time without starting the full application
- 🐛 **Quick Debugging** - Isolate issues and test fixes immediately
- 🔄 **Rapid Iteration** - Test changes without restarting servers or UIs
- 📊 **Visual State Flow** - Understand complex state logic through console output

### Documentation Benefits

- 📚 **Living Examples** - Always up-to-date usage examples that can't get stale
- 🎓 **Onboarding Tool** - Help new developers understand machine behavior quickly
- 🔍 **Code Review Aid** - Reviewers can see intended behavior without reading code
- 📖 **API Documentation** - Show exactly how to interact with machines

### Quality Assurance Benefits

- ✅ **Manual Testing** - Verify flows work before integration
- 🔍 **Regression Testing** - Quick verification that changes don't break existing flows
- 🎭 **Stakeholder Demos** - Show business stakeholders how features work
- ✨ **Requirements Validation** - Validate business logic with domain experts

## 🏃‍♂️ How to Run Demo Files

### Basic Usage

```bash
# Run any demo file directly
pnpm tsx src/machines/example/core/welcomeMachine-demo.ts

# Run with Node.js directly
node --loader tsx src/machines/example/core/welcomeMachine-demo.ts
```

### Add to Package.json Scripts

```json
{
  "scripts": {
    "demo:welcome": "tsx src/machines/example/core/welcomeMachine-demo.ts",
    "demo:topup": "tsx src/machines/example/user-services/topupMachine-demo.ts",
    "demo:purchase": "tsx src/machines/example/user-services/purchaseMachine-demo.ts",
    "demo:all": "npm run demo:welcome && npm run demo:topup && npm run demo:purchase"
  }
}
```

### Integration with Development Workflow

```bash
# 1. During development - quick feedback loop
pnpm demo:welcome

# 2. Before code review - verify behavior
pnpm demo:all

# 3. After changes - regression testing
pnpm demo:topup

# 4. For debugging - isolate issues
pnpm tsx src/machines/example/core/welcomeMachine-demo.ts
```

## 📋 Demo File Structure Template

```typescript
/* eslint-disable no-console */
import { createActor } from "xstate";
import { machineName } from "./machineName.js";

/**
 * Machine Name Demo
 *
 * Demonstrates:
 * - Primary use case (happy path)
 * - Error scenarios and recovery
 * - Edge cases and boundary conditions
 * - Integration outputs for orchestration
 */

console.log("🚀 Machine Name Demo\n");

const mockInput = {
  sessionId: "demo-session-123",
  phoneNumber: "+260123456789",
  serviceCode: "*2233#",
  // Add other required input fields with realistic data
};

// Demo 1: Happy Path Flow
console.log("=".repeat(50));
console.log("DEMO 1: Happy Path Flow");
console.log("=".repeat(50));

const actor1 = createActor(machineName, { input: mockInput });
actor1.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);

  // Log business-relevant context changes
  if (snapshot.context.balance !== undefined) {
    console.log(`💰 Balance: ${snapshot.context.balance}`);
  }

  if (snapshot.context.isVerified) {
    console.log(`✅ User verified`);
  }

  // Log outputs for orchestration
  if (snapshot.output) {
    console.log(`🎯 Output:`, snapshot.output);
  }
});

actor1.start();
actor1.send({ type: "START_EVENT" });
actor1.send({ type: "NEXT_EVENT" });
// ... demonstrate the complete flow

console.log("✅ Happy path completed!\n");

// Demo 2: Error Scenario
console.log("=".repeat(50));
console.log("DEMO 2: Error Handling & Recovery");
console.log("=".repeat(50));

const actor2 = createActor(machineName, { input: mockInput });
actor2.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);

  // Log error states and recovery
  if (snapshot.context.errorMessage) {
    console.log(`❌ Error: ${snapshot.context.errorMessage}`);
  }
});

actor2.start();
actor2.send({ type: "START_EVENT" });
actor2.send({ type: "ERROR_EVENT" });
actor2.send({ type: "RETRY_EVENT" });
// ... demonstrate error recovery

console.log("✅ Error handling demonstrated!\n");

// Demo 3: Edge Cases
console.log("=".repeat(50));
console.log("DEMO 3: Edge Cases");
console.log("=".repeat(50));

const actor3 = createActor(machineName, { input: mockInput });
actor3.subscribe(snapshot => {
  console.log(`📍 State: ${snapshot.value}`);
});

actor3.start();
// ... demonstrate edge cases

console.log("✅ Edge cases covered!\n");

// Summary
console.log("🎉 Demo Complete!");
console.log("\n📊 Machine Summary:");
console.log("   • Primary capability 1");
console.log("   • Primary capability 2");
console.log("   • Error handling patterns");
console.log("   • Integration outputs");
console.log("   • Edge case handling");
```

## ✅ Demo File Requirements

### Every Demo Must Cover

- [ ] **Happy Path Flow** - Primary use case working correctly
- [ ] **Error Scenarios** - How machine handles failures and recovers
- [ ] **Edge Cases** - Boundary conditions and unusual inputs
- [ ] **Integration Points** - Outputs for machine orchestration
- [ ] **Business Logic** - Key decision points and validations

### Logging Standards

- [ ] Use emojis for visual clarity (📍 for states, 💰 for money, ✅ for success, ❌ for errors)
- [ ] Log state transitions with `📍 State: ${snapshot.value}`
- [ ] Log business-relevant context changes
- [ ] Log outputs with `🎯 Output:` for orchestration
- [ ] Use section dividers with `=`.repeat(50)
- [ ] Include summary information about machine capabilities

### Data Standards

- [ ] Use realistic test data (actual phone numbers, amounts, etc.)
- [ ] Include edge case data (empty strings, large numbers, special characters)
- [ ] Use consistent session IDs and phone numbers across demos
- [ ] Include comments explaining why specific test data is used

## 🔧 Integration with Development Process

### 1. Machine Development Workflow

```
Write Machine → Write Demo → Run Demo → Iterate → Write Tests → Code Review
```

### 2. Code Review Process

```bash
# Reviewer runs demo to understand intended behavior
pnpm demo:newMachine

# Verifies all flows work as expected
# Understands integration points
# Validates business logic
```

### 3. Debugging Workflow

```bash
# Issue reported with machine
# Run demo to reproduce issue
pnpm demo:problematicMachine

# Add logging to demo to understand state flow
# Fix issue and verify with demo
# Update demo if needed
```

### 4. Stakeholder Communication

```bash
# Show business stakeholders how features work
pnpm demo:userServices

# Validate requirements with domain experts
# Get feedback on user experience
# Demonstrate edge case handling
```

## 🎯 Best Practices

### Do's

- ✅ Cover all major flows in every demo
- ✅ Use descriptive logging with emojis
- ✅ Include realistic test data
- ✅ Demonstrate error recovery
- ✅ Show integration outputs
- ✅ Add summary information
- ✅ Keep demos up-to-date with machine changes

### Don'ts

- ❌ Don't skip error scenarios
- ❌ Don't use unrealistic test data
- ❌ Don't forget to log important context changes
- ❌ Don't make demos too long or complex
- ❌ Don't leave demos broken after machine changes
- ❌ Don't skip integration outputs

## 🚨 Common Issues

### Demo Not Running

```bash
# Check TypeScript compilation
pnpm tsc --noEmit

# Check import paths (must use .js extensions)
import { machine } from './machine.js';

# Check that machine exports are correct
```

### Demo Shows Unexpected Behavior

```bash
# Add more logging to understand state flow
console.log('Context:', snapshot.context);

# Check that input data matches machine expectations
# Verify event types match machine definition
```

### Demo Gets Out of Sync

```bash
# Update demo when machine changes
# Run demo as part of testing process
# Include demo verification in code reviews
```

Demo files are not optional - they're a critical part of our development workflow that ensures quality, maintainability, and team collaboration!
