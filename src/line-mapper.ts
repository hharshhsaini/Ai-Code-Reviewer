/**
 * Line Mapper
 * Maps file line numbers to GitHub diff positions
 */

import { DiffFile, Issue, MappedIssue } from './types';

export class LineMapper {
  /**
   * Map a line number to a diff position
   * 
   * GitHub's review API requires a position parameter that represents the index
   * within the diff, not the line number in the file.
   * 
   * @param file - The DiffFile containing hunks and lines
   * @param lineNumber - The line number in the new version of the file
   * @returns The position index in the diff, or null if the line is not in the diff
   */
  static mapLineToPosition(file: DiffFile, lineNumber: number): number | null {
    let position = 0;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        position++; // Increment position for every line in diff

        // Check if this is the line we're looking for
        if (line.type === 'add' && line.newLineNumber === lineNumber) {
          return position;
        }
        if (line.type === 'context' && line.newLineNumber === lineNumber) {
          return position;
        }
        // Note: deleted lines don't have newLineNumber
      }
    }

    return null; // Line not found in diff
  }

  /**
   * Map all issues to diff positions
   */
  static mapIssues(issues: Issue[], files: DiffFile[]): MappedIssue[] {
    return issues.map(issue => {
      // Find the file for this issue
      const file = files.find(f => f.path === issue.file);
      
      if (!file) {
        // File not found, return with null position
        return {
          ...issue,
          position: null,
        };
      }

      // Map the line number to a position
      const position = this.mapLineToPosition(file, issue.line);

      return {
        ...issue,
        position,
      };
    });
  }
}
