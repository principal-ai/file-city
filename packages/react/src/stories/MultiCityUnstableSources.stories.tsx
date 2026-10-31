import { useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import type { CityData, CitySource, HighlightLayer } from '../components/FileCity3D';
import { createStressTestCityData } from './stress-test-data';

/**
 * Reproduces the "Subsystems tab map is slow" case from Subsystems Studio.
 *
 * Studio's repo map renders through `FileCityGuidePanel`'s `GuideStage`, which
 * draws the **2D** renderer (`ArchitectureMapHighlightLayers`) with one full
 * city per repo, `fileColorLayers` built from every source's buildings, file
 * type icons, and directory labels. This story wires the renderer the same way
 * over several stress-sized cities.
 *
 * Two host behaviours to compare:
 * - `Stable sources` keeps the same `citySources` references; only the host
 *   re-renders. Hover the map: each hovered-building change triggers a full
 *   canvas redraw of every source.
 * - `Unstable sources (Studio)` additionally hands the renderer new
 *   `cityData` / `highlightLayers` objects on every host render, which is what
 *   the Studio host + repo-overview mode do today. Mousemove over the stage
 *   bumps host state, like Studio's divider drag.
 */
const meta: Meta = {
  title: 'Performance/MultiCityUnstableSources',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const REPOS = [
  { label: 'subsystems-studio', files: 3000, cell: { col: 0, row: 0 } },
  { label: 'file-city', files: 2200, cell: { col: 1, row: 0 } },
  { label: 'file-city-panels', files: 1600, cell: { col: 0, row: 1 } },
  { label: 'subsystems-core', files: 1200, cell: { col: 1, row: 1 } },
];

const NEUTRAL = '#64748b';
const ACCENT = '#38bdf8';
const BACKGROUND = '#0f172a';

/** Mirrors repoOverviewMode: one non-fill border layer over "referenced" files. */
function referencedLayer(city: CityData, count: number): HighlightLayer {
  return {
    id: 'repo-overview-referenced',
    name: 'Referenced files',
    enabled: true,
    color: ACCENT,
    priority: 50,
    items: city.buildings
      .filter((_, i) => i % Math.max(1, Math.floor(city.buildings.length / count)) === 0)
      .slice(0, count)
      .map((b) => ({ path: b.path, type: 'file' as const, renderStrategy: 'border' as const })),
  };
}

function buildBaseSources(): CitySource[] {
  return REPOS.map((r) => {
    const cityData = createStressTestCityData(r.files);
    return {
      cityData,
      positionOffset: { x: 0, z: 0 },
      gridCell: r.cell,
      label: r.label,
      highlightLayers: [referencedLayer(cityData, 40)],
      defaultBuildingColor: NEUTRAL,
      isolationMode: 'none' as const,
    };
  });
}

/**
 * Same content, new references: what the Studio host + repo-overview mode
 * produce per render (`buildCityDataFromContext` yields a new CityData, and
 * `attachHighlights` spreads each source with new `highlightLayers`).
 */
function cloneSources(sources: CitySource[]): CitySource[] {
  return sources.map((s) => ({
    ...s,
    cityData: {
      ...s.cityData,
      buildings: [...s.cityData.buildings],
      districts: [...s.cityData.districts],
      bounds: { ...s.cityData.bounds },
    },
    highlightLayers: (s.highlightLayers ?? []).map((l) => ({ ...l, items: [...l.items] })),
  }));
}

const overlay: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 8,
  background: 'rgba(10, 14, 22, 0.88)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  minWidth: 300,
  pointerEvents: 'auto',
};

const btn = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 6,
  border: active ? '1px solid rgba(251, 191, 36, 0.7)' : '1px solid rgba(255,255,255,0.15)',
  background: active ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
  color: active ? '#fbbf24' : 'rgba(255,255,255,0.7)',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

function UnstableSourcesHost({ initialUnstable }: { initialUnstable: boolean }) {
  const base = useMemo(buildBaseSources, []);
  const [unstable, setUnstable] = useState(initialUnstable);
  const [autoChurn, setAutoChurn] = useState(false);
  const [hover, setHover] = useState(true);
  // Host state that changes on mousemove, like Studio's divider drag.
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  // Render accounting: time from render start to commit, last 20 renders.
  const renderStart = performance.now();
  const renders = useRef(0);
  const samples = useRef<number[]>([]);
  const [, forceStats] = useState(0);
  renders.current += 1;
  useEffect(() => {
    const ms = performance.now() - renderStart;
    samples.current = [...samples.current.slice(-19), ms];
  });

  // Refresh the stats readout on a slow tick so it does not add render churn.
  useEffect(() => {
    const id = setInterval(() => forceStats((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoChurn) return;
    const id = setInterval(() => setPointer((p) => ({ x: p.x + 1, y: p.y })), 100);
    return () => clearInterval(id);
  }, [autoChurn]);

  // Stable: same references each render. Unstable: fresh objects each render,
  // which is exactly what the Studio host hands the map today.
  const sources = unstable ? cloneSources(base) : base;

  // GuideStage builds suffix colors from every source's buildings, once per
  // env. Kept stable here so only `citySources` churn is under test.
  const fileColorLayers = useMemo(
    () => createFileColorHighlightLayers(base.flatMap((s) => s.cityData.buildings)),
    [base],
  );

  const totalBuildings = base.reduce((n, s) => n + s.cityData.buildings.length, 0);
  const totalDistricts = base.reduce((n, s) => n + s.cityData.districts.length, 0);
  const recent = samples.current;
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const max = recent.length ? Math.max(...recent) : 0;

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: BACKGROUND, position: 'relative' }}
      onMouseMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
    >
      <div style={overlay}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btn(!unstable)} onClick={() => setUnstable(false)}>
            Stable sources
          </button>
          <button type="button" style={btn(unstable)} onClick={() => setUnstable(true)}>
            Unstable sources (Studio)
          </button>
          <button type="button" style={btn(autoChurn)} onClick={() => setAutoChurn((v) => !v)}>
            Auto churn 10/s
          </button>
          <button type="button" style={btn(hover)} onClick={() => setHover((v) => !v)}>
            Hover {hover ? 'on' : 'off'}
          </button>
        </div>
        <div style={{ opacity: 0.8 }}>
          2D renderer · {REPOS.length} cities · {totalBuildings.toLocaleString()} buildings ·{' '}
          {totalDistricts} districts
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums' }}>
          host renders: {renders.current} · render→commit avg {avg.toFixed(1)} ms · max{' '}
          {max.toFixed(1)} ms
        </div>
        <div style={{ opacity: 0.6, fontSize: 12 }}>
          Move the mouse over the stage to re-render the host (pointer {pointer.x},{pointer.y}).
          Hovering buildings redraws the whole canvas in both modes; Unstable also rebuilds the
          source model each render.
        </div>
      </div>
      <ArchitectureMapHighlightLayers
        citySources={sources}
        gridGap={60}
        fullSize
        fileColorLayers={fileColorLayers}
        canvasBackgroundColor={BACKGROUND}
        showFileTypeIcons
        showDirectoryLabels
        enableZoom={false}
        enableHover={hover}
        dimOpacity={0.12}
        onBuildingClick={(b) => console.info('[story] building click', b.path)}
      />
    </div>
  );
}

export const UnstableSources: StoryObj = {
  render: () => <UnstableSourcesHost initialUnstable />,
};

export const StableSources: StoryObj = {
  render: () => <UnstableSourcesHost initialUnstable={false} />,
};
