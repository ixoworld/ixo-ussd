/**
 * Incremental Updates Utility
 *
 * This module provides functionality for tracking file changes and implementing
 * incremental updates to only regenerate machines that have changed.
 *
 * @module incremental-updates
 * @version 1.0.0
 */

import { existsSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";

/**
 * File change tracking information
 */
export interface FileChangeInfo {
  path: string;
  lastModified: number;
  hash: string;
  size: number;
}

/**
 * Incremental update manifest
 */
export interface UpdateManifest {
  version: string;
  lastUpdate: number;
  sourceFiles: Record<string, FileChangeInfo>;
  generatedFiles: Record<string, FileChangeInfo>;
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFiles: string[];
  newFiles: string[];
  deletedFiles: string[];
  modifiedFiles: string[];
}

/**
 * Incremental update manager class
 */
export class IncrementalUpdateManager {
  private manifestPath: string;
  private manifest: UpdateManifest;

  constructor(outputDir: string) {
    this.manifestPath = join(outputDir, ".generation-manifest.json");
    this.manifest = this.loadManifest();
  }

  /**
   * Load existing manifest or create new one
   */
  private loadManifest(): UpdateManifest {
    if (existsSync(this.manifestPath)) {
      try {
        const content = readFileSync(this.manifestPath, "utf-8");
        return JSON.parse(content);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `Warning: Failed to load manifest, creating new one: ${error}`
        );
      }
    }

    return {
      version: "1.0.0",
      lastUpdate: 0,
      sourceFiles: {},
      generatedFiles: {},
    };
  }

  /**
   * Save manifest to disk
   */
  private saveManifest(): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.manifestPath);
      if (!existsSync(dir)) {
        const { DirectoryManager } = require("./file-utils.js");
        DirectoryManager.ensureDirectory(dir);
      }

      writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Warning: Failed to save manifest: ${error}`);
    }
  }

  /**
   * Get file information for change tracking
   */
  private getFileInfo(filePath: string): FileChangeInfo {
    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf-8");
    const hash = createHash("sha256").update(content).digest("hex");

    return {
      path: filePath,
      lastModified: stat.mtime.getTime(),
      hash,
      size: stat.size,
    };
  }

  /**
   * Detect changes in source files
   */
  detectSourceChanges(sourceFiles: string[]): ChangeDetectionResult {
    const result: ChangeDetectionResult = {
      hasChanges: false,
      changedFiles: [],
      newFiles: [],
      deletedFiles: [],
      modifiedFiles: [],
    };

    // Check for new and modified files
    for (const filePath of sourceFiles) {
      if (!existsSync(filePath)) {
        continue;
      }

      const currentInfo = this.getFileInfo(filePath);
      const previousInfo = this.manifest.sourceFiles[filePath];

      if (!previousInfo) {
        // New file
        result.newFiles.push(filePath);
        result.changedFiles.push(filePath);
        result.hasChanges = true;
      } else if (
        currentInfo.hash !== previousInfo.hash ||
        currentInfo.lastModified > previousInfo.lastModified
      ) {
        // Modified file
        result.modifiedFiles.push(filePath);
        result.changedFiles.push(filePath);
        result.hasChanges = true;
      }
    }

    // Check for deleted files
    const currentFilePaths = new Set(sourceFiles);
    for (const previousPath of Object.keys(this.manifest.sourceFiles)) {
      if (!currentFilePaths.has(previousPath)) {
        result.deletedFiles.push(previousPath);
        result.hasChanges = true;
      }
    }

    return result;
  }

  /**
   * Update manifest with current source file information
   */
  updateSourceFiles(sourceFiles: string[]): void {
    // Clear old source files
    this.manifest.sourceFiles = {};

    // Add current source files
    for (const filePath of sourceFiles) {
      if (existsSync(filePath)) {
        this.manifest.sourceFiles[filePath] = this.getFileInfo(filePath);
      }
    }

    this.manifest.lastUpdate = Date.now();
    this.saveManifest();
  }

  /**
   * Track generated files
   */
  trackGeneratedFiles(generatedFiles: string[]): void {
    for (const filePath of generatedFiles) {
      if (existsSync(filePath)) {
        this.manifest.generatedFiles[filePath] = this.getFileInfo(filePath);
      }
    }

    this.saveManifest();
  }

  /**
   * Check if generated files are up to date
   */
  areGeneratedFilesUpToDate(sourceFiles: string[]): boolean {
    // Check if any source files are newer than the last update
    for (const filePath of sourceFiles) {
      if (!existsSync(filePath)) {
        continue;
      }

      const stat = statSync(filePath);
      if (stat.mtime.getTime() > this.manifest.lastUpdate) {
        return false;
      }
    }

    // Check if all expected generated files exist
    const expectedGeneratedFiles = Object.keys(this.manifest.generatedFiles);
    for (const filePath of expectedGeneratedFiles) {
      if (!existsSync(filePath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get files that need regeneration
   */
  getFilesNeedingRegeneration(sourceFiles: string[]): string[] {
    const changes = this.detectSourceChanges(sourceFiles);
    return changes.changedFiles;
  }

  /**
   * Clean up orphaned generated files
   */
  cleanupOrphanedFiles(): string[] {
    const cleanedFiles: string[] = [];

    for (const filePath of Object.keys(this.manifest.generatedFiles)) {
      if (existsSync(filePath)) {
        // Check if this generated file still has a corresponding source
        // This is a simplified check - in practice, you'd need more sophisticated mapping
        const isOrphaned = !Object.keys(this.manifest.sourceFiles).some(
          sourcePath => this.isGeneratedFromSource(filePath, sourcePath)
        );

        if (isOrphaned) {
          try {
            // In a real implementation, you might want to move to trash instead
            // eslint-disable-next-line no-console
            console.log(`Cleaning up orphaned file: ${filePath}`);
            cleanedFiles.push(filePath);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to clean up file ${filePath}: ${error}`);
          }
        }
      } else {
        // File no longer exists, remove from manifest
        delete this.manifest.generatedFiles[filePath];
      }
    }

    if (cleanedFiles.length > 0) {
      this.saveManifest();
    }

    return cleanedFiles;
  }

  /**
   * Check if a generated file corresponds to a source file
   */
  private isGeneratedFromSource(
    generatedPath: string,
    sourcePath: string
  ): boolean {
    // This is a simplified implementation
    // In practice, you'd need more sophisticated mapping logic
    const sourceBaseName =
      sourcePath
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/, "") || "";
    return generatedPath.includes(sourceBaseName);
  }

  /**
   * Get manifest statistics
   */
  getStatistics(): {
    sourceFiles: number;
    generatedFiles: number;
    lastUpdate: Date;
    manifestSize: number;
  } {
    return {
      sourceFiles: Object.keys(this.manifest.sourceFiles).length,
      generatedFiles: Object.keys(this.manifest.generatedFiles).length,
      lastUpdate: new Date(this.manifest.lastUpdate),
      manifestSize: JSON.stringify(this.manifest).length,
    };
  }

  /**
   * Reset manifest (force full regeneration)
   */
  reset(): void {
    this.manifest = {
      version: "1.0.0",
      lastUpdate: 0,
      sourceFiles: {},
      generatedFiles: {},
    };
    this.saveManifest();
  }

  /**
   * Export manifest for debugging
   */
  exportManifest(): UpdateManifest {
    return { ...this.manifest };
  }
}

/**
 * Utility functions for incremental updates
 */
export class IncrementalUtils {
  /**
   * Calculate file hash
   */
  static calculateFileHash(filePath: string): string {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Compare file modification times
   */
  static isFileNewer(filePath1: string, filePath2: string): boolean {
    if (!existsSync(filePath1) || !existsSync(filePath2)) {
      return false;
    }

    const stat1 = statSync(filePath1);
    const stat2 = statSync(filePath2);
    return stat1.mtime.getTime() > stat2.mtime.getTime();
  }

  /**
   * Get files modified after a specific timestamp
   */
  static getFilesModifiedAfter(files: string[], timestamp: number): string[] {
    return files.filter(filePath => {
      if (!existsSync(filePath)) {
        return false;
      }

      const stat = statSync(filePath);
      return stat.mtime.getTime() > timestamp;
    });
  }

  /**
   * Batch file information retrieval
   */
  static getFileInfoBatch(files: string[]): Record<string, FileChangeInfo> {
    const result: Record<string, FileChangeInfo> = {};

    for (const filePath of files) {
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        const content = readFileSync(filePath, "utf-8");
        const hash = createHash("sha256").update(content).digest("hex");

        result[filePath] = {
          path: filePath,
          lastModified: stat.mtime.getTime(),
          hash,
          size: stat.size,
        };
      }
    }

    return result;
  }
}

/**
 * Convenience function to create incremental update manager
 */
export function createIncrementalManager(
  outputDir: string
): IncrementalUpdateManager {
  return new IncrementalUpdateManager(outputDir);
}

/**
 * Convenience function to check if files need updates
 */
export function checkForUpdates(
  sourceFiles: string[],
  outputDir: string
): ChangeDetectionResult {
  const manager = new IncrementalUpdateManager(outputDir);
  return manager.detectSourceChanges(sourceFiles);
}
