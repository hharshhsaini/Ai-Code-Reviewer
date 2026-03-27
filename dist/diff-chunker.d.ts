/**
 * Diff Chunker
 * Splits large diffs into chunks that fit within LLM context windows
 */
import { DiffFile, DiffChunk } from './types';
export declare class DiffChunker {
    private static readonly RESERVED_TOKENS;
    /**
     * Chunk diff files to fit within token limit
     * Preserves file atomicity - never splits a single file across chunks
     * unless that file exceeds the token limit
     */
    static chunk(files: DiffFile[], maxTokens: number): DiffChunk[];
    /**
     * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
     */
    static estimateTokens(text: string): number;
    /**
     * Truncate a file that exceeds token limit
     * Keeps as many complete hunks as possible within the limit
     */
    private static truncateFile;
}
//# sourceMappingURL=diff-chunker.d.ts.map