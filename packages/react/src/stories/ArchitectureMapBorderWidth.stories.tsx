import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import type { HighlightLayer } from '../render/client/drawLayeredBuildings';
import { createSampleCityData } from './sample-data';

/**
 * Repro for the guide's agent-session highlight layers. Those layers use
 * `borderWidth` values of 20 / 60 / 100 / 180, tuned for the 3D renderer, where
 * `borderWidth` scales a world-space tube (`max(0.2, borderWidth * 0.1)`).
 *
 * In 2D a border must stay a crisp hairline: any value above 1px reads as a fat
 * slab, so the border strategy ignores `borderWidth` and always strokes 1px —
 * colour and opacity carry the emphasis instead. Every outline below should be
 * an equal-weight 1px line regardless of the `borderWidth` in its label.
 */
const meta = {
  title: 'Components/ArchitectureMapHighlightLayers/Border Width',
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

// Same magnitudes the agent-session mode uses.
const WIDTHS = [2, 20, 60, 100, 180];
const COLORS = ['#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
// Siblings only. A district's `worldBounds` is its D3-treemap node rect, which
// *contains* its whole subtree — so a parent border always overlaps its
// children's by construction (true in 3D too). Nested paths would overlap
// regardless of stroke width and muddy the comparison.
const DIRS = ['src/components', 'src/hooks', 'src/styles', 'docs', 'dist'];

const dirBorderLayers: HighlightLayer[] = DIRS.map((path, i) => ({
  id: `bw-${WIDTHS[i]}`,
  name: `borderWidth ${WIDTHS[i]}`,
  enabled: true,
  color: COLORS[i],
  opacity: 0.95,
  borderWidth: WIDTHS[i],
  priority: 10 + i,
  items: [{ path, type: 'directory' as const, renderStrategy: 'border' as const }],
}));

const FILES = [
  'src/index.ts',
  'src/App.tsx',
  'src/components/Header.tsx',
  'src/utils/helpers.ts',
  'README.md',
];

const fileBorderLayers: HighlightLayer[] = WIDTHS.map((width, i) => ({
  id: `file-bw-${width}`,
  name: `file borderWidth ${width}`,
  enabled: true,
  color: COLORS[i],
  opacity: 0.95,
  borderWidth: width,
  priority: 10 + i,
  items: [
    { path: FILES[i], type: 'file' as const, renderStrategy: 'border' as const },
  ],
}));

export const DirectoryBorders: Story = {
  name: 'Directory borders (2 / 20 / 60 / 100 / 180)',
  render: () => (
    <ArchitectureMapHighlightLayers
      cityData={createSampleCityData()}
      highlightLayers={dirBorderLayers}
      enableZoom={false}
      showDirectoryLabels
      fullSize
    />
  ),
};

export const FileBorders: Story = {
  name: 'File borders (agent-session style)',
  render: () => (
    <ArchitectureMapHighlightLayers
      cityData={createSampleCityData()}
      highlightLayers={fileBorderLayers}
      enableZoom={false}
      showFileNames
      fullSize
    />
  ),
};
