import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CityData,
} from '../components/FileCity3D';
import { useCityTransition } from '../hooks/useCityTransition';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D/DistrictAppearDisappear',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

function createFileInfoList(
  files: Array<{ path: string; size: number; lineCount: number }>,
): FileInfo[] {
  return files.map(file => ({
    name: file.path.split('/').pop() || file.path,
    path: file.path,
    relativePath: file.path,
    size: file.size,
    lineCount: file.lineCount,
    extension: file.path.includes('.') ? '.' + (file.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
}

function buildCityFromFiles(
  files: Array<{ path: string; size: number; lineCount: number }>,
): CityData {
  const fileInfos = createFileInfoList(files);
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos, 'commit');
  const builder = new CodeCityBuilderWithGrid();
  return builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });
}

// --- Simple base files ---

const baseFiles = [
  { path: 'src/index.ts', size: 1500, lineCount: 45 },
  { path: 'src/App.tsx', size: 3200, lineCount: 95 },
  { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
  { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
  { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
  { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
  { path: 'package.json', size: 1200, lineCount: 45 },
];

// --- Template ---

interface TemplateProps {
  before: Array<{ path: string; size: number; lineCount: number }>;
  after: Array<{ path: string; size: number; lineCount: number }>;
  label: string;
}

const Template: React.FC<TemplateProps> = ({ before, after, label }) => {
  const beforeCity = useMemo(() => buildCityFromFiles(before), []);
  const afterCity = useMemo(() => buildCityFromFiles(after), []);

  const {
    currentCityData,
    districtAppearingProgress,
    diff,
    progress,
    isTransitioning,
    startTransition,
    setProgress,
    reset,
  } = useCityTransition(beforeCity, afterCity, { duration: 2000 });

  const diffSummary = diff
    ? `+${diff.addedCount} added, -${diff.removedCount} removed, ~${diff.movedCount} moved`
    : '';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <FileCity3D
        cityData={currentCityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        isGrown={false}
        showControls={false}
        districtAppearingProgress={districtAppearingProgress}
      />

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '12px 16px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{diffSummary}</div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={reset}
            style={{
              padding: '6px 14px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Reset
          </button>
          <button
            onClick={startTransition}
            disabled={isTransitioning}
            style={{
              padding: '6px 18px',
              background: isTransitioning ? '#1e293b' : '#3b82f6',
              border: '1px solid transparent',
              borderRadius: 6,
              color: isTransitioning ? '#475569' : '#ffffff',
              cursor: isTransitioning ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {isTransitioning ? '...' : 'Play'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(progress * 100)}
            onChange={e => setProgress(Number(e.target.value) / 100)}
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', width: 35, textAlign: 'right' }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Add an entire new directory with 3 files.
 * Watch the district border expand from center, label slide down, then buildings pop in.
 */
export const AddDistrict: Story = {
  render: () => (
    <Template
      label="Add src/hooks/ directory"
      before={baseFiles}
      after={[
        ...baseFiles,
        { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
        { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
        { path: 'src/hooks/useTheme.ts', size: 600, lineCount: 18 },
      ]}
    />
  ),
};

/**
 * Remove an entire directory and its files.
 * Watch the district shrink and fade out.
 */
export const RemoveDistrict: Story = {
  render: () => (
    <Template
      label="Remove src/utils/ directory"
      before={[
        ...baseFiles,
        { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
        { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
        { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      ]}
      after={baseFiles}
    />
  ),
};
