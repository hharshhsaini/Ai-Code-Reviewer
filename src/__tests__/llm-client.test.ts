/**
 * Unit tests for LLM Client
 * Validates: Requirements 5.1, 5.5, 5.6, 10.2, 10.4
 */

import { createLLMClient, AnthropicClient, OpenAIClient, buildReviewPrompt } from '../llm-client';
import { DiffChunk, DiffFile } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Mock the SDKs
jest.mock('@anthropic-ai/sdk');
jest.mock('openai');

describe('LLM Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLLMClient', () => {
    it('should create AnthropicClient when provider is anthropic', () => {
      const client = createLLMClient('anthropic', 'test-key', 'claude-3-5-sonnet-20241022');
      expect(client).toBeInstanceOf(AnthropicClient);
    });

    it('should create OpenAIClient when provider is openai', () => {
      const client = createLLMClient('openai', 'test-key', 'gpt-4');
      expect(client).toBeInstanceOf(OpenAIClient);
    });
  });

  describe('AnthropicClient', () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
      mockCreate = jest.fn();
      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));
    });

    describe('constructor', () => {
      it('should initialize with API key and model', () => {
        const client = new AnthropicClient('test-api-key', 'claude-3-5-sonnet-20241022');
        expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
        expect(client).toBeDefined();
      });
    });

    describe('review', () => {
      it('should call Anthropic API with correct parameters', async () => {
        const mockResponse = {
          content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        await client.review(chunk);

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: expect.any(String),
            }
          ]
        });
      });

      it('should return text content from response', async () => {
        const mockResponse = {
          content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        const result = await client.review(chunk);

        expect(result).toBe('{"issues":[],"summary":"test","verdict":"approve"}');
      });

      it('should throw error if response format is unexpected', async () => {
        const mockResponse = {
          content: [{ type: 'image', data: 'base64...' }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Unexpected response format from Anthropic API');
      });

      it('should retry on transient errors (5xx)', async () => {
        const error = new Error('Internal Server Error');
        (error as any).status = 500;

        const mockResponse = {
          content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
        };

        mockCreate
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        const result = await client.review(chunk);

        expect(mockCreate).toHaveBeenCalledTimes(2);
        expect(result).toBe('{"issues":[],"summary":"test","verdict":"approve"}');
      });

      it('should retry on connection errors', async () => {
        const error = new Error('Connection reset');
        (error as any).code = 'ECONNRESET';

        const mockResponse = {
          content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
        };

        mockCreate
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        const result = await client.review(chunk);

        expect(mockCreate).toHaveBeenCalledTimes(2);
        expect(result).toBe('{"issues":[],"summary":"test","verdict":"approve"}');
      });

      it('should not retry on authentication errors (4xx)', async () => {
        const error = new Error('Invalid API key');
        (error as any).status = 401;

        mockCreate.mockRejectedValue(error);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Invalid API key');
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      it('should throw after max retries on persistent errors', async () => {
        const error = new Error('Service Unavailable');
        (error as any).status = 503;

        mockCreate.mockRejectedValue(error);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Service Unavailable');
        expect(mockCreate).toHaveBeenCalledTimes(2); // Initial + 1 retry
      });

      it('should use exponential backoff for retries', async () => {
        const error = new Error('Timeout');
        (error as any).code = 'ETIMEDOUT';

        const mockResponse = {
          content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
        };

        mockCreate
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResponse);

        const client = new AnthropicClient('test-key', 'claude-3-5-sonnet-20241022');
        const chunk = createMockChunk();

        const startTime = Date.now();
        await client.review(chunk);
        const endTime = Date.now();

        // Should have waited at least 1000ms (first retry delay)
        expect(endTime - startTime).toBeGreaterThanOrEqual(900);
      });
    });
  });

  describe('OpenAIClient', () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
      mockCreate = jest.fn();
      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      } as any));
    });

    describe('constructor', () => {
      it('should initialize with API key and model', () => {
        const client = new OpenAIClient('test-api-key', 'gpt-4');
        expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
        expect(client).toBeDefined();
      });
    });

    describe('review', () => {
      it('should call OpenAI API with correct parameters', async () => {
        const mockResponse = {
          choices: [{ message: { content: '{"issues":[],"summary":"test","verdict":"approve"}' } }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        await client.review(chunk);

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert code reviewer. Respond with valid JSON only.'
            },
            {
              role: 'user',
              content: expect.any(String),
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 4096
        });
      });

      it('should return content from response', async () => {
        const mockResponse = {
          choices: [{ message: { content: '{"issues":[],"summary":"test","verdict":"approve"}' } }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        const result = await client.review(chunk);

        expect(result).toBe('{"issues":[],"summary":"test","verdict":"approve"}');
      });

      it('should throw error if response is empty', async () => {
        const mockResponse = {
          choices: [{ message: { content: null } }]
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Empty response from OpenAI API');
      });

      it('should throw error if choices array is empty', async () => {
        const mockResponse = {
          choices: []
        };
        mockCreate.mockResolvedValue(mockResponse);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Empty response from OpenAI API');
      });

      it('should retry on transient errors (5xx)', async () => {
        const error = new Error('Bad Gateway');
        (error as any).status = 502;

        const mockResponse = {
          choices: [{ message: { content: '{"issues":[],"summary":"test","verdict":"approve"}' } }]
        };

        mockCreate
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce(mockResponse);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        const result = await client.review(chunk);

        expect(mockCreate).toHaveBeenCalledTimes(2);
        expect(result).toBe('{"issues":[],"summary":"test","verdict":"approve"}');
      });

      it('should not retry on authentication errors', async () => {
        const error = new Error('Incorrect API key');
        (error as any).status = 401;

        mockCreate.mockRejectedValue(error);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Incorrect API key');
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      it('should throw after max retries', async () => {
        const error = new Error('Gateway Timeout');
        (error as any).status = 504;

        mockCreate.mockRejectedValue(error);

        const client = new OpenAIClient('test-key', 'gpt-4');
        const chunk = createMockChunk();

        await expect(client.review(chunk)).rejects.toThrow('Gateway Timeout');
        expect(mockCreate).toHaveBeenCalledTimes(2); // Initial + 1 retry
      });
    });
  });

  describe('buildReviewPrompt', () => {
    it('should include file paths in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('File: src/test.ts');
    });

    it('should include file status in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('(modified)');
    });

    it('should include patch content in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('mock patch content');
    });

    it('should include chunk metadata in the prompt', () => {
      const chunk: DiffChunk = {
        files: [createMockFile()],
        estimatedTokens: 500,
        metadata: {
          chunkIndex: 2,
          totalChunks: 5,
        },
      };

      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('Chunk 3 of 5'); // chunkIndex is 0-based
    });

    it('should include severity guidelines in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain('WARNING');
      expect(prompt).toContain('SUGGESTION');
    });

    it('should include output format instructions in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('JSON object');
      expect(prompt).toContain('issues');
      expect(prompt).toContain('summary');
      expect(prompt).toContain('verdict');
    });

    it('should include focus areas in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('Logic errors');
      expect(prompt).toContain('Security vulnerabilities');
      expect(prompt).toContain('Performance problems');
    });

    it('should include exclusions in the prompt', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('Do NOT report');
      expect(prompt).toContain('Style issues');
    });

    it('should handle multiple files in chunk', () => {
      const chunk: DiffChunk = {
        files: [
          createMockFile('src/file1.ts', 'added'),
          createMockFile('src/file2.ts', 'modified'),
          createMockFile('src/file3.ts', 'removed'),
        ],
        estimatedTokens: 1500,
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
        },
      };

      const prompt = buildReviewPrompt(chunk);

      expect(prompt).toContain('File: src/file1.ts (added)');
      expect(prompt).toContain('File: src/file2.ts (modified)');
      expect(prompt).toContain('File: src/file3.ts (removed)');
    });

    it('should format files with separators', () => {
      const chunk = createMockChunk();
      const prompt = buildReviewPrompt(chunk);

      // Should have separator lines
      expect(prompt).toMatch(/={2,}/);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockFile(
  path: string = 'src/test.ts',
  status: 'added' | 'modified' | 'removed' | 'renamed' = 'modified'
): DiffFile {
  return {
    path,
    status,
    additions: 10,
    deletions: 5,
    patch: 'mock patch content',
    hunks: [],
  };
}

function createMockChunk(): DiffChunk {
  return {
    files: [createMockFile()],
    estimatedTokens: 500,
    metadata: {
      chunkIndex: 0,
      totalChunks: 1,
    },
  };
}
