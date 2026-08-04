import { describe, expect, test } from 'bun:test';
import { buildFileSystemTreeFromFileInfoList } from '@principal-ai/file-city-builder';
import opencodeFiles from '../stories/fixtures/opencode-file-tree.json';
import { buildPackageSources } from './buildPackageSources';
import {
  computeChipWorldRect,
  computeCityLabelAnchor,
  padBoundsForLabel,
  rectsIntersect,
} from './cityLabelPlacement';

const PACKAGES: Array<{ label: string; rootPath: string }> = [
  { label: 'glm52-rise-video', rootPath: 'artifacts/glm52-rise-video' },
  { label: 'github', rootPath: 'github' },
  { label: 'app', rootPath: 'packages/app' },
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

const VIEWPORT = { width: 800, height: 600 };
const FOV = 50;
const FIT_PADDING = 1.08;
const CELL_PADDING = 20;

// Mirrors the story's flat overview framing (FileCity3D.computeFlatPose):
// the camera fits the whole grid into the viewport, so world-per-pixel is
// uniform in the top-down view.
function worldPerPxForGrid(gridWidth: number, gridDepth: number): number {
  const tanHalfFov = Math.tan((FOV * Math.PI) / 180 / 2);
  const aspect = VIEWPORT.width / VIEWPORT.height;
  const heightForDepth = gridDepth / (2 * tanHalfFov);
  const heightForWidth = gridWidth / (2 * tanHalfFov * aspect);
  const cameraHeight = Math.max(heightForDepth, heightForWidth) * FIT_PADDING;
  return (2 * cameraHeight * tanHalfFov) / VIEWPORT.height;
}

// Estimate of the rendered chip's pixel size, mirroring CitySourceLabel's
// styling: logo 20 + gap 6 + text + padding 16 + border 2, capped at 128px
// (border-box) so long labels ellipsize and the chip can never exceed the cap.
function estimateChipSizePx(label: string): { width: number; height: number } {
  const content = 44 + label.length * 7.6;
  return { width: Math.min(content, 128), height: 30 };
}

function buildSources() {
  const infos: Array<{ path: string; type: 'file' | 'directory'; size: number; lastModified: Date }> = (
    opencodeFiles as unknown as Array<{ path: string; type: 'file' | 'directory'; size: number; lastModified: string }>
  ).map(f => ({ ...f, lastModified: new Date(f.lastModified) }));
  const fileTree = buildFileSystemTreeFromFileInfoList(infos as never, '4f62295e44');
  return buildPackageSources(fileTree, PACKAGES, {
    cellPadding: CELL_PADDING,
    treemapOptions: {
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 2,
      paddingRight: 2,
      paddingInner: 1,
      paddingOuter: 3,
    },
  });
}

describe('computeCityLabelAnchor', () => {
  test('anchors the chip bottom edge just behind the city back edge', () => {
    const anchor = computeCityLabelAnchor({
      positionOffset: { x: 0, z: 0 },
      bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
    });
    expect(anchor.position.x).toBe(0);
    expect(anchor.footprintRect.maxZ).toBe(100);
    expect(anchor.position.z).toBe(-100 - anchor.gap);
    expect(anchor.gap).toBeGreaterThanOrEqual(8);
  });

  test('chip rect never intersects its own city footprint', () => {
    const offset = { x: 10, z: -20 };
    const bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    const anchor = computeCityLabelAnchor({ positionOffset: offset, bounds });
    const chip = computeChipWorldRect({
      anchor,
      chipSizePx: { width: 400, height: 28 },
      worldPerPx: 44,
    });
    expect(rectsIntersect(chip, anchor.footprintRect)).toBe(false);
  });
});

describe('padBoundsForLabel', () => {
  test('extends only the back (-Z) edge so the chip stays in frame', () => {
    const bounds = {
      minX: -30, maxX: 30, minZ: -30, maxZ: 30,
      centerX: 0, centerZ: 0, width: 60, depth: 60, size: 60,
    };
    const padded = padBoundsForLabel(bounds);
    expect(padded.minZ).toBeLessThan(bounds.minZ);
    expect(padded.maxZ).toBe(bounds.maxZ);
    expect(padded.minX).toBe(bounds.minX);
    expect(padded.maxX).toBe(bounds.maxX);
    expect(padded.centerZ).toBeCloseTo(bounds.centerZ - (bounds.minZ - padded.minZ) / 2);
  });

  test('margin scales with footprint so the chip fits at any zoom', () => {
    const small = padBoundsForLabel({
      minX: -30, maxX: 30, minZ: -30, maxZ: 30,
      centerX: 0, centerZ: 0, width: 60, depth: 60, size: 60,
    });
    const large = padBoundsForLabel({
      minX: -150, maxX: 150, minZ: -150, maxZ: 150,
      centerX: 0, centerZ: 0, width: 300, depth: 300, size: 300,
    });
    const smallMargin = -30 - small.minZ;
    const largeMargin = -150 - large.minZ;
    // Chip world height scales with the framing height (which scales with the
    // footprint), so the margin must grow with the footprint — not be fixed.
    expect(largeMargin).toBeGreaterThan(smallMargin);
    // But stay a sane fraction so a focus zoom doesn't dilute into an overview.
    expect(largeMargin / 300).toBeLessThan(0.2);
  });
});

describe('opencode package labels (real fixture)', () => {
  const { afterSources } = buildSources();
  const cols = Math.ceil(Math.sqrt(afterSources.length));
  const rows = Math.ceil(afterSources.length / cols);
  let maxW = 0;
  let maxD = 0;
  for (const p of afterSources) {
    const b = p.cityData.bounds;
    maxW = Math.max(maxW, b.maxX - b.minX);
    maxD = Math.max(maxD, b.maxZ - b.minZ);
  }
  const gridWidth = cols * (maxW + CELL_PADDING);
  const gridDepth = rows * (maxD + CELL_PADDING);
  const worldPerPx = worldPerPxForGrid(gridWidth, gridDepth);

  const chipRects = afterSources.map((p, i) => {
    const chipSizePx = estimateChipSizePx(p.label);
    const anchor = computeCityLabelAnchor({
      positionOffset: p.offset,
      bounds: p.cityData.bounds,
    });
    return {
      index: i,
      label: p.label,
      anchor,
      chip: computeChipWorldRect({ anchor, chipSizePx, worldPerPx }),
      footprint: (() => {
        const b = p.cityData.bounds;
        return {
          minX: p.offset.x - (b.maxX - b.minX) / 2,
          maxX: p.offset.x + (b.maxX - b.minX) / 2,
          minZ: p.offset.z - (b.maxZ - b.minZ) / 2,
          maxZ: p.offset.z + (b.maxZ - b.minZ) / 2,
        };
      })(),
    };
  });

  test('grid geometry is sane', () => {
    expect(afterSources.length).toBe(39);
    expect(cols).toBe(7);
    expect(rows).toBe(6);
  });

  test('no label chip overlaps its own city footprint', () => {
    const offenders = chipRects.filter(r => rectsIntersect(r.chip, r.footprint));
    expect(offenders.map(r => r.label)).toEqual([]);
  });

  test('no label chip overlaps any other city footprint', () => {
    const overlaps: string[] = [];
    for (const r of chipRects) {
      for (const other of chipRects) {
        if (other.index === r.index) continue;
        if (rectsIntersect(r.chip, other.footprint)) {
          overlaps.push(`${r.label} chip -> ${other.label} city`);
        }
      }
    }
    if (overlaps.length > 0) {
      console.log(`overlap analysis (viewport ${VIEWPORT.width}x${VIEWPORT.height}, ${worldPerPx.toFixed(1)} world/px):`);
      for (const o of overlaps) console.log(`  - ${o}`);
    }
    expect(overlaps).toEqual([]);
  });
});
