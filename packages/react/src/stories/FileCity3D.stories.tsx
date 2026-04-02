import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CityData,
  type CityBuilding,
  type CityDistrict,
  type HighlightLayer,
  type IsolationMode,
} from '../components/FileCity3D';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D',
  component: FileCity3D,
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
  areaDepth: number,
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
    const size = isCode ? lineCount! * 40 : Math.floor(Math.random() * 200000) + 1000;

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
      label: {
        text: 'src',
        bounds: { minX: -2, maxX: 42, minZ: 42, maxZ: 46 },
        position: 'bottom',
      },
    },
    {
      path: 'src/components',
      worldBounds: { minX: 48, maxX: 82, minZ: -2, maxZ: 32 },
      fileCount: 8,
      type: 'directory',
      label: {
        text: 'components',
        bounds: { minX: 48, maxX: 82, minZ: 32, maxZ: 36 },
        position: 'bottom',
      },
    },
    {
      path: 'src/utils',
      worldBounds: { minX: 48, maxX: 77, minZ: 38, maxZ: 67 },
      fileCount: 6,
      type: 'directory',
      label: {
        text: 'utils',
        bounds: { minX: 48, maxX: 77, minZ: 67, maxZ: 71 },
        position: 'bottom',
      },
    },
    {
      path: 'tests',
      worldBounds: { minX: -2, maxX: 32, minZ: 48, maxZ: 72 },
      fileCount: 5,
      type: 'directory',
      label: {
        text: 'tests',
        bounds: { minX: -2, maxX: 32, minZ: 72, maxZ: 76 },
        position: 'bottom',
      },
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
    metadata: {
      totalFiles: buildings.length,
      totalDirectories: districts.length,
      rootPath: '/large-project',
    },
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
    metadata: {
      totalFiles: buildings.length,
      totalDirectories: districts.length,
      rootPath: '/monorepo',
    },
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
    onBuildingClick: building => {
      console.log('Clicked building:', building.path);
      alert(`Clicked: ${building.path}`);
    },
  },
};

/**
 * With selection - Click to select a building, click again to deselect
 */
const WithSelectionTemplate: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = React.useState<CityBuilding | null>(null);

  return (
    <FileCity3D
      cityData={sampleCityData}
      height="100vh"
      selectedBuilding={selectedBuilding}
      onBuildingClick={building => {
        setSelectedBuilding(prev => (prev?.path === building.path ? null : building));
      }}
    />
  );
};

export const WithSelection: Story = {
  render: () => <WithSelectionTemplate />,
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

// Real repository data from JSON files
import authServerCityData from '../../../../assets/auth-server-city-data.json';
import electronAppCityData from '../../../../assets/electron-app-city-data.json';
import thisRepoCityData from '../../../../assets/this-repo-city-data.json';

// Tour step definitions for auth-server
interface TourStep {
  id: string;
  title: string;
  description: string;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
}

const authServerTourSteps: TourStep[] = [
  {
    id: 'overview',
    title: 'Welcome to Auth Server',
    description:
      "This is the authentication server for Principal ADE. Let's explore its architecture.",
    highlightLayers: [],
    isolationMode: 'none' as const,
  },
  {
    id: 'workos-auth',
    title: 'WorkOS Authentication',
    description:
      'The core authentication flow using WorkOS. Handles OAuth callbacks, token exchange, and verification.',
    highlightLayers: [
      {
        id: 'workos',
        name: 'WorkOS Auth',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'auth-server/src/app/api/auth/workos', type: 'directory' as const }],
      },
    ],
    isolationMode: 'transparent' as const,
  },
  {
    id: 'browser-cli-tokens',
    title: 'Token Endpoints',
    description: 'Separate token endpoints for browser clients and CLI tools.',
    highlightLayers: [
      {
        id: 'browser',
        name: 'Browser Tokens',
        enabled: true,
        color: '#3b82f6',
        items: [{ path: 'auth-server/src/app/api/auth/browser', type: 'directory' as const }],
      },
      {
        id: 'cli',
        name: 'CLI Tokens',
        enabled: true,
        color: '#f59e0b',
        items: [{ path: 'auth-server/src/app/api/auth/cli', type: 'directory' as const }],
      },
    ],
    isolationMode: 'transparent' as const,
  },
  {
    id: 'lib-utilities',
    title: 'Core Libraries',
    description: 'Shared utilities including telemetry, token storage, and session management.',
    highlightLayers: [
      {
        id: 'lib',
        name: 'Libraries',
        enabled: true,
        color: '#8b5cf6',
        items: [{ path: 'auth-server/src/lib', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse' as const,
  },
  {
    id: 'api-testing',
    title: 'API Testing with Bruno',
    description: 'Bruno collection for testing all authentication endpoints.',
    highlightLayers: [
      {
        id: 'bruno',
        name: 'Bruno Tests',
        enabled: true,
        color: '#ef4444',
        items: [{ path: 'auth-server/bruno', type: 'directory' as const }],
      },
    ],
    isolationMode: 'hide' as const,
  },
  {
    id: 'architecture-docs',
    title: 'Architecture Documentation',
    description: 'OTEL canvas files and workflow definitions documenting the auth flows.',
    highlightLayers: [
      {
        id: 'views',
        name: 'Principal Views',
        enabled: true,
        color: '#ec4899',
        items: [{ path: 'auth-server/.principal-views', type: 'directory' as const }],
      },
    ],
    isolationMode: 'transparent' as const,
  },
];

/**
 * Auth Server - Real repository data
 */
export const AuthServer: Story = {
  args: {
    cityData: authServerCityData as CityData,
    height: '100vh',
    heightScaling: 'linear',
    linearScale: 0.5,
    animation: {
      startFlat: true,
      autoStartDelay: 800,
      staggerDelay: 15,
      tension: 120,
      friction: 14,
    },
  },
};

/**
 * Electron App - Real repository data (larger)
 */
export const ElectronApp: Story = {
  args: {
    cityData: electronAppCityData as CityData,
    height: '100vh',
    heightScaling: 'linear',
    linearScale: 0.5,
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
 * This Repo - industry-themed-repository-composition-panels
 */
export const ThisRepo: Story = {
  args: {
    cityData: thisRepoCityData as CityData,
    height: '100vh',
    heightScaling: 'linear',
    linearScale: 0.5,
    animation: {
      startFlat: true,
      autoStartDelay: 700,
      staggerDelay: 10,
      tension: 130,
      friction: 14,
    },
  },
};

/**
 * Auth Server Tour Simulation - Demonstrates how tours work in 3D
 */
const AuthServerTourTemplate: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const step = authServerTourSteps[currentStep];

  const goToStep = (index: number) => {
    if (index >= 0 && index < authServerTourSteps.length) {
      setCurrentStep(index);
    }
  };

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* 3D City */}
      <FileCity3D
        cityData={authServerCityData as CityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        highlightLayers={step.highlightLayers}
        isolationMode={step.isolationMode}
        dimOpacity={0.12}
        animation={{
          startFlat: true,
          autoStartDelay: 600,
          staggerDelay: 8,
          tension: 140,
          friction: 14,
        }}
        showControls={true}
      />

      {/* Tour controls - bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid #334155',
          padding: '16px 24px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Previous button */}
        <button
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
          style={{
            padding: '10px 20px',
            background: currentStep === 0 ? '#1e293b' : '#334155',
            border: '1px solid #475569',
            borderRadius: 6,
            color: currentStep === 0 ? '#475569' : '#e2e8f0',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ← Previous
        </button>

        {/* Step content - center */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {authServerTourSteps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goToStep(i)}
                style={{
                  width: i === currentStep ? 12 : 10,
                  height: i === currentStep ? 12 : 10,
                  borderRadius: '50%',
                  border: i === currentStep ? '2px solid #3b82f6' : 'none',
                  background:
                    i === currentStep ? '#3b82f6' : i < currentStep ? '#22c55e' : '#475569',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s',
                }}
                title={s.title}
              />
            ))}
          </div>

          {/* Step info */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Step {currentStep + 1} of {authServerTourSteps.length}
            </span>
            <span style={{ margin: '0 8px', color: '#334155' }}>•</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{step.title}</span>
          </div>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#94a3b8',
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            {step.description}
          </p>

          {/* Isolation mode indicator */}
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Isolation:{' '}
            <code
              style={{
                color: '#94a3b8',
                background: '#1e293b',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              {step.isolationMode}
            </code>
            {step.highlightLayers.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                • {step.highlightLayers.length} layer{step.highlightLayers.length > 1 ? 's' : ''}{' '}
                active
              </span>
            )}
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={() => goToStep(currentStep + 1)}
          disabled={currentStep === authServerTourSteps.length - 1}
          style={{
            padding: '10px 20px',
            background: currentStep === authServerTourSteps.length - 1 ? '#1e293b' : '#3b82f6',
            border: '1px solid transparent',
            borderRadius: 6,
            color: currentStep === authServerTourSteps.length - 1 ? '#475569' : '#ffffff',
            cursor: currentStep === authServerTourSteps.length - 1 ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export const AuthServerTour: Story = {
  render: () => <AuthServerTourTemplate />,
};

/**
 * Directory Selection - Click directories to focus and collapse others
 */
const DirectorySelectionTemplate: React.FC = () => {
  const [focusDirectory, setFocusDirectory] = React.useState<string | null>(null);

  // Extract unique top-level directories from the auth server data
  const directories = React.useMemo(() => {
    const dirSet = new Set<string>();
    (authServerCityData as CityData).buildings.forEach(building => {
      const parts = building.path.split('/');
      if (parts.length >= 2) {
        // Get first two levels for more interesting navigation
        dirSet.add(parts.slice(0, 2).join('/'));
      }
    });
    return Array.from(dirSet).sort();
  }, []);

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* 3D City */}
      <FileCity3D
        cityData={authServerCityData as CityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        focusDirectory={focusDirectory}
        animation={{
          startFlat: true,
          autoStartDelay: 600,
          staggerDelay: 8,
          tension: 140,
          friction: 14,
        }}
        showControls={true}
        onBuildingClick={building => {
          // Extract directory from building path
          const parts = building.path.split('/');
          if (parts.length >= 2) {
            const dir = parts.slice(0, 2).join('/');
            setFocusDirectory(prev => (prev === dir ? null : dir));
          }
        }}
      />

      {/* Directory selector - bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid #334155',
          padding: '16px 24px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ marginBottom: 12, fontSize: 12, color: '#64748b' }}>
          Click a directory to focus (collapse others). Click again or "Show All" to reset.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={() => setFocusDirectory(null)}
            style={{
              padding: '8px 16px',
              background: focusDirectory === null ? '#3b82f6' : '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: focusDirectory === null ? '#ffffff' : '#e2e8f0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Show All
          </button>
          {directories.map(dir => (
            <button
              key={dir}
              onClick={() => setFocusDirectory(prev => (prev === dir ? null : dir))}
              style={{
                padding: '8px 16px',
                background: focusDirectory === dir ? '#3b82f6' : '#334155',
                border: '1px solid #475569',
                borderRadius: 6,
                color: focusDirectory === dir ? '#ffffff' : '#e2e8f0',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {dir.split('/').pop()}
            </button>
          ))}
        </div>
        {focusDirectory && (
          <div style={{ marginTop: 12, fontSize: 14 }}>
            Focused:{' '}
            <code
              style={{
                color: '#3b82f6',
                background: '#1e293b',
                padding: '4px 8px',
                borderRadius: 4,
              }}
            >
              {focusDirectory}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export const DirectorySelection: Story = {
  render: () => <DirectorySelectionTemplate />,
};
