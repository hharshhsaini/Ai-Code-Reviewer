/**
 * GitHub API Client
 * Wraps Octokit for GitHub REST API interactions with retry logic and rate limit handling
 */
import { ReviewComment } from './types';
export declare class GitHubClient {
    private octokit;
    private retryOptions;
    constructor(token: string);
    /**
     * Check rate limit status and wait if necessary
     */
    private checkRateLimit;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Execute a function with retry logic and exponential backoff
     */
    private withRetry;
    /**
     * Get pull request metadata
     */
    getPullRequest(owner: string, repo: string, pullNumber: number): Promise<Record<string, unknown>>;
    /**
     * Get diff for a pull request
     * Note: This returns raw diff data, parsing is handled by DiffFetcher
     */
    getDiff(owner: string, repo: string, pullNumber: number): Promise<string>;
    /**
     * Post a review with comments
     */
    postReview(owner: string, repo: string, pullNumber: number, comments: ReviewComment[], event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string): Promise<void>;
    /**
     * Add labels to a pull request
     */
    addLabels(owner: string, repo: string, pullNumber: number, labels: string[]): Promise<void>;
    /**
     * Remove labels from a pull request
     */
    removeLabels(owner: string, repo: string, pullNumber: number, labels: string[]): Promise<void>;
}
//# sourceMappingURL=github-client.d.ts.map