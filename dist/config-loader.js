"use strict";
/**
 * Configuration Loader
 * Parses action.yml inputs and validates configuration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationLoader = void 0;
const core = __importStar(require("@actions/core"));
class ConfigurationLoader {
    /**
     * Load and validate configuration from GitHub Actions inputs
     */
    static load() {
        // Read required inputs
        const githubToken = core.getInput('github_token', { required: true });
        // Read optional API keys
        const anthropicApiKey = core.getInput('anthropic_api_key') || undefined;
        const openaiApiKey = core.getInput('openai_api_key') || undefined;
        const ollamaBaseUrl = core.getInput('ollama_base_url') || undefined;
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
        const validSeverities = ['critical', 'warning', 'suggestion'];
        if (!validSeverities.includes(severityThresholdStr)) {
            throw new Error(`Invalid severity_threshold: ${severityThresholdStr}. Must be one of: critical, warning, suggestion.`);
        }
        const severityThreshold = severityThresholdStr;
        // Build partial config for validation
        const partialConfig = {
            githubToken,
            anthropicApiKey,
            openaiApiKey,
            ollamaBaseUrl,
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
            ollamaBaseUrl,
            model,
            maxFiles,
            severityThreshold,
            provider,
        };
    }
    /**
     * Validate that required credentials are present
     */
    static validateCredentials(config) {
        // GitHub token is always required
        if (!config.githubToken) {
            throw new Error('github_token is required');
        }
        // At least one LLM API key or Ollama base URL must be provided
        if (!config.anthropicApiKey && !config.openaiApiKey && !config.ollamaBaseUrl) {
            throw new Error('Either anthropic_api_key, openai_api_key, or ollama_base_url must be provided');
        }
    }
    /**
     * Determine provider based on which API key is provided
     */
    static determineProvider(config) {
        // If Ollama base URL is provided, use Ollama
        if (config.ollamaBaseUrl) {
            return 'ollama';
        }
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
        throw new Error('No API key or Ollama base URL provided');
    }
}
exports.ConfigurationLoader = ConfigurationLoader;
//# sourceMappingURL=config-loader.js.map