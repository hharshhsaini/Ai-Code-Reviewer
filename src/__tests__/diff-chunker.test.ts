/**
 * Unit tests for DiffChunker
 */

import { DiffChunker } from '../diff-chunker';
import { DiffFile } from '../types';

describe('DiffChunker', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens as character count / 4', () => {
      expect(DiffChunker.estimateTokens('test')).toBe(1); // 4 chars / 4 = 1
      expect(DiffChunker.estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75, ceil = 3
      expect(DiffChunker.estimateTokens('a'.repeat(100))).toBe(25); // 100 / 4 = 25
    });

    it('should handle empty strings', () => {
      expect(DiffChunker.estimateTokens('')).toBe(0);
    });
  });

  describe('chunk', () => {
    const createMockFile = (path: string, patchSize: number): DiffFile => ({
      path,
      status: 'modified',
      additions: 10,
      deletions: 5,
      patch: 'x'.repeat(patchSize * 4), // 4 chars per token
      hunks: [],
    });

    it('should return empty array for empty file list', () => {
      const chunks = DiffChunker.chunk([], 1000);
      expect(chunks).toEqual([]);
    });

    it('should create single chunk for files under limit', () => {
      const files = [
        createMockFile('file1.ts', 100), // 100 tokens
        createMockFile('file2.ts', 100), // 100 tokens
      ];
      
      const chunks = DiffChunker.chunk(files, 2000); // 2000 token limit
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].files).toHaveLength(2);
      expect(chunks[0].estimatedTokens).toBe(200);
      expect(chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunks[0].metadata.totalChunks).toBe(1);
    });

    it('should create multiple chunks when files exceed limit', () => {
      const files = [
        createMockFile('file1.ts', 600), // 600 tokens
        createMockFile('file2.ts', 600), // 600 tokens
        createMockFile('file3.ts', 600), // 600 tokens
      ];
      
      // With 1000 reserved, available = 1000, so each file needs its own chunk
      const chunks = DiffChunker.chunk(files, 2000);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0].files).toHaveLength(1);
      expect(chunks[1].files).toHaveLength(1);
      expect(chunks[2].files).toHaveLength(1);
      expect(chunks[0].metadata.totalChunks).toBe(3);
      expect(chunks[1].metadata.totalChunks).toBe(3);
      expect(chunks[2].metadata.totalChunks).toBe(3);
    });

    it('should preserve file atomicity', () => {
      const files = [
        createMockFile('file1.ts', 400), // 400 tokens
        createMockFile('file2.ts', 400), // 400 tokens
        createMockFile('file3.ts', 400), // 400 tokens
      ];
      
      // Available = 1000, so first two files fit in chunk 1 (800 tokens)
      // Third file needs its own chunk
      const chunks = DiffChunker.chunk(files, 2000);
      
      expect(chunks).toHaveLength(2);
      expect(chunks[0].files).toHaveLength(2); // file1 + file2
      expect(chunks[1].files).toHaveLength(1); // file3
    });

    it('should reserve tokens for prompt and response', () => {
      const files = [createMockFile('file1.ts', 500)];
      
      const chunks = DiffChunker.chunk(files, 2000);
      
      // Should fit because 500 < (2000 - 1000 reserved)
      expect(chunks).toHaveLength(1);
      expect(chunks[0].files).toHaveLength(1);
    });

    it('should truncate single file that exceeds limit', () => {
      const largeFile: DiffFile = {
        path: 'large.ts',
        status: 'modified',
        additions: 100,
        deletions: 50,
        patch: 'x'.repeat(10000), // 2500 tokens
        hunks: [
          {
            oldStart: 1,
            oldLines: 10,
            newStart: 1,
            newLines: 10,
            header: '@@ -1,10 +1,10 @@',
            lines: [
              { type: 'add', content: '+line1', newLineNumber: 1, position: 1 },
            ],
          },
        ],
      };
      
      const chunks = DiffChunker.chunk([largeFile], 2000);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].files).toHaveLength(1);
      expect(chunks[0].files[0].patch).toContain('[TRUNCATED');
    });

    it('should update chunk metadata correctly', () => {
      const files = [
        createMockFile('file1.ts', 600),
        createMockFile('file2.ts', 600),
      ];
      
      const chunks = DiffChunker.chunk(files, 2000);
      
      expect(chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunks[0].metadata.totalChunks).toBe(2);
      expect(chunks[1].metadata.chunkIndex).toBe(1);
      expect(chunks[1].metadata.totalChunks).toBe(2);
    });
  });
});
