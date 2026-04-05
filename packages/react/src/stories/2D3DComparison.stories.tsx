import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { FileCity3D, type HighlightLayer, type IsolationMode, type CityData } from '../components/FileCity3D';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Comparison/2D vs 3D',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type ViewMode = '2d' | '3d-flat' | '3d-grown';

export const ViewModeSwitch: StoryObj = {
  render: function RenderViewModeSwitch() {
    const [viewMode, setViewMode] = useState<ViewMode>('2d');
    const [overlayOpacity, setOverlayOpacity] = useState(1);
    const [hideOverlay, setHideOverlay] = useState(false);
    const cityData = authServerCityData as CityData;
    const highlightLayers = createFileColorHighlightLayers(cityData.buildings);

    const handleViewModeChange = (mode: ViewMode) => {
      if (mode !== '2d' && viewMode === '2d') {
        // Switching from 2D to 3D - reset overlay state before changing mode
        setOverlayOpacity(1);
        setHideOverlay(false);
      }
      setViewMode(mode);
    };

    // Fade out overlay after switching to 3D
    useEffect(() => {
      if (viewMode !== '2d') {
        // Wait for 3D to render, then fade out
        const fadeTimer = setTimeout(() => {
          setOverlayOpacity(0);
        }, 100);
        // Remove overlay after fade completes
        const removeTimer = setTimeout(() => {
          setHideOverlay(true);
        }, 400);
        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(removeTimer);
        };
      } else {
        setHideOverlay(false);
        setOverlayOpacity(1);
      }
    }, [viewMode]);

    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#9ca3af', marginRight: '8px', fontSize: '14px' }}>View Mode:</span>
          {(['2d', '3d-flat', '3d-grown'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: viewMode === mode ? '#3b82f6' : '#374151',
                color: viewMode === mode ? '#ffffff' : '#d1d5db',
                transition: 'all 0.15s ease',
              }}
            >
              {mode === '2d' ? '2D Canvas' : mode === '3d-flat' ? '3D (Flat)' : '3D (Grown)'}
            </button>
          ))}
          <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '16px' }}>
            Compare initial render between 2D canvas and 3D flat view
          </span>
        </div>

        <div style={{ flex: 1, backgroundColor: '#0f1419', position: 'relative' }}>
          {/* 3D layer (behind) */}
          {viewMode !== '2d' && (
            <FileCity3D
              cityData={cityData}
              highlightLayers={highlightLayers}
              width="100%"
              height="100%"
              isGrown={viewMode === '3d-grown'}
              showControls={true}
              backgroundColor="#0f1419"
            />
          )}

          {/* 2D layer (on top, fades out when switching to 3D) */}
          {(viewMode === '2d' || !hideOverlay) && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: viewMode === '2d' ? 1 : overlayOpacity,
                transition: 'opacity 300ms ease-out',
                pointerEvents: viewMode === '2d' ? 'auto' : 'none',
              }}
            >
              <ArchitectureMapHighlightLayers
                cityData={cityData}
                highlightLayers={highlightLayers}
                fullSize={true}
                canvasBackgroundColor="#0f1419"
                defaultBuildingColor="#36454F"
                defaultDirectoryColor="#111827"
                enableZoom={viewMode === '2d'}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
};

export const SideBySide: StoryObj = {
  render: function RenderSideBySide() {
    const cityData = authServerCityData as CityData;
    const highlightLayers = createFileColorHighlightLayers(cityData.buildings);

    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>
            Side-by-side comparison: 2D Canvas (left) vs 3D Flat (right)
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          <div
            style={{
              flex: 1,
              borderRight: '1px solid #374151',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#111827',
                borderBottom: '1px solid #374151',
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              2D CANVAS
            </div>
            <div style={{ flex: 1, backgroundColor: '#0f1419' }}>
              <ArchitectureMapHighlightLayers
                cityData={cityData}
                highlightLayers={highlightLayers}
                fullSize={true}
                canvasBackgroundColor="#0f1419"
                defaultBuildingColor="#36454F"
                defaultDirectoryColor="#111827"
                enableZoom={true}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#111827',
                borderBottom: '1px solid #374151',
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              3D FLAT
            </div>
            <div style={{ flex: 1, backgroundColor: '#0f1419' }}>
              <FileCity3D
                cityData={cityData}
                highlightLayers={highlightLayers}
                width="100%"
                height="100%"
                isGrown={false}
                showControls={false}
                backgroundColor="#0f1419"
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// Test scenarios for highlight comparison
// No explicit isolationMode - let resolution determine everything
interface TestScenario {
  id: string;
  name: string;
  description: string;
  focusDirectory: string | null;
  focusColor?: string | null;
  highlightLayers: HighlightLayer[];
}

const testScenarios: TestScenario[] = [
  {
    id: 'S1-baseline',
    name: 'S1: Baseline',
    description: 'Full city view, no focus, no highlights - all file colors shown',
    focusDirectory: null,
    highlightLayers: [],
  },
  {
    id: 'S2-focus-only',
    name: 'S2: Focus Only (src)',
    description: 'Camera zooms to src, file colors filtered to focus area',
    focusDirectory: 'auth-server/src',
    focusColor: '#3b82f6',
    highlightLayers: [],
  },
  {
    id: 'S2b-focus-only-tests',
    name: 'S2b: Focus Only (bruno)',
    description: 'Camera zooms to bruno directory',
    focusDirectory: 'auth-server/bruno',
    focusColor: '#22c55e',
    highlightLayers: [],
  },
  {
    id: 'S3-highlight-only',
    name: 'S3: Highlight Only',
    description: 'Full view with highlight layer, file colors filtered to highlight area',
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
  },
  {
    id: 'S4-focus-highlight-same',
    name: 'S4: Focus + Highlight (same directory)',
    description: 'Focus and highlight on same directory',
    focusDirectory: 'auth-server/src/app/api',
    focusColor: '#3b82f6',
    highlightLayers: [
      {
        id: 'api-layer',
        name: 'API Routes',
        enabled: true,
        color: '#3b82f6',
        items: [{ path: 'auth-server/src/app/api', type: 'directory' as const }],
      },
    ],
  },
  {
    id: 'S5-focus-highlight-subset',
    name: 'S5: Focus + Highlight (subset)',
    description: 'Focus on src, highlight only lib subset',
    focusDirectory: 'auth-server/src',
    focusColor: '#3b82f6',
    highlightLayers: [
      {
        id: 'lib-layer',
        name: 'Libraries',
        enabled: true,
        color: '#8b5cf6',
        items: [{ path: 'auth-server/src/lib', type: 'directory' as const }],
      },
    ],
  },
  {
    id: 'S6-multiple-highlights-focus',
    name: 'S6: Multiple Highlights (with focus)',
    description: 'Two highlight layers within focused area',
    focusDirectory: 'auth-server/src',
    focusColor: '#3b82f6',
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
  },
  {
    id: 'S7-multiple-highlights-no-focus',
    name: 'S7: Multiple Highlights (no focus)',
    description: 'Two highlight layers, file colors filtered to both areas',
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
  },
  {
    id: 'S8-single-file',
    name: 'S8: Single File Highlight',
    description: 'Highlight a single file',
    focusDirectory: null,
    highlightLayers: [
      {
        id: 'single-file-layer',
        name: 'Single File',
        enabled: true,
        color: '#ec4899',
        items: [{ path: 'auth-server/src/app/api/auth/workos/callback/route.ts', type: 'file' as const }],
      },
    ],
  },
  {
    id: 'S9-multiple-files',
    name: 'S9: Multiple Files Highlight',
    description: 'Highlight multiple individual files',
    focusDirectory: null,
    highlightLayers: [
      {
        id: 'files-layer',
        name: 'Selected Files',
        enabled: true,
        color: '#14b8a6',
        items: [
          { path: 'auth-server/src/app/api/auth/workos/callback/route.ts', type: 'file' as const },
          { path: 'auth-server/src/app/api/auth/workos/verify/route.ts', type: 'file' as const },
          { path: 'auth-server/src/app/api/auth/workos/token/route.ts', type: 'file' as const },
        ],
      },
    ],
  },
];

export const ScenarioComparison: StoryObj = {
  render: function RenderScenarioComparison() {
    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const scenario = testScenarios[currentScenarioIndex];
    const cityData = authServerCityData as CityData;

    // Base file color layers - resolution will filter these based on highlights/focus
    const fileColorLayers = createFileColorHighlightLayers(cityData.buildings);

    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Scenario selector */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '14px', marginRight: '8px' }}>Scenario:</span>
          {testScenarios.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrentScenarioIndex(index)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: currentScenarioIndex === index ? '#3b82f6' : '#374151',
                color: currentScenarioIndex === index ? '#ffffff' : '#d1d5db',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Scenario info */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#111827',
            borderBottom: '1px solid #374151',
            fontSize: '12px',
            color: '#9ca3af',
          }}
        >
          <strong>{scenario.name}</strong>: {scenario.description}
          {scenario.focusDirectory && (
            <span style={{ marginLeft: '12px', color: '#22c55e' }}>
              Focus: {scenario.focusDirectory}
            </span>
          )}
          {scenario.highlightLayers.length > 0 && (
            <span style={{ marginLeft: '12px', color: '#3b82f6' }}>
              Layers: {scenario.highlightLayers.map(l => l.name).join(', ')}
            </span>
          )}
        </div>

        {/* Side by side comparison */}
        <div style={{ flex: 1, display: 'flex' }}>
          <div
            style={{
              flex: 1,
              borderRight: '1px solid #374151',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#111827',
                borderBottom: '1px solid #374151',
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              2D CANVAS
            </div>
            <div style={{ flex: 1, backgroundColor: '#0f1419' }}>
              <ArchitectureMapHighlightLayers
                cityData={cityData}
                highlightLayers={scenario.highlightLayers}
                fileColorLayers={fileColorLayers}
                zoomToPath={scenario.focusDirectory}
                focusColor={scenario.focusColor}
                allowZoomToPath={true}
                zoomAnimationSpeed={0.12}
                fullSize={true}
                canvasBackgroundColor="#0f1419"
                defaultBuildingColor="#36454F"
                defaultDirectoryColor="#111827"
                enableZoom={true}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#111827',
                borderBottom: '1px solid #374151',
                color: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              3D
            </div>
            <div style={{ flex: 1, backgroundColor: '#0f1419' }}>
              <FileCity3D
                cityData={cityData}
                highlightLayers={scenario.highlightLayers}
                fileColorLayers={fileColorLayers}
                focusDirectory={scenario.focusDirectory}
                focusColor={scenario.focusColor}
                width="100%"
                height="100%"
                isGrown={true}
                showControls={true}
                backgroundColor="#0f1419"
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
};

