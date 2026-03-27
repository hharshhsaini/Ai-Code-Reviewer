/**
 * Property-based tests for LLM Client
 * Feature: ai-code-reviewer
 * Validates: Requirements 5.7
 */

import * as fc from 'fast-check';
import { createLLMClient, AnthropicClient, OpenAIClient } from '../llm-client';
import { DiffChunk } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Mock the SDKs
jest.mock('@anthropic-ai/sdk');
jest.mock('openai');

describe('LLM Client - Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 12: Model Configuration Propagation
   * 
   * For any model name specified in the configuration, 
   * the LLM_Client SHALL use that exact model identifier in API calls to the provider.
   * 
   * **Validates: Requirements 5.7**
   */
  describe('Property 12: Model Configuration Propagation', () => {
    it('should use the exact model name in Anthropic API calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          modelNameArbitrary(),
          diffChunkArbitrary(),
          async (modelName, chunk) => {
            // Mock Anthropic SDK
            const mockCreate = jest.fn().mockResolvedValue({
              content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
            });

            (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
              messages: {
                create: mockCreate,
              },
            } as any));

            // Create client with specific model
            const client = new AnthropicClient('test-key', modelName);
            await client.review(chunk);

            // Property: The model parameter in the API call should match exactly
            expect(mockCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                model: modelName,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use the exact model name in OpenAI API calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          modelNameArbitrary(),
          diffChunkArbitrary(),
          async (modelName, chunk) => {
            // Mock OpenAI SDK
            const mockCreate = jest.fn().mockResolvedValue({
              choices: [{ message: { content: '{"issues":[],"summary":"test","verdict":"approve"}' } }]
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
              chat: {
                completions: {
                  create: mockCreate,
                },
              },
            } as any));

            // Create client with specific model
            const client = new OpenAIClient('test-key', modelName);
            await client.review(chunk);

            // Property: The model parameter in the API call should match exactly
            expect(mockCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                model: modelName,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should propagate model name through factory function for Anthropic', async () => {
      await fc.assert(
        fc.asyncProperty(
          modelNameArbitrary(),
          diffChunkArbitrary(),
          async (modelName, chunk) => {
            // Mock Anthropic SDK
            const mockCreate = jest.fn().mockResolvedValue({
              content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
            });

            (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
              messages: {
                create: mockCreate,
              },
            } as any));

            // Create client using factory
            const client = createLLMClient('anthropic', 'test-key', modelName);
            await client.review(chunk);

            // Property: The model should be propagated correctly
            expect(mockCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                model: modelName,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should propagate model name through factory function for OpenAI', async () => {
      await fc.assert(
        fc.asyncProperty(
          modelNameArbitrary(),
          diffChunkArbitrary(),
          async (modelName, chunk) => {
            // Mock OpenAI SDK
            const mockCreate = jest.fn().mockResolvedValue({
              choices: [{ message: { content: '{"issues":[],"summary":"test","verdict":"approve"}' } }]
            });

            (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
              chat: {
                completions: {
                  create: mockCreate,
                },
              },
            } as any));

            // Create client using factory
            const client = createLLMClient('openai', 'test-key', modelName);
            await client.review(chunk);

            // Property: The model should be propagated correctly
            expect(mockCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                model: modelName,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve model name across multiple review calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          modelNameArbitrary(),
          fc.array(diffChunkArbitrary(), { minLength: 2, maxLength: 5 }),
          async (modelName, chunks) => {
            // Mock Anthropic SDK
            const mockCreate = jest.fn().mockResolvedValue({
              content: [{ type: 'text', text: '{"issues":[],"summary":"test","verdict":"approve"}' }]
            });

            (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
              messages: {
                create: mockCreate,
              },
            } as any));

            // Create client once
            const client = new AnthropicClient('test-key', modelName);

            // Make multiple review calls
            for (const chunk of chunks) {
              await client.review(chunk);
            }

            // Property: All calls should use the same model
            expect(mockCreate).toHaveBeenCalledTimes(chunks.length);
            for (let i = 0; i < chunks.length; i++) {
              expect(mockCreate).toHaveBeenNthCalledWith(
                i + 1,
                expect.objectContaining({
                  model: modelName,
                })
              );
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate realistic model names for various providers
 */
function modelNameArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Anthropic models
    fc.constantFrom(
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ),
    // OpenAI models
    fc.constantFrom(
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ),
    // Generic model name patterns
    fc.record({
      provider: fc.constantFrom('claude', 'gpt', 'llama', 'mistral'),
      version: fc.integer({ min: 1, max: 5 }),
      variant: fc.option(fc.constantFrom('turbo', 'opus', 'sonnet', 'haiku'), { nil: undefined }),
    }).map(({ provider, version, variant }) => 
      variant ? `${provider}-${version}-${variant}` : `${provider}-${version}`
    ),
  );
}

/**
 * Generate a mock DiffChunk for testing
 */
function diffChunkArbitrary(): fc.Arbitrary<DiffChunk> {
  return fc.record({
    files: fc.array(
      fc.record({
        path: fc.stringMatching(/^[a-z\/]+\.(ts|js|py)$/),
        status: fc.constantFrom('added', 'modified', 'removed', 'renamed'),
        additions: fc.nat({ max: 100 }),
        deletions: fc.nat({ max: 100 }),
        patch: fc.string({ minLength: 10, maxLength: 200 }),
        hunks: fc.constant([]),
      }),
      { minLength: 1, maxLength: 5 }
    ),
    estimatedTokens: fc.integer({ min: 100, max: 10000 }),
    metadata: fc.record({
      chunkIndex: fc.nat({ max: 10 }),
      totalChunks: fc.integer({ min: 1, max: 20 }),
    }),
  });
}
