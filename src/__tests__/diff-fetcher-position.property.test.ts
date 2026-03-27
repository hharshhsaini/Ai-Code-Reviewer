/**
 * Property-based tests for Diff Fetcher - Position Metadata
 * Feature: ai-code-reviewer, Property 3: Diff Hunk Position Metadata
 * Validates: Requirements 2.4
 */

import * as fc from 'fast-check';
import { DiffFetcher } from '../diff-fetcher';
import { GitHubClient } from '../github-client';
import { DiffFile, DiffLine } from '../types';

// Mock GitHubClient
jest.mock('../github-client');

describe('DiffFetcher - Property 3: Diff Hunk Position Metadata', () => {
  let fetcher: DiffFetcher;
  let mockGitHubClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGitHubClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    fetcher = new DiffFetcher(mockGitHubClient);
  });

  /**
   * Property 3: Diff Hunk Position Metadata
   * 
   * For any set of changed files in a PR, parsing the diff SHALL produce 
   * DiffFile objects where every DiffLine has a valid position index.
   * 
   * **Validates: Requirements 2.4**
   */
  describe('position metadata validity', () => {
    it('should assign valid position indices to all diff lines', () => {
      fc.assert(
        fc.property(
          diffTextArbitrary(),
          (diffText) => {
            // Parse the generated diff
            const files = fetcher.parseUnifiedDiff(diffText);

            // Property: Every DiffLine must have a valid position
            for (const file of files) {
              for (const hunk of file.hunks) {
                for (const line of hunk.lines) {
                  // Position must be a positive integer
                  expect(line.position).toBeGreaterThan(0);
                  expect(Number.isInteger(line.position)).toBe(true);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign sequential position indices within each file', () => {
      fc.assert(
        fc.property(
          diffTextArbitrary(),
          (diffText) => {
            const files = fetcher.parseUnifiedDiff(diffText);

            // Property: Positions should be sequential within each file
            for (const file of files) {
              const positions: number[] = [];
              
              for (const hunk of file.hunks) {
                for (const line of hunk.lines) {
                  positions.push(line.position);
                }
              }

              // Check that positions are strictly increasing
              for (let i = 1; i < positions.length; i++) {
                expect(positions[i]).toBe(positions[i - 1] + 1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should start position indexing at 1 for each file', () => {
      fc.assert(
        fc.property(
          diffTextArbitrary(),
          (diffText) => {
            const files = fetcher.parseUnifiedDiff(diffText);

            // Property: First line of each file should have position 1
            for (const file of files) {
              if (file.hunks.length > 0 && file.hunks[0].lines.length > 0) {
                const firstLine = file.hunks[0].lines[0];
                expect(firstLine.position).toBe(1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain position continuity across multiple hunks', () => {
      fc.assert(
        fc.property(
          multiHunkDiffArbitrary(),
          (diffText) => {
            const files = fetcher.parseUnifiedDiff(diffText);

            // Property: Positions should continue across hunks without gaps
            for (const file of files) {
              if (file.hunks.length > 1) {
                for (let i = 1; i < file.hunks.length; i++) {
                  const prevHunk = file.hunks[i - 1];
                  const currHunk = file.hunks[i];

                  if (prevHunk.lines.length > 0 && currHunk.lines.length > 0) {
                    const lastPosOfPrevHunk = prevHunk.lines[prevHunk.lines.length - 1].position;
                    const firstPosOfCurrHunk = currHunk.lines[0].position;

                    // Current hunk should start immediately after previous hunk
                    expect(firstPosOfCurrHunk).toBe(lastPosOfPrevHunk + 1);
                  }
                }
              }
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
 * Generate a valid unified diff text with random content
 */
function diffTextArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    singleFileDiffArbitrary(),
    multiFileDiffArbitrary()
  );
}

/**
 * Generate a diff with a single file
 */
function singleFileDiffArbitrary(): fc.Arbitrary<string> {
  return fc.record({
    filename: filenameArbitrary(),
    hunks: fc.array(hunkArbitrary(), { minLength: 1, maxLength: 3 }),
    status: fc.constantFrom('modified', 'added', 'removed'),
  }).map(({ filename, hunks, status }) => {
    let diff = `diff --git a/${filename} b/${filename}\n`;
    diff += `index abc123..def456 100644\n`;

    if (status === 'added') {
      diff += `new file mode 100644\n`;
      diff += `--- /dev/null\n`;
    } else if (status === 'removed') {
      diff += `deleted file mode 100644\n`;
      diff += `--- a/${filename}\n`;
      diff += `+++ /dev/null\n`;
    } else {
      diff += `--- a/${filename}\n`;
      diff += `+++ b/${filename}\n`;
    }

    if (status !== 'removed') {
      diff += `+++ b/${filename}\n`;
    }

    diff += hunks.join('\n');
    return diff;
  });
}

/**
 * Generate a diff with multiple files
 */
function multiFileDiffArbitrary(): fc.Arbitrary<string> {
  return fc.array(singleFileDiffArbitrary(), { minLength: 1, maxLength: 3 })
    .map(diffs => diffs.join('\n'));
}

/**
 * Generate a diff with multiple hunks (for testing hunk continuity)
 */
function multiHunkDiffArbitrary(): fc.Arbitrary<string> {
  return fc.record({
    filename: filenameArbitrary(),
    hunks: fc.array(hunkArbitrary(), { minLength: 2, maxLength: 4 }),
  }).map(({ filename, hunks }) => {
    let diff = `diff --git a/${filename} b/${filename}\n`;
    diff += `index abc123..def456 100644\n`;
    diff += `--- a/${filename}\n`;
    diff += `+++ b/${filename}\n`;
    diff += hunks.join('\n');
    return diff;
  });
}

/**
 * Generate a valid filename
 */
function filenameArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('file.ts'),
    fc.constant('src/index.ts'),
    fc.constant('lib/utils.js'),
    fc.constant('test/example.test.ts'),
    fc.stringMatching(/^[a-z]+\/[a-z]+\.(ts|js|tsx|jsx)$/)
  );
}

/**
 * Generate a valid diff hunk
 */
function hunkArbitrary(): fc.Arbitrary<string> {
  return fc.record({
    oldStart: fc.integer({ min: 1, max: 100 }),
    oldLines: fc.integer({ min: 1, max: 10 }),
    newStart: fc.integer({ min: 1, max: 100 }),
    newLines: fc.integer({ min: 1, max: 10 }),
    lines: fc.array(diffLineArbitrary(), { minLength: 1, maxLength: 10 }),
  }).map(({ oldStart, oldLines, newStart, newLines, lines }) => {
    let hunk = `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@\n`;
    hunk += lines.join('\n');
    return hunk;
  });
}

/**
 * Generate a valid diff line (add, delete, or context)
 */
function diffLineArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Context line
    fc.string({ minLength: 0, maxLength: 50 }).map(content => ` ${content}`),
    // Added line
    fc.string({ minLength: 0, maxLength: 50 }).map(content => `+${content}`),
    // Deleted line
    fc.string({ minLength: 0, maxLength: 50 }).map(content => `-${content}`)
  );
}
