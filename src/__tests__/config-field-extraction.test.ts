/**
 * Property-based tests for configuration field extraction
 * Feature: ai-code-reviewer, Property 2: Configuration Field Extraction
 * Validates: Requirements 1.3, 1.4, 12.7
 */

import * as fc from 'fast-check';
import * as core from '@actions/core';
import { ConfigurationLoader } from '../config-loader';
import { ActionConfig, Severity } from '../types';

// Mock @actions/core
jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

/**
 * fast-check arbitrary for generating valid action inputs
 * This generates the raw string inputs that would come from action.yml
 */
const actionInputsArbitrary = fc.record({
  github_token: fc.string({ minLength: 10, maxLength: 100 }),
  anthropic_api_key: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
  openai_api_key: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
  model: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
  max_files: fc.option(fc.integer({ min: 1, max: 1000 }).map(n => n.toString()), { nil: undefined }),
  severity_threshold: fc.option(fc.constantFrom('critical', 'warning', 'suggestion'), { nil: undefined }),
}).filter(inputs => {
  // Ensure at least one API key is provided
  return inputs.anthropic_api_key !== undefined || inputs.openai_api_key !== undefined;
});

/**
 * Helper to setup mocked core.getInput for a given set of inputs
 */
function setupMockedInputs(inputs: Record<string, string | undefined>): void {
  mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
    if (name === 'github_token' && options?.required) {
      return inputs[name] || '';
    }
    return inputs[name] || '';
  });
}

describe('Configuration Field Extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 2: Configuration Field Extraction
   * 
   * For any valid action.yml file containing required fields (github_token, api_keys),
   * parsing SHALL extract all specified fields into the Configuration object with correct types.
   * 
   * **Validates: Requirements 1.3, 1.4, 12.7**
   */
  it('should extract all fields from valid action inputs with correct types', () => {
    fc.assert(
      fc.property(actionInputsArbitrary, (inputs) => {
        // Setup mocked inputs
        setupMockedInputs(inputs);

        // Load configuration
        const config = ConfigurationLoader.load();

        // Verify github_token is extracted
        expect(config.githubToken).toBe(inputs.github_token);
        expect(typeof config.githubToken).toBe('string');

        // Verify API keys are extracted (if provided)
        if (inputs.anthropic_api_key) {
          expect(config.anthropicApiKey).toBe(inputs.anthropic_api_key);
          expect(typeof config.anthropicApiKey).toBe('string');
        }
        if (inputs.openai_api_key) {
          expect(config.openaiApiKey).toBe(inputs.openai_api_key);
          expect(typeof config.openaiApiKey).toBe('string');
        }

        // Verify model is extracted or defaults
        if (inputs.model) {
          expect(config.model).toBe(inputs.model);
        } else {
          expect(config.model).toBe('claude-3-5-sonnet-20241022');
        }
        expect(typeof config.model).toBe('string');

        // Verify max_files is extracted and converted to number
        if (inputs.max_files) {
          expect(config.maxFiles).toBe(parseInt(inputs.max_files, 10));
        } else {
          expect(config.maxFiles).toBe(50);
        }
        expect(typeof config.maxFiles).toBe('number');

        // Verify severity_threshold is extracted or defaults
        if (inputs.severity_threshold) {
          expect(config.severityThreshold).toBe(inputs.severity_threshold);
        } else {
          expect(config.severityThreshold).toBe('suggestion');
        }
        expect(typeof config.severityThreshold).toBe('string');

        // Verify provider is determined correctly
        expect(['anthropic', 'openai']).toContain(config.provider);
        expect(typeof config.provider).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All required fields must be present in extracted config
   */
  it('should always extract required fields (githubToken, provider, model, maxFiles, severityThreshold)', () => {
    fc.assert(
      fc.property(actionInputsArbitrary, (inputs) => {
        setupMockedInputs(inputs);
        const config = ConfigurationLoader.load();

        // Required fields must always be present
        expect(config.githubToken).toBeDefined();
        expect(config.provider).toBeDefined();
        expect(config.model).toBeDefined();
        expect(config.maxFiles).toBeDefined();
        expect(config.severityThreshold).toBeDefined();

        // Required fields must have correct types
        expect(typeof config.githubToken).toBe('string');
        expect(['anthropic', 'openai']).toContain(config.provider);
        expect(typeof config.model).toBe('string');
        expect(typeof config.maxFiles).toBe('number');
        expect(['critical', 'warning', 'suggestion']).toContain(config.severityThreshold);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Optional fields should be undefined when not provided
   */
  it('should leave optional API keys undefined when not provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          github_token: fc.string({ minLength: 10 }),
          anthropic_api_key: fc.string({ minLength: 10 }),
        }),
        (inputs) => {
          // Only provide github_token and anthropic_api_key
          setupMockedInputs({
            github_token: inputs.github_token,
            anthropic_api_key: inputs.anthropic_api_key,
          });

          const config = ConfigurationLoader.load();

          // anthropic_api_key should be present
          expect(config.anthropicApiKey).toBe(inputs.anthropic_api_key);
          
          // openai_api_key should be undefined
          expect(config.openaiApiKey).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Default values should be applied for optional fields
   */
  it('should apply default values when optional fields are not provided', () => {
    fc.assert(
      fc.property(
        fc.record({
          github_token: fc.string({ minLength: 10 }),
          anthropic_api_key: fc.string({ minLength: 10 }),
        }),
        (inputs) => {
          // Only provide required fields
          setupMockedInputs({
            github_token: inputs.github_token,
            anthropic_api_key: inputs.anthropic_api_key,
          });

          const config = ConfigurationLoader.load();

          // Defaults should be applied
          expect(config.model).toBe('claude-3-5-sonnet-20241022');
          expect(config.maxFiles).toBe(50);
          expect(config.severityThreshold).toBe('suggestion');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Provider determination should be consistent
   */
  it('should determine provider based on available API keys', () => {
    fc.assert(
      fc.property(
        fc.record({
          github_token: fc.string({ minLength: 10 }),
          has_anthropic: fc.boolean(),
          has_openai: fc.boolean(),
          model: fc.option(
            fc.oneof(
              fc.constant('claude-3-5-sonnet-20241022'),
              fc.constant('claude-3-opus-20240229'),
              fc.constant('gpt-4'),
              fc.constant('gpt-4-turbo'),
              fc.constant('o1-preview')
            ),
            { nil: undefined }
          ),
        }).filter(inputs => inputs.has_anthropic || inputs.has_openai),
        (inputs) => {
          const mockInputs: Record<string, string | undefined> = {
            github_token: inputs.github_token,
          };

          if (inputs.has_anthropic) {
            mockInputs.anthropic_api_key = 'sk-ant-test-key';
          }
          if (inputs.has_openai) {
            mockInputs.openai_api_key = 'sk-test-openai-key';
          }
          if (inputs.model) {
            mockInputs.model = inputs.model;
          }

          setupMockedInputs(mockInputs);
          const config = ConfigurationLoader.load();

          // Verify provider is determined correctly
          if (inputs.has_anthropic && inputs.has_openai) {
            // Both keys provided - check model name
            const model = inputs.model || 'claude-3-5-sonnet-20241022';
            if (model.startsWith('gpt-') || model.startsWith('o1-')) {
              expect(config.provider).toBe('openai');
            } else {
              expect(config.provider).toBe('anthropic');
            }
          } else if (inputs.has_anthropic) {
            expect(config.provider).toBe('anthropic');
          } else if (inputs.has_openai) {
            expect(config.provider).toBe('openai');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Numeric string fields should be converted to numbers
   */
  it('should convert max_files string to number type', () => {
    fc.assert(
      fc.property(
        fc.record({
          github_token: fc.string({ minLength: 10 }),
          anthropic_api_key: fc.string({ minLength: 10 }),
          max_files: fc.integer({ min: 1, max: 1000 }),
        }),
        (inputs) => {
          setupMockedInputs({
            github_token: inputs.github_token,
            anthropic_api_key: inputs.anthropic_api_key,
            max_files: inputs.max_files.toString(),
          });

          const config = ConfigurationLoader.load();

          // max_files should be converted to number
          expect(config.maxFiles).toBe(inputs.max_files);
          expect(typeof config.maxFiles).toBe('number');
          expect(Number.isInteger(config.maxFiles)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Severity threshold should be validated
   */
  it('should only accept valid severity threshold values', () => {
    fc.assert(
      fc.property(
        fc.record({
          github_token: fc.string({ minLength: 10 }),
          anthropic_api_key: fc.string({ minLength: 10 }),
          severity_threshold: fc.constantFrom('critical', 'warning', 'suggestion'),
        }),
        (inputs) => {
          setupMockedInputs({
            github_token: inputs.github_token,
            anthropic_api_key: inputs.anthropic_api_key,
            severity_threshold: inputs.severity_threshold,
          });

          const config = ConfigurationLoader.load();

          // Severity threshold should be one of the valid values
          expect(['critical', 'warning', 'suggestion']).toContain(config.severityThreshold);
          expect(config.severityThreshold).toBe(inputs.severity_threshold);
        }
      ),
      { numRuns: 100 }
    );
  });
});
