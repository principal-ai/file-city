import { mock, describe, it, expect, beforeEach } from 'bun:test';
import { FileTree } from '@principal-ai/repository-abstraction';
import { CityData } from './types/cityData';
import { CodebaseView } from './types/codebaseView';

// Mock function to return predictable city data
const mockBuildCityFromFileSystem = (
  _fileTree: FileTree,
  _rootPath: string,
  options?: { gridLayout?: CodebaseView },
) => {
  const hasGrid = options?.gridLayout?.referenceGroups;
  const gridConfig = options?.gridLayout?.metadata?.ui;

  // Return city data with grid labels if grid is enabled
  const districts = [
    {
      path: '',
      worldBounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
      fileCount: 1,
      type: 'directory' as const,
      ...(hasGrid &&
        gridConfig?.showCellLabels !== false && {
          label: {
            text: 'Cell A',
            bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 20 },
            position: gridConfig?.cellLabelPosition || 'top',
          },
        }),
    },
    {
      path: 'src',
      worldBounds: { minX: 10, maxX: 90, minZ: 10, maxZ: 90 },
      fileCount: 2,
      type: 'directory' as const,
      ...(hasGrid &&
        gridConfig?.showCellLabels !== false && {
          label: {
            text: 'Cell B',
            bounds: { minX: 10, maxX: 90, minZ: 10, maxZ: 30 },
            position: gridConfig?.cellLabelPosition || 'top',
          },
        }),
    },
  ];

  return {
    buildings: [
      {
        path: 'test.js',
        position: { x: 50, y: 5, z: 50 },
        dimensions: [10, 10, 10] as [number, number, number],
        type: 'file' as const,
      },
      {
        path: 'src/index.js',
        position: { x: 30, y: 5, z: 30 },
        dimensions: [8, 8, 8] as [number, number, number],
        type: 'file' as const,
      },
      {
        path: 'src/utils.js',
        position: { x: 70, y: 5, z: 70 },
        dimensions: [8, 8, 8] as [number, number, number],
        type: 'file' as const,
      },
    ],
    districts,
    bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
    metadata: {
      totalFiles: 3,
      totalDirectories: 2,
      analyzedAt: new Date(),
      rootPath: '',
      layoutConfig: {
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        paddingInner: 0,
        paddingOuter: 0,
      },
    },
  };
};

// Mock the module using Bun's mock API
mock.module('./CodeCityBuilderWithGrid', () => ({
  CodeCityBuilderWithGrid: class {
    buildCityFromFileSystem = mockBuildCityFromFileSystem;
  },
}));

// Import after mocking
import { MultiVersionCityBuilder } from './MultiVersionCityBuilder';

describe('MultiVersionCityBuilder', () => {
  const createMockFileTree = (files: string[] = ['test.js']): FileTree => {
    const allFiles = files.map(path => ({
      path,
      name: path.split('/').pop() || path,
      size: 100,
      extension: '.js',
      relativePath: path,
    }));

    return {
      sha: 'test-sha',
      root: {
        path: '',
        name: 'root',
        children: allFiles as any,
        fileCount: allFiles.length,
        totalSize: 100 * allFiles.length,
        depth: 0,
        relativePath: '',
      } as any,
      allFiles: allFiles as any,
      allDirectories: [
        {
          path: '',
          name: 'root',
          children: [],
          fileCount: allFiles.length,
          totalSize: 100 * allFiles.length,
          depth: 0,
          relativePath: '',
        } as any,
      ],
      stats: {
        totalFiles: allFiles.length,
        totalDirectories: 1,
        totalSize: 100 * allFiles.length,
        maxDepth: 0,
        buildingTypeDistribution: {},
        directoryTypeDistribution: {},
        combinedTypeDistribution: {},
      },
    } as any;
  };

  describe('build', () => {
    it('should build a union city from multiple file trees', () => {
      const tree1 = createMockFileTree(['test.js', 'src/index.js']);
      const tree2 = createMockFileTree(['test.js', 'src/index.js', 'src/utils.js']);

      const versionTrees = new Map([
        ['version1', tree1],
        ['version2', tree2],
      ]);

      const result = MultiVersionCityBuilder.build(versionTrees);

      expect(result).toHaveProperty('unionCity');
      expect(result).toHaveProperty('presenceByVersion');
      expect(result.unionCity.buildings).toHaveLength(3);
      expect(result.unionCity.districts).toHaveLength(2);
    });

    it('should preserve grid labels when grid layout is enabled', () => {
      const tree = createMockFileTree(['test.js', 'src/index.js', 'src/utils.js']);
      const versionTrees = new Map([['main', tree]]);

      const gridConfig: CodebaseView = {
        id: 'test-grid',
        version: '1.0',
        name: 'Test Grid',
        description: 'Test grid configuration',
        overviewPath: '',
        category: 'default',
        displayOrder: 0,
        referenceGroups: {
          test: {
            coordinates: [0, 0],
            files: ['test.js'],
            priority: 1,
          },
          src: {
            coordinates: [0, 1],
            files: ['src/index.js', 'src/utils.js'],
            priority: 2,
          },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 2,
            cols: 2,
            showCellLabels: true,
            cellLabelPosition: 'top',
          },
        },
      };

      const result = MultiVersionCityBuilder.build(versionTrees, { gridLayout: gridConfig });

      // Check that districts have labels
      expect(result.unionCity.districts[0]).toHaveProperty('label');
      expect(result.unionCity.districts[0].label).toEqual({
        text: 'Cell A',
        bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 20 },
        position: 'top',
      });

      expect(result.unionCity.districts[1]).toHaveProperty('label');
      expect(result.unionCity.districts[1].label).toEqual({
        text: 'Cell B',
        bounds: { minX: 10, maxX: 90, minZ: 10, maxZ: 30 },
        position: 'top',
      });
    });

    it('should work without grid layout configuration', () => {
      const tree = createMockFileTree(['test.js']);
      const versionTrees = new Map([['main', tree]]);

      const result = MultiVersionCityBuilder.build(versionTrees);

      expect(result.unionCity.districts[0]).not.toHaveProperty('label');
      expect(result.unionCity.districts[1]).not.toHaveProperty('label');
    });

    it('should build correct presence sets for each version', () => {
      const tree1 = createMockFileTree(['test.js', 'src/index.js']);
      const tree2 = createMockFileTree(['test.js', 'src/index.js', 'src/utils.js']);

      const versionTrees = new Map([
        ['version1', tree1],
        ['version2', tree2],
      ]);

      const result = MultiVersionCityBuilder.build(versionTrees);

      const presence1 = result.presenceByVersion.get('version1');
      const presence2 = result.presenceByVersion.get('version2');

      expect(presence1).toBeDefined();
      expect(presence2).toBeDefined();
      expect(presence1?.has('test.js')).toBe(true);
      expect(presence1?.has('src/index.js')).toBe(true);
      expect(presence1?.has('src/utils.js')).toBe(false);

      expect(presence2?.has('test.js')).toBe(true);
      expect(presence2?.has('src/index.js')).toBe(true);
      expect(presence2?.has('src/utils.js')).toBe(true);
    });
  });

  describe('getVersionView', () => {
    let unionCity: CityData;

    beforeEach(() => {
      const tree = createMockFileTree(['test.js', 'src/index.js', 'src/utils.js']);
      const versionTrees = new Map([['main', tree]]);

      const gridConfig: CodebaseView = {
        id: 'test-grid',
        version: '1.0',
        name: 'Test Grid',
        description: 'Test grid configuration',
        overviewPath: '',
        category: 'default',
        displayOrder: 0,
        referenceGroups: {
          test: { coordinates: [0, 0], files: ['test.js'], priority: 1 },
          src: { coordinates: [0, 1], files: ['src/index.js', 'src/utils.js'], priority: 2 },
        },
        metadata: {
          ui: {
            enabled: true,
            rows: 2,
            cols: 2,
            showCellLabels: true,
            cellLabelPosition: 'bottom',
          },
        },
      };

      const result = MultiVersionCityBuilder.build(versionTrees, { gridLayout: gridConfig });
      unionCity = result.unionCity;
    });

    it('should filter buildings based on presence set', () => {
      const presentFiles = new Set(['test.js', 'src/index.js']);

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles);

      expect(versionView.buildings).toHaveLength(2);
      expect(versionView.buildings.map(b => b.path)).toEqual(['test.js', 'src/index.js']);
    });

    it('should preserve grid labels in filtered view', () => {
      const presentFiles = new Set(['test.js', 'src/index.js']);

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles);

      // Labels should be preserved
      expect(versionView.districts[0]).toHaveProperty('label');
      expect(versionView.districts[0].label).toEqual({
        text: 'Cell A',
        bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 20 },
        position: 'bottom',
      });

      expect(versionView.districts[1]).toHaveProperty('label');
      expect(versionView.districts[1].label).toEqual({
        text: 'Cell B',
        bounds: { minX: 10, maxX: 90, minZ: 10, maxZ: 30 },
        position: 'bottom',
      });
    });

    it('should update file counts correctly', () => {
      const presentFiles = new Set(['src/index.js']); // Only one file in src

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles);

      // Root district should have 0 files (test.js is not present)
      expect(versionView.districts[0].fileCount).toBe(0);
      // src district should have 1 file
      expect(versionView.districts[1].fileCount).toBe(1);
    });

    it('should filter districts without files except root', () => {
      const presentFiles = new Set(['test.js']); // No files in src

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles);

      // Root should always be included
      expect(versionView.districts.find(d => d.path === '')).toBeDefined();
      // src should be filtered out since it has no files
      expect(versionView.districts.find(d => d.path === 'src')).toBeUndefined();
    });

    it('should handle filterPrefix option', () => {
      const presentFiles = new Set(['test.js', 'src/index.js', 'src/utils.js']);

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles, {
        filterPrefix: 'src',
      });

      // Should only include files and districts starting with 'src'
      expect(versionView.buildings).toHaveLength(2);
      expect(versionView.buildings.every(b => b.path.startsWith('src'))).toBe(true);
      expect(versionView.districts).toHaveLength(1);
      expect(versionView.districts[0].path).toBe('src');
    });

    it('should preserve all metadata in filtered view', () => {
      const presentFiles = new Set(['test.js']);

      const versionView = MultiVersionCityBuilder.getVersionView(unionCity, presentFiles);

      // Check that bounds are preserved
      expect(versionView.bounds).toEqual(unionCity.bounds);

      // Check that metadata is updated correctly
      expect(versionView.metadata.totalFiles).toBe(1);
      expect(versionView.metadata.totalDirectories).toBe(1);
      expect(versionView.metadata.rootPath).toBe(unionCity.metadata.rootPath);
      expect(unionCity.metadata.layoutConfig).toBeDefined();
      expect(versionView.metadata.layoutConfig).toEqual(unionCity.metadata.layoutConfig);
    });
  });
});
