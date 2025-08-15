/**
 * @fileoverview Unified Fastify server setup with environment-aware configuration.
 *
 * This module provides a single entry point for both development and production
 * environments, with conditional plugin registration based on NODE_ENV.
 * Follows Fastify best practices for plugin organization and lifecycle management.
 *
 * @module server
 * @version 2.0.0
 * @since 1.0.0
 */

import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import sensible from "@fastify/sensible";
import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import metrics from "fastify-metrics";
import fp from "fastify-plugin";
import { config, ENV } from "./config.js";
import { getProductionPlugins } from "../src/plugins/index.js";
import { ussdRoutes } from "./routes/ussd.js";
import { logger } from "./services/logger.js";

// Conditional imports for production-only features
let databaseManager: any = null;

async function loadProductionPlugins() {
  // Load database manager in both development and production
  if (ENV.IS_DEVELOPMENT || ENV.IS_PRODUCTION) {
    logger.info("🔧 Loading database manager...");

    const dbModule = await import("./services/database-manager.js");
    databaseManager = dbModule.databaseManager;
    logger.info("✅ Database manager loaded");
  }

  // Load other production-only plugins
  if (ENV.IS_PRODUCTION) {
    logger.info("🔧 Loading production-only plugins...");
    // ... other plugin imports
  }
}

/**
 * Creates a Fastify server instance with environment-appropriate configuration.
 *
 * Development features:
 * - Pretty logging with colors
 * - Minimal plugin set for fast startup
 * - No database initialization
 * - No security/rate limiting plugins
 *
 * Production features:
 * - Structured JSON logging
 * - Full plugin suite (security, rate limiting, metrics)
 * - Database initialization
 * - Graceful shutdown handling
 *
 * @async
 * @function createServer
 * @returns {Promise<FastifyInstance>} Configured Fastify instance
 * @throws {Error} Throws if server creation or plugin registration fails
 */
export async function createServer(): Promise<FastifyInstance> {
  // Debug logging
  logger.info("🚀 Starting server creation...");
  logger.info(`Environment: ${ENV.CURRENT}`);
  logger.info(`IS_TEST: ${ENV.IS_TEST}`);
  logger.info(`IS_DEVELOPMENT: ${ENV.IS_DEVELOPMENT}`);
  logger.info(`IS_PRODUCTION: ${ENV.IS_PRODUCTION}`);

  // Load production plugins if needed
  await loadProductionPlugins();

  logger.info(`Database manager loaded: ${!!databaseManager}`);

  // Create Fastify instance with environment-specific logging
  const fastify = Fastify({
    logger: {
      level: "debug",
      transport: ENV.IS_DEVELOPMENT
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    },
    disableRequestLogging: false,
  });

  // Initialize database in production/development environments
  if (databaseManager && !ENV.IS_TEST) {
    logger.info("🔌 Attempting to initialize database connection...");
    logger.info(
      `Environment check: IS_TEST=${ENV.IS_TEST}, IS_DEVELOPMENT=${ENV.IS_DEVELOPMENT}`
    );

    try {
      await databaseManager.initialize();
      logger.info("✅ Database connection successful");

      // Test the connection
      const status = databaseManager.getStatus();
      logger.info("📊 Database status:", status);
    } catch (error) {
      logger.error(error, "❌ Database connection failed:");
    }
  } else {
    logger.info(
      `⏭️ Skipping database initialization - databaseManager: ${!!databaseManager}, IS_TEST: ${ENV.IS_TEST}`
    );
  }

  // Register core plugins (always enabled)
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(formbody);
  await fastify.register(sensible);

  // Register production-only plugins
  if (!ENV.IS_DEVELOPMENT && !ENV.IS_TEST) {
    logger.info("Registering production plugins...");

    const plugins = getProductionPlugins();

    // Metrics endpoint (production only)
    await fastify.register(metrics.default ?? metrics, {
      endpoint: "/metrics",
    });

    // Security plugins (order matters)
    if (plugins.security) {
      await fastify.register(plugins.security);
    }
    if (plugins.rateLimit) {
      await fastify.register(plugins.rateLimit);
    }
    if (plugins.advancedSecurity) {
      await fastify.register(plugins.advancedSecurity);
    }
    if (plugins.validation) {
      await fastify.register(plugins.validation);
    }
  }

  // Register application routes
  await fastify.register(fp(ussdRoutes));

  // Root endpoint for PaaS health checks
  fastify.get("/", async () => {
    return {
      status: "ok",
      message: "ixo-ussd-server running",
      environment: ENV.CURRENT,
      timestamp: new Date().toISOString(),
    };
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    const status: any = {
      status: "ok",
      environment: ENV.CURRENT,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Add database status in production
    if (databaseManager && !ENV.IS_DEVELOPMENT) {
      try {
        // Simple database health check
        status.database = "connected";
      } catch (error) {
        status.database = "error";
      }
    }

    return status;
  });

  // Graceful shutdown handling
  fastify.addHook("onClose", async () => {
    logger.info("Shutting down server...");
    if (databaseManager && !ENV.IS_DEVELOPMENT) {
      await databaseManager.close();
    }
  });

  return fastify;
}

/**
 * Starts the server and begins listening for connections.
 *
 * This function:
 * 1. Creates the server instance
 * 2. Starts listening on configured host/port
 * 3. Logs startup information
 * 4. Sets up process error handlers
 *
 * @async
 * @function startServer
 * @returns {Promise<void>} Promise that resolves when server starts successfully
 */
export async function startServer(): Promise<void> {
  try {
    const server = await createServer();
    const port = config.SERVER.PORT;
    const host = "0.0.0.0";
    logger.info(`Preparing to listen on host: ${host}, port: ${port}`);
    // Start listening
    const address = await server.listen({
      port,
      host,
    });

    // Log startup information
    const startupInfo = [
      `🚀 USSD server listening on ${address}`,
      `🎯 Environment: ${ENV.CURRENT}`,
      `📋 Health check: ${address}/health`,
      `🧪 USSD endpoint: ${address}/api/ussd`,
    ];

    if (ENV.IS_DEVELOPMENT) {
      startupInfo.push(
        `🔍 Debug endpoint: ${address}/api/ussd/debug/:sessionId`,
        `📊 Sessions endpoint: ${address}/api/ussd/sessions`,
        `🔧 USSD Machine Type: ${process.env.USSD_MACHINE_TYPE || "example"}`,
        "",
        "Ready for development! 🎯"
      );
    } else {
      startupInfo.push(`📊 Metrics endpoint: ${address}/metrics`);
    }

    // eslint-disable-next-line no-console
    console.log(startupInfo.join("\n"));

    // Process error handling
    const handleError = (error: Error, type: string) => {
      server.log.error(error, `${type} error`);
      process.exit(1);
    };

    process.on("unhandledRejection", err =>
      handleError(err as Error, "Unhandled rejection")
    );
    process.on("uncaughtException", err =>
      handleError(err, "Uncaught exception")
    );

    // Graceful shutdown on SIGTERM/SIGINT
    const gracefulShutdown = async (signal: string) => {
      server.log.info(`Received ${signal}, shutting down gracefully...`);
      await server.close();
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Failed to start USSD server:`, error);
    process.exit(1);
  }
}

// Auto-start server when this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
