/**
 * Comment Poster
 * Posts review comments to GitHub
 */

import { GitHubClient } from './github-client';
import { MappedIssue, ReviewComment, Severity, Verdict } from './types';

export class CommentPoster {
  /**
   * Format and post review comments
   */
  static async post(
    client: GitHubClient,
    owner: string,
    repo: string,
    pullNumber: number,
    issues: MappedIssue[],
    verdict: Verdict,
    summary: string
  ): Promise<void> {
    // Format all issues as review comments
    const comments = issues.map(issue => this.formatComment(issue));
    
    // Map verdict to GitHub event type
    const event = this.verdictToEvent(verdict);
    
    // Post all comments in a single batched review
    await client.postReview(owner, repo, pullNumber, comments, event, summary);
  }

  /**
   * Format issue as review comment
   */
  private static formatComment(issue: MappedIssue): ReviewComment {
    const body = this.formatBody(issue);
    
    // If position is null, omit it (file-level comment)
    if (issue.position === null) {
      return {
        path: issue.file,
        body,
      };
    }
    
    // Otherwise, include position for inline comment
    return {
      path: issue.file,
      position: issue.position,
      body,
    };
  }

  /**
   * Format comment body with severity badge
   */
  private static formatBody(issue: MappedIssue): string {
    // Get severity badge
    const badge = this.getSeverityBadge(issue.severity);
    
    // Start with badge and comment
    let body = `${badge}\n\n${issue.comment}`;
    
    // Add suggestion if present
    if (issue.suggestion) {
      body += `\n\n**Suggested fix:**\n\`\`\`\n${issue.suggestion}\n\`\`\``;
    }
    
    return body;
  }

  /**
   * Get severity badge markdown
   */
  private static getSeverityBadge(severity: Severity): string {
    const badges = {
      critical: '**🔴 CRITICAL**',
      warning: '**⚠️ WARNING**',
      suggestion: '**💡 SUGGESTION**',
    };
    return badges[severity];
  }

  /**
   * Map verdict to GitHub event type
   */
  private static verdictToEvent(verdict: Verdict): 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' {
    const mapping = {
      approve: 'APPROVE' as const,
      request_changes: 'REQUEST_CHANGES' as const,
      comment: 'COMMENT' as const,
    };
    return mapping[verdict];
  }
}
