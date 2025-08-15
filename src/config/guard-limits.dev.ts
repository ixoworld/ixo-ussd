/**
 * Development Environment Guard Limits
 *
 * This configuration overrides default limits for development and testing environments.
 * Values are typically more relaxed to facilitate testing and development workflows.
 */

import { GuardLimits } from "./guard-limits.js";

export const devGuardLimits: GuardLimits = {
  pin: {
    maxAttempts: 5, // More attempts for testing
    testPin: "1234",
    agentTestPin: "9999",
  },
  transaction: {
    dailyLimit: 100000, // Higher limit for testing - KES 100,000
    maxDailyTransactions: 20, // More transactions for testing
    minimumBalance: 1, // Lower minimum for testing
    mockBalance: 5000, // Higher mock balance for testing
    mockDailyTransactions: 1, // Start with fewer transactions
  },
  rateLimit: {
    requestsPerMinute: 20, // More lenient rate limiting for testing
    windowMinutes: 1,
  },
  session: {
    timeoutMinutes: 60, // Longer sessions for development
    activityCheckMinutes: 10, // Less frequent checks
  },
  service: {
    available: true,
    maintenanceMode: false,
  },
};
