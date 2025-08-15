// Centralized branding constants for generic, reusable project text
// Replace values here to customize the app's displayed name without changing code across machines

export const APP_NAME = "USSD Example App" as const;
export const ORG_NAME = "Example Org" as const;

// Convenience helpers for composing generic messages
export const messages = {
  welcome: () => `Welcome to ${APP_NAME}`,
  goodbye: () => `Thank you for using ${APP_NAME}. Goodbye!`,
  infoCenterTitle: () => `Welcome to ${APP_NAME} Information Center`,
} as const;
