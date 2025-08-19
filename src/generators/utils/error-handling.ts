/**
 * Error Handling and Reporting
 *
 * This module provides comprehensive error handling, reporting, and recovery
 * mechanisms for the code generation system.
 *
 * @module error-handling
 * @version 1.0.0
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type {
  ValidationError,
  ValidationWarning,
} from "../types/generator-types.js";

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  DEBUG = "debug",
}

/**
 * Error category types
 */
export enum ErrorCategory {
  PARSING = "parsing",
  VALIDATION = "validation",
  GENERATION = "generation",
  FILE_SYSTEM = "file_system",
  COMPILATION = "compilation",
  BUSINESS_RULE = "business_rule",
  CONFIGURATION = "configuration",
  NETWORK = "network",
  UNKNOWN = "unknown",
}

/**
 * Enhanced error interface
 */
export interface EnhancedError {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  details?: string;
  suggestion?: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  context?: Record<string, any>;
  recoverable: boolean;
  retryCount?: number;
}

/**
 * Error report interface
 */
export interface ErrorReport {
  summary: {
    totalErrors: number;
    criticalErrors: number;
    errors: number;
    warnings: number;
    infos: number;
    debugs: number;
  };
  errors: EnhancedError[];
  generatedAt: number;
  duration: number;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: number;
  };
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Maximum number of errors before stopping */
  maxErrors: number;

  /** Maximum retry attempts for recoverable errors */
  maxRetries: number;

  /** Whether to generate error reports */
  generateReports: boolean;

  /** Directory for error reports */
  reportDir: string;

  /** Whether to include stack traces */
  includeStackTraces: boolean;

  /** Whether to include system context */
  includeSystemContext: boolean;

  /** Minimum severity level to report */
  minSeverity: ErrorSeverity;
}

/**
 * Default error handling configuration
 */
export const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  maxErrors: 50,
  maxRetries: 3,
  generateReports: true,
  reportDir: ".error-reports",
  includeStackTraces: true,
  includeSystemContext: true,
  minSeverity: ErrorSeverity.WARNING,
};

/**
 * Error handler class
 */
export class ErrorHandler {
  private config: ErrorHandlingConfig;
  private errors: EnhancedError[];
  private startTime: number;
  private errorCount: Map<ErrorCategory, number>;

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
    this.errors = [];
    this.startTime = Date.now();
    this.errorCount = new Map();
  }

  /**
   * Add an error to the handler
   */
  addError(
    severity: ErrorSeverity,
    category: ErrorCategory,
    message: string,
    options: {
      details?: string;
      suggestion?: string;
      file?: string;
      line?: number;
      column?: number;
      context?: Record<string, any>;
      recoverable?: boolean;
      error?: Error;
    } = {}
  ): string {
    const errorId = this.generateErrorId();

    const enhancedError: EnhancedError = {
      id: errorId,
      timestamp: Date.now(),
      severity,
      category,
      message,
      details: options.details,
      suggestion: options.suggestion,
      file: options.file,
      line: options.line,
      column: options.column,
      context: options.context,
      recoverable: options.recoverable ?? false,
      retryCount: 0,
    };

    // Add stack trace if available and enabled
    if (this.config.includeStackTraces && options.error) {
      enhancedError.stack = options.error.stack;
    }

    // Only add if meets minimum severity
    if (this.shouldReportError(severity)) {
      this.errors.push(enhancedError);
      this.updateErrorCount(category);
    }

    // Check if we should stop due to too many errors
    if (this.shouldStopOnErrors()) {
      throw new Error(
        `Too many errors encountered (${this.errors.length}). Stopping execution.`
      );
    }

    return errorId;
  }

  /**
   * Add critical error
   */
  critical(category: ErrorCategory, message: string, options?: any): string {
    return this.addError(ErrorSeverity.CRITICAL, category, message, options);
  }

  /**
   * Add error
   */
  error(category: ErrorCategory, message: string, options?: any): string {
    return this.addError(ErrorSeverity.ERROR, category, message, options);
  }

  /**
   * Add warning
   */
  warning(category: ErrorCategory, message: string, options?: any): string {
    return this.addError(ErrorSeverity.WARNING, category, message, options);
  }

  /**
   * Add info
   */
  info(category: ErrorCategory, message: string, options?: any): string {
    return this.addError(ErrorSeverity.INFO, category, message, options);
  }

  /**
   * Add debug message
   */
  debug(category: ErrorCategory, message: string, options?: any): string {
    return this.addError(ErrorSeverity.DEBUG, category, message, options);
  }

  /**
   * Convert validation errors to enhanced errors
   */
  addValidationErrors(validationErrors: ValidationError[]): void {
    validationErrors.forEach(error => {
      this.error(ErrorCategory.VALIDATION, error.message, {
        file: error.type,
        line: error.line,
        suggestion: error.suggestion,
        recoverable: false,
      });
    });
  }

  /**
   * Convert validation warnings to enhanced errors
   */
  addValidationWarnings(validationWarnings: ValidationWarning[]): void {
    validationWarnings.forEach(warning => {
      this.warning(ErrorCategory.VALIDATION, warning.message, {
        file: warning.type,
        line: warning.line,
        suggestion: warning.suggestion,
        recoverable: true,
      });
    });
  }

  /**
   * Retry a recoverable error
   */
  retryError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (!error || !error.recoverable) {
      return false;
    }

    error.retryCount = (error.retryCount || 0) + 1;

    if (error.retryCount > this.config.maxRetries) {
      error.recoverable = false;
      this.error(
        ErrorCategory.UNKNOWN,
        `Max retries exceeded for error: ${error.message}`,
        {
          context: { originalErrorId: errorId },
          recoverable: false,
        }
      );
      return false;
    }

    return true;
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recoverable: number;
    retried: number;
  } {
    const bySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = this.errors.filter(e => e.severity === severity).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );

    const byCategory = Object.values(ErrorCategory).reduce(
      (acc, category) => {
        acc[category] = this.errorCount.get(category) || 0;
        return acc;
      },
      {} as Record<ErrorCategory, number>
    );

    return {
      total: this.errors.length,
      bySeverity,
      byCategory,
      recoverable: this.errors.filter(e => e.recoverable).length,
      retried: this.errors.filter(e => (e.retryCount || 0) > 0).length,
    };
  }

  /**
   * Generate error report
   */
  generateReport(): ErrorReport {
    const stats = this.getStatistics();

    return {
      summary: {
        totalErrors: stats.total,
        criticalErrors: stats.bySeverity[ErrorSeverity.CRITICAL],
        errors: stats.bySeverity[ErrorSeverity.ERROR],
        warnings: stats.bySeverity[ErrorSeverity.WARNING],
        infos: stats.bySeverity[ErrorSeverity.INFO],
        debugs: stats.bySeverity[ErrorSeverity.DEBUG],
      },
      errors: [...this.errors],
      generatedAt: Date.now(),
      duration: Date.now() - this.startTime,
      systemInfo: this.getSystemInfo(),
    };
  }

  /**
   * Save error report to file
   */
  saveReport(filename?: string): string {
    if (!this.config.generateReports) {
      return "";
    }

    const report = this.generateReport();
    const reportFilename = filename || `error-report-${Date.now()}.json`;
    const reportPath = join(this.config.reportDir, reportFilename);

    // Ensure report directory exists
    const reportDir = dirname(reportPath);
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  /**
   * Get human-readable error summary
   */
  getSummary(): string {
    const stats = this.getStatistics();
    const lines = [];

    lines.push("Error Summary:");
    lines.push(`  Total: ${stats.total}`);

    if (stats.bySeverity[ErrorSeverity.CRITICAL] > 0) {
      lines.push(`  Critical: ${stats.bySeverity[ErrorSeverity.CRITICAL]}`);
    }

    if (stats.bySeverity[ErrorSeverity.ERROR] > 0) {
      lines.push(`  Errors: ${stats.bySeverity[ErrorSeverity.ERROR]}`);
    }

    if (stats.bySeverity[ErrorSeverity.WARNING] > 0) {
      lines.push(`  Warnings: ${stats.bySeverity[ErrorSeverity.WARNING]}`);
    }

    if (stats.recoverable > 0) {
      lines.push(`  Recoverable: ${stats.recoverable}`);
    }

    if (stats.retried > 0) {
      lines.push(`  Retried: ${stats.retried}`);
    }

    // Top error categories
    const topCategories = Object.entries(stats.byCategory)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topCategories.length > 0) {
      lines.push("Top Categories:");
      topCategories.forEach(([category, count]) => {
        lines.push(`  ${category}: ${count}`);
      });
    }

    return lines.join("\n");
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
    this.errorCount.clear();
    this.startTime = Date.now();
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some(e => e.severity === ErrorSeverity.CRITICAL);
  }

  /**
   * Check if there are any errors (not warnings)
   */
  hasErrors(): boolean {
    return this.errors.some(
      e =>
        e.severity === ErrorSeverity.CRITICAL ||
        e.severity === ErrorSeverity.ERROR
    );
  }

  /**
   * Get all errors of a specific severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): EnhancedError[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get all errors of a specific category
   */
  getErrorsByCategory(category: ErrorCategory): EnhancedError[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if error should be reported based on severity
   */
  private shouldReportError(severity: ErrorSeverity): boolean {
    const severityOrder = [
      ErrorSeverity.DEBUG,
      ErrorSeverity.INFO,
      ErrorSeverity.WARNING,
      ErrorSeverity.ERROR,
      ErrorSeverity.CRITICAL,
    ];

    const minIndex = severityOrder.indexOf(this.config.minSeverity);
    const errorIndex = severityOrder.indexOf(severity);

    return errorIndex >= minIndex;
  }

  /**
   * Check if we should stop due to too many errors
   */
  private shouldStopOnErrors(): boolean {
    const criticalAndErrors = this.errors.filter(
      e =>
        e.severity === ErrorSeverity.CRITICAL ||
        e.severity === ErrorSeverity.ERROR
    ).length;

    return criticalAndErrors >= this.config.maxErrors;
  }

  /**
   * Update error count by category
   */
  private updateErrorCount(category: ErrorCategory): void {
    this.errorCount.set(category, (this.errorCount.get(category) || 0) + 1);
  }

  /**
   * Get system information
   */
  private getSystemInfo(): {
    nodeVersion: string;
    platform: string;
    memory: number;
  } {
    if (!this.config.includeSystemContext) {
      return {
        nodeVersion: "hidden",
        platform: "hidden",
        memory: 0,
      };
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage().heapUsed,
    };
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Get or create global error handler
 */
export function getGlobalErrorHandler(
  config?: Partial<ErrorHandlingConfig>
): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler(config);
  }
  return globalErrorHandler;
}

/**
 * Reset global error handler
 */
export function resetGlobalErrorHandler(): void {
  globalErrorHandler = null;
}

/**
 * Convenience functions for global error handler
 */
export const globalError = {
  critical: (category: ErrorCategory, message: string, options?: any) =>
    getGlobalErrorHandler().critical(category, message, options),

  error: (category: ErrorCategory, message: string, options?: any) =>
    getGlobalErrorHandler().error(category, message, options),

  warning: (category: ErrorCategory, message: string, options?: any) =>
    getGlobalErrorHandler().warning(category, message, options),

  info: (category: ErrorCategory, message: string, options?: any) =>
    getGlobalErrorHandler().info(category, message, options),

  debug: (category: ErrorCategory, message: string, options?: any) =>
    getGlobalErrorHandler().debug(category, message, options),
};
