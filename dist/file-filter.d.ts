/**
 * File Filter
 * Filters out non-reviewable files (lockfiles, generated files, etc.)
 */
import { DiffFile } from './types';
export declare class FileFilter {
    /**
     * Filter files based on exclusion rules and max_files limit
     */
    static filter(files: DiffFile[], maxFiles?: number): DiffFile[];
    /**
     * Check if a file should be excluded
     */
    private static shouldExclude;
    /**
     * Check if file is a lockfile
     */
    private static isLockfile;
    /**
     * Check if file is generated
     */
    private static isGenerated;
    /**
     * Check if file is in snapshot directory
     */
    private static isSnapshot;
    /**
     * Check if file is minified
     */
    private static isMinified;
    /**
     * Prioritize files by extension and limit to max count
     * Source code files are prioritized over config files
     */
    private static prioritizeFiles;
}
//# sourceMappingURL=file-filter.d.ts.map