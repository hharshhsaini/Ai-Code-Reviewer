/**
 * Unit tests for Label Manager
 * Feature: ai-code-reviewer
 */

import { LabelManager } from '../label-manager';
import { GitHubClient } from '../github-client';
import { Issue } from '../types';

describe('Label Manager', () => {
  // Mock GitHub client
  const createMockClient = (): GitHubClient => {
    const client = {
      addLabels: jest.fn().mockResolvedValue(undefined),
      removeLabels: jest.fn().mockResolvedValue(undefined),
    } as unknown as GitHubClient;
    return client;
  };

  describe('addLabel', () => {
    it('should add "ai-review: critical" label when critical issues exist', async () => {
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
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      expect(client.removeLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
        'ai-review: warning',
        'ai-review: suggestion',
      ]);
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
      ]);
    });

    it('should add "ai-review: warning" label when warning issues exist but no critical', async () => {
      const issues: Issue[] = [
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
          comment: 'Consider using const',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      expect(client.removeLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
        'ai-review: warning',
        'ai-review: suggestion',
      ]);
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: warning',
      ]);
    });

    it('should add "ai-review: suggestion" label when only suggestion issues exist', async () => {
      const issues: Issue[] = [
        {
          severity: 'suggestion',
          file: 'src/utils.ts',
          line: 5,
          comment: 'Consider using const',
        },
        {
          severity: 'suggestion',
          file: 'src/helpers.ts',
          line: 12,
          comment: 'Add JSDoc comment',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      expect(client.removeLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
        'ai-review: warning',
        'ai-review: suggestion',
      ]);
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: suggestion',
      ]);
    });

    it('should not add any label when no issues exist', async () => {
      const issues: Issue[] = [];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      expect(client.removeLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
        'ai-review: warning',
        'ai-review: suggestion',
      ]);
      expect(client.addLabels).not.toHaveBeenCalled();
    });

    it('should filter issues by severity threshold (critical)', async () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection',
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
          comment: 'Use const',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues, 'critical');

      // Only critical issues should be considered
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
      ]);
    });

    it('should filter issues by severity threshold (warning)', async () => {
      const issues: Issue[] = [
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
          comment: 'Use const',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues, 'warning');

      // Only warning and above should be considered (no critical, so warning label)
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: warning',
      ]);
    });

    it('should not add label when all issues are below threshold', async () => {
      const issues: Issue[] = [
        {
          severity: 'suggestion',
          file: 'src/utils.ts',
          line: 5,
          comment: 'Use const',
        },
        {
          severity: 'suggestion',
          file: 'src/helpers.ts',
          line: 12,
          comment: 'Add JSDoc',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues, 'critical');

      // No issues meet the critical threshold
      expect(client.removeLabels).toHaveBeenCalled();
      expect(client.addLabels).not.toHaveBeenCalled();
    });

    it('should include all issues when threshold is suggestion', async () => {
      const issues: Issue[] = [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection',
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
          comment: 'Use const',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues, 'suggestion');

      // All issues should be considered, highest is critical
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
      ]);
    });

    it('should remove stale labels before adding new label', async () => {
      const issues: Issue[] = [
        {
          severity: 'warning',
          file: 'src/api.ts',
          line: 25,
          comment: 'Missing error handling',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      // Verify removeLabels was called before addLabels
      const removeCall = (client.removeLabels as jest.Mock).mock.invocationCallOrder[0];
      const addCall = (client.addLabels as jest.Mock).mock.invocationCallOrder[0];
      expect(removeCall).toBeLessThan(addCall);
    });

    it('should handle mixed severity issues correctly', async () => {
      const issues: Issue[] = [
        {
          severity: 'suggestion',
          file: 'src/utils.ts',
          line: 5,
          comment: 'Use const',
        },
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 10,
          comment: 'SQL injection',
        },
        {
          severity: 'warning',
          file: 'src/api.ts',
          line: 25,
          comment: 'Missing error handling',
        },
        {
          severity: 'suggestion',
          file: 'src/helpers.ts',
          line: 12,
          comment: 'Add JSDoc',
        },
      ];

      const client = createMockClient();
      await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

      // Should select critical as it's the highest severity
      expect(client.addLabels).toHaveBeenCalledWith('owner', 'repo', 1, [
        'ai-review: critical',
      ]);
    });
  });
});
