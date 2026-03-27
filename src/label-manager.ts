/**
 * Label Manager
 * Manages severity labels on pull requests
 */

import { GitHubClient } from './github-client';
import { Issue, Severity } from './types';
import { Deduplicator } from './deduplicator';

export class LabelManager {
  /**
   * Add appropriate severity label to PR
   */
  static async addLabel(
    client: GitHubClient,
    owner: string,
    repo: string,
    pullNumber: number,
    issues: Issue[],
    severityThreshold?: Severity
  ): Promise<void> {
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
  private static getHighestSeverity(issues: Issue[]): Severity | null {
    if (issues.length === 0) {
      return null;
    }

    let highestRank = 0;
    let highestSeverity: Severity | null = null;

    for (const issue of issues) {
      const rank = Deduplicator.severityRank(issue.severity);
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
  private static severityToLabel(severity: Severity): string {
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
  private static filterBySeverity(issues: Issue[], threshold: Severity): Issue[] {
    const thresholdRank = Deduplicator.severityRank(threshold);
    return issues.filter(issue => 
      Deduplicator.severityRank(issue.severity) >= thresholdRank
    );
  }
}
