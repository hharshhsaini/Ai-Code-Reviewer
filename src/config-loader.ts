/**
 * Configuration Loader
 * Parses action.yml inputs and validates configuration
 */

import * as core from '@actions/core';
import { ActionConfig, Severity } from './types';

export class ConfigurationLoader {
  /**
   * Load and validate configuration from GitHub Actions inputs
   */
  static load(): ActionConfig {
    // Read required inputs
    const githubToken = core.getInput('github_token', { required: true });
    
    // Read optional API keys
    const anthropicApiKey = core.getInput('anthropic_api_key') || undefined;
    const openaiApiKey = core.getInput('openai_api_key') || undefined;
    
    // Read optional configuration with defaults
    const model = core.getInput('model') || 'claude-3-5-sonnet-20241022';
    const maxFilesStr = core.getInput('max_files') || '50';
    const severityThresholdStr = core.getInput('severity_threshold') || 'suggestion';
    
    // Parse numeric values
    const maxFiles = parseInt(maxFilesStr, 10);
    if (isNaN(maxFiles) || maxFiles <= 0) {
      throw new Error(`Invalid max_files value: ${maxFilesStr}. Must be a positive integer.`);
    }
    
    // Validate severity threshold
    const validSeverities: Severity[] = ['critical', 'warning', 'suggestion'];
    if (!validSeverities.includes(severityThresholdStr as Severity)) {
      throw new Error(`Invalid severity_threshold: ${severityThresholdStr}. Must be one of: critical, warning, suggestion.`);
    }
    const severityThreshold = severityThresholdStr as Severity;
    
    // Build partial config for validation
    const partialConfig: Partial<ActionConfig> = {
      githubToken,
      anthropicApiKey,
      openaiApiKey,
      model,
      maxFiles,
      severityThreshold,
    };
    
    // Validate credentials
    this.validateCredentials(partialConfig);
    
    // Determine provider
    const provider = this.determineProvider(partialConfig);
    
    // Return complete config
    return {
      githubToken,
      anthropicApiKey,
      openaiApiKey,
      model,
      maxFiles,
      severityThreshold,
      provider,
    };
  }

  /**
   * Validate that required credentials are present
   */
  private static validateCredentials(config: Partial<ActionConfig>): void {
    // GitHub token is always required
    if (!config.githubToken) {
      throw new Error('github_token is required');
    }
    
    // At least one LLM API key must be provided
    if (!config.anthropicApiKey && !config.openaiApiKey) {
      throw new Error('Either anthropic_api_key or openai_api_key must be provided');
    }
  }

  /**
   * Determine provider based on which API key is provided
   */
  private static determineProvider(config: Partial<ActionConfig>): 'anthropic' | 'openai' {
    // If both keys are provided, prefer Anthropic (based on default model)
    if (config.anthropicApiKey && config.openaiApiKey) {
      // Check model name to determine provider
      const model = config.model || 'claude-3-5-sonnet-20241022';
      if (model.startsWith('gpt-') || model.startsWith('o1-')) {
        return 'openai';
      }
      return 'anthropic';
    }
    
    // If only one key is provided, use that provider
    if (config.anthropicApiKey) {
      return 'anthropic';
    }
    
    if (config.openaiApiKey) {
      return 'openai';
    }
    
    // This should never happen due to validateCredentials check
    throw new Error('No API key provided');
  }
}
