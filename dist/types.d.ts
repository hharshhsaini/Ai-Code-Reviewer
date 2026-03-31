/**
 * Core data models for the AI Code Reviewer
 */
export interface ActionConfig {
    githubToken: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    ollamaBaseUrl?: string;
    model: string;
    maxFiles?: number;
    severityThreshold?: Severity;
    provider: 'anthropic' | 'openai' | 'ollama';
}
export type Severity = 'critical' | 'warning' | 'suggestion';
export type Verdict = 'approve' | 'request_changes' | 'comment';
export interface DiffFile {
    path: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    patch: string;
    hunks: DiffHunk[];
}
export interface DiffHunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    header: string;
    lines: DiffLine[];
}
export interface DiffLine {
    type: 'add' | 'delete' | 'context';
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
    position: number;
}
export interface DiffChunk {
    files: DiffFile[];
    estimatedTokens: number;
    metadata: {
        chunkIndex: number;
        totalChunks: number;
    };
}
export interface ReviewResponse {
    issues: Issue[];
    summary: string;
    verdict: Verdict;
}
export interface Issue {
    severity: Severity;
    file: string;
    line: number;
    comment: string;
    suggestion?: string;
}
export interface MappedIssue extends Issue {
    position: number | null;
}
export interface ReviewComment {
    path: string;
    position?: number;
    body: string;
}
export interface ReviewSummary {
    filesReviewed: number;
    issuesFound: {
        critical: number;
        warning: number;
        suggestion: number;
    };
    verdict: Verdict;
    tokensUsed: number;
    estimatedCost: number;
}
//# sourceMappingURL=types.d.ts.map