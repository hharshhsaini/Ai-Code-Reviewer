/**
 * Property-based tests for FileFilter
 * Feature: ai-code-reviewer
 * Validates: Requirements 3.4, 3.5, 3.6, 3.7
 */

import * as fc from 'fast-check';
import { FileFilter } from '../file-filter';
import { DiffFile } from '../types';

describe('FileFilter - Property Tests', () => {
  /**
   * Property 4: Generated File Filtering
   * 
   * For any file path containing ".generated." in the filename, 
   * the Filter SHALL exclude it from the reviewable files list.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 4: Generated File Filtering', () => {
    it('should exclude all files with .generated. in the path', () => {
      fc.assert(
        fc.property(
          fc.array(filePathArbitrary(), { minLength: 1, maxLength: 20 }),
          (paths) => {
            // Create files, some with .generated. in the path
            const files = paths.map(path => createMockFile(path));
            
            // Filter the files
            const result = FileFilter.filter(files);

            // Property: No file in result should contain .generated.
            for (const file of result) {
              expect(file.path).not.toContain('.generated.');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude files with .generated. regardless of position in path', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringMatching(/^[a-z]+$/),
            fc.stringMatching(/^[a-z]+$/),
            fc.stringMatching(/^[a-z]+$/),
            fc.constantFrom('ts', 'js', 'tsx', 'jsx')
          ),
          ([prefix, middle, suffix, ext]) => {
            // Create a file with .generated. somewhere in the path
            const generatedPath = `${prefix}/${middle}.generated.${suffix}.${ext}`;
            const normalPath = `${prefix}/${middle}.${suffix}.${ext}`;
            
            const files = [
              createMockFile(generatedPath),
              createMockFile(normalPath),
            ];

            const result = FileFilter.filter(files);

            // Property: Generated file should be excluded
            expect(result).toHaveLength(1);
            expect(result[0].path).toBe(normalPath);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Snapshot Directory Filtering
   * 
   * For any file path containing a "__snapshots__" directory component, 
   * the Filter SHALL exclude it from the reviewable files list.
   * 
   * **Validates: Requirements 3.5**
   */
  describe('Property 5: Snapshot Directory Filtering', () => {
    it('should exclude all files with __snapshots__ in the path', () => {
      fc.assert(
        fc.property(
          fc.array(filePathArbitrary(), { minLength: 1, maxLength: 20 }),
          (paths) => {
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files);

            // Property: No file in result should contain __snapshots__
            for (const file of result) {
              expect(file.path).not.toContain('__snapshots__');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude files with __snapshots__ at any directory level', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.array(fc.stringMatching(/^[a-z]+$/), { minLength: 0, maxLength: 3 }),
            fc.stringMatching(/^[a-z]+\.(snap|ts|js)$/)
          ),
          ([dirs, filename]) => {
            // Create paths with __snapshots__ at different levels
            const pathWithSnapshot = [...dirs, '__snapshots__', filename].join('/');
            const pathWithoutSnapshot = [...dirs, filename].join('/');

            const files = [
              createMockFile(pathWithSnapshot),
              createMockFile(pathWithoutSnapshot),
            ];

            const result = FileFilter.filter(files);

            // Property: Snapshot file should be excluded
            const resultPaths = result.map(f => f.path);
            expect(resultPaths).not.toContain(pathWithSnapshot);
            if (pathWithoutSnapshot !== filename || dirs.length === 0) {
              expect(resultPaths).toContain(pathWithoutSnapshot);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Minified File Filtering
   * 
   * For any file path ending with ".min.js" or ".min.css", 
   * the Filter SHALL exclude it from the reviewable files list.
   * 
   * **Validates: Requirements 3.6**
   */
  describe('Property 6: Minified File Filtering', () => {
    it('should exclude all files ending with .min.js or .min.css', () => {
      fc.assert(
        fc.property(
          fc.array(filePathArbitrary(), { minLength: 1, maxLength: 20 }),
          (paths) => {
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files);

            // Property: No file in result should end with .min.js or .min.css
            for (const file of result) {
              expect(file.path).not.toMatch(/\.min\.(js|css)$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude minified files regardless of directory structure', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.array(fc.stringMatching(/^[a-z]+$/), { minLength: 0, maxLength: 3 }),
            fc.stringMatching(/^[a-z]+$/),
            fc.constantFrom('js', 'css')
          ),
          ([dirs, basename, ext]) => {
            const minifiedPath = [...dirs, `${basename}.min.${ext}`].join('/');
            const normalPath = [...dirs, `${basename}.${ext}`].join('/');

            const files = [
              createMockFile(minifiedPath),
              createMockFile(normalPath),
            ];

            const result = FileFilter.filter(files);

            // Property: Minified file should be excluded
            const resultPaths = result.map(f => f.path);
            expect(resultPaths).not.toContain(minifiedPath);
            expect(resultPaths).toContain(normalPath);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Max Files Limit Enforcement
   * 
   * For any list of files and any max_files configuration value N, 
   * the Filter SHALL return at most N files.
   * 
   * **Validates: Requirements 3.7**
   */
  describe('Property 7: Max Files Limit Enforcement', () => {
    it('should never return more than max_files', () => {
      fc.assert(
        fc.property(
          fc.array(reviewableFilePathArbitrary(), { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (paths, maxFiles) => {
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files, maxFiles);

            // Property: Result length should be at most maxFiles
            expect(result.length).toBeLessThanOrEqual(maxFiles);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all files when count is less than max_files', () => {
      fc.assert(
        fc.property(
          fc.array(reviewableFilePathArbitrary(), { minLength: 1, maxLength: 10 }),
          (paths) => {
            const maxFiles = paths.length + 10; // More than available
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files, maxFiles);

            // Property: Should return all files when under limit
            expect(result.length).toBe(paths.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect max_files limit after applying exclusions', () => {
      fc.assert(
        fc.property(
          fc.array(reviewableFilePathArbitrary(), { minLength: 5, maxLength: 30 }),
          fc.array(nonReviewableFilePathArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1, max: 20 }),
          (reviewablePaths, nonReviewablePaths, maxFiles) => {
            const allPaths = [...reviewablePaths, ...nonReviewablePaths];
            const files = allPaths.map(path => createMockFile(path));
            const result = FileFilter.filter(files, maxFiles);

            // Property: Result should be at most maxFiles
            expect(result.length).toBeLessThanOrEqual(maxFiles);

            // Property: Result should only contain reviewable files
            for (const file of result) {
              expect(reviewablePaths).toContain(file.path);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent ordering with same inputs', () => {
      fc.assert(
        fc.property(
          fc.array(reviewableFilePathArbitrary(), { minLength: 5, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (paths, maxFiles) => {
            const files = paths.map(path => createMockFile(path));
            
            // Run filter twice with same inputs
            const result1 = FileFilter.filter(files, maxFiles);
            const result2 = FileFilter.filter(files, maxFiles);

            // Property: Results should be identical
            expect(result1.map(f => f.path)).toEqual(result2.map(f => f.path));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle max_files of 0 as no limit', () => {
      fc.assert(
        fc.property(
          fc.array(reviewableFilePathArbitrary(), { minLength: 1, maxLength: 20 }),
          (paths) => {
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files, 0);

            // Property: Should return all reviewable files when max_files is 0
            expect(result.length).toBe(paths.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property: Exclusions and limits work together correctly
   */
  describe('Combined Properties', () => {
    it('should apply all exclusion rules before max_files limit', () => {
      fc.assert(
        fc.property(
          fc.array(filePathArbitrary(), { minLength: 10, maxLength: 30 }),
          fc.integer({ min: 1, max: 15 }),
          (paths, maxFiles) => {
            const files = paths.map(path => createMockFile(path));
            const result = FileFilter.filter(files, maxFiles);

            // Property: No excluded files should be in result
            for (const file of result) {
              expect(file.path).not.toContain('.generated.');
              expect(file.path).not.toContain('__snapshots__');
              expect(file.path).not.toMatch(/\.min\.(js|css)$/);
              expect(file.path).not.toMatch(/\/(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/);
            }

            // Property: Result should respect max_files limit
            expect(result.length).toBeLessThanOrEqual(maxFiles);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Helper function to create a mock DiffFile
 */
function createMockFile(path: string): DiffFile {
  return {
    path,
    status: 'modified',
    additions: 10,
    deletions: 5,
    patch: 'mock patch',
    hunks: [],
  };
}

/**
 * Generate any file path (may or may not be reviewable)
 */
function filePathArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    reviewableFilePathArbitrary(),
    nonReviewableFilePathArbitrary()
  );
}

/**
 * Generate reviewable file paths (no exclusion patterns)
 */
function reviewableFilePathArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Simple source files
    fc.record({
      dir: fc.constantFrom('src', 'lib', 'app', 'components', 'utils'),
      file: fc.stringMatching(/^[a-z]+$/),
      ext: fc.constantFrom('ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs'),
    }).map(({ dir, file, ext }) => `${dir}/${file}.${ext}`),
    
    // Nested source files
    fc.record({
      dir1: fc.constantFrom('src', 'lib', 'app'),
      dir2: fc.constantFrom('components', 'utils', 'services', 'models'),
      file: fc.stringMatching(/^[a-z]+$/),
      ext: fc.constantFrom('ts', 'tsx', 'js', 'jsx'),
    }).map(({ dir1, dir2, file, ext }) => `${dir1}/${dir2}/${file}.${ext}`),
    
    // Config files
    fc.record({
      file: fc.constantFrom('package', 'tsconfig', 'jest.config', 'webpack.config'),
      ext: fc.constantFrom('json', 'js', 'ts'),
    }).map(({ file, ext }) => `${file}.${ext}`),
    
    // Documentation
    fc.constantFrom('README.md', 'CONTRIBUTING.md', 'docs/guide.md'),
  );
}

/**
 * Generate non-reviewable file paths (with exclusion patterns)
 */
function nonReviewableFilePathArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Lockfiles
    fc.constantFrom('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'),
    fc.record({
      dir: fc.stringMatching(/^[a-z]+$/),
      lockfile: fc.constantFrom('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'),
    }).map(({ dir, lockfile }) => `${dir}/${lockfile}`),
    
    // Generated files
    fc.record({
      dir: fc.constantFrom('src', 'lib', 'build'),
      file: fc.stringMatching(/^[a-z]+$/),
      ext: fc.constantFrom('ts', 'js', 'd.ts'),
    }).map(({ dir, file, ext }) => `${dir}/${file}.generated.${ext}`),
    
    // Snapshot files
    fc.record({
      dir: fc.constantFrom('src/__tests__', 'tests', '__tests__'),
      file: fc.stringMatching(/^[a-z]+$/),
    }).map(({ dir, file }) => `${dir}/__snapshots__/${file}.snap`),
    
    // Minified files
    fc.record({
      dir: fc.constantFrom('dist', 'build', 'public'),
      file: fc.stringMatching(/^[a-z]+$/),
      ext: fc.constantFrom('js', 'css'),
    }).map(({ dir, file, ext }) => `${dir}/${file}.min.${ext}`),
  );
}
