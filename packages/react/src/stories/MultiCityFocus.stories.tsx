import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FileCity3D } from '../components/FileCity3D';
import type { CityData, CityBuilding, CityDistrict, CitySource } from '../components/FileCity3D';

const meta: Meta = {
  title: 'Components/MultiCityFocus',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const CODE_EXTS = ['ts', 'tsx', 'js', 'py', 'rs', 'go', 'java', 'ts', 'tsx', 'js'];
const NON_CODE_EXTS = ['json', 'css', 'md', 'yaml'];

function generateBuildings(
  basePath: string,
  count: number,
  areaWidth: number,
  areaDepth: number,
): CityBuilding[] {
  const buildings: CityBuilding[] = [];
  const exts = [...CODE_EXTS, ...NON_CODE_EXTS];
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ext = exts[i % exts.length];
    const isCode = CODE_EXTS.includes(ext);
    const lineCount = isCode
      ? Math.floor(Math.exp(Math.random() * Math.log(3000 - 20) + Math.log(20)))
      : undefined;
    const size = isCode ? lineCount! * 40 : Math.floor(Math.random() * 200000) + 1000;
    buildings.push({
      path: `${basePath}/file${i}.${ext}`,
      position: {
        x: (col / cols) * areaWidth + areaWidth / cols / 2,
        y: 0,
        z: (row / cols) * areaDepth + areaDepth / cols / 2,
      },
      dimensions: [(areaWidth / cols) * 0.7, 10, (areaDepth / cols) * 0.7],
      type: 'file',
      fileExtension: ext,
      size,
      lineCount,
    });
  }
  return buildings;
}

function buildCity(path: string, count: number, size: number): CityData {
  const buildings = generateBuildings(path, count, size, size);
  const district: CityDistrict = {
    path,
    worldBounds: { minX: -2, maxX: size + 2, minZ: -2, maxZ: size + 2 },
    fileCount: count,
    type: 'directory',
    label: {
      text: path.split('/').pop() ?? path,
      bounds: { minX: -2, maxX: size + 2, minZ: size + 2, maxZ: size + 10 },
      position: 'bottom',
    },
  };
  return {
    buildings,
    districts: [district],
    bounds: { minX: -5, maxX: size + 5, minZ: -5, maxZ: size + 5 },
    metadata: { totalFiles: count, totalDirectories: 1, rootPath: path, analyzedAt: new Date() },
  };
}

const repos = [
  { name: 'auth-server', size: 70, count: 34 },
  { name: 'web-app', size: 55, count: 26 },
  { name: 'shared-lib', size: 40, count: 18 },
  { name: 'data-pipeline', size: 62, count: 30 },
  { name: 'design-system', size: 36, count: 16 },
  { name: 'analytics', size: 48, count: 22 },
];

// Grid (col, row) with row growing downward, mirroring how the agent session
// panel groups repos. The library computes the world offsets from these + gridGap.
const gridCells = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
  { col: 0, row: 1 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
];

const ownerFor: Record<string, string | undefined> = {
  'auth-server': 'https://github.com/principal-ai.png?size=40',
  'web-app': 'https://github.com/anomalyco.png?size=40',
  'shared-lib': 'https://github.com/principal-ade.png?size=40',
};

const buttonBar: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 8,
  zIndex: 10,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(10, 14, 22, 0.85)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(6px)',
};

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 6,
  border: active ? '1px solid rgba(251, 191, 36, 0.7)' : '1px solid rgba(255,255,255,0.15)',
  background: active ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
  color: active ? '#fbbf24' : 'rgba(255,255,255,0.7)',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
  cursor: 'pointer',
  transition: 'all 150ms',
  whiteSpace: 'nowrap' as const,
});

function MultiRepoFocusScene() {
  const sources = useMemo<CitySource[]>(
    () =>
      repos.map((repo, i) => ({
        cityData: buildCity(repo.name, repo.count, repo.size),
        positionOffset: { x: 0, z: 0 },
        gridCell: gridCells[i],
        label: repo.name,
        ownerAvatarUrl: ownerFor[repo.name],
      })),
    [],
  );

  const [focused, setFocused] = useState<CitySource[]>([]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <div style={buttonBar}>
        <button
          type="button"
          style={btn(focused.length === 0)}
          onClick={() => setFocused([])}
        >
          Overview
        </button>
        {sources.map((s, i) => (
          <button
            key={sources.indexOf(s)}
            type="button"
            style={btn(focused.includes(s))}
            onClick={() =>
              setFocused((prev) =>
                prev.includes(s) ? prev.filter((f) => f !== s) : [s],
              )
            }
          >
            {repos[i].name}
          </button>
        ))}
      </div>
      <FileCity3D
        height="100%"
        width="100%"
        isGrown={false}
        animation={{ startFlat: true, autoStartDelay: null }}
        showControls={false}
        backgroundColor="#0f172a"
        heightScaling="linear"
        linearScale={1}
        citySources={sources}
        gridGap={60}
        focusedSources={focused}
        dimOpacity={0.12}
        onSourceFocusChange={(source) => setFocused(source ? [source] : [])}
      />
    </div>
  );
}

export const GridFocusAndDim: StoryObj = {
  render: () => <MultiRepoFocusScene />,
};
