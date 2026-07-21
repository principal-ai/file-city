import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  TreeMapExplainer,
  type ExplainerStage,
} from '../components/TreeMapExplainer';

const meta = {
  title: 'Explainers/TreeMapExplainer',
  component: TreeMapExplainer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Progressive morph: teach one folder (list → equal-tile map), then zoom out to a full repo tree → File City architecture map. Each file is one equal tile; directories size by file count.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    stage: {
      control: 'select',
      options: ['folder-closed', 'folder-tree', 'folder-map', 'repo-closed', 'repo-tree', 'repo-map', undefined],
    },
    theme: { control: 'radio', options: ['dark', 'light'] },
    autoPlay: { control: 'boolean' },
    loop: { control: 'boolean' },
    stageDuration: { control: { type: 'number', min: 800, max: 6000, step: 200 } },
    width: { control: { type: 'number', min: 280, max: 720, step: 20 } },
    height: { control: { type: 'number', min: 220, max: 520, step: 20 } },
  },
} satisfies Meta<typeof TreeMapExplainer>;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame({
  children,
  dark = true,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        padding: 32,
        background: dark ? '#0b0f14' : '#f1f5f9',
        borderRadius: 16,
        minWidth: 360,
      }}
    >
      {children}
    </div>
  );
}

const STAGE_LABELS: Record<ExplainerStage, string> = {
  'folder-closed': '1 · Folder',
  'folder-tree': '2 · Open folder',
  'folder-map': '3 · Folder map',
  'repo-closed': '4 · Whole repo',
  'repo-tree': '5 · Project tree',
  'repo-map': '6 · City map',
};

/** Default looping morph through the progressive lesson. */
export const AutoPlay: Story = {
  args: {
    autoPlay: true,
    loop: true,
    stageDuration: 2400,
    theme: 'dark',
    width: 480,
    height: 360,
  },
  render: args => (
    <Frame dark={args.theme !== 'light'}>
      <TreeMapExplainer {...args} />
    </Frame>
  ),
};

/** Light surface for docs / marketing embeds. */
export const Light: Story = {
  args: {
    autoPlay: true,
    loop: true,
    theme: 'light',
    width: 480,
    height: 360,
  },
  render: args => (
    <Frame dark={false}>
      <TreeMapExplainer {...args} />
    </Frame>
  ),
};

/** Scrub stages manually — useful while writing copy or designing. */
export const ManualSteps: Story = {
  render: function ManualStepsRender() {
    const [stage, setStage] = useState<ExplainerStage>('folder-closed');
    const stages: ExplainerStage[] = [
      'folder-closed',
      'folder-tree',
      'folder-map',
      'repo-closed',
      'repo-tree',
      'repo-map',
    ];

    return (
      <Frame>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stages.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.3)',
                  background: stage === s ? '#38bdf8' : '#1e293b',
                  color: stage === s ? '#0f172a' : '#e2e8f0',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          <TreeMapExplainer
            stage={stage}
            onStageChange={setStage}
            autoPlay={false}
            theme="dark"
            width={520}
            height={380}
          />
        </div>
      </Frame>
    );
  },
};

/** Compact size for empty states or side panels. */
export const Compact: Story = {
  args: {
    width: 300,
    height: 240,
    stageDuration: 2000,
    theme: 'dark',
    showCaption: true,
    showControls: true,
  },
  render: args => (
    <Frame>
      <TreeMapExplainer {...args} />
    </Frame>
  ),
};

/** Side-by-side dark + light for theme QA. */
export const ThemeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: 16 }}>
      <Frame dark>
        <TreeMapExplainer theme="dark" width={400} height={300} stageDuration={2200} />
      </Frame>
      <Frame dark={false}>
        <TreeMapExplainer theme="light" width={400} height={300} stageDuration={2200} />
      </Frame>
    </div>
  ),
};
