/**
 * Core data models for the AI Code Reviewer
 */

// Configuration from action.yml inputs
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

// Severity levels for issues
export type Severity = 'critical' | 'warning' | 'suggestion';

// Verdict for the overall review
export type Verdict = 'approve' | 'request_changes' | 'comment';

// Represents a single changed file with its diff
export interface DiffFile {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  hunks: DiffHunk[];
}

// A single hunk within a diff
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

// A single line within a diff hunk
export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  position: number;
}

// A chunk of diff sent to the LLM
export interface DiffChunk {
  files: DiffFile[];
  estimatedTokens: number;
  metadata: {
    chunkIndex: number;
    totalChunks: number;
  };
}

// LLM response structure
export interface ReviewResponse {
  issues: Issue[];
  summary: string;
  verdict: Verdict;
}

// A single issue identified by the LLM
export interface Issue {
  severity: Severity;
  file: string;
  line: number;
  comment: string;
  suggestion?: string;
}

// Issue with mapped diff position
export interface MappedIssue extends Issue {
  position: number | null;
}

// GitHub review comment format
export interface ReviewComment {
  path: string;
  position?: number;
  body: string;
}

// Summary statistics for logging
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
