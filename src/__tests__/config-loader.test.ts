/**
 * Unit tests for ConfigurationLoader
 * Validates: Requirements 1.3, 1.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import * as core from '@actions/core';
import { ConfigurationLoader } from '../config-loader';
import { ActionConfig } from '../types';

// Mock @actions/core
jest.mock('@actions/core');
const mockedCore = core as jest.Mocked<typeof core>;

describe('ConfigurationLoader', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('load()', () => {
    it('should load configuration with all required fields', () => {
      // Mock inputs
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          model: 'claude-3-5-sonnet-20241022',
          max_files: '50',
          severity_threshold: 'suggestion',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();

      expect(config).toEqual({
        githubToken: 'ghp_test_token',
        anthropicApiKey: 'sk-ant-test-key',
        openaiApiKey: undefined,
        model: 'claude-3-5-sonnet-20241022',
        maxFiles: 50,
        severityThreshold: 'suggestion',
        provider: 'anthropic',
      });
    });

    it('should use OpenAI provider when only openai_api_key is provided', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          openai_api_key: 'sk-test-openai-key',
          model: 'gpt-4',
          max_files: '30',
          severity_threshold: 'warning',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();

      expect(config.provider).toBe('openai');
      expect(config.openaiApiKey).toBe('sk-test-openai-key');
      expect(config.anthropicApiKey).toBeUndefined();
    });

    it('should apply default values for optional fields', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();

      expect(config.model).toBe('claude-3-5-sonnet-20241022');
      expect(config.maxFiles).toBe(50);
      expect(config.severityThreshold).toBe('suggestion');
    });

    it('should determine provider based on model name when both API keys are provided', () => {
      // Test Anthropic model
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          openai_api_key: 'sk-test-openai-key',
          model: 'claude-3-opus-20240229',
        };
        return inputs[name] || '';
      });

      let config = ConfigurationLoader.load();
      expect(config.provider).toBe('anthropic');

      // Test OpenAI model
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          openai_api_key: 'sk-test-openai-key',
          model: 'gpt-4-turbo',
        };
        return inputs[name] || '';
      });

      config = ConfigurationLoader.load();
      expect(config.provider).toBe('openai');
    });

    it('should throw error when github_token is missing', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        if (name === 'github_token' && options?.required) {
          throw new Error('Input required and not supplied: github_token');
        }
        return '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Input required and not supplied: github_token');
    });

    it('should throw error when no API keys are provided', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
        };
        return inputs[name] || '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Either anthropic_api_key or openai_api_key must be provided');
    });

    it('should throw error for invalid max_files value', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          max_files: 'invalid',
        };
        return inputs[name] || '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Invalid max_files value: invalid');
    });

    it('should throw error for negative max_files value', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          max_files: '-5',
        };
        return inputs[name] || '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Invalid max_files value: -5');
    });

    it('should throw error for zero max_files value', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          max_files: '0',
        };
        return inputs[name] || '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Invalid max_files value: 0');
    });

    it('should throw error for invalid severity_threshold value', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          severity_threshold: 'invalid',
        };
        return inputs[name] || '';
      });

      expect(() => ConfigurationLoader.load()).toThrow('Invalid severity_threshold: invalid');
    });

    it('should accept all valid severity threshold values', () => {
      const severities = ['critical', 'warning', 'suggestion'];

      severities.forEach((severity) => {
        mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
          const inputs: Record<string, string> = {
            github_token: 'ghp_test_token',
            anthropic_api_key: 'sk-ant-test-key',
            severity_threshold: severity,
          };
          return inputs[name] || '';
        });

        const config = ConfigurationLoader.load();
        expect(config.severityThreshold).toBe(severity);
      });
    });

    it('should parse custom max_files value', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          max_files: '100',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();
      expect(config.maxFiles).toBe(100);
    });

    it('should handle custom model names', () => {
      mockedCore.getInput.mockImplementation((name: string, options?: core.InputOptions) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          model: 'claude-3-opus-20240229',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();
      expect(config.model).toBe('claude-3-opus-20240229');
    });

    it('should detect OpenAI provider for o1 models', () => {
      mockedCore.getInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'ghp_test_token',
          anthropic_api_key: 'sk-ant-test-key',
          openai_api_key: 'sk-test-openai-key',
          model: 'o1-preview',
        };
        return inputs[name] || '';
      });

      const config = ConfigurationLoader.load();
      expect(config.provider).toBe('openai');
    });
  });
});
