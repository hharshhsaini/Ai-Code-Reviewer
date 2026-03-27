/**
 * Unit tests for Deduplicator
 * Feature: ai-code-reviewer
 */

import { Deduplicator } from '../deduplicator';
import { Issue } from '../types';

describe('Deduplicator', () => {
  describe('deduplicate', () => {
    it('should return unchanged list when no duplicates exist', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'warning',
          file: 'src/api.ts',
          line: 25,
          comment: 'Missing error handling',
        },
        {
          severity: 'suggestion',
          file: 'src/utils.ts',
          line: 5,
          comment: 'Consider using const instead of let',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(3);
      expect(result).toEqual(issues);
    });

    it('should remove exact duplicates (same file, line, and comment)', () => {
      const issue: Issue = {
        severity: 'critical',
        file: 'src/auth.ts',
        line: 10,
        comment: 'SQL injection vulnerability detected',
      };

      const issues: Issue[] = [issue, { ...issue }, { ...issue }];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issue);
    });

    it('should remove similar duplicates (same file, line, slightly different comment)', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability detected in query',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability detected in query builder',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      // These comments are very similar (>80% similarity), should deduplicate
      expect(result).toHaveLength(1);
    });

    it('should keep issues with different files', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'critical',
          file: 'src/api.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(2);
    });

    it('should keep issues with different line numbers', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 20,
          comment: 'SQL injection vulnerability',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(2);
    });

    it('should keep issues with dissimilar comments (<80% similarity)', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'Missing authentication check',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      // These comments are dissimilar, should keep both
      expect(result).toHaveLength(2);
    });

    it('should keep highest severity when duplicates have different severities', () => {
      const issues: Issue[] = [
        {
          severity: 'suggestion',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'warning',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('critical');
    });

    it('should handle empty array', () => {
      const result = Deduplicator.deduplicate([]);

      expect(result).toHaveLength(0);
    });

    it('should handle single issue', () => {
      const issue: Issue = {
        severity: 'critical',
        file: 'src/auth.ts',
        line: 10,
        comment: 'SQL injection vulnerability',
      };

      const result = Deduplicator.deduplicate([issue]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(issue);
    });

    it('should preserve suggestion field when deduplicating', () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
          suggestion: 'Use parameterized queries',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
      ];

      const result = Deduplicator.deduplicate(issues);

      expect(result).toHaveLength(1);
      expect(result[0].suggestion).toBe('Use parameterized queries');
    });
  });

  describe('severityRank', () => {
    it('should rank critical as 3', () => {
      expect(Deduplicator.severityRank('critical')).toBe(3);
    });

    it('should rank warning as 2', () => {
      expect(Deduplicator.severityRank('warning')).toBe(2);
    });

    it('should rank suggestion as 1', () => {
      expect(Deduplicator.severityRank('suggestion')).toBe(1);
    });

    it('should rank critical > warning > suggestion', () => {
      expect(Deduplicator.severityRank('critical')).toBeGreaterThan(
        Deduplicator.severityRank('warning')
      );
      expect(Deduplicator.severityRank('warning')).toBeGreaterThan(
        Deduplicator.severityRank('suggestion')
      );
    });
  });
});
