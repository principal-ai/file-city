import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { FileCity3D, type CityData, type CityBuilding, type CityDistrict } from '../components/FileCity3D';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D',
  component: FileCity3D,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    width: { control: 'text' },
    height: { control: 'number' },
    showControls: { control: 'boolean' },
    heightScaling: { control: 'select', options: ['logarithmic', 'linear'] },
    isolationMode: { control: 'select', options: ['none', 'transparent', 'collapse', 'hide'] },
    dimOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// Code extensions use lineCount for height
const CODE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java'];
const NON_CODE_EXTENSIONS = ['json', 'css', 'md', 'yaml', 'svg', 'png'];

// Helper to generate sample buildings
function generateBuildings(
  basePath: string,
  count: number,
  startX: number,
  startZ: number,
  areaWidth: number,
  areaDepth: number
): CityBuilding[] {
  const buildings: CityBuilding[] = [];
  const allExtensions = [...CODE_EXTENSIONS, ...NON_CODE_EXTENSIONS];
  const cols = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ext = allExtensions[i % allExtensions.length];
    const isCode = CODE_EXTENSIONS.includes(ext);

    // Code files: logarithmic distribution of line counts (20-3000 lines)
    const lineCount = isCode
      ? Math.floor(Math.exp(Math.random() * Math.log(3000 - 20) + Math.log(20)))
      : undefined;
    const size = isCode
      ? lineCount! * 40
      : Math.floor(Math.random() * 200000) + 1000;

    buildings.push({
      path: `${basePath}/file${i}.${ext}`,
      position: {
        x: startX + (col / cols) * areaWidth + areaWidth / cols / 2,
        y: 0,
        z: startZ + (row / cols) * areaDepth + areaDepth / cols / 2,
      },
      dimensions: [(areaWidth / cols) * 0.7, 10, (areaDepth / cols) * 0.7],
      type: 'file',
      fileExtension: ext,
      size,
      lineCount,
    });
  }

  return buildings;
}

// Sample city data
const sampleCityData: CityData = {
  buildings: [
    ...generateBuildings('src', 12, 0, 0, 40, 40),
    ...generateBuildings('src/components', 8, 50, 0, 30, 30),
    ...generateBuildings('src/utils', 6, 50, 40, 25, 25),
    ...generateBuildings('tests', 5, 0, 50, 30, 20),
  ],
  districts: [
    {
      path: 'src',
      worldBounds: { minX: -2, maxX: 42, minZ: -2, maxZ: 42 },
      fileCount: 12,
      type: 'directory',
      label: { text: 'src', bounds: { minX: -2, maxX: 42, minZ: 42, maxZ: 46 }, position: 'bottom' },
    },
    {
      path: 'src/components',
      worldBounds: { minX: 48, maxX: 82, minZ: -2, maxZ: 32 },
      fileCount: 8,
      type: 'directory',
      label: { text: 'components', bounds: { minX: 48, maxX: 82, minZ: 32, maxZ: 36 }, position: 'bottom' },
    },
    {
      path: 'src/utils',
      worldBounds: { minX: 48, maxX: 77, minZ: 38, maxZ: 67 },
      fileCount: 6,
      type: 'directory',
      label: { text: 'utils', bounds: { minX: 48, maxX: 77, minZ: 67, maxZ: 71 }, position: 'bottom' },
    },
    {
      path: 'tests',
      worldBounds: { minX: -2, maxX: 32, minZ: 48, maxZ: 72 },
      fileCount: 5,
      type: 'directory',
      label: { text: 'tests', bounds: { minX: -2, maxX: 32, minZ: 72, maxZ: 76 }, position: 'bottom' },
    },
  ],
  bounds: { minX: -5, maxX: 85, minZ: -5, maxZ: 80 },
  metadata: { totalFiles: 31, totalDirectories: 4, rootPath: '/project' },
};

// Large city for stress testing
function generateLargeCityData(): CityData {
  const buildings: CityBuilding[] = [];
  const districts: CityDistrict[] = [];
  const gridSize = 5;
  const dirSize = 40;
  const filesPerDir = 15;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const dirPath = `dir_${row}_${col}`;
      const startX = col * (dirSize + 10);
      const startZ = row * (dirSize + 10);

      buildings.push(...generateBuildings(dirPath, filesPerDir, startX, startZ, dirSize, dirSize));
      districts.push({
        path: dirPath,
        worldBounds: {
          minX: startX - 2,
          maxX: startX + dirSize + 2,
          minZ: startZ - 2,
          maxZ: startZ + dirSize + 2,
        },
        fileCount: filesPerDir,
        type: 'directory',
        label: {
          text: dirPath,
          bounds: {
            minX: startX - 2,
            maxX: startX + dirSize + 2,
            minZ: startZ + dirSize + 2,
            maxZ: startZ + dirSize + 6,
          },
          position: 'bottom',
        },
      });
    }
  }

  const totalSize = gridSize * (dirSize + 10);
  return {
    buildings,
    districts,
    bounds: { minX: -10, maxX: totalSize + 10, minZ: -10, maxZ: totalSize + 10 },
    metadata: { totalFiles: buildings.length, totalDirectories: districts.length, rootPath: '/large-project' },
  };
}

// Monorepo layout
function generateMonorepoCityData(): CityData {
  const buildings: CityBuilding[] = [];
  const districts: CityDistrict[] = [];

  const packages = [
    { name: 'packages/core', files: 20, x: 0, z: 0, w: 50, d: 50 },
    { name: 'packages/cli', files: 10, x: 60, z: 0, w: 35, d: 35 },
    { name: 'packages/react', files: 15, x: 60, z: 45, w: 40, d: 40 },
    { name: 'packages/server', files: 8, x: 0, z: 60, w: 30, d: 30 },
    { name: 'apps/web', files: 25, x: 110, z: 0, w: 55, d: 55 },
    { name: 'apps/docs', files: 12, x: 110, z: 65, w: 40, d: 35 },
  ];

  for (const pkg of packages) {
    buildings.push(...generateBuildings(pkg.name, pkg.files, pkg.x, pkg.z, pkg.w, pkg.d));
    districts.push({
      path: pkg.name,
      worldBounds: {
        minX: pkg.x - 2,
        maxX: pkg.x + pkg.w + 2,
        minZ: pkg.z - 2,
        maxZ: pkg.z + pkg.d + 2,
      },
      fileCount: pkg.files,
      type: 'directory',
      label: {
        text: pkg.name.split('/').pop() || pkg.name,
        bounds: {
          minX: pkg.x - 2,
          maxX: pkg.x + pkg.w + 2,
          minZ: pkg.z + pkg.d + 2,
          maxZ: pkg.z + pkg.d + 6,
        },
        position: 'bottom',
      },
    });
  }

  return {
    buildings,
    districts,
    bounds: { minX: -10, maxX: 175, minZ: -10, maxZ: 110 },
    metadata: { totalFiles: buildings.length, totalDirectories: districts.length, rootPath: '/monorepo' },
  };
}

/**
 * Default view - starts fully grown in 3D mode
 */
export const Default: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
  },
};

/**
 * Animated intro - starts flat (2D), then grows into 3D with a ripple effect
 */
export const AnimatedIntro: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 800,
      staggerDelay: 20,
      tension: 100,
      friction: 12,
    },
  },
};

/**
 * Manual control - starts flat, use button to trigger growth
 */
export const ManualControl: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: null,
      staggerDelay: 15,
    },
    showControls: true,
  },
};

/**
 * Fast animation - snappy growth effect
 */
export const FastAnimation: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 500,
      staggerDelay: 8,
      tension: 200,
      friction: 18,
    },
  },
};

/**
 * Slow dramatic reveal
 */
export const SlowDramatic: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 1000,
      staggerDelay: 40,
      tension: 60,
      friction: 8,
    },
  },
};

/**
 * Large city with animation - 375 buildings
 */
export const LargeCityAnimated: Story = {
  args: {
    cityData: generateLargeCityData(),
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 600,
      staggerDelay: 5,
      tension: 150,
      friction: 16,
    },
  },
};

/**
 * Monorepo layout with animation
 */
export const MonorepoAnimated: Story = {
  args: {
    cityData: generateMonorepoCityData(),
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 700,
      staggerDelay: 12,
      tension: 120,
      friction: 14,
    },
  },
};

/**
 * Static 3D view (no animation)
 */
export const Static3D: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: { startFlat: false },
    showControls: false,
  },
};

/**
 * With click handler
 */
export const WithClickHandler: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    onBuildingClick: (building) => {
      console.log('Clicked building:', building.path);
      alert(`Clicked: ${building.path}`);
    },
  },
};

/**
 * Isolation - transparent mode
 */
export const IsolationTransparent: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    isolationMode: 'transparent',
    dimOpacity: 0.1,
    highlightLayers: [
      {
        id: 'focus',
        name: 'Focus Layer',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'src', type: 'directory' as const }],
      },
    ],
  },
};

/**
 * Isolation - collapse mode
 */
export const IsolationCollapse: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    isolationMode: 'collapse',
    highlightLayers: [
      {
        id: 'focus',
        name: 'Focus Layer',
        enabled: true,
        color: '#3b82f6',
        items: [{ path: 'src/components', type: 'directory' as const }],
      },
    ],
  },
};

/**
 * Isolation - hide mode
 */
export const IsolationHide: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    isolationMode: 'hide',
    highlightLayers: [
      {
        id: 'focus',
        name: 'Focus Layer',
        enabled: true,
        color: '#f59e0b',
        items: [{ path: 'tests', type: 'directory' as const }],
      },
    ],
  },
};

/**
 * Multiple highlight layers
 */
export const MultipleHighlights: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    isolationMode: 'transparent',
    dimOpacity: 0.08,
    highlightLayers: [
      {
        id: 'src',
        name: 'Source',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'src', type: 'directory' as const }],
      },
      {
        id: 'tests',
        name: 'Tests',
        enabled: true,
        color: '#ef4444',
        items: [{ path: 'tests', type: 'directory' as const }],
      },
    ],
  },
};

/**
 * Animated intro with highlight
 */
export const AnimatedWithHighlight: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    animation: {
      startFlat: true,
      autoStartDelay: 800,
      staggerDelay: 20,
    },
    isolationMode: 'transparent',
    dimOpacity: 0.15,
    highlightLayers: [
      {
        id: 'components',
        name: 'Components',
        enabled: true,
        color: '#8b5cf6',
        items: [{ path: 'src/components', type: 'directory' as const }],
      },
    ],
  },
};

/**
 * Linear height scaling
 */
export const LinearHeightScaling: Story = {
  args: {
    cityData: sampleCityData,
    height: '100vh',
    heightScaling: 'linear',
    linearScale: 0.5,
  },
};
