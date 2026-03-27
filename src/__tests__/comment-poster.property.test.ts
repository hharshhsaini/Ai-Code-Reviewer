/**
 * Property-based tests for Comment Poster
 * Feature: ai-code-reviewer
 */

import * as fc from 'fast-check';
import { CommentPoster } from '../comment-poster';
import { GitHubClient } from '../github-client';
import { MappedIssue, Severity, Verdict } from '../types';

describe('CommentPoster - Property Tests', () => {
  // Arbitraries for generating test data
  const severityArbitrary = fc.constantFrom<Severity>('critical', 'warning', 'suggestion');
  const verdictArbitrary = fc.constantFrom<Verdict>('approve', 'request_changes', 'comment');

  const mappedIssueArbitrary = fc.record({
    severity: severityArbitrary,
    file: fc.string({ minLength: 1 }),
    line: fc.integer({ min: 1, max: 1000 }),
    comment: fc.string({ minLength: 1 }),
    suggestion: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    position: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
  });

  /**
   * Property 15: Comment Severity Inclusion
   * **Validates: Requirements 8.2**
   * 
   * For any issue posted as a review comment, the comment body SHALL contain
   * the severity level as text.
   */
  test('Property 15: Comment Severity Inclusion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(mappedIssueArbitrary, { minLength: 1, maxLength: 20 }),
        verdictArbitrary,
        fc.string(),
        async (issues, verdict, summary) => {
          // Mock GitHub client
          let capturedComments: any[] = [];
          const mockClient = {
            postReview: jest.fn(async (owner, repo, pullNumber, comments, event, body) => {
              capturedComments = comments;
            }),
          } as unknown as GitHubClient;

          // Post review
          await CommentPoster.post(mockClient, 'owner', 'repo', 1, issues, verdict, summary);

          // Verify all comments contain severity text
          expect(capturedComments).toHaveLength(issues.length);
          
          for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            const comment = capturedComments[i];
            
            // Check that the comment body contains severity text
            const severityTexts = {
              critical: 'CRITICAL',
              warning: 'WARNING',
              suggestion: 'SUGGESTION',
            };
            
            expect(comment.body).toContain(severityTexts[issue.severity]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Suggestion Inclusion When Present
   * **Validates: Requirements 8.3**
   * 
   * For any issue that has a non-empty suggestion field, the posted review
   * comment SHALL include that suggestion in the comment body.
   */
  test('Property 16: Suggestion Inclusion When Present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(mappedIssueArbitrary, { minLength: 1, maxLength: 20 }),
        verdictArbitrary,
        fc.string(),
        async (issues, verdict, summary) => {
          // Mock GitHub client
          let capturedComments: any[] = [];
          const mockClient = {
            postReview: jest.fn(async (owner, repo, pullNumber, comments, event, body) => {
              capturedComments = comments;
            }),
          } as unknown as GitHubClient;

          // Post review
          await CommentPoster.post(mockClient, 'owner', 'repo', 1, issues, verdict, summary);

          // Verify comments with suggestions include them
          for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            const comment = capturedComments[i];
            
            if (issue.suggestion) {
              // Comment body should contain the suggestion
              expect(comment.body).toContain(issue.suggestion);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 17: Review Batching
   * **Validates: Requirements 8.4**
   * 
   * For any set of issues from a review, all comments SHALL be submitted
   * in a single GitHub review API call.
   */
  test('Property 17: Review Batching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(mappedIssueArbitrary, { minLength: 1, maxLength: 50 }),
        verdictArbitrary,
        fc.string(),
        async (issues, verdict, summary) => {
          // Mock GitHub client
          let postReviewCallCount = 0;
          let capturedComments: any[] = [];
          
          const mockClient = {
            postReview: jest.fn(async (owner, repo, pullNumber, comments, event, body) => {
              postReviewCallCount++;
              capturedComments = comments;
            }),
          } as unknown as GitHubClient;

          // Post review
          await CommentPoster.post(mockClient, 'owner', 'repo', 1, issues, verdict, summary);

          // Verify postReview was called exactly once (batched)
          expect(postReviewCallCount).toBe(1);
          
          // Verify all issues were included in the single call
          expect(capturedComments).toHaveLength(issues.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18: Verdict-to-Event Mapping
   * **Validates: Requirements 8.5**
   * 
   * For any verdict value (approve, request_changes, comment), the GitHub
   * review event SHALL be set to the corresponding GitHub API event type.
   */
  test('Property 18: Verdict-to-Event Mapping', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(mappedIssueArbitrary, { minLength: 1, maxLength: 20 }),
        verdictArbitrary,
        fc.string(),
        async (issues, verdict, summary) => {
          // Mock GitHub client
          let capturedEvent: string = '';
          
          const mockClient = {
            postReview: jest.fn(async (owner, repo, pullNumber, comments, event, body) => {
              capturedEvent = event;
            }),
          } as unknown as GitHubClient;

          // Post review
          await CommentPoster.post(mockClient, 'owner', 'repo', 1, issues, verdict, summary);

          // Verify event mapping
          const expectedEvents = {
            approve: 'APPROVE',
            request_changes: 'REQUEST_CHANGES',
            comment: 'COMMENT',
          };
          
          expect(capturedEvent).toBe(expectedEvents[verdict]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
