import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CityData,
  type CityBuilding,
  type CityDistrict,
  type SafeArea,
} from '../components/FileCity3D';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/OnCameraReadyRepoSwitcher',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// ---------------------------------------------------------------------------
// Two distinct city layouts to simulate repo switching
// ---------------------------------------------------------------------------
const EXTS = ['ts', 'tsx', 'js', 'json', 'md', 'css'];

function makeBuildings(
  prefix: string,
  count: number,
  areaWidth: number,
  areaDepth: number,
): CityBuilding[] {
  const cols = Math.ceil(Math.sqrt(count));
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ext = EXTS[i % EXTS.length];
    const lines = 30 + ((i * 37) % 400);
    return {
      path: `${prefix}/file${i}.${ext}`,
      position: {
        x: (col / cols) * areaWidth + areaWidth / cols / 2,
        y: 0,
        z: (row / cols) * areaDepth + areaDepth / cols / 2,
      },
      dimensions: [(areaWidth / cols) * 0.7, 10, (areaDepth / cols) * 0.7],
      type: 'file',
      fileExtension: ext,
      size: lines * 40,
      lineCount: lines,
    };
  });
}

const districtsA: CityDistrict[] = [
  { path: 'src', worldBounds: { minX: -2, maxX: 42, minZ: -2, maxZ: 42 }, fileCount: 16, type: 'directory', label: { text: 'src', bounds: { minX: -2, maxX: 42, minZ: 42, maxZ: 46 }, position: 'bottom' } },
  { path: 'docs', worldBounds: { minX: 48, maxX: 82, minZ: -2, maxZ: 32 }, fileCount: 6, type: 'directory', label: { text: 'docs', bounds: { minX: 48, maxX: 82, minZ: 32, maxZ: 36 }, position: 'bottom' } },
];

const districtsB: CityDistrict[] = [
  { path: 'packages/core', worldBounds: { minX: -2, maxX: 32, minZ: -2, maxZ: 26 }, fileCount: 12, type: 'directory', label: { text: 'packages/core', bounds: { minX: -2, maxX: 32, minZ: 26, maxZ: 30 }, position: 'bottom' } },
  { path: 'packages/ui', worldBounds: { minX: -2, maxX: 32, minZ: 32, maxZ: 56 }, fileCount: 8, type: 'directory', label: { text: 'packages/ui', bounds: { minX: -2, maxX: 32, minZ: 56, maxZ: 60 }, position: 'bottom' } },
  { path: 'apps/cloud', worldBounds: { minX: 38, maxX: 72, minZ: -2, maxZ: 28 }, fileCount: 10, type: 'directory', label: { text: 'apps/cloud', bounds: { minX: 38, maxX: 72, minZ: 28, maxZ: 32 }, position: 'bottom' } },
];

const cityA: CityData = {
  buildings: [...makeBuildings('src', 16, 40, 40), ...makeBuildings('docs', 6, 30, 30)],
  districts: districtsA,
  bounds: { minX: -5, maxX: 85, minZ: -5, maxZ: 50 },
  metadata: { totalFiles: 22, totalDirectories: 2, rootPath: '/repo-a', analyzedAt: new Date() },
};

const cityB: CityData = {
  buildings: [
    ...makeBuildings('packages/core', 12, 30, 24),
    ...makeBuildings('packages/ui', 8, 30, 20),
    ...makeBuildings('apps/cloud', 10, 30, 26),
  ],
  districts: districtsB,
  bounds: { minX: -5, maxX: 78, minZ: -5, maxZ: 65 },
  metadata: { totalFiles: 30, totalDirectories: 3, rootPath: '/repo-b', analyzedAt: new Date() },
};

// ---------------------------------------------------------------------------
// Harness that precisely mimics the GuideStage pattern:
//   - FileCity3D is gated on cityData being non-null (unmounts on null)
//   - Container wrapped in visibility: hidden until onCameraReady fires
//   - cityVisible reset to false when cityData becomes null
//
// Two modes:
//   1. "remount": cityData goes null → mounts fresh (GuideStage flow)
//   2. "mounted": cityData changes identity while FileCity3D stays mounted
// ---------------------------------------------------------------------------
const btn: React.CSSProperties = {
  padding: '8px 16px',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 6,
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'system-ui, sans-serif',
};

// Safe-area inset mimicking a readme takeover panel (28% left, 30% right, 22% bottom)
const OVERLAY: SafeArea = { top: 0, bottom: 0.22, left: 0.28, right: 0.3 };

const RepoSwitcherHarness: React.FC = () => {
  const [active, setActive] = React.useState<'A' | 'B'>('A');
  const [log, setLog] = React.useState<string[]>([]);
  const [useSafeArea, setUseSafeArea] = React.useState(true);

  // Simulate the web-ade flow: repo switch → setFileTree(null) → cityData=null → new data loads
  const [simulateLoading, setSimulateLoading] = React.useState(false);

  // Delay between null and new data to simulate network
  const cityData = React.useMemo(() => {
    if (simulateLoading) return null;
    return active === 'A' ? cityA : cityB;
  }, [active, simulateLoading]);

  // === GuideStage pattern replicated exactly ===
  const [cityVisible, setCityVisible] = React.useState(false);
  const handleCameraReady = React.useCallback(() => {
    setLog((prev) => [...prev.slice(-5), `cameraReady @ ${Date.now()}`]);
    setCityVisible(true);
  }, []);

  // Reset visibility when cityData goes null (repo switch)
  React.useEffect(() => {
    if (!cityData) {
      setCityVisible(false);
      setLog((prev) => [...prev.slice(-5), `cityData=null @ ${Date.now()}`]);
    }
  }, [cityData]);

  const handleSwitch = (next: 'A' | 'B') => {
    setLog((prev) => [...prev.slice(-5), `switch to ${next} @ ${Date.now()}`]);
    // Simulate network: null first, then new data after 300ms
    setSimulateLoading(true);
    setActive(next);
    setTimeout(() => setSimulateLoading(false), 300);
  };

  const handleDirectSwitch = (next: 'A' | 'B') => {
    setLog((prev) => [...prev.slice(-5), `direct switch to ${next} @ ${Date.now()}`]);
    setActive(next);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0f172a' }}>
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 16,
          minWidth: 260,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>Repo switcher debug</div>

        {/* Simulate web-ade flow: null → new data */}
        <div style={{ fontSize: 11, color: '#94a3b8' }}>With loading (null → mount):</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => handleSwitch('A')} style={{ ...btn, flex: 1, background: active === 'A' && !simulateLoading ? '#2563eb' : '#334155' }}>Repo A</button>
          <button onClick={() => handleSwitch('B')} style={{ ...btn, flex: 1, background: active === 'B' && !simulateLoading ? '#2563eb' : '#334155' }}>Repo B</button>
        </div>

        {/* Direct switch: cityData changes identity while mounted */}
        {/* Safe-area toggle */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            onClick={() => setUseSafeArea((v) => !v)}
            style={{ ...btn, flex: 1, background: useSafeArea ? '#2563eb' : '#334155', border: '1px solid #3b82f6' }}
          >
            safeArea: {useSafeArea ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Direct (mounted, no null):</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => handleDirectSwitch('A')} style={{ ...btn, flex: 1, background: active === 'A' ? '#7c3aed' : '#334155' }}>A</button>
          <button onClick={() => handleDirectSwitch('B')} style={{ ...btn, flex: 1, background: active === 'B' ? '#7c3aed' : '#334155' }}>B</button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          cityVisible: <span style={{ color: cityVisible ? '#86efac' : '#fca5a5', fontWeight: 600 }}>{String(cityVisible)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          cityData: <span style={{ color: cityData ? '#86efac' : '#fca5a5', fontWeight: 600 }}>{cityData ? `${active} (${cityData.buildings.length}b)` : 'null'}</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', borderTop: '1px solid #334155', paddingTop: 8, marginTop: 4, maxHeight: 120, overflow: 'auto' }}>
          {log.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      </div>

      {/* === GuideStage pattern: gate + visibility === */}
      {cityData ? (
        <div style={{ visibility: cityVisible ? 'visible' : 'hidden', width: '100%', height: '100%' }}>
          <FileCity3D
            cityData={cityData}
            width="100%"
            height="100%"
            showControls={false}
            safeArea={useSafeArea ? OVERLAY : undefined}
            animation={{ startFlat: true, autoStartDelay: null }}
            backgroundColor="#0f172a"
            textColor="#94a3b8"
            onCameraReady={handleCameraReady}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
};

export const RepoSwitcherDebug: Story = {
  render: () => <RepoSwitcherHarness />,
  parameters: {
    docs: {
      description: {
        story:
          'Debug harness that exactly mimics the GuideStage pattern. Two modes: "With loading" (cityData goes null, then new data arrives — like web-ade) and "Direct" (cityData changes identity while FileCity3D stays mounted). Watch the cityVisible indicator — if the city appears with animation despite visibility:hidden + onCameraReady, there is a timing issue in how FileCity3D initializes.',
      },
    },
  },
};
