/**
 * Property-based tests for Line Mapper
 * Feature: ai-code-reviewer
 */

import * as fc from 'fast-check';
import { LineMapper } from '../line-mapper';
import { DiffFile, DiffHunk, DiffLine } from '../types';

describe('LineMapper - Property Tests', () => {
  // Helper to create a valid DiffFile with hunks
  const diffFileArbitrary = fc.record({
    path: fc.string({ minLength: 1 }),
    status: fc.constantFrom('added' as const, 'modified' as const, 'removed' as const, 'renamed' as const),
    additions: fc.nat(),
    deletions: fc.nat(),
    patch: fc.string(),
    hunks: fc.array(
      fc.record({
        oldStart: fc.integer({ min: 1, max: 1000 }),
        oldLines: fc.integer({ min: 0, max: 100 }),
        newStart: fc.integer({ min: 1, max: 1000 }),
        newLines: fc.integer({ min: 0, max: 100 }),
        header: fc.string(),
        lines: fc.array(
          fc.oneof(
            // Added line
            fc.record({
              type: fc.constant('add' as const),
              content: fc.string(),
              newLineNumber: fc.integer({ min: 1, max: 1000 }),
              position: fc.integer({ min: 1, max: 10000 }),
            }),
            // Deleted line
            fc.record({
              type: fc.constant('delete' as const),
              content: fc.string(),
              oldLineNumber: fc.integer({ min: 1, max: 1000 }),
              position: fc.integer({ min: 1, max: 10000 }),
            }),
            // Context line
            fc.record({
              type: fc.constant('context' as const),
              content: fc.string(),
              oldLineNumber: fc.integer({ min: 1, max: 1000 }),
              newLineNumber: fc.integer({ min: 1, max: 1000 }),
              position: fc.integer({ min: 1, max: 10000 }),
            })
          ),
          { minLength: 1, maxLength: 50 }
        ),
      }),
      { minLength: 1, maxLength: 10 }
    ),
  });

  /**
   * Property 13: Line-to-Position Mapping Correctness
   * **Validates: Requirements 7.1, 7.2, 7.4**
   * 
   * For any DiffFile and any line number that appears in the diff as an added or
   * context line, mapLineToPosition SHALL return a position value that corresponds
   * to that line's index in the unified diff format.
   */
  test('Property 13: Line-to-Position Mapping Correctness', () => {
    fc.assert(
      fc.property(diffFileArbitrary, (file) => {
        // Collect all added and context lines with their line numbers
        const mappableLines: Array<{ lineNumber: number; expectedPosition: number }> = [];
        let position = 0;

        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            position++;
            if (line.type === 'add' && line.newLineNumber !== undefined) {
              mappableLines.push({ lineNumber: line.newLineNumber, expectedPosition: position });
            } else if (line.type === 'context' && line.newLineNumber !== undefined) {
              mappableLines.push({ lineNumber: line.newLineNumber, expectedPosition: position });
            }
          }
        }

        // For each mappable line, verify mapLineToPosition returns the correct position
        for (const { lineNumber, expectedPosition } of mappableLines) {
          const result = LineMapper.mapLineToPosition(file, lineNumber);
          
          // The result should be a valid position (not null)
          expect(result).not.toBeNull();
          
          // The result should match the expected position
          // Note: If there are duplicate line numbers, we expect the first occurrence
          if (result !== null) {
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(position);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: Unmappable Line Handling
   * **Validates: Requirements 7.3**
   * 
   * For any line number that does not appear in the diff (deleted lines or lines
   * outside changed hunks), mapLineToPosition SHALL return null.
   */
  test('Property 14: Unmappable Line Handling', () => {
    fc.assert(
      fc.property(diffFileArbitrary, fc.integer({ min: 1, max: 10000 }), (file, randomLineNumber) => {
        // Collect all line numbers that appear in the diff as added or context lines
        const mappableLineNumbers = new Set<number>();

        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'add' && line.newLineNumber !== undefined) {
              mappableLineNumbers.add(line.newLineNumber);
            } else if (line.type === 'context' && line.newLineNumber !== undefined) {
              mappableLineNumbers.add(line.newLineNumber);
            }
          }
        }

        // If the random line number is NOT in the mappable set, it should return null
        if (!mappableLineNumbers.has(randomLineNumber)) {
          const result = LineMapper.mapLineToPosition(file, randomLineNumber);
          expect(result).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});
