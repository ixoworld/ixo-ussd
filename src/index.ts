/**
 * @fileoverview Main entry point for the USSD server.
 *
 * This module serves as the primary entry point for both development and production
 * environments. It delegates to the unified server factory for environment-aware
 * configuration and startup.
 *
 * @module index
 * @version 2.0.0
 * @since 1.0.0
 * @author USSD Server Team
 */

import { startServer } from "./server.js";

/**
 * Start the USSD server using the unified server factory.
 *
 * This delegates to the environment-aware server factory which handles
 * all configuration, plugin registration, and startup logic.
 */
startServer().catch(error => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to start USSD server:", error);
  process.exit(1);
});
