/**
 * GitHub API Client
 * Wraps Octokit for GitHub REST API interactions with retry logic and rate limit handling
 */

import { Octokit } from '@octokit/rest';
import { ReviewComment } from './types';

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export class GitHubClient {
  private octokit: Octokit;
  private retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  };

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Check rate limit status and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    try {
      const { data } = await this.octokit.rateLimit.get();
      const { remaining, reset } = data.rate;

      // If we're running low on requests (less than 10), wait until reset
      if (remaining < 10) {
        const resetTime = new Date(reset * 1000);
        const waitTime = resetTime.getTime() - Date.now();
        
        if (waitTime > 0) {
          console.warn(`Rate limit low (${remaining} remaining). Waiting ${Math.ceil(waitTime / 1000)}s until reset...`);
          await this.sleep(waitTime);
        }
      }
    } catch (error) {
      // If rate limit check fails, log but continue
      console.warn('Failed to check rate limit:', error);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // Check rate limit before making request
        await this.checkRateLimit();
        
        return await fn();
      } catch (error: unknown) {
        lastError = error as Error;
        
        // Don't retry on authentication errors (401, 403)
        if ((error as { status?: number }).status === 401 || (error as { status?: number }).status === 403) {
          throw new Error(`Authentication failed: ${(error as Error).message}`);
        }
        
        // Don't retry on client errors (4xx except 429)
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
        
        // Retry on server errors (5xx) or rate limit (429)
        const code = (error as { code?: string }).code;
        const isRetryable = 
          status === 429 || 
          (status && status >= 500 && status < 600) ||
          code === 'ECONNRESET' ||
          code === 'ETIMEDOUT';
        
        if (!isRetryable || attempt === this.retryOptions.maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryOptions.initialDelayMs * Math.pow(2, attempt),
          this.retryOptions.maxDelayMs
        );
        
        console.warn(
          `${operationName} failed (attempt ${attempt + 1}/${this.retryOptions.maxRetries + 1}). ` +
          `Retrying in ${delay}ms... Error: ${(error as Error).message}`
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error(`${operationName} failed after ${this.retryOptions.maxRetries} retries`);
  }

  /**
   * Get pull request metadata
   */
  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<Record<string, unknown>> {
    return this.withRetry(
      async () => {
        const { data } = await this.octokit.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
        });
        return data;
      },
      'getPullRequest'
    );
  }

  /**
   * Get diff for a pull request
   * Note: This returns raw diff data, parsing is handled by DiffFetcher
   */
  async getDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
    return this.withRetry(
      async () => {
        const { data } = await this.octokit.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
          mediaType: {
            format: 'diff',
          },
        });
        return data as unknown as string;
      },
      'getDiff'
    );
  }

  /**
   * Post a review with comments
   */
  async postReview(
    owner: string,
    repo: string,
    pullNumber: number,
    comments: ReviewComment[],
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body: string
  ): Promise<void> {
    return this.withRetry(
      async () => {
        await this.octokit.pulls.createReview({
          owner,
          repo,
          pull_number: pullNumber,
          event,
          body,
          comments: comments.map(comment => ({
            path: comment.path,
            body: comment.body,
            ...(comment.position !== undefined && { position: comment.position }),
          })),
        });
      },
      'postReview'
    );
  }

  /**
   * Add labels to a pull request
   */
  async addLabels(owner: string, repo: string, pullNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) {
      return;
    }
    
    return this.withRetry(
      async () => {
        await this.octokit.issues.addLabels({
          owner,
          repo,
          issue_number: pullNumber,
          labels,
        });
      },
      'addLabels'
    );
  }

  /**
   * Remove labels from a pull request
   */
  async removeLabels(owner: string, repo: string, pullNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) {
      return;
    }
    
    return this.withRetry(
      async () => {
        // Remove labels one by one as GitHub API doesn't support batch removal
        for (const label of labels) {
          try {
            await this.octokit.issues.removeLabel({
              owner,
              repo,
              issue_number: pullNumber,
              name: label,
            });
          } catch (error: unknown) {
            // Ignore 404 errors (label doesn't exist)
            if ((error as { status?: number }).status !== 404) {
              throw error;
            }
          }
        }
      },
      'removeLabels'
    );
  }
}
