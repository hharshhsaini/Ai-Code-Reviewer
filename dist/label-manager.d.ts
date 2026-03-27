/**
 * Label Manager
 * Manages severity labels on pull requests
 */
import { GitHubClient } from './github-client';
import { Issue, Severity } from './types';
export declare class LabelManager {
    /**
     * Add appropriate severity label to PR
     */
    static addLabel(client: GitHubClient, owner: string, repo: string, pullNumber: number, issues: Issue[], severityThreshold?: Severity): Promise<void>;
    /**
     * Determine highest severity from issues
     */
    private static getHighestSeverity;
    /**
     * Map severity to label
     */
    private static severityToLabel;
    /**
     * Filter issues by severity threshold
     */
    private static filterBySeverity;
}
//# sourceMappingURL=label-manager.d.ts.map