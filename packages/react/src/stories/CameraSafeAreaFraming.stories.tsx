import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  getCameraTarget,
  getCameraPosition,
  rotateCameraBy,
  tiltCameraTo,
  type CityData,
  type CityBuilding,
  type CityDistrict,
  type SafeArea,
} from '../components/FileCity3D';

/**
 * Verification harness for declarative `safeArea` framing (single-owner design).
 *
 * The flat camera has ONE writer — a per-frame owner that eases toward the pose
 * `computeFlatPose(footprint, viewport, safeArea)` defines. Apply the safe area
 * and the city should travel into the green rect and hold there (badge HELD ✓);
 * Clear returns to the full-canvas overview.
 */
const meta: Meta<typeof FileCity3D> = {
  title: 'Components/CameraSafeAreaFraming',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// --- sample city ----------------------------------------------------------
const CODE_EXTS = ['ts', 'tsx', 'js', 'py', 'rs', 'go'];
const NON_CODE_EXTS = ['json', 'css', 'md', 'yaml'];

function generateBuildings(
  basePath: string,
  count: number,
  startX: number,
  startZ: number,
  areaWidth: number,
  areaDepth: number,
): CityBuilding[] {
  const buildings: CityBuilding[] = [];
  const exts = [...CODE_EXTS, ...NON_CODE_EXTS];
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ext = exts[i % exts.length];
    const isCode = CODE_EXTS.includes(ext);
    const lineCount = isCode ? 40 + ((i * 37) % 400) : undefined;
    const size = isCode ? lineCount! * 40 : 1000 + ((i * 9973) % 200000);
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

const districts: CityDistrict[] = [
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
    path: 'tests',
    worldBounds: { minX: -2, maxX: 32, minZ: 48, maxZ: 72 },
    fileCount: 5,
    type: 'directory',
    label: { text: 'tests', bounds: { minX: -2, maxX: 32, minZ: 72, maxZ: 76 }, position: 'bottom' },
  },
];

const sampleCityData: CityData = {
  buildings: [
    ...generateBuildings('src', 12, 0, 0, 40, 40),
    ...generateBuildings('src/components', 8, 50, 0, 30, 30),
    ...generateBuildings('tests', 5, 0, 50, 30, 20),
  ],
  districts,
  bounds: { minX: -5, maxX: 85, minZ: -5, maxZ: 80 },
  metadata: { totalFiles: 25, totalDirectories: 3, rootPath: '/project', analyzedAt: new Date() },
};

// Overlay insets (fractions) mimicking the trail panel: left description, right
// snippet pane, bottom sequence drawer. The visual zones use the same numbers.
const OVERLAY: SafeArea = { top: 0, bottom: 0.22, left: 0.28, right: 0.3 };

const pct = (n: number | undefined) => `${(n ?? 0) * 100}%`;

const SafeAreaTemplate: React.FC = () => {
  const [safeAreaOn, setSafeAreaOn] = React.useState(false);
  const safeArea = safeAreaOn ? OVERLAY : undefined;

  // 2D (flat) vs 3D (grown). The grown overview now frames through the
  // safeArea-aware compute3DPose, so toggling to 3D with the safe area on should
  // keep the city inside the green inner rect instead of centering on the full
  // canvas.
  const [grown, setGrown] = React.useState(false);

  // Directories live OFF-center (src/components to the right, tests toward the
  // back), so a focus that respects the safe area must pan the directory into
  // the green inner rect — not drop it dead-center of the full canvas.
  const [focusDir, setFocusDir] = React.useState<string | null>(null);
  const FOCUS_DIRS = ['src', 'src/components', 'tests'];

  const [target, setTarget] = React.useState<{ x: number; z: number } | null>(null);
  const [camHeight, setCamHeight] = React.useState<number | null>(null);
  const fitRef = React.useRef<{ x: number; z: number; h: number } | null>(null);
  const [moved, setMoved] = React.useState<null | { dx: number; dz: number; dh: number }>(null);

  React.useEffect(() => {
    const id = setInterval(() => {
      const t = getCameraTarget();
      const p = getCameraPosition();
      if (t) setTarget({ x: +t.x.toFixed(1), z: +t.z.toFixed(1) });
      if (p) setCamHeight(+p.y.toFixed(1));
      const fit = fitRef.current;
      if (fit && t && p) {
        const dx = +(t.x - fit.x).toFixed(1);
        const dz = +(t.z - fit.z).toFixed(1);
        const dh = +(p.y - fit.h).toFixed(1);
        if (Math.abs(dx) > 3 || Math.abs(dz) > 3 || Math.abs(dh) > 3) {
          setMoved({ dx, dz, dh });
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // After a safe-area change settles, capture the framing as the baseline.
  const captureAfterSettle = () => {
    setMoved(null);
    fitRef.current = null;
    window.setTimeout(() => {
      const t = getCameraTarget();
      const p = getCameraPosition();
      if (t && p) fitRef.current = { x: t.x, z: t.z, h: p.y };
    }, 1200);
  };

  const applySafeArea = () => {
    setSafeAreaOn(true);
    captureAfterSettle();
  };
  const focus = (dir: string | null) => {
    setFocusDir(dir);
    captureAfterSettle();
  };
  const clearSafeArea = () => {
    setSafeAreaOn(false);
    setMoved(null);
    fitRef.current = null;
  };

  const held = fitRef.current !== null && moved === null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <FileCity3D
        cityData={sampleCityData}
        height="100vh"
        showControls={false}
        safeArea={safeArea}
        focusDirectory={focusDir}
        isGrown={grown}
        animation={{ startFlat: true, autoStartDelay: null }}
      />

      <Zone style={{ left: 0, top: 0, bottom: 0, width: pct(OVERLAY.left), background: 'rgba(244,114,182,0.18)', borderRight: '2px dashed rgba(244,114,182,0.8)' }} />
      <Zone style={{ right: 0, top: 0, bottom: 0, width: pct(OVERLAY.right), background: 'rgba(244,114,182,0.18)', borderLeft: '2px dashed rgba(244,114,182,0.8)' }} />
      <Zone style={{ left: 0, right: 0, bottom: 0, height: pct(OVERLAY.bottom), background: 'rgba(99,102,241,0.18)', borderTop: '2px dashed rgba(99,102,241,0.8)' }} />
      <Zone
        style={{
          top: pct(OVERLAY.top),
          bottom: pct(OVERLAY.bottom),
          left: pct(OVERLAY.left),
          right: pct(OVERLAY.right),
          border: '1px dashed rgba(34,197,94,0.9)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 16,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          width: 300,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Safe-area framing probe</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
          Apply the safe area — the city should travel into the green rect and
          hold (badge = HELD). Drag to pan; it stays until the next reframe.
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={() => { setGrown(false); captureAfterSettle(); }}
            style={{ ...btn, flex: 1, background: !grown ? '#2563eb' : '#334155', border: '1px solid #3b82f6' }}
          >
            2D (flat)
          </button>
          <button
            onClick={() => { setGrown(true); captureAfterSettle(); }}
            style={{ ...btn, flex: 1, background: grown ? '#2563eb' : '#334155', border: '1px solid #3b82f6' }}
          >
            3D (grown)
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={applySafeArea} style={{ ...btn, flex: 1, background: safeAreaOn ? '#2563eb' : '#334155', border: '1px solid #3b82f6' }}>
            Apply safe area
          </button>
          <button onClick={clearSafeArea} style={{ ...btn }}>Clear</button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
          Rotate / tilt (3D only) — the camera holds the new angle until the next
          reframe (Apply / Clear / resize), which re-engages framing.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          <button onClick={() => rotateCameraBy(-45)} disabled={!grown} style={{ ...btn, opacity: grown ? 1 : 0.4 }}>⟲ 45°</button>
          <button onClick={() => rotateCameraBy(45)} disabled={!grown} style={{ ...btn, opacity: grown ? 1 : 0.4 }}>45° ⟳</button>
          <button onClick={() => tiltCameraTo('high')} disabled={!grown} style={{ ...btn, opacity: grown ? 1 : 0.4 }}>Tilt high</button>
          <button onClick={() => tiltCameraTo('low')} disabled={!grown} style={{ ...btn, opacity: grown ? 1 : 0.4 }}>Tilt low</button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
          Focus a directory — with the safe area on it should land inside the
          green rect, not dead-center of the canvas.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {FOCUS_DIRS.map((dir) => (
            <button
              key={dir}
              onClick={() => focus(dir)}
              style={{ ...btn, background: focusDir === dir ? '#2563eb' : '#334155', border: '1px solid #3b82f6' }}
            >
              {dir}
            </button>
          ))}
          <button onClick={() => focus(null)} style={{ ...btn, background: focusDir === null ? '#2563eb' : '#334155' }}>
            Overview
          </button>
        </div>

        <div
          style={{
            marginTop: 4,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: fitRef.current === null ? '#1e293b' : held ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${fitRef.current === null ? '#334155' : held ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.9)'}`,
            color: fitRef.current === null ? '#94a3b8' : held ? '#86efac' : '#fca5a5',
          }}
        >
          {fitRef.current === null
            ? 'Since apply: — (click Apply safe area)'
            : held
              ? 'Since apply: HELD ✓ (framing steady)'
              : `Since apply: MOVED ✗  Δtarget=(${moved!.dx}, ${moved!.dz})  Δheight=${moved!.dh}`}
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: 8, marginTop: 10 }}>
          mode: {grown ? '3D' : '2D'} · safeArea: {safeAreaOn ? 'on' : 'off'} · focus: {focusDir ?? 'overview'} · target: {target ? `(${target.x}, ${target.z})` : '—'} · height: {camHeight ?? '—'}
        </div>
      </div>
    </div>
  );
};

const Zone: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div style={{ position: 'absolute', pointerEvents: 'none', ...style }} />
);

const btn: React.CSSProperties = {
  padding: '8px 12px',
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: 6,
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

export const SafeAreaFraming: Story = {
  render: () => <SafeAreaTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Single-owner declarative framing. Click **Apply safe area** — the per-frame owner eases the city into the green inner rect and holds it (badge **HELD ✓**) across re-renders and resize. **Clear** returns to the full-canvas overview. Drag to pan/zoom; the owner stands down during interaction and re-engages on the next reframe (Apply/Clear/resize).\n\nToggle **3D (grown)** — the grown overview now frames through `compute3DPose`, the safeArea-aware angled analog of `computeFlatPose`, so with the safe area on the city sits inside the green inner rect (clear of the overlay zones) instead of centering on the full canvas. Apply the safe area before or after toggling; both paths reframe. Horizontal centering is exact; vertical is a first-order tilt correction, so expect the city centered in the green rect but not pixel-perfect.\n\nTurn the safe area on, then **Focus a directory** (`src/components`, `tests`) — in **2D** the focused footprint is framed inside the green inner rect via the same `computeFlatPose` authority. In **3D** the directory close-up is not yet inset-aware (tracked follow-up), so a 3D focus will not land in the green rect — that is expected, not a regression.',
      },
    },
  },
};
