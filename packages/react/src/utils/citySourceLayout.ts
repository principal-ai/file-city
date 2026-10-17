/**
 * Multi-city layout math — shared by the 3D (`FileCity3D`) and 2D
 * (`ArchitectureMapHighlightLayers`) renderers so both place `CitySource`s in
 * the same X/Z arrangement.
 *
 * The math is pure 2D geometry (X/Z plane): each source's footprint is centered
 * on its resolved offset, so a grid layout, a combined-bounds fit, and a label
 * anchor all resolve identically regardless of how a city is drawn.
 */

import type { CitySource } from '../components/FileCity3D/FileCity3D';

/**
 * Resolve each source's effective `positionOffset`. A source with `gridCell`
 * wins over its `positionOffset` — the grid layout (centered on the world
 * origin, uniform cell = largest footprint + `gridGap`, `row` growing downward)
 * mirrors `buildPackageSources` but operates on already-built `CitySource`s so
 * hosts never compute world-space offsets themselves. Sources without `gridCell`
 * keep their `positionOffset` (defaulting to `{ x: 0, z: 0 }`); a mixed
 * arrangement is valid. Only sources that actually have buildings contribute
 * footprint measurements to the cell size, so an empty removal layer won't
 * inflate the grid.
 *
 * `gridGap` defaults to a sensible fraction of the largest footprint when not
 * supplied (mirroring `buildPackageSources`' `cellPadding = 40`).
 */
export function resolveSourceOffsets(
  sources: CitySource[],
  gridGap?: number,
): { x: number; z: number }[] {
  const hasGrid = sources.some(s => s.gridCell);
  if (!hasGrid) {
    // Pure positionOffset path (the legacy default). Keep {x:0,z:0} when unset.
    return sources.map(s => s.positionOffset ?? { x: 0, z: 0 });
  }

  // Measure the largest footprint among sources that will render buildings.
  let maxW = 0;
  let maxD = 0;
  for (const s of sources) {
    if (s.cityData.buildings.length === 0) continue;
    const b = s.cityData.bounds;
    maxW = Math.max(maxW, b.maxX - b.minX);
    maxD = Math.max(maxD, b.maxZ - b.minZ);
  }
  const gap = gridGap ?? Math.max(40, Math.max(maxW, maxD) * 0.25);
  const cellW = maxW + gap;
  const cellD = maxD + gap;

  // Grid extent from the gridCell-bearing sources only. `row` grows downward.
  let cols = 1;
  let rows = 1;
  for (const s of sources) {
    if (!s.gridCell) continue;
    cols = Math.max(cols, s.gridCell.col + 1);
    rows = Math.max(rows, s.gridCell.row + 1);
  }
  const originX = -(cols * cellW) / 2 + cellW / 2;
  const originZ = -(rows * cellD) / 2 + cellD / 2;

  return sources.map(s => {
    if (!s.gridCell) return s.positionOffset ?? { x: 0, z: 0 };
    return {
      x: originX + s.gridCell.col * cellW,
      z: originZ + s.gridCell.row * cellD,
    };
  });
}

export interface GlobalBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  size: number;
}

/**
 * Compute the combined bounding box from multiple `CitySource` instances.
 *
 * A city's rendered footprint is centered on its resolved offset, spanning
 * `±bounds/2`. The raw `cityData.bounds` are NOT shifted by the offset (that
 * would double-count the city's center, e.g. a city at offset −120 with bounds
 * 0..50 would be treated as −120..−70 when it actually renders −145..−95).
 */
export function computeGlobalBounds(
  sources: CitySource[],
  offsets: { x: number; z: number }[],
): GlobalBounds {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const ox = offsets[i].x;
    const oz = offsets[i].z;
    const b = s.cityData.bounds;
    const halfW = (b.maxX - b.minX) / 2;
    const halfD = (b.maxZ - b.minZ) / 2;
    minX = Math.min(minX, ox - halfW);
    maxX = Math.max(maxX, ox + halfW);
    minZ = Math.min(minZ, oz - halfD);
    maxZ = Math.max(maxZ, oz + halfD);
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const size = Math.max(width, depth);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth, size };
}
