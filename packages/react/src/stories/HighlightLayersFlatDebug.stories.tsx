import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { FileCity3D } from '../components/FileCity3D';
import type { CityData, HighlightLayer } from '../components/FileCity3D';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Debug/Highlight Layers (Flat)',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

const cityData = authServerCityData as CityData;

// Three known-existing paths in the auth-server fixture, picked so they
// represent different file types.
const TARGETS = {
  ts: 'auth-server/src/lib/auth-provider.ts',     // .ts → fileColor primary 'fill'
  tsx: 'auth-server/src/app/page.tsx',            // .tsx → fileColor primary 'fill', secondary 'border'
  route: 'auth-server/src/app/api/auth/workos/callback/route.ts', // .ts
};

const RED = '#ef4444';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';
const NEUTRAL_BUILDING = '#475569'; // slate-600 — used in stories that want to isolate highlight rendering

const FLAT_ANIMATION = {
  startFlat: true as const,
  autoStartDelay: null,
  staggerDelay: 0,
  tension: 200,
  friction: 24,
};

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f1419',
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// 1. Borders only, no fileColorLayers — the cleanest possible test.
// ---------------------------------------------------------------------------
export const BorderOnly_NoFileColors: StoryObj = {
  name: '1. border only, no file colors',
  render: () => {
    const layers: HighlightLayer[] = [
      {
        id: 'red',
        name: 'red',
        enabled: true,
        color: RED,
        priority: 10,
        borderWidth: 30,
        items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'amber',
        name: 'amber',
        enabled: true,
        color: AMBER,
        priority: 11,
        borderWidth: 30,
        items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'green',
        name: 'green',
        enabled: true,
        color: GREEN,
        priority: 12,
        borderWidth: 30,
        items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'border' }],
      },
    ];
    return (
      <Stage>
        <FileCity3D
          cityData={cityData}
          width="100%"
          height="100%"
          isGrown={false}
          animation={FLAT_ANIMATION}
          highlightLayers={layers}
          defaultBuildingColor={NEUTRAL_BUILDING}
          isolationMode="none"
          backgroundColor="#0f1419"
          showControls={true}
        />
      </Stage>
    );
  },
};

// ---------------------------------------------------------------------------
// 2. Same as #1 but with fileColorLayers also set — does anything change?
// ---------------------------------------------------------------------------
export const BorderOnly_WithFileColors: StoryObj = {
  name: '2. border + file colors',
  render: () => {
    const fileColorLayers = createFileColorHighlightLayers(cityData.buildings);
    const layers: HighlightLayer[] = [
      {
        id: 'red',
        name: 'red',
        enabled: true,
        color: RED,
        priority: 1000,
        borderWidth: 30,
        items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'amber',
        name: 'amber',
        enabled: true,
        color: AMBER,
        priority: 1000,
        borderWidth: 30,
        items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'green',
        name: 'green',
        enabled: true,
        color: GREEN,
        priority: 1000,
        borderWidth: 30,
        items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'border' }],
      },
    ];
    return (
      <Stage>
        <FileCity3D
          cityData={cityData}
          width="100%"
          height="100%"
          isGrown={false}
          animation={FLAT_ANIMATION}
          fileColorLayers={fileColorLayers}
          highlightLayers={layers}
          isolationMode="none"
          backgroundColor="#0f1419"
          showControls={true}
        />
      </Stage>
    );
  },
};

// ---------------------------------------------------------------------------
// 3. Fill strategy — sanity check that the layer system applies at all.
//    If these buildings turn red/amber/green, the layer plumbing is fine
//    and the issue is specific to BorderHighlights rendering.
// ---------------------------------------------------------------------------
export const Fill_NoFileColors: StoryObj = {
  name: '3. fill only, no file colors',
  render: () => {
    const layers: HighlightLayer[] = [
      {
        id: 'red',
        name: 'red',
        enabled: true,
        color: RED,
        priority: 10,
        items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'fill' }],
      },
      {
        id: 'amber',
        name: 'amber',
        enabled: true,
        color: AMBER,
        priority: 11,
        items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'fill' }],
      },
      {
        id: 'green',
        name: 'green',
        enabled: true,
        color: GREEN,
        priority: 12,
        items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'fill' }],
      },
    ];
    return (
      <Stage>
        <FileCity3D
          cityData={cityData}
          width="100%"
          height="100%"
          isGrown={false}
          animation={FLAT_ANIMATION}
          highlightLayers={layers}
          defaultBuildingColor={NEUTRAL_BUILDING}
          isolationMode="none"
          backgroundColor="#0f1419"
          showControls={true}
        />
      </Stage>
    );
  },
};

// ---------------------------------------------------------------------------
// 4. Same buildings as #1 but in 3D (grown). If borders show colored here
//    but black in #1, the issue is specific to flat mode.
// ---------------------------------------------------------------------------
export const BorderOnly_Grown: StoryObj = {
  name: '4. border only, 3D grown',
  render: () => {
    const layers: HighlightLayer[] = [
      {
        id: 'red',
        name: 'red',
        enabled: true,
        color: RED,
        priority: 10,
        borderWidth: 30,
        items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'amber',
        name: 'amber',
        enabled: true,
        color: AMBER,
        priority: 11,
        borderWidth: 30,
        items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'green',
        name: 'green',
        enabled: true,
        color: GREEN,
        priority: 12,
        borderWidth: 30,
        items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'border' }],
      },
    ];
    return (
      <Stage>
        <FileCity3D
          cityData={cityData}
          width="100%"
          height="100%"
          isGrown={true}
          animation={{ ...FLAT_ANIMATION, autoStartDelay: 0 }}
          highlightLayers={layers}
          defaultBuildingColor={NEUTRAL_BUILDING}
          isolationMode="none"
          backgroundColor="#0f1419"
          showControls={true}
        />
      </Stage>
    );
  },
};

// ---------------------------------------------------------------------------
// 5. Sweep of borderWidths. Are any of them visible in flat mode?
// ---------------------------------------------------------------------------
export const BorderWidthSweep: StoryObj = {
  name: '5. borderWidth sweep (4, 30, 100)',
  render: () => {
    const layers: HighlightLayer[] = [
      {
        id: 'bw-4',
        name: 'bw 4',
        enabled: true,
        color: RED,
        priority: 10,
        borderWidth: 4,
        items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'bw-30',
        name: 'bw 30',
        enabled: true,
        color: AMBER,
        priority: 11,
        borderWidth: 30,
        items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'border' }],
      },
      {
        id: 'bw-100',
        name: 'bw 100',
        enabled: true,
        color: GREEN,
        priority: 12,
        borderWidth: 100,
        items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'border' }],
      },
    ];
    return (
      <Stage>
        <FileCity3D
          cityData={cityData}
          width="100%"
          height="100%"
          isGrown={false}
          animation={FLAT_ANIMATION}
          highlightLayers={layers}
          defaultBuildingColor={NEUTRAL_BUILDING}
          isolationMode="none"
          backgroundColor="#0f1419"
          showControls={true}
        />
      </Stage>
    );
  },
};

// ---------------------------------------------------------------------------
// 6. Host-style repro (web-ade PR aggregate / activity heatmap):
//    flat top-down city + multi-file fill layers + isolation hide + click log.
//    Matches FileCityGuidePanel idle + host layers + defaultIsolationMode hide.
// ---------------------------------------------------------------------------
const HOST_STYLE_FILL_LAYERS: HighlightLayer[] = [
  {
    id: 'churn-cool',
    name: 'Churn cool',
    enabled: true,
    color: '#93c5fd',
    opacity: 0.4,
    priority: 40,
    items: [{ path: TARGETS.ts, type: 'file', renderStrategy: 'fill' }],
  },
  {
    id: 'churn-mid',
    name: 'Churn mid',
    enabled: true,
    color: '#3b82f6',
    opacity: 0.7,
    priority: 41,
    items: [{ path: TARGETS.tsx, type: 'file', renderStrategy: 'fill' }],
  },
  {
    id: 'churn-hot',
    name: 'Churn hot',
    enabled: true,
    color: '#1d4ed8',
    opacity: 1,
    priority: 42,
    items: [{ path: TARGETS.route, type: 'file', renderStrategy: 'fill' }],
  },
];

function HostStyleFillHideWithClickInner() {
  const [lastClick, setLastClick] = React.useState<string | null>(null);
  const [hoverPath, setHoverPath] = React.useState<string | null>(null);

  return (
    <Stage>
      <FileCity3D
        cityData={cityData}
        width="100%"
        height="100%"
        isGrown={false}
        animation={FLAT_ANIMATION}
        highlightLayers={HOST_STYLE_FILL_LAYERS}
        defaultBuildingColor={NEUTRAL_BUILDING}
        isolationMode="hide"
        backgroundColor="#0f1419"
        showControls={true}
        onBuildingHover={(b) => setHoverPath(b?.path ?? null)}
        onBuildingClick={(b) => {
          setLastClick(b.path);
          console.info('[HostStyleFillHideWithClick] onBuildingClick', b.path);
        }}
      />
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          maxWidth: 'min(560px, 92vw)',
          padding: '8px 14px',
          borderRadius: 8,
          border: '1px solid rgba(148, 163, 184, 0.45)',
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.45,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>
          flat · fill layers · isolation hide · hover/click
        </div>
        <div>
          hover:{' '}
          <span style={{ color: hoverPath ? '#38bdf8' : '#64748b' }}>
            {hoverPath ?? '—'}
          </span>
        </div>
        <div>
          click:{' '}
          <span style={{ color: lastClick ? '#4ade80' : '#64748b' }}>
            {lastClick ?? '—'}
          </span>
        </div>
      </div>
    </Stage>
  );
}

export const HostStyleFillHideWithClick: StoryObj = {
  name: '6. host-style fill + hide + click (flat)',
  render: () => <HostStyleFillHideWithClickInner />,
  parameters: {
    docs: {
      description: {
        story:
          'Recreates the web-ade idle File City under a host heatmap (PR aggregate / activity churn): **flat** top-down view, multi-file **fill** highlight layers, **`isolationMode="hide"`**, and live hover/click readout. If hover path does not track the cursor, raycasting is misaligned; if hover tracks but click stays empty, the click path is broken.',
      },
    },
  },
};
