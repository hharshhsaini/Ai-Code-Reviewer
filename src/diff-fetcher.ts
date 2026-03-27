/**
 * Diff Fetcher
 * Fetches and parses PR diffs with position metadata
 */

import { DiffFile, DiffHunk, DiffLine } from './types';
import { GitHubClient } from './github-client';

export class DiffFetcher {
  private githubClient: GitHubClient;

  constructor(githubClient: GitHubClient) {
    this.githubClient = githubClient;
  }

  /**
   * Fetch PR metadata and parse all changed files
   */
  async fetchPRDiff(owner: string, repo: string, pullNumber: number): Promise<DiffFile[]> {
    // Fetch PR metadata to get base and head SHAs
    const pr = await this.githubClient.getPullRequest(owner, repo, pullNumber);
    const baseSha = (pr as any).base?.sha;
    const headSha = (pr as any).head?.sha;

    if (!baseSha || !headSha) {
      throw new Error('Failed to retrieve base or head SHA from PR metadata');
    }

    // Fetch the unified diff
    const diffText = await this.githubClient.getDiff(owner, repo, pullNumber);

    // Parse the diff into DiffFile objects
    return this.parseUnifiedDiff(diffText);
  }

  /**
   * Parse unified diff format into DiffFile objects
   */
  parseUnifiedDiff(diffText: string): DiffFile[] {
    const files: DiffFile[] = [];
    const lines = diffText.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Look for file headers (diff --git a/path b/path)
      if (line.startsWith('diff --git ')) {
        const fileResult = this.parseFile(lines, i);
        if (fileResult.file) {
          files.push(fileResult.file);
        }
        i = fileResult.nextIndex;
      } else {
        i++;
      }
    }

    return files;
  }

  /**
   * Parse a single file's diff starting from the "diff --git" line
   */
  private parseFile(lines: string[], startIndex: number): { file: DiffFile | null; nextIndex: number } {
    let i = startIndex;
    const diffLine = lines[i];

    // Extract file path from "diff --git a/path b/path"
    const match = diffLine.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) {
      return { file: null, nextIndex: i + 1 };
    }

    const oldPath = match[1];
    const newPath = match[2];
    const path = newPath; // Use the new path as the primary path

    i++;

    // Parse file metadata headers
    let status: 'added' | 'modified' | 'removed' | 'renamed' = 'modified';
    let additions = 0;
    let deletions = 0;

    // Look for status indicators
    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
      const line = lines[i];

      if (line.startsWith('new file mode')) {
        status = 'added';
      } else if (line.startsWith('deleted file mode')) {
        status = 'removed';
      } else if (line.startsWith('rename from')) {
        status = 'renamed';
      } else if (line.startsWith('---') || line.startsWith('+++')) {
        // File path indicators, skip
      } else if (line.startsWith('index')) {
        // Index line, skip
      } else if (line.startsWith('Binary files')) {
        // Binary file, skip this file entirely
        // Find next file or end
        while (i < lines.length && !lines[i].startsWith('diff --git')) {
          i++;
        }
        return { file: null, nextIndex: i };
      }

      i++;
    }

    // Parse hunks
    const hunks: DiffHunk[] = [];
    const patchLines: string[] = [];
    let position = 0; // Global position counter for the entire file's diff

    while (i < lines.length && lines[i].startsWith('@@')) {
      const hunkResult = this.parseHunk(lines, i, position);
      hunks.push(hunkResult.hunk);
      patchLines.push(...hunkResult.patchLines);
      position = hunkResult.nextPosition;
      i = hunkResult.nextIndex;
    }

    // Count additions and deletions
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++;
        if (line.type === 'delete') deletions++;
      }
    }

    const file: DiffFile = {
      path,
      status,
      additions,
      deletions,
      patch: patchLines.join('\n'),
      hunks,
    };

    return { file, nextIndex: i };
  }

  /**
   * Parse a single hunk starting from the @@ line
   */
  private parseHunk(
    lines: string[],
    startIndex: number,
    startPosition: number
  ): { hunk: DiffHunk; patchLines: string[]; nextPosition: number; nextIndex: number } {
    const headerLine = lines[startIndex];
    const hunkMetadata = this.parseHunkHeader(headerLine);

    const patchLines: string[] = [headerLine];
    let i = startIndex + 1;
    let position = startPosition;

    const diffLines: DiffLine[] = [];
    let oldLineNum = hunkMetadata.oldStart;
    let newLineNum = hunkMetadata.newStart;

    // Parse lines until we hit another hunk or file
    while (
      i < lines.length &&
      !lines[i].startsWith('@@') &&
      !lines[i].startsWith('diff --git')
    ) {
      const line = lines[i];
      patchLines.push(line);

      // Determine line type
      if (line.startsWith('+')) {
        position++;
        diffLines.push({
          type: 'add',
          content: line.substring(1),
          newLineNumber: newLineNum,
          position,
        });
        newLineNum++;
      } else if (line.startsWith('-')) {
        position++;
        diffLines.push({
          type: 'delete',
          content: line.substring(1),
          oldLineNumber: oldLineNum,
          position,
        });
        oldLineNum++;
      } else if (line.startsWith(' ')) {
        position++;
        diffLines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
          position,
        });
        oldLineNum++;
        newLineNum++;
      } else if (line.startsWith('\\')) {
        // "\ No newline at end of file" - skip
      } else if (line === '') {
        // Empty line in diff (context line with no content)
        position++;
        diffLines.push({
          type: 'context',
          content: '',
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
          position,
        });
        oldLineNum++;
        newLineNum++;
      } else {
        // Unknown line format, treat as context
        position++;
        diffLines.push({
          type: 'context',
          content: line,
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
          position,
        });
        oldLineNum++;
        newLineNum++;
      }

      i++;
    }

    const hunk: DiffHunk = {
      ...hunkMetadata,
      lines: diffLines,
    };

    return {
      hunk,
      patchLines,
      nextPosition: position,
      nextIndex: i,
    };
  }

  /**
   * Parse a diff hunk header (@@ -old_start,old_count +new_start,new_count @@)
   */
  private parseHunkHeader(header: string): Omit<DiffHunk, 'lines'> {
    // Format: @@ -oldStart,oldLines +newStart,newLines @@ optional context
    const match = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);

    if (!match) {
      throw new Error(`Invalid hunk header format: ${header}`);
    }

    const oldStart = parseInt(match[1], 10);
    const oldLines = match[2] ? parseInt(match[2], 10) : 1;
    const newStart = parseInt(match[3], 10);
    const newLines = match[4] ? parseInt(match[4], 10) : 1;
    const context = match[5] || '';

    return {
      oldStart,
      oldLines,
      newStart,
      newLines,
      header: header,
    };
  }
}
