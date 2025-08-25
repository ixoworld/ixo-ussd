import { setup, assign } from "xstate";
import { withNavigation } from "../utils/navigation-mixin.js";
import { navigationGuards } from "../guards/navigation.guards.js";
import { NavigationPatterns } from "../utils/navigation-patterns.js";

/**
 * Know More Machine - Information Request and Product Information
 *
 * Handles:
 * - Product information display
 * - Service information requests
 * - Educational content delivery
 * - Navigation back to main menu
 *
 * Entry Points: Automatic invocation (starts in infoMenu)
 * Exit Points: Outputs routing decision for main orchestrator
 */

export interface KnowMoreContext {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  message: string; // USSD message to display to user
  error?: string;
}

export type KnowMoreEvent =
  | { type: "INPUT"; input: string } // User input from USSD
  | { type: "ERROR"; error: string };

import { messages } from "../../../constants/branding.js";
const infoMenuMessage = `${messages.infoCenterTitle()}\n1. Interested in Product\n2. Pricing & accessories\n3. Can we deliver to you?`;
const genericMessage = `Thank you for your interest. We have sent you a SMS with more information.\n1. Back to Main Menu`;

export const knowMoreMachine = setup({
  types: {
    context: {} as KnowMoreContext,
    events: {} as KnowMoreEvent,
    input: {} as {
      sessionId: string;
      phoneNumber: string;
      serviceCode: string;
    },
  },

  actions: {
    setInfoMenuMessage: assign(() => ({
      message: infoMenuMessage,
    })),

    setGenericMessage: assign(({ event }) => ({
      message: genericMessage,
    })),

    setError: assign({
      error: ({ event }) =>
        event.type === "ERROR" ? event.error : "An error occurred",
    }),

    clearErrors: assign({
      error: undefined,
    }),
  },

  guards: {
    // Input guards for USSD navigation
    isInput1: ({ event }) =>
      navigationGuards.isInput("1")(null as any, event as any),
    isInput2: ({ event }) =>
      navigationGuards.isInput("2")(null as any, event as any),
    isInput3: ({ event }) =>
      navigationGuards.isInput("3")(null as any, event as any),
    isInput4: ({ event }) =>
      navigationGuards.isInput("4")(null as any, event as any),
    isInput5: ({ event }) =>
      navigationGuards.isInput("5")(null as any, event as any),
    isInput6: ({ event }) =>
      navigationGuards.isInput("6")(null as any, event as any),
    isInput7: ({ event }) =>
      navigationGuards.isInput("7")(null as any, event as any),

    // Navigation guards
    isBack: ({ event }) =>
      navigationGuards.isBackCommand(null as any, event as any),
    isExit: ({ event }) =>
      navigationGuards.isExitCommand(null as any, event as any),
  },
}).createMachine({
  id: "knowMoreMachine",
  initial: "infoMenu",

  context: ({ input }): KnowMoreContext => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    serviceCode: input?.serviceCode || "",
    message: infoMenuMessage,
    error: undefined,
  }),

  states: {
    // Main information menu
    infoMenu: {
      entry: "setInfoMenuMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "sendSMS",
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

    sendSMS: {
      entry: "setGenericMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "routeToMain",
              guard: "isInput1",
            },
          ],
          {
            backTarget: "infoMenu",
            exitTarget: "routeToMain",
            enableBack: true,
            enableExit: true,
          }
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    // Error state
    error: {
      entry: "setError",
      on: {
        INPUT: withNavigation([], {
          backTarget: "infoMenu",
          exitTarget: "routeToMain",
        }),
      },
    },

    // Route back to main menu
    routeToMain: {
      type: "final",
      action: "clearErrors",
    },
  },
});

export type KnowMoreMachine = typeof knowMoreMachine;
