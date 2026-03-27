/**
 * Comment Poster
 * Posts review comments to GitHub
 */
import { GitHubClient } from './github-client';
import { MappedIssue, Verdict } from './types';
export declare class CommentPoster {
    /**
     * Format and post review comments
     */
    static post(client: GitHubClient, owner: string, repo: string, pullNumber: number, issues: MappedIssue[], verdict: Verdict, summary: string): Promise<void>;
    /**
     * Format issue as review comment
     */
    private static formatComment;
    /**
     * Format comment body with severity badge
     */
    private static formatBody;
    /**
     * Get severity badge markdown
     */
    private static getSeverityBadge;
    /**
     * Map verdict to GitHub event type
     */
    private static verdictToEvent;
}
//# sourceMappingURL=comment-poster.d.ts.map