import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CitySource,
} from '../components/FileCity3D';
import { useCitySourceTransition } from '../hooks/useCitySourceTransition';
import { buildPackageSources } from '../utils/buildPackageSources';
import { buildFileSystemTreeFromFileInfoList } from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta = {
  title: 'Components/FileCity3D/PackageSeparation',
  parameters: { layout: 'fullscreen' },
};

export default meta;

// --- Build a synthetic monorepo file tree ---

interface SyntheticFile {
  path: string;
  size: number;
  lineCount: number;
}

function createFileInfoList(files: SyntheticFile[]): FileInfo[] {
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

function makePackageFiles(pkgDir: string, fileNames: string[]): SyntheticFile[] {
  return fileNames.map((name) => {
    const isCode = /\.(ts|tsx|js|py|rs|go)$/.test(name);
    const lineCount = isCode
      ? Math.floor(Math.exp(Math.random() * Math.log(900) + Math.log(30)))
      : Math.floor(Math.random() * 200) + 10;
    return {
      path: `${pkgDir}/${name}`,
      size: lineCount * 40,
      lineCount,
    };
  });
}

const MONOREPO_FILES: SyntheticFile[] = [
  ...makePackageFiles('packages/builder', [
    'index.ts', 'CodeCityBuilder.ts', 'GridLayoutManager.ts', 'cityTransition.ts',
    'types/cityData.ts', 'types/cityTransition.ts', 'utils/treemap.ts', 'utils/layout.ts',
  ]),
  ...makePackageFiles('packages/react', [
    'index.ts', 'FileCity3D.tsx', 'CityContent.tsx', 'CityLights.tsx',
    'hooks/useCityTransition.ts', 'hooks/useDirectoryHide.ts', 'components/InstancedBuildings.tsx',
    'components/DistrictFloor.tsx', 'stories/CommitTransition.stories.tsx', 'stories/MultiCitySideBySide.stories.tsx',
  ]),
  ...makePackageFiles('packages/server', [
    'index.ts', 'routes.ts', 'cityController.ts', 'treemapService.ts',
  ]),
  ...makePackageFiles('packages/cli', [
    'index.ts', 'commands.ts', 'render.ts', 'watch.ts',
  ]),
  // Root files belong to no package — these shrink away during the transition.
  { path: 'package.json', size: 1200, lineCount: 45 },
  { path: 'tsconfig.json', size: 800, lineCount: 30 },
  { path: 'README.md', size: 3500, lineCount: 120 },
];

const PACKAGES = [
  { label: 'builder', rootPath: 'packages/builder' },
  { label: 'react', rootPath: 'packages/react' },
  { label: 'server', rootPath: 'packages/server' },
  { label: 'cli', rootPath: 'packages/cli' },
];

function PackageSeparationScene() {
  const fileTree = useMemo(() => {
    const fileInfos = createFileInfoList(MONOREPO_FILES);
    return buildFileSystemTreeFromFileInfoList(fileInfos, 'main');
  }, []);

  const { beforeCity, afterSources } = useMemo(
    () =>
      buildPackageSources(fileTree, PACKAGES, {
        cellPadding: 30,
        layoutColumns: 2,
        treemapOptions: {
          paddingTop: 2,
          paddingBottom: 2,
          paddingLeft: 2,
          paddingRight: 2,
          paddingInner: 1,
          paddingOuter: 3,
        },
      }),
    [fileTree],
  );

  const {
    sources,
    progress,
    isTransitioning,
    startTransition,
    setProgress,
    reset,
    finish,
  } = useCitySourceTransition(beforeCity, afterSources, {
    duration: 1600,
  });

  // Map the hook's results into CitySource objects for FileCity3D.
  const citySources: CitySource[] = useMemo(
    () =>
      sources.map(s => ({
        cityData: s.cityData,
        positionOffset: s.offset,
        label: s.label,
        districtAppearingProgress: s.districtAppearingProgress,
        labelProgress: s.labelProgress,
        isRemovalLayer: s.isRemovalLayer,
      })),
    [sources],
  );

  const pct = Math.round(progress * 100);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <FileCity3D
          height="100%"
          width="100%"
          isGrown={false}
          animation={{ startFlat: true, autoStartDelay: null }}
          showControls={false}
          backgroundColor="#0f172a"
          heightScaling="linear"
          linearScale={1}
          citySources={citySources}
        />
      </div>

      {/* Control bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderTop: '1px solid #334155',
          padding: '12px 20px',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Unified City → Packages
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Merged</span>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={e => setProgress(Number(e.target.value) / 100)}
            style={{
              flex: 1,
              height: 6,
              appearance: 'none',
              background: `linear-gradient(to right, #3b82f6 ${pct}%, #334155 ${pct}%)`,
              borderRadius: 3,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 11, color: '#64748b' }}>Separated</span>
        </div>

        <button
          onClick={startTransition}
          disabled={isTransitioning}
          style={{
            padding: '8px 20px',
            background: '#3b82f6',
            border: '1px solid transparent',
            borderRadius: 6,
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isTransitioning ? 'Animating...' : 'Separate Packages'}
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
          }}
        >
          End
        </button>

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
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export const PackageSeparation: StoryObj = {
  render: () => <PackageSeparationScene />,
};
