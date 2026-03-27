/**
 * File Filter
 * Filters out non-reviewable files (lockfiles, generated files, etc.)
 */

import { DiffFile } from './types';

export class FileFilter {
  /**
   * Filter files based on exclusion rules and max_files limit
   */
  static filter(files: DiffFile[], maxFiles?: number): DiffFile[] {
    // Apply exclusion rules
    const reviewableFiles = files.filter(file => !this.shouldExclude(file));

    // Apply max_files limit if configured
    if (maxFiles !== undefined && maxFiles > 0) {
      return this.prioritizeFiles(reviewableFiles, maxFiles);
    }

    return reviewableFiles;
  }

  /**
   * Check if a file should be excluded
   */
  private static shouldExclude(file: DiffFile): boolean {
    const path = file.path;
    return (
      this.isLockfile(path) ||
      this.isGenerated(path) ||
      this.isSnapshot(path) ||
      this.isMinified(path)
    );
  }

  /**
   * Check if file is a lockfile
   */
  private static isLockfile(path: string): boolean {
    const filename = path.split('/').pop() || '';
    return (
      filename === 'package-lock.json' ||
      filename === 'yarn.lock' ||
      filename === 'pnpm-lock.yaml'
    );
  }

  /**
   * Check if file is generated
   */
  private static isGenerated(path: string): boolean {
    return path.includes('.generated.');
  }

  /**
   * Check if file is in snapshot directory
   */
  private static isSnapshot(path: string): boolean {
    return path.includes('__snapshots__');
  }

  /**
   * Check if file is minified
   */
  private static isMinified(path: string): boolean {
    return path.endsWith('.min.js') || path.endsWith('.min.css');
  }

  /**
   * Prioritize files by extension and limit to max count
   * Source code files are prioritized over config files
   */
  private static prioritizeFiles(files: DiffFile[], maxFiles: number): DiffFile[] {
    // Define priority order (lower number = higher priority)
    const extensionPriority: Record<string, number> = {
      '.ts': 1,
      '.tsx': 1,
      '.js': 1,
      '.jsx': 1,
      '.py': 1,
      '.java': 1,
      '.go': 1,
      '.rs': 1,
      '.cpp': 1,
      '.c': 1,
      '.cs': 1,
      '.rb': 1,
      '.php': 1,
      '.swift': 1,
      '.kt': 1,
      '.json': 2,
      '.yaml': 2,
      '.yml': 2,
      '.xml': 2,
      '.md': 3,
    };

    const getExtension = (path: string): string => {
      const parts = path.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    };

    const getPriority = (path: string): number => {
      const ext = getExtension(path);
      return extensionPriority[ext] || 4; // Default priority for unknown extensions
    };

    // Sort by priority (lower number first), then by path for stability
    const sortedFiles = [...files].sort((a, b) => {
      const priorityDiff = getPriority(a.path) - getPriority(b.path);
      if (priorityDiff !== 0) return priorityDiff;
      return a.path.localeCompare(b.path);
    });

    return sortedFiles.slice(0, maxFiles);
  }
}
