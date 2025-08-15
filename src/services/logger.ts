import { pino } from "pino";

/**
 * Centralized logging service for the IXO USSD Server
 *
 * Configuration:
 * - Development: Pretty printing, debug level
 * - Production: JSON format, info+ level
 * - Test: Silent or minimal logging
 */

// Simple environment detection without importing config to avoid circular deps
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

// Create logger with environment-specific configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),

  // Pretty printing for development, JSON for production
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,

  // Base configuration
  base: {
    service: "ixo-ussd-server",
    version: process.env.npm_package_version || "0.1.0",
  },

  // Redact sensitive information
  redact: {
    paths: [
      "pin",
      "password",
      "mnemonic",
      "privateKey",
      "secret",
      "token",
      "*.pin",
      "*.password",
      "*.mnemonic",
      "*.privateKey",
      "*.secret",
      "*.token",
    ],
    censor: "[REDACTED]",
  },

  // Minimal logging in test environment
  ...(isTest && { level: "silent" }),
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to include in all log messages
 * @returns Child logger instance
 */
export const createChildLogger = (context: Record<string, any>) => {
  return logger.child(context);
};

/**
 * Create a logger for a specific service/module
 * @param module - Module name (e.g., 'auth', 'example', 'session')
 * @returns Child logger with module context
 */
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

/**
 * Create a logger for a specific user session
 * @param sessionId - Session identifier
 * @param phoneNumber - User's phone number (will be partially redacted)
 * @returns Child logger with session context
 */
export const createSessionLogger = (
  sessionId: string,
  phoneNumber?: string
) => {
  return logger.child({
    sessionId,
    // Redact phone number except last 4 digits for privacy
    phoneNumber: phoneNumber ? `***${phoneNumber.slice(-4)}` : undefined,
  });
};

/**
 * Log levels for consistent usage across the application
 */
export const LogLevel = {
  FATAL: "fatal",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
  TRACE: "trace",
} as const;

export default logger;
