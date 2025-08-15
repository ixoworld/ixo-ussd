import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { config, ENV } from "../config.js";
import { createModuleLogger } from "../services/logger.js";

const logger = createModuleLogger("rate-limit");

/**
 * Rate Limiting Plugin for USSD API
 *
 * Implements multiple rate limiting strategies:
 * - Global rate limits for API endpoints
 * - Per-IP rate limits for abuse prevention
 * - Per-user rate limits for session management
 * - Environment-specific configurations
 */

interface RateLimitConfig {
  // Global limits
  globalMax: number;
  globalTimeWindow: string;

  // Per-IP limits
  ipMax: number;
  ipTimeWindow: string;

  // Per-user limits (phone number based)
  userMax: number;
  userTimeWindow: string;

  // USSD specific limits
  ussdMax: number;
  ussdTimeWindow: string;
}

/**
 * Get environment-specific rate limit configuration
 */
function getRateLimitConfig(): RateLimitConfig {
  if (ENV.IS_TEST) {
    // Very permissive limits for testing
    return {
      globalMax: 1000,
      globalTimeWindow: "1 minute",
      ipMax: 500,
      ipTimeWindow: "1 minute",
      userMax: 200,
      userTimeWindow: "1 minute",
      ussdMax: 100,
      ussdTimeWindow: "1 minute",
    };
  }

  if (ENV.IS_DEVELOPMENT) {
    // Moderate limits for development
    return {
      globalMax: 200,
      globalTimeWindow: "1 minute",
      ipMax: 100,
      ipTimeWindow: "1 minute",
      userMax: 50,
      userTimeWindow: "1 minute",
      ussdMax: 30,
      ussdTimeWindow: "1 minute",
    };
  }

  // Production limits - more restrictive
  return {
    globalMax: 1000,
    globalTimeWindow: "1 minute",
    ipMax: 60,
    ipTimeWindow: "1 minute",
    userMax: 30,
    userTimeWindow: "1 minute",
    ussdMax: 20,
    ussdTimeWindow: "1 minute",
  };
}

/**
 * Extract phone number from request for user-based rate limiting
 */
function extractPhoneNumber(request: any): string | undefined {
  // Try to get phone number from different sources
  const body = request.body;

  if (body?.phoneNumber) {
    return body.phoneNumber;
  }

  // For USSD requests, phone number might be in different format
  if (body?.sessionId) {
    // Could extract from session if needed
    return undefined;
  }

  return undefined;
}

/**
 * Custom key generator for user-based rate limiting
 */
function generateUserKey(request: any): string {
  const phoneNumber = extractPhoneNumber(request);
  const ip = request.ip;

  if (phoneNumber) {
    // Use phone number for authenticated/identified users
    return `user:${phoneNumber}`;
  }

  // Fall back to IP-based limiting
  return `ip:${ip}`;
}

/**
 * Custom error response for rate limiting
 */
function createRateLimitErrorResponse() {
  return {
    error: "Rate Limit Exceeded",
    message: "Too many requests. Please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: "60 seconds",
  };
}

/**
 * Rate limiting plugin
 */
async function rateLimitPlugin(fastify: FastifyInstance) {
  const rateLimitConfig = getRateLimitConfig();

  logger.info(
    {
      environment: ENV.CURRENT,
      config: rateLimitConfig,
    },
    "Configuring rate limiting"
  );

  // Global rate limiter
  await fastify.register(rateLimit, {
    max: rateLimitConfig.globalMax,
    timeWindow: rateLimitConfig.globalTimeWindow,
    skipOnError: false,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    errorResponseBuilder: () => createRateLimitErrorResponse(),
    onExceeded: request => {
      logger.warn(
        {
          ip: request.ip,
          url: request.url,
          method: request.method,
          userAgent: request.headers["user-agent"],
        },
        "Global rate limit exceeded"
      );
    },
  });

  // USSD-specific rate limiter
  fastify.register(async function ussdRateLimit(fastify) {
    await fastify.register(rateLimit, {
      max: rateLimitConfig.ussdMax,
      timeWindow: rateLimitConfig.ussdTimeWindow,
      keyGenerator: generateUserKey,
      skipOnError: false,
      addHeaders: {
        "x-ratelimit-limit": true,
        "x-ratelimit-remaining": true,
        "x-ratelimit-reset": true,
      },
      errorResponseBuilder: () => ({
        error: "USSD Rate Limit Exceeded",
        message: "Too many USSD requests. Please wait before trying again.",
        code: "USSD_RATE_LIMIT_EXCEEDED",
        retryAfter: "60 seconds",
      }),
      onExceeded: request => {
        const phoneNumber = extractPhoneNumber(request);
        logger.warn(
          {
            phoneNumber: phoneNumber
              ? `***${phoneNumber.slice(-4)}`
              : undefined,
            ip: request.ip,
            url: request.url,
            method: request.method,
          },
          "USSD rate limit exceeded"
        );
      },
    });

    // Apply USSD rate limiting to USSD endpoints
    fastify.addHook("preHandler", async request => {
      if (request.url.startsWith("/api/ussd")) {
        // Rate limiting is automatically applied by the plugin
        logger.debug(
          {
            url: request.url,
            phoneNumber: extractPhoneNumber(request) ? "present" : "missing",
          },
          "USSD rate limit check"
        );
      }
    });
  });

  // IP-based rate limiter for potential abuse
  fastify.register(async function ipRateLimit(fastify) {
    await fastify.register(rateLimit, {
      max: rateLimitConfig.ipMax,
      timeWindow: rateLimitConfig.ipTimeWindow,
      keyGenerator: request => `strict-ip:${request.ip}`,
      skipOnError: false,
      errorResponseBuilder: () => ({
        error: "IP Rate Limit Exceeded",
        message:
          "Too many requests from your IP address. Please try again later.",
        code: "IP_RATE_LIMIT_EXCEEDED",
        retryAfter: "60 seconds",
      }),
      onExceeded: request => {
        logger.warn(
          {
            ip: request.ip,
            url: request.url,
            method: request.method,
            userAgent: request.headers["user-agent"],
            headers: request.headers,
          },
          "IP rate limit exceeded"
        );
      },
    });
  });

  // Add rate limit status endpoint for monitoring
  if (config.DEV) {
    fastify.get("/rate-limit-status", async (request, reply) => {
      const query = request.query as { phoneNumber?: string };
      const phoneNumber = query?.phoneNumber;
      const userKey = phoneNumber ? `user:${phoneNumber}` : `ip:${request.ip}`;

      return {
        environment: ENV.CURRENT,
        config: rateLimitConfig,
        userKey,
        ip: request.ip,
        headers: {
          "x-ratelimit-limit": reply.getHeader("x-ratelimit-limit"),
          "x-ratelimit-remaining": reply.getHeader("x-ratelimit-remaining"),
          "x-ratelimit-reset": reply.getHeader("x-ratelimit-reset"),
        },
      };
    });
  }

  logger.info("Rate limiting plugin registered successfully");
}

// Export as Fastify plugin
export default fp(rateLimitPlugin, {
  name: "rate-limit",
  fastify: ">=4.0.0",
});

// Export types and utilities
export { getRateLimitConfig, extractPhoneNumber, generateUserKey };
export type { RateLimitConfig };
