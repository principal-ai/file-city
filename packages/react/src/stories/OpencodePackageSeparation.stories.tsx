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
import opencodeFiles from './fixtures/opencode-file-tree.json';
import opencodePackageManagers from './fixtures/opencode-package-managers.json';

const meta: Meta = {
  title: 'Components/FileCity3D/OpencodePackageSeparation',
  parameters: { layout: 'fullscreen' },
};

export default meta;

// Real opencode monorepo (anomalyco/opencode @ 4f62295e44). The fixture is a
// FileInfo list generated from `git ls-tree -r -l HEAD` — real file paths and
// byte sizes (heights), no line counts needed.
const FILE_TREE_SHA = '4f62295e44';

// Every package with its own package.json in the checkout — these are the
// per-package grid cells the unified city separates into.
const PACKAGES: Array<{ label: string; rootPath: string }> = [
  { label: 'glm52-rise-video', rootPath: 'artifacts/glm52-rise-video' },
  { label: 'github', rootPath: 'github' },  { label: 'app', rootPath: 'packages/app' },
  { label: 'cli', rootPath: 'packages/cli' },
  { label: 'client', rootPath: 'packages/client' },
  { label: 'codemode', rootPath: 'packages/codemode' },
  { label: 'console/app', rootPath: 'packages/console/app' },
  { label: 'console/core', rootPath: 'packages/console/core' },
  { label: 'console/function', rootPath: 'packages/console/function' },
  { label: 'console/mail', rootPath: 'packages/console/mail' },
  { label: 'console/resource', rootPath: 'packages/console/resource' },
  { label: 'console/support', rootPath: 'packages/console/support' },
  { label: 'core', rootPath: 'packages/core' },
  { label: 'desktop', rootPath: 'packages/desktop' },
  { label: 'effect-drizzle-sqlite', rootPath: 'packages/effect-drizzle-sqlite' },
  { label: 'effect-sqlite-node', rootPath: 'packages/effect-sqlite-node' },
  { label: 'enterprise', rootPath: 'packages/enterprise' },
  { label: 'function', rootPath: 'packages/function' },
  { label: 'http-recorder', rootPath: 'packages/http-recorder' },
  { label: 'httpapi-codegen', rootPath: 'packages/httpapi-codegen' },
  { label: 'llm', rootPath: 'packages/llm' },
  { label: 'opencode', rootPath: 'packages/opencode' },
  { label: 'plugin', rootPath: 'packages/plugin' },
  { label: 'protocol', rootPath: 'packages/protocol' },
  { label: 'schema', rootPath: 'packages/schema' },
  { label: 'script', rootPath: 'packages/script' },
  { label: 'sdk-next', rootPath: 'packages/sdk-next' },
  { label: 'sdk/js', rootPath: 'packages/sdk/js' },
  { label: 'server', rootPath: 'packages/server' },
  { label: 'session-ui', rootPath: 'packages/session-ui' },
  { label: 'slack', rootPath: 'packages/slack' },
  { label: 'stats/app', rootPath: 'packages/stats/app' },
  { label: 'stats/core', rootPath: 'packages/stats/core' },
  { label: 'stats/server', rootPath: 'packages/stats/server' },
  { label: 'storybook', rootPath: 'packages/storybook' },
  { label: 'tui', rootPath: 'packages/tui' },
  { label: 'ui', rootPath: 'packages/ui' },
  { label: 'web', rootPath: 'packages/web' },
  { label: 'vscode', rootPath: 'sdks/vscode' },
];

// Package-manager logos for the label badges. Managers come from the opencode
// package analysis (opencode-package-managers.json) — bun packages get the bun
// logo, everything else the npm logo.
const MANAGER_LOGO_URLS: Record<string, string> = {
  bun: 'https://cdn.simpleicons.org/bun/FBF0DF',
  npm: 'https://cdn.simpleicons.org/npm/CB3837',
};
const packageManagerByLabel = opencodePackageManagers as Record<string, string>;

function OpencodePackageSeparationScene() {
  const fileTree = useMemo(() => {
    const infos: FileInfo[] = (
      opencodeFiles as unknown as Array<Omit<FileInfo, 'lastModified'> & { lastModified: string }>
    ).map(f => ({ ...f, lastModified: new Date(f.lastModified) }));
    return buildFileSystemTreeFromFileInfoList(infos, FILE_TREE_SHA);
  }, []);

  const { beforeCity, afterSources } = useMemo(
    () =>
      buildPackageSources(fileTree, PACKAGES, {
        cellPadding: 20,
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
    duration: 1800,
  });

  const citySources: CitySource[] = useMemo(
    () =>
      sources.map(s => ({
        cityData: s.cityData,
        positionOffset: s.offset,
        label: s.label,
        districtAppearingProgress: s.districtAppearingProgress,
        badgeLogoUrl: MANAGER_LOGO_URLS[packageManagerByLabel[s.label] ?? 'npm'],
      })),
    [sources],
  );

  const pct = Math.round(progress * 100);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', background: '#0f172a' }}>
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
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          opencode — {afterSources.length} packages
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

export const OpencodePackageSeparation: StoryObj = {
  render: () => <OpencodePackageSeparationScene />,
};
