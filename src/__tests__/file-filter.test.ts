/**
 * Unit tests for FileFilter
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { FileFilter } from '../file-filter';
import { DiffFile } from '../types';

describe('FileFilter', () => {
  // Helper function to create a mock DiffFile
  const createMockFile = (path: string): DiffFile => ({
    path,
    status: 'modified',
    additions: 10,
    deletions: 5,
    patch: 'mock patch',
    hunks: [],
  });

  describe('filter()', () => {
    it('should return all files when no exclusions apply', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils.ts'),
        createMockFile('README.md'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(3);
      expect(result).toEqual(files);
    });

    it('should exclude package-lock.json', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('package-lock.json'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('should exclude yarn.lock', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('yarn.lock'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('should exclude pnpm-lock.yaml', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('pnpm-lock.yaml'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('should exclude lockfiles in subdirectories', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('packages/app/package-lock.json'),
        createMockFile('packages/lib/yarn.lock'),
        createMockFile('monorepo/pnpm-lock.yaml'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should exclude generated files with .generated. in filename', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/api.generated.ts'),
        createMockFile('src/types.generated.d.ts'),
        createMockFile('build/output.generated.js'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should exclude files in __snapshots__ directories', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/__tests__/__snapshots__/test.snap'),
        createMockFile('tests/__snapshots__/component.snap'),
        createMockFile('__snapshots__/global.snap'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should exclude minified JavaScript files', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('dist/bundle.min.js'),
        createMockFile('public/vendor.min.js'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should exclude minified CSS files', () => {
      const files = [
        createMockFile('src/styles.css'),
        createMockFile('dist/styles.min.css'),
        createMockFile('public/theme.min.css'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/styles.css');
    });

    it('should exclude all types of non-reviewable files', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('package-lock.json'),
        createMockFile('src/api.generated.ts'),
        createMockFile('__snapshots__/test.snap'),
        createMockFile('dist/bundle.min.js'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files);

      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).toEqual(['src/index.ts', 'src/utils.ts']);
    });

    it('should apply max_files limit when specified', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils.ts'),
        createMockFile('src/api.ts'),
        createMockFile('src/types.ts'),
        createMockFile('src/config.ts'),
      ];

      const result = FileFilter.filter(files, 3);

      expect(result).toHaveLength(3);
    });

    it('should not apply limit when max_files is undefined', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils.ts'),
        createMockFile('src/api.ts'),
      ];

      const result = FileFilter.filter(files, undefined);

      expect(result).toHaveLength(3);
    });

    it('should not apply limit when max_files is 0', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils.ts'),
        createMockFile('src/api.ts'),
      ];

      const result = FileFilter.filter(files, 0);

      expect(result).toHaveLength(3);
    });

    it('should prioritize source code files over config files', () => {
      const files = [
        createMockFile('README.md'),
        createMockFile('config.json'),
        createMockFile('src/index.ts'),
        createMockFile('package.json'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files, 3);

      // Should prioritize .ts files over .json and .md
      expect(result).toHaveLength(3);
      expect(result.map(f => f.path)).toContain('src/index.ts');
      expect(result.map(f => f.path)).toContain('src/utils.ts');
    });

    it('should handle empty file list', () => {
      const result = FileFilter.filter([]);

      expect(result).toHaveLength(0);
    });

    it('should handle max_files larger than file count', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('src/utils.ts'),
      ];

      const result = FileFilter.filter(files, 10);

      expect(result).toHaveLength(2);
    });

    it('should apply exclusions before max_files limit', () => {
      const files = [
        createMockFile('src/index.ts'),
        createMockFile('package-lock.json'),
        createMockFile('src/utils.ts'),
        createMockFile('dist/bundle.min.js'),
        createMockFile('src/api.ts'),
      ];

      const result = FileFilter.filter(files, 2);

      // Should exclude lockfile and minified file first, then limit to 2
      expect(result).toHaveLength(2);
      expect(result.map(f => f.path)).not.toContain('package-lock.json');
      expect(result.map(f => f.path)).not.toContain('dist/bundle.min.js');
    });

    it('should maintain stable ordering when prioritizing files', () => {
      const files = [
        createMockFile('src/b.ts'),
        createMockFile('src/a.ts'),
        createMockFile('src/c.ts'),
      ];

      const result1 = FileFilter.filter(files, 2);
      const result2 = FileFilter.filter(files, 2);

      // Results should be consistent across multiple calls
      expect(result1.map(f => f.path)).toEqual(result2.map(f => f.path));
    });
  });
});
