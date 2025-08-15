import { setup, assign } from "xstate";
import { withNavigation } from "../utils/navigation-mixin.js";
import { navigationGuards } from "../guards/navigation.guards.js";
import { NavigationPatterns } from "../utils/navigation-patterns.js";

/**
 * Account Menu Machine - Router for Account Services
 *
 * Simple router machine that handles the account menu choice:
 * - Option 1: Login (existing users)
 * - Option 2: Create Account (new users)
 *
 * This machine acts as a dispatcher to the appropriate child machines
 * based on user selection.
 *
 * Entry Points: START
 * Exit Points: LOGIN_SELECTED, CREATE_SELECTED, CANCELLED
 */

export enum AccountMenuOutput {
  LOGIN_SELECTED = "LOGIN_SELECTED",
  CREATE_SELECTED = "CREATE_SELECTED",
  UNDEFINED = "UNDEFINED",
}

export interface AccountMenuContext {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  message: string;
  error?: string;
  nextParentState?: AccountMenuOutput;
}

export type AccountMenuEvent =
  | { type: "INPUT"; input: string }
  | { type: "ERROR"; error: string };

const showMenuMessage = `Account Menu\n\nDo you have an existing account?\n1. Yes, log me in\n2. No, create my account\n0. Back`;

export const accountMenuMachine = setup({
  types: {
    context: {} as AccountMenuContext,
    events: {} as AccountMenuEvent,
    input: {} as {
      sessionId: string;
      phoneNumber: string;
      serviceCode: string;
    },
  },

  actions: {
    setShowMenuMessage: assign(() => ({
      message: showMenuMessage,
    })),

    setError: assign({
      error: ({ event }) =>
        event.type === "ERROR" ? event.error : "An error occurred",
    }),

    clearErrors: assign(() => ({
      error: undefined,
    })),

    logToConsole: ({ event, context }) => {
      let details = `👀 Account Menu log: context.type: ${JSON.stringify(context?.nextParentState)} | context: ${JSON.stringify(context)} \n| event: ${event.type}`;
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
  },
}).createMachine({
  id: "accountMenu",
  initial: "showMenu",
  context: ({ input }): AccountMenuContext => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    serviceCode: input?.serviceCode || "",
    message: showMenuMessage,
    error: undefined,
    nextParentState: AccountMenuOutput.UNDEFINED,
  }),

  output: ({ context }) => ({ result: context.nextParentState }),

  states: {
    showMenu: {
      entry: ["setShowMenuMessage"],
      on: {
        INPUT: withNavigation(
          [
            {
              target: "routeToMain",
              guard: "isInput1",
              actions: [
                assign({ nextParentState: AccountMenuOutput.LOGIN_SELECTED }),
              ],
            },
            {
              target: "routeToMain",
              guard: "isInput2",
              actions: [
                assign({ nextParentState: AccountMenuOutput.CREATE_SELECTED }),
              ],
            },
            {
              target: "routeToMain",
              guard: "isBack",
              actions: [
                assign({ nextParentState: AccountMenuOutput.UNDEFINED }),
              ],
            },
            {
              target: "routeToMain",
              guard: "isExit",
              actions: [
                assign({ nextParentState: AccountMenuOutput.UNDEFINED }),
              ],
            },
          ],
          NavigationPatterns.accountMenuChild
        ),
        ERROR: {
          target: "error",
          actions: ["setError"],
        },
      },
    },

    error: {
      entry: "setError",
      on: {
        INPUT: withNavigation([], {
          backTarget: "showMenu",
          exitTarget: "routeToMain",
        }),
      },
    },

    routeToMain: {
      type: "final",
    },
  },
});

export type AccountMenuMachine = typeof accountMenuMachine;
