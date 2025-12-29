import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { HighlightLayer } from '../render/client/drawLayeredBuildings';
import { createSampleCityData } from './sample-data';

const meta = {
  title: 'Components/ArchitectureMapHighlightLayers',
  component: ArchitectureMapHighlightLayers,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArchitectureMapHighlightLayers>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic story with sample city data
export const Default: Story = {
  args: {
    cityData: createSampleCityData(),
    showGrid: false,
    fullSize: true,
    canvasBackgroundColor: '#0f1419',
    defaultBuildingColor: '#36454F',
    defaultDirectoryColor: '#111827',
    enableZoom: true,
  },
};

// Story with highlight layers
export const WithHighlightLayers: Story = {
  render: function RenderWithHighlightLayers() {
    const [layers, setLayers] = useState<HighlightLayer[]>([
      {
        id: 'modified-files',
        name: 'Modified Files',
        enabled: true,
        color: '#3b82f6',
        priority: 1,
        items: [
          { path: 'src/components/App.tsx', type: 'file' },
          { path: 'src/components/Header.tsx', type: 'file' },
          { path: 'src/utils/helpers.ts', type: 'file' },
        ],
      },
      {
        id: 'new-files',
        name: 'New Files',
        enabled: true,
        color: '#10b981',
        priority: 2,
        items: [
          { path: 'src/components/Footer.tsx', type: 'file' },
          { path: 'tests/unit/footer.test.tsx', type: 'file' },
        ],
      },
      {
        id: 'deleted-files',
        name: 'Deleted Files',
        enabled: false,
        color: '#ef4444',
        priority: 3,
        items: [{ path: 'src/deprecated/OldComponent.tsx', type: 'file' }],
      },
    ]);

    const handleLayerToggle = (layerId: string, enabled: boolean) => {
      setLayers(prev => prev.map(layer => (layer.id === layerId ? { ...layer, enabled } : layer)));
    };

    return (
      <ArchitectureMapHighlightLayers
        cityData={createSampleCityData()}
        highlightLayers={layers}
        onLayerToggle={handleLayerToggle}
        showLayerControls={true}
        fullSize={true}
        canvasBackgroundColor="#0f1419"
        defaultBuildingColor="#36454F"
        defaultDirectoryColor="#111827"
        enableZoom={true}
      />
    );
  },
};

// Story with directory highlighting
export const DirectoryHighlighting: Story = {
  args: {
    cityData: createSampleCityData(),
    highlightLayers: [
      {
        id: 'test-directory',
        name: 'Test Files',
        enabled: true,
        color: '#f59e0b',
        priority: 1,
        items: [
          { path: 'tests', type: 'directory' },
          { path: '__tests__', type: 'directory' },
        ],
      },
    ],
    showLayerControls: true,
    fullSize: true,
    enableZoom: true,
  },
};

// Story with selective rendering
export const SelectiveRendering: Story = {
  args: {
    cityData: createSampleCityData(),
    selectiveRender: {
      mode: 'filter',
      directories: new Set(['src', 'tests']),
    },
    fullSize: true,
    enableZoom: true,
  },
};

// Story with subdirectory mode
export const SubdirectoryMode: Story = {
  args: {
    cityData: createSampleCityData(),
    subdirectoryMode: {
      enabled: true,
      rootPath: 'src',
      autoCenter: true,
    },
    fullSize: true,
    enableZoom: true,
  },
};

// Interactive story with hover and click callbacks
export const Interactive: Story = {
  render: function RenderInteractive() {
    const [hoveredInfo, setHoveredInfo] = useState<string>('');
    const [clickedPath, setClickedPath] = useState<string>('');

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ArchitectureMapHighlightLayers
          cityData={createSampleCityData()}
          fullSize={true}
          enableZoom={true}
          onHover={info => {
            if (info.hoveredBuilding) {
              setHoveredInfo(`File: ${info.hoveredBuilding.path}`);
            } else if (info.hoveredDistrict) {
              setHoveredInfo(`Directory: ${info.hoveredDistrict.path || '/'}`);
            } else {
              setHoveredInfo('');
            }
          }}
          onFileClick={(path, type) => {
            setClickedPath(`Clicked: ${type} - ${path}`);
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}
        >
          <div>{hoveredInfo || 'Hover over elements'}</div>
          {clickedPath && <div>{clickedPath}</div>}
        </div>
      </div>
    );
  },
};

// Story with abstraction layer
export const WithAbstractionLayer: Story = {
  args: {
    cityData: createSampleCityData(),
    highlightLayers: [
      {
        id: 'directory-abstraction',
        name: 'Directory Abstraction',
        enabled: true,
        color: '#1e40af',
        priority: 0,
        items: [],
        // @ts-expect-error - abstraction layer specific properties
        abstractionLayer: true,
        abstractionConfig: {
          maxZoomLevel: 2.0,
          minPercentage: 0.02,
          backgroundColor: '#1e40af',
          allowRootAbstraction: false,
        },
      },
    ],
    fullSize: true,
    enableZoom: true,
  },
};

// Story with custom rendering strategies
export const CustomRenderStrategies: Story = {
  args: {
    cityData: createSampleCityData(),
    highlightLayers: [
      {
        id: 'glow-effect',
        name: 'Glow Effect',
        enabled: true,
        color: '#fbbf24',
        priority: 1,
        items: [
          {
            path: 'src/index.ts',
            type: 'file',
            renderStrategy: 'glow',
          },
        ],
      },
      {
        id: 'pattern-fill',
        name: 'Pattern Fill',
        enabled: true,
        color: '#8b5cf6',
        priority: 2,
        items: [
          {
            path: 'package.json',
            type: 'file',
            renderStrategy: 'pattern',
          },
        ],
      },
      {
        id: 'covered-directories',
        name: 'Covered Directories',
        enabled: true,
        color: '#06b6d4',
        priority: 3,
        items: [
          {
            path: 'node_modules',
            type: 'directory',
            renderStrategy: 'cover',
            coverOptions: {
              text: 'Dependencies',
              backgroundColor: '#06b6d4',
              opacity: 0.8,
              borderRadius: 4,
            },
          },
        ],
      },
    ],
    showLayerControls: true,
    fullSize: true,
    enableZoom: true,
  },
};

// Story with grid display
export const WithGrid: Story = {
  args: {
    cityData: createSampleCityData(),
    showGrid: true,
    showFileNames: true,
    fullSize: true,
    enableZoom: true,
  },
};

// Story with transformations
export const WithTransformations: Story = {
  args: {
    cityData: createSampleCityData(),
    transform: {
      rotation: 90,
      flipHorizontal: false,
      flipVertical: false,
    },
    fullSize: true,
    enableZoom: true,
  },
};

// Story with border radius
export const WithBorderRadius: Story = {
  args: {
    cityData: createSampleCityData(),
    buildingBorderRadius: 4,
    districtBorderRadius: 8,
    fullSize: true,
    enableZoom: true,
  },
};

// Story with animated zoom to directory
export const AnimatedZoomToDirectory: Story = {
  render: function RenderAnimatedZoom() {
    const [zoomToPath, setZoomToPath] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const cityData = createSampleCityData();

    // Get unique top-level directories for navigation buttons
    const topLevelDirs = Array.from(
      new Set(
        cityData.districts
          .map(d => d.path.split('/')[0])
          .filter(Boolean),
      ),
    ).sort();

    const handleZoomTo = (path: string | null) => {
      setIsAnimating(true);
      setZoomToPath(path);
    };

    const handleZoomComplete = () => {
      setIsAnimating(false);
    };

    // Create highlight layer for the focused directory
    const highlightLayers: HighlightLayer[] = zoomToPath
      ? [
          {
            id: 'zoom-focus',
            name: 'Zoom Focus',
            enabled: true,
            color: '#3b82f6',
            priority: 1,
            items: [{ path: zoomToPath, type: 'directory' }],
          },
        ]
      : [];

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ArchitectureMapHighlightLayers
          cityData={cityData}
          fullSize={true}
          enableZoom={true}
          zoomToPath={zoomToPath}
          onZoomComplete={handleZoomComplete}
          zoomAnimationSpeed={0.1}
          highlightLayers={highlightLayers}
          onFileClick={(path, type) => {
            if (type === 'directory') {
              handleZoomTo(path);
            }
          }}
        />
        {/* Navigation Controls */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '200px',
          }}
        >
          <div
            style={{
              color: 'white',
              fontFamily: 'monospace',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            {isAnimating ? '🎬 Animating...' : '📍 Click to zoom'}
          </div>

          {/* Reset button */}
          <button
            onClick={() => handleZoomTo(null)}
            disabled={isAnimating}
            style={{
              padding: '8px 12px',
              backgroundColor: zoomToPath === null ? '#3b82f6' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isAnimating ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
              opacity: isAnimating ? 0.6 : 1,
            }}
          >
            🏠 Reset View
          </button>

          {/* Directory buttons */}
          {topLevelDirs.map(dir => (
            <button
              key={dir}
              onClick={() => handleZoomTo(dir)}
              disabled={isAnimating}
              style={{
                padding: '8px 12px',
                backgroundColor: zoomToPath === dir ? '#3b82f6' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                textAlign: 'left',
                opacity: isAnimating ? 0.6 : 1,
              }}
            >
              📁 {dir}
            </button>
          ))}

          {/* Some nested directories */}
          <div
            style={{
              borderTop: '1px solid #4b5563',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                color: '#9ca3af',
                fontFamily: 'monospace',
                fontSize: '10px',
                marginBottom: '4px',
              }}
            >
              Nested:
            </div>
            {['src/components', 'src/utils', 'tests/unit'].map(dir => (
              <button
                key={dir}
                onClick={() => handleZoomTo(dir)}
                disabled={isAnimating}
                style={{
                  padding: '6px 10px',
                  backgroundColor: zoomToPath === dir ? '#3b82f6' : '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  width: '100%',
                  opacity: isAnimating ? 0.6 : 1,
                }}
              >
                📂 {dir}
              </button>
            ))}
          </div>
        </div>

        {/* Current zoom info */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '12px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          <div>Current: {zoomToPath || '(root)'}</div>
          <div style={{ color: '#9ca3af', marginTop: '4px' }}>
            💡 Click directories in the map or use buttons above
          </div>
        </div>
      </div>
    );
  },
};
