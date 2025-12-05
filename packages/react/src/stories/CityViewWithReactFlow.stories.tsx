import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CityViewWithReactFlow } from '../components/CityViewWithReactFlow';
import { FileTree, FileInfo, DirectoryInfo } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@principal-ai/alexandria-core-library';

const meta = {
  title: 'Components/CityViewWithReactFlow',
  component: CityViewWithReactFlow,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100vw' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CityViewWithReactFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create sample file tree data
const createSampleFileTree = (): FileTree => ({
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
            name: 'components',
            path: 'src/components',
            relativePath: 'src/components',
            children: [
              {
                name: 'Button.tsx',
                path: 'src/components/Button.tsx',
                relativePath: 'src/components/Button.tsx',
                size: 2500,
                extension: 'tsx',
                lastModified: new Date('2024-01-15'),
                isDirectory: false,
              },
              {
                name: 'Card.tsx',
                path: 'src/components/Card.tsx',
                relativePath: 'src/components/Card.tsx',
                size: 1800,
                extension: 'tsx',
                lastModified: new Date('2024-01-15'),
                isDirectory: false,
              },
              {
                name: 'Modal.tsx',
                path: 'src/components/Modal.tsx',
                relativePath: 'src/components/Modal.tsx',
                size: 3200,
                extension: 'tsx',
                lastModified: new Date('2024-01-15'),
                isDirectory: false,
              },
            ],
            fileCount: 3,
            totalSize: 7500,
            depth: 2,
          },
          {
            name: 'utils',
            path: 'src/utils',
            relativePath: 'src/utils',
            children: [
              {
                name: 'helpers.ts',
                path: 'src/utils/helpers.ts',
                relativePath: 'src/utils/helpers.ts',
                size: 1200,
                extension: 'ts',
                lastModified: new Date('2024-01-10'),
                isDirectory: false,
              },
              {
                name: 'validators.ts',
                path: 'src/utils/validators.ts',
                relativePath: 'src/utils/validators.ts',
                size: 800,
                extension: 'ts',
                lastModified: new Date('2024-01-10'),
                isDirectory: false,
              },
            ],
            fileCount: 2,
            totalSize: 2000,
            depth: 2,
          },
          {
            name: 'index.ts',
            path: 'src/index.ts',
            relativePath: 'src/index.ts',
            size: 500,
            extension: 'ts',
            lastModified: new Date('2024-01-01'),
            isDirectory: false,
          },
        ],
        fileCount: 6,
        totalSize: 10000,
        depth: 1,
      },
      {
        name: 'tests',
        path: 'tests',
        relativePath: 'tests',
        children: [
          {
            name: 'Button.test.tsx',
            path: 'tests/Button.test.tsx',
            relativePath: 'tests/Button.test.tsx',
            size: 1500,
            extension: 'tsx',
            lastModified: new Date('2024-01-20'),
            isDirectory: false,
          },
          {
            name: 'Card.test.tsx',
            path: 'tests/Card.test.tsx',
            relativePath: 'tests/Card.test.tsx',
            size: 1200,
            extension: 'tsx',
            lastModified: new Date('2024-01-20'),
            isDirectory: false,
          },
        ],
        fileCount: 2,
        totalSize: 2700,
        depth: 1,
      },
      {
        name: 'docs',
        path: 'docs',
        relativePath: 'docs',
        children: [
          {
            name: 'README.md',
            path: 'docs/README.md',
            relativePath: 'docs/README.md',
            size: 3000,
            extension: 'md',
            lastModified: new Date('2024-01-01'),
            isDirectory: false,
          },
          {
            name: 'API.md',
            path: 'docs/API.md',
            relativePath: 'docs/API.md',
            size: 2500,
            extension: 'md',
            lastModified: new Date('2024-01-05'),
            isDirectory: false,
          },
          {
            name: 'CONTRIBUTING.md',
            path: 'docs/CONTRIBUTING.md',
            relativePath: 'docs/CONTRIBUTING.md',
            size: 1800,
            extension: 'md',
            lastModified: new Date('2024-01-01'),
            isDirectory: false,
          },
        ],
        fileCount: 3,
        totalSize: 7300,
        depth: 1,
      },
      {
        name: 'config',
        path: 'config',
        relativePath: 'config',
        children: [
          {
            name: 'webpack.config.js',
            path: 'config/webpack.config.js',
            relativePath: 'config/webpack.config.js',
            size: 2200,
            extension: 'js',
            lastModified: new Date('2024-01-01'),
            isDirectory: false,
          },
          {
            name: 'tsconfig.json',
            path: 'config/tsconfig.json',
            relativePath: 'config/tsconfig.json',
            size: 800,
            extension: 'json',
            lastModified: new Date('2024-01-01'),
            isDirectory: false,
          },
        ],
        fileCount: 2,
        totalSize: 3000,
        depth: 1,
      },
      {
        name: 'package.json',
        path: 'package.json',
        relativePath: 'package.json',
        size: 1500,
        extension: 'json',
        lastModified: new Date('2024-01-01'),
        isDirectory: false,
      },
    ],
    fileCount: 14,
    totalSize: 24500,
    depth: 0,
  },
  stats: {
    totalFiles: 14,
    totalDirectories: 6,
    totalSize: 24500,
    maxDepth: 3,
  },
  allFiles: (function() {
    const files: FileInfo[] = [];
    const collectFiles = (node: DirectoryInfo | FileInfo) => {
      if (!('children' in node)) {
        files.push(node as FileInfo);
      } else if (node.children) {
        for (const child of node.children) {
          collectFiles(child);
        }
      }
    };
    const root = {
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
              name: 'components',
              path: 'src/components',
              relativePath: 'src/components',
              children: [
                {
                  name: 'Button.tsx',
                  path: 'src/components/Button.tsx',
                  relativePath: 'src/components/Button.tsx',
                  size: 2500,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
                {
                  name: 'Card.tsx',
                  path: 'src/components/Card.tsx',
                  relativePath: 'src/components/Card.tsx',
                  size: 1800,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
                {
                  name: 'Modal.tsx',
                  path: 'src/components/Modal.tsx',
                  relativePath: 'src/components/Modal.tsx',
                  size: 3200,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
              ],
              fileCount: 3,
              totalSize: 7500,
              depth: 2,
            },
            {
              name: 'utils',
              path: 'src/utils',
              relativePath: 'src/utils',
              children: [
                {
                  name: 'helpers.ts',
                  path: 'src/utils/helpers.ts',
                  relativePath: 'src/utils/helpers.ts',
                  size: 1200,
                  extension: 'ts',
                  lastModified: new Date('2024-01-10'),
                  isDirectory: false,
                },
                {
                  name: 'validators.ts',
                  path: 'src/utils/validators.ts',
                  relativePath: 'src/utils/validators.ts',
                  size: 800,
                  extension: 'ts',
                  lastModified: new Date('2024-01-10'),
                  isDirectory: false,
                },
              ],
              fileCount: 2,
              totalSize: 2000,
              depth: 2,
            },
            {
              name: 'index.ts',
              path: 'src/index.ts',
              relativePath: 'src/index.ts',
              size: 500,
              extension: 'ts',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 6,
          totalSize: 10000,
          depth: 1,
        },
        {
          name: 'tests',
          path: 'tests',
          relativePath: 'tests',
          children: [
            {
              name: 'Button.test.tsx',
              path: 'tests/Button.test.tsx',
              relativePath: 'tests/Button.test.tsx',
              size: 1500,
              extension: 'tsx',
              lastModified: new Date('2024-01-20'),
              isDirectory: false,
            },
            {
              name: 'Card.test.tsx',
              path: 'tests/Card.test.tsx',
              relativePath: 'tests/Card.test.tsx',
              size: 1200,
              extension: 'tsx',
              lastModified: new Date('2024-01-20'),
              isDirectory: false,
            },
          ],
          fileCount: 2,
          totalSize: 2700,
          depth: 1,
        },
        {
          name: 'docs',
          path: 'docs',
          relativePath: 'docs',
          children: [
            {
              name: 'README.md',
              path: 'docs/README.md',
              relativePath: 'docs/README.md',
              size: 3000,
              extension: 'md',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
            {
              name: 'API.md',
              path: 'docs/API.md',
              relativePath: 'docs/API.md',
              size: 2500,
              extension: 'md',
              lastModified: new Date('2024-01-05'),
              isDirectory: false,
            },
            {
              name: 'CONTRIBUTING.md',
              path: 'docs/CONTRIBUTING.md',
              relativePath: 'docs/CONTRIBUTING.md',
              size: 1800,
              extension: 'md',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 3,
          totalSize: 7300,
          depth: 1,
        },
        {
          name: 'config',
          path: 'config',
          relativePath: 'config',
          children: [
            {
              name: 'webpack.config.js',
              path: 'config/webpack.config.js',
              relativePath: 'config/webpack.config.js',
              size: 2200,
              extension: 'js',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
            {
              name: 'tsconfig.json',
              path: 'config/tsconfig.json',
              relativePath: 'config/tsconfig.json',
              size: 800,
              extension: 'json',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 2,
          totalSize: 3000,
          depth: 1,
        },
        {
          name: 'package.json',
          path: 'package.json',
          relativePath: 'package.json',
          size: 1500,
          extension: 'json',
          lastModified: new Date('2024-01-01'),
          isDirectory: false,
        },
      ],
      fileCount: 14,
      totalSize: 24500,
      depth: 0,
    };
    collectFiles(root);
    return files;
  })(),
  allDirectories: (function() {
    const dirs: DirectoryInfo[] = [];
    const collectDirs = (node: DirectoryInfo | FileInfo) => {
      if ('children' in node) {
        dirs.push(node as DirectoryInfo);
        if (node.children) {
          for (const child of node.children) {
            collectDirs(child);
          }
        }
      }
    };
    const root = {
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
              name: 'components',
              path: 'src/components',
              relativePath: 'src/components',
              children: [
                {
                  name: 'Button.tsx',
                  path: 'src/components/Button.tsx',
                  relativePath: 'src/components/Button.tsx',
                  size: 2500,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
                {
                  name: 'Card.tsx',
                  path: 'src/components/Card.tsx',
                  relativePath: 'src/components/Card.tsx',
                  size: 1800,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
                {
                  name: 'Modal.tsx',
                  path: 'src/components/Modal.tsx',
                  relativePath: 'src/components/Modal.tsx',
                  size: 3200,
                  extension: 'tsx',
                  lastModified: new Date('2024-01-15'),
                  isDirectory: false,
                },
              ],
              fileCount: 3,
              totalSize: 7500,
              depth: 2,
            },
            {
              name: 'utils',
              path: 'src/utils',
              relativePath: 'src/utils',
              children: [
                {
                  name: 'helpers.ts',
                  path: 'src/utils/helpers.ts',
                  relativePath: 'src/utils/helpers.ts',
                  size: 1200,
                  extension: 'ts',
                  lastModified: new Date('2024-01-10'),
                  isDirectory: false,
                },
                {
                  name: 'validators.ts',
                  path: 'src/utils/validators.ts',
                  relativePath: 'src/utils/validators.ts',
                  size: 800,
                  extension: 'ts',
                  lastModified: new Date('2024-01-10'),
                  isDirectory: false,
                },
              ],
              fileCount: 2,
              totalSize: 2000,
              depth: 2,
            },
            {
              name: 'index.ts',
              path: 'src/index.ts',
              relativePath: 'src/index.ts',
              size: 500,
              extension: 'ts',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 6,
          totalSize: 10000,
          depth: 1,
        },
        {
          name: 'tests',
          path: 'tests',
          relativePath: 'tests',
          children: [
            {
              name: 'Button.test.tsx',
              path: 'tests/Button.test.tsx',
              relativePath: 'tests/Button.test.tsx',
              size: 1500,
              extension: 'tsx',
              lastModified: new Date('2024-01-20'),
              isDirectory: false,
            },
            {
              name: 'Card.test.tsx',
              path: 'tests/Card.test.tsx',
              relativePath: 'tests/Card.test.tsx',
              size: 1200,
              extension: 'tsx',
              lastModified: new Date('2024-01-20'),
              isDirectory: false,
            },
          ],
          fileCount: 2,
          totalSize: 2700,
          depth: 1,
        },
        {
          name: 'docs',
          path: 'docs',
          relativePath: 'docs',
          children: [
            {
              name: 'README.md',
              path: 'docs/README.md',
              relativePath: 'docs/README.md',
              size: 3000,
              extension: 'md',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
            {
              name: 'API.md',
              path: 'docs/API.md',
              relativePath: 'docs/API.md',
              size: 2500,
              extension: 'md',
              lastModified: new Date('2024-01-05'),
              isDirectory: false,
            },
            {
              name: 'CONTRIBUTING.md',
              path: 'docs/CONTRIBUTING.md',
              relativePath: 'docs/CONTRIBUTING.md',
              size: 1800,
              extension: 'md',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 3,
          totalSize: 7300,
          depth: 1,
        },
        {
          name: 'config',
          path: 'config',
          relativePath: 'config',
          children: [
            {
              name: 'webpack.config.js',
              path: 'config/webpack.config.js',
              relativePath: 'config/webpack.config.js',
              size: 2200,
              extension: 'js',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
            {
              name: 'tsconfig.json',
              path: 'config/tsconfig.json',
              relativePath: 'config/tsconfig.json',
              size: 800,
              extension: 'json',
              lastModified: new Date('2024-01-01'),
              isDirectory: false,
            },
          ],
          fileCount: 2,
          totalSize: 3000,
          depth: 1,
        },
        {
          name: 'package.json',
          path: 'package.json',
          relativePath: 'package.json',
          size: 1500,
          extension: 'json',
          lastModified: new Date('2024-01-01'),
          isDirectory: false,
        },
      ],
      fileCount: 14,
      totalSize: 24500,
      depth: 0,
    };
    collectDirs(root);
    return dirs;
  })(),
  sha: 'sample-sha',
  metadata: {
    id: 'sample-tree',
    timestamp: new Date(),
    sourceType: 'sample',
    sourceInfo: {},
  },
});

export const SingleCell: Story = {
  args: {
    fileTree: createSampleFileTree(),
    gridConfig: {
      id: 'single-cell',
      version: '1.0',
      name: 'Single Cell',
      description: 'All files in one cell',
      overviewPath: 'README.md',
      category: 'custom',
      displayOrder: 0,
      referenceGroups: {
        'All Files': {
          files: ['src', 'tests', 'docs', 'config', 'package.json'],
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
    } as CodebaseView,
    onCellClick: () => {},
  },
};

export const MultiCell: Story = {
  args: {
    fileTree: createSampleFileTree(),
    gridConfig: {
      id: 'multi-cell',
      version: '1.0',
      name: 'Multi-Cell Layout',
      description: 'Organized grid layout',
      overviewPath: 'README.md',
      category: 'custom',
      displayOrder: 0,
      referenceGroups: {
        'Source Code': {
          files: ['src'],
          coordinates: [0, 0],
        },
        'Tests': {
          files: ['tests'],
          coordinates: [0, 1],
        },
        'Documentation': {
          files: ['docs'],
          coordinates: [1, 0],
        },
        'Configuration': {
          files: ['config', 'package.json'],
          coordinates: [1, 1],
        },
      },
      metadata: {
        ui: {
          enabled: true,
          rows: 2,
          cols: 2,
        },
      },
    } as CodebaseView,
    onCellClick: () => {},
  },
};

export const LargeGrid: Story = {
  args: {
    fileTree: createSampleFileTree(),
    gridConfig: {
      id: 'large-grid',
      version: '1.0',
      name: 'Large Grid Layout',
      description: '3x3 grid layout',
      overviewPath: 'README.md',
      category: 'custom',
      displayOrder: 0,
      referenceGroups: {
        'Components': {
          files: ['src/components/**/*'],
          coordinates: [0, 0],
        },
        'Utils': {
          files: ['src/utils/**/*'],
          coordinates: [0, 1],
        },
        'Core': {
          files: ['src/index.ts'],
          coordinates: [0, 2],
        },
        'Unit Tests': {
          files: ['tests/**/*.test.*'],
          coordinates: [1, 0],
        },
        'Documentation': {
          files: ['docs/**/*'],
          coordinates: [1, 1],
        },
        'Config': {
          files: ['config/**/*'],
          coordinates: [1, 2],
        },
        'Package': {
          files: ['package.json'],
          coordinates: [2, 0],
        },
        'Other': {
          files: ['*'],
          coordinates: [2, 1],
        },
        'Empty': {
          files: [],
          coordinates: [2, 2],
        },
      },
      metadata: {
        ui: {
          enabled: true,
          rows: 3,
          cols: 3,
        },
      },
    } as CodebaseView,
    onCellClick: () => {},
  },
};