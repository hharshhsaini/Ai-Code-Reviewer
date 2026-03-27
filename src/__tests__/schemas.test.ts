/**
 * Tests for Zod validation schemas
 * Validates: Requirements 6.1, 6.3, 6.4, 13.1
 */

import {
  SeveritySchema,
  VerdictSchema,
  IssueSchema,
  ReviewResponseSchema,
  ConfigurationSchema,
  SeverityType,
  VerdictType,
  IssueType,
  ReviewResponseType,
  ConfigurationType,
} from '../schemas';

describe('SeveritySchema', () => {
  it('should accept valid severity values', () => {
    expect(SeveritySchema.parse('critical')).toBe('critical');
    expect(SeveritySchema.parse('warning')).toBe('warning');
    expect(SeveritySchema.parse('suggestion')).toBe('suggestion');
  });

  it('should reject invalid severity values', () => {
    expect(() => SeveritySchema.parse('invalid')).toThrow();
    expect(() => SeveritySchema.parse('error')).toThrow();
    expect(() => SeveritySchema.parse('')).toThrow();
  });

  it('should provide correct type inference', () => {
    const severity: SeverityType = 'critical';
    expect(SeveritySchema.parse(severity)).toBe('critical');
  });
});

describe('VerdictSchema', () => {
  it('should accept valid verdict values', () => {
    expect(VerdictSchema.parse('approve')).toBe('approve');
    expect(VerdictSchema.parse('request_changes')).toBe('request_changes');
    expect(VerdictSchema.parse('comment')).toBe('comment');
  });

  it('should reject invalid verdict values', () => {
    expect(() => VerdictSchema.parse('invalid')).toThrow();
    expect(() => VerdictSchema.parse('reject')).toThrow();
    expect(() => VerdictSchema.parse('')).toThrow();
  });

  it('should provide correct type inference', () => {
    const verdict: VerdictType = 'approve';
    expect(VerdictSchema.parse(verdict)).toBe('approve');
  });
});

describe('IssueSchema', () => {
  it('should accept valid issue objects', () => {
    const validIssue = {
      severity: 'critical',
      file: 'src/test.ts',
      line: 42,
      comment: 'This is a security vulnerability',
    };
    expect(IssueSchema.parse(validIssue)).toEqual(validIssue);
  });

  it('should accept issue with optional suggestion', () => {
    const issueWithSuggestion = {
      severity: 'warning',
      file: 'src/test.ts',
      line: 10,
      comment: 'Consider using const instead of let',
      suggestion: 'const value = 42;',
    };
    expect(IssueSchema.parse(issueWithSuggestion)).toEqual(issueWithSuggestion);
  });

  it('should reject issue with missing required fields', () => {
    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: 'src/test.ts',
      // missing line
      comment: 'Issue',
    })).toThrow();

    expect(() => IssueSchema.parse({
      severity: 'critical',
      // missing file
      line: 42,
      comment: 'Issue',
    })).toThrow();
  });

  it('should reject issue with empty file path', () => {
    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: '',
      line: 42,
      comment: 'Issue',
    })).toThrow();
  });

  it('should reject issue with empty comment', () => {
    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: 'src/test.ts',
      line: 42,
      comment: '',
    })).toThrow();
  });

  it('should reject issue with non-positive line number', () => {
    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: 'src/test.ts',
      line: 0,
      comment: 'Issue',
    })).toThrow();

    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: 'src/test.ts',
      line: -1,
      comment: 'Issue',
    })).toThrow();
  });

  it('should reject issue with non-integer line number', () => {
    expect(() => IssueSchema.parse({
      severity: 'critical',
      file: 'src/test.ts',
      line: 42.5,
      comment: 'Issue',
    })).toThrow();
  });

  it('should provide correct type inference', () => {
    const issue: IssueType = {
      severity: 'warning',
      file: 'src/test.ts',
      line: 10,
      comment: 'Test issue',
    };
    expect(IssueSchema.parse(issue)).toEqual(issue);
  });
});

describe('ReviewResponseSchema', () => {
  it('should accept valid review response', () => {
    const validResponse = {
      issues: [
        {
          severity: 'critical',
          file: 'src/test.ts',
          line: 42,
          comment: 'Security issue',
        },
      ],
      summary: 'Found 1 critical issue',
      verdict: 'request_changes',
    };
    expect(ReviewResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it('should accept review response with empty issues array', () => {
    const responseWithNoIssues = {
      issues: [],
      summary: 'No issues found',
      verdict: 'approve',
    };
    expect(ReviewResponseSchema.parse(responseWithNoIssues)).toEqual(responseWithNoIssues);
  });

  it('should accept review response with multiple issues', () => {
    const responseWithMultipleIssues = {
      issues: [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection vulnerability',
        },
        {
          severity: 'warning',
          file: 'src/utils.ts',
          line: 25,
          comment: 'Potential memory leak',
          suggestion: 'Use WeakMap instead',
        },
        {
          severity: 'suggestion',
          file: 'src/config.ts',
          line: 5,
          comment: 'Consider using environment variables',
        },
      ],
      summary: 'Found 1 critical, 1 warning, and 1 suggestion',
      verdict: 'request_changes',
    };
    expect(ReviewResponseSchema.parse(responseWithMultipleIssues)).toEqual(responseWithMultipleIssues);
  });

  it('should reject review response with missing fields', () => {
    expect(() => ReviewResponseSchema.parse({
      issues: [],
      // missing summary
      verdict: 'approve',
    })).toThrow();

    expect(() => ReviewResponseSchema.parse({
      // missing issues
      summary: 'Test',
      verdict: 'approve',
    })).toThrow();

    expect(() => ReviewResponseSchema.parse({
      issues: [],
      summary: 'Test',
      // missing verdict
    })).toThrow();
  });

  it('should reject review response with invalid issues', () => {
    expect(() => ReviewResponseSchema.parse({
      issues: [
        {
          severity: 'invalid',
          file: 'src/test.ts',
          line: 42,
          comment: 'Issue',
        },
      ],
      summary: 'Test',
      verdict: 'approve',
    })).toThrow();
  });

  it('should provide correct type inference', () => {
    const response: ReviewResponseType = {
      issues: [],
      summary: 'Test summary',
      verdict: 'comment',
    };
    expect(ReviewResponseSchema.parse(response)).toEqual(response);
  });
});

describe('ConfigurationSchema', () => {
  it('should accept valid configuration', () => {
    const validConfig = {
      name: 'AI Code Reviewer',
      description: 'Automatically review pull requests',
      inputs: {
        github_token: {
          description: 'GitHub token',
          required: true,
        },
        model: {
          description: 'LLM model to use',
          required: false,
          default: 'claude-3-5-sonnet-20241022',
        },
      },
      runs: {
        using: 'node20',
        main: 'dist/index.js',
      },
    };
    expect(ConfigurationSchema.parse(validConfig)).toEqual(validConfig);
  });

  it('should accept configuration with optional input fields', () => {
    const configWithOptionals = {
      name: 'Test Action',
      description: 'Test description',
      inputs: {
        token: {
          description: 'Token',
        },
      },
      runs: {
        using: 'node20',
        main: 'index.js',
      },
    };
    expect(ConfigurationSchema.parse(configWithOptionals)).toEqual(configWithOptionals);
  });

  it('should reject configuration with missing required fields', () => {
    expect(() => ConfigurationSchema.parse({
      // missing name
      description: 'Test',
      inputs: {},
      runs: { using: 'node20', main: 'index.js' },
    })).toThrow();

    expect(() => ConfigurationSchema.parse({
      name: 'Test',
      // missing description
      inputs: {},
      runs: { using: 'node20', main: 'index.js' },
    })).toThrow();

    expect(() => ConfigurationSchema.parse({
      name: 'Test',
      description: 'Test',
      // missing inputs
      runs: { using: 'node20', main: 'index.js' },
    })).toThrow();

    expect(() => ConfigurationSchema.parse({
      name: 'Test',
      description: 'Test',
      inputs: {},
      // missing runs
    })).toThrow();
  });

  it('should reject configuration with invalid runs object', () => {
    expect(() => ConfigurationSchema.parse({
      name: 'Test',
      description: 'Test',
      inputs: {},
      runs: {
        // missing using
        main: 'index.js',
      },
    })).toThrow();

    expect(() => ConfigurationSchema.parse({
      name: 'Test',
      description: 'Test',
      inputs: {},
      runs: {
        using: 'node20',
        // missing main
      },
    })).toThrow();
  });

  it('should provide correct type inference', () => {
    const config: ConfigurationType = {
      name: 'Test',
      description: 'Test description',
      inputs: {},
      runs: {
        using: 'node20',
        main: 'index.js',
      },
    };
    expect(ConfigurationSchema.parse(config)).toEqual(config);
  });
});
