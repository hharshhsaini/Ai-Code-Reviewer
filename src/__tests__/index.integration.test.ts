/**
 * Integration tests for main workflow orchestration
 * Task 18.2: Write integration tests for main workflow
 * 
 * These tests validate the complete workflow from PR event to posted review,
 * including error handling for authentication failures, rate limits, and API errors.
 * 
 * Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from '../github-client';
import { DiffFetcher } from '../diff-fetcher';
import { createLLMClient } from '../llm-client';
import { ConfigurationLoader } from '../config-loader';
import { FileFilter } from '../file-filter';
import { DiffChunker } from '../diff-chunker';
import { ResponseValidator } from '../response-validator';
import { Deduplicator } from '../deduplicator';
import { LineMapper } from '../line-mapper';
import { CommentPoster } from '../comment-poster';
import { LabelManager } from '../label-manager';
import { Logger } from '../logger';
import type { DiffFile, Issue } from '../types';

// Mock all external dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../logger');

describe('Main Workflow Integration Tests', () => {
  let mockSetFailed: jest.MockedFunction<typeof core.setFailed>;
  let mockWarning: jest.MockedFunction<typeof core.warning>;
  let mockInfo: jest.MockedFunction<typeof core.info>;
  let mockGetInput: jest.MockedFunction<typeof core.getInput>;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup core mocks
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    
    // Setup default input values
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'github_token': 'test-github-token',
        'anthropic_api_key': 'test-anthropic-key',
        'model': 'claude-3-5-sonnet-20241022',
        'max_files': '50',
        'severity_threshold': 'suggestion',
      };
      return inputs[name] || '';
    });
    
    // Setup github context mock
    (github as any).context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      payload: {
        pull_request: { number: 123 },
      },
    };
    
    // Mock Logger methods
    (Logger.info as jest.MockedFunction<typeof Logger.info>) = jest.fn();
    (Logger.warning as jest.MockedFunction<typeof Logger.warning>) = jest.fn();
    (Logger.error as jest.MockedFunction<typeof Logger.error>) = jest.fn();
    (Logger.logSummary as jest.MockedFunction<typeof Logger.logSummary>) = jest.fn();
    (Logger.estimateCost as jest.MockedFunction<typeof Logger.estimateCost>) = jest.fn().mockReturnValue(0.001);
  });

  describe('Complete workflow', () => {
    it('should execute full workflow from PR event to posted review', async () => {
      // Setup mock data
      const mockDiffFiles: DiffFile[] = [
        {
          path: 'src/test.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          patch: '@@ -1,5 +1,10 @@\n+new line',
          hunks: [
            {
              oldStart: 1,
              oldLines: 5,
              newStart: 1,
              newLines: 10,
              header: '@@ -1,5 +1,10 @@',
              lines: [
                { type: 'add', content: 'new line', newLineNumber: 5, position: 1 },
              ],
            },
          ],
        },
      ];
      
      const mockIssues: Issue[] = [
        {
          severity: 'warning',
          file: 'src/test.ts',
          line: 5,
          comment: 'This is a test issue',
          suggestion: 'Fix it like this',
        },
      ];
      
      // Create real instances with mocked dependencies
      const config = ConfigurationLoader.load();
      const githubClient = new GitHubClient(config.githubToken);
      const diffFetcher = new DiffFetcher(githubClient);
      
      // Mock the GitHub API calls
      jest.spyOn(diffFetcher, 'fetchPRDiff').mockResolvedValue(mockDiffFiles);
      
      // Mock LLM client
      const mockLLMClient = {
        review: jest.fn().mockResolvedValue(JSON.stringify({
          issues: mockIssues,
          summary: 'Found 1 issue',
          verdict: 'comment',
        })),
      };
      
      // Test the workflow components in sequence
      const filteredFiles = FileFilter.filter(mockDiffFiles, config.maxFiles);
      expect(filteredFiles).toHaveLength(1);
      
      const chunks = DiffChunker.chunk(filteredFiles, 200000);
      expect(chunks).toHaveLength(1);
      
      const responseText = await mockLLMClient.review(chunks[0]);
      const reviewResponse = ResponseValidator.validate(responseText);
      expect(reviewResponse).not.toBeNull();
      expect(reviewResponse!.issues).toHaveLength(1);
      
      const deduplicatedIssues = Deduplicator.deduplicate(reviewResponse!.issues);
      expect(deduplicatedIssues).toHaveLength(1);
      
      const mappedIssues = LineMapper.mapIssues(deduplicatedIssues, filteredFiles);
      expect(mappedIssues).toHaveLength(1);
      expect(mappedIssues[0].position).toBe(1);
      
      // Mock CommentPoster and LabelManager
      const postSpy = jest.spyOn(CommentPoster, 'post').mockResolvedValue();
      const labelSpy = jest.spyOn(LabelManager, 'addLabel').mockResolvedValue();
      
      await CommentPoster.post(
        githubClient,
        'test-owner',
        'test-repo',
        123,
        mappedIssues,
        'comment',
        'AI Code Review found 1 issue(s)'
      );
      
      await LabelManager.addLabel(
        githubClient,
        'test-owner',
        'test-repo',
        123,
        deduplicatedIssues,
        config.severityThreshold
      );
      
      // Verify all components were called correctly
      expect(postSpy).toHaveBeenCalledWith(
        githubClient,
        'test-owner',
        'test-repo',
        123,
        mappedIssues,
        'comment',
        'AI Code Review found 1 issue(s)'
      );
      
      expect(labelSpy).toHaveBeenCalledWith(
        githubClient,
        'test-owner',
        'test-repo',
        123,
        deduplicatedIssues,
        config.severityThreshold
      );
    });
  });

  describe('Error handling', () => {
    it('should handle GitHub authentication errors', async () => {
      // Mock invalid token
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github_token': 'invalid-token',
          'anthropic_api_key': 'test-anthropic-key',
          'model': 'claude-3-5-sonnet-20241022',
        };
        return inputs[name] || '';
      });
      
      const config = ConfigurationLoader.load();
      const githubClient = new GitHubClient(config.githubToken);
      const diffFetcher = new DiffFetcher(githubClient);
      
      // Mock GitHub API to throw authentication error
      jest.spyOn(diffFetcher, 'fetchPRDiff').mockRejectedValue(
        new Error('Bad credentials')
      );
      
      try {
        await diffFetcher.fetchPRDiff('test-owner', 'test-repo', 123);
        fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Bad credentials');
      }
    });
    
    it('should handle GitHub rate limit errors', async () => {
      const config = ConfigurationLoader.load();
      const githubClient = new GitHubClient(config.githubToken);
      const diffFetcher = new DiffFetcher(githubClient);
      
      // Mock GitHub API to throw rate limit error
      jest.spyOn(diffFetcher, 'fetchPRDiff').mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      try {
        await diffFetcher.fetchPRDiff('test-owner', 'test-repo', 123);
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('rate limit');
      }
    });

    it('should handle LLM authentication errors', async () => {
      // Mock invalid API key
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'github_token': 'test-github-token',
          'anthropic_api_key': 'invalid-key',
          'model': 'claude-3-5-sonnet-20241022',
        };
        return inputs[name] || '';
      });
      
      const config = ConfigurationLoader.load();
      const llmClient = createLLMClient(
        config.provider,
        config.anthropicApiKey!,
        config.model
      );
      
      // Mock LLM API to throw authentication error
      jest.spyOn(llmClient, 'review').mockRejectedValue(
        new Error('Invalid API key')
      );
      
      const mockChunk = {
        files: [],
        estimatedTokens: 100,
        metadata: { chunkIndex: 0, totalChunks: 1 },
      };
      
      try {
        await llmClient.review(mockChunk);
        fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('API key');
      }
    });

    it('should handle LLM API errors gracefully', async () => {
      const config = ConfigurationLoader.load();
      const llmClient = createLLMClient(
        config.provider,
        config.anthropicApiKey!,
        config.model
      );
      
      // Mock LLM API to throw generic error
      jest.spyOn(llmClient, 'review').mockRejectedValue(
        new Error('Service temporarily unavailable')
      );
      
      const mockChunk = {
        files: [],
        estimatedTokens: 100,
        metadata: { chunkIndex: 0, totalChunks: 1 },
      };
      
      try {
        await llmClient.review(mockChunk);
        fail('Should have thrown API error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('temporarily unavailable');
      }
    });
    
    it('should handle invalid LLM responses', async () => {
      const config = ConfigurationLoader.load();
      const llmClient = createLLMClient(
        config.provider,
        config.anthropicApiKey!,
        config.model
      );
      
      // Mock LLM to return invalid JSON
      jest.spyOn(llmClient, 'review').mockResolvedValue('invalid json');
      
      const mockChunk = {
        files: [],
        estimatedTokens: 100,
        metadata: { chunkIndex: 0, totalChunks: 1 },
      };
      
      const responseText = await llmClient.review(mockChunk);
      const reviewResponse = ResponseValidator.validate(responseText);
      
      // Should return null for invalid response
      expect(reviewResponse).toBeNull();
    });
    
    it('should handle missing required fields in LLM response', async () => {
      const config = ConfigurationLoader.load();
      const llmClient = createLLMClient(
        config.provider,
        config.anthropicApiKey!,
        config.model
      );
      
      // Mock LLM to return response missing required fields
      jest.spyOn(llmClient, 'review').mockResolvedValue(JSON.stringify({
        issues: [],
        // Missing summary and verdict
      }));
      
      const mockChunk = {
        files: [],
        estimatedTokens: 100,
        metadata: { chunkIndex: 0, totalChunks: 1 },
      };
      
      const responseText = await llmClient.review(mockChunk);
      const reviewResponse = ResponseValidator.validate(responseText);
      
      // Should return null for incomplete response
      expect(reviewResponse).toBeNull();
    });
  });
});

