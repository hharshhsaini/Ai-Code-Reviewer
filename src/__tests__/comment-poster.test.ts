/**
 * Unit tests for Comment Poster
 * Feature: ai-code-reviewer
 */

import { CommentPoster } from '../comment-poster';
import { GitHubClient } from '../github-client';
import { MappedIssue } from '../types';

describe('CommentPoster - Unit Tests', () => {
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    mockClient = {
      postReview: jest.fn(),
    } as unknown as jest.Mocked<GitHubClient>;
  });

  test('should post inline comment with valid position', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'warning',
        file: 'src/example.ts',
        line: 42,
        comment: 'This variable is unused',
        position: 10,
      },
    ];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'comment', 'Review summary');

    expect(mockClient.postReview).toHaveBeenCalledTimes(1);
    expect(mockClient.postReview).toHaveBeenCalledWith(
      'owner',
      'repo',
      123,
      [
        {
          path: 'src/example.ts',
          position: 10,
          body: expect.stringContaining('WARNING'),
        },
      ],
      'COMMENT',
      'Review summary'
    );
  });

  test('should post file-level comment with null position', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'critical',
        file: 'src/example.ts',
        line: 100,
        comment: 'Security vulnerability detected',
        position: null,
      },
    ];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'request_changes', 'Review summary');

    expect(mockClient.postReview).toHaveBeenCalledTimes(1);
    
    const capturedComments = mockClient.postReview.mock.calls[0][3];
    expect(capturedComments).toHaveLength(1);
    expect(capturedComments[0]).toEqual({
      path: 'src/example.ts',
      body: expect.stringContaining('CRITICAL'),
    });
    
    // Verify position is not included
    expect(capturedComments[0]).not.toHaveProperty('position');
  });

  test('should include suggestion in comment body when present', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'suggestion',
        file: 'src/example.ts',
        line: 15,
        comment: 'Consider using const instead of let',
        suggestion: 'const value = 42;',
        position: 5,
      },
    ];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'comment', 'Review summary');

    expect(mockClient.postReview).toHaveBeenCalledTimes(1);
    
    const capturedComments = mockClient.postReview.mock.calls[0][3];
    expect(capturedComments[0].body).toContain('const value = 42;');
    expect(capturedComments[0].body).toContain('Suggested fix:');
  });

  test('should batch multiple comments into single review submission', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'critical',
        file: 'src/file1.ts',
        line: 10,
        comment: 'Issue 1',
        position: 5,
      },
      {
        severity: 'warning',
        file: 'src/file2.ts',
        line: 20,
        comment: 'Issue 2',
        position: 15,
      },
      {
        severity: 'suggestion',
        file: 'src/file3.ts',
        line: 30,
        comment: 'Issue 3',
        position: null,
      },
    ];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'request_changes', 'Review summary');

    // Verify single API call
    expect(mockClient.postReview).toHaveBeenCalledTimes(1);
    
    // Verify all comments included
    const capturedComments = mockClient.postReview.mock.calls[0][3];
    expect(capturedComments).toHaveLength(3);
  });

  test('should format severity badges correctly', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'critical',
        file: 'src/file1.ts',
        line: 10,
        comment: 'Critical issue',
        position: 5,
      },
      {
        severity: 'warning',
        file: 'src/file2.ts',
        line: 20,
        comment: 'Warning issue',
        position: 15,
      },
      {
        severity: 'suggestion',
        file: 'src/file3.ts',
        line: 30,
        comment: 'Suggestion issue',
        position: 25,
      },
    ];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'comment', 'Review summary');

    const capturedComments = mockClient.postReview.mock.calls[0][3];
    
    expect(capturedComments[0].body).toContain('🔴 CRITICAL');
    expect(capturedComments[1].body).toContain('⚠️ WARNING');
    expect(capturedComments[2].body).toContain('💡 SUGGESTION');
  });

  test('should map verdict to correct GitHub event type', async () => {
    const issues: MappedIssue[] = [
      {
        severity: 'warning',
        file: 'src/example.ts',
        line: 10,
        comment: 'Test issue',
        position: 5,
      },
    ];

    // Test approve verdict
    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'approve', 'Summary');
    expect(mockClient.postReview.mock.calls[0][4]).toBe('APPROVE');

    // Test request_changes verdict
    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'request_changes', 'Summary');
    expect(mockClient.postReview.mock.calls[1][4]).toBe('REQUEST_CHANGES');

    // Test comment verdict
    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'comment', 'Summary');
    expect(mockClient.postReview.mock.calls[2][4]).toBe('COMMENT');
  });

  test('should handle empty issues array', async () => {
    const issues: MappedIssue[] = [];

    await CommentPoster.post(mockClient, 'owner', 'repo', 123, issues, 'approve', 'No issues found');

    expect(mockClient.postReview).toHaveBeenCalledTimes(1);
    expect(mockClient.postReview).toHaveBeenCalledWith(
      'owner',
      'repo',
      123,
      [],
      'APPROVE',
      'No issues found'
    );
  });
});
