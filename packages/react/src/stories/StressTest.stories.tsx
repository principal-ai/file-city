import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { HighlightLayer } from '../render/client/drawLayeredBuildings';
import { createStressTestCityData } from './stress-test-data';

// Wrapper component that regenerates cityData when fileCount changes
// and includes the click-to-zoom panel
function StressTestWrapper({
  fileCount,
  ...props
}: {
  fileCount: number;
} & Omit<React.ComponentProps<typeof ArchitectureMapHighlightLayers>, 'cityData'>) {
  const [zoomToPath, setZoomToPath] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const cityData = useMemo(() => {
    const data = createStressTestCityData(fileCount, true);
    return data;
  }, [fileCount]);

  // Get unique top-level directories for navigation buttons
  const topLevelDirs = useMemo(() => {
    return Array.from(
      new Set(
        cityData.districts
          .map(d => d.path.split('/')[0])
          .filter(Boolean),
      ),
    ).sort();
  }, [cityData]);

  // Get nested directories at different levels for navigation
  const nestedDirs = useMemo(() => {
    const allPaths = cityData.districts.map(d => d.path);

    // Get depth-2 directories (e.g., src/components)
    const depth2 = Array.from(
      new Set(allPaths.filter(p => p.split('/').length === 2)),
    ).sort().slice(0, 6);

    // Get depth-3 directories (e.g., src/components/ui)
    const depth3 = Array.from(
      new Set(allPaths.filter(p => p.split('/').length === 3)),
    ).sort().slice(0, 6);

    // Get depth-4 directories (e.g., src/components/ui/Button)
    const depth4 = Array.from(
      new Set(allPaths.filter(p => p.split('/').length === 4)),
    ).sort().slice(0, 4);

    return { depth2, depth3, depth4 };
  }, [cityData]);

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
        zoomToPath={zoomToPath}
        onZoomComplete={handleZoomComplete}
        zoomAnimationSpeed={0.1}
        highlightLayers={highlightLayers}
        onFileClick={(path, type) => {
          if (type === 'directory') {
            handleZoomTo(path);
          }
        }}
        {...props}
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
          maxWidth: '220px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            color: '#3b82f6',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Stress Test: {fileCount.toLocaleString()} files
        </div>
        <div
          style={{
            color: '#9ca3af',
            fontFamily: 'monospace',
            fontSize: '10px',
            marginBottom: '8px',
          }}
        >
          {isAnimating ? 'Animating...' : 'Click to zoom'}
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
          Reset View
        </button>

        {/* Top-level directory buttons */}
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
            {dir}
          </button>
        ))}

        {/* Depth 2 directories (e.g., src/components) */}
        {nestedDirs.depth2.length > 0 && (
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
              Depth 2:
            </div>
            {nestedDirs.depth2.map(dir => (
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
                  fontSize: '10px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  width: '100%',
                  opacity: isAnimating ? 0.6 : 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={dir}
              >
                {dir}
              </button>
            ))}
          </div>
        )}

        {/* Depth 3 directories (e.g., src/components/ui) */}
        {nestedDirs.depth3.length > 0 && (
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
              Depth 3:
            </div>
            {nestedDirs.depth3.map(dir => (
              <button
                key={dir}
                onClick={() => handleZoomTo(dir)}
                disabled={isAnimating}
                style={{
                  padding: '6px 10px',
                  backgroundColor: zoomToPath === dir ? '#10b981' : '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  width: '100%',
                  opacity: isAnimating ? 0.6 : 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={dir}
              >
                {dir}
              </button>
            ))}
          </div>
        )}

        {/* Depth 4 directories (e.g., src/components/ui/Button) */}
        {nestedDirs.depth4.length > 0 && (
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
              Depth 4:
            </div>
            {nestedDirs.depth4.map(dir => (
              <button
                key={dir}
                onClick={() => handleZoomTo(dir)}
                disabled={isAnimating}
                style={{
                  padding: '6px 10px',
                  backgroundColor: zoomToPath === dir ? '#f59e0b' : '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  width: '100%',
                  opacity: isAnimating ? 0.6 : 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={dir}
              >
                {dir}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status info */}
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
        <div>Zoomed to: {zoomToPath || '(root)'}</div>
        <div style={{ color: '#9ca3af', marginTop: '4px' }}>
          Click directories in the map or use buttons above
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Performance/Stress Test',
  component: StressTestWrapper,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    fileCount: {
      control: { type: 'number', min: 100, max: 20000, step: 100 },
      description: 'Number of files to generate for stress testing',
    },
  },
} satisfies Meta<typeof StressTestWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Test subdirectory zoom with a large number of files.
 * Use the fileCount control to adjust the number of files.
 *
 * Try clicking on directories to zoom in and test performance.
 */
export const SubdirectoryZoom: Story = {
  args: {
    fileCount: 8000,
    enableZoom: true,
    showGrid: true,
    showFileNames: false,
    fullSize: true,
  },
};

/**
 * Smaller stress test starting point (1000 files)
 */
export const SmallStressTest: Story = {
  args: {
    fileCount: 1000,
    enableZoom: true,
    showGrid: true,
    showFileNames: false,
    fullSize: true,
  },
};

/**
 * Medium stress test (5000 files)
 */
export const MediumStressTest: Story = {
  args: {
    fileCount: 5000,
    enableZoom: true,
    showGrid: true,
    showFileNames: false,
    fullSize: true,
  },
};

/**
 * Large stress test (10000 files)
 */
export const LargeStressTest: Story = {
  args: {
    fileCount: 10000,
    enableZoom: true,
    showGrid: true,
    showFileNames: false,
    fullSize: true,
  },
};

/**
 * Extreme stress test (20000 files) - may be slow!
 */
export const ExtremeStressTest: Story = {
  args: {
    fileCount: 20000,
    enableZoom: true,
    showGrid: true,
    showFileNames: false,
    fullSize: true,
  },
};
