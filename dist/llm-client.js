"use strict";
/**
 * LLM Client
 * Abstracts provider-specific SDKs (Anthropic, OpenAI)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = exports.OpenAIClient = exports.AnthropicClient = void 0;
exports.createLLMClient = createLLMClient;
exports.buildReviewPrompt = buildReviewPrompt;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
class AnthropicClient {
    client;
    model;
    maxRetries = 2;
    constructor(apiKey, model) {
        this.client = new sdk_1.default({ apiKey });
        this.model = model;
    }
    async review(chunk) {
        const prompt = buildReviewPrompt(chunk);
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.client.messages.create({
                    model: this.model,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                });
                // Extract text content from response
                const content = response.content[0];
                if (content.type === 'text') {
                    return content.text;
                }
                throw new Error('Unexpected response format from Anthropic API');
            }
            catch (error) {
                // Check if this is a transient error that should be retried
                const isTransient = error.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
                if (attempt < this.maxRetries && isTransient) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                // Re-throw if not retryable or max retries reached
                throw error;
            }
        }
        throw new Error('Max retries reached');
    }
}
exports.AnthropicClient = AnthropicClient;
class OpenAIClient {
    client;
    model;
    maxRetries = 2;
    constructor(apiKey, model) {
        this.client = new openai_1.default({ apiKey });
        this.model = model;
    }
    async review(chunk) {
        const prompt = buildReviewPrompt(chunk);
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert code reviewer. Respond with valid JSON only.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 4096
                });
                const content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error('Empty response from OpenAI API');
                }
                return content;
            }
            catch (error) {
                // Check if this is a transient error that should be retried
                const isTransient = error.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
                if (attempt < this.maxRetries && isTransient) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                // Re-throw if not retryable or max retries reached
                throw error;
            }
        }
        throw new Error('Max retries reached');
    }
}
exports.OpenAIClient = OpenAIClient;
class OllamaClient {
    baseUrl;
    model;
    maxRetries = 2;
    constructor(baseUrl, model) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.model = model;
    }
    async review(chunk) {
        const prompt = buildReviewPrompt(chunk);
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert code reviewer. Respond with valid JSON only.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        stream: false,
                        format: 'json'
                    })
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                const content = data.message?.content;
                if (!content) {
                    throw new Error('Empty response from Ollama API');
                }
                return content;
            }
            catch (error) {
                // Check if this is a transient error that should be retried
                const isTransient = error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED';
                if (attempt < this.maxRetries && isTransient) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    continue;
                }
                // Re-throw if not retryable or max retries reached
                throw error;
            }
        }
        throw new Error('Max retries reached');
    }
}
exports.OllamaClient = OllamaClient;
/**
 * Create LLM client based on provider
 */
function createLLMClient(provider, apiKey, model) {
    if (provider === 'anthropic') {
        return new AnthropicClient(apiKey, model);
    }
    else if (provider === 'openai') {
        return new OpenAIClient(apiKey, model);
    }
    else {
        // For Ollama, apiKey is actually the base URL
        return new OllamaClient(apiKey, model);
    }
}
/**
 * Construct review prompt
 */
function buildReviewPrompt(chunk) {
    // Format the diff chunk into a readable string
    const diffText = chunk.files.map(file => {
        const header = `File: ${file.path} (${file.status})`;
        const separator = '='.repeat(header.length);
        return `${separator}\n${header}\n${separator}\n${file.patch}\n`;
    }).join('\n');
    return `You are an expert code reviewer. Analyze the following code changes and identify issues.

Focus on:
- Logic errors and bugs
- Security vulnerabilities (SQL injection, XSS, auth bypasses, etc.)
- Performance problems (N+1 queries, memory leaks, inefficient algorithms)
- Error handling gaps
- Race conditions and concurrency issues
- Architectural concerns (tight coupling, violation of SOLID principles)

Do NOT report:
- Style issues (formatting, naming conventions) - linters handle this
- Missing comments or documentation
- Subjective preferences

Severity Guidelines:
- CRITICAL: Security vulnerabilities, data loss risks, crashes, logic errors that break functionality
- WARNING: Performance issues, error handling gaps, code smells that could lead to bugs
- SUGGESTION: Refactoring opportunities, better patterns, minor improvements

Output Format:
Return a JSON object with this exact structure:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "file": "path/to/file.ts",
      "line": 42,
      "comment": "Detailed explanation of the issue",
      "suggestion": "Optional: suggested code fix"
    }
  ],
  "summary": "Brief overview of the review (2-3 sentences)",
  "verdict": "approve" | "request_changes" | "comment"
}

Verdict Guidelines:
- approve: No critical or warning issues found
- request_changes: Critical issues found that must be fixed
- comment: Only suggestions or warnings that don't block merge

Code Changes (Chunk ${chunk.metadata.chunkIndex + 1} of ${chunk.metadata.totalChunks}):
${diffText}

Respond with ONLY the JSON object, no additional text.`;
}
//# sourceMappingURL=llm-client.js.map