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
  title: 'Components/FileCity3D/CommitTransition',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// --- Build city data from file lists using the real treemap builder ---

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

// --- Commit scenarios ---

interface CommitScenario {
  id: string;
  title: string;
  description: string;
  filesBefore: Array<{ path: string; size: number; lineCount: number }>;
  filesAfter: Array<{ path: string; size: number; lineCount: number }>;
  commitHash: string;
  author: string;
}

const scenarios: CommitScenario[] = [
  {
    id: 'add-file',
    title: 'Add a new file',
    description: 'A single new utility file is added to src/utils/',
    commitHash: 'a1b2c3d',
    author: 'dev',
    filesBefore: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
    filesAfter: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/utils/formatDate.ts', size: 800, lineCount: 30 }, // NEW FILE
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
  },
  {
    id: 'add-multiple',
    title: 'Add multiple files',
    description: 'Three new files added across different directories',
    commitHash: 'e4f5g6h',
    author: 'dev',
    filesBefore: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
    filesAfter: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/components/Modal.tsx', size: 1500, lineCount: 48 }, // NEW
      { path: 'src/components/Toast.tsx', size: 700, lineCount: 22 }, // NEW
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/utils/formatDate.ts', size: 800, lineCount: 30 }, // NEW
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useNotifications.ts', size: 600, lineCount: 18 }, // NEW
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
  },
  {
    id: 'delete-files',
    title: 'Remove deprecated files',
    description: 'Two files removed from the codebase',
    commitHash: 'i7j8k9l',
    author: 'dev',
    filesBefore: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/components/OldModal.tsx', size: 2400, lineCount: 72 }, // TO DELETE
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/utils/legacyUtils.ts', size: 3100, lineCount: 95 }, // TO DELETE
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
    filesAfter: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
  },
  {
    id: 'mixed-changes',
    title: 'Mixed changes',
    description: 'Add, modify, and delete files in a single commit',
    commitHash: 'm0n1o2p',
    author: 'dev',
    filesBefore: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 3200, lineCount: 95 },
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
      { path: 'src/components/OldModal.tsx', size: 2400, lineCount: 72 }, // TO DELETE
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
    filesAfter: [
      { path: 'src/index.ts', size: 1500, lineCount: 45 },
      { path: 'src/App.tsx', size: 4200, lineCount: 128 }, // MODIFIED (grew)
      { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
      { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
      { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
      { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
      { path: 'src/components/Button.tsx', size: 1400, lineCount: 42 }, // MODIFIED (grew)
      { path: 'src/components/Modal.tsx', size: 1800, lineCount: 55 }, // NEW
      { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
      { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
      { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
      { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
      { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
      { path: 'src/hooks/useModal.ts', size: 500, lineCount: 15 }, // NEW
      { path: 'package.json', size: 1200, lineCount: 45 },
      { path: 'tsconfig.json', size: 800, lineCount: 30 },
      { path: 'README.md', size: 3500, lineCount: 120 },
    ],
  },
];

// --- Story template ---

interface CommitTransitionTemplateProps {
  scenarioId: string;
  duration: number;
}

const CommitTransitionTemplate: React.FC<CommitTransitionTemplateProps> = ({
  scenarioId,
  duration,
}) => {
  const scenario = scenarios.find(s => s.id === scenarioId) || scenarios[0];

  const beforeCity = useMemo(
    () => buildCityFromFiles(scenario.filesBefore),
    [scenario.id],
  );
  const afterCity = useMemo(
    () => buildCityFromFiles(scenario.filesAfter),
    [scenario.id],
  );

  const {
    currentCityData,
    districtAppearingProgress,
    diff,
    progress,
    isTransitioning,
    startTransition,
    setProgress,
    reset,
    finish,
  } = useCityTransition(beforeCity, afterCity, { duration });

  const diffSummary = diff
    ? `+${diff.addedCount} added, -${diff.removedCount} removed, ~${diff.movedCount} moved`
    : '';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 3D City */}
      <FileCity3D
        cityData={currentCityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        isGrown={false}
        showControls={false}
        districtAppearingProgress={districtAppearingProgress}
      />

      {/* Commit info bar - top */}
      <div
        style={{
          position: 'absolute',
          top: 16,
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
          gap: 16,
        }}
      >
        {/* Commit icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          C
        </div>

        {/* Commit details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{scenario.title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {scenario.description}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
            <span style={{ color: '#22c55e' }}>{scenario.commitHash}</span>
            {' '}&middot;{' '}
            {scenario.author} &middot;{' '}
            <span style={{ color: '#94a3b8' }}>{diffSummary}</span>
          </div>
        </div>

        {/* Diff stats */}
        {diff && (
          <div style={{ display: 'flex', gap: 12, fontSize: 12, flexShrink: 0 }}>
            {diff.addedCount > 0 && (
              <span style={{ color: '#22c55e' }}>+{diff.addedCount}</span>
            )}
            {diff.removedCount > 0 && (
              <span style={{ color: '#ef4444' }}>-{diff.removedCount}</span>
            )}
            {diff.movedCount > 0 && (
              <span style={{ color: '#f59e0b' }}>~{diff.movedCount}</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline controls - bottom */}
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
          padding: '16px 20px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Timeline scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#64748b', width: 50, textAlign: 'right' }}>
            Before
          </span>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(progress * 100)}
              onChange={e => setProgress(Number(e.target.value) / 100)}
              style={{
                width: '100%',
                height: 6,
                appearance: 'none',
                background: `linear-gradient(to right, #3b82f6 ${progress * 100}%, #334155 ${progress * 100}%)`,
                borderRadius: 3,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            {/* Progress marker */}
            <div
              style={{
                position: 'absolute',
                left: `calc(${progress * 100}% - 8px)`,
                top: -5,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#3b82f6',
                border: '2px solid #fff',
                pointerEvents: 'none',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: '#64748b', width: 50 }}>
            After
          </span>
        </div>

        {/* Control buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Reset
          </button>

          <button
            onClick={startTransition}
            disabled={isTransitioning}
            style={{
              padding: '8px 20px',
              background: isTransitioning ? '#1e293b' : '#3b82f6',
              border: '1px solid transparent',
              borderRadius: 6,
              color: isTransitioning ? '#475569' : '#ffffff',
              cursor: isTransitioning ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isTransitioning ? 'Animating...' : 'Play Transition'}
          </button>

          <button
            onClick={finish}
            style={{
              padding: '8px 16px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Skip to End
          </button>

          {/* Progress readout */}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Add a single file - the simplest case.
 * Watch the new building pop in while existing buildings smoothly shift.
 */
export const AddFile: Story = {
  render: () => (
    <CommitTransitionTemplate scenarioId="add-file" duration={1500} />
  ),
};

/**
 * Add multiple files at once.
 * Three new buildings appear simultaneously.
 */
export const AddMultipleFiles: Story = {
  render: () => (
    <CommitTransitionTemplate scenarioId="add-multiple" duration={1500} />
  ),
};

/**
 * Remove deprecated files.
 * Buildings shrink and fade out.
 */
export const RemoveFiles: Story = {
  render: () => (
    <CommitTransitionTemplate scenarioId="delete-files" duration={1500} />
  ),
};

/**
 * Mixed changes: add, modify, and delete in one commit.
 */
export const MixedChanges: Story = {
  render: () => (
    <CommitTransitionTemplate scenarioId="mixed-changes" duration={2000} />
  ),
};
