import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import { createModuleLogger } from "../services/logger.js";
import { ENV } from "../config.js";

const logger = createModuleLogger("security");

/**
 * Security Plugin for USSD API
 *
 * Implements comprehensive security headers and policies:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Environment-specific configurations
 */

interface SecurityConfig {
  enableHSTS: boolean;
  enableCSP: boolean;
  enableFrameGuard: boolean;
  enableContentTypeNoSniff: boolean;
  enableXSSFilter: boolean;
  enableReferrerPolicy: boolean;
  isDevelopment: boolean;
}

/**
 * Get environment-specific security configuration
 */
function getSecurityConfig(): SecurityConfig {
  return {
    enableHSTS: ENV.IS_PRODUCTION, // Only enable HSTS in production
    enableCSP: true,
    enableFrameGuard: true,
    enableContentTypeNoSniff: true,
    enableXSSFilter: true,
    enableReferrerPolicy: true,
    isDevelopment: ENV.IS_DEV_OR_TEST,
  };
}

/**
 * Security plugin
 */
async function securityPlugin(fastify: FastifyInstance) {
  const securityConfig = getSecurityConfig();

  logger.info(
    {
      environment: ENV.CURRENT,
      config: securityConfig,
    },
    "Configuring security headers"
  );

  // Register Helmet with custom configuration
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: securityConfig.enableCSP
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,

    // HTTP Strict Transport Security (HSTS)
    hsts: securityConfig.enableHSTS
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // X-Frame-Options
    frameguard: securityConfig.enableFrameGuard
      ? {
          action: "deny",
        }
      : false,

    // X-Content-Type-Options
    noSniff: securityConfig.enableContentTypeNoSniff,

    // Hide X-Powered-By header
    hidePoweredBy: true,
  });

  // Custom security headers for USSD API
  fastify.addHook("onSend", async (request, reply, payload) => {
    // Add custom headers for USSD API
    reply.header("X-API-Version", "1.0");
    reply.header("X-Service-Type", "USSD");

    // Enhanced security headers
    reply.header("X-Download-Options", "noopen");
    reply.header("X-DNS-Prefetch-Control", "off");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-Permitted-Cross-Domain-Policies", "none");
    reply.header("Cross-Origin-Embedder-Policy", "require-corp");
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Resource-Policy", "same-origin");

    // Permissions Policy (formerly Feature-Policy)
    reply.header(
      "Permissions-Policy",
      [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
        "ambient-light-sensor=()",
      ].join(", ")
    );

    // Cache control for API responses
    if (request.url.startsWith("/api/")) {
      reply.header(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
      reply.header("Pragma", "no-cache");
      reply.header("Expires", "0");
      reply.header("Clear-Site-Data", '"cache", "storage"');
    }

    // Security headers for health checks and status endpoints
    if (request.url.includes("/health") || request.url.includes("/metrics")) {
      reply.header("X-Robots-Tag", "noindex, nofollow, nosnippet, noarchive");
      reply.header("Cache-Control", "no-store, no-cache");
    }

    // Add Content Security Policy Report-Only for monitoring
    if (!securityConfig.isDevelopment) {
      reply.header(
        "Content-Security-Policy-Report-Only",
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "font-src 'self'",
          "object-src 'none'",
          "media-src 'none'",
          "frame-src 'none'",
          "worker-src 'none'",
          "manifest-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
          "block-all-mixed-content",
          "report-uri /csp-report",
        ].join("; ")
      );
    }

    return payload;
  });

  // Security monitoring hooks
  fastify.addHook("onRequest", async request => {
    // Log suspicious requests
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\.\.\//,
      /\/etc\/passwd/,
      /\/proc\/self/,
      /cmd\.exe/i,
      /powershell/i,
    ];

    const requestString = JSON.stringify({
      url: request.url,
      query: request.query,
      headers: request.headers,
    });

    const foundSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(requestString)
    );

    if (foundSuspicious) {
      logger.warn(
        {
          ip: request.ip,
          url: request.url,
          method: request.method,
          userAgent: request.headers["user-agent"],
          referer: request.headers.referer,
        },
        "Suspicious request detected"
      );
    }
  });

  // Rate limiting bypass detection
  fastify.addHook("onRequest", async request => {
    // Check for common rate limiting bypass attempts
    const bypassHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-originating-ip",
      "x-forwarded",
      "x-cluster-client-ip",
      "cf-connecting-ip",
    ];

    const suspiciousHeaders = bypassHeaders.filter(
      header =>
        request.headers[header] && request.headers[header] !== request.ip
    );

    if (suspiciousHeaders.length > 0) {
      logger.warn(
        {
          ip: request.ip,
          suspiciousHeaders,
          url: request.url,
          method: request.method,
        },
        "Potential rate limiting bypass attempt"
      );
    }
  });

  // Add security status endpoint for monitoring
  if (securityConfig.isDevelopment) {
    fastify.get("/security-status", async (request, reply) => {
      return {
        environment: ENV.CURRENT,
        config: securityConfig,
        headers: {
          "content-security-policy": reply.getHeader("content-security-policy"),
          "strict-transport-security": reply.getHeader(
            "strict-transport-security"
          ),
          "x-frame-options": reply.getHeader("x-frame-options"),
          "x-content-type-options": reply.getHeader("x-content-type-options"),
          "x-xss-protection": reply.getHeader("x-xss-protection"),
          "referrer-policy": reply.getHeader("referrer-policy"),
        },
        timestamp: new Date().toISOString(),
      };
    });
  }

  logger.info(
    {
      headersEnabled: {
        hsts: securityConfig.enableHSTS,
        csp: securityConfig.enableCSP,
        frameGuard: securityConfig.enableFrameGuard,
        contentTypeNoSniff: securityConfig.enableContentTypeNoSniff,
        xssFilter: securityConfig.enableXSSFilter,
        referrerPolicy: securityConfig.enableReferrerPolicy,
      },
    },
    "Security plugin registered successfully"
  );
}

// Export as Fastify plugin
export default fp(securityPlugin, {
  name: "security",
  fastify: ">=4.0.0",
});

// Export types and utilities
export { getSecurityConfig };
export type { SecurityConfig };
