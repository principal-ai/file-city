import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileCity3D, type CityData } from '../components/FileCity3D';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
  diffCityData,
  interpolateCityData,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D/ModifiedFiles',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof FileCity3D>;

function buildCity(files: { path: string; size: number; lineCount?: number }[]): CityData {
  const fileInfos: FileInfo[] = files.map(f => ({
    name: f.path.split('/').pop() || f.path,
    path: f.path,
    relativePath: f.path,
    size: f.size,
    extension: f.path.includes('.') ? '.' + (f.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
  const tree = buildFileSystemTreeFromFileInfoList(fileInfos, 'main');
  const builder = new CodeCityBuilderWithGrid();
  return builder.buildCityFromFileSystem(tree, '', {
    paddingTop: 2, paddingBottom: 2, paddingLeft: 2, paddingRight: 2,
    paddingInner: 1, paddingOuter: 3,
  });
}

const beforeFiles = [
  { path: 'src/index.ts', size: 400, lineCount: 12 },
  { path: 'src/App.tsx', size: 1200, lineCount: 38 },
  { path: 'src/components/Header.tsx', size: 1400, lineCount: 42 },
  { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
  { path: 'src/components/Layout.tsx', size: 1100, lineCount: 34 },
  { path: 'src/api/client.ts', size: 2200, lineCount: 68 },
  { path: 'src/api/types.ts', size: 1400, lineCount: 45 },
  { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 38 },
  { path: 'src/pages/Dashboard.tsx', size: 2800, lineCount: 88 },
  { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 68 },
];

// Same files, same positions, different line counts
const afterFiles = [
  { path: 'src/index.ts', size: 400, lineCount: 12 },
  { path: 'src/App.tsx', size: 1200, lineCount: 52 },        // +14
  { path: 'src/components/Header.tsx', size: 1400, lineCount: 56 }, // +14
  { path: 'src/components/Footer.tsx', size: 900, lineCount: 28 },
  { path: 'src/components/Layout.tsx', size: 1100, lineCount: 40 },  // +6
  { path: 'src/api/client.ts', size: 2200, lineCount: 82 },   // +14
  { path: 'src/api/types.ts', size: 1400, lineCount: 35 },    // -10
  { path: 'src/hooks/useAuth.ts', size: 1200, lineCount: 48 }, // +10
  { path: 'src/pages/Dashboard.tsx', size: 2800, lineCount: 112 }, // +24
  { path: 'src/pages/Settings.tsx', size: 2200, lineCount: 58 },   // -10
];

// Compute modified files map
function computeModified(): Record<string, { lineDelta: number }> {
  const prevMap = new Map(beforeFiles.map(f => [f.path, f]));
  const result: Record<string, { lineDelta: number }> = {};
  for (const file of afterFiles) {
    const prev = prevMap.get(file.path);
    if (prev && prev.lineCount !== file.lineCount) {
      result[file.path] = { lineDelta: (file.lineCount ?? 0) - (prev.lineCount ?? 0) };
    }
  }
  return result;
}

const Template: React.FC = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);

  const beforeCity = React.useMemo(() => buildCity(beforeFiles), []);
  const afterCity = React.useMemo(() => buildCity(afterFiles), []);
  const diff = React.useMemo(() => diffCityData(beforeCity, afterCity), []);
  const modifiedFiles = React.useMemo(() => computeModified(), []);

  const cityData = React.useMemo(() => {
    if (transitionProgress === 0) return beforeCity;
    if (transitionProgress >= 1) return afterCity;
    const interpolated = interpolateCityData(diff, transitionProgress, afterCity);
    return {
      buildings: interpolated.buildings
        .filter(b => b.opacity > 0.01)
        .map(b => ({
          path: b.path,
          position: b.position,
          dimensions: b.dimensions,
          type: 'file' as const,
          color: b.color,
          fileExtension: b.fileExtension,
          size: b.size,
          lineCount: b.lineCount,
        })),
      districts: interpolated.districts
        .filter(d => d.opacity > 0.01)
        .map(d => ({
          path: d.path,
          worldBounds: d.worldBounds,
          type: 'directory' as const,
          fileCount: d.fileCount ?? 0,
          label: d.label,
        })),
      bounds: afterCity.bounds,
      metadata: afterCity.metadata,
    };
  }, [transitionProgress, beforeCity, afterCity, diff]);

  const runTransition = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsTransitioning(true);
    setTransitionProgress(0);
    startRef.current = null;
    const duration = 2000;

    const animate = (ts: number) => {
      if (!playingRef.current) return;
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      if (elapsed < duration) {
        setTransitionProgress(elapsed / duration);
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTransitionProgress(1);
        // Pause then reset
        timeoutRef.current = setTimeout(() => {
          setTransitionProgress(0);
          setIsTransitioning(false);
          playingRef.current = false;
        }, 1500);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const modifiedCount = Object.keys(modifiedFiles).length;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, background: '#0f172a', color: '#e2e8f0', borderBottom: '1px solid #334155' }}>
        <strong>Modified Files Story</strong> — {modifiedCount} files modified
        <br />
        <small style={{ color: '#94a3b8' }}>
          Modified: {Object.entries(modifiedFiles).map(([path, { lineDelta }]) => {
            const name = path.split('/').pop();
            const sign = lineDelta > 0 ? '+' : '';
            return `${name}(${sign}${lineDelta})`;
          }).join(', ')}
        </small>
        <br />
        <button
          onClick={runTransition}
          disabled={isTransitioning}
          style={{
            marginTop: 8,
            padding: '6px 16px',
            background: isTransitioning ? '#475569' : '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isTransitioning ? 'default' : 'pointer',
            fontSize: 14,
          }}
        >
          {isTransitioning ? `Transitioning... (${Math.round(transitionProgress * 100)}%)` : 'Play Transition'}
        </button>
      </div>
      <FileCity3D
        cityData={cityData}
        height="100%"
        heightScaling="linear"
        linearScale={0.5}
        isGrown={false}
        showControls={false}
        modifiedFiles={transitionProgress > 0 && transitionProgress < 1 ? modifiedFiles : undefined}
        transitionProgress={transitionProgress}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <Template />,
};
