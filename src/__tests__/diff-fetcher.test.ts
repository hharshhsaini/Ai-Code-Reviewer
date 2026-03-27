/**
 * Unit tests for Diff Fetcher
 */

import { DiffFetcher } from '../diff-fetcher';
import { GitHubClient } from '../github-client';
import { DiffFile } from '../types';

// Mock GitHubClient
jest.mock('../github-client');

describe('DiffFetcher', () => {
  let fetcher: DiffFetcher;
  let mockGitHubClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    fetcher = new DiffFetcher(mockGitHubClient);
  });

  describe('parseHunkHeader', () => {
    it('should parse hunk header with both old and new line counts', () => {
      const header = '@@ -10,5 +12,7 @@ function example() {';
      const result = (fetcher as any).parseHunkHeader(header);

      expect(result).toEqual({
        oldStart: 10,
        oldLines: 5,
        newStart: 12,
        newLines: 7,
        header: header,
      });
    });

    it('should parse hunk header with single line changes', () => {
      const header = '@@ -10 +12 @@';
      const result = (fetcher as any).parseHunkHeader(header);

      expect(result).toEqual({
        oldStart: 10,
        oldLines: 1,
        newStart: 12,
        newLines: 1,
        header: header,
      });
    });

    it('should parse hunk header without context', () => {
      const header = '@@ -1,3 +1,4 @@';
      const result = (fetcher as any).parseHunkHeader(header);


      expect(result).toEqual({
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 4,
        header: header,
      });
    });
  });

  describe('parseUnifiedDiff', () => {
    it('should parse single hunk with only additions', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,5 @@
 line 1
 line 2
+line 3
+line 4
 line 5`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('file.ts');
      expect(files[0].status).toBe('modified');
      expect(files[0].additions).toBe(2);
      expect(files[0].deletions).toBe(0);
      expect(files[0].hunks).toHaveLength(1);

      const hunk = files[0].hunks[0];
      expect(hunk.oldStart).toBe(1);
      expect(hunk.oldLines).toBe(3);
      expect(hunk.newStart).toBe(1);
      expect(hunk.newLines).toBe(5);
      expect(hunk.lines).toHaveLength(5);

      // Check line types and positions
      expect(hunk.lines[0]).toEqual({
        type: 'context',
        content: 'line 1',
        oldLineNumber: 1,
        newLineNumber: 1,
        position: 1,
      });
      expect(hunk.lines[2]).toEqual({
        type: 'add',
        content: 'line 3',
        newLineNumber: 3,
        position: 3,
      });
    });

    it('should parse single hunk with only deletions', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,3 @@
 line 1
-line 2
-line 3
 line 4`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].additions).toBe(0);
      expect(files[0].deletions).toBe(2);

      const hunk = files[0].hunks[0];
      expect(hunk.lines).toHaveLength(4); // 1 context + 2 deletions + 1 context
      expect(hunk.lines[1]).toEqual({
        type: 'delete',
        content: 'line 2',
        oldLineNumber: 2,
        position: 2,
      });
    });

    it('should parse single hunk with mixed changes', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,4 +1,4 @@
 line 1
-line 2
+line 2 modified
 line 3
 line 4`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].additions).toBe(1);
      expect(files[0].deletions).toBe(1);

      const hunk = files[0].hunks[0];
      expect(hunk.lines).toHaveLength(5); // 1 context + 1 delete + 1 add + 2 context
      expect(hunk.lines[1].type).toBe('delete');
      expect(hunk.lines[2].type).toBe('add');
    });

    it('should parse multiple hunks in same file', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,4 @@
 line 1
+line 2
 line 3
 line 4
@@ -10,3 +11,4 @@
 line 10
+line 11
 line 12
 line 13`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].hunks).toHaveLength(2);

      // First hunk
      expect(files[0].hunks[0].oldStart).toBe(1);
      expect(files[0].hunks[0].lines).toHaveLength(4);

      // Second hunk - positions should continue from first hunk
      expect(files[0].hunks[1].oldStart).toBe(10);
      expect(files[0].hunks[1].lines).toHaveLength(4);
      expect(files[0].hunks[1].lines[0].position).toBeGreaterThan(
        files[0].hunks[0].lines[files[0].hunks[0].lines.length - 1].position
      );
    });

    it('should parse multiple files', () => {
      const diff = `diff --git a/file1.ts b/file1.ts
index abc123..def456 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,3 @@
 line 1
+line 2
 line 3
diff --git a/file2.ts b/file2.ts
index xyz789..uvw012 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1,2 +1,3 @@
 line 1
+line 2
 line 3`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('file1.ts');
      expect(files[1].path).toBe('file2.ts');
    });

    it('should handle new file status', () => {
      const diff = `diff --git a/newfile.ts b/newfile.ts
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/newfile.ts
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].status).toBe('added');
      expect(files[0].additions).toBe(3);
      expect(files[0].deletions).toBe(0);
    });

    it('should handle deleted file status', () => {
      const diff = `diff --git a/oldfile.ts b/oldfile.ts
deleted file mode 100644
index abc123..0000000
--- a/oldfile.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].status).toBe('removed');
      expect(files[0].additions).toBe(0);
      expect(files[0].deletions).toBe(3);
    });

    it('should handle renamed file status', () => {
      const diff = `diff --git a/oldname.ts b/newname.ts
similarity index 100%
rename from oldname.ts
rename to newname.ts`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('newname.ts');
      expect(files[0].status).toBe('renamed');
    });

    it('should skip binary files', () => {
      const diff = `diff --git a/image.png b/image.png
index abc123..def456 100644
Binary files a/image.png and b/image.png differ
diff --git a/file.ts b/file.ts
index xyz789..uvw012 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
 line 1
+line 2
 line 3`;

      const files = fetcher.parseUnifiedDiff(diff);

      // Should only include the text file, not the binary
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('file.ts');
    });

    it('should handle empty diff', () => {
      const diff = '';
      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(0);
    });

    it('should handle context lines correctly', () => {
      const diff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,5 @@
 line 1
 line 2
-line 3
+line 3 modified
 line 4
 line 5`;

      const files = fetcher.parseUnifiedDiff(diff);

      expect(files).toHaveLength(1);
      const hunk = files[0].hunks[0];

      // Check that context lines have both old and new line numbers
      expect(hunk.lines[0]).toEqual({
        type: 'context',
        content: 'line 1',
        oldLineNumber: 1,
        newLineNumber: 1,
        position: 1,
      });

      expect(hunk.lines[1]).toEqual({
        type: 'context',
        content: 'line 2',
        oldLineNumber: 2,
        newLineNumber: 2,
        position: 2,
      });
    });
  });

  describe('fetchPRDiff', () => {
    it('should fetch PR metadata and parse diff', async () => {
      const mockPR = {
        base: { sha: 'base-sha-123' },
        head: { sha: 'head-sha-456' },
      };

      const mockDiff = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
 line 1
+line 2
 line 3`;

      mockGitHubClient.getPullRequest = jest.fn().mockResolvedValue(mockPR);
      mockGitHubClient.getDiff = jest.fn().mockResolvedValue(mockDiff);

      const files = await fetcher.fetchPRDiff('owner', 'repo', 123);

      expect(mockGitHubClient.getPullRequest).toHaveBeenCalledWith('owner', 'repo', 123);
      expect(mockGitHubClient.getDiff).toHaveBeenCalledWith('owner', 'repo', 123);
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('file.ts');
    });

    it('should throw error if base SHA is missing', async () => {
      const mockPR = {
        head: { sha: 'head-sha-456' },
      };

      mockGitHubClient.getPullRequest = jest.fn().mockResolvedValue(mockPR);

      await expect(fetcher.fetchPRDiff('owner', 'repo', 123)).rejects.toThrow(
        'Failed to retrieve base or head SHA from PR metadata'
      );
    });

    it('should throw error if head SHA is missing', async () => {
      const mockPR = {
        base: { sha: 'base-sha-123' },
      };

      mockGitHubClient.getPullRequest = jest.fn().mockResolvedValue(mockPR);

      await expect(fetcher.fetchPRDiff('owner', 'repo', 123)).rejects.toThrow(
        'Failed to retrieve base or head SHA from PR metadata'
      );
    });
  });
});
