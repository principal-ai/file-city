import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
  CityData
} from '@principal-ai/code-city-builder';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';

// Type definitions needed for the story
interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: Date;
  isDirectory: boolean;
}

interface CodebaseView {
  id: string;
  version: string;
  name: string;
  description: string;
  overviewPath: string;
  cells: {
    [key: string]: {
      files: string[];
      coordinates: [number, number];
    };
  };
  metadata?: {
    ui?: {
      paddingTop?: number;
      paddingBottom?: number;
      paddingLeft?: number;
      paddingRight?: number;
      paddingInner?: number;
      paddingOuter?: number;
    };
  };
}

const meta = {
  title: 'Components/ArchitectureMapHighlightLayers/Grid Layout',
  component: ArchitectureMapHighlightLayers,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArchitectureMapHighlightLayers>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create city data with grid layout
function createGridLayoutCityData(config: CodebaseView, customFilePaths?: string[]): CityData {
  // Create a mock file tree with typical monorepo structure
  const filePaths = customFilePaths || [
    // Core source files
    'src/index.ts',
    'src/components/App.tsx',
    'src/components/Header.tsx',
    'src/utils/helpers.ts',
    'lib/core.ts',
    'lib/utils.ts',

    // Configuration
    '.a24z/config.json',
    '.principleMD/settings.json',
    'config/webpack.config.js',

    // Documentation
    'docs/README.md',
    'docs/API.md',
    'examples/basic.ts',
    'examples/advanced.ts',

    // Testing
    'tests/unit/app.test.ts',
    'tests/integration/api.test.ts',
    '__tests__/components.test.tsx',
    'test-utils/helpers.ts',

    // Build outputs
    'dist/bundle.js',
    'build/index.html',
    '.next/static/chunks/pages.js',

    // Dependencies
    'node_modules/react/index.js',
    'node_modules/typescript/lib/typescript.js',
    'packages/shared/index.ts',
    'packages/ui/components.tsx',

    // Assets
    'public/index.html',
    'public/favicon.ico',
    'static/logo.svg',
    'assets/styles.css',

    // Root files
    'package.json',
    'README.md',
    '.gitignore',
    'tsconfig.json',
  ];

  // Convert file paths to FileInfo objects
  const fileInfos: FileInfo[] = filePaths.map(path => ({
    name: path.split('/').pop() || path,
    path: path,
    relativePath: path,
    size: Math.random() * 10000, // Random size for demo
    extension: path.includes('.') ? '.' + path.split('.').pop()! : '',
    lastModified: new Date(),
    isDirectory: false,
  }));

  // Build a proper file tree with hierarchy
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos as any, 'demo-sha');
  const cityBuilder = new CodeCityBuilderWithGrid();

  // Use the new integrated grid layout builder with adaptive sizing
  // This allows the grid to calculate its own optimal dimensions
  return cityBuilder.buildCityFromFileSystem(fileTree, '', {
    gridLayout: config as any,
  });
}

// Minimal config - tests default UI metadata
export const DefaultsTest: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'defaults-test',
      version: '1.0.0',
      name: 'Test Default UI Settings',
      description: 'Tests default UI metadata settings when none are provided',
      overviewPath: 'README.md',
      cells: {
        Source: {
          files: ['src', 'lib'],
          coordinates: [0, 0],
        },
        Config: {
          files: ['config', '.*'],
          coordinates: [0, 1],
        },
        Tests: {
          files: ['test*', '__tests__'],
          coordinates: [1, 0],
        },
        Build: {
          files: ['dist', 'build', 'node_modules'],
          coordinates: [1, 1],
        },
      },
      // No metadata.ui provided - should use defaults
    }),
    showGrid: true,
    showFileNames: false,
    showDirectoryLabels: true,
    fullSize: true,
  },
};

// 2x2 Grid Layout with Labels
export const TwoByTwoGrid: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'two-by-two-grid',
      version: '1.0.0',
      name: 'Two by Two Grid Layout',
      description: 'A 2x2 grid layout organizing code into four quadrants',
      overviewPath: 'README.md',
      cells: {
        Source: {
          files: ['src', 'lib'],
          coordinates: [0, 0],
        },
        Configuration: {
          files: ['config', '.a24z', '.principleMD', 'tsconfig.json', 'package.json'],
          coordinates: [1, 0],
        },
        Testing: {
          files: ['tests', '__tests__', 'test-utils'],
          coordinates: [0, 1],
        },
        Documentation: {
          files: ['docs', 'examples', 'README.md'],
          coordinates: [1, 1],
        },
      },
      metadata: {
        ui: {
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 15,
          paddingRight: 15,
          paddingInner: 8,
          paddingOuter: 20,
        },
      },
    }),
    showGrid: true,
    showFileNames: false,
    showDirectoryLabels: true,
    fullSize: true,
  },
};

// 3x3 Grid Layout
export const ThreeByThreeGrid: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'three-by-three-grid',
      version: '1.0.0',
      name: 'Three by Three Grid Layout',
      description: 'A 3x3 grid layout for more granular organization',
      overviewPath: 'README.md',
      cells: {
        Source: {
          files: ['src'],
          coordinates: [0, 0],
        },
        Libraries: {
          files: ['lib'],
          coordinates: [1, 0],
        },
        Packages: {
          files: ['packages'],
          coordinates: [2, 0],
        },
        Tests: {
          files: ['tests', '__tests__'],
          coordinates: [0, 1],
        },
        Configuration: {
          files: ['config', '.*', 'tsconfig.json', 'package.json'],
          coordinates: [1, 1],
        },
        Documentation: {
          files: ['docs', 'README.md'],
          coordinates: [2, 1],
        },
        'Test Utils': {
          files: ['test-utils'],
          coordinates: [0, 2],
        },
        Build: {
          files: ['dist', 'build', '.next'],
          coordinates: [1, 2],
        },
        Assets: {
          files: ['public', 'static', 'assets'],
          coordinates: [2, 2],
        },
      },
    }),
    showGrid: true,
    fullSize: true,
  },
};

// Sparse Grid Layout (gaps in grid)
export const SparseGrid: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'sparse-grid',
      version: '1.0.0',
      name: 'Sparse Grid Layout',
      description: 'A grid with intentional gaps for visual organization',
      overviewPath: 'README.md',
      cells: {
        Source: {
          files: ['src', 'lib'],
          coordinates: [0, 0],
        },
        Tests: {
          files: ['tests', '__tests__', 'test-utils'],
          coordinates: [2, 0],
        },
        Documentation: {
          files: ['docs', 'examples', 'README.md'],
          coordinates: [0, 2],
        },
        Build: {
          files: ['dist', 'build', '.next', 'node_modules'],
          coordinates: [2, 2],
        },
      },
    }),
    showGrid: true,
    fullSize: true,
  },
};

// Custom colored grid with highlight layers
export const GridWithHighlights: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'grid-with-highlights',
      version: '1.0.0',
      name: 'Grid with Highlights',
      description: 'Grid layout with custom highlight layers',
      overviewPath: 'README.md',
      cells: {
        Source: {
          files: ['src', 'lib'],
          coordinates: [0, 0],
        },
        Tests: {
          files: ['tests', '__tests__'],
          coordinates: [1, 0],
        },
        Config: {
          files: ['config', '.*'],
          coordinates: [0, 1],
        },
        Build: {
          files: ['dist', 'build'],
          coordinates: [1, 1],
        },
      },
    }),
    highlightLayers: [
      {
        id: 'modified-files',
        name: 'Modified Files',
        enabled: true,
        color: '#3b82f6',
        priority: 1,
        items: [
          { path: 'src/components/App.tsx', type: 'file' },
          { path: 'src/utils/helpers.ts', type: 'file' },
        ],
      },
      {
        id: 'test-coverage',
        name: 'Test Coverage',
        enabled: true,
        color: '#10b981',
        priority: 2,
        items: [
          { path: 'tests', type: 'directory' },
        ],
      },
    ],
    showLayerControls: true,
    showGrid: true,
    fullSize: true,
  },
};

// Large grid (5x5)
export const LargeGrid: Story = {
  args: {
    cityData: createGridLayoutCityData({
      id: 'large-grid',
      version: '1.0.0',
      name: 'Large 5x5 Grid',
      description: 'A large grid for complex projects',
      overviewPath: 'README.md',
      cells: {
        'Core Source': { files: ['src/core'], coordinates: [0, 0] },
        'Components': { files: ['src/components'], coordinates: [1, 0] },
        'Utils': { files: ['src/utils'], coordinates: [2, 0] },
        'Hooks': { files: ['src/hooks'], coordinates: [3, 0] },
        'Types': { files: ['src/types'], coordinates: [4, 0] },

        'Unit Tests': { files: ['tests/unit'], coordinates: [0, 1] },
        'Integration': { files: ['tests/integration'], coordinates: [1, 1] },
        'E2E': { files: ['tests/e2e'], coordinates: [2, 1] },
        'Test Utils': { files: ['test-utils'], coordinates: [3, 1] },
        'Fixtures': { files: ['fixtures'], coordinates: [4, 1] },

        'Config': { files: ['config'], coordinates: [0, 2] },
        'Scripts': { files: ['scripts'], coordinates: [1, 2] },
        'Tools': { files: ['tools'], coordinates: [2, 2] },
        'CI/CD': { files: ['.github', '.gitlab'], coordinates: [3, 2] },
        'Docker': { files: ['docker', 'Dockerfile'], coordinates: [4, 2] },

        'Docs': { files: ['docs'], coordinates: [0, 3] },
        'Examples': { files: ['examples'], coordinates: [1, 3] },
        'API': { files: ['api'], coordinates: [2, 3] },
        'Packages': { files: ['packages'], coordinates: [3, 3] },
        'Libs': { files: ['lib'], coordinates: [4, 3] },

        'Build': { files: ['dist'], coordinates: [0, 4] },
        'Public': { files: ['public'], coordinates: [1, 4] },
        'Assets': { files: ['assets'], coordinates: [2, 4] },
        'Static': { files: ['static'], coordinates: [3, 4] },
        'Node Modules': { files: ['node_modules'], coordinates: [4, 4] },
      },
    }),
    showGrid: true,
    fullSize: true,
  },
};