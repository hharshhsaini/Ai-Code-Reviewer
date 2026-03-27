/**
 * Diff Chunker
 * Splits large diffs into chunks that fit within LLM context windows
 */

import { DiffFile, DiffChunk } from './types';
import { Logger } from './logger';

export class DiffChunker {
  // Reserve tokens for prompt template and response overhead
  private static readonly RESERVED_TOKENS = 1000;

  /**
   * Chunk diff files to fit within token limit
   * Preserves file atomicity - never splits a single file across chunks
   * unless that file exceeds the token limit
   */
  static chunk(files: DiffFile[], maxTokens: number): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    let currentChunk: DiffFile[] = [];
    let currentTokens = 0;

    // Calculate available tokens after reserving for prompt and response
    const availableTokens = maxTokens - this.RESERVED_TOKENS;

    for (const file of files) {
      const fileTokens = this.estimateTokens(file.patch);

      // If single file exceeds limit, truncate it and create a dedicated chunk
      if (fileTokens > availableTokens) {
        Logger.warning(
          `File ${file.path} exceeds token limit (${fileTokens} > ${availableTokens}), truncating`
        );
        const truncatedFile = this.truncateFile(file, availableTokens);
        chunks.push({
          files: [truncatedFile],
          estimatedTokens: availableTokens,
          metadata: { chunkIndex: chunks.length, totalChunks: -1 },
        });
        continue;
      }

      // If adding this file would exceed limit, start new chunk
      if (currentTokens + fileTokens > availableTokens && currentChunk.length > 0) {
        chunks.push({
          files: currentChunk,
          estimatedTokens: currentTokens,
          metadata: { chunkIndex: chunks.length, totalChunks: -1 },
        });
        currentChunk = [];
        currentTokens = 0;
      }

      // Add file to current chunk
      currentChunk.push(file);
      currentTokens += fileTokens;
    }

    // Add final chunk if it has files
    if (currentChunk.length > 0) {
      chunks.push({
        files: currentChunk,
        estimatedTokens: currentTokens,
        metadata: { chunkIndex: chunks.length, totalChunks: -1 },
      });
    }

    // Update totalChunks metadata for all chunks
    chunks.forEach((chunk, i) => {
      chunk.metadata.chunkIndex = i;
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate a file that exceeds token limit
   * Keeps as many complete hunks as possible within the limit
   */
  private static truncateFile(file: DiffFile, maxTokens: number): DiffFile {
    const truncatedHunks = [];
    let accumulatedTokens = 0;

    // Include file path and metadata in token count
    const metadataText = `File: ${file.path}\nStatus: ${file.status}\n`;
    accumulatedTokens += this.estimateTokens(metadataText);

    // Add hunks until we hit the token limit
    for (const hunk of file.hunks) {
      const hunkText = hunk.lines.map((line) => line.content).join('\n');
      const hunkTokens = this.estimateTokens(hunk.header + '\n' + hunkText);

      if (accumulatedTokens + hunkTokens > maxTokens) {
        // Can't fit this hunk, stop here
        break;
      }

      truncatedHunks.push(hunk);
      accumulatedTokens += hunkTokens;
    }

    // Create truncated file with warning in patch
    const truncatedPatch =
      truncatedHunks.map((hunk) => {
        const hunkLines = hunk.lines.map((line) => line.content).join('\n');
        return `${hunk.header}\n${hunkLines}`;
      }).join('\n') +
      '\n\n[TRUNCATED: File exceeds token limit, showing partial diff]';

    return {
      ...file,
      hunks: truncatedHunks,
      patch: truncatedPatch,
    };
  }
}
