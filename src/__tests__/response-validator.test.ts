/**
 * Unit tests for Response Validator
 * Validates: Requirements 5.4, 6.5
 */

import { ResponseValidator } from '../response-validator';
import { Logger } from '../logger';

// Mock the logger
jest.mock('../logger');

describe('Response Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return valid ReviewResponse for correct JSON', () => {
      const validResponse = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: 42,
            comment: 'This is a critical issue',
            suggestion: 'Fix it like this',
          },
        ],
        summary: 'Found 1 critical issue',
        verdict: 'request_changes',
      };

      const result = ResponseValidator.validate(JSON.stringify(validResponse));

      expect(result).not.toBeNull();
      expect(result).toEqual(validResponse);
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = '{ invalid json }';

      const result = ResponseValidator.validate(invalidJson);

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'JSON Parsing',
        'Failed to parse LLM response as JSON',
        expect.objectContaining({
          error: expect.any(String),
          responsePreview: expect.any(String),
        }),
        'Ensure LLM is configured to return valid JSON'
      );
    });

    it('should return null for malformed JSON with trailing comma', () => {
      const malformedJson = '{"issues": [], "summary": "test", "verdict": "approve",}';

      const result = ResponseValidator.validate(malformedJson);

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'JSON Parsing',
        expect.any(String),
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should return null when missing required field: issues', () => {
      const missingIssues = {
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingIssues));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        'LLM response does not conform to expected schema',
        expect.objectContaining({
          validationIssues: expect.arrayContaining([
            expect.objectContaining({
              path: 'issues',
            }),
          ]),
        }),
        'Check that LLM prompt requests correct output format'
      );
    });

    it('should return null when missing required field: summary', () => {
      const missingSummary = {
        issues: [],
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingSummary));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        expect.any(String),
        expect.objectContaining({
          validationIssues: expect.arrayContaining([
            expect.objectContaining({
              path: 'summary',
            }),
          ]),
        }),
        expect.any(String)
      );
    });

    it('should return null when missing required field: verdict', () => {
      const missingVerdict = {
        issues: [],
        summary: 'Test summary',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingVerdict));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        expect.any(String),
        expect.objectContaining({
          validationIssues: expect.arrayContaining([
            expect.objectContaining({
              path: 'verdict',
            }),
          ]),
        }),
        expect.any(String)
      );
    });

    it('should return null when verdict has invalid enum value', () => {
      const invalidVerdict = {
        issues: [],
        summary: 'Test summary',
        verdict: 'invalid_verdict',
      };

      const result = ResponseValidator.validate(JSON.stringify(invalidVerdict));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        expect.any(String),
        expect.objectContaining({
          validationIssues: expect.arrayContaining([
            expect.objectContaining({
              path: 'verdict',
            }),
          ]),
        }),
        expect.any(String)
      );
    });

    it('should return null when issue has invalid severity enum value', () => {
      const invalidSeverity = {
        issues: [
          {
            severity: 'invalid_severity',
            file: 'src/test.ts',
            line: 42,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(invalidSeverity));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        expect.any(String),
        expect.objectContaining({
          validationIssues: expect.arrayContaining([
            expect.objectContaining({
              path: 'issues.0.severity',
            }),
          ]),
        }),
        expect.any(String)
      );
    });

    it('should return null when issue is missing severity field', () => {
      const missingSeverity = {
        issues: [
          {
            file: 'src/test.ts',
            line: 42,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingSeverity));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue is missing file field', () => {
      const missingFile = {
        issues: [
          {
            severity: 'critical',
            line: 42,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingFile));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue is missing line field', () => {
      const missingLine = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingLine));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue is missing comment field', () => {
      const missingComment = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: 42,
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(missingComment));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue has empty file field', () => {
      const emptyFile = {
        issues: [
          {
            severity: 'critical',
            file: '',
            line: 42,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(emptyFile));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue has empty comment field', () => {
      const emptyComment = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: 42,
            comment: '',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(emptyComment));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue has non-positive line number', () => {
      const invalidLine = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: 0,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(invalidLine));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue has negative line number', () => {
      const negativeLine = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: -5,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(negativeLine));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issue has non-integer line number', () => {
      const floatLine = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test.ts',
            line: 42.5,
            comment: 'Test comment',
          },
        ],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(floatLine));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issues is not an array', () => {
      const issuesNotArray = {
        issues: 'not an array',
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(issuesNotArray));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should return null when issues array contains non-object elements', () => {
      const invalidIssueElement = {
        issues: ['string instead of object'],
        summary: 'Test summary',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(invalidIssueElement));

      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should accept valid response with empty issues array', () => {
      const emptyIssues = {
        issues: [],
        summary: 'No issues found',
        verdict: 'approve',
      };

      const result = ResponseValidator.validate(JSON.stringify(emptyIssues));

      expect(result).not.toBeNull();
      expect(result).toEqual(emptyIssues);
    });

    it('should accept valid response with optional suggestion field', () => {
      const withSuggestion = {
        issues: [
          {
            severity: 'warning',
            file: 'src/test.ts',
            line: 10,
            comment: 'Consider refactoring',
            suggestion: 'Use a more descriptive variable name',
          },
        ],
        summary: 'Found 1 warning',
        verdict: 'comment',
      };

      const result = ResponseValidator.validate(JSON.stringify(withSuggestion));

      expect(result).not.toBeNull();
      expect(result).toEqual(withSuggestion);
    });

    it('should accept valid response without optional suggestion field', () => {
      const withoutSuggestion = {
        issues: [
          {
            severity: 'suggestion',
            file: 'src/test.ts',
            line: 20,
            comment: 'This could be improved',
          },
        ],
        summary: 'Found 1 suggestion',
        verdict: 'comment',
      };

      const result = ResponseValidator.validate(JSON.stringify(withoutSuggestion));

      expect(result).not.toBeNull();
      expect(result).toEqual(withoutSuggestion);
    });

    it('should accept valid response with multiple issues', () => {
      const multipleIssues = {
        issues: [
          {
            severity: 'critical',
            file: 'src/auth.ts',
            line: 15,
            comment: 'SQL injection vulnerability',
            suggestion: 'Use parameterized queries',
          },
          {
            severity: 'warning',
            file: 'src/utils.ts',
            line: 42,
            comment: 'Potential memory leak',
          },
          {
            severity: 'suggestion',
            file: 'src/config.ts',
            line: 8,
            comment: 'Consider using environment variables',
          },
        ],
        summary: 'Found 1 critical, 1 warning, and 1 suggestion',
        verdict: 'request_changes',
      };

      const result = ResponseValidator.validate(JSON.stringify(multipleIssues));

      expect(result).not.toBeNull();
      expect(result).toEqual(multipleIssues);
    });

    it('should accept all valid severity values', () => {
      const allSeverities = {
        issues: [
          {
            severity: 'critical',
            file: 'src/test1.ts',
            line: 1,
            comment: 'Critical issue',
          },
          {
            severity: 'warning',
            file: 'src/test2.ts',
            line: 2,
            comment: 'Warning issue',
          },
          {
            severity: 'suggestion',
            file: 'src/test3.ts',
            line: 3,
            comment: 'Suggestion issue',
          },
        ],
        summary: 'All severity types',
        verdict: 'comment',
      };

      const result = ResponseValidator.validate(JSON.stringify(allSeverities));

      expect(result).not.toBeNull();
      expect(result).toEqual(allSeverities);
    });

    it('should accept all valid verdict values', () => {
      const verdicts = ['approve', 'request_changes', 'comment'];

      verdicts.forEach(verdict => {
        const response = {
          issues: [],
          summary: `Testing ${verdict}`,
          verdict,
        };

        const result = ResponseValidator.validate(JSON.stringify(response));

        expect(result).not.toBeNull();
        expect(result?.verdict).toBe(verdict);
      });
    });

    it('should log validation errors with helpful context', () => {
      const invalidResponse = {
        issues: [
          {
            severity: 'invalid',
            file: 'test.ts',
            line: 1,
            comment: 'test',
          },
        ],
        summary: 'test',
        verdict: 'invalid',
      };

      ResponseValidator.validate(JSON.stringify(invalidResponse));

      expect(Logger.error).toHaveBeenCalledWith(
        'Schema Validation',
        'LLM response does not conform to expected schema',
        expect.objectContaining({
          validationIssues: expect.any(Array),
        }),
        'Check that LLM prompt requests correct output format'
      );
    });

    it('should include response preview in JSON parse error', () => {
      const longInvalidJson = 'x'.repeat(300) + '{ invalid }';

      ResponseValidator.validate(longInvalidJson);

      expect(Logger.error).toHaveBeenCalledWith(
        'JSON Parsing',
        expect.any(String),
        expect.objectContaining({
          responsePreview: expect.stringMatching(/^.{0,200}$/),
        }),
        expect.any(String)
      );
    });
  });
});
