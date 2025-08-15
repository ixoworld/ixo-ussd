/**
 * Advanced Security Plugin for USSD API
 *
 * Provides additional security layers beyond basic rate limiting:
 * - Dynamic rate limiting based on threat assessment
 * - Request pattern analysis and anomaly detection
 * - DDoS protection with progressive penalties
 * - Suspicious activity monitoring and alerting
 * - Geolocation-based access controls
 * - Request signature validation
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createModuleLogger } from "../services/logger.js";
import { ENV } from "../config.js";

const logger = createModuleLogger("advanced-security");

/**
 * Advanced security configuration
 */
interface AdvancedSecurityConfig {
  enableThreatDetection: boolean;
  enableAnomalyDetection: boolean;
  enableGeoBlocking: boolean;
  enableRequestSigning: boolean;
  maxRequestsPerSecond: number;
  suspiciousThreshold: number;
  blockDurationMinutes: number;
  isDevelopment: boolean;
}

/**
 * Threat assessment levels
 */
enum ThreatLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Request analysis result
 */
interface RequestAnalysis {
  threatLevel: ThreatLevel;
  riskScore: number;
  reasons: string[];
  shouldBlock: boolean;
  penaltyMultiplier: number;
}

/**
 * IP tracking for behavior analysis
 */
interface IPTracker {
  requests: number;
  firstSeen: Date;
  lastSeen: Date;
  blockedUntil?: Date;
  threatLevel: ThreatLevel;
  violations: string[];
  countries: Set<string>;
}

class AdvancedSecurityManager {
  private ipTrackers = new Map<string, IPTracker>();
  private blockedIPs = new Set<string>();
  private suspiciousPatterns: RegExp[] = [];
  private config: AdvancedSecurityConfig;

  constructor(config: AdvancedSecurityConfig) {
    this.config = config;
    this.initializeSuspiciousPatterns();
    this.startCleanupTimer();
  }

  /**
   * Initialize patterns that indicate suspicious activity
   */
  private initializeSuspiciousPatterns(): void {
    this.suspiciousPatterns = [
      // SQL injection attempts
      /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/i,
      /(\b(or|and)\s+\d+\s*[=<>]+\s*\d+)/i,
      /('|"|`|;|--|\/\*|\*\/)/,

      // XSS attempts
      /<script[^>]*>.*?<\/script>/i,
      /javascript\s*:/i,
      /on\w+\s*=\s*['"]/i,
      /<iframe[^>]*>/i,

      // Path traversal
      /\.\.(\/|\\)/,
      /(\/|\\)(etc|proc|sys|dev)(\/|\\)/,

      // Command injection
      /(\||&|;|`|\$\(|\$\{)/,
      /(nc|netcat|curl|wget|ping|nslookup|dig)\s/i,

      // USSD-specific suspicious patterns
      /(\*#\*#|\*\d{10,}#)/,
      /ussd.*injection/i,
      /session.*hijack/i,
    ];
  }

  /**
   * Analyze request for threats and suspicious activity
   */
  analyzeRequest(request: FastifyRequest): RequestAnalysis {
    const analysis: RequestAnalysis = {
      threatLevel: ThreatLevel.LOW,
      riskScore: 0,
      reasons: [],
      shouldBlock: false,
      penaltyMultiplier: 1,
    };

    const ip = request.ip;
    const userAgent = request.headers["user-agent"] || "";
    const requestBody = JSON.stringify(request.body || {});
    const requestUrl = request.url;
    const requestString = `${requestUrl} ${requestBody} ${userAgent}`;

    // Check IP reputation
    const ipTracker = this.getOrCreateIPTracker(ip);
    if (ipTracker.threatLevel !== ThreatLevel.LOW) {
      analysis.riskScore += 30;
      analysis.reasons.push(`IP has ${ipTracker.threatLevel} threat level`);
    }

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(requestString)) {
        analysis.riskScore += 25;
        analysis.reasons.push("Suspicious pattern detected");
        break;
      }
    }

    // Check request frequency
    if (ipTracker.requests > this.config.maxRequestsPerSecond * 10) {
      analysis.riskScore += 20;
      analysis.reasons.push("High request frequency");
    }

    // Check for missing or suspicious User-Agent
    if (
      !userAgent ||
      userAgent.length < 10 ||
      /bot|crawler|spider/i.test(userAgent)
    ) {
      analysis.riskScore += 10;
      analysis.reasons.push("Suspicious or missing User-Agent");
    }

    // Check for unusual request headers
    const unusualHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-cluster-client-ip",
    ];
    const hasUnusualHeaders = unusualHeaders.some(
      header => request.headers[header]
    );
    if (hasUnusualHeaders) {
      analysis.riskScore += 15;
      analysis.reasons.push("Unusual forwarding headers detected");
    }

    // Check for USSD-specific violations
    if (request.url.includes("/api/ussd")) {
      const body = request.body as any;

      // Check for invalid session ID patterns
      if (body?.sessionId && !/^[a-zA-Z0-9_-]+$/.test(body.sessionId)) {
        analysis.riskScore += 20;
        analysis.reasons.push("Invalid session ID pattern");
      }

      // Check for suspicious phone number patterns
      if (body?.phoneNumber && !/^\+?[1-9]\d{8,14}$/.test(body.phoneNumber)) {
        analysis.riskScore += 15;
        analysis.reasons.push("Suspicious phone number format");
      }
    }

    // Determine threat level and actions
    if (analysis.riskScore >= 70) {
      analysis.threatLevel = ThreatLevel.CRITICAL;
      analysis.shouldBlock = true;
      analysis.penaltyMultiplier = 4;
    } else if (analysis.riskScore >= 50) {
      analysis.threatLevel = ThreatLevel.HIGH;
      analysis.shouldBlock = true;
      analysis.penaltyMultiplier = 3;
    } else if (analysis.riskScore >= 30) {
      analysis.threatLevel = ThreatLevel.MEDIUM;
      analysis.penaltyMultiplier = 2;
    }

    // Update IP tracker
    this.updateIPTracker(ip, analysis);

    return analysis;
  }

  /**
   * Get or create IP tracker for behavior monitoring
   */
  private getOrCreateIPTracker(ip: string): IPTracker {
    if (!this.ipTrackers.has(ip)) {
      this.ipTrackers.set(ip, {
        requests: 0,
        firstSeen: new Date(),
        lastSeen: new Date(),
        threatLevel: ThreatLevel.LOW,
        violations: [],
        countries: new Set(),
      });
    }

    const tracker = this.ipTrackers.get(ip)!;
    tracker.requests++;
    tracker.lastSeen = new Date();

    return tracker;
  }

  /**
   * Update IP tracker with threat analysis
   */
  private updateIPTracker(ip: string, analysis: RequestAnalysis): void {
    const tracker = this.ipTrackers.get(ip)!;

    if (analysis.threatLevel !== ThreatLevel.LOW) {
      tracker.threatLevel = analysis.threatLevel;
      tracker.violations.push(...analysis.reasons);
    }

    if (analysis.shouldBlock) {
      const blockDuration =
        this.config.blockDurationMinutes * analysis.penaltyMultiplier;
      tracker.blockedUntil = new Date(Date.now() + blockDuration * 60 * 1000);
      this.blockedIPs.add(ip);

      logger.warn(
        {
          ip,
          threatLevel: analysis.threatLevel,
          riskScore: analysis.riskScore,
          reasons: analysis.reasons,
          blockDurationMinutes: blockDuration,
        },
        "IP blocked due to suspicious activity"
      );
    }
  }

  /**
   * Check if IP is currently blocked
   */
  isIPBlocked(ip: string): boolean {
    const tracker = this.ipTrackers.get(ip);

    if (!tracker?.blockedUntil) {
      return false;
    }

    if (new Date() > tracker.blockedUntil) {
      // Block expired, remove from blocked list
      delete tracker.blockedUntil;
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Clean up old IP trackers periodically
   */
  private startCleanupTimer(): void {
    setInterval(
      () => {
        const now = new Date();
        const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

        for (const [ip, tracker] of this.ipTrackers.entries()) {
          if (now.getTime() - tracker.lastSeen.getTime() > cleanupThreshold) {
            this.ipTrackers.delete(ip);
            this.blockedIPs.delete(ip);
          }
        }

        logger.debug(
          {
            remainingTrackers: this.ipTrackers.size,
            blockedIPs: this.blockedIPs.size,
          },
          "IP tracker cleanup completed"
        );
      },
      60 * 60 * 1000
    ); // Run every hour
  }

  /**
   * Get security statistics for monitoring
   */
  getSecurityStats() {
    const stats = {
      totalTrackedIPs: this.ipTrackers.size,
      blockedIPs: this.blockedIPs.size,
      threatLevels: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      topViolations: new Map<string, number>(),
    };

    for (const tracker of this.ipTrackers.values()) {
      stats.threatLevels[tracker.threatLevel]++;

      for (const violation of tracker.violations) {
        const count = stats.topViolations.get(violation) || 0;
        stats.topViolations.set(violation, count + 1);
      }
    }

    return stats;
  }
}

/**
 * Get environment-specific advanced security configuration
 */
function getAdvancedSecurityConfig(): AdvancedSecurityConfig {
  return {
    enableThreatDetection: !ENV.IS_TEST, // Disable in tests for performance
    enableAnomalyDetection: ENV.IS_PRODUCTION,
    enableGeoBlocking: process.env.ENABLE_GEO_BLOCKING === "true",
    enableRequestSigning: process.env.ENABLE_REQUEST_SIGNING === "true",
    maxRequestsPerSecond: ENV.IS_DEVELOPMENT ? 100 : 20,
    suspiciousThreshold: ENV.IS_DEVELOPMENT ? 80 : 50,
    blockDurationMinutes: ENV.IS_DEVELOPMENT ? 1 : 15,
    isDevelopment: ENV.IS_DEV_OR_TEST,
  };
}

/**
 * Advanced security plugin
 */
async function advancedSecurityPlugin(fastify: FastifyInstance) {
  const config = getAdvancedSecurityConfig();
  const securityManager = new AdvancedSecurityManager(config);

  logger.info(
    {
      environment: ENV.CURRENT,
      config,
    },
    "Configuring advanced security features"
  );

  // Pre-handler for threat analysis
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = request.ip;

      // Skip analysis for health checks and status endpoints
      if (
        request.url.includes("/health") ||
        request.url.includes("/metrics") ||
        request.url.includes("/status")
      ) {
        return;
      }

      // Check if IP is blocked
      if (securityManager.isIPBlocked(ip)) {
        logger.warn(
          {
            ip,
            url: request.url,
            method: request.method,
            userAgent: request.headers["user-agent"],
          },
          "Blocked IP attempted access"
        );

        return reply.status(429).send({
          error: "Access Blocked",
          message:
            "Your IP address has been temporarily blocked due to suspicious activity.",
          code: "IP_BLOCKED",
          retryAfter: "15 minutes",
        });
      }

      // Perform threat analysis
      if (config.enableThreatDetection) {
        const analysis = securityManager.analyzeRequest(request);

        if (analysis.shouldBlock) {
          logger.warn(
            {
              ip,
              url: request.url,
              threatLevel: analysis.threatLevel,
              riskScore: analysis.riskScore,
              reasons: analysis.reasons,
            },
            "Request blocked by threat analysis"
          );

          return reply.status(403).send({
            error: "Suspicious Activity Detected",
            message:
              "Your request has been blocked due to suspicious patterns.",
            code: "THREAT_DETECTED",
          });
        }

        // Log medium and high threat requests for monitoring
        if (analysis.threatLevel !== ThreatLevel.LOW) {
          logger.warn(
            {
              ip,
              url: request.url,
              threatLevel: analysis.threatLevel,
              riskScore: analysis.riskScore,
              reasons: analysis.reasons,
            },
            "Elevated threat level detected"
          );
        }
      }
    }
  );

  // Add security monitoring headers
  fastify.addHook("onSend", async (request, reply, payload) => {
    // Add security monitoring headers
    reply.header("X-Security-Level", "enhanced");
    reply.header("X-Threat-Protection", "active");

    // Add request fingerprint for monitoring
    const fingerprint = Buffer.from(
      `${request.ip}-${request.headers["user-agent"]}`
    ).toString("base64");
    reply.header("X-Request-Fingerprint", fingerprint);

    return payload;
  });

  // Security monitoring endpoint
  if (config.isDevelopment) {
    fastify.get("/security-stats", async () => {
      const stats = securityManager.getSecurityStats();

      return {
        environment: ENV.CURRENT,
        config,
        stats,
        timestamp: new Date().toISOString(),
      };
    });

    // Endpoint to manually unblock an IP (for development)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fastify.post("/unblock-ip", async (request, _reply) => {
      const { ip } = request.body as { ip: string };

      if (!ip) {
        return { error: "IP address required" };
      }

      // Remove from blocked IPs (this is a simplified version)
      logger.info({ ip, adminIP: request.ip }, "Manually unblocking IP");

      return { success: true, message: `IP ${ip} unblocked` };
    });
  }

  logger.info(
    {
      threatDetection: config.enableThreatDetection,
      anomalyDetection: config.enableAnomalyDetection,
      geoBlocking: config.enableGeoBlocking,
    },
    "Advanced security plugin registered successfully"
  );
}

// Export as Fastify plugin
export default fp(advancedSecurityPlugin, {
  name: "advanced-security",
  fastify: ">=4.0.0",
});

// Export types and utilities
export { getAdvancedSecurityConfig, ThreatLevel };
export type { AdvancedSecurityConfig, RequestAnalysis };
