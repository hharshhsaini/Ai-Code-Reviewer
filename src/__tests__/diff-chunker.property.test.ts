/**
 * Property-based tests for DiffChunker
 * Uses fast-check to validate correctness properties across many inputs
 */

import * as fc from 'fast-check';
import { DiffChunker } from '../diff-chunker';
import { DiffFile, DiffHunk, DiffLine } from '../types';

// Arbitrary for DiffLine
const diffLineArbitrary: fc.Arbitrary<DiffLine> = fc.record({
  type: fc.constantFrom('add' as const, 'delete' as const, 'context' as const),
  content: fc.string({ minLength: 1, maxLength: 100 }),
  oldLineNumber: fc.option(fc.nat({ max: 10000 })),
  newLineNumber: fc.option(fc.nat({ max: 10000 })),
  position: fc.nat({ max: 10000 }),
});

// Arbitrary for DiffHunk
const diffHunkArbitrary: fc.Arbitrary<DiffHunk> = fc.record({
  oldStart: fc.nat({ max: 1000 }),
  oldLines: fc.nat({ max: 100 }),
  newStart: fc.nat({ max: 1000 }),
  newLines: fc.nat({ max: 100 }),
  header: fc.string({ minLength: 1, maxLength: 50 }),
  lines: fc.array(diffLineArbitrary, { minLength: 0, maxLength: 20 }),
});

// Arbitrary for DiffFile
const diffFileArbitrary: fc.Arbitrary<DiffFile> = fc.record({
  path: fc.string({ minLength: 1, maxLength: 100 }),
  status: fc.constantFrom('added' as const, 'modified' as const, 'removed' as const, 'renamed' as const),
  additions: fc.nat({ max: 1000 }),
  deletions: fc.nat({ max: 1000 }),
  patch: fc.string({ minLength: 0, maxLength: 5000 }),
  hunks: fc.array(diffHunkArbitrary, { minLength: 0, maxLength: 10 }),
});

describe('DiffChunker - Property Tests', () => {
  /**
   * Property 8: Chunk Size Constraint
   * Validates: Requirements 4.4
   * 
   * For any diff and any token limit, the Chunker SHALL produce chunks where
   * every chunk's estimated token count is less than or equal to the token limit.
   */
  describe('Property 8: Chunk Size Constraint', () => {
    it('should ensure all chunks fit within token limit', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 1500, max: 10000 }), // Token limit (min 1500 to account for reserved tokens)
          (files, tokenLimit) => {
            const chunks = DiffChunker.chunk(files, tokenLimit);
            
            // Calculate available tokens after reserving for prompt and response
            const RESERVED_TOKENS = 1000;
            const availableTokens = tokenLimit - RESERVED_TOKENS;
            
            // Every chunk must be under the available token limit
            for (const chunk of chunks) {
              expect(chunk.estimatedTokens).toBeLessThanOrEqual(availableTokens);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of very small token limits', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1100, max: 1500 }), // Very small limits
          (files, tokenLimit) => {
            const chunks = DiffChunker.chunk(files, tokenLimit);
            
            const RESERVED_TOKENS = 1000;
            const availableTokens = tokenLimit - RESERVED_TOKENS;
            
            // Even with small limits, chunks should not exceed the limit
            for (const chunk of chunks) {
              expect(chunk.estimatedTokens).toBeLessThanOrEqual(availableTokens);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: File Atomicity in Chunks
   * Validates: Requirements 4.2
   * 
   * For any diff that is chunked, no single file SHALL be split across multiple chunks
   * (unless that single file exceeds the token limit).
   */
  describe('Property 9: File Atomicity in Chunks', () => {
    it('should never split a file across multiple chunks unless it exceeds limit', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 2000, max: 10000 }),
          (files, tokenLimit) => {
            // Ensure unique file paths to test atomicity properly
            const uniqueFiles = files.filter((file, index, self) => 
              self.findIndex((f) => f.path === file.path) === index
            );
            
            if (uniqueFiles.length === 0) {
              return; // Skip empty case
            }
            
            const chunks = DiffChunker.chunk(uniqueFiles, tokenLimit);
            
            const RESERVED_TOKENS = 1000;
            const availableTokens = tokenLimit - RESERVED_TOKENS;
            
            // Track which files appear in which chunks
            const fileToChunks = new Map<string, number[]>();
            
            chunks.forEach((chunk, chunkIndex) => {
              chunk.files.forEach((file) => {
                if (!fileToChunks.has(file.path)) {
                  fileToChunks.set(file.path, []);
                }
                fileToChunks.get(file.path)!.push(chunkIndex);
              });
            });
            
            // Check that each file appears in at most one chunk
            // UNLESS that file exceeds the token limit (in which case it gets truncated)
            for (const [filePath, chunkIndices] of fileToChunks.entries()) {
              const file = uniqueFiles.find((f) => f.path === filePath)!;
              const fileTokens = DiffChunker.estimateTokens(file.patch);
              
              if (fileTokens <= availableTokens) {
                // File fits in limit, should appear in exactly one chunk
                expect(chunkIndices.length).toBe(1);
              }
              // If file exceeds limit, it gets truncated and appears in one chunk
              // (we don't split it across multiple chunks)
              expect(chunkIndices.length).toBe(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve complete files in chunks when possible', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 5000, max: 20000 }), // Larger limits to allow multiple files per chunk
          (files, tokenLimit) => {
            // Ensure unique file paths
            const uniqueFiles = files.filter((file, index, self) => 
              self.findIndex((f) => f.path === file.path) === index
            );
            
            if (uniqueFiles.length === 0) {
              return; // Skip empty case
            }
            
            const chunks = DiffChunker.chunk(uniqueFiles, tokenLimit);
            
            // Collect all file paths from chunks
            const filesInChunks = new Set<string>();
            chunks.forEach((chunk) => {
              chunk.files.forEach((file) => {
                filesInChunks.add(file.path);
              });
            });
            
            // All original files should appear in chunks (possibly truncated)
            uniqueFiles.forEach((file) => {
              expect(filesInChunks.has(file.path)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Chunk Metadata Completeness
   * Validates: Requirements 4.3
   * 
   * For any chunk produced by the Chunker, it SHALL contain file paths and
   * line range metadata for all included files.
   */
  describe('Property 10: Chunk Metadata Completeness', () => {
    it('should include complete metadata for all chunks', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 2000, max: 10000 }),
          (files, tokenLimit) => {
            const chunks = DiffChunker.chunk(files, tokenLimit);
            
            // Every chunk must have metadata
            chunks.forEach((chunk, index) => {
              expect(chunk.metadata).toBeDefined();
              expect(chunk.metadata.chunkIndex).toBe(index);
              expect(chunk.metadata.totalChunks).toBe(chunks.length);
              
              // Every chunk must have estimatedTokens
              expect(chunk.estimatedTokens).toBeGreaterThanOrEqual(0);
              expect(typeof chunk.estimatedTokens).toBe('number');
              
              // Every chunk must have files array
              expect(Array.isArray(chunk.files)).toBe(true);
              
              // Every file in chunk must have path
              chunk.files.forEach((file) => {
                expect(file.path).toBeDefined();
                expect(typeof file.path).toBe('string');
                expect(file.path.length).toBeGreaterThan(0);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correct chunk indices across all chunks', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 2000, max: 10000 }),
          (files, tokenLimit) => {
            const chunks = DiffChunker.chunk(files, tokenLimit);
            
            if (chunks.length === 0) {
              return; // Empty input is valid
            }
            
            // Chunk indices should be sequential from 0 to totalChunks - 1
            const expectedIndices = Array.from({ length: chunks.length }, (_, i) => i);
            const actualIndices = chunks.map((chunk) => chunk.metadata.chunkIndex);
            
            expect(actualIndices).toEqual(expectedIndices);
            
            // All chunks should have the same totalChunks value
            const totalChunks = chunks[0].metadata.totalChunks;
            chunks.forEach((chunk) => {
              expect(chunk.metadata.totalChunks).toBe(totalChunks);
            });
            
            // totalChunks should equal the actual number of chunks
            expect(totalChunks).toBe(chunks.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include file path metadata for all files in chunks', () => {
      fc.assert(
        fc.property(
          fc.array(diffFileArbitrary, { minLength: 1, maxLength: 15 }),
          fc.integer({ min: 2000, max: 10000 }),
          (files, tokenLimit) => {
            // Ensure unique file paths
            const uniqueFiles = files.filter((file, index, self) => 
              self.findIndex((f) => f.path === file.path) === index
            );
            
            if (uniqueFiles.length === 0) {
              return; // Skip empty case
            }
            
            const chunks = DiffChunker.chunk(uniqueFiles, tokenLimit);
            
            // Collect all file paths from chunks
            const filePathsInChunks = new Set<string>();
            chunks.forEach((chunk) => {
              chunk.files.forEach((file) => {
                expect(file.path).toBeDefined();
                expect(file.path.length).toBeGreaterThan(0);
                filePathsInChunks.add(file.path);
              });
            });
            
            // All original file paths should be represented in chunks
            uniqueFiles.forEach((file) => {
              expect(filePathsInChunks.has(file.path)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
