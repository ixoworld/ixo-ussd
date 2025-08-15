import { setup, assign, fromPromise } from "xstate";
import { withNavigation } from "../utils/navigation-mixin.js";
import { navigationGuards } from "../guards/navigation.guards.js";
import { validationGuards } from "../guards/validation.guards.js";
import { NavigationPatterns } from "../utils/navigation-patterns.js";
import { dataService } from "../../../services/database-storage.js";
import { createIxoAccountBackground } from "../../../services/ixo/background-ixo-creation.js";
import { messages } from "../../../constants/branding.js";

// Constants
export const SKIP_EMAIL_INPUT = "00"; // Use "00" to avoid conflict with navigation "0" (back)

/**
 * Account Creation Machine - New User Registration
 *
 * Handles the complete account creation flow for brand new users:
 * - Personal information collection (name, email)
 * - PIN setup and confirmation
 * - Customer record creation
 * - Account activation and success confirmation
 *
 * Entry Points: nameEntry
 * Exit Points: SUCCESS (account created), CANCELLED (back to menu)
 */

export enum AccountCreationOutput {
  UNDEFINED = "UNDEFINED",
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  CANCELLED = "CANCELLED",
  ERROR = "ERROR",
}

export interface AccountCreationContext {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;

  // Customer account creation data
  fullName: string;
  email: string;
  isEmailSkipped: boolean;
  pin: string;
  confirmPin: string;
  generatedCustomerId?: string;
  phoneRecordId?: number;
  customerRecordId?: number;

  // Router pattern: tracks parent routing decision
  nextParentState: AccountCreationOutput;

  // Flow control
  currentStep:
    | "nameEntry"
    | "emailEntry"
    | "pinEntry"
    | "confirmPin"
    | "creatingAccount"
    | "accountCreationSuccess"
    | "cancelled"
    | "error"
    | "routeToMain";
  error?: string;
  validationError?: string;

  // USSD Response
  message: string;
}

export type AccountCreationEvent =
  | { type: "INPUT"; input: string }
  | { type: "ERROR"; error: string };

const fullNameMessage = `${messages.welcome()}\nEnter your full name:`;
const tryAgainMessage = "\n1. Try Again";
const returnToMainMenuMessage = "\n0. Back to Main Menu";
const successMessage = (customerId: string) =>
  `Account created successfully!\nYour Customer ID: ${customerId}\nSave your Customer ID to access services.\n1. Back to Account Menu`;

export const accountCreationMachine = setup({
  types: {
    context: {} as AccountCreationContext,
    events: {} as AccountCreationEvent,
    input: {} as {
      sessionId: string;
      phoneNumber: string;
      serviceCode: string;
    },
  },

  actors: {
    createCustomerService: fromPromise(
      async ({
        input,
      }: {
        input: {
          phoneNumber: string;
          fullName: string;
          email: string;
          pin: string;
        };
      }) => {
        // Step 1: Create or update phone record
        const phoneRecord = await dataService.createOrUpdatePhoneRecord(
          input.phoneNumber
        );

        // Step 2: Create customer record
        const customerRecord = await dataService.createCustomerRecord(
          phoneRecord.id,
          {
            fullName: input.fullName,
            email: input.email || undefined,
            pin: input.pin,
            preferredLanguage: "eng",
            lastCompletedAction: "account_creation",
          }
        );

        // Step 3: Fire-and-forget IXO account creation (non-blocking)
        createIxoAccountBackground({
          customerId: customerRecord.customerId,
          customerRecordId: customerRecord.id,
          phoneNumber: input.phoneNumber,
          fullName: input.fullName,
          pin: input.pin,
        }).catch(error => {
          // Error is already logged in the background service
          /* eslint-disable no-console */
          console.error(
            `Background IXO creation failed for customer ${customerRecord.customerId}:`,
            error.message
          );
        });

        return {
          customerId: customerRecord.customerId,
          phoneRecordId: phoneRecord.id,
          customerRecordId: customerRecord.id,
        };
      }
    ),
  },

  actions: {
    // Navigation actions
    setNameMessage: assign(() => ({
      message: fullNameMessage,
      currentStep: "nameEntry" as const,
    })),

    setEmailMessage: assign(({ context }) => ({
      message: `Enter your email address (optional):\n${SKIP_EMAIL_INPUT}. Skip`,
      currentStep: "emailEntry" as const,
    })),

    setPinMessage: assign(({ context }) => ({
      message: `Create a 5-digit PIN for your account:\n`,
      currentStep: "pinEntry" as const,
    })),

    setConfirmPinMessage: assign(() => ({
      message: "Confirm your 5-digit PIN:",
      currentStep: "confirmPin" as const,
    })),

    setCreatingAccountMessage: assign(() => ({
      message: `Creating your account...\n1. View your Customer ID`,
      currentStep: "creatingAccount" as const,
    })),

    setSuccessMessage: assign(({ context }) => ({
      message: successMessage(context.generatedCustomerId ?? ""),
      currentStep: "accountCreationSuccess" as const,
    })),

    setCancelMessage: assign(() => ({
      message: `Account creation cancelled.${returnToMainMenuMessage}`,
      currentStep: "cancelled" as const,
    })),

    // Data collection actions
    setFullName: assign(({ event }) => ({
      fullName: event.type === "INPUT" ? event.input : "",
    })),

    setEmail: assign(({ event }) => ({
      email: event.type === "INPUT" ? event.input : "",
      isEmailSkipped: false, // Clear boolean flag when email is provided
    })),

    setSkipEmail: assign(() => ({
      email: "", // Empty string for skipped email
      isEmailSkipped: true, // Clear boolean flag
    })),

    setPin: assign(({ event }) => ({
      pin: event.type === "INPUT" ? event.input : "",
    })),

    setConfirmPin: assign(({ event }) => ({
      confirmPin: event.type === "INPUT" ? event.input : "",
    })),

    // Error handling
    setError: assign(({ event }) => ({
      error: event.type === "ERROR" ? event.error : "An error occurred",
      message: `Error: ${event.type === "ERROR" ? event.error : "An error occurred"}\n${returnToMainMenuMessage}`,
      currentStep: "error" as const,
    })),

    clearErrors: assign(() => ({
      error: undefined,
      validationError: undefined,
    })),

    setPinMismatchError: assign(() => ({
      validationError: "PINs do not match",
      message:
        "PINs do not match. Please try again.\n\nCreate a 5-digit PIN for your account:",
      currentStep: "pinEntry" as const,
    })),

    setInvalidPinError: assign(() => ({
      validationError: "Invalid PIN format",
      message:
        "PIN must be 5 digits. Please try again.\n\nCreate a 5-digit PIN for your account:",
      currentStep: "pinEntry" as const,
    })),
  },

  guards: {
    // Input validation guards
    isInput1: ({ event }) =>
      navigationGuards.isInput("1")(null as any, event as any),
    isInput2: ({ event }) =>
      navigationGuards.isInput("2")(null as any, event as any),

    // Validation guards
    isValidPin: ({ event }) =>
      validationGuards.isValidPin(null as any, event as any),

    isInvalidPin: ({ event }) =>
      !validationGuards.isValidPin(null as any, event as any),

    isPinMatch: ({ context, event }) =>
      event.type === "INPUT" && context.pin === event.input,

    isPinMismatch: ({ context, event }) =>
      event.type === "INPUT" && context.pin !== event.input,

    isValidEmail: ({ event }) =>
      event.type === "INPUT" &&
      (event.input === SKIP_EMAIL_INPUT ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.input)),

    isSkipEmail: ({ event }) =>
      event.type === "INPUT" && event.input === SKIP_EMAIL_INPUT,

    isValidEmailAddress: ({ event }) =>
      event.type === "INPUT" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.input),

    isValidName: ({ event }) =>
      validationGuards.isValidTextInput(null as any, event as any),

    isAccountCreated: ({ context }: { context: AccountCreationContext }) =>
      AccountCreationOutput.ACCOUNT_CREATED === context.nextParentState,

    // Navigation guards
    isBack: ({ event }) =>
      navigationGuards.isBackCommand(null as any, event as any),
    isExit: ({ event }) =>
      navigationGuards.isExitCommand(null as any, event as any),
  },
}).createMachine({
  id: "accountCreation",
  initial: "nameEntry",

  context: ({ input }): AccountCreationContext => ({
    sessionId: input?.sessionId || "",
    phoneNumber: input?.phoneNumber || "",
    serviceCode: input?.serviceCode || "",
    fullName: "",
    email: "",
    isEmailSkipped: false,
    pin: "",
    confirmPin: "",
    nextParentState: AccountCreationOutput.UNDEFINED,
    currentStep: "nameEntry" as const,
    message: fullNameMessage,
  }),

  output: ({ context }) => ({ result: context.nextParentState }),

  states: {
    nameEntry: {
      entry: "setNameMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "emailEntry",
              guard: "isValidName",
              actions: ["setFullName", "clearErrors"],
            },
          ],
          NavigationPatterns.accountCreationChild
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    emailEntry: {
      entry: "setEmailMessage",
      on: {
        INPUT: withNavigation(
          [
            // Handle skip email first (before navigation)
            {
              target: "pinEntry",
              guard: "isSkipEmail",
              actions: ["setSkipEmail", "clearErrors"],
            },
            // Handle valid email
            {
              target: "pinEntry",
              guard: "isValidEmailAddress",
              actions: ["setEmail", "clearErrors"],
            },
          ],
          {
            backTarget: "nameEntry",
            exitTarget: "cancelled",
          }
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    pinEntry: {
      entry: "setPinMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "confirmPin",
              guard: "isValidPin",
              actions: ["setPin", "clearErrors"],
            },
            {
              target: "pinEntry",
              guard: "isInvalidPin",
              actions: "setInvalidPinError",
            },
          ],
          {
            backTarget: "emailEntry",
            exitTarget: "cancelled",
          }
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    confirmPin: {
      entry: "setConfirmPinMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "creatingAccount",
              guard: "isPinMatch",
              actions: ["setConfirmPin", "clearErrors"],
            },
            {
              target: "pinEntry",
              guard: "isPinMismatch",
              actions: "setPinMismatchError",
            },
          ],
          {
            backTarget: "pinEntry",
            exitTarget: "cancelled",
          }
        ),
        ERROR: {
          target: "error",
          actions: "setError",
        },
      },
    },

    creatingAccount: {
      entry: "setCreatingAccountMessage",
      invoke: {
        id: "createCustomer",
        src: "createCustomerService",
        input: ({ context }) => ({
          phoneNumber: context.phoneNumber,
          fullName: context.fullName,
          email: context.isEmailSkipped ? "" : context.email,
          pin: context.pin,
        }),
        onDone: {
          actions: assign(({ event }) => ({
            generatedCustomerId: event.output.customerId,
            phoneRecordId: event.output.phoneRecordId,
            customerRecordId: event.output.customerRecordId,
            nextParentState: AccountCreationOutput.ACCOUNT_CREATED,
          })),
        },
        onError: {
          target: "error",
          actions: assign(({ event }) => ({
            message: `Failed to create account: ${String(event.error)}${tryAgainMessage}`,
            error: String(event.error),
            nextParentState: AccountCreationOutput.ERROR,
          })),
        },
      },
      on: {
        INPUT: {
          target: "accountCreationSuccess",
          guard: "isAccountCreated",
        },
      },
    },

    accountCreationSuccess: {
      entry: "setSuccessMessage",
      on: {
        INPUT: {
          target: "routeToMain",
        },
      },
    },

    cancelled: {
      entry: "setCancelMessage",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "routeToMain",
              actions: assign(() => ({
                nextParentState: AccountCreationOutput.CANCELLED,
              })),
            },
          ],
          {
            enableBack: false,
            enableExit: false,
            backTarget: "routeToMain",
            exitTarget: "routeToMain",
          }
        ),
      },
    },

    error: {
      entry: "setError",
      on: {
        INPUT: withNavigation(
          [
            {
              target: "routeToMain",
              actions: assign(() => ({
                nextParentState: AccountCreationOutput.ERROR,
              })),
            },
          ],
          {
            enableBack: false,
            enableExit: false,
            backTarget: "routeToMain",
            exitTarget: "routeToMain",
          }
        ),
      },
    },

    routeToMain: {
      type: "final",
    },
  },
});

export type AccountCreationMachine = typeof accountCreationMachine;
