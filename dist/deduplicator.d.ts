/**
 * Deduplicator
 * Removes duplicate issues across chunks
 */
import { Issue, Severity } from './types';
export declare class Deduplicator {
    /**
     * Remove duplicate issues, keeping the highest severity when duplicates are found
     */
    static deduplicate(issues: Issue[]): Issue[];
    /**
     * Check if two issues are similar (same file, line, and similar comment text)
     */
    private static areSimilar;
    /**
     * Calculate Levenshtein distance for fuzzy matching
     */
    private static levenshteinDistance;
    /**
     * Calculate similarity score (0-1) based on Levenshtein distance
     */
    private static similarity;
    /**
     * Get severity rank for comparison
     */
    static severityRank(severity: Severity): number;
}
//# sourceMappingURL=deduplicator.d.ts.map