import { describe, it, expect } from '@jest/globals';
import { CodeCityBuilderWithGrid } from './CodeCityBuilderWithGrid';
import { FileTree, DirectoryInfo, FileInfo } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';

describe('CodeCityBuilderWithGrid', () => {
  const createMockFileTree = (): FileTree => ({
    root: {
      name: 'root',
      path: '',
      relativePath: '',
      children: [
        {
          name: 'src',
          path: 'src',
          relativePath: 'src',
          children: [
            {
              name: 'index.ts',
              path: 'src/index.ts',
              relativePath: 'src/index.ts',
              size: 1000,
              extension: 'ts',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
            {
              name: 'components',
              path: 'src/components',
              relativePath: 'src/components',
              children: [
                {
                  name: 'Button.tsx',
                  path: 'src/components/Button.tsx',
                  relativePath: 'src/components/Button.tsx',
                  size: 500,
                  extension: 'tsx',
                  lastModified: new Date(),
                  isDirectory: false,
                } as FileInfo,
                {
                  name: 'Modal.tsx',
                  path: 'src/components/Modal.tsx',
                  relativePath: 'src/components/Modal.tsx',
                  size: 800,
                  extension: 'tsx',
                  lastModified: new Date(),
                  isDirectory: false,
                } as FileInfo,
              ],
              fileCount: 2,
              totalSize: 1300,
              depth: 2,
            } as DirectoryInfo,
          ],
          fileCount: 3,
          totalSize: 2300,
          depth: 1,
        } as DirectoryInfo,
        {
          name: 'tests',
          path: 'tests',
          relativePath: 'tests',
          children: [
            {
              name: 'index.test.ts',
              path: 'tests/index.test.ts',
              relativePath: 'tests/index.test.ts',
              size: 600,
              extension: 'ts',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
          ],
          fileCount: 1,
          totalSize: 600,
          depth: 1,
        } as DirectoryInfo,
      ],
      fileCount: 4,
      totalSize: 2900,
      depth: 0,
    } as DirectoryInfo,
    stats: {
      totalFiles: 4,
      totalDirectories: 3,
      totalSize: 2900,
      maxDepth: 2,
    },
    allFiles: [],
    allDirectories: [],
    sha: 'test-sha',
    metadata: {
      id: 'test-tree',
      timestamp: new Date(),
      sourceType: 'test',
      sourceInfo: {},
    },
  });

  describe('buildCityFromFileSystem', () => {
    it('should build city without grid layout', () => {
      const builder = new CodeCityBuilderWithGrid();
      const fileTree = createMockFileTree();
      const city = builder.buildCityFromFileSystem(fileTree);

      expect(city).toBeDefined();
      expect(city.buildings).toHaveLength(4); // 4 files
      expect(city.districts).toHaveLength(3); // root, src, src/components
      expect(city.metadata).toBeDefined();
    });

    it('should build city with grid layout', () => {
      const gridConfig: CodebaseView = {
        id: 'test-grid',
        version: '1.0',
        name: 'Test Grid',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          'Source': {
            files: ['src'],
            coordinates: [0, 0],
          },
          'Tests': {
            files: ['tests'],
            coordinates: [0, 1],
          },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 1,
            cols: 2,
          },
        },
      };

      const builder = new CodeCityBuilderWithGrid();
      const fileTree = createMockFileTree();
      const city = builder.buildCityFromFileSystem(fileTree, '', { gridLayout: gridConfig });

      expect(city).toBeDefined();
      expect(city.buildings).toHaveLength(4); // All files should be present
      expect(city.districts).toBeDefined();

      // Check for grid cell districts
      const gridCells = city.districts.filter(d => d.path.startsWith('grid-cell-'));
      expect(gridCells.length).toBeGreaterThan(0);

      // Check that grid cells have labels
      const sourceCell = city.districts.find(d => d.label === 'Source');
      const testsCell = city.districts.find(d => d.label === 'Tests');
      expect(sourceCell).toBeDefined();
      expect(testsCell).toBeDefined();
    });

    it('should handle empty file tree', () => {
      const emptyTree: FileTree = {
        root: {
          name: 'root',
          path: '',
          relativePath: '',
          children: [],
          fileCount: 0,
          totalSize: 0,
          depth: 0,
        },
        stats: {
          totalFiles: 0,
          totalDirectories: 1,
          totalSize: 0,
          maxDepth: 0,
        },
        allFiles: [],
        allDirectories: [],
        sha: '',
        metadata: {
          id: 'empty-tree',
          timestamp: new Date(),
          sourceType: 'test',
          sourceInfo: {},
        },
      };

      const builder = new CodeCityBuilderWithGrid();
      const city = builder.buildCityFromFileSystem(emptyTree);

      expect(city).toBeDefined();
      expect(city.buildings).toHaveLength(0);
      expect(city.districts).toHaveLength(1); // Just root
    });

    it('should preserve file hierarchy in city structure', () => {
      const builder = new CodeCityBuilderWithGrid();
      const fileTree = createMockFileTree();
      const city = builder.buildCityFromFileSystem(fileTree);

      // Check that src/index.ts is at the correct position
      const indexFile = city.buildings.find(b => b.path === 'src/index.ts');
      expect(indexFile).toBeDefined();
      expect(indexFile?.name).toBe('index.ts');

      // Check that src/components files are nested correctly
      const buttonFile = city.buildings.find(b => b.path === 'src/components/Button.tsx');
      expect(buttonFile).toBeDefined();
      expect(buttonFile?.name).toBe('Button.tsx');

      // Check district hierarchy
      const srcDistrict = city.districts.find(d => d.path === 'src');
      const componentsDistrict = city.districts.find(d => d.path === 'src/components');
      expect(srcDistrict).toBeDefined();
      expect(componentsDistrict).toBeDefined();
    });

    it('should calculate correct bounds for city', () => {
      const builder = new CodeCityBuilderWithGrid();
      const fileTree = createMockFileTree();
      const city = builder.buildCityFromFileSystem(fileTree);

      expect(city.bounds).toBeDefined();
      expect(city.bounds.minX).toBeDefined();
      expect(city.bounds.minY).toBeDefined();
      expect(city.bounds.maxX).toBeGreaterThan(city.bounds.minX);
      expect(city.bounds.maxY).toBeGreaterThan(city.bounds.minY);
    });

    it('should assign files to correct grid cells', () => {
      const gridConfig: CodebaseView = {
        id: 'test-grid',
        version: '1.0',
        name: 'Test Grid',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          'Source': {
            files: ['src/components'],
            coordinates: [0, 0],
          },
          'Core': {
            files: ['src/index.ts'],
            coordinates: [0, 1],
          },
          'Tests': {
            files: ['tests'],
            coordinates: [1, 0],
          },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 2,
            cols: 2,
          },
        },
      };

      const builder = new CodeCityBuilderWithGrid();
      const fileTree = createMockFileTree();
      const city = builder.buildCityFromFileSystem(fileTree, '', { gridLayout: gridConfig });

      // Find the grid cells
      const sourceCell = city.districts.find(d => d.label === 'Source');
      const coreCell = city.districts.find(d => d.label === 'Core');
      const testsCell = city.districts.find(d => d.label === 'Tests');

      expect(sourceCell).toBeDefined();
      expect(coreCell).toBeDefined();
      expect(testsCell).toBeDefined();

      // Check that files are in the right cells based on their positions
      const buttonFile = city.buildings.find(b => b.path === 'src/components/Button.tsx');
      const indexFile = city.buildings.find(b => b.path === 'src/index.ts');
      const testFile = city.buildings.find(b => b.path === 'tests/index.test.ts');

      expect(buttonFile).toBeDefined();
      expect(indexFile).toBeDefined();
      expect(testFile).toBeDefined();

      // Files should be positioned within their respective cell bounds
      if (sourceCell && buttonFile) {
        expect(buttonFile.x).toBeGreaterThanOrEqual(sourceCell.x);
        expect(buttonFile.x).toBeLessThanOrEqual(sourceCell.x + sourceCell.width);
        expect(buttonFile.y).toBeGreaterThanOrEqual(sourceCell.y);
        expect(buttonFile.y).toBeLessThanOrEqual(sourceCell.y + sourceCell.height);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle file tree with only files (no subdirectories)', () => {
      const flatTree: FileTree = {
        root: {
          name: 'root',
          path: '',
          relativePath: '',
          children: [
            {
              name: 'file1.js',
              path: 'file1.js',
              relativePath: 'file1.js',
              size: 100,
              extension: 'js',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
            {
              name: 'file2.js',
              path: 'file2.js',
              relativePath: 'file2.js',
              size: 200,
              extension: 'js',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
          ],
          fileCount: 2,
          totalSize: 300,
          depth: 0,
        },
        stats: {
          totalFiles: 2,
          totalDirectories: 1,
          totalSize: 300,
          maxDepth: 1,
        },
        allFiles: [],
        allDirectories: [],
        sha: '',
        metadata: {
          id: 'flat-tree',
          timestamp: new Date(),
          sourceType: 'test',
          sourceInfo: {},
        },
      };

      const builder = new CodeCityBuilderWithGrid();
      const city = builder.buildCityFromFileSystem(flatTree);

      expect(city.buildings).toHaveLength(2);
      expect(city.districts).toHaveLength(1); // Just root
    });

    it('should handle deeply nested directory structure', () => {
      const deepTree: FileTree = {
        root: {
          name: 'root',
          path: '',
          relativePath: '',
          children: [
            {
              name: 'a',
              path: 'a',
              relativePath: 'a',
              children: [
                {
                  name: 'b',
                  path: 'a/b',
                  relativePath: 'a/b',
                  children: [
                    {
                      name: 'c',
                      path: 'a/b/c',
                      relativePath: 'a/b/c',
                      children: [
                        {
                          name: 'deep.txt',
                          path: 'a/b/c/deep.txt',
                          relativePath: 'a/b/c/deep.txt',
                          size: 50,
                          extension: 'txt',
                          lastModified: new Date(),
                          isDirectory: false,
                        } as FileInfo,
                      ],
                      fileCount: 1,
                      totalSize: 50,
                      depth: 3,
                    } as DirectoryInfo,
                  ],
                  fileCount: 1,
                  totalSize: 50,
                  depth: 2,
                } as DirectoryInfo,
              ],
              fileCount: 1,
              totalSize: 50,
              depth: 1,
            } as DirectoryInfo,
          ],
          fileCount: 1,
          totalSize: 50,
          depth: 0,
        },
        stats: {
          totalFiles: 1,
          totalDirectories: 4,
          totalSize: 50,
          maxDepth: 4,
        },
        allFiles: [],
        allDirectories: [],
        sha: '',
        metadata: {
          id: 'deep-tree',
          timestamp: new Date(),
          sourceType: 'test',
          sourceInfo: {},
        },
      };

      const builder = new CodeCityBuilderWithGrid();
      const city = builder.buildCityFromFileSystem(deepTree);

      expect(city.buildings).toHaveLength(1);
      expect(city.districts.length).toBeGreaterThanOrEqual(4); // At least root, a, a/b, a/b/c
    });
  });
});