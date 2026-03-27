/**
 * Property-based tests for Deduplicator
 * Feature: ai-code-reviewer
 */

import * as fc from 'fast-check';
import { Deduplicator } from '../deduplicator';
import { Issue, Severity } from '../types';

describe('Deduplicator Property Tests', () => {
  // Arbitrary for generating issues
  const severityArb = fc.constantFrom<Severity>('critical', 'warning', 'suggestion');
  
  const issueArb = fc.record({
    severity: severityArb,
    file: fc.string({ minLength: 1, maxLength: 50 }),
    line: fc.integer({ min: 1, max: 1000 }),
    comment: fc.string({ minLength: 10, maxLength: 200 }),
    suggestion: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  });

  // Property 22: Deduplication Removes Duplicates
  // **Validates: Requirements 11.2, 11.3, 11.4**
  describe('Property 22: Deduplication Removes Duplicates', () => {
    it('should remove duplicate issues (same file, line, and similar comment)', () => {
      fc.assert(
        fc.property(issueArb, fc.integer({ min: 2, max: 5 }), (baseIssue, duplicateCount) => {
          // Create duplicates with exact same file, line, and comment
          const issues: Issue[] = [];
          for (let i = 0; i < duplicateCount; i++) {
            issues.push({ ...baseIssue });
          }
          
          const deduplicated = Deduplicator.deduplicate(issues);
          
          // Should have exactly 1 issue after deduplication
          expect(deduplicated.length).toBe(1);
          expect(deduplicated[0]).toEqual(baseIssue);
        }),
        { numRuns: 100 }
      );
    });

    it('should remove issues with similar comments (>80% similarity)', () => {
      fc.assert(
        fc.property(issueArb, (baseIssue) => {
          // Create a similar issue by slightly modifying the comment
          const similarIssue: Issue = {
            ...baseIssue,
            comment: baseIssue.comment + ' extra', // Small modification
          };
          
          const issues = [baseIssue, similarIssue];
          const deduplicated = Deduplicator.deduplicate(issues);
          
          // Should deduplicate if similarity > 80%
          const similarity = calculateSimilarity(baseIssue.comment, similarIssue.comment);
          if (similarity > 0.8) {
            expect(deduplicated.length).toBe(1);
          } else {
            expect(deduplicated.length).toBe(2);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should keep issues with different files', () => {
      fc.assert(
        fc.property(issueArb, fc.string({ minLength: 1, maxLength: 50 }), (baseIssue, differentFile) => {
          fc.pre(differentFile !== baseIssue.file); // Ensure files are different
          
          const issue1 = baseIssue;
          const issue2: Issue = { ...baseIssue, file: differentFile };
          
          const deduplicated = Deduplicator.deduplicate([issue1, issue2]);
          
          // Should keep both since files are different
          expect(deduplicated.length).toBe(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should keep issues with different line numbers', () => {
      fc.assert(
        fc.property(issueArb, fc.integer({ min: 1, max: 1000 }), (baseIssue, differentLine) => {
          fc.pre(differentLine !== baseIssue.line); // Ensure lines are different
          
          const issue1 = baseIssue;
          const issue2: Issue = { ...baseIssue, line: differentLine };
          
          const deduplicated = Deduplicator.deduplicate([issue1, issue2]);
          
          // Should keep both since lines are different
          expect(deduplicated.length).toBe(2);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Property 23: Deduplication Preserves Highest Severity
  // **Validates: Requirements 11.2**
  describe('Property 23: Deduplication Preserves Highest Severity', () => {
    it('should keep the issue with highest severity when duplicates exist', () => {
      fc.assert(
        fc.property(issueArb, severityArb, severityArb, (baseIssue, severity1, severity2) => {
          const issue1: Issue = { ...baseIssue, severity: severity1 };
          const issue2: Issue = { ...baseIssue, severity: severity2 };
          
          const deduplicated = Deduplicator.deduplicate([issue1, issue2]);
          
          // Should have exactly 1 issue
          expect(deduplicated.length).toBe(1);
          
          // Should keep the one with higher severity
          const expectedSeverity = 
            Deduplicator.severityRank(severity1) > Deduplicator.severityRank(severity2)
              ? severity1
              : severity2;
          
          expect(deduplicated[0].severity).toBe(expectedSeverity);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve highest severity across multiple duplicates', () => {
      fc.assert(
        fc.property(issueArb, fc.array(severityArb, { minLength: 2, maxLength: 10 }), (baseIssue, severities) => {
          // Create duplicates with different severities
          const issues: Issue[] = severities.map(severity => ({
            ...baseIssue,
            severity,
          }));
          
          const deduplicated = Deduplicator.deduplicate(issues);
          
          // Should have exactly 1 issue
          expect(deduplicated.length).toBe(1);
          
          // Should keep the one with highest severity
          const maxRank = Math.max(...severities.map(s => Deduplicator.severityRank(s)));
          expect(Deduplicator.severityRank(deduplicated[0].severity)).toBe(maxRank);
        }),
        { numRuns: 100 }
      );
    });
  });
});

// Helper function to calculate similarity (mirrors implementation)
function calculateSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLength);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
