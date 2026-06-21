import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileCity3D, type CityData, type CityBuilding } from '../components/FileCity3D';

/**
 * Repro for the "welcome-screen overview sometimes fits to width, sometimes to
 * height on reload" bug.
 *
 * Root cause (FileCity3D.tsx):
 *   - The flat top-down overview is framed ONCE, in a one-shot guarded by
 *     `hasAppliedInitial` (the first paintable frame where the city is framable).
 *   - That one-shot reads `perspCam.aspect` right then and computes the camera
 *     height as `citySize / (2 * tanHalfFov * Math.min(1, aspect)) * 1.08`.
 *   - `Math.min(1, aspect)` makes the framing flip at aspect === 1: a portrait
 *     canvas (aspect < 1) frames the city's *width* to the viewport; a landscape
 *     canvas (aspect >= 1) frames its *height*.
 *   - There is NO re-frame on resize. Whatever aspect was captured in that first
 *     frame is frozen in for the life of the overview.
 *
 * In the real panel the canvas often mounts at a transient size (before the flex
 * layout applies the real width) and settles a frame or two later. Whether the
 * one-shot fires BEFORE or AFTER that settle is a frame-timing race — so the same
 * brief frames fit-to-width on one reload and fit-to-height on the next.
 *
 * This story makes the race explicit and controllable via `settleDelayMs`.
 */

const meta: Meta = {
  title: 'Components/FileCity3D/AspectRace (overview framing bug)',
  parameters: { layout: 'fullscreen' },
};
export default meta;

// ---------------------------------------------------------------------------
// A roughly-square city, so the portrait-vs-landscape framing difference is
// obvious: citySize is the same on both axes, so the only thing deciding which
// edge is snug is the captured viewport aspect.
// ---------------------------------------------------------------------------
function squareCity(): CityData {
  const GRID = 6;
  const STEP = 50;
  const FOOTPRINT = 34;
  const buildings: CityBuilding[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    buildings.push({
      path: `src/dir/file${i}.ts`,
      position: { x: col * STEP, y: 0, z: row * STEP },
      dimensions: [FOOTPRINT, 10, FOOTPRINT],
      type: 'file',
      fileExtension: '.ts',
      size: 5000,
      lineCount: 200,
    });
  }
  const min = -FOOTPRINT / 2;
  const max = (GRID - 1) * STEP + FOOTPRINT / 2;
  const bounds = { minX: min, maxX: max, minZ: min, maxZ: max };
  return {
    buildings,
    districts: [
      { path: 'src/dir', worldBounds: bounds, fileCount: buildings.length, type: 'directory' },
    ],
    bounds,
    metadata: {
      totalFiles: buildings.length,
      totalDirectories: 1,
      rootPath: '/repo',
      analyzedAt: new Date(),
    },
  };
}

const CITY = squareCity();

// Lock the component to the flat top-down overview (the welcome-screen state)
// and freeze framing inputs other than aspect, so the only variable is the
// container's aspect at the moment the one-shot fires.
const FLAT_OVERVIEW_PROPS = {
  cityData: CITY,
  isGrown: false as const,
  showControls: false,
  showInfoPanel: false,
};

// The transient mount size has aspect < 1 (portrait); the settled size has
// aspect > 1 (landscape). The framing flips across the aspect === 1 boundary.
const TRANSIENT = { width: 360, height: 680 }; // aspect ~0.53 -> frames to WIDTH
const SETTLED = { width: 960, height: 480 }; //  aspect ~2.00 -> frames to HEIGHT

// ===========================================================================
// Story 1 — the race, controllable.
//   settleDelayMs = 0   : layout settles before the one-shot -> always correct
//   settleDelayMs = 250 : one-shot fires while transient     -> always frozen-wrong
//   settleDelayMs ~ 30  : straddles the first paintable frame -> flaky, like prod
// ===========================================================================
const AspectRaceDemo: React.FC<{ settleDelayMs: number }> = ({ settleDelayMs }) => {
  const [mountKey, setMountKey] = React.useState(0);
  const [size, setSize] = React.useState(TRANSIENT);

  const reload = React.useCallback(() => {
    // Remount at the transient (portrait) size, then settle to the real
    // (landscape) size after `settleDelayMs` — mimicking the panel's layout
    // applying the real width a beat after the canvas mounts.
    setSize(TRANSIENT);
    setMountKey((k) => k + 1);
    window.setTimeout(() => setSize(SETTLED), settleDelayMs);
  }, [settleDelayMs]);

  // Kick off the first cycle on mount.
  React.useEffect(() => {
    const id = window.setTimeout(() => setSize(SETTLED), settleDelayMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={reload}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #475569',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          Reload brief
        </button>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          settle delay: <strong>{settleDelayMs}ms</strong> — 0 frames correct (fit-to-height),
          large freezes the transient framing (fit-to-width). Click Reload repeatedly with a small
          delay (~30ms) to see it flip.
        </span>
      </div>

      {/* Fixed landscape viewport. The INNER FileCity3D size is what races. */}
      <div
        style={{
          width: SETTLED.width,
          height: SETTLED.height,
          border: '1px dashed #475569',
          position: 'relative',
        }}
      >
        <FileCity3D key={mountKey} {...FLAT_OVERVIEW_PROPS} width={size.width} height={size.height} />
      </div>
    </div>
  );
};

export const AspectRace: StoryObj<{ settleDelayMs: number }> = {
  args: { settleDelayMs: 30 },
  argTypes: {
    settleDelayMs: { control: { type: 'range', min: 0, max: 250, step: 5 } },
  },
  render: (args) => <AspectRaceDemo settleDelayMs={args.settleDelayMs} />,
};

// ===========================================================================
// Story 2 — deterministic freeze + proof there is no re-frame on resize.
// Mounts portrait, grows to landscape after the one-shot has run. The overview
// stays framed for portrait (fit-to-width) inside a landscape viewport. The
// "Remount" button re-runs the one-shot at the current size and snaps it to the
// correct fit-to-height framing — proving the only fix path today is a remount.
// ===========================================================================
const StaleAspectDemo: React.FC = () => {
  const [mountKey, setMountKey] = React.useState(0);
  const [size, setSize] = React.useState(TRANSIENT);

  React.useEffect(() => {
    // Settle well after the one-shot fires, so the wrong aspect is guaranteed
    // to be captured and frozen.
    const id = window.setTimeout(() => setSize(SETTLED), 200);
    return () => window.clearTimeout(id);
  }, [mountKey]);

  const remount = React.useCallback(() => {
    setSize(SETTLED); // already landscape now; remounting re-frames correctly
    setMountKey((k) => k + 1);
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#e2e8f0' }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={remount}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #475569',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          Remount (re-run one-shot)
        </button>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          On load it captures the portrait aspect, then the container grows to landscape but the
          overview never re-frames. Remount to see it correct itself.
        </span>
      </div>
      <div
        style={{
          width: SETTLED.width,
          height: SETTLED.height,
          border: '1px dashed #475569',
          position: 'relative',
        }}
      >
        <FileCity3D key={mountKey} {...FLAT_OVERVIEW_PROPS} width={size.width} height={size.height} />
      </div>
    </div>
  );
};

export const StaleAspectFrozen: StoryObj = {
  render: () => <StaleAspectDemo />,
};

// ===========================================================================
// Story 3 — portrait: bug vs. correct, side by side.
//
// The bug only manifests for aspect < 1, because `Math.min(1, aspect)` collapses
// every landscape aspect AND the default `aspect || 1` fallback to the same
// framing. So a portrait canvas is the only case where capturing the stale
// default (1) instead of the real aspect (<1) is visible.
//
//   LEFT  (bug)     : mounted once. The one-shot captures the stale aspect = 1
//                     before R3F applies the real portrait aspect, frames
//                     fit-to-HEIGHT, and never re-frames -> the city fills the
//                     height and overflows/crops left-right.
//   RIGHT (correct) : same size, but auto-remounted after the canvas has settled,
//                     so the one-shot captures the real portrait aspect (<1) and
//                     frames fit-to-WIDTH -> the city spans the narrow width with
//                     margins top/bottom. This is what the LEFT pane *should* look
//                     like.
// ===========================================================================
const PortraitPane: React.FC<{ correct: boolean }> = ({ correct }) => {
  // BUG pane: mount immediately, so the one-shot fires before R3F applies the
  // real portrait aspect and captures the stale default (1).
  // CORRECT pane: delay the mount until the (already fixed-size) container has
  // been laid out, so the canvas measures its real portrait aspect on its very
  // first frame and the one-shot frames fit-to-width — no wrong-then-right flash.
  const [ready, setReady] = React.useState(!correct);
  React.useEffect(() => {
    if (!correct) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [correct]);
  return (
    <div style={{ width: TRANSIENT.width, height: TRANSIENT.height, border: '1px dashed #475569' }}>
      {ready ? (
        <FileCity3D {...FLAT_OVERVIEW_PROPS} width={TRANSIENT.width} height={TRANSIENT.height} />
      ) : null}
    </div>
  );
};

// ===========================================================================
// Debug — live readout of the measured canvas size, aspect, and resulting camera
// height, so we can see exactly what the framing math is being fed. A portrait
// box (aspect < 1) should yield a TALLER camera (width-constrained / fit-to-width);
// if aspect reads >= 1 here, the canvas isn't being measured as portrait.
// ===========================================================================
const DebugPane: React.FC = () => {
  const [info, setInfo] = React.useState<{ w: number; h: number; y: number; camAspect: number } | null>(
    null,
  );
  const lastRef = React.useRef('');
  const onCameraFrame = React.useCallback(
    (cam: { position: { y: number }; aspect?: number }, size: { width: number; height: number }) => {
      const y = Math.round(cam.position.y);
      const camAspect = cam.aspect ?? 0;
      const sig = `${size.width}x${size.height}@${y}#${camAspect.toFixed(2)}`;
      if (sig === lastRef.current) return; // only re-render when something changes
      lastRef.current = sig;
      setInfo({ w: size.width, h: size.height, y, camAspect });
    },
    [],
  );
  const aspect = info ? info.w / info.h : 0;
  return (
    <div style={{ position: 'relative', width: TRANSIENT.width, height: TRANSIENT.height }}>
      <div style={{ border: '1px dashed #475569', width: '100%', height: '100%' }}>
        <FileCity3D
          {...FLAT_OVERVIEW_PROPS}
          width={TRANSIENT.width}
          height={TRANSIENT.height}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onCameraFrame={onCameraFrame as any}
        />
      </div>
      <pre
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          margin: 0,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.7)',
          color: '#e2e8f0',
          fontSize: 12,
          borderRadius: 4,
        }}
      >
        {info
          ? `canvas ${info.w}x${info.h}\nsize aspect ${aspect.toFixed(3)} (${aspect < 1 ? 'portrait' : 'landscape'})\ncamera.aspect ${info.camAspect.toFixed(3)}\ncamera.y ${info.y}`
          : 'waiting…'}
      </pre>
    </div>
  );
};

export const AspectDebug: StoryObj = {
  render: () => (
    <div style={{ padding: 16 }}>
      <DebugPane />
    </div>
  ),
};

export const PortraitBugVsCorrect: StoryObj = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 16,
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
        color: '#e2e8f0',
        alignItems: 'flex-start',
      }}
    >
      <div>
        <div style={{ marginBottom: 6, fontSize: 13, color: '#f87171' }}>
          BUG — stale aspect=1 captured → fit-to-height (city overflows the width)
        </div>
        <PortraitPane correct={false} />
      </div>
      <div>
        <div style={{ marginBottom: 6, fontSize: 13, color: '#4ade80' }}>
          CORRECT — real aspect&lt;1 captured → fit-to-width (margins top/bottom)
        </div>
        <PortraitPane correct={true} />
      </div>
    </div>
  ),
};
