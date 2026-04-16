import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  resetCamera,
  rotateCameraTo,
  rotateCameraBy,
  tiltCameraTo,
  tiltCameraBy,
  moveCameraTo,
  setCameraTarget,
  getCameraTarget,
  getCameraAngle,
  getCameraTilt,
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
  metadata: { totalFiles: 31, totalDirectories: 4, rootPath: '/project', analyzedAt: new Date() },
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
      analyzedAt: new Date(),
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
      analyzedAt: new Date(),
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
 * Electron App Flicker Test - Reproduces camera flicker issue
 * Stays flat (no auto-grow) to isolate the camera position jump on initial load
 */
export const ElectronAppFlickerTest: Story = {
  args: {
    cityData: electronAppCityData as CityData,
    height: '100vh',
    heightScaling: 'linear',
    linearScale: 0.5,
    animation: {
      startFlat: true,
      autoStartDelay: null, // Don't auto-grow, stay flat
    },
    showControls: true,
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
          Click a directory to focus (collapse others). Click again or &quot;Show All&quot; to reset.
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

/**
 * Tour Scenario Tester - Test all combinations of focusDirectory and highlightLayers
 *
 * This story allows testing the animation system across all documented scenarios:
 * - Baseline (no focus, no highlights)
 * - Focus only
 * - Highlight only
 * - Focus + Highlight combinations
 * - Transitions between states
 *
 * See docs/TOUR_TEST_SCENARIOS.md for full documentation.
 */
interface TestScenario {
  id: string;
  name: string;
  description: string;
  focusDirectory: string | null;
  focusColor?: string | null;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
}

const testScenarios: TestScenario[] = [
  // Base scenarios
  {
    id: 'S1-baseline',
    name: 'S1: Baseline',
    description: 'Full city view, no focus, no highlights',
    focusDirectory: null,
    highlightLayers: [],
    isolationMode: 'none',
  },
  {
    id: 'S2-focus-only',
    name: 'S2: Focus Only (src)',
    description: 'Camera zooms to src, others collapse, focused area highlighted',
    focusDirectory: 'auth-server/src',
    focusColor: '#3b82f6',
    highlightLayers: [],
    isolationMode: 'collapse',
  },
  {
    id: 'S2b-focus-only-tests',
    name: 'S2b: Focus Only (bruno)',
    description: 'Camera zooms to bruno directory, highlighted in green',
    focusDirectory: 'auth-server/bruno',
    focusColor: '#22c55e',
    highlightLayers: [],
    isolationMode: 'collapse',
  },
  {
    id: 'S3-highlight-only',
    name: 'S3: Highlight Only',
    description: 'Full view with highlight layer, non-highlighted collapse',
    focusDirectory: null,
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'API Routes',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  {
    id: 'S4-focus-highlight-same',
    name: 'S4: Focus + Highlight (same directory)',
    description: 'Focus and highlight on same directory',
    focusDirectory: 'auth-server/src/app/api',
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'API Routes',
        enabled: true,
        color: '#3b82f6',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  {
    id: 'S5-focus-highlight-subset',
    name: 'S5: Focus + Highlight (subset)',
    description: 'Focus on src, highlight only components subset',
    focusDirectory: 'auth-server/src',
    highlightLayers: [
      {
        id: 'lib-layer',
        name: 'Libraries',
        enabled: true,
        color: '#8b5cf6',
        items: [{ path: 'auth-server/src/lib', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  {
    id: 'S6-multiple-highlights-focus',
    name: 'S6: Multiple Highlights (with focus)',
    description: 'Two highlight layers within focused area',
    focusDirectory: 'auth-server/src',
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'API Routes',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
      {
        id: 'lib-layer',
        name: 'Libraries',
        enabled: true,
        color: '#f59e0b',
        items: [{ path: 'auth-server/src/lib', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  {
    id: 'S7-multiple-highlights-no-focus',
    name: 'S7: Multiple Highlights (no focus)',
    description: 'Two highlight layers, non-highlighted collapse',
    focusDirectory: null,
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'API Routes',
        enabled: true,
        color: '#3b82f6',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
      {
        id: 'bruno-layer',
        name: 'Bruno Tests',
        enabled: true,
        color: '#ef4444',
        items: [{ path: 'auth-server/bruno', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  // Edge cases
  {
    id: 'E3-overlapping-highlights',
    name: 'E3: Overlapping Highlights',
    description: 'Two layers highlight overlapping paths',
    focusDirectory: 'auth-server/src',
    highlightLayers: [
      {
        id: 'src-layer',
        name: 'All Source',
        enabled: true,
        color: '#22c55e',
        items: [{ path: 'auth-server/src', type: 'directory' as const }],
      },
      {
        id: 'api-layer',
        name: 'API Only',
        enabled: true,
        color: '#ef4444',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
  {
    id: 'E4-focus-inside-highlight',
    name: 'E4: Focus Inside Highlight',
    description: 'Focus on subset of highlighted area',
    focusDirectory: 'auth-server/src/app/api/auth',
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'All API',
        enabled: true,
        color: '#8b5cf6',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
    ],
    isolationMode: 'collapse',
  },
];

const TourScenarioTesterTemplate: React.FC = () => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = React.useState(0);
  const [transitionLog, setTransitionLog] = React.useState<string[]>([]);
  const prevScenarioRef = React.useRef<TestScenario | null>(null);

  const scenario = testScenarios[currentScenarioIndex];

  // Log transitions
  React.useEffect(() => {
    const prev = prevScenarioRef.current;
    if (prev && prev.id !== scenario.id) {
      const logEntry = `${new Date().toLocaleTimeString()} | ${prev.name} → ${scenario.name}`;
      setTransitionLog(logs => [...logs.slice(-9), logEntry]);
      console.log('[TourScenario]', logEntry);
      console.log('  From:', { focus: prev.focusDirectory, layers: prev.highlightLayers.length });
      console.log('  To:', {
        focus: scenario.focusDirectory,
        layers: scenario.highlightLayers.length,
      });
    }
    prevScenarioRef.current = scenario;
  }, [scenario]);

  const goToScenario = (index: number) => {
    if (index >= 0 && index < testScenarios.length) {
      setCurrentScenarioIndex(index);
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
        focusDirectory={scenario.focusDirectory}
        focusColor={scenario.focusColor}
        highlightLayers={scenario.highlightLayers}
        isolationMode={scenario.isolationMode}
        dimOpacity={0.12}
        animation={{
          startFlat: false,
          staggerDelay: 8,
          tension: 140,
          friction: 14,
        }}
        showControls={true}
      />

      {/* Scenario selector panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 16,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 360,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
          Tour Scenario Tester
        </h3>

        {/* Scenario dropdown */}
        <select
          value={currentScenarioIndex}
          onChange={e => goToScenario(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {testScenarios.map((s, i) => (
            <option key={s.id} value={i}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Scenario description */}
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8' }}>
          {scenario.description}
        </p>

        {/* Current state */}
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <strong>focusDirectory:</strong>{' '}
            <code style={{ color: '#22c55e' }}>{scenario.focusDirectory ?? 'null'}</code>
            {scenario.focusColor && (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: scenario.focusColor,
                  marginLeft: 4,
                }}
              />
            )}
          </div>
          <div>
            <strong>highlightLayers:</strong>{' '}
            <code style={{ color: '#3b82f6' }}>{scenario.highlightLayers.length} layer(s)</code>
          </div>
          <div>
            <strong>isolationMode:</strong>{' '}
            <code style={{ color: '#f59e0b' }}>{scenario.isolationMode}</code>
          </div>
        </div>

        {/* Highlight layer details */}
        {scenario.highlightLayers.length > 0 && (
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
            {scenario.highlightLayers.map(layer => (
              <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: layer.color,
                  }}
                />
                <span>{layer.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick navigation */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => goToScenario(currentScenarioIndex - 1)}
            disabled={currentScenarioIndex === 0}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: currentScenarioIndex === 0 ? '#1e293b' : '#334155',
              border: '1px solid #475569',
              borderRadius: 4,
              color: currentScenarioIndex === 0 ? '#475569' : '#e2e8f0',
              cursor: currentScenarioIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12,
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => goToScenario(0)}
            style={{
              padding: '6px 12px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 4,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Reset
          </button>
          <button
            onClick={() => goToScenario(currentScenarioIndex + 1)}
            disabled={currentScenarioIndex === testScenarios.length - 1}
            style={{
              flex: 1,
              padding: '6px 12px',
              background:
                currentScenarioIndex === testScenarios.length - 1 ? '#1e293b' : '#334155',
              border: '1px solid #475569',
              borderRadius: 4,
              color:
                currentScenarioIndex === testScenarios.length - 1 ? '#475569' : '#e2e8f0',
              cursor:
                currentScenarioIndex === testScenarios.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: 12,
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Transition log */}
      {transitionLog.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: 12,
            color: '#94a3b8',
            fontFamily: 'monospace',
            fontSize: 10,
            maxWidth: 400,
          }}
        >
          <div style={{ marginBottom: 4, color: '#64748b', fontWeight: 600 }}>
            Transition Log:
          </div>
          {transitionLog.map((log, i) => (
            <div key={i} style={{ opacity: 0.5 + (i / transitionLog.length) * 0.5 }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Scenario indicator pills */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          display: 'flex',
          gap: 4,
        }}
      >
        {testScenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goToScenario(i)}
            title={s.name}
            style={{
              width: i === currentScenarioIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === currentScenarioIndex ? '#3b82f6' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const TourScenarioTester: Story = {
  render: () => <TourScenarioTesterTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Interactive tester for all tour scenarios. See docs/TOUR_TEST_SCENARIOS.md for documentation.',
      },
    },
  },
};

/**
 * Camera Controls - Test programmatic camera rotation and movement
 */
const CameraControlsTemplate: React.FC = () => {
  const [currentAngle, setCurrentAngle] = React.useState<number | null>(null);
  const [currentTilt, setCurrentTilt] = React.useState<number | null>(null);
  const [currentTarget, setCurrentTarget] = React.useState<{ x: number; y: number; z: number } | null>(null);
  const [customAngle, setCustomAngle] = React.useState(0);
  const [duration, setDuration] = React.useState<number | undefined>(undefined);

  // Update angle, tilt, and target display periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const angle = getCameraAngle();
      const tilt = getCameraTilt();
      const target = getCameraTarget();
      if (angle !== null) {
        setCurrentAngle(Math.round(angle));
      }
      if (tilt !== null) {
        setCurrentTilt(Math.round(tilt));
      }
      if (target !== null) {
        setCurrentTarget({
          x: Math.round(target.x),
          y: Math.round(target.y),
          z: Math.round(target.z),
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Get rotation options based on current duration setting
  const getRotateOptions = () => duration ? { duration } : undefined;

  const buttonStyle = {
    padding: '10px 16px',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500 as const,
    minWidth: 80,
  };

  const directionButtonStyle = {
    ...buttonStyle,
    width: 60,
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    gap: 2,
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
        animation={{
          startFlat: true,
          autoStartDelay: 600,
          staggerDelay: 8,
          tension: 140,
          friction: 14,
        }}
        showControls={false}
      />

      {/* Camera controls panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 16,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          minWidth: 280,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>
          Camera Controls
        </h3>

        {/* Current angle and tilt display */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#1e293b',
              padding: '8px 12px',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Rotation</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#3b82f6' }}>
              {currentAngle !== null ? `${currentAngle}°` : '—'}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: '#1e293b',
              padding: '8px 12px',
              borderRadius: 6,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tilt</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#22c55e' }}>
              {currentTilt !== null ? `${currentTilt}°` : '—'}
            </div>
          </div>
        </div>

        {/* Duration control */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Animation Duration: {duration ? `${duration}ms` : 'Spring (default)'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[undefined, 500, 1000, 2000, 3000, 5000].map((d) => (
              <button
                key={d ?? 'spring'}
                onClick={() => setDuration(d)}
                style={{
                  padding: '6px 10px',
                  background: duration === d ? '#3b82f6' : '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 4,
                  color: duration === d ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {d ? `${d}ms` : 'Spring'}
              </button>
            ))}
          </div>
        </div>

        {/* Cardinal direction buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Cardinal Directions</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 60px)',
              gridTemplateRows: 'repeat(3, 60px)',
              gap: 4,
              justifyContent: 'center',
            }}
          >
            <div /> {/* Empty top-left */}
            <button
              onClick={() => rotateCameraTo('north', getRotateOptions())}
              style={directionButtonStyle}
              title="North (180°)"
            >
              <span style={{ fontSize: 16 }}>N</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>180°</span>
            </button>
            <div /> {/* Empty top-right */}

            <button
              onClick={() => rotateCameraTo('west', getRotateOptions())}
              style={directionButtonStyle}
              title="West (90°)"
            >
              <span style={{ fontSize: 16 }}>W</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>90°</span>
            </button>
            <button
              onClick={() => resetCamera()}
              style={{
                ...directionButtonStyle,
                background: '#1e293b',
              }}
              title="Reset Camera"
            >
              <span style={{ fontSize: 12 }}>Reset</span>
            </button>
            <button
              onClick={() => rotateCameraTo('east', getRotateOptions())}
              style={directionButtonStyle}
              title="East (270°)"
            >
              <span style={{ fontSize: 16 }}>E</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>270°</span>
            </button>

            <div /> {/* Empty bottom-left */}
            <button
              onClick={() => rotateCameraTo('south', getRotateOptions())}
              style={directionButtonStyle}
              title="South (0°)"
            >
              <span style={{ fontSize: 16 }}>S</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>0°</span>
            </button>
            <div /> {/* Empty bottom-right */}
          </div>
        </div>

        {/* Custom angle input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Custom Angle</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="range"
              min={0}
              max={360}
              value={customAngle}
              onChange={e => setCustomAngle(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={0}
              max={360}
              value={customAngle}
              onChange={e => setCustomAngle(Number(e.target.value))}
              style={{
                width: 60,
                padding: '4px 8px',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 4,
                color: '#e2e8f0',
                fontSize: 13,
                textAlign: 'center',
              }}
            />
            <button
              onClick={() => rotateCameraTo(customAngle, getRotateOptions())}
              style={{ ...buttonStyle, minWidth: 50 }}
            >
              Go
            </button>
          </div>
        </div>

        {/* Quick angle presets */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Quick Angles (shortest path)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
              <button
                key={angle}
                onClick={() => rotateCameraTo(angle, getRotateOptions())}
                style={{
                  padding: '6px 10px',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: 4,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>

        {/* Relative rotation */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Rotate (horizontal arc)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => rotateCameraBy(-90, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Counter-clockwise 90°"
            >
              -90° CCW
            </button>
            <button
              onClick={() => rotateCameraBy(-45, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Counter-clockwise 45°"
            >
              -45°
            </button>
            <button
              onClick={() => rotateCameraBy(45, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Clockwise 45°"
            >
              +45°
            </button>
            <button
              onClick={() => rotateCameraBy(90, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Clockwise 90°"
            >
              +90° CW
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={() => rotateCameraBy(-180, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Counter-clockwise 180°"
            >
              -180° CCW
            </button>
            <button
              onClick={() => rotateCameraBy(180, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Clockwise 180°"
            >
              +180° CW
            </button>
            <button
              onClick={() => rotateCameraBy(360, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Full rotation clockwise"
            >
              +360° Full
            </button>
          </div>
        </div>

        {/* Tilt presets */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Tilt Presets (vertical arc)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => tiltCameraTo('top', getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Top-down view (15°)"
            >
              Top (15°)
            </button>
            <button
              onClick={() => tiltCameraTo('high', getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="High angle (35°)"
            >
              High (35°)
            </button>
            <button
              onClick={() => tiltCameraTo('low', getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Low angle (60°)"
            >
              Low (60°)
            </button>
            <button
              onClick={() => tiltCameraTo('level', getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Level view (80°)"
            >
              Level (80°)
            </button>
          </div>
        </div>

        {/* Relative tilt */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Tilt By (+ = down, - = up)</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => tiltCameraBy(-30, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Tilt up 30°"
            >
              -30° Up
            </button>
            <button
              onClick={() => tiltCameraBy(-15, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Tilt up 15°"
            >
              -15°
            </button>
            <button
              onClick={() => tiltCameraBy(15, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Tilt down 15°"
            >
              +15°
            </button>
            <button
              onClick={() => tiltCameraBy(30, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Tilt down 30°"
            >
              +30° Down
            </button>
          </div>
        </div>

        {/* Camera target */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
            Camera Target: {currentTarget ? `(${currentTarget.x}, ${currentTarget.y}, ${currentTarget.z})` : '—'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setCameraTarget(0, 0, 0, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at center"
            >
              Center
            </button>
            <button
              onClick={() => setCameraTarget(-40, 0, -40, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at top-left area"
            >
              Top-Left
            </button>
            <button
              onClick={() => setCameraTarget(40, 0, 40, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at bottom-right area"
            >
              Bottom-Right
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={() => setCameraTarget(20, 0, 0, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at right side"
            >
              Right (+X)
            </button>
            <button
              onClick={() => setCameraTarget(-20, 0, 0, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at left side"
            >
              Left (-X)
            </button>
            <button
              onClick={() => setCameraTarget(0, 0, 30, getRotateOptions())}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
              title="Look at front"
            >
              Front (+Z)
            </button>
          </div>
        </div>

        {/* Move to coordinates */}
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Move to Position</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => moveCameraTo(0, 0, 50)}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
            >
              Center
            </button>
            <button
              onClick={() => moveCameraTo(-50, -50, 40)}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
            >
              Top-Left
            </button>
            <button
              onClick={() => moveCameraTo(50, 50, 40)}
              style={{ ...buttonStyle, flex: 1, fontSize: 11 }}
            >
              Bottom-Right
            </button>
          </div>
        </div>
      </div>

      {/* Angle reference */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 12,
          color: '#94a3b8',
          fontFamily: 'monospace',
          fontSize: 11,
          maxWidth: 200,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#3b82f6' }}>Rotation (horizontal)</div>
        <div>0° = South (default)</div>
        <div>90° = West</div>
        <div>180° = North</div>
        <div>270° = East</div>
        <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#22c55e' }}>Tilt (vertical)</div>
          <div>0° = Top-down</div>
          <div>45° = Diagonal</div>
          <div>90° = Level/Horizontal</div>
        </div>
        <div style={{ marginTop: 8, borderTop: '1px solid #334155', paddingTop: 8 }}>
          <div style={{ color: '#e2e8f0', marginBottom: 4 }}>Direction</div>
          <div>Rotate: + = CW, - = CCW</div>
          <div>Tilt: + = down, - = up</div>
        </div>
      </div>
    </div>
  );
};

export const CameraControls: Story = {
  render: () => <CameraControlsTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Test programmatic camera rotation and movement. Use cardinal direction buttons, custom angles, or position buttons to control the camera.',
      },
    },
  },
};

/**
 * 2D to 3D Transition - Tests the camera angle adjustment when transitioning from flat to grown
 * Camera starts top-down when flat, then animates to an angled view when buildings grow
 */
const FlatToGrownTransitionTemplate: React.FC = () => {
  const [isGrown, setIsGrown] = React.useState(false);
  const [autoTransition, setAutoTransition] = React.useState(false);
  const [adaptCamera, setAdaptCamera] = React.useState(true);

  // Auto-transition effect (simulates the CodeCityPanel behavior)
  React.useEffect(() => {
    if (!autoTransition) return;
    setIsGrown(false);
    const timer = setTimeout(() => {
      setIsGrown(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [autoTransition]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 3D City */}
      <FileCity3D
        cityData={sampleCityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        isGrown={isGrown}
        adaptCameraToBuildings={adaptCamera}
        animation={{
          startFlat: true,
          autoStartDelay: null, // External control
          staggerDelay: 15,
          tension: 120,
          friction: 14,
        }}
        showControls={true}
      />

      {/* Control panel */}
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
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>
            State: <strong style={{ color: isGrown ? '#22c55e' : '#f59e0b' }}>{isGrown ? 'GROWN' : 'FLAT'}</strong>
          </div>
          <button
            onClick={() => setIsGrown(false)}
            style={{
              padding: '8px 16px',
              background: !isGrown ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Flatten (2D)
          </button>
          <button
            onClick={() => setIsGrown(true)}
            style={{
              padding: '8px 16px',
              background: isGrown ? '#3b82f6' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Grow (3D)
          </button>
          <button
            onClick={() => {
              setAutoTransition(false);
              setTimeout(() => setAutoTransition(true), 10);
            }}
            style={{
              padding: '8px 16px',
              background: '#7c3aed',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Simulate 2D→3D Transition
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={adaptCamera}
              onChange={(e) => setAdaptCamera(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Adapt to building heights
          </label>
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
          Camera should start top-down when flat, then animate to angled view when grown.
          {adaptCamera && ' Camera height will adjust based on tallest building.'}
        </div>
      </div>
    </div>
  );
};

export const FlatToGrownTransition: Story = {
  render: () => <FlatToGrownTransitionTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Tests the camera angle adjustment when transitioning between flat (2D) and grown (3D) states. ' +
          'The camera should start with a top-down view when buildings are flat, then animate to an angled view when buildings grow. ' +
          'Use "Simulate 2D→3D Transition" to test the full transition sequence as it happens in CodeCityPanel.',
      },
    },
  },
};
