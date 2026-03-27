/**
 * Diff Fetcher
 * Fetches and parses PR diffs with position metadata
 */
import { DiffFile } from './types';
import { GitHubClient } from './github-client';
export declare class DiffFetcher {
    private githubClient;
    constructor(githubClient: GitHubClient);
    /**
     * Fetch PR metadata and parse all changed files
     */
    fetchPRDiff(owner: string, repo: string, pullNumber: number): Promise<DiffFile[]>;
    /**
     * Parse unified diff format into DiffFile objects
     */
    parseUnifiedDiff(diffText: string): DiffFile[];
    /**
     * Parse a single file's diff starting from the "diff --git" line
     */
    private parseFile;
    /**
     * Parse a single hunk starting from the @@ line
     */
    private parseHunk;
    /**
     * Parse a diff hunk header (@@ -old_start,old_count +new_start,new_count @@)
     */
    private parseHunkHeader;
}
//# sourceMappingURL=diff-fetcher.d.ts.map