/**
 * Guard Limits Configuration
 *
 * This file defines the configuration interface and default values for all guard-related limits
 * across the generic app system. These limits control business rules, rate limiting,
 * validation thresholds, and security parameters.
 */

export interface GuardLimits {
  /** PIN-related limits */
  pin: {
    /** Maximum number of PIN attempts before lockout */
    maxAttempts: number;
    /** Test PIN for development/demo purposes */
    testPin: string;
    /** Agent test PIN for development/demo purposes */
    agentTestPin: string;
  };

  /** Transaction-related limits */
  transaction: {
    /** Maximum daily transaction amount in KES */
    dailyLimit: number;
    /** Maximum number of transactions per day */
    maxDailyTransactions: number;
    /** Minimum balance required to remain after transaction */
    minimumBalance: number;
    /** Mock balance for testing/demo purposes */
    mockBalance: number;
    /** Mock daily transaction count for testing/demo purposes */
    mockDailyTransactions: number;
  };

  /** Rate limiting configuration */
  rateLimit: {
    /** Maximum requests per minute per phone number */
    requestsPerMinute: number;
    /** Rate limit window in minutes */
    windowMinutes: number;
  };

  /** Session management */
  session: {
    /** Session timeout in minutes */
    timeoutMinutes: number;
    /** Session activity check interval in minutes */
    activityCheckMinutes: number;
  };

  /** Service availability */
  service: {
    /** Whether service is available */
    available: boolean;
    /** Service maintenance mode */
    maintenanceMode: boolean;
  };
}

/**
 * Default guard limits configuration
 * These values serve as the baseline for all environments
 */
export const defaultGuardLimits: GuardLimits = {
  pin: {
    maxAttempts: 3,
    testPin: "1234",
    agentTestPin: "9999",
  },
  transaction: {
    dailyLimit: 50000, // KES 50,000
    maxDailyTransactions: 10,
    minimumBalance: 10, // KES 10
    mockBalance: 1000, // KES 1,000 for testing
    mockDailyTransactions: 2,
  },
  rateLimit: {
    requestsPerMinute: 10,
    windowMinutes: 1,
  },
  session: {
    timeoutMinutes: 30,
    activityCheckMinutes: 5,
  },
  service: {
    available: true,
    maintenanceMode: false,
  },
};
