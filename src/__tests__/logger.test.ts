/**
 * Unit tests for Logger
 */

import * as core from '@actions/core';
import { Logger } from '../logger';
import { ReviewSummary } from '../types';

// Mock @actions/core
jest.mock('@actions/core');

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('info', () => {
    it('should log info messages with prefix', () => {
      Logger.info('Test message');

      expect(core.info).toHaveBeenCalledTimes(1);
      expect(core.info).toHaveBeenCalledWith('[AI Code Reviewer] Test message');
    });

    it('should handle empty messages', () => {
      Logger.info('');

      expect(core.info).toHaveBeenCalledWith('[AI Code Reviewer] ');
    });
  });

  describe('warning', () => {
    it('should log warning messages with prefix', () => {
      Logger.warning('Warning message');

      expect(core.warning).toHaveBeenCalledTimes(1);
      expect(core.warning).toHaveBeenCalledWith('[AI Code Reviewer] Warning message');
    });
  });

  describe('error', () => {
    it('should log error with category and message', () => {
      Logger.error('Authentication', 'Invalid token');

      expect(core.error).toHaveBeenCalledTimes(1);
      const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

      expect(loggedMessage).toContain('[AI Code Reviewer] ERROR: Authentication');
      expect(loggedMessage).toContain('Message: Invalid token');
    });

    it('should include context when provided', () => {
      const context = { statusCode: 401, endpoint: '/api/user' };
      Logger.error('API Error', 'Request failed', context);

      const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

      expect(loggedMessage).toContain('Context:');
      expect(loggedMessage).toContain(JSON.stringify(context, null, 2));
    });

    it('should include action when provided', () => {
      Logger.error('Configuration', 'Missing API key', undefined, 'Set ANTHROPIC_API_KEY in secrets');

      const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

      expect(loggedMessage).toContain('Action: Set ANTHROPIC_API_KEY in secrets');
    });

    it('should include both context and action when provided', () => {
      const context = { file: 'config.yml', line: 42 };
      Logger.error('Validation', 'Invalid config', context, 'Check configuration file');

      const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

      expect(loggedMessage).toContain('Context:');
      expect(loggedMessage).toContain(JSON.stringify(context, null, 2));
      expect(loggedMessage).toContain('Action: Check configuration file');
    });

    it('should handle complex nested context objects', () => {
      const context = {
        error: {
          code: 'RATE_LIMIT',
          details: {
            limit: 5000,
            remaining: 0,
            reset: 1234567890,
          },
        },
      };
      Logger.error('Rate Limit', 'API rate limit exceeded', context);

      const loggedMessage = (core.error as jest.Mock).mock.calls[0][0];

      expect(loggedMessage).toContain('Context:');
      expect(loggedMessage).toContain('"code": "RATE_LIMIT"');
      expect(loggedMessage).toContain('"limit": 5000');
    });
  });

  describe('logSummary', () => {
    it('should log all summary statistics with proper formatting', () => {
      const summary: ReviewSummary = {
        filesReviewed: 5,
        issuesFound: {
          critical: 2,
          warning: 3,
          suggestion: 1,
        },
        verdict: 'request_changes',
        tokensUsed: 10000,
        estimatedCost: 0.0450,
      };

      Logger.logSummary(summary);

      // Should call core.info multiple times for the summary
      expect(core.info).toHaveBeenCalled();

      // Get all logged messages
      const loggedMessages = (core.info as jest.Mock).mock.calls.map(call => call[0]).join('\n');

      // Verify all required fields are present
      expect(loggedMessages).toContain('Review Summary');
      expect(loggedMessages).toContain('Files Reviewed: 5');
      expect(loggedMessages).toContain('Critical: 2');
      expect(loggedMessages).toContain('Warning: 3');
      expect(loggedMessages).toContain('Suggestion: 1');
      expect(loggedMessages).toContain('Verdict: request_changes');
      expect(loggedMessages).toContain('Tokens Used: 10000');
      expect(loggedMessages).toContain('Estimated Cost: $0.0450');
    });

    it('should handle zero issues', () => {
      const summary: ReviewSummary = {
        filesReviewed: 3,
        issuesFound: {
          critical: 0,
          warning: 0,
          suggestion: 0,
        },
        verdict: 'approve',
        tokensUsed: 5000,
        estimatedCost: 0.0225,
      };

      Logger.logSummary(summary);

      const loggedMessages = (core.info as jest.Mock).mock.calls.map(call => call[0]).join('\n');

      expect(loggedMessages).toContain('Critical: 0');
      expect(loggedMessages).toContain('Warning: 0');
      expect(loggedMessages).toContain('Suggestion: 0');
      expect(loggedMessages).toContain('Verdict: approve');
    });

    it('should format cost with 4 decimal places', () => {
      const summary: ReviewSummary = {
        filesReviewed: 1,
        issuesFound: { critical: 0, warning: 0, suggestion: 0 },
        verdict: 'comment',
        tokensUsed: 1234,
        estimatedCost: 0.00567891,
      };

      Logger.logSummary(summary);

      const loggedMessages = (core.info as jest.Mock).mock.calls.map(call => call[0]).join('\n');

      expect(loggedMessages).toContain('Estimated Cost: $0.0057');
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost for Claude 3.5 Sonnet', () => {
      const cost = Logger.estimateCost(10000, 'claude-3-5-sonnet-20241022');

      // 10000 tokens: 8000 input @ $3/M + 2000 output @ $15/M
      // = (8000/1M * 3) + (2000/1M * 15) = 0.024 + 0.030 = 0.054
      expect(cost).toBeCloseTo(0.054, 4);
    });

    it('should calculate cost for Claude 3 Opus', () => {
      const cost = Logger.estimateCost(10000, 'claude-3-opus-20240229');

      // 10000 tokens: 8000 input @ $15/M + 2000 output @ $75/M
      // = (8000/1M * 15) + (2000/1M * 75) = 0.120 + 0.150 = 0.270
      expect(cost).toBeCloseTo(0.270, 4);
    });

    it('should calculate cost for GPT-4', () => {
      const cost = Logger.estimateCost(10000, 'gpt-4');

      // 10000 tokens: 8000 input @ $30/M + 2000 output @ $60/M
      // = (8000/1M * 30) + (2000/1M * 60) = 0.240 + 0.120 = 0.360
      expect(cost).toBeCloseTo(0.360, 4);
    });

    it('should calculate cost for GPT-4 Turbo', () => {
      const cost = Logger.estimateCost(10000, 'gpt-4-turbo');

      // 10000 tokens: 8000 input @ $10/M + 2000 output @ $30/M
      // = (8000/1M * 10) + (2000/1M * 30) = 0.080 + 0.060 = 0.140
      expect(cost).toBeCloseTo(0.140, 4);
    });

    it('should calculate cost for GPT-3.5 Turbo', () => {
      const cost = Logger.estimateCost(10000, 'gpt-3.5-turbo');

      // 10000 tokens: 8000 input @ $0.5/M + 2000 output @ $1.5/M
      // = (8000/1M * 0.5) + (2000/1M * 1.5) = 0.004 + 0.003 = 0.007
      expect(cost).toBeCloseTo(0.007, 4);
    });

    it('should handle zero tokens', () => {
      const cost = Logger.estimateCost(0, 'claude-3-5-sonnet-20241022');

      expect(cost).toBe(0);
    });

    it('should handle large token counts', () => {
      const cost = Logger.estimateCost(1000000, 'claude-3-5-sonnet-20241022');

      // 1M tokens: 800k input @ $3/M + 200k output @ $15/M
      // = (800k/1M * 3) + (200k/1M * 15) = 2.4 + 3.0 = 5.4
      expect(cost).toBeCloseTo(5.4, 4);
    });

    it('should default to Claude 3.5 Sonnet pricing for unknown models', () => {
      const cost = Logger.estimateCost(10000, 'unknown-model-xyz');

      // Should use default pricing (Claude 3.5 Sonnet)
      expect(cost).toBeCloseTo(0.054, 4);
    });

    it('should handle model names with different formats', () => {
      // Test with alternative naming format
      const cost1 = Logger.estimateCost(10000, 'claude-3.5-sonnet');
      const cost2 = Logger.estimateCost(10000, 'claude-3-5-sonnet');

      // Both should use same pricing
      expect(cost1).toBeCloseTo(0.054, 4);
      expect(cost2).toBeCloseTo(0.054, 4);
    });
  });
});
