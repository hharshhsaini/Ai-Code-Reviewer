/**
 * LLM Client
 * Abstracts provider-specific SDKs (Anthropic, OpenAI)
 */
import { DiffChunk } from './types';
export interface LLMClient {
    review(chunk: DiffChunk): Promise<string>;
}
export declare class AnthropicClient implements LLMClient {
    private client;
    private model;
    private maxRetries;
    constructor(apiKey: string, model: string);
    review(chunk: DiffChunk): Promise<string>;
}
export declare class OpenAIClient implements LLMClient {
    private client;
    private model;
    private maxRetries;
    constructor(apiKey: string, model: string);
    review(chunk: DiffChunk): Promise<string>;
}
export declare class OllamaClient implements LLMClient {
    private baseUrl;
    private model;
    private maxRetries;
    constructor(baseUrl: string, model: string);
    review(chunk: DiffChunk): Promise<string>;
}
/**
 * Create LLM client based on provider
 */
export declare function createLLMClient(provider: 'anthropic' | 'openai' | 'ollama', apiKey: string, model: string): LLMClient;
/**
 * Construct review prompt
 */
export declare function buildReviewPrompt(chunk: DiffChunk): string;
//# sourceMappingURL=llm-client.d.ts.map