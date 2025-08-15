import { setup, assign } from "xstate";
import { withNavigation } from "./utils/navigation-mixin.js";
import { navigationGuards } from "./guards/navigation.guards.js";
import { NavigationPatterns } from "./utils/navigation-patterns.js";

/**
 * [Machine Name] Machine - [Brief Description]
 *
 * Handles:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * - [Responsibility 3]
 *
 * Entry Points: [Initial state name]
 * Exit Points: [Output enum values and their meanings]
 */

export enum MachineNameOutput {
  UNDEFINED = "UNDEFINED",
  SUCCESS = "SUCCESS",
  CANCELLED = "CANCELLED",
  ERROR = "ERROR",
}

export interface MachineNameContext {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  message: string; // USSD message to display to user
  error?: string;
  nextParentState: MachineNameOutput;
  // Add your specific context fields here
  customField1?: string;
  customField2?: boolean;
}

export type MachineNameEvent =
  | { type: "INPUT"; input: string } // User input from USSD
  | { type: "ERROR"; error: string };

export const machineNameMachine = setup({
  types: {
    context: {} as MachineNameContext,
    events: {} as MachineNameEvent,
    input: {} as {
      sessionId: string;
      phoneNumber: string;
      serviceCode: string;
    },
  },

  actions: {
    setInitialMessage: assign(() => ({
      message: "[Your initial USSD message here]",
    })),

    setSuccessMessage: assign(() => ({
      message: "[Success message]",
      nextParentState: MachineNameOutput.SUCCESS,
    })),

    setError: assign({
      error: ({ event }) =>
        event.type === "ERROR" ? event.error : "An error occurred",
      message: "System error. Please try again.",
    }),

    clearErrors: assign(() => ({
      error: undefined,
    })),

    // Add your custom actions here
    customAction: assign({
      customField1: ({ event }) => (event.type === "INPUT" ? event.input : ""),
    }),
  },

  guards: {
    // Input guards for USSD navigation
    isInput1: ({ event }) =>
      navigationGuards.isInput("1")(null as any, event as any),
    isInput2: ({ event }) =>
      navigationGuards.isInput("2")(null as any, event as any),

    // Navigation guards
    isBack: ({ event }) =>
      navigationGuards.isBackCommand(null as any, event as any),
    isExit: ({ event }) =>
      navigationGuards.isExitCommand(null as any, event as any),

    // Add your custom guards here
    isValidInput: ({ context }) =>
      Boolean(context.customField1 && context.customField1.length > 0),
  },
}).createMachine({
  id: "machineNameMachine",
  initial: "mainMenu",

  context: ({ input }): MachineNameContext => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    serviceCode: input?.serviceCode || "",
    message: "[Your initial USSD message here]",
    error: undefined,
    nextParentState: MachineNameOutput.UNDEFINED,
    customField1: undefined,
    customField2: undefined,
  }),

  output: ({ context }) => ({ result: context.nextParentState }),

  states: {
    // Main menu state
    mainMenu: {
      entry: "setInitialMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "processing",
              guard: "isInput1",
              actions: ["customAction"],
            },
            {
              target: "alternative",
              guard: "isInput2",
            },
            // Add more input handlers as needed
          ],
          NavigationPatterns.informationChild // Choose appropriate pattern
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Processing state
    processing: {
      on: {
        INPUT: withNavigation(
          [
            {
              target: "success",
              guard: "isValidInput",
              actions: "setSuccessMessage",
            },
            // Add validation failure handling
          ],
          NavigationPatterns.informationChild
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Alternative flow
    alternative: {
      on: {
        INPUT: withNavigation(
          [
            {
              target: "success",
              actions: "setSuccessMessage",
            },
          ],
          NavigationPatterns.informationChild
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Success state
    success: {
      type: "final",
    },

    // Error state
    error: {
      entry: "setError",
      on: {
        INPUT: withNavigation([], {
          backTarget: "mainMenu",
          exitTarget: "routeToMain",
        }),
      },
    },

    // Route back to main menu
    routeToMain: {
      type: "final",
      entry: "clearErrors",
    },
  },
});

export type MachineNameMachine = typeof machineNameMachine;

// TODO: Remember to:
// 1. Replace all instances of "MachineName" and "machineNameMachine" with your actual machine name
// 2. Update the JSDoc comment with your machine's specific responsibilities
// 3. Update the MachineNameOutput enum with your specific output states
// 4. Update the context interface with your specific fields (remove customField1/2)
// 5. Update the initial message and other USSD messages
// 6. Implement your specific business logic in actions and guards
// 7. Choose the appropriate NavigationPatterns for your use case
// 8. Update the state machine structure to match your flow
// 9. Create corresponding test file: machineNameMachine.test.ts
// 10. Create corresponding demo file: machineNameMachine-demo.ts
// 11. Add exports to parent machine or index.ts as needed
// 12. Run: pnpm tsc --noEmit && pnpm lint
// 13. Run: pnpm test to ensure tests pass
// 14. Delete this TODO section when done
//
// Key Patterns to Follow:
// - Only use INPUT and ERROR events (two-event simplicity)
// - Use withNavigation() for consistent navigation handling
// - Include routeToMain final state for returning to main menu
// - Use output pattern for parent-child communication
// - Follow established naming conventions and file structure
