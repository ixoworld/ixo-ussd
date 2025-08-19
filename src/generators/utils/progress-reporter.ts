/**
 * Progress Reporter Utility
 *
 * This module provides comprehensive progress reporting and verbose logging
 * capabilities for CLI commands and generation processes.
 *
 * @module progress-reporter
 * @version 1.0.0
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  VERBOSE = 3,
  DEBUG = 4,
}

/**
 * Progress step information
 */
export interface ProgressStep {
  id: string;
  name: string;
  description?: string;
  total?: number;
  current?: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * Progress reporter configuration
 */
export interface ProgressConfig {
  verbose: boolean;
  logLevel: LogLevel;
  showTimestamps: boolean;
  showProgress: boolean;
  useColors: boolean;
}

/**
 * Default progress configuration
 */
const DEFAULT_PROGRESS_CONFIG: ProgressConfig = {
  verbose: false,
  logLevel: LogLevel.INFO,
  showTimestamps: true,
  showProgress: true,
  useColors: true,
};

/**
 * ANSI color codes
 */
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

/**
 * Progress reporter class
 */
export class ProgressReporter {
  private config: ProgressConfig;
  private steps: Map<string, ProgressStep>;
  private currentStep?: string;
  private startTime: number;

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = { ...DEFAULT_PROGRESS_CONFIG, ...config };
    this.steps = new Map();
    this.startTime = Date.now();
  }

  /**
   * Add a progress step
   */
  addStep(
    id: string,
    name: string,
    description?: string,
    total?: number
  ): void {
    const step: ProgressStep = {
      id,
      name,
      description,
      total,
      current: 0,
      status: "pending",
    };

    this.steps.set(id, step);

    if (this.config.verbose) {
      this.log(LogLevel.VERBOSE, `📋 Added step: ${name}`, { step });
    }
  }

  /**
   * Start a progress step
   */
  startStep(id: string): void {
    const step = this.steps.get(id);
    if (!step) {
      this.error(`Step not found: ${id}`);
      return;
    }

    step.status = "running";
    step.startTime = Date.now();
    this.currentStep = id;

    const icon = this.getStatusIcon(step.status);
    const message = step.description
      ? `${step.name} - ${step.description}`
      : step.name;

    this.info(`${icon} ${message}`);

    if (this.config.verbose) {
      this.log(LogLevel.VERBOSE, `Started step: ${id}`, { step });
    }
  }

  /**
   * Update progress for current step
   */
  updateProgress(current: number, message?: string): void {
    if (!this.currentStep) {
      return;
    }

    const step = this.steps.get(this.currentStep);
    if (!step) {
      return;
    }

    step.current = current;

    if (this.config.showProgress && step.total) {
      const percentage = Math.round((current / step.total) * 100);
      const progressBar = this.createProgressBar(current, step.total);
      const progressMessage = message ? ` - ${message}` : "";

      // Use carriage return to overwrite the line
      process.stdout.write(
        `\r  ${progressBar} ${percentage}%${progressMessage}`
      );

      if (current >= step.total) {
        process.stdout.write("\n");
      }
    } else if (message) {
      this.verbose(`  ${message}`);
    }
  }

  /**
   * Complete a progress step
   */
  completeStep(id: string, message?: string): void {
    const step = this.steps.get(id);
    if (!step) {
      this.error(`Step not found: ${id}`);
      return;
    }

    step.status = "completed";
    step.endTime = Date.now();

    if (this.currentStep === id) {
      this.currentStep = undefined;
    }

    const duration = step.startTime ? step.endTime - step.startTime : 0;
    const icon = this.getStatusIcon(step.status);
    const completionMessage = message || `${step.name} completed`;
    const durationText = duration > 0 ? ` (${duration}ms)` : "";

    this.info(`${icon} ${completionMessage}${durationText}`);

    if (this.config.verbose) {
      this.log(LogLevel.VERBOSE, `Completed step: ${id}`, { step, duration });
    }
  }

  /**
   * Fail a progress step
   */
  failStep(id: string, error: string): void {
    const step = this.steps.get(id);
    if (!step) {
      this.error(`Step not found: ${id}`);
      return;
    }

    step.status = "failed";
    step.endTime = Date.now();
    step.error = error;

    if (this.currentStep === id) {
      this.currentStep = undefined;
    }

    const icon = this.getStatusIcon(step.status);
    this.error(`${icon} ${step.name} failed: ${error}`);

    if (this.config.verbose) {
      this.log(LogLevel.VERBOSE, `Failed step: ${id}`, { step, error });
    }
  }

  /**
   * Skip a progress step
   */
  skipStep(id: string, reason?: string): void {
    const step = this.steps.get(id);
    if (!step) {
      this.error(`Step not found: ${id}`);
      return;
    }

    step.status = "skipped";
    step.endTime = Date.now();

    const icon = this.getStatusIcon(step.status);
    const skipMessage = reason
      ? `${step.name} skipped: ${reason}`
      : `${step.name} skipped`;

    this.info(`${icon} ${skipMessage}`);

    if (this.config.verbose) {
      this.log(LogLevel.VERBOSE, `Skipped step: ${id}`, { step, reason });
    }
  }

  /**
   * Log a message at specified level
   */
  log(level: LogLevel, message: string, data?: any): void {
    if (level > this.config.logLevel) {
      return;
    }

    const timestamp = this.config.showTimestamps ? this.getTimestamp() : "";
    const levelText = this.getLevelText(level);
    const coloredMessage = this.config.useColors
      ? this.colorizeMessage(level, message)
      : message;

    // eslint-disable-next-line no-console
    console.log(`${timestamp}${levelText}${coloredMessage}`);

    if (data && this.config.verbose && level >= LogLevel.VERBOSE) {
      // eslint-disable-next-line no-console
      console.log(this.formatData(data));
    }
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, data?: any): void {
    this.log(LogLevel.VERBOSE, message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Get overall progress summary
   */
  getSummary(): {
    totalSteps: number;
    completed: number;
    failed: number;
    skipped: number;
    running: number;
    pending: number;
    totalDuration: number;
  } {
    const steps = Array.from(this.steps.values());
    const totalDuration = Date.now() - this.startTime;

    return {
      totalSteps: steps.length,
      completed: steps.filter(s => s.status === "completed").length,
      failed: steps.filter(s => s.status === "failed").length,
      skipped: steps.filter(s => s.status === "skipped").length,
      running: steps.filter(s => s.status === "running").length,
      pending: steps.filter(s => s.status === "pending").length,
      totalDuration,
    };
  }

  /**
   * Print final summary
   */
  printSummary(): void {
    const summary = this.getSummary();
    const duration = this.formatDuration(summary.totalDuration);

    this.info("\n📊 Generation Summary:");
    this.info(`  Total steps: ${summary.totalSteps}`);
    this.info(`  ✅ Completed: ${summary.completed}`);

    if (summary.failed > 0) {
      this.info(`  ❌ Failed: ${summary.failed}`);
    }

    if (summary.skipped > 0) {
      this.info(`  ⏭️  Skipped: ${summary.skipped}`);
    }

    this.info(`  ⏱️  Total duration: ${duration}`);

    if (this.config.verbose) {
      this.printDetailedSummary();
    }
  }

  /**
   * Print detailed summary for verbose mode
   */
  private printDetailedSummary(): void {
    this.verbose("\n📋 Detailed Step Summary:");

    for (const step of this.steps.values()) {
      const icon = this.getStatusIcon(step.status);
      const duration =
        step.startTime && step.endTime
          ? this.formatDuration(step.endTime - step.startTime)
          : "N/A";

      this.verbose(`  ${icon} ${step.name} (${duration})`);

      if (step.error) {
        this.verbose(`    Error: ${step.error}`);
      }
    }
  }

  /**
   * Create progress bar
   */
  private createProgressBar(
    current: number,
    total: number,
    width: number = 20
  ): string {
    const percentage = current / total;
    const filled = Math.round(width * percentage);
    const empty = width - filled;

    const filledBar = "█".repeat(filled);
    const emptyBar = "░".repeat(empty);

    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: ProgressStep["status"]): string {
    const icons = {
      pending: "⏳",
      running: "🔄",
      completed: "✅",
      failed: "❌",
      skipped: "⏭️",
    };

    return icons[status];
  }

  /**
   * Get timestamp string
   */
  private getTimestamp(): string {
    const now = new Date();
    const time = now.toLocaleTimeString();
    return this.config.useColors
      ? `${COLORS.gray}[${time}]${COLORS.reset} `
      : `[${time}] `;
  }

  /**
   * Get level text
   */
  private getLevelText(level: LogLevel): string {
    const levels = {
      [LogLevel.ERROR]: "ERROR",
      [LogLevel.WARN]: "WARN ",
      [LogLevel.INFO]: "",
      [LogLevel.VERBOSE]: "VERB ",
      [LogLevel.DEBUG]: "DEBUG",
    };

    const text = levels[level];
    return text ? `${text} ` : "";
  }

  /**
   * Colorize message based on level
   */
  private colorizeMessage(level: LogLevel, message: string): string {
    const colors = {
      [LogLevel.ERROR]: COLORS.red,
      [LogLevel.WARN]: COLORS.yellow,
      [LogLevel.INFO]: COLORS.white,
      [LogLevel.VERBOSE]: COLORS.cyan,
      [LogLevel.DEBUG]: COLORS.gray,
    };

    const color = colors[level];
    return color ? `${color}${message}${COLORS.reset}` : message;
  }

  /**
   * Format data for logging
   */
  private formatData(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }
}

/**
 * Convenience function to create progress reporter
 */
export function createProgressReporter(
  config?: Partial<ProgressConfig>
): ProgressReporter {
  return new ProgressReporter(config);
}

/**
 * Simple progress tracking for quick use
 */
export function trackProgress<T>(
  operation: () => Promise<T>,
  stepName: string,
  reporter?: ProgressReporter
): Promise<T> {
  const progressReporter = reporter || createProgressReporter();
  const stepId = `step_${Date.now()}`;

  progressReporter.addStep(stepId, stepName);
  progressReporter.startStep(stepId);

  return operation()
    .then(result => {
      progressReporter.completeStep(stepId);
      return result;
    })
    .catch(error => {
      progressReporter.failStep(stepId, error.message);
      throw error;
    });
}
