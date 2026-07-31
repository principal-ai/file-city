import type { Meta, StoryObj } from '@storybook/react';
import { Canvas, useThree } from '@react-three/fiber';
import { MapControls, PerspectiveCamera } from '@react-three/drei';
import { CityContent, CityLights, FileCity3D } from '../components/FileCity3D';
import type { CityData, CityBuilding, CityDistrict, HighlightLayer } from '../components/FileCity3D';

const meta: Meta = {
  title: 'Components/MultiCitySideBySide',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const CODE_EXTS = ['ts', 'tsx', 'js', 'py', 'rs', 'go', 'java', 'ts', 'tsx', 'js'];
const NON_CODE_EXTS = ['json', 'css', 'md', 'yaml'];

function generateBuildings(
  basePath: string,
  count: number,
  startX: number,
  startZ: number,
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
        x: startX + (col / cols) * areaWidth + areaWidth / cols / 2,
        y: 0,
        z: startZ + (row / cols) * areaDepth + areaDepth / cols / 2,
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

function buildCity(path: string, count: number, x: number, z: number, w: number, d: number): CityData {
  const buildings = generateBuildings(path, count, x, z, w, d);
  const district: CityDistrict = {
    path,
    worldBounds: { minX: x - 2, maxX: x + w + 2, minZ: z - 2, maxZ: z + d + 2 },
    fileCount: count,
    type: 'directory',
    label: {
      text: path.split('/').pop() ?? path,
      bounds: { minX: x - 2, maxX: x + w + 2, minZ: z + d + 2, maxZ: z + d + 10 },
      position: 'bottom',
    },
  };
  return {
    buildings,
    districts: [district],
    bounds: { minX: x - 5, maxX: x + w + 5, minZ: z - 5, maxZ: z + d + 5 },
    metadata: { totalFiles: count, totalDirectories: 1, rootPath: path, analyzedAt: new Date() },
  };
}

interface CityPlacement {
  data: CityData;
  offset: { x: number; z: number };
}

const placements: CityPlacement[] = [
  { data: buildCity('repo-a', 30, 0, 0, 80, 80), offset: { x: -100, z: 0 } },
  { data: buildCity('repo-b', 20, 0, 0, 60, 60), offset: { x: 100, z: 0 } },
];

const PADDING = 1.3;
const FOV = 50;

function computeCameraHeight(placements: CityPlacement[], aspect: number): number {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  // CityContent centers each city on its offset (bounds are centered on the
  // offset, not shifted by it), so use offset ± bounds/2 for the real span.
  for (const p of placements) {
    const b = p.data.bounds;
    const halfW = (b.maxX - b.minX) / 2;
    const halfD = (b.maxZ - b.minZ) / 2;
    minX = Math.min(minX, p.offset.x - halfW);
    maxX = Math.max(maxX, p.offset.x + halfW);
    minZ = Math.min(minZ, p.offset.z - halfD);
    maxZ = Math.max(maxZ, p.offset.z + halfD);
  }

  const spanX = (maxX - minX) * PADDING;
  const spanZ = (maxZ - minZ) * PADDING;
  const fovRad = (FOV * Math.PI) / 180;
  const hForX = spanX / (2 * aspect * Math.tan(fovRad / 2));
  const hForZ = spanZ / (2 * Math.tan(fovRad / 2));
  return Math.max(hForX, hForZ, 50);
}

const DEFAULT_ANIMATION = {
  startFlat: false,
  growDuration: 800,
  staggerDelay: 20,
};

function AutoFramedCamera({ placements }: { placements: CityPlacement[] }) {
  const viewport = useThree((s) => s.viewport);
  const aspect = viewport.width / viewport.height;
  const h = computeCameraHeight(placements, aspect);
  return <PerspectiveCamera makeDefault position={[0, h, 0]} near={1} far={h * 8} />;
}

const repoLabels = [
  'file-city', 'opencode', 'principal-ade', 'file-city-builder',
  'industry-theme', 'ade-prime', 'vscode-ade', 'storybook-ade',
];

const eightPlacements: CityPlacement[] = repoLabels.map((name, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const size = 40 + Math.floor(Math.random() * 30);
  return {
    data: buildCity(name, 12 + Math.floor(Math.random() * 20), 0, 0, size, size),
    offset: { x: col * 110 - 165, z: row * 110 - 55 },
  };
});

export const FlatSideBySide: StoryObj = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <Canvas flat frameloop="demand" style={{ width: '100%', height: '100%' }}>
        <AutoFramedCamera placements={placements} />
        <MapControls />
        <CityLights citySize={300} />
        {placements.map((p, i) => (
          <CityContent
            key={i}
            cityData={p.data}
            growProgress={0}
            animationConfig={DEFAULT_ANIMATION}
            highlightLayers={[]}
            visibilityLayers={[]}
            isolationMode="none"
            heightScaling="linear"
            linearScale={1}
            flatPatterns={[]}
            hoveredBuilding={null}
            selectedBuilding={null}
            selectedDistrict={null}
            focusDirectory={null}
            positionOffset={p.offset}
          />
        ))}
      </Canvas>
    </div>
  ),
};

export const EightRepos: StoryObj = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <Canvas flat frameloop="demand" style={{ width: '100%', height: '100%' }}>
        <AutoFramedCamera placements={eightPlacements} />
        <MapControls />
        <CityLights citySize={400} />
        {eightPlacements.map((p, i) => (
          <CityContent
            key={i}
            cityData={p.data}
            growProgress={0}
            animationConfig={DEFAULT_ANIMATION}
            highlightLayers={[]}
            visibilityLayers={[]}
            isolationMode="none"
            heightScaling="linear"
            linearScale={1}
            flatPatterns={[]}
            hoveredBuilding={null}
            selectedBuilding={null}
            selectedDistrict={null}
            focusDirectory={null}
            positionOffset={p.offset}
          />
        ))}
      </Canvas>
    </div>
  ),
};

const trailStyleSources = [
  { name: 'auth-server', color: '#3b82f6' },
  { name: 'web-app', color: '#a855f7' },
  { name: 'shared-lib', color: '#10b981' },
];

const highlightCityData = trailStyleSources.map((repo, i) =>
  buildCity(repo.name, 16 + i * 4, 0, 0, 50 + i * 5, 50 + i * 5),
);

const sourcePlacements = [
  { x: -120, z: 0 },
  { x: 0, z: 0 },
  { x: 120, z: 0 },
];

// Palette mirrors agentSessionsMode.tsx so the story renders exactly like the
// real agent-session overlay: amber = editing, white = actively editing fill,
// purple = reading, pink = grepping.
const ACTIVE_FILE_COLOR = '#ffffff';
const ACTIVE_FILE_BORDER_COLOR = '#f59e0b';
const READING_COLOR = '#a855f7';
const GREPPING_COLOR = '#e879f9';

// One session's activity inside a single repo → a stack of HighlightLayers,
// built the way agentSessionsMode constructs them (border for read/grep,
// fill+border for edits, cumulative read fill at low opacity).
interface SessionProfile {
  edited: number[];
  active: number[];
  reading: number[];
  readHistory: number[];
  grepping: number[];
}

function buildSessionLayers(repo: string, profile: SessionProfile): HighlightLayer[] {
  const f = (n: number) => `${repo}/file${n}.ts`;
  return [
    // Files this session edited across the whole run: thin amber border.
    {
      id: `agent-edited-border-${repo}`,
      name: `${repo} edited border`,
      enabled: true,
      color: ACTIVE_FILE_BORDER_COLOR,
      opacity: 0.8,
      borderWidth: 30,
      priority: 55,
      items: profile.edited.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
    // Files being edited right now: white fill + thick amber border ring.
    {
      id: `agent-active-${repo}`,
      name: `${repo} actively editing`,
      enabled: true,
      color: ACTIVE_FILE_COLOR,
      opacity: 0.9,
      priority: 100,
      items: profile.active.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'fill' as const,
      })),
    },
    {
      id: `agent-active-border-${repo}`,
      name: `${repo} actively editing border`,
      enabled: true,
      color: ACTIVE_FILE_BORDER_COLOR,
      opacity: 0.8,
      borderWidth: 100,
      priority: 101,
      items: profile.active.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
    // Reading activity: purple border ring on scanned files.
    {
      id: `agent-reading-${repo}`,
      name: `${repo} reading`,
      enabled: true,
      color: READING_COLOR,
      opacity: 0.5,
      borderWidth: 60,
      priority: 45,
      items: profile.reading.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
    // Cumulative read history: subtle purple fill (excludes edited files).
    {
      id: `agent-read-cumulative-${repo}`,
      name: `${repo} read history`,
      enabled: true,
      color: READING_COLOR,
      opacity: 0.12,
      priority: 40,
      items: profile.readHistory.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'fill' as const,
      })),
    },
    // Grepping activity: pink border ring.
    {
      id: `agent-grepping-${repo}`,
      name: `${repo} grepping`,
      enabled: true,
      color: GREPPING_COLOR,
      opacity: 0.5,
      borderWidth: 180,
      priority: 45,
      items: profile.grepping.map((n) => ({
        path: f(n),
        type: 'file' as const,
        renderStrategy: 'border' as const,
      })),
    },
  ];
}

// Each repo-city shows a *different* session so the story demonstrates that
// highlight layers are independent per city, not shared.
const sessionProfiles: SessionProfile[] = [
  // auth-server: heavy editing — several edits, an active two-file edit, wide read footprint
  {
    edited: [0, 1, 2, 3, 7],
    active: [1, 7],
    reading: [4, 5, 6],
    readHistory: [8, 9, 10, 11, 12],
    grepping: [5, 13],
  },
  // web-app: reading-heavy — mostly scanning, a single active edit
  {
    edited: [0, 8],
    active: [0],
    reading: [1, 2, 3, 4, 9],
    readHistory: [6, 7, 10, 11, 12, 13],
    grepping: [14, 15],
  },
  // shared-lib: grep-heavy investigation — pink rings everywhere, few edits
  {
    edited: [0],
    active: [0],
    reading: [3, 4],
    readHistory: [1, 2, 5, 6],
    grepping: [7, 8, 9, 10, 11, 12],
  },
];

const perCityHighlights: HighlightLayer[][] = trailStyleSources.map((repo, i) =>
  buildSessionLayers(repo.name, sessionProfiles[i]),
);

export const TrailStyleMultiRepo: StoryObj = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <FileCity3D
        height="100%"
        width="100%"
        // GuideStage renders the map flat (2D) by default — match that so the
        // story validates the real consumer path, not a 3D-only variant.
        isGrown={false}
        animation={{ startFlat: true, autoStartDelay: null }}
        showControls={false}
        backgroundColor="#0f172a"
        heightScaling="linear"
        linearScale={1}
        citySources={highlightCityData.map((data, i) => ({
          cityData: data,
          positionOffset: sourcePlacements[i],
          label: trailStyleSources[i].name,
          highlightLayers: perCityHighlights[i],
        }))}
      />
    </div>
  ),
};
