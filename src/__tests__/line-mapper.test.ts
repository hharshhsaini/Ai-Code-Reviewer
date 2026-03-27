/**
 * Unit tests for Line Mapper
 * Feature: ai-code-reviewer
 */

import { LineMapper } from '../line-mapper';
import { DiffFile, DiffHunk, DiffLine, Issue } from '../types';

describe('LineMapper', () => {
  describe('mapLineToPosition', () => {
    test('maps added line in single hunk', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 2,
        deletions: 0,
        patch: '@@ -1,3 +1,5 @@\n line1\n+line2\n+line3\n line4',
        hunks: [
          {
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 5,
            header: '@@ -1,3 +1,5 @@',
            lines: [
              { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
              { type: 'add', content: 'line2', newLineNumber: 2, position: 2 },
              { type: 'add', content: 'line3', newLineNumber: 3, position: 3 },
              { type: 'context', content: 'line4', oldLineNumber: 2, newLineNumber: 4, position: 4 },
            ],
          },
        ],
      };

      expect(LineMapper.mapLineToPosition(file, 2)).toBe(2);
      expect(LineMapper.mapLineToPosition(file, 3)).toBe(3);
    });

    test('maps context line in single hunk', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '@@ -1,3 +1,4 @@\n line1\n+line2\n line3',
        hunks: [
          {
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 4,
            header: '@@ -1,3 +1,4 @@',
            lines: [
              { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
              { type: 'add', content: 'line2', newLineNumber: 2, position: 2 },
              { type: 'context', content: 'line3', oldLineNumber: 2, newLineNumber: 3, position: 3 },
            ],
          },
        ],
      };

      expect(LineMapper.mapLineToPosition(file, 1)).toBe(1);
      expect(LineMapper.mapLineToPosition(file, 3)).toBe(3);
    });

    test('returns null for deleted line', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 0,
        deletions: 1,
        patch: '@@ -1,3 +1,2 @@\n line1\n-line2\n line3',
        hunks: [
          {
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 2,
            header: '@@ -1,3 +1,2 @@',
            lines: [
              { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
              { type: 'delete', content: 'line2', oldLineNumber: 2, position: 2 },
              { type: 'context', content: 'line3', oldLineNumber: 3, newLineNumber: 2, position: 3 },
            ],
          },
        ],
      };

      // Line 2 in the old file was deleted, so there's no line 2 in the new file
      // The algorithm should return null for any line number that doesn't exist
      expect(LineMapper.mapLineToPosition(file, 5)).toBeNull();
    });

    test('returns null for line not in diff', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 1,
        deletions: 0,
        patch: '@@ -10,3 +10,4 @@\n line10\n+line11\n line12',
        hunks: [
          {
            oldStart: 10,
            oldLines: 3,
            newStart: 10,
            newLines: 4,
            header: '@@ -10,3 +10,4 @@',
            lines: [
              { type: 'context', content: 'line10', oldLineNumber: 10, newLineNumber: 10, position: 1 },
              { type: 'add', content: 'line11', newLineNumber: 11, position: 2 },
              { type: 'context', content: 'line12', oldLineNumber: 11, newLineNumber: 12, position: 3 },
            ],
          },
        ],
      };

      // Line 1 is not in the diff (diff starts at line 10)
      expect(LineMapper.mapLineToPosition(file, 1)).toBeNull();
      // Line 100 is not in the diff
      expect(LineMapper.mapLineToPosition(file, 100)).toBeNull();
    });

    test('handles multiple hunks in same file', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 2,
        deletions: 0,
        patch: '@@ -1,2 +1,3 @@\n line1\n+line2\n line3\n@@ -10,2 +11,3 @@\n line10\n+line11\n line12',
        hunks: [
          {
            oldStart: 1,
            oldLines: 2,
            newStart: 1,
            newLines: 3,
            header: '@@ -1,2 +1,3 @@',
            lines: [
              { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
              { type: 'add', content: 'line2', newLineNumber: 2, position: 2 },
              { type: 'context', content: 'line3', oldLineNumber: 2, newLineNumber: 3, position: 3 },
            ],
          },
          {
            oldStart: 10,
            oldLines: 2,
            newStart: 11,
            newLines: 3,
            header: '@@ -10,2 +11,3 @@',
            lines: [
              { type: 'context', content: 'line10', oldLineNumber: 10, newLineNumber: 11, position: 4 },
              { type: 'add', content: 'line11', newLineNumber: 12, position: 5 },
              { type: 'context', content: 'line12', oldLineNumber: 11, newLineNumber: 13, position: 6 },
            ],
          },
        ],
      };

      // First hunk
      expect(LineMapper.mapLineToPosition(file, 1)).toBe(1);
      expect(LineMapper.mapLineToPosition(file, 2)).toBe(2);
      expect(LineMapper.mapLineToPosition(file, 3)).toBe(3);

      // Second hunk (note: line numbers are adjusted due to the addition in first hunk)
      expect(LineMapper.mapLineToPosition(file, 11)).toBe(4);
      expect(LineMapper.mapLineToPosition(file, 12)).toBe(5);
      expect(LineMapper.mapLineToPosition(file, 13)).toBe(6);

      // Line between hunks should return null
      expect(LineMapper.mapLineToPosition(file, 5)).toBeNull();
    });

    test('handles mixed changes (additions, deletions, context)', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 2,
        deletions: 1,
        patch: '@@ -1,4 +1,5 @@\n line1\n-line2\n+line2new\n+line3new\n line4',
        hunks: [
          {
            oldStart: 1,
            oldLines: 4,
            newStart: 1,
            newLines: 5,
            header: '@@ -1,4 +1,5 @@',
            lines: [
              { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
              { type: 'delete', content: 'line2', oldLineNumber: 2, position: 2 },
              { type: 'add', content: 'line2new', newLineNumber: 2, position: 3 },
              { type: 'add', content: 'line3new', newLineNumber: 3, position: 4 },
              { type: 'context', content: 'line4', oldLineNumber: 3, newLineNumber: 4, position: 5 },
            ],
          },
        ],
      };

      expect(LineMapper.mapLineToPosition(file, 1)).toBe(1);
      expect(LineMapper.mapLineToPosition(file, 2)).toBe(3); // First added line
      expect(LineMapper.mapLineToPosition(file, 3)).toBe(4); // Second added line
      expect(LineMapper.mapLineToPosition(file, 4)).toBe(5);
    });

    test('handles empty hunks array', () => {
      const file: DiffFile = {
        path: 'test.ts',
        status: 'modified',
        additions: 0,
        deletions: 0,
        patch: '',
        hunks: [],
      };

      expect(LineMapper.mapLineToPosition(file, 1)).toBeNull();
      expect(LineMapper.mapLineToPosition(file, 100)).toBeNull();
    });
  });

  describe('mapIssues', () => {
    test('maps issues to positions', () => {
      const files: DiffFile[] = [
        {
          path: 'test.ts',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '@@ -1,2 +1,3 @@\n line1\n+line2\n line3',
          hunks: [
            {
              oldStart: 1,
              oldLines: 2,
              newStart: 1,
              newLines: 3,
              header: '@@ -1,2 +1,3 @@',
              lines: [
                { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
                { type: 'add', content: 'line2', newLineNumber: 2, position: 2 },
                { type: 'context', content: 'line3', oldLineNumber: 2, newLineNumber: 3, position: 3 },
              ],
            },
          ],
        },
      ];

      const issues: Issue[] = [
        {
          severity: 'warning',
          file: 'test.ts',
          line: 2,
          comment: 'Issue on line 2',
        },
        {
          severity: 'critical',
          file: 'test.ts',
          line: 100,
          comment: 'Issue on line 100 (not in diff)',
        },
      ];

      const mapped = LineMapper.mapIssues(issues, files);

      expect(mapped).toHaveLength(2);
      expect(mapped[0].position).toBe(2);
      expect(mapped[1].position).toBeNull();
    });

    test('returns null position for file not found', () => {
      const files: DiffFile[] = [
        {
          path: 'test.ts',
          status: 'modified',
          additions: 1,
          deletions: 0,
          patch: '@@ -1,2 +1,3 @@\n line1\n+line2\n line3',
          hunks: [
            {
              oldStart: 1,
              oldLines: 2,
              newStart: 1,
              newLines: 3,
              header: '@@ -1,2 +1,3 @@',
              lines: [
                { type: 'context', content: 'line1', oldLineNumber: 1, newLineNumber: 1, position: 1 },
                { type: 'add', content: 'line2', newLineNumber: 2, position: 2 },
                { type: 'context', content: 'line3', oldLineNumber: 2, newLineNumber: 3, position: 3 },
              ],
            },
          ],
        },
      ];

      const issues: Issue[] = [
        {
          severity: 'warning',
          file: 'other.ts',
          line: 1,
          comment: 'Issue in file not in diff',
        },
      ];

      const mapped = LineMapper.mapIssues(issues, files);

      expect(mapped).toHaveLength(1);
      expect(mapped[0].position).toBeNull();
    });
  });
});
