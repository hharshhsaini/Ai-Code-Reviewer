/**
 * Property-based tests for Response Validator
 * Feature: ai-code-reviewer
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import * as fc from 'fast-check';
import { ResponseValidator } from '../response-validator';
import { ReviewResponse, Severity, Verdict } from '../types';

describe('Response Validator - Property Tests', () => {
  /**
   * Property 11: LLM Response Schema Conformance
   * 
   * For any LLM response that passes validation, it SHALL conform to the 
   * ReviewResponseSchema with all required fields (issues array, summary string, 
   * verdict enum) and all issues SHALL have required fields (severity, file, line, comment).
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  describe('Property 11: LLM Response Schema Conformance', () => {
    it('should accept any valid ReviewResponse with all required fields', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            // Convert to JSON string (simulating LLM output)
            const jsonString = JSON.stringify(reviewResponse);

            // Validate
            const result = ResponseValidator.validate(jsonString);

            // Property: Valid responses should pass validation
            expect(result).not.toBeNull();
            expect(result).toEqual(reviewResponse);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that all issues have required severity field', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: All issues must have severity field
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach(issue => {
                expect(issue.severity).toBeDefined();
                expect(['critical', 'warning', 'suggestion']).toContain(issue.severity);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that all issues have required file field', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: All issues must have non-empty file field
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach(issue => {
                expect(issue.file).toBeDefined();
                expect(issue.file.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that all issues have required line field', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: All issues must have positive integer line field
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach(issue => {
                expect(issue.line).toBeDefined();
                expect(Number.isInteger(issue.line)).toBe(true);
                expect(issue.line).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that all issues have required comment field', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: All issues must have non-empty comment field
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach(issue => {
                expect(issue.comment).toBeDefined();
                expect(issue.comment.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that severity is one of the allowed enum values', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Severity must be 'critical', 'warning', or 'suggestion'
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach(issue => {
                expect(['critical', 'warning', 'suggestion']).toContain(issue.severity);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that verdict is one of the allowed enum values', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Verdict must be 'approve', 'request_changes', or 'comment'
            expect(result).not.toBeNull();
            if (result) {
              expect(['approve', 'request_changes', 'comment']).toContain(result.verdict);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that summary is a string', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Summary must be a string
            expect(result).not.toBeNull();
            if (result) {
              expect(typeof result.summary).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that issues is an array', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Issues must be an array
            expect(result).not.toBeNull();
            if (result) {
              expect(Array.isArray(result.issues)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept responses with optional suggestion field', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            const jsonString = JSON.stringify(reviewResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Suggestion field is optional but if present, should be preserved
            expect(result).not.toBeNull();
            if (result) {
              result.issues.forEach((issue, index) => {
                if (reviewResponse.issues[index].suggestion) {
                  expect(issue.suggestion).toBe(reviewResponse.issues[index].suggestion);
                }
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept responses with empty issues array', () => {
      fc.assert(
        fc.property(
          validReviewResponseArbitrary(),
          (reviewResponse) => {
            // Force empty issues array
            const emptyResponse = { ...reviewResponse, issues: [] };
            const jsonString = JSON.stringify(emptyResponse);
            const result = ResponseValidator.validate(jsonString);

            // Property: Empty issues array is valid
            expect(result).not.toBeNull();
            if (result) {
              expect(result.issues).toEqual([]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate valid severity values
 */
function severityArbitrary(): fc.Arbitrary<Severity> {
  return fc.constantFrom<Severity>('critical', 'warning', 'suggestion');
}

/**
 * Generate valid verdict values
 */
function verdictArbitrary(): fc.Arbitrary<Verdict> {
  return fc.constantFrom<Verdict>('approve', 'request_changes', 'comment');
}

/**
 * Generate valid file paths
 */
function filePathArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Simple paths
    fc.stringMatching(/^[a-z]+\.(ts|js|py|java|go|rs)$/),
    // Nested paths
    fc.stringMatching(/^[a-z]+\/[a-z]+\.(ts|js|py|java|go|rs)$/),
    // Deep nested paths
    fc.stringMatching(/^[a-z]+\/[a-z]+\/[a-z]+\.(ts|js|py|java|go|rs)$/),
  );
}

/**
 * Generate valid Issue objects
 */
function validIssueArbitrary(): fc.Arbitrary<any> {
  return fc.record({
    severity: severityArbitrary(),
    file: filePathArbitrary(),
    line: fc.integer({ min: 1, max: 10000 }),
    comment: fc.string({ minLength: 1, maxLength: 500 }),
    suggestion: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });
}

/**
 * Generate valid ReviewResponse objects
 */
function validReviewResponseArbitrary(): fc.Arbitrary<ReviewResponse> {
  return fc.record({
    issues: fc.array(validIssueArbitrary(), { maxLength: 20 }),
    summary: fc.string({ minLength: 0, maxLength: 1000 }),
    verdict: verdictArbitrary(),
  });
}
