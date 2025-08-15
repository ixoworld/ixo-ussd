import { assign, sendTo, setup } from "xstate";
import {
  accountCreationMachine,
  AccountCreationOutput,
} from "./account-creation/index.js";
import {
  accountMenuMachine,
  AccountMenuOutput,
} from "./account-menu/accountMenuMachine.js";
import { loginMachine, LoginOutput } from "./account-login/loginMachine.js";
import { navigationGuards } from "./guards/index.js";
import { knowMoreMachine } from "./information/index.js";
import { withNavigation } from "./utils/navigation-mixin.js";

/**
 * Example State Machine - Simplified Architecture
 *
 * Main orchestrator machine that implements the core USSD menu flows.
 *
 * Currently supports:
 * 1. Information services (Know More flows) - knowMoreMachine
 * 2. Account management (login/registration) - accountMenuMachine, loginMachine, accountCreationMachine
 * 3. User services (placeholder - under development)
 *
 * Flow:
 * Start → Pre-Menu → [Know More | Account Menu]
 * - Know More → Information flows (SMS responses)
 */

export interface ExampleMachineContext {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  customerName?: string;
  currentBalance?: number;
  isAuthenticated: boolean;
  sessionStartTime: string;
  error?: string;
  validationError?: string;
  // USSD Response
  message: string;
}

export type ExampleMachineEvent =
  | { type: "DIAL_USSD"; phoneNumber: string; serviceCode: string }
  | { type: "INPUT"; input: string } // User input from USSD
  | { type: "CHILD_MACHINE_DONE"; output: any }
  | { type: "BACK" }
  | { type: "CANCEL" }
  | { type: "ERROR"; error: string };

import { messages } from "../../constants/branding.js";
const preMenuMessage = `${messages.welcome()}\n1. Know More\n2. Account Menu\n*. Exit`;
export const exampleMachine = setup({
  types: {
    context: {} as ExampleMachineContext,
    events: {} as ExampleMachineEvent,
    input: {} as {
      sessionId?: string;
      phoneNumber?: string;
      serviceCode?: string;
    },
  },

  actors: {
    // Child state machines
    knowMoreMachine,
    accountMenuMachine,
    loginMachine,
    accountCreationMachine,
  },

  actions: {
    initializeSession: assign(({ context }) => ({
      sessionId:
        context.sessionId ||
        `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      sessionStartTime: new Date().toISOString(),
      isAuthenticated: false,
      error: undefined,
      validationError: undefined,
    })),

    setPhoneAndService: assign(({ event }) => ({
      phoneNumber: event.type === "DIAL_USSD" ? event.phoneNumber : "",
      serviceCode: event.type === "DIAL_USSD" ? event.serviceCode : "",
      message: preMenuMessage,
    })),

    setPreMenuMessage: assign(() => ({
      message: preMenuMessage,
    })),

    setAgentIdEntryMessage: assign(() => ({
      message: "Enter your Agent ID:",
    })),

    setVerifyingMessage: assign(() => ({
      message: "Verifying... Please wait.",
    })),

    setErrorMessage: assign(({ context }) => ({
      message:
        context.error ||
        context.validationError ||
        "An error occurred. Please try again.",
    })),

    setUserAuthenticated: assign(() => ({
      isAuthenticated: true,
      isAgent: false,
    })),

    setAgentAuthenticated: assign(() => ({
      isAuthenticated: true,
      isAgent: true,
    })),

    updateBalanceFromChild: assign(({ context, event }) => ({
      currentBalance:
        event.type === "CHILD_MACHINE_DONE"
          ? event.output?.context?.currentBalance !== undefined
            ? event.output.context.currentBalance
            : context.currentBalance
          : context.currentBalance,
    })),

    setError: assign(({ event }) => ({
      error: event.type === "ERROR" ? event.error : "An error occurred",
    })),

    clearErrors: assign(() => ({
      error: undefined,
      validationError: undefined,
    })),

    resetSession: assign(() => ({
      customerName: undefined,
      currentBalance: undefined,
      isAuthenticated: false,
      error: undefined,
      validationError: undefined,
    })),

    logToConsole: ({ event, context }) => {
      let details = `👀 Parent log: context: ${JSON.stringify(context)} \n| event: ${event.type}`;
      if ("input" in event) {
        details += ` | input: ${event.input}`;
      }
      if ("error" in event) {
        details += ` | error: ${event.error}`;
      }
      /* eslint-disable no-console*/
      console.log(details);
    },
  },

  guards: {
    // Business logic guards (machine-specific)
    hasError: ({ context }) => Boolean(context.error),
    hasValidationError: ({ context }) => Boolean(context.validationError),

    // Navigation guards - these handle universal commands
    isBack: ({ event }) =>
      navigationGuards.isBackCommand(null as any, event as any),
    isExit: ({ event }) =>
      navigationGuards.isExitCommand(null as any, event as any),

    // Navigation guards (adapted from modular guards)
    isInput1: ({ event }) =>
      navigationGuards.isInput("1")(null as any, event as any),
    isInput2: ({ event }) =>
      navigationGuards.isInput("2")(null as any, event as any),
    isInput3: ({ event }) =>
      navigationGuards.isInput("3")(null as any, event as any),

    // Basic input validation guards
    isValidAgentIdInput: ({ event }) =>
      event.type === "INPUT" && event.input.trim().length >= 6,
  },
}).createMachine({
  id: "exampleMachine",
  initial: "idle",

  context: ({ input }): ExampleMachineContext => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    serviceCode: input?.serviceCode || "",
    isAuthenticated: false,
    sessionStartTime: "",
    message: preMenuMessage,
  }),

  states: {
    // Initial state - waiting for USSD dial
    idle: {
      on: {
        DIAL_USSD: {
          target: "preMenu",
          actions: ["initializeSession", "setPhoneAndService"],
        },
      },
    },

    preMenu: {
      entry: ["clearErrors", "setPreMenuMessage"],
      on: {
        INPUT: withNavigation(
          [
            {
              target: "knowMoreService",
              guard: "isInput1",
              actions: "clearErrors",
            },
            {
              target: "accountMenu",
              guard: "isInput2",
              actions: "clearErrors",
            },
            {
              target: "closeSession",
              guard: "isBack",
            },
            {
              target: "closeSession",
              guard: "isExit",
            },
            {
              target: "preMenu",
              actions: assign(() => ({
                message: `Invalid selection. Please choose 1 or 2.\n\n${preMenuMessage}`,
              })),
            },
          ],
          {
            enableBack: false, // No back from main menu
            enableExit: true, // But allow exit
          }
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Know More service - delegates to knowMoreMachine
    knowMoreService: {
      on: {
        INPUT: { actions: sendTo("knowMoreChild", ({ event }) => event) },
      },
      invoke: {
        id: "knowMoreChild",
        src: "knowMoreMachine",
        input: ({ context }) => ({
          sessionId: context.sessionId,
          phoneNumber: context.phoneNumber,
          serviceCode: context.serviceCode,
        }),
        onDone: {
          target: "preMenu",
        },
        onError: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Account Menu - routes to login or account creation
    accountMenu: {
      on: {
        INPUT: {
          actions: [sendTo("accountMenuChild", ({ event }) => event)],
        },
      },
      invoke: {
        id: "accountMenuChild",
        src: "accountMenuMachine",
        input: ({ context }) => ({
          sessionId: context.sessionId,
          phoneNumber: context.phoneNumber,
          serviceCode: context.serviceCode,
        }),
        onDone: [
          {
            target: "login",
            guard: ({ event }) =>
              (event as { output?: { result: AccountMenuOutput } }).output
                ?.result === AccountMenuOutput.LOGIN_SELECTED,
          },
          {
            target: "accountCreation",
            guard: ({ event }) =>
              (event as { output?: { result: AccountMenuOutput } }).output
                ?.result === AccountMenuOutput.CREATE_SELECTED,
          },
          {
            target: "preMenu",
            guard: ({ event }) =>
              (event as { output?: { result: AccountMenuOutput } }).output
                ?.result === AccountMenuOutput.UNDEFINED,
          },
          {
            target: "preMenu",
          },
        ],
        onError: {
          target: "error",
          actions: "setError",
        },
        onSnapshot: {
          actions: assign(({ event }) => ({
            message: event.snapshot.context.message,
          })),
        },
      },
    },

    // Login service - handles existing user authentication
    login: {
      on: {
        INPUT: {
          actions: sendTo("loginChild", ({ event }) => event),
        },
      },
      invoke: {
        id: "loginChild",
        src: "loginMachine",
        input: ({ context }) => ({
          sessionId: context.sessionId,
          phoneNumber: context.phoneNumber,
          serviceCode: context.serviceCode,
        }),
        onDone: [
          {
            target: "preMenu",
            guard: ({ event }) =>
              (event.output as any)?.result === LoginOutput.LOGIN_SUCCESS,
            actions: [
              "clearErrors",
              assign(({ event }) => {
                const output = event.output as any;
                return {
                  customerName: output?.customer?.fullName || "Existing User",
                  isAuthenticated: true,
                };
              }),
            ],
          },
          {
            target: "accountMenu",
            guard: ({ event }) =>
              (event.output as any)?.result === LoginOutput.CUSTOMER_NOT_FOUND,
            actions: ["clearErrors"],
          },
          {
            target: "accountMenu",
            guard: ({ event }) =>
              (event.output as any)?.result ===
              LoginOutput.ENCRYPTED_PIN_FIELD_EMPTY,
            actions: ["clearErrors"],
          },
          {
            target: "accountMenu",
            guard: ({ event }) =>
              (event.output as any)?.result ===
              LoginOutput.MAX_ATTEMPTS_EXCEEDED,
            actions: ["clearErrors"],
          },
          {
            target: "preMenu",
            actions: ["clearErrors"],
          },
        ],
        onError: {
          target: "error",
          actions: "setError",
        },
        onSnapshot: {
          actions: assign(({ event }) => ({
            message: event.snapshot.context.message,
          })),
        },
      },
    },

    // Account Creation service - handles new user registration
    accountCreation: {
      on: {
        INPUT: {
          actions: sendTo("accountCreationChild", ({ event }) => event),
        },
      },
      invoke: {
        id: "accountCreationChild",
        src: "accountCreationMachine",
        input: ({ context }) => ({
          sessionId: context.sessionId,
          phoneNumber: context.phoneNumber,
          serviceCode: context.serviceCode,
        }),
        onDone: [
          {
            target: "accountCreationSuccess",
            guard: ({ event }) =>
              (event.output as any)?.type ===
              AccountCreationOutput.ACCOUNT_CREATED,
            actions: [
              "clearErrors",
              assign(({ event }) => {
                const output = event.output as any;
                return {
                  customerName: output?.customer?.fullName || "Existing User",
                };
              }),
            ],
          },
          {
            target: "accountMenu",
            guard: ({ event }) =>
              (event.output as any)?.type === AccountCreationOutput.CANCELLED,
            actions: ["clearErrors"],
          },
          {
            target: "accountMenu",
            actions: ["clearErrors"],
          },
        ],
        onError: {
          target: "error",
          actions: "setError",
        },
        onSnapshot: {
          actions: assign(({ event }) => ({
            message: event.snapshot.context.message,
          })),
        },
      },
    },

    // Account creation success state
    accountCreationSuccess: {
      entry: assign(() => ({
        message:
          "Account created successfully!\n\nYou can now:\n1. Return to main menu",
        isEnd: false,
      })),
      on: {
        INPUT: [
          {
            target: "preMenu",
            guard: "isInput1",
            actions: "clearErrors",
          },
          {
            target: "preMenu",
            guard: "isInput2",
            actions: "clearErrors",
          },
          {
            target: "preMenu",
            guard: "isBack",
            actions: "clearErrors",
          },
        ],
      },
    },

    // Placeholder for user services - redirect to main menu
    userMainMenu: {
      entry: assign(() => ({
        message:
          "User services are currently under development.\n1. Return to main menu",
      })),
      on: {
        INPUT: [
          {
            target: "preMenu",
            guard: "isInput1",
            actions: "clearErrors",
          },
        ],
      },
    },

    // Placeholder for agent services - redirect to main menu
    agentMainMenu: {
      entry: assign(() => ({
        message:
          "Agent services are currently under development.\nReturning to main menu...",
      })),
      after: {
        2000: {
          target: "preMenu",
          actions: "clearErrors",
        },
      },
    },

    // Error state with custom back behavior
    error: {
      entry: "setErrorMessage",
      on: {
        INPUT: withNavigation([], {
          backTarget: "preMenu", // Always go back to main menu from error
          enableBack: true,
          enableExit: true,
        }),
        DIAL_USSD: {
          target: "preMenu",
          actions: ["resetSession", "setPhoneAndService", "clearErrors"],
        },
      },
    },

    // Session closed - final state
    closeSession: {
      type: "final",
      entry: [
        "resetSession",
        assign(() => ({
          message: messages.goodbye(),
        })),
      ],
    },
  },
});

export type ExampleMachine = typeof exampleMachine;
