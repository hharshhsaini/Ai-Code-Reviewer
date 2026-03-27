/**
 * Logger
 * Structured logging for GitHub Actions
 */
import { ReviewSummary } from './types';
export declare class Logger {
    /**
     * Log info message
     */
    static info(message: string): void;
    /**
     * Log warning message
     */
    static warning(message: string): void;
    /**
     * Log error with context
     */
    static error(category: string, message: string, context?: any, action?: string): void;
    /**
     * Log review summary
     */
    static logSummary(summary: ReviewSummary): void;
    /**
     * Calculate estimated cost based on token usage
     * Pricing as of 2024 (per million tokens):
     * - claude-3-5-sonnet: $3 input, $15 output
     * - claude-3-opus: $15 input, $75 output
     * - gpt-4: $30 input, $60 output
     * - gpt-4-turbo: $10 input, $30 output
     * - gpt-3.5-turbo: $0.50 input, $1.50 output
     */
    static estimateCost(tokensUsed: number, model: string): number;
}
//# sourceMappingURL=logger.d.ts.map