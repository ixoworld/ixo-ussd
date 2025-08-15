import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ZodError, z } from "zod";
import { createModuleLogger } from "../services/logger.js";

const logger = createModuleLogger("validation");

/**
 * Validation Plugin for Fastify
 *
 * Integrates Zod schemas with Fastify's validation system
 * Provides consistent error handling and logging
 */

interface ValidationOptions {
  body?: z.ZodSchema;
  querystring?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

interface ValidationError {
  message: string;
  field?: string;
  code: string;
  details?: any;
}

/**
 * Format Zod errors into a consistent structure
 */
function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map(err => ({
    message: err.message,
    field: err.path.join("."),
    code: err.code,
    details: {
      ...(Object.prototype.hasOwnProperty.call(err, "expected") && {
        expected: (err as any).expected,
      }),
      ...(Object.prototype.hasOwnProperty.call(err, "received") && {
        received: (err as any).received,
      }),
      path: err.path,
    },
  }));
}

/**
 * Create validation preHandler for a specific schema
 */
function createValidationHandler(
  schema: z.ZodSchema,
  property: "body" | "query" | "params" | "headers"
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dataToValidate = request[property];

      logger.debug(
        {
          route: request.routeOptions?.url,
          method: request.method,
          hasData: !!dataToValidate,
        },
        `Validating ${property}`
      );

      const validatedData = schema.parse(dataToValidate);

      // Replace the request property with validated data
      (request as any)[property] = validatedData;

      logger.debug(
        {
          route: request.routeOptions?.url,
          method: request.method,
        },
        `Validation successful for ${property}`
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = formatZodError(error);

        logger.warn(
          {
            route: request.routeOptions?.url,
            method: request.method,
            errors: validationErrors,
            data: request[property],
          },
          `Validation failed for ${property}`
        );

        return reply.status(400).send({
          error: "Validation Error",
          message: `Invalid ${property} data`,
          details: validationErrors,
        });
      }

      logger.error(
        {
          route: request.routeOptions?.url,
          method: request.method,
          error: error instanceof Error ? error.message : String(error),
        },
        `Unexpected validation error for ${property}`
      );

      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Validation processing failed",
      });
    }
  };
}

/**
 * Validation plugin
 */
async function validationPlugin(fastify: FastifyInstance) {
  /**
   * Add validation decorator to routes
   *
   * Usage:
   * fastify.post('/api/endpoint', {
   *   preHandler: fastify.validate({
   *     body: ussdRequestSchema,
   *     querystring: someQuerySchema
   *   })
   * }, handler)
   */
  fastify.decorate("validate", (options: ValidationOptions) => {
    const handlers: Array<
      (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    > = [];

    if (options.body) {
      handlers.push(createValidationHandler(options.body, "body"));
    }

    if (options.querystring) {
      handlers.push(createValidationHandler(options.querystring, "query"));
    }

    if (options.params) {
      handlers.push(createValidationHandler(options.params, "params"));
    }

    if (options.headers) {
      handlers.push(createValidationHandler(options.headers, "headers"));
    }

    // Return single handler or array of handlers
    return handlers.length === 1 ? handlers[0] : handlers;
  });

  /**
   * Add schema validation helper for manual validation
   */
  fastify.decorate(
    "validateData",
    <T>(schema: z.ZodSchema<T>, data: unknown) => {
      try {
        return {
          success: true as const,
          data: schema.parse(data),
        };
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            success: false as const,
            errors: formatZodError(error),
          };
        }
        return {
          success: false as const,
          errors: [
            {
              message: "Validation failed",
              code: "UNKNOWN_ERROR",
              details: { error: String(error) },
            },
          ],
        };
      }
    }
  );

  /**
   * Add quick validation decorators for common schemas
   */
  fastify.decorate("validateUSSDRequest", () => {
    return createValidationHandler(
      z.object({
        sessionId: z.string(),
        serviceCode: z.string(),
        phoneNumber: z.string(),
        text: z.string().optional().default(""),
      }),
      "body"
    );
  });

  fastify.decorate("validatePhoneNumber", () => {
    return createValidationHandler(
      z.object({
        phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
      }),
      "body"
    );
  });

  logger.info("Validation plugin registered successfully");
}

// Export as Fastify plugin
export default fp(validationPlugin, {
  name: "validation",
  fastify: ">=4.0.0",
});

// Export types for TypeScript support
export type { ValidationOptions, ValidationError };

// Extend Fastify types to include our decorators
declare module "fastify" {
  interface FastifyInstance {
    validate(options: ValidationOptions): any;
    validateData<T>(
      schema: z.ZodSchema<T>,
      data: unknown
    ):
      | { success: true; data: T }
      | { success: false; errors: ValidationError[] };
    validateUSSDRequest(): any;
    validatePhoneNumber(): any;
  }
}
