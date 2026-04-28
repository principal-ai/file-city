import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import {
  FileCity3D,
  type CityData,
  type ElevatedScopePanel,
} from '../components/FileCity3D';
import {
  buildFolderElevatedPanels,
  buildFolderIndex,
} from '../utils/folderElevatedPanels';

import electronAppCityData from '../../../../assets/electron-app-city-data.json';

/**
 * Use cases for `ElevatedScopePanel` — the colored slabs the file explorer
 * renders over collapsed directories. These stories drive `<FileCity3D>`
 * directly with hand-crafted panel arrays, so each story is a frozen
 * snapshot you can copy as a template when adding new panel features.
 *
 * Panels render only while the city is in flat (2D) mode; every story locks
 * the city flat with `isGrown={false}`.
 */

const cityData = electronAppCityData as CityData;
const folderIndex = buildFolderIndex(cityData);
const districtsByPath = new Map(cityData.districts.map(d => [d.path, d]));

function panelsFor(expanded: ReadonlySet<string>): ElevatedScopePanel[] {
  return buildFolderElevatedPanels({
    cityData,
    expandedFolders: expanded,
    index: folderIndex,
  });
}

const ROOT_ONLY = new Set<string>();
const TOP_LEVEL = new Set<string>(['electron-app']);
const PARTIAL = new Set<string>(['electron-app', 'electron-app/src']);
const DEEP = new Set<string>([
  'electron-app',
  'electron-app/src',
  'electron-app/src/main',
]);

const meta: Meta<typeof FileCity3D> = {
  title: 'Experiments/Elevated Scope Panels',
  component: FileCity3D,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Panel-interface use cases extracted from FileCityExplorer. Each ' +
          'story is static (no expansion/selection state) so the snapshots ' +
          'stay readable as documentation and copy-paste templates.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FileCity3D>;

const baseArgs = {
  cityData,
  isGrown: false,
  height: '100vh',
} as const;

// ---------------------------------------------------------------------------
// Expansion-state snapshots (helper-driven panels)
// ---------------------------------------------------------------------------

export const RootUmbrella: Story = {
  args: { ...baseArgs, elevatedScopePanels: panelsFor(ROOT_ONLY) },
  parameters: {
    docs: {
      description: {
        story:
          'Empty `expandedFolders` — one umbrella covers the whole project.',
      },
    },
  },
};

export const TopLevelExpanded: Story = {
  args: { ...baseArgs, elevatedScopePanels: panelsFor(TOP_LEVEL) },
  parameters: {
    docs: {
      description: {
        story:
          'Project root expanded — one umbrella per top-level directory ' +
          '(`src`, `docs`, `scripts`, …).',
      },
    },
  },
};

export const PartiallyExpanded: Story = {
  args: { ...baseArgs, elevatedScopePanels: panelsFor(PARTIAL) },
  parameters: {
    docs: {
      description: {
        story:
          'Root + `src` expanded. `src/*` directories surface as their own ' +
          'tiles while sibling top-level directories stay umbrella-ed.',
      },
    },
  },
};

export const DeeplyExpanded: Story = {
  args: { ...baseArgs, elevatedScopePanels: panelsFor(DEEP) },
  parameters: {
    docs: {
      description: {
        story:
          'Three levels expanded — `src/main/*` directories are now visible ' +
          'as individual tiles. Demonstrates how panel granularity follows ' +
          'expansion depth.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Decorating helper output
// ---------------------------------------------------------------------------

const HUMAN_AREA_LABELS: Record<string, string> = {
  'electron-app/docs': 'Documentation',
  'electron-app/scripts': 'Build & Tooling',
  'electron-app/.github': 'CI / CD',
  'electron-app/src': 'Application Code',
};

export const WithDisplayLabels: Story = {
  args: {
    ...baseArgs,
    elevatedScopePanels: panelsFor(TOP_LEVEL).map(panel => {
      const folderPath = panel.id.startsWith('folder::')
        ? panel.id.slice('folder::'.length)
        : null;
      const displayLabel = folderPath ? HUMAN_AREA_LABELS[folderPath] : undefined;
      return displayLabel ? { ...panel, displayLabel } : panel;
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Post-process the helper\'s output to attach a `displayLabel` ' +
          '(rendered above the technical folder name in a smaller font). ' +
          'This is the pattern FileCityExplorer uses to surface ' +
          'human-readable area names on top of folder umbrellas.',
      },
    },
  },
};

const RECOLORED_BY_PATH: Record<string, string> = {
  'electron-app/src': '#22c55e',
  'electron-app/docs': '#3b82f6',
  'electron-app/scripts': '#f59e0b',
};

export const RecoloredAndTranslucent: Story = {
  args: {
    ...baseArgs,
    elevatedScopePanels: panelsFor(TOP_LEVEL).map(panel => {
      const folderPath = panel.id.startsWith('folder::')
        ? panel.id.slice('folder::'.length)
        : null;
      const color = folderPath ? RECOLORED_BY_PATH[folderPath] : undefined;
      return color ? { ...panel, color, opacity: 0.55 } : { ...panel, opacity: 0.35 };
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Override `color` and `opacity` on helper output. Translucent ' +
          'panels let buildings beneath show through — useful when the ' +
          'panel is a hint, not an occluder.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Selection ring
// ---------------------------------------------------------------------------

const SELECTED_FOLDER = 'electron-app/src';
const SELECTION_RING_COLOR = '#fbbf24';

export const WithSelectionRing: Story = {
  args: {
    ...baseArgs,
    elevatedScopePanels: (() => {
      const panels = panelsFor(TOP_LEVEL);
      const idx = panels.findIndex(p => p.id === `folder::${SELECTED_FOLDER}`);
      if (idx < 0) return panels;
      const target = panels[idx];
      const inflate = 4;
      const ring: ElevatedScopePanel = {
        id: `folder-border::${SELECTED_FOLDER}`,
        color: SELECTION_RING_COLOR,
        height: (target.height ?? 4) - 2,
        thickness: 1,
        bounds: {
          minX: target.bounds.minX - inflate,
          maxX: target.bounds.maxX + inflate,
          minZ: target.bounds.minZ - inflate,
          maxZ: target.bounds.maxZ + inflate,
        },
      };
      const next = [...panels];
      next.splice(idx, 0, ring);
      return next;
    })(),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Insert an inflated, lower-height panel just *before* the target ' +
          'umbrella so only its rim peeks out — the selection-ring pattern ' +
          'used by FileCityExplorer. Order matters: the ring must come ' +
          'first so the umbrella draws on top of its centre.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Hand-built panels (no helper)
// ---------------------------------------------------------------------------

function panelFromDistrict(
  path: string,
  overrides: Partial<ElevatedScopePanel> = {},
): ElevatedScopePanel | null {
  const d = districtsByPath.get(path);
  if (!d) return null;
  return {
    id: `manual::${path}`,
    color: '#64748b',
    height: 4,
    thickness: 2,
    bounds: d.worldBounds,
    label: path.split('/').pop() ?? path,
    ...overrides,
  };
}

export const HandBuiltPanels: Story = {
  args: {
    ...baseArgs,
    elevatedScopePanels: [
      panelFromDistrict('electron-app/src', {
        color: '#22c55e',
        label: 'src',
        displayLabel: 'Application Code',
        labelColor: '#0f172a',
        labelSize: 80,
      }),
      panelFromDistrict('electron-app/docs', {
        color: '#3b82f6',
        opacity: 0.6,
        label: 'docs',
      }),
      panelFromDistrict('electron-app/scripts', {
        color: '#f59e0b',
        thickness: 6,
        label: 'scripts',
        displayLabel: 'Tooling',
        displayLabelColor: '#78350f',
      }),
    ].filter((p): p is ElevatedScopePanel => p !== null),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fully manual panel array — no helper. Bounds come straight from ' +
          '`cityData.districts[i].worldBounds`. Demonstrates `color`, ' +
          '`opacity`, `label`, `labelColor`, `labelSize`, `displayLabel`, ' +
          '`displayLabelColor`, and `thickness`. Use this shape when adding ' +
          'fields to `ElevatedScopePanel`.',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Cmd-click to dismiss (parent-owned dismiss flow)
// ---------------------------------------------------------------------------

function DismissOnCommandClickStory() {
  const [panels, setPanels] = useState<ElevatedScopePanel[]>(() =>
    panelsFor(TOP_LEVEL),
  );
  const [dismissingIds, setDismissingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const wired = panels.map(panel => ({
    ...panel,
    onClick: (event: MouseEvent) => {
      if (!event.metaKey) return;
      setDismissingIds(prev => {
        if (prev.has(panel.id)) return prev;
        const next = new Set(prev);
        next.add(panel.id);
        return next;
      });
    },
  }));

  const handleDismissed = useCallback((id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
    setDismissingIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <FileCity3D
      {...baseArgs}
      elevatedScopePanels={wired}
      dismissingPanelIds={dismissingIds}
      onPanelDismissed={handleDismissed}
    />
  );
}

export const DismissOnCommandClick: Story = {
  render: () => <DismissOnCommandClickStory />,
  parameters: {
    docs: {
      description: {
        story:
          '⌘-click (or ctrl-click on non-Mac with `event.metaKey`) a panel ' +
          'to lift it toward the camera and fade it out. The story owns ' +
          'both the `panels` array and a `dismissingIds` set: clicking adds ' +
          'the id to that set, `FileCity3D` plays the spring, and once it ' +
          'settles `onPanelDismissed` fires so the story drops the panel ' +
          'from both pieces of state. The component never owns the ' +
          'truth — it just animates and notifies.',
      },
    },
  },
};
