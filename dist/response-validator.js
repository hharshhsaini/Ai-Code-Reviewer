"use strict";
/**
 * Response Validator
 * Validates LLM responses against schema
 * Validates: Requirements 5.3, 6.1, 6.2, 6.3, 6.4, 6.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseValidator = void 0;
const schemas_1 = require("./schemas");
const logger_1 = require("./logger");
class ResponseValidator {
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
    static validate(responseText) {
        try {
            // Parse JSON safely
            const parsed = this.parseJSON(responseText);
            if (parsed === null) {
                return null;
            }
            // Validate against schema
            const result = schemas_1.ReviewResponseSchema.safeParse(parsed);
            if (!result.success) {
                this.logValidationError(result.error);
                return null;
            }
            // Return typed response
            return result.data;
        }
        catch (error) {
            logger_1.Logger.error('Response Validation', 'Unexpected error during validation', { error: error instanceof Error ? error.message : String(error) }, 'Check LLM response format and schema definition');
            return null;
        }
    }
    /**
     * Parse JSON safely
     *
     * @param text - JSON string to parse
     * @returns Parsed object or null on parse failure
     */
    static parseJSON(text) {
        try {
            return JSON.parse(text);
        }
        catch (error) {
            logger_1.Logger.error('JSON Parsing', 'Failed to parse LLM response as JSON', {
                error: error instanceof Error ? error.message : String(error),
                responsePreview: text.substring(0, 200)
            }, 'Ensure LLM is configured to return valid JSON');
            return null;
        }
    }
    /**
     * Log validation error with helpful messages
     *
     * @param error - Zod validation error
     */
    static logValidationError(error) {
        const issues = error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
        }));
        logger_1.Logger.error('Schema Validation', 'LLM response does not conform to expected schema', { validationIssues: issues }, 'Check that LLM prompt requests correct output format');
    }
}
exports.ResponseValidator = ResponseValidator;
//# sourceMappingURL=response-validator.js.map