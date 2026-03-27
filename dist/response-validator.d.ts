/**
 * Response Validator
 * Validates LLM responses against schema
 * Validates: Requirements 5.3, 6.1, 6.2, 6.3, 6.4, 6.5
 */
import { ReviewResponse } from './types';
export declare class ResponseValidator {
    /**
     * Validate and parse LLM response
     *
     * Parses JSON response from LLM and validates against ReviewResponseSchema.
     * Ensures all required fields are present and enum values are valid.
     * Logs validation errors with helpful messages.
     *
     * @param responseText - Raw JSON string from LLM
     * @returns Typed ReviewResponse object or null on validation failure
     */
    static validate(responseText: string): ReviewResponse | null;
    /**
     * Parse JSON safely
     *
     * @param text - JSON string to parse
     * @returns Parsed object or null on parse failure
     */
    private static parseJSON;
    /**
     * Log validation error with helpful messages
     *
     * @param error - Zod validation error
     */
    private static logValidationError;
}
//# sourceMappingURL=response-validator.d.ts.map