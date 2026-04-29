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
