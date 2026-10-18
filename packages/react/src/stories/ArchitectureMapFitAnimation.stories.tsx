import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { createSampleCityData, createSmallSampleCityData } from './sample-data';

/**
 * Base-fit easing — the 2D analogue of the 3D camera easing between framings.
 *
 * The base fit (how the city is scaled/centred in the canvas) used to snap
 * whenever the `safeArea` inset or the city's size changed; only a
 * `focusDirectory` change animated. It now eases too.
 *
 * Toggle the buttons: with **animateFit on** the city should glide between
 * framings; turn it off to see the old snap.
 */
const meta = {
  title: 'Components/ArchitectureMapHighlightLayers/Fit Animation',
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

const FitAnimationScene: React.FC = () => {
  const [inset, setInset] = useState(false);
  const [small, setSmall] = useState(false);
  const [animate, setAnimate] = useState(true);

  const cityData = small ? createSmallSampleCityData() : createSampleCityData();

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0f172a',
      }}
    >
      <ArchitectureMapHighlightLayers
        cityData={cityData}
        safeArea={inset ? { left: 0.3, bottom: 0.15 } : undefined}
        animateFit={animate}
        enableZoom={false}
        fullSize
        canvasBackgroundColor="#0f172a"
        defaultDirectoryColor="#1e293b"
        showDirectoryLabels
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          // Above the map's canvas (z 1) + interaction layer (z 2).
          zIndex: 100,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(17, 24, 39, 0.9)',
          color: '#e5e7eb',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        <button style={buttonStyle} onClick={() => setInset(i => !i)}>
          Toggle safeArea inset
        </button>
        <button style={buttonStyle} onClick={() => setSmall(s => !s)}>
          Toggle city size
        </button>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={animate}
            onChange={e => setAnimate(e.target.checked)}
          />
          animateFit
        </label>
        <span style={{ opacity: 0.7 }}>
          safeArea: {inset ? 'left 30% / bottom 15%' : 'none'} · city:{' '}
          {small ? 'small' : 'full'}
        </span>
      </div>
    </div>
  );
};

export const FitEasing: Story = {
  render: () => <FitAnimationScene />,
};
