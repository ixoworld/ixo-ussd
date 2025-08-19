/**
 * Service Class Template Generator
 *
 * This module provides templates for generating service classes that integrate
 * with the External Service Pattern used throughout the SupaMoto USSD server.
 *
 * @module service-template
 * @version 1.0.0
 */

import type {
  GeneratedMachineSpec,
  MachineCategory,
} from "../types/generator-types.js";

/**
 * Service template configuration
 */
export interface ServiceTemplateConfig {
  /** Whether to include error handling */
  includeErrorHandling: boolean;

  /** Whether to include logging */
  includeLogging: boolean;

  /** Whether to include validation */
  includeValidation: boolean;

  /** Whether to include caching */
  includeCaching: boolean;

  /** Service style variant */
  variant: "basic" | "comprehensive" | "minimal";
}

/**
 * Default service template configuration
 */
export const DEFAULT_SERVICE_CONFIG: ServiceTemplateConfig = {
  includeErrorHandling: true,
  includeLogging: true,
  includeValidation: true,
  includeCaching: false,
  variant: "basic",
};

/**
 * Service template generator class
 */
export class ServiceTemplateGenerator {
  private config: ServiceTemplateConfig;

  constructor(config: Partial<ServiceTemplateConfig> = {}) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
  }

  /**
   * Generate service class for machine
   */
  generateService(spec: GeneratedMachineSpec): string {
    const parts = [
      this.generateServiceHeader(spec),
      this.generateServiceImports(spec),
      this.generateServiceTypes(spec),
      this.generateServiceClass(spec),
      this.generateServiceExports(spec),
    ];

    return parts.join("\n\n");
  }

  /**
   * Generate service file header
   */
  private generateServiceHeader(spec: GeneratedMachineSpec): string {
    const categoryDescription = this.getCategoryDescription(spec.category);

    return `/**
 * ${spec.name} Service - Generated Service Class
 *
 * Auto-generated service class for ${spec.name} machine following the
 * External Service Pattern used throughout the SupaMoto USSD server.
 *
 * This service provides ${categoryDescription} functionality and integrates
 * with the machine's actors for external operations.
 *
 * @module ${spec.name}Service
 * @category ${spec.category}
 * @generated true
 * @version 1.0.0
 */`;
  }

  /**
   * Generate service imports
   */
  private generateServiceImports(spec: GeneratedMachineSpec): string {
    const imports = ['import { logger } from "../utils/logger.js";'];

    // Add category-specific imports
    if (spec.category === "user-machine") {
      imports.push(
        'import { validatePhoneNumber } from "../utils/validation.js";',
        'import { getUserSession, updateUserSession } from "./session.js";'
      );
    }

    if (spec.category === "agent-machine") {
      imports.push(
        'import { validateAgentCredentials } from "./agent.js";',
        'import { getAgentPermissions } from "./permissions.js";'
      );
    }

    if (spec.category === "account-machine") {
      imports.push(
        'import { getAccountBalance, updateAccountBalance } from "./account.js";',
        'import { validateAccountAccess } from "../utils/validation.js";'
      );
    }

    if (this.config.includeValidation) {
      imports.push('import { validateInput } from "../utils/validation.js";');
    }

    if (this.config.includeCaching) {
      imports.push('import { cache } from "../utils/cache.js";');
    }

    return imports.join("\n");
  }

  /**
   * Generate service types
   */
  private generateServiceTypes(spec: GeneratedMachineSpec): string {
    const serviceTypes = this.generateServiceInterfaces(spec);
    const errorTypes = this.generateErrorTypes(spec);

    return `${serviceTypes}\n\n${errorTypes}`;
  }

  /**
   * Generate service interfaces
   */
  private generateServiceInterfaces(spec: GeneratedMachineSpec): string {
    const contextFields = spec.context
      .map(field => {
        const optional = field.optional ? "?" : "";
        return `  ${field.name}${optional}: ${field.type};`;
      })
      .join("\n");

    return `/**
 * Service input interface
 */
export interface ${spec.name}ServiceInput {
${contextFields || "  // No specific input fields"}
}

/**
 * Service output interface
 */
export interface ${spec.name}ServiceOutput {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Service configuration interface
 */
export interface ${spec.name}ServiceConfig {
  timeout?: number;
  retries?: number;
  validateInput?: boolean;
  enableLogging?: boolean;
}`;
  }

  /**
   * Generate error types
   */
  private generateErrorTypes(spec: GeneratedMachineSpec): string {
    return `/**
 * Service error types
 */
export enum ${spec.name}ServiceError {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Service error class
 */
export class ${spec.name}ServiceException extends Error {
  constructor(
    public readonly type: ${spec.name}ServiceError,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "${spec.name}ServiceException";
  }
}`;
  }

  /**
   * Generate main service class
   */
  private generateServiceClass(spec: GeneratedMachineSpec): string {
    const methods = this.generateServiceMethods(spec);
    const helpers = this.generateHelperMethods(spec);

    return `/**
 * ${spec.name} Service Class
 */
export class ${spec.name}Service {
  private config: ${spec.name}ServiceConfig;

  constructor(config: Partial<${spec.name}ServiceConfig> = {}) {
    this.config = {
      timeout: 5000,
      retries: 3,
      validateInput: true,
      enableLogging: true,
      ...config,
    };
  }

${methods}

${helpers}
}`;
  }

  /**
   * Generate service methods
   */
  private generateServiceMethods(spec: GeneratedMachineSpec): string {
    const categoryMethods = this.getCategorySpecificMethods(spec);
    const commonMethods = this.generateCommonMethods(spec);

    return `${categoryMethods}\n\n${commonMethods}`;
  }

  /**
   * Generate category-specific methods
   */
  private getCategorySpecificMethods(spec: GeneratedMachineSpec): string {
    switch (spec.category) {
      case "user-machine":
        return this.generateUserServiceMethods(spec);
      case "agent-machine":
        return this.generateAgentServiceMethods(spec);
      case "account-machine":
        return this.generateAccountServiceMethods(spec);
      case "info-machine":
        return this.generateInfoServiceMethods(spec);
      case "core-machine":
        return this.generateCoreServiceMethods(spec);
      default:
        return this.generateGenericServiceMethods(spec);
    }
  }

  /**
   * Generate user service methods
   */
  private generateUserServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Validate user session and permissions
   */
  async validateUser(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Validating user for ${spec.name}`, { input });" : ""}

      ${
        this.config.includeValidation
          ? `
      if (this.config.validateInput) {
        this.validateUserInput(input);
      }`
          : ""
      }

      // Validate phone number format
      if (input.phoneNumber && !validatePhoneNumber(input.phoneNumber)) {
        throw new ${spec.name}ServiceException(
          ${spec.name}ServiceError.VALIDATION_ERROR,
          "Invalid phone number format"
        );
      }

      // Get user session
      const session = await getUserSession(input.phoneNumber || "");
      if (!session) {
        throw new ${spec.name}ServiceException(
          ${spec.name}ServiceError.NOT_FOUND_ERROR,
          "User session not found"
        );
      }

      return {
        success: true,
        data: session,
        message: "User validated successfully",
      };

    } catch (error) {
      return this.handleError(error, "validateUser");
    }
  }

  /**
   * Process user action
   */
  async processUserAction(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Processing user action for ${spec.name}`, { input });" : ""}

      // TODO: Implement specific user action processing
      // This would depend on the machine's purpose

      return {
        success: true,
        data: { processed: true },
        message: "User action processed successfully",
      };

    } catch (error) {
      return this.handleError(error, "processUserAction");
    }
  }`;
  }

  /**
   * Generate agent service methods
   */
  private generateAgentServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Validate agent credentials and permissions
   */
  async validateAgent(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Validating agent for ${spec.name}`, { input });" : ""}

      // Validate agent credentials
      const isValid = await validateAgentCredentials(input.agentId || "");
      if (!isValid) {
        throw new ${spec.name}ServiceException(
          ${spec.name}ServiceError.PERMISSION_ERROR,
          "Invalid agent credentials"
        );
      }

      // Get agent permissions
      const permissions = await getAgentPermissions(input.agentId || "");

      return {
        success: true,
        data: { permissions },
        message: "Agent validated successfully",
      };

    } catch (error) {
      return this.handleError(error, "validateAgent");
    }
  }

  /**
   * Process agent operation
   */
  async processAgentOperation(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Processing agent operation for ${spec.name}`, { input });" : ""}

      // TODO: Implement specific agent operation processing

      return {
        success: true,
        data: { processed: true },
        message: "Agent operation processed successfully",
      };

    } catch (error) {
      return this.handleError(error, "processAgentOperation");
    }
  }`;
  }

  /**
   * Generate account service methods
   */
  private generateAccountServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Get account information
   */
  async getAccountInfo(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Getting account info for ${spec.name}`, { input });" : ""}

      // Validate account access
      await validateAccountAccess(input.accountId || "");

      // Get account balance
      const balance = await getAccountBalance(input.accountId || "");

      return {
        success: true,
        data: { balance },
        message: "Account information retrieved successfully",
      };

    } catch (error) {
      return this.handleError(error, "getAccountInfo");
    }
  }

  /**
   * Update account information
   */
  async updateAccount(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Updating account for ${spec.name}`, { input });" : ""}

      // TODO: Implement account update logic

      return {
        success: true,
        data: { updated: true },
        message: "Account updated successfully",
      };

    } catch (error) {
      return this.handleError(error, "updateAccount");
    }
  }`;
  }

  /**
   * Generate info service methods
   */
  private generateInfoServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Get information content
   */
  async getInformation(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Getting information for ${spec.name}`, { input });" : ""}

      // TODO: Implement information retrieval logic
      const content = "Information content placeholder";

      return {
        success: true,
        data: { content },
        message: "Information retrieved successfully",
      };

    } catch (error) {
      return this.handleError(error, "getInformation");
    }
  }`;
  }

  /**
   * Generate core service methods
   */
  private generateCoreServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Route to appropriate service
   */
  async routeRequest(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Routing request for ${spec.name}`, { input });" : ""}

      // TODO: Implement routing logic

      return {
        success: true,
        data: { routed: true },
        message: "Request routed successfully",
      };

    } catch (error) {
      return this.handleError(error, "routeRequest");
    }
  }`;
  }

  /**
   * Generate generic service methods
   */
  private generateGenericServiceMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Process generic operation
   */
  async processOperation(input: ${spec.name}ServiceInput): Promise<${spec.name}ServiceOutput> {
    try {
      ${this.config.includeLogging ? "logger.info(`Processing operation for ${spec.name}`, { input });" : ""}

      // TODO: Implement specific operation logic

      return {
        success: true,
        data: { processed: true },
        message: "Operation processed successfully",
      };

    } catch (error) {
      return this.handleError(error, "processOperation");
    }
  }`;
  }

  /**
   * Generate common methods
   */
  private generateCommonMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Health check for service
   */
  async healthCheck(): Promise<${spec.name}ServiceOutput> {
    try {
      // TODO: Implement health check logic
      return {
        success: true,
        data: { status: "healthy" },
        message: "Service is healthy",
      };
    } catch (error) {
      return this.handleError(error, "healthCheck");
    }
  }`;
  }

  /**
   * Generate helper methods
   */
  private generateHelperMethods(spec: GeneratedMachineSpec): string {
    const errorHandler = this.generateErrorHandler(spec);
    const validation = this.config.includeValidation
      ? this.generateValidationMethods(spec)
      : "";

    return `${errorHandler}${validation ? "\n\n" + validation : ""}`;
  }

  /**
   * Generate error handler
   */
  private generateErrorHandler(spec: GeneratedMachineSpec): string {
    return `  /**
   * Handle service errors
   */
  private handleError(error: any, operation: string): ${spec.name}ServiceOutput {
    ${this.config.includeLogging ? `logger.error(\`Error in \${operation} for ${spec.name}\`, { error });` : ""}

    if (error instanceof ${spec.name}ServiceException) {
      return {
        success: false,
        error: error.type,
        message: error.message,
      };
    }

    return {
      success: false,
      error: ${spec.name}ServiceError.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    };
  }`;
  }

  /**
   * Generate validation methods
   */
  private generateValidationMethods(spec: GeneratedMachineSpec): string {
    return `  /**
   * Validate service input
   */
  private validateUserInput(input: ${spec.name}ServiceInput): void {
    if (!input || typeof input !== "object") {
      throw new ${spec.name}ServiceException(
        ${spec.name}ServiceError.VALIDATION_ERROR,
        "Invalid input: must be an object"
      );
    }

    // TODO: Add specific validation rules based on context fields
    ${spec.context
      .map(field => {
        if (!field.optional) {
          return `if (!input.${field.name}) {
      throw new ${spec.name}ServiceException(
        ${spec.name}ServiceError.VALIDATION_ERROR,
        "Missing required field: ${field.name}"
      );
    }`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n    ")}
  }`;
  }

  /**
   * Generate service exports
   */
  private generateServiceExports(spec: GeneratedMachineSpec): string {
    return `// Export service class and types
export default ${spec.name}Service;

// Export convenience instance
export const ${spec.id}Service = new ${spec.name}Service();

// Export all types
export type {
  ${spec.name}ServiceInput,
  ${spec.name}ServiceOutput,
  ${spec.name}ServiceConfig,
};`;
  }

  /**
   * Get description for machine category
   */
  private getCategoryDescription(category: MachineCategory): string {
    const descriptions = {
      "info-machine": "information retrieval and display",
      "user-machine": "authenticated user operations",
      "agent-machine": "agent workflow and permissions",
      "account-machine": "account management and balance operations",
      "core-machine": "core system routing and orchestration",
    };

    return descriptions[category] || "general service operations";
  }
}

/**
 * Convenience function to generate service code
 */
export function generateServiceCode(
  spec: GeneratedMachineSpec,
  config?: Partial<ServiceTemplateConfig>
): string {
  const generator = new ServiceTemplateGenerator(config);
  return generator.generateService(spec);
}
