/**
 * Line Mapper
 * Maps file line numbers to GitHub diff positions
 */
import { DiffFile, Issue, MappedIssue } from './types';
export declare class LineMapper {
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
    static mapLineToPosition(file: DiffFile, lineNumber: number): number | null;
    /**
     * Map all issues to diff positions
     */
    static mapIssues(issues: Issue[], files: DiffFile[]): MappedIssue[];
}
//# sourceMappingURL=line-mapper.d.ts.map