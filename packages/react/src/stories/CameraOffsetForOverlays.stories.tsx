import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  setCameraTarget,
  setCameraFlatView,
  getCameraTarget,
  getCameraPosition,
  type CityData,
  type CityBuilding,
  type CityDistrict,
} from '../components/FileCity3D';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/CameraOffsetForOverlays',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// --- sample city ---------------------------------------------------------
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

// --- story template ------------------------------------------------------

// FileCity3D re-centers the city around world origin internally (subtracts
// the bounds center from every building position), so the rendered city
// center sits at (0, 0, 0) — NOT at the bounds center of the input data.
const CITY_CENTER_X = 0;
const CITY_CENTER_Z = 0;

/**
 * Compute the world-space delta to apply to the camera target so the city
 * center appears at the visible-rect center (canvas minus overlays) instead
 * of the canvas center. Assumes a roughly top-down camera (flat / 2D mode).
 *
 * Math: the camera target always projects to canvas center. To make the city
 * center *appear* at visibleCenter, set target = cityCenter + (canvasCenter -
 * visibleCenter), expressed in world units.
 */
function computeOverlayShift(opts: {
  canvasW: number;
  canvasH: number;
  overlayTopPx: number;
  overlayBottomPx: number;
  overlayLeftPx: number;
  overlayRightPx: number;
  cameraHeightWorld: number; // y of camera in world units
  fovDeg?: number;
}) {
  const { canvasW, canvasH, overlayTopPx, overlayBottomPx, overlayLeftPx, overlayRightPx, cameraHeightWorld } = opts;
  const fov = opts.fovDeg ?? 50;

  // Visible world span at ground plane (perspective camera looking down).
  const fovRad = (fov * Math.PI) / 180;
  const visibleWorldH = 2 * cameraHeightWorld * Math.tan(fovRad / 2);
  const aspect = canvasW / canvasH;
  const visibleWorldW = visibleWorldH * aspect;
  const worldPerPxX = visibleWorldW / canvasW;
  const worldPerPxZ = visibleWorldH / canvasH;

  const visibleCenterX = (overlayLeftPx + (canvasW - overlayRightPx)) / 2;
  const visibleCenterY = (overlayTopPx + (canvasH - overlayBottomPx)) / 2;
  const canvasCenterX = canvasW / 2;
  const canvasCenterY = canvasH / 2;

  // px delta: positive when canvas center is to the right of / below the visible center.
  const dxPx = canvasCenterX - visibleCenterX;
  const dyPx = canvasCenterY - visibleCenterY;

  // In a top-down view, screen +X = world +X, screen +Y (down) = world +Z.
  return {
    dxWorld: dxPx * worldPerPxX,
    dzWorld: dyPx * worldPerPxZ,
    visibleCenterX,
    visibleCenterY,
    worldPerPxX,
    worldPerPxZ,
  };
}

const CameraOffsetTemplate: React.FC = () => {
  // Default: bottom drawer covers 50%, side panels each cover 25%.
  const [overlayBottomPct, setOverlayBottomPct] = React.useState(50);
  const [overlayTopPct, setOverlayTopPct] = React.useState(0);
  const [overlayLeftPct, setOverlayLeftPct] = React.useState(25);
  const [overlayRightPct, setOverlayRightPct] = React.useState(25);
  const [target, setTarget] = React.useState<{ x: number; y: number; z: number } | null>(null);
  const [camHeight, setCamHeight] = React.useState<number | null>(null);
  const [duration, setDuration] = React.useState(500);

  // Capture the initial (auto-fit) flat-mode camera height once it's stable.
  // We use this as the "city fills the canvas" baseline, so repeated fits don't
  // compound and Reset can return to it.
  const initialHeightRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const id = setInterval(() => {
      const t = getCameraTarget();
      const p = getCameraPosition();
      if (t) setTarget({ x: +t.x.toFixed(1), y: +t.y.toFixed(1), z: +t.z.toFixed(1) });
      if (p) {
        setCamHeight(+p.y.toFixed(1));
        if (initialHeightRef.current === null && p.y > 1) {
          initialHeightRef.current = p.y;
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const shiftIntoVisibleArea = () => {
    const cam = getCameraPosition();
    if (!cam) return;
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    const { dxWorld, dzWorld } = computeOverlayShift({
      canvasW,
      canvasH,
      overlayTopPx: (overlayTopPct / 100) * canvasH,
      overlayBottomPx: (overlayBottomPct / 100) * canvasH,
      overlayLeftPx: (overlayLeftPct / 100) * canvasW,
      overlayRightPx: (overlayRightPct / 100) * canvasW,
      cameraHeightWorld: cam.y,
    });
    setCameraTarget(CITY_CENTER_X + dxWorld, 0, CITY_CENTER_Z + dzWorld, { duration });
  };

  // Fit the city *into* the visible rect (shrink + pan). At the initial
  // baseline height the city fills the whole canvas; raising the camera by
  // 1/fraction makes the city appear at the size of the visible sub-rect.
  // Then we shift the target so the city center lands at the visible center.
  const fitIntoVisibleArea = () => {
    const baseline = initialHeightRef.current;
    if (baseline === null) return;
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    const visW = canvasW * (1 - overlayLeftPct / 100 - overlayRightPct / 100);
    const visH = canvasH * (1 - overlayTopPct / 100 - overlayBottomPct / 100);
    const fraction = Math.min(visW / canvasW, visH / canvasH);
    if (fraction <= 0) return;
    const newHeight = baseline / fraction;

    const { dxWorld, dzWorld } = computeOverlayShift({
      canvasW,
      canvasH,
      overlayTopPx: (overlayTopPct / 100) * canvasH,
      overlayBottomPx: (overlayBottomPct / 100) * canvasH,
      overlayLeftPx: (overlayLeftPct / 100) * canvasW,
      overlayRightPx: (overlayRightPct / 100) * canvasW,
      cameraHeightWorld: newHeight,
    });
    setCameraFlatView(CITY_CENTER_X + dxWorld, CITY_CENTER_Z + dzWorld, newHeight, { duration });
  };

  const recenter = () => {
    const baseline = initialHeightRef.current;
    if (baseline !== null) {
      setCameraFlatView(CITY_CENTER_X, CITY_CENTER_Z, baseline, { duration });
    } else {
      setCameraTarget(CITY_CENTER_X, 0, CITY_CENTER_Z, { duration });
    }
  };

  const nudge = (dx: number, dz: number) => {
    const t = getCameraTarget();
    if (!t) return;
    setCameraTarget(t.x + dx, 0, t.z + dz, { duration });
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <FileCity3D
        cityData={sampleCityData}
        height="100vh"
        showControls={false}
        animation={{ startFlat: true, autoStartDelay: null }}
      />

      {/* Overlays — semi-transparent so you can see how the city sits behind them */}
      {overlayTopPct > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${overlayTopPct}%`,
            background: 'rgba(99, 102, 241, 0.25)',
            borderBottom: '2px dashed rgba(99, 102, 241, 0.8)',
            pointerEvents: 'none',
          }}
        />
      )}
      {overlayBottomPct > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${overlayBottomPct}%`,
            background: 'rgba(99, 102, 241, 0.25)',
            borderTop: '2px dashed rgba(99, 102, 241, 0.8)',
            pointerEvents: 'none',
          }}
        />
      )}
      {overlayLeftPct > 0 && (
        <div
          style={{
            position: 'absolute',
            top: `${overlayTopPct}%`,
            bottom: `${overlayBottomPct}%`,
            left: 0,
            width: `${overlayLeftPct}%`,
            background: 'rgba(244, 114, 182, 0.25)',
            borderRight: '2px dashed rgba(244, 114, 182, 0.8)',
            pointerEvents: 'none',
          }}
        />
      )}
      {overlayRightPct > 0 && (
        <div
          style={{
            position: 'absolute',
            top: `${overlayTopPct}%`,
            bottom: `${overlayBottomPct}%`,
            right: 0,
            width: `${overlayRightPct}%`,
            background: 'rgba(244, 114, 182, 0.25)',
            borderLeft: '2px dashed rgba(244, 114, 182, 0.8)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Visible-area marker (for sanity) */}
      <div
        style={{
          position: 'absolute',
          top: `${overlayTopPct}%`,
          bottom: `${overlayBottomPct}%`,
          left: `${overlayLeftPct}%`,
          right: `${overlayRightPct}%`,
          border: '1px dashed rgba(34, 197, 94, 0.8)',
          pointerEvents: 'none',
        }}
      />

      {/* Control panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: 16,
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          width: 280,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
          Camera offset for overlays
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Bottom overlay: {overlayBottomPct}%</label>
          <input
            type="range"
            min={0}
            max={80}
            value={overlayBottomPct}
            onChange={e => setOverlayBottomPct(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Top overlay: {overlayTopPct}%</label>
          <input
            type="range"
            min={0}
            max={80}
            value={overlayTopPct}
            onChange={e => setOverlayTopPct(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Left overlay: {overlayLeftPct}%</label>
          <input
            type="range"
            min={0}
            max={50}
            value={overlayLeftPct}
            onChange={e => setOverlayLeftPct(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Right overlay: {overlayRightPct}%</label>
          <input
            type="range"
            min={0}
            max={50}
            value={overlayRightPct}
            onChange={e => setOverlayRightPct(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Animation duration: {duration}ms</label>
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={duration}
            onChange={e => setDuration(+e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={fitIntoVisibleArea} style={{ ...buttonStyle, flex: 1, background: '#2563eb', border: '1px solid #3b82f6' }}>
            Fit into visible area
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={shiftIntoVisibleArea} style={{ ...buttonStyle, flex: 1 }}>
            Shift only (no shrink)
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button onClick={recenter} style={{ ...buttonStyle, flex: 1 }}>
            Recenter (flat)
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Manual nudge (world units)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 12 }}>
          <div />
          <button onClick={() => nudge(0, -10)} style={{ ...buttonStyle, padding: '6px 4px' }}>↑ -Z</button>
          <div />
          <button onClick={() => nudge(-10, 0)} style={{ ...buttonStyle, padding: '6px 4px' }}>← -X</button>
          <button onClick={recenter} style={{ ...buttonStyle, padding: '6px 4px' }}>•</button>
          <button onClick={() => nudge(10, 0)} style={{ ...buttonStyle, padding: '6px 4px' }}>+X →</button>
          <div />
          <button onClick={() => nudge(0, 10)} style={{ ...buttonStyle, padding: '6px 4px' }}>+Z ↓</button>
          <div />
        </div>

        <div style={{ fontSize: 11, color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: 8 }}>
          target: {target ? `(${target.x}, ${target.y}, ${target.z})` : '—'}
          <br />
          camera height: {camHeight ?? '—'}
          {initialHeightRef.current !== null && ` (baseline ${initialHeightRef.current.toFixed(1)})`}
          <br />
          city center: ({CITY_CENTER_X.toFixed(1)}, 0, {CITY_CENTER_Z.toFixed(1)})
        </div>
      </div>
    </div>
  );
};

export const CameraOffsetForOverlays: Story = {
  render: () => <CameraOffsetTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates panning the city out from under UI overlays in 2D mode by shifting the camera target with `setCameraTarget`. ' +
          'Adjust the overlay sliders, then click "Shift into visible area" — the city center should align with the green dashed visible rect.',
      },
    },
  },
};
