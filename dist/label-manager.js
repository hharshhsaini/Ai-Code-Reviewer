"use strict";
/**
 * Label Manager
 * Manages severity labels on pull requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelManager = void 0;
const deduplicator_1 = require("./deduplicator");
class LabelManager {
    /**
     * Add appropriate severity label to PR
     */
    static async addLabel(client, owner, repo, pullNumber, issues, severityThreshold) {
        // Apply severity threshold filter if configured
        const filteredIssues = severityThreshold
            ? this.filterBySeverity(issues, severityThreshold)
            : issues;
        // Determine highest severity from filtered issues
        const highestSeverity = this.getHighestSeverity(filteredIssues);
        // Remove stale ai-review labels from previous runs
        const staleLabels = [
            'ai-review: critical',
            'ai-review: warning',
            'ai-review: suggestion',
        ];
        await client.removeLabels(owner, repo, pullNumber, staleLabels);
        // Add new label based on highest severity
        if (highestSeverity) {
            const label = this.severityToLabel(highestSeverity);
            await client.addLabels(owner, repo, pullNumber, [label]);
        }
    }
    /**
     * Determine highest severity from issues
     */
    static getHighestSeverity(issues) {
        if (issues.length === 0) {
            return null;
        }
        let highestRank = 0;
        let highestSeverity = null;
        for (const issue of issues) {
            const rank = deduplicator_1.Deduplicator.severityRank(issue.severity);
            if (rank > highestRank) {
                highestRank = rank;
                highestSeverity = issue.severity;
            }
        }
        return highestSeverity;
    }
    /**
     * Map severity to label
     */
    static severityToLabel(severity) {
        const mapping = {
            critical: 'ai-review: critical',
            warning: 'ai-review: warning',
            suggestion: 'ai-review: suggestion',
        };
        return mapping[severity];
    }
    /**
     * Filter issues by severity threshold
     */
    static filterBySeverity(issues, threshold) {
        const thresholdRank = deduplicator_1.Deduplicator.severityRank(threshold);
        return issues.filter(issue => deduplicator_1.Deduplicator.severityRank(issue.severity) >= thresholdRank);
    }
}
exports.LabelManager = LabelManager;
//# sourceMappingURL=label-manager.js.map