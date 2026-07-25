import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
} from '../components/FileCity3D';
import { useDirectoryHide } from '../hooks/useDirectoryHide';
import {
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D/DirectoryHide',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// --- Build file tree from file list ---

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

// --- Sample file tree ---

const sampleFiles = [
  { path: 'src/index.ts', size: 1500, lineCount: 45 },
  { path: 'src/App.tsx', size: 3200, lineCount: 95 },
  { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
  { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
  { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
  { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
  { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
  { path: 'src/components/Modal.tsx', size: 1500, lineCount: 48 },
  { path: 'src/components/Toast.tsx', size: 700, lineCount: 22 },
  { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
  { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
  { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
  { path: 'src/utils/formatDate.ts', size: 800, lineCount: 30 },
  { path: 'src/utils/formatNumber.ts', size: 600, lineCount: 20 },
  { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
  { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
  { path: 'src/hooks/useNotifications.ts', size: 600, lineCount: 18 },
  { path: 'src/hooks/useTheme.ts', size: 400, lineCount: 12 },
  { path: 'package.json', size: 1200, lineCount: 45 },
  { path: 'tsconfig.json', size: 800, lineCount: 30 },
  { path: 'README.md', size: 3500, lineCount: 120 },
];

// --- Story template ---

interface DirectoryHideTemplateProps {
  directoryPath: string;
  duration: number;
}

const DirectoryHideTemplate: React.FC<DirectoryHideTemplateProps> = ({
  directoryPath,
  duration,
}) => {
  const fileTree = useMemo(() => {
    const fileInfos = createFileInfoList(sampleFiles);
    return buildFileSystemTreeFromFileInfoList(fileInfos, 'main');
  }, []);

  const {
    currentCityData,
    isHidden,
    progress,
    isAnimating,
    hide,
    show,
    toggle,
    skipToHidden,
    skipToVisible,
  } = useDirectoryHide(fileTree, directoryPath, { duration });

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
      />

      {/* Info bar - top */}
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Hide Directory</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Toggling visibility of <code style={{ color: '#38bdf8' }}>{directoryPath}</code>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
            Status: {isHidden ? 'Hidden' : 'Visible'} &middot;{' '}
            Progress: {Math.round(progress * 100)}%
          </div>
        </div>
      </div>

      {/* Controls - bottom */}
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
        {/* Progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              height: 6,
              background: '#334155',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                background: isHidden ? '#ef4444' : '#22c55e',
                borderRadius: 3,
                transition: 'background 0.3s',
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={hide}
            disabled={isHidden || isAnimating}
            style={{
              padding: '8px 20px',
              background: isHidden || isAnimating ? '#1e293b' : '#ef4444',
              border: '1px solid transparent',
              borderRadius: 6,
              color: isHidden || isAnimating ? '#475569' : '#ffffff',
              cursor: isHidden || isAnimating ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Hide
          </button>

          <button
            onClick={show}
            disabled={!isHidden || isAnimating}
            style={{
              padding: '8px 20px',
              background: !isHidden || isAnimating ? '#1e293b' : '#22c55e',
              border: '1px solid transparent',
              borderRadius: 6,
              color: !isHidden || isAnimating ? '#475569' : '#ffffff',
              cursor: !isHidden || isAnimating ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Show
          </button>

          <button
            onClick={toggle}
            disabled={isAnimating}
            style={{
              padding: '8px 20px',
              background: isAnimating ? '#1e293b' : '#3b82f6',
              border: '1px solid transparent',
              borderRadius: 6,
              color: isAnimating ? '#475569' : '#ffffff',
              cursor: isAnimating ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Toggle
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={skipToHidden}
              style={{
                padding: '8px 16px',
                background: '#334155',
                border: '1px solid #475569',
                borderRadius: 6,
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Skip to Hidden
            </button>
            <button
              onClick={skipToVisible}
              style={{
                padding: '8px 16px',
                background: '#334155',
                border: '1px solid #475569',
                borderRadius: 6,
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Skip to Visible
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hide the src/components directory.
 * Watch the directory's buildings shrink out and remaining files reposition.
 */
export const HideComponents: Story = {
  render: () => (
    <DirectoryHideTemplate directoryPath="src/components" duration={1500} />
  ),
};

/**
 * Hide the src/utils directory.
 */
export const HideUtils: Story = {
  render: () => (
    <DirectoryHideTemplate directoryPath="src/utils" duration={1500} />
  ),
};

/**
 * Hide the src/hooks directory.
 */
export const HideHooks: Story = {
  render: () => (
    <DirectoryHideTemplate directoryPath="src/hooks" duration={1500} />
  ),
};
