/**
 * Property-based tests for Label Manager
 * Feature: ai-code-reviewer
 */

import * as fc from 'fast-check';
import { LabelManager } from '../label-manager';
import { GitHubClient } from '../github-client';
import { Issue, Severity } from '../types';
import { Deduplicator } from '../deduplicator';

describe('Label Manager Property Tests', () => {
  // Arbitrary for generating issues
  const severityArb = fc.constantFrom<Severity>('critical', 'warning', 'suggestion');
  
  const issueArb = fc.record({
    severity: severityArb,
    file: fc.string({ minLength: 1, maxLength: 50 }),
    line: fc.integer({ min: 1, max: 1000 }),
    comment: fc.string({ minLength: 10, maxLength: 200 }),
    suggestion: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
  });

  // Mock GitHub client
  const createMockClient = (): GitHubClient => {
    const client = {
      addLabels: jest.fn().mockResolvedValue(undefined),
      removeLabels: jest.fn().mockResolvedValue(undefined),
    } as unknown as GitHubClient;
    return client;
  };

  // Property 19: Severity-Based Label Selection
  // **Validates: Requirements 9.1, 9.2, 9.3**
  describe('Property 19: Severity-Based Label Selection', () => {
    it('should add "ai-review: critical" label when any critical issues exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            // Ensure at least one critical issue exists
            const issuesWithCritical = [
              ...issues,
              { ...issues[0], severity: 'critical' as Severity },
            ];

            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, issuesWithCritical);

            // Should add critical label
            expect(client.addLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              ['ai-review: critical']
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add "ai-review: warning" label when warnings exist but no critical', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            // Ensure only warning and suggestion issues exist (no critical)
            const issuesWithoutCritical = issues.map(issue => ({
              ...issue,
              severity: issue.severity === 'critical' ? 'warning' : issue.severity,
            })) as Issue[];

            // Ensure at least one warning exists
            const issuesWithWarning = [
              ...issuesWithoutCritical,
              { ...issuesWithoutCritical[0], severity: 'warning' as Severity },
            ];

            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, issuesWithWarning);

            // Should add warning label
            expect(client.addLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              ['ai-review: warning']
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add "ai-review: suggestion" label when only suggestions exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            // Ensure only suggestion issues exist
            const onlySuggestions = issues.map(issue => ({
              ...issue,
              severity: 'suggestion' as Severity,
            })) as Issue[];

            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, onlySuggestions);

            // Should add suggestion label
            expect(client.addLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              ['ai-review: suggestion']
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should select label based on highest severity present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

            // Determine expected label based on highest severity
            const hasCritical = issues.some(i => i.severity === 'critical');
            const hasWarning = issues.some(i => i.severity === 'warning');

            let expectedLabel: string;
            if (hasCritical) {
              expectedLabel = 'ai-review: critical';
            } else if (hasWarning) {
              expectedLabel = 'ai-review: warning';
            } else {
              expectedLabel = 'ai-review: suggestion';
            }

            expect(client.addLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              [expectedLabel]
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove stale labels before adding new label', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, issues);

            // Should remove all ai-review labels first
            expect(client.removeLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              ['ai-review: critical', 'ai-review: warning', 'ai-review: suggestion']
            );

            // removeLabels should be called before addLabels
            const removeCall = (client.removeLabels as jest.Mock).mock.invocationCallOrder[0];
            const addCall = (client.addLabels as jest.Mock).mock.invocationCallOrder[0];
            expect(removeCall).toBeLessThan(addCall);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Property 20: Severity Threshold Filtering
  // **Validates: Requirements 9.4**
  describe('Property 20: Severity Threshold Filtering', () => {
    it('should only consider issues at or above severity threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 5, maxLength: 20 }),
          severityArb,
          async (issues, threshold) => {
            const client = createMockClient();
            await LabelManager.addLabel(client, 'owner', 'repo', 1, issues, threshold);

            // Filter issues by threshold
            const thresholdRank = Deduplicator.severityRank(threshold);
            const filteredIssues = issues.filter(
              issue => Deduplicator.severityRank(issue.severity) >= thresholdRank
            );

            if (filteredIssues.length === 0) {
              // No issues meet threshold, no label should be added
              expect(client.addLabels).not.toHaveBeenCalled();
            } else {
              // Determine expected label from filtered issues
              const hasCritical = filteredIssues.some(i => i.severity === 'critical');
              const hasWarning = filteredIssues.some(i => i.severity === 'warning');

              let expectedLabel: string;
              if (hasCritical) {
                expectedLabel = 'ai-review: critical';
              } else if (hasWarning) {
                expectedLabel = 'ai-review: warning';
              } else {
                expectedLabel = 'ai-review: suggestion';
              }

              expect(client.addLabels).toHaveBeenCalledWith(
                'owner',
                'repo',
                1,
                [expectedLabel]
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter out issues below threshold when threshold is critical', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 5, maxLength: 20 }),
          async (issues) => {
            // Ensure we have a mix of severities but no critical
            const issuesWithoutCritical = issues.map(issue => ({
              ...issue,
              severity: issue.severity === 'critical' ? 'warning' : issue.severity,
            })) as Issue[];

            const client = createMockClient();
            await LabelManager.addLabel(
              client,
              'owner',
              'repo',
              1,
              issuesWithoutCritical,
              'critical'
            );

            // No critical issues, so no label should be added
            expect(client.addLabels).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter out suggestions when threshold is warning', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 5, maxLength: 20 }),
          async (issues) => {
            // Ensure we have only suggestions
            const onlySuggestions = issues.map(issue => ({
              ...issue,
              severity: 'suggestion' as Severity,
            })) as Issue[];

            const client = createMockClient();
            await LabelManager.addLabel(
              client,
              'owner',
              'repo',
              1,
              onlySuggestions,
              'warning'
            );

            // No warnings or critical, so no label should be added
            expect(client.addLabels).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all issues when threshold is suggestion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(issueArb, { minLength: 1, maxLength: 20 }),
          async (issues) => {
            const client = createMockClient();
            await LabelManager.addLabel(
              client,
              'owner',
              'repo',
              1,
              issues,
              'suggestion'
            );

            // All issues should be considered (threshold is lowest)
            // Determine expected label based on highest severity
            const hasCritical = issues.some(i => i.severity === 'critical');
            const hasWarning = issues.some(i => i.severity === 'warning');

            let expectedLabel: string;
            if (hasCritical) {
              expectedLabel = 'ai-review: critical';
            } else if (hasWarning) {
              expectedLabel = 'ai-review: warning';
            } else {
              expectedLabel = 'ai-review: suggestion';
            }

            expect(client.addLabels).toHaveBeenCalledWith(
              'owner',
              'repo',
              1,
              [expectedLabel]
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
