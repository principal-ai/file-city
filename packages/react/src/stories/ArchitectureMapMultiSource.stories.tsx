import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import type { CitySource } from '../components/FileCity3D/FileCity3D';
import { createSampleCityData, createSmallSampleCityData } from './sample-data';

// Multi-source (multi-repo) layout — exercises the `citySources` path added for
// 2D parity with FileCity3D: grid placement, per-source labels + click-to-focus,
// per-source dim (`focusedSources`), and the `safeArea` inset.
const meta = {
  title: 'Components/ArchitectureMapHighlightLayers/Multi Source',
  component: ArchitectureMapHighlightLayers,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ArchitectureMapHighlightLayers>;

export default meta;
type Story = StoryObj<typeof meta>;

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: '#1f2937',
  color: '#e5e7eb',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

const MultiSourceRender: React.FC<{ safeArea: boolean }> = ({ safeArea }) => {
  const [focusedLabel, setFocusedLabel] = useState<string | null>(null);

  const sources = useMemo<CitySource[]>(
    () => [
      {
        cityData: createSampleCityData(),
        positionOffset: { x: 0, z: 0 },
        gridCell: { col: 0, row: 0 },
        label: 'repo-a',
      },
      {
        cityData: createSmallSampleCityData(),
        positionOffset: { x: 0, z: 0 },
        gridCell: { col: 1, row: 0 },
        label: 'repo-b',
      },
    ],
    [],
  );

  const focusedSources = focusedLabel
    ? sources.filter(s => s.label === focusedLabel)
    : undefined;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f1419' }}>
      <ArchitectureMapHighlightLayers
        citySources={sources}
        focusedSources={focusedSources}
        onSourceFocusChange={s => setFocusedLabel(s ? s.label ?? null : null)}
        focusColor="#3b82f6"
        safeArea={safeArea ? { left: 0.22, bottom: 0.12 } : undefined}
        enableZoom={false}
        fullSize
        canvasBackgroundColor="#0f1419"
        defaultBuildingColor="#36454F"
        defaultDirectoryColor="#111827"
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          color: '#e5e7eb',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        <span>Focus:</span>
        <button style={buttonStyle} onClick={() => setFocusedLabel(null)}>
          none
        </button>
        <button style={buttonStyle} onClick={() => setFocusedLabel('repo-a')}>
          repo-a
        </button>
        <button style={buttonStyle} onClick={() => setFocusedLabel('repo-b')}>
          repo-b
        </button>
        <span style={{ opacity: 0.7 }}>
          focused: {focusedLabel ?? '(overview — click a repo label on the map)'}
        </span>
      </div>
    </div>
  );
};

export const TwoRepos: Story = {
  render: () => <MultiSourceRender safeArea={false} />,
};

export const TwoReposWithSafeArea: Story = {
  name: 'Two Repos + safeArea inset',
  render: () => <MultiSourceRender safeArea={true} />,
};
