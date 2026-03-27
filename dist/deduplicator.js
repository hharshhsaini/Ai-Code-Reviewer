"use strict";
/**
 * Deduplicator
 * Removes duplicate issues across chunks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deduplicator = void 0;
class Deduplicator {
    /**
     * Remove duplicate issues, keeping the highest severity when duplicates are found
     */
    static deduplicate(issues) {
        const unique = [];
        for (const issue of issues) {
            const existingIndex = unique.findIndex(existing => this.areSimilar(existing, issue));
            if (existingIndex === -1) {
                // Not a duplicate, add it
                unique.push(issue);
            }
            else {
                // Duplicate found - keep the one with higher severity
                if (this.severityRank(issue.severity) > this.severityRank(unique[existingIndex].severity)) {
                    unique[existingIndex] = issue;
                }
            }
        }
        return unique;
    }
    /**
     * Check if two issues are similar (same file, line, and similar comment text)
     */
    static areSimilar(a, b) {
        // Same file and line
        if (a.file !== b.file || a.line !== b.line) {
            return false;
        }
        // Similar comment text (fuzzy match with 80% threshold)
        const similarity = this.similarity(a.comment, b.comment);
        return similarity > 0.8;
    }
    /**
     * Calculate Levenshtein distance for fuzzy matching
     */
    static levenshteinDistance(a, b) {
        if (a.length === 0)
            return b.length;
        if (b.length === 0)
            return a.length;
        const matrix = [];
        // Initialize first column
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        // Initialize first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
    /**
     * Calculate similarity score (0-1) based on Levenshtein distance
     */
    static similarity(a, b) {
        const maxLength = Math.max(a.length, b.length);
        if (maxLength === 0)
            return 1.0; // Both strings are empty
        const distance = this.levenshteinDistance(a, b);
        return 1 - (distance / maxLength);
    }
    /**
     * Get severity rank for comparison
     */
    static severityRank(severity) {
        const ranks = { critical: 3, warning: 2, suggestion: 1 };
        return ranks[severity];
    }
}
exports.Deduplicator = Deduplicator;
//# sourceMappingURL=deduplicator.js.map