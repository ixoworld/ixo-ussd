/**
 * Production Environment Guard Limits
 *
 * This configuration defines strict limits for production environments.
 * Values are conservative to ensure security and comply with business requirements.
 */

import { GuardLimits } from "./guard-limits.js";

export const prodGuardLimits: GuardLimits = {
  pin: {
    maxAttempts: 3, // Strict limit for security
    testPin: "0000", // Disabled test PIN in production
    agentTestPin: "0000", // Disabled agent test PIN in production
  },
  transaction: {
    dailyLimit: 50000, // KES 50,000 - regulatory compliance
    maxDailyTransactions: 10, // Conservative limit
    minimumBalance: 10, // KES 10 minimum
    mockBalance: 0, // No mock data in production
    mockDailyTransactions: 0, // No mock data in production
  },
  rateLimit: {
    requestsPerMinute: 5, // Strict rate limiting for security
    windowMinutes: 1,
  },
  session: {
    timeoutMinutes: 15, // Shorter sessions for security
    activityCheckMinutes: 2, // Frequent activity checks
  },
  service: {
    available: true,
    maintenanceMode: false,
  },
};
