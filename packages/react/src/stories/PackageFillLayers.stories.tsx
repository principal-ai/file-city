import React, { useState, useCallback, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileCity3D,
  type CityData,
  type HighlightLayer,
} from '../components/FileCity3D';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

const meta: Meta<typeof FileCity3D> = {
  title: 'Components/FileCity3D/PackageFillLayers',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    isolationMode: {
      control: 'select',
      options: ['none', 'transparent', 'collapse', 'hide'],
    },
    dimOpacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// ---------------------------------------------------------------------------
// Monorepo city data — built from a file tree via CodeCityBuilderWithGrid
// ---------------------------------------------------------------------------

const MONOREPO_FILES: Array<{ path: string; lineCount: number }> = [
  // Root
  { path: 'package.json', lineCount: 45 },
  { path: 'README.md', lineCount: 120 },
  { path: 'tsconfig.json', lineCount: 30 },

  // src/auth
  { path: 'src/auth/login.ts', lineCount: 180 },
  { path: 'src/auth/session.ts', lineCount: 240 },
  { path: 'src/auth/session-manager.ts', lineCount: 320 },
  { path: 'src/auth/types.ts', lineCount: 65 },
  { path: 'src/auth/index.ts', lineCount: 20 },

  // src/api
  { path: 'src/api/client.ts', lineCount: 150 },
  { path: 'src/api/router.ts', lineCount: 95 },
  { path: 'src/api/middleware.ts', lineCount: 110 },
  { path: 'src/api/handlers.ts', lineCount: 200 },

  // src/db
  { path: 'src/db/users.ts', lineCount: 210 },
  { path: 'src/db/sessions.ts', lineCount: 180 },
  { path: 'src/db/migrations/001.sql', lineCount: 60 },
  { path: 'src/db/migrations/002.sql', lineCount: 45 },

  // src/ui
  { path: 'src/ui/Login.tsx', lineCount: 140 },
  { path: 'src/ui/Profile.tsx', lineCount: 175 },
  { path: 'src/ui/Dashboard.tsx', lineCount: 220 },
  { path: 'src/ui/components/Button.tsx', lineCount: 45 },
  { path: 'src/ui/components/Input.tsx', lineCount: 60 },
  { path: 'src/ui/components/Card.tsx', lineCount: 80 },

  // src/utils
  { path: 'src/utils/format.ts', lineCount: 55 },
  { path: 'src/utils/validate.ts', lineCount: 70 },
  { path: 'src/utils/api.ts', lineCount: 90 },

  // tests
  { path: 'tests/auth.test.ts', lineCount: 120 },
  { path: 'tests/api.test.ts', lineCount: 95 },
  { path: 'tests/db.test.ts', lineCount: 85 },
  { path: 'tests/ui.test.tsx', lineCount: 110 },
];

function createFileInfo(files: Array<{ path: string; lineCount: number }>): FileInfo[] {
  return files.map((f) => ({
    name: f.path.split('/').pop() || f.path,
    path: f.path,
    relativePath: f.path,
    size: f.lineCount * 35,
    lineCount: f.lineCount,
    extension: f.path.includes('.') ? '.' + (f.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
}

let cachedCityData: CityData | null = null;

function getMonorepoCityData(): CityData {
  if (cachedCityData) return cachedCityData;

  const fileInfos = createFileInfo(MONOREPO_FILES);
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos, 'mock-monorepo');
  const builder = new CodeCityBuilderWithGrid();

  cachedCityData = builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });

  return cachedCityData;
}

// ---------------------------------------------------------------------------
// Package fill layer generator — mirrors FileCityGuidePanel's internal logic
// ---------------------------------------------------------------------------

interface PackageDef {
  name: string;
  path: string;
  isMonorepoRoot?: boolean;
}

const PACKAGE_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

function buildPackageFillLayers(packages: PackageDef[]): HighlightLayer[] {
  const nonRoot = packages.filter(
    (p) =>
      !p.isMonorepoRoot &&
      p.path &&
      p.path.replace(/^\/+|\/+$/g, '').length > 0,
  );

  return nonRoot.map((pkg, i) => {
    const dir = pkg.path.replace(/^\/+|\/+$/g, '');
    return {
      id: `pkg-fill-${dir}`,
      name: pkg.name || dir,
      enabled: true,
      color: PACKAGE_COLORS[i % PACKAGE_COLORS.length],
      opacity: i * 0.2,
      priority: 10,
      items: [
        {
          path: dir,
          type: 'directory' as const,
          renderStrategy: 'fill' as const,
          interactive: true,
        },
      ],
    };
  });
}

// ---------------------------------------------------------------------------
// Story 1 — static package fills
// ---------------------------------------------------------------------------

const PACKAGES: PackageDef[] = [
  { name: '@mock/auth', path: 'src/auth' },
  { name: '@mock/api', path: 'src/api' },
  { name: '@mock/db', path: 'src/db' },
  { name: '@mock/ui', path: 'src/ui' },
  { name: '@mock/utils', path: 'src/utils' },
  { name: 'tests', path: 'tests' },
];

export const StaticPackageFills: Story = {
  args: {
    cityData: getMonorepoCityData(),
    height: '100vh',
    isolationMode: 'transparent',
    dimOpacity: 0.05,
    showControls: true,
    animation: {
      startFlat: true,
      autoStartDelay: null,
    },
    highlightLayers: buildPackageFillLayers(PACKAGES),
    onDirectorySelect: (dir: string | null) => {
      console.log('[PackageFillLayers] onDirectorySelect:', dir);
    },
  },
};

// ---------------------------------------------------------------------------
// Story 2 — interactive toggle per package
// ---------------------------------------------------------------------------

const InteractiveToggleHarness: React.FC = () => {
  const cityData = useMemo(() => getMonorepoCityData(), []);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(PACKAGES.map((p) => [p.path, true])),
  );

  const toggle = useCallback((path: string) => {
    setEnabled((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const layers: HighlightLayer[] = buildPackageFillLayers(PACKAGES).map(
    (layer) => ({
      ...layer,
      enabled: enabled[layer.items[0]?.path ?? ''] ?? true,
    }),
  );

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <FileCity3D
        cityData={cityData}
        width="100%"
        height="100%"
        isolationMode="transparent"
        dimOpacity={0.05}
        showControls
        highlightLayers={layers}
        animation={{ startFlat: true, autoStartDelay: null }}
      />
      {/* Toggle panel */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 8,
          padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.8,
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Package fills</div>
        {PACKAGES.map((pkg, i) => (
          <label
            key={pkg.path}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={enabled[pkg.path]}
              onChange={() => toggle(pkg.path)}
            />
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: PACKAGE_COLORS[i % PACKAGE_COLORS.length],
                opacity: 0.8,
              }}
            />
            {pkg.name}
          </label>
        ))}
      </div>
    </div>
  );
};

export const InteractiveToggle: Story = {
  render: () => <InteractiveToggleHarness />,
};

// ---------------------------------------------------------------------------
// Story 3 — fills + hover border overlay
// ---------------------------------------------------------------------------

const HoverBorderHarness: React.FC = () => {
  const cityData = useMemo(() => getMonorepoCityData(), []);
  const [hoveredPkg, setHoveredPkg] = useState<PackageDef | null>(null);

  const layers: HighlightLayer[] = [
    ...buildPackageFillLayers(PACKAGES),
    // Transient hover border at higher priority
    ...(hoveredPkg
      ? [
          {
            id: `hover-${hoveredPkg.path}`,
            name: `Hover: ${hoveredPkg.name}`,
            enabled: true,
            color: '#3b82f6',
            priority: 100,
            borderWidth: 3,
            items: [
              {
                path: hoveredPkg.path.replace(/^\/+|\/+$/g, ''),
                type: 'directory' as const,
                renderStrategy: 'border' as const,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <FileCity3D
        cityData={cityData}
        width="100%"
        height="100%"
        isolationMode="transparent"
        dimOpacity={0.05}
        showControls
        highlightLayers={layers}
        animation={{ startFlat: true, autoStartDelay: null }}
      />
      {/* Hover card list */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 8,
          padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.8,
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Hover a package</div>
        {PACKAGES.map((pkg, i) => (
          <div
            key={pkg.path}
            onMouseEnter={() => setHoveredPkg(pkg)}
            onMouseLeave={() => setHoveredPkg(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              background:
                hoveredPkg?.path === pkg.path
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'transparent',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: PACKAGE_COLORS[i % PACKAGE_COLORS.length],
                opacity: 0.8,
              }}
            />
            {pkg.name}
          </div>
        ))}
      </div>
      {/* Status */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: 6,
          padding: '6px 12px',
          color: hoveredPkg ? '#e2e8f0' : '#64748b',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
        }}
      >
        {hoveredPkg
          ? `Hovering: ${hoveredPkg.name} → ${hoveredPkg.path}`
          : 'Hover a package card to see the border overlay'}
      </div>
    </div>
  );
};

export const HoverBorderOverlay: Story = {
  render: () => <HoverBorderHarness />,
};

// ---------------------------------------------------------------------------
// Story 4 — fills + focused directory (camera zoom)
// ---------------------------------------------------------------------------

const FocusedDirectoryHarness: React.FC = () => {
  const cityData = useMemo(() => getMonorepoCityData(), []);
  const [selectedPkg, setSelectedPkg] = useState<PackageDef | null>(null);

  const layers: HighlightLayer[] = buildPackageFillLayers(PACKAGES);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <FileCity3D
        cityData={cityData}
        width="100%"
        height="100%"
        isolationMode="transparent"
        dimOpacity={0.05}
        showControls
        highlightLayers={layers}
        animation={{ startFlat: true, autoStartDelay: null }}
      />
      {/* Package list with select-to-focus */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 8,
          padding: '12px 16px',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.8,
          zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Select a package</div>
        {PACKAGES.map((pkg, i) => (
          <div
            key={pkg.path}
            onClick={() =>
              setSelectedPkg((prev) =>
                prev?.path === pkg.path ? null : pkg,
              )
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              background:
                selectedPkg?.path === pkg.path
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'transparent',
              color:
                selectedPkg?.path === pkg.path ? '#22c55e' : '#e2e8f0',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: PACKAGE_COLORS[i % PACKAGE_COLORS.length],
                opacity: 0.8,
              }}
            />
            {pkg.name}
          </div>
        ))}
      </div>
      {/* Status */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.85)',
          borderRadius: 6,
          padding: '6px 12px',
          color: selectedPkg ? '#22c55e' : '#64748b',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 50,
        }}
      >
        {selectedPkg
          ? `Selected: ${selectedPkg.name} — fills persist at priority 10`
          : 'Click a package to highlight it'}
      </div>
    </div>
  );
};

export const FocusedDirectory: Story = {
  render: () => <FocusedDirectoryHarness />,
};
