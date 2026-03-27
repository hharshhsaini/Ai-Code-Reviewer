/**
 * Unit tests for GitHub API Client
 */

import { GitHubClient } from '../github-client';
import { Octokit } from '@octokit/rest';
import { ReviewComment } from '../types';

// Mock Octokit
jest.mock('@octokit/rest');

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockPullsGet: jest.Mock;
  let mockPullsCreateReview: jest.Mock;
  let mockIssuesAddLabels: jest.Mock;
  let mockIssuesRemoveLabel: jest.Mock;
  let mockRateLimitGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock functions
    mockPullsGet = jest.fn();
    mockPullsCreateReview = jest.fn();
    mockIssuesAddLabels = jest.fn();
    mockIssuesRemoveLabel = jest.fn();
    mockRateLimitGet = jest.fn();

    // Mock Octokit constructor
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => ({
      pulls: {
        get: mockPullsGet,
        createReview: mockPullsCreateReview,
      },
      issues: {
        addLabels: mockIssuesAddLabels,
        removeLabel: mockIssuesRemoveLabel,
      },
      rateLimit: {
        get: mockRateLimitGet,
      },
    } as any));

    client = new GitHubClient('test-token');
  });

  describe('constructor', () => {
    it('should initialize Octokit with provided token', () => {
      expect(Octokit).toHaveBeenCalledWith({ auth: 'test-token' });
    });
  });

  describe('getPullRequest', () => {
    it('should fetch pull request metadata', async () => {
      const mockPR = {
        number: 123,
        title: 'Test PR',
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
      };

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockPullsGet.mockResolvedValue({ data: mockPR });

      const result = await client.getPullRequest('owner', 'repo', 123);

      expect(mockPullsGet).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      });
      expect(result).toEqual(mockPR);
    });

    it('should retry on 5xx errors', async () => {
      const mockPR = { number: 123 };

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      // Fail twice, then succeed
      const error1 = new Error('Internal Server Error');
      (error1 as any).status = 500;
      const error2 = new Error('Service Unavailable');
      (error2 as any).status = 503;
      
      mockPullsGet
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce({ data: mockPR });

      const result = await client.getPullRequest('owner', 'repo', 123);

      expect(mockPullsGet).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockPR);
    });

    it('should throw on authentication errors without retry', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error = new Error('Bad credentials');
      (error as any).status = 401;
      mockPullsGet.mockRejectedValue(error);

      await expect(client.getPullRequest('owner', 'repo', 123)).rejects.toThrow(
        'Authentication failed'
      );

      expect(mockPullsGet).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries on persistent 5xx errors', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error = new Error('Internal Server Error');
      (error as any).status = 500;
      mockPullsGet.mockRejectedValue(error);

      await expect(client.getPullRequest('owner', 'repo', 123)).rejects.toThrow('Internal Server Error');

      // Should try 4 times (initial + 3 retries)
      expect(mockPullsGet).toHaveBeenCalledTimes(4);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('getDiff', () => {
    it('should fetch diff in unified format', async () => {
      const mockDiff = 'diff --git a/file.ts b/file.ts\n...';

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockPullsGet.mockResolvedValue({ data: mockDiff });

      const result = await client.getDiff('owner', 'repo', 123);

      expect(mockPullsGet).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
        mediaType: {
          format: 'diff',
        },
      });
      expect(result).toBe(mockDiff);
    });
  });

  describe('postReview', () => {
    it('should post review with comments', async () => {
      const comments: ReviewComment[] = [
        { path: 'file1.ts', position: 10, body: 'Issue 1' },
        { path: 'file2.ts', position: 20, body: 'Issue 2' },
      ];

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockPullsCreateReview.mockResolvedValue({});

      await client.postReview('owner', 'repo', 123, comments, 'COMMENT', 'Review summary');

      expect(mockPullsCreateReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
        event: 'COMMENT',
        body: 'Review summary',
        comments: [
          { path: 'file1.ts', position: 10, body: 'Issue 1' },
          { path: 'file2.ts', position: 20, body: 'Issue 2' },
        ],
      });
    });

    it('should handle comments without position', async () => {
      const comments: ReviewComment[] = [
        { path: 'file1.ts', body: 'File-level comment' },
      ];

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockPullsCreateReview.mockResolvedValue({});

      await client.postReview('owner', 'repo', 123, comments, 'APPROVE', 'LGTM');

      expect(mockPullsCreateReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
        event: 'APPROVE',
        body: 'LGTM',
        comments: [
          { path: 'file1.ts', body: 'File-level comment' },
        ],
      });
    });
  });

  describe('addLabels', () => {
    it('should add labels to pull request', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockIssuesAddLabels.mockResolvedValue({});

      await client.addLabels('owner', 'repo', 123, ['label1', 'label2']);

      expect(mockIssuesAddLabels).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        labels: ['label1', 'label2'],
      });
    });

    it('should handle empty labels array', async () => {
      await client.addLabels('owner', 'repo', 123, []);

      expect(mockIssuesAddLabels).not.toHaveBeenCalled();
    });
  });

  describe('removeLabels', () => {
    it('should remove labels from pull request', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      mockIssuesRemoveLabel.mockResolvedValue({});

      await client.removeLabels('owner', 'repo', 123, ['label1', 'label2']);

      expect(mockIssuesRemoveLabel).toHaveBeenCalledTimes(2);
      expect(mockIssuesRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'label1',
      });
      expect(mockIssuesRemoveLabel).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        name: 'label2',
      });
    });

    it('should ignore 404 errors when removing non-existent labels', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error = new Error('Not Found');
      (error as any).status = 404;
      
      mockIssuesRemoveLabel
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({});

      await client.removeLabels('owner', 'repo', 123, ['nonexistent', 'existing']);

      expect(mockIssuesRemoveLabel).toHaveBeenCalledTimes(2);
    });

    it('should handle empty labels array', async () => {
      await client.removeLabels('owner', 'repo', 123, []);

      expect(mockIssuesRemoveLabel).not.toHaveBeenCalled();
    });
  });

  describe('rate limit handling', () => {
    it('should wait when rate limit is low', async () => {
      const resetTime = Date.now() / 1000 + 2; // 2 seconds in the future

      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5, reset: resetTime } },
      });

      mockPullsGet.mockResolvedValue({ data: { number: 123 } });

      const startTime = Date.now();
      await client.getPullRequest('owner', 'repo', 123);
      const endTime = Date.now();

      // Should have waited approximately 2 seconds
      expect(endTime - startTime).toBeGreaterThanOrEqual(1900);
    });

    it('should continue if rate limit check fails', async () => {
      mockRateLimitGet.mockRejectedValue(new Error('Rate limit check failed'));
      mockPullsGet.mockResolvedValue({ data: { number: 123 } });

      const result = await client.getPullRequest('owner', 'repo', 123);

      expect(result).toEqual({ number: 123 });
    });
  });

  describe('retry with exponential backoff', () => {
    it('should use exponential backoff for retries', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error1 = new Error('Error 1');
      (error1 as any).status = 500;
      const error2 = new Error('Error 2');
      (error2 as any).status = 500;
      
      mockPullsGet
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce({ data: { number: 123 } });

      const startTime = Date.now();
      await client.getPullRequest('owner', 'repo', 123);
      const endTime = Date.now();

      // Should have waited: 1000ms (first retry) + 2000ms (second retry) = 3000ms
      // Allow some tolerance for execution time
      expect(endTime - startTime).toBeGreaterThanOrEqual(2900);
    });

    it('should retry on 429 rate limit errors', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      
      mockPullsGet
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { number: 123 } });

      const result = await client.getPullRequest('owner', 'repo', 123);

      expect(mockPullsGet).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ number: 123 });
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      mockRateLimitGet.mockResolvedValue({
        data: { rate: { remaining: 5000, reset: Date.now() / 1000 + 3600 } },
      });

      const error = new Error('Not Found');
      (error as any).status = 404;
      mockPullsGet.mockRejectedValue(error);

      await expect(client.getPullRequest('owner', 'repo', 123)).rejects.toThrow('Not Found');

      expect(mockPullsGet).toHaveBeenCalledTimes(1);
    });
  });
});
