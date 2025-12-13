import { describe, it, expect } from '@jest/globals';
import { GridLayoutManager } from './GridLayoutManager';
import { FileTree, DirectoryInfo, FileInfo } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@principal-ai/alexandria-core-library';

describe('GridLayoutManager', () => {
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
              name: 'utils.ts',
              path: 'src/utils.ts',
              relativePath: 'src/utils.ts',
              size: 500,
              extension: 'ts',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
          ],
          fileCount: 2,
          totalSize: 1500,
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
              size: 800,
              extension: 'ts',
              lastModified: new Date(),
              isDirectory: false,
            } as FileInfo,
          ],
          fileCount: 1,
          totalSize: 800,
          depth: 1,
        } as DirectoryInfo,
        {
          name: 'package.json',
          path: 'package.json',
          relativePath: 'package.json',
          size: 300,
          extension: 'json',
          lastModified: new Date(),
          isDirectory: false,
        } as FileInfo,
      ],
      fileCount: 4,
      totalSize: 2600,
      depth: 0,
    } as DirectoryInfo,
    stats: {
      totalFiles: 4,
      totalDirectories: 3,
      totalSize: 2600,
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

  describe('getGridDimensions', () => {
    it('should return dimensions from UI metadata when specified', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {},
        metadata: {
          ui: {
            enabled: true,
            rows: 2,
            cols: 3,
          },
        },
      };

      const manager = new GridLayoutManager();
      const dimensions = manager.getGridDimensions(config);

      expect(dimensions).toEqual({ rows: 2, cols: 3 });
    });

    it('should compute dimensions from cell coordinates when not specified', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          cell1: {
            files: ['src'],
            coordinates: [0, 0],
          },
          cell2: {
            files: ['tests'],
            coordinates: [1, 2],
          },
        },
        metadata: {},
      };

      const manager = new GridLayoutManager();
      const dimensions = manager.getGridDimensions(config);

      expect(dimensions).toEqual({ rows: 2, cols: 3 });
    });
  });

  describe('splitTreeIntoGrid', () => {
    it('should create empty trees for all grid positions', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {},
        metadata: {
          ui: {
            enabled: true,
            rows: 2,
            cols: 2,
          },
        },
      };

      const manager = new GridLayoutManager();
      const fileTree = createMockFileTree();
      const result = manager.splitTreeIntoGrid(fileTree, config);

      expect(result.size).toBe(4); // 2x2 grid
      expect(result.has('0,0')).toBe(true);
      expect(result.has('0,1')).toBe(true);
      expect(result.has('1,0')).toBe(true);
      expect(result.has('1,1')).toBe(true);
    });

    it('should assign directories to cells based on exact path match', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          'Source Code': {
            files: ['src'],
            coordinates: [0, 0],
          },
          Tests: {
            files: ['tests'],
            coordinates: [0, 1],
          },
          Config: {
            files: ['package.json'],
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

      const manager = new GridLayoutManager();
      const fileTree = createMockFileTree();
      const result = manager.splitTreeIntoGrid(fileTree, config);

      // Check Source Code cell (0,0)
      const srcCell = result.get('0,0');
      expect(srcCell).toBeDefined();
      if (!srcCell) throw new Error('srcCell should be defined');
      expect(srcCell.root.children.length).toBe(1);
      expect(srcCell.root.children[0].name).toBe('src');

      // Check Tests cell (0,1)
      const testCell = result.get('0,1');
      expect(testCell).toBeDefined();
      if (!testCell) throw new Error('testCell should be defined');
      expect(testCell.root.children.length).toBe(1);
      expect(testCell.root.children[0].name).toBe('tests');

      // Check Config cell (1,0)
      const configCell = result.get('1,0');
      expect(configCell).toBeDefined();
      if (!configCell) throw new Error('configCell should be defined');
      expect(configCell.root.children.length).toBe(1);
      expect(configCell.root.children[0].name).toBe('package.json');

      // Check empty cell (1,1)
      const emptyCell = result.get('1,1');
      expect(emptyCell).toBeDefined();
      if (!emptyCell) throw new Error('emptyCell should be defined');
      expect(emptyCell.root.children.length).toBe(0);
    });

    it('should respect cell priority when files could match multiple cells', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          'High Priority': {
            files: ['src'],
            coordinates: [0, 0],
            priority: 10,
          },
          'Low Priority': {
            files: ['src'],
            coordinates: [0, 1],
            priority: 1,
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

      const manager = new GridLayoutManager();
      const fileTree = createMockFileTree();
      const result = manager.splitTreeIntoGrid(fileTree, config);

      // High priority cell should get the src directory
      const highPriorityCell = result.get('0,0');
      if (!highPriorityCell) throw new Error('highPriorityCell should be defined');
      expect(highPriorityCell.root.children.length).toBe(1);
      expect(highPriorityCell.root.children[0].name).toBe('src');

      // Low priority cell should be empty
      const lowPriorityCell = result.get('0,1');
      if (!lowPriorityCell) throw new Error('lowPriorityCell should be defined');
      expect(lowPriorityCell.root.children.length).toBe(0);
    });

    it('should include all descendants when a directory is assigned', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          Source: {
            files: ['src'],
            coordinates: [0, 0],
          },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 1,
            cols: 1,
          },
        },
      };

      const manager = new GridLayoutManager();
      const fileTree = createMockFileTree();
      const result = manager.splitTreeIntoGrid(fileTree, config);

      const cell = result.get('0,0');
      expect(cell).toBeDefined();
      if (!cell) throw new Error('cell should be defined');

      // Should have the src directory
      expect(cell.root.children.length).toBe(1);
      const srcDir = cell.root.children[0] as DirectoryInfo;
      expect(srcDir.name).toBe('src');

      // Should include all files within src
      expect(srcDir.children).toBeDefined();
      if (!srcDir.children) throw new Error('srcDir.children should be defined');
      expect(srcDir.children.length).toBe(2);
      expect(srcDir.children[0].name).toBe('index.ts');
      expect(srcDir.children[1].name).toBe('utils.ts');
    });

    it('should update tree stats after splitting', () => {
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test View',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {
          Source: {
            files: ['src'],
            coordinates: [0, 0],
          },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 1,
            cols: 1,
          },
        },
      };

      const manager = new GridLayoutManager();
      const fileTree = createMockFileTree();
      const result = manager.splitTreeIntoGrid(fileTree, config);

      const cell = result.get('0,0');
      expect(cell).toBeDefined();
      if (!cell) throw new Error('cell should be defined');

      // Stats should be updated
      expect(cell.stats.totalFiles).toBe(2); // index.ts and utils.ts
      expect(cell.stats.totalDirectories).toBe(2); // cell-root and src
    });
  });

  describe('calculateCellBounds', () => {
    it('should calculate correct bounds for a cell without labels', () => {
      const manager = new GridLayoutManager();
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {},
        metadata: {
          ui: {
            enabled: true,
            showCellLabels: false,
          },
        },
      };

      const bounds = manager.calculateCellBounds(
        1000, // totalWidth
        800, // totalHeight
        0, // row
        1, // col
        2, // rows
        2, // cols
        10, // padding
        config,
      );

      expect(bounds.x).toBeGreaterThan(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.height).toBeGreaterThan(0);
      expect(bounds.labelBounds).toBeUndefined();
    });

    it('should include label bounds when labels are enabled', () => {
      const manager = new GridLayoutManager();
      const config: CodebaseView = {
        id: 'test',
        version: '1.0',
        name: 'Test',
        description: 'Test',
        overviewPath: '',
        category: 'test',
        displayOrder: 0,
        referenceGroups: {},
        metadata: {
          ui: {
            enabled: true,
            showCellLabels: true,
            cellLabelPosition: 'top',
          },
        },
      };

      const bounds = manager.calculateCellBounds(
        1000, // totalWidth
        800, // totalHeight
        0, // row
        0, // col
        1, // rows
        1, // cols
        10, // padding
        config,
      );

      expect(bounds.labelBounds).toBeDefined();
      if (!bounds.labelBounds) throw new Error('bounds.labelBounds should be defined');
      expect(bounds.labelBounds.height).toBeGreaterThan(0);
      expect(bounds.labelBounds.y).toBeLessThan(bounds.y); // Label is above content
    });
  });
});
