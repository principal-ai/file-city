import { CityData } from './types/cityData.js';
import { diffCityData } from './cityTransition.js';
import { InterpolatedBuilding, InterpolatedDistrict, DistrictDiff, BuildingDiff } from './types/cityTransition.js';
import {
  CrossSourceBuildingDiff,
  CrossSourceDiff,
  MultiSourceCityDiff,
} from './types/cityTransition.js';
import { getFileConfig } from './config/getFileConfig.js';

/**
 * Compute a cross-source diff: given a single "before" CityData and a map of
 * "after" CityData instances per source (with their world-space offsets),
 * produce a per-source change list where each building's `before` position
 * comes from the unified city and its `after` comes from the correct source.
 *
 * Each source only carries its OWN buildings. Buildings that exist in `before`
 * but in NO source are collected into `diff.removed` (the removal layer).
 */
export function diffMultiSourceCity(
  before: CityData,
  afterMap: Map<string, { cityData: CityData; label: string; offset: { x: number; z: number } }>,
): MultiSourceCityDiff {
  const beforeMap = new Map(before.buildings.map(b => [b.path, b]));
  const claimedPaths = new Set<string>();

  const sources: CrossSourceDiff[] = [];

  for (const [, entry] of afterMap) {
    const after = entry.cityData;
    const offset = entry.offset;
    const afterMapLocal = new Map(after.buildings.map(b => [b.path, b]));

    const buildings: CrossSourceBuildingDiff[] = [];
    let addedCount = 0;
    const removedCount = 0;
    let movedCount = 0;
    let unchangedCount = 0;

    for (const [path, a] of afterMapLocal.entries()) {
      const b = beforeMap.get(path);

      if (!b) {
        buildings.push({ path, changeType: 'added', after: a, targetOffset: offset });
        addedCount++;
        continue;
      }

      claimedPaths.add(path);
      const positionChanged =
        b.position.x !== a.position.x ||
        b.position.z !== a.position.z;
      const sizeChanged =
        b.dimensions[0] !== a.dimensions[0] ||
        b.dimensions[1] !== a.dimensions[1] ||
        b.dimensions[2] !== a.dimensions[2];

      // Buildings always count as "moved" when relocating to a grid cell with
      // an offset — even if local treemap coords happen to match, the world
      // position shifts.
      const hasOffset = offset.x !== 0 || offset.z !== 0;
      if (positionChanged || sizeChanged || hasOffset) {
        buildings.push({ path, changeType: 'moved', before: b, after: a, targetOffset: offset });
        movedCount++;
      } else {
        buildings.push({ path, changeType: 'unchanged', before: b, after: a, targetOffset: offset });
        unchangedCount++;
      }
    }

    const emptyBefore: CityData = {
      buildings: [],
      districts: [],
      bounds: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      metadata: { totalFiles: 0, totalDirectories: 0, rootPath: '', analyzedAt: new Date() },
    };
    const sourceDiff = diffCityData(emptyBefore, after);
    const districts: DistrictDiff[] = [...sourceDiff.districts];

    sources.push({
      label: entry.label,
      offset,
      buildings,
      districts,
      addedCount,
      removedCount,
      movedCount,
      unchangedCount,
      hasMixedChanges: sourceDiff.hasMixedChanges,
      afterCity: after,
    });
  }

  const removed: BuildingDiff[] = [];
  for (const b of before.buildings) {
    if (!claimedPaths.has(b.path)) {
      removed.push({ path: b.path, changeType: 'removed', before: b });
    }
  }

  return { sources, removed };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from);
  const to_ = hexToRgb(to);
  const r = Math.round(lerp(f.r, to_.r, t));
  const g = Math.round(lerp(f.g, to_.g, t));
  const b = Math.round(lerp(f.b, to_.b, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface InterpolatedSource {
  label: string;
  offset: { x: number; z: number };
  /** Interpolated CityData in the source's local coordinate frame. */
  currentCityData: CityData;
  /** Per-district appearing progress (0-1) for new districts. */
  districtAppearingProgress: Record<string, number>;
  interpolatedBuildings: InterpolatedBuilding[];
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  z: number;
}

/**
 * Interpolate a multi-source transition at progress t (0=before, 1=after).
 * Returns one InterpolatedSource per package, plus a "removal layer" source
 * (label 'before', offset {0,0}) carrying buildings that exist only in the
 * unified city — they shrink and fade in place.
 *
 * Coordinate model: CityContent renders each building at world position
 * `offset + (position - centerOf(cityData.bounds))`. We convert every
 * building's flight path to the source's local frame so the per-source
 * renderer places them correctly:
 *   world(t)    = lerp(before.pos - beforeCenter, after.pos + offset - afterCenter, t)
 *   local(t)    = world(t) - offset + afterCenter
 */
export function interpolateMultiSourceCity(
  diff: MultiSourceCityDiff,
  t: number,
  beforeCity: CityData,
): InterpolatedSource[] {
  const activeStages = computeActiveStages(diff);
  const stageWidth = activeStages > 0 ? 1 / activeStages : 1;

  let currentStage = 0;
  const removeStage = currentStage++;
  const moveStage = currentStage++;
  const districtAddStage = activeStages > 2 ? currentStage++ : -1;

  const beforeCenter = centerOf(beforeCity.bounds);
  const removalLayer = interpolateRemovalLayer(diff, t, removeStage, stageWidth, beforeCity.bounds);

  const sources = diff.sources.map((source: CrossSourceDiff) => {
    const afterCenter = centerOf(source.afterCity.bounds);

    const buildings: InterpolatedBuilding[] = source.buildings.map(d =>
      interpolateBuilding(d, t, beforeCenter, afterCenter, moveStage, stageWidth),
    );

    const districts: InterpolatedDistrict[] = source.districts.map(d =>
      interpolateDistrict(d, t, districtAddStage, stageWidth),
    );

    const districtAppearingProgress: Record<string, number> = {};
    for (const d of districts) {
      if (d.appearingProgress !== undefined && d.appearingProgress > 0) {
        districtAppearingProgress[d.path] = d.appearingProgress;
      }
    }

    const currentCityData: CityData = {
      buildings: buildings
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
      districts: districts
        .filter(d => d.opacity > 0.01)
        .map(d => ({
          path: d.path,
          worldBounds: d.worldBounds,
          type: 'directory' as const,
          fileCount: d.fileCount ?? 0,
          label: d.label,
        })),
      bounds: source.afterCity.bounds,
      metadata: source.afterCity.metadata,
    };

    return {
      label: source.label,
      offset: source.offset,
      currentCityData,
      districtAppearingProgress,
      interpolatedBuildings: buildings,
    };
  });

  return [...sources, removalLayer];
}

function centerOf(bounds: CityData['bounds']): Point2D {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function computeActiveStages(diff: MultiSourceCityDiff): number {
  const hasRemovals = diff.removed.length > 0;
  const hasMoves = diff.sources.some(s => s.movedCount > 0);
  const hasAdds = diff.sources.some(s => s.addedCount > 0);
  const hasNewDistricts = diff.sources.some(s =>
    s.districts.some(d => d.changeType === 'added'),
  );
  const splitAdd = hasAdds && hasNewDistricts;
  return (hasRemovals ? 1 : 0) + (hasMoves ? 1 : 0) + (splitAdd ? 2 : (hasAdds ? 1 : 0));
}

/**
 * The removal layer: the original unified city's footprint (offset {0,0})
 * rendering only buildings that don't belong to any package, shrinking and
 * fading in place.
 */
function interpolateRemovalLayer(
  diff: MultiSourceCityDiff,
  t: number,
  removeStage: number,
  stageWidth: number,
  beforeBounds: CityData['bounds'],
): InterpolatedSource {
  const buildings: InterpolatedBuilding[] = diff.removed.map(d => {
    if (!d.before) {
      return { path: d.path, position: { x: 0, y: 0, z: 0 }, dimensions: [0, 0, 0], opacity: 0, changeType: 'removed' };
    }
    const b = d.before;
    const sStart = removeStage * stageWidth;
    const sEnd = sStart + stageWidth;
    if (t >= sEnd) {
      return {
        path: d.path,
        position: { x: b.position.x, y: b.position.y, z: b.position.z },
        dimensions: [0, 0, 0],
        opacity: 0,
        changeType: 'removed',
        color: '#ef4444',
        fileExtension: b.fileExtension,
        size: b.size,
        lineCount: b.lineCount,
      };
    }
    if (t < sStart) {
      return {
        path: d.path,
        position: { x: b.position.x, y: b.position.y, z: b.position.z },
        dimensions: [...b.dimensions] as [number, number, number],
        opacity: 1,
        changeType: 'removed',
        color: b.color,
        fileExtension: b.fileExtension,
        size: b.size,
        lineCount: b.lineCount,
      };
    }
    const eased = easeInOutCubic(Math.min((t - sStart) / (sEnd - sStart), 1));
    const shrinkScale = 1 - eased;
    return {
      path: d.path,
      position: { x: b.position.x, y: b.position.y, z: b.position.z },
      dimensions: [
        b.dimensions[0] * shrinkScale,
        b.dimensions[1] * shrinkScale,
        b.dimensions[2] * shrinkScale,
      ],
      opacity: 1 - eased,
      changeType: 'removed',
      color: '#ef4444',
      fileExtension: b.fileExtension,
      size: b.size,
      lineCount: b.lineCount,
    };
  });

  // The removal layer reuses the before city's bounds so CityContent computes
  // the same centerOffset — buildings at before positions render exactly where
  // the unified city was (centered at the origin when offset is {0,0}).
  return {
    label: 'before',
    offset: { x: 0, z: 0 },
    currentCityData: {
      buildings: buildings.filter(b => b.opacity > 0.01).map(b => ({
        path: b.path,
        position: b.position,
        dimensions: b.dimensions,
        type: 'file' as const,
        color: b.color,
        fileExtension: b.fileExtension,
        size: b.size,
        lineCount: b.lineCount,
      })),
      districts: [],
      bounds: beforeBounds,
      metadata: { totalFiles: 0, totalDirectories: 0, rootPath: '', analyzedAt: new Date() },
    },
    districtAppearingProgress: {},
    interpolatedBuildings: buildings,
  };
}

function interpolateBuilding(
  d: CrossSourceBuildingDiff,
  t: number,
  beforeCenter: Point2D,
  afterCenter: Point2D,
  moveStage: number,
  stageWidth: number,
): InterpolatedBuilding {
  const offset = d.targetOffset;

  switch (d.changeType) {
    case 'added': {
      if (!d.after) {
        return { path: d.path, position: { x: 0, y: 0, z: 0 }, dimensions: [0, 0, 0], opacity: 0, changeType: 'added' };
      }
      const a = d.after;
      const local = {
        x: a.position.x,
        y: a.position.y,
        z: a.position.z,
      };
      const sStart = moveStage * stageWidth + stageWidth;
      const sEnd = sStart + stageWidth;
      if (t < sStart) {
        return {
          path: d.path,
          position: local,
          dimensions: [0, 0, 0],
          opacity: 0,
          changeType: 'added',
          color: a.color,
          fileExtension: a.fileExtension,
          size: a.size,
          lineCount: a.lineCount,
        };
      }
      const stageT = Math.min((t - sStart) / (sEnd - sStart), 1);
      const eased = easeOutBack(easeInOutCubic(stageT));
      const finalColor = a.color ?? getFileConfig(a.path).color;
      return {
        path: d.path,
        position: local,
        dimensions: [a.dimensions[0] * eased, a.dimensions[1] * eased, a.dimensions[2] * eased],
        opacity: stageT,
        changeType: 'added',
        color: lerpColor('#22c55e', finalColor, stageT),
        fileExtension: a.fileExtension,
        size: a.size,
        lineCount: a.lineCount,
      };
    }

    case 'moved':
    case 'unchanged': {
      if (!d.before || !d.after) {
        const ref = d.after ?? d.before;
        if (!ref) return { path: d.path, position: { x: 0, y: 0, z: 0 }, dimensions: [0, 0, 0], opacity: 0, changeType: d.changeType };
        return {
          path: d.path,
          position: { x: ref.position.x + offset.x, y: ref.position.y, z: ref.position.z + offset.z },
          dimensions: [...ref.dimensions] as [number, number, number],
          opacity: 1,
          changeType: d.changeType,
          color: ref.color,
          fileExtension: ref.fileExtension,
          size: ref.size,
          lineCount: ref.lineCount,
        };
      }
      // World-space flight path: unified city (centered at origin) → grid cell.
      const beforeWorld = {
        x: d.before.position.x - beforeCenter.x,
        y: d.before.position.y,
        z: d.before.position.z - beforeCenter.z,
      };
      const afterWorld = {
        x: d.after.position.x + offset.x - afterCenter.x,
        y: d.after.position.y,
        z: d.after.position.z + offset.z - afterCenter.z,
      };

      const sStart = moveStage * stageWidth;
      const sEnd = sStart + stageWidth;

      if (t < sStart) {
        const local = worldToLocal(beforeWorld, offset, afterCenter);
        return {
          path: d.path,
          position: { x: local.x, y: d.before.position.y, z: local.z },
          dimensions: [...d.before.dimensions] as [number, number, number],
          opacity: 1,
          changeType: 'moved',
          color: d.before.color,
          fileExtension: d.before.fileExtension,
          size: d.before.size,
          lineCount: d.before.lineCount,
        };
      }
      if (t >= sEnd) {
        return {
          path: d.path,
          position: { x: d.after.position.x, y: d.after.position.y, z: d.after.position.z },
          dimensions: [...d.after.dimensions] as [number, number, number],
          opacity: 1,
          changeType: d.changeType,
          color: d.after.color,
          fileExtension: d.after.fileExtension,
          size: d.after.size,
          lineCount: d.after.lineCount,
        };
      }
      const eased = easeInOutCubic(Math.min((t - sStart) / (sEnd - sStart), 1));
      const worldMid = {
        x: lerp(beforeWorld.x, afterWorld.x, eased),
        y: lerp(beforeWorld.y, afterWorld.y, eased),
        z: lerp(beforeWorld.z, afterWorld.z, eased),
      };
      const localMid = worldToLocal(worldMid, offset, afterCenter);
      return {
        path: d.path,
        position: { x: localMid.x, y: localMid.y, z: localMid.z },
        dimensions: [
          lerp(d.before.dimensions[0], d.after.dimensions[0], eased),
          lerp(d.before.dimensions[1], d.after.dimensions[1], eased),
          lerp(d.before.dimensions[2], d.after.dimensions[2], eased),
        ],
        opacity: 1,
        changeType: d.changeType,
        color: d.after.color,
        fileExtension: d.after.fileExtension,
        size: d.after.size,
        lineCount: d.after.lineCount,
      };
    }

    case 'removed': {
      if (!d.before) {
        return { path: d.path, position: { x: 0, y: 0, z: 0 }, dimensions: [0, 0, 0], opacity: 0, changeType: 'removed' };
      }
      const b = d.before;
      return {
        path: d.path,
        position: { x: b.position.x, y: b.position.y, z: b.position.z },
        dimensions: [...b.dimensions] as [number, number, number],
        opacity: 1,
        changeType: 'removed',
        color: b.color,
        fileExtension: b.fileExtension,
        size: b.size,
        lineCount: b.lineCount,
      };
    }
  }
}

function worldToLocal(world: Point3D, offset: { x: number; z: number }, afterCenter: Point2D): Point3D {
  return {
    x: world.x - offset.x + afterCenter.x,
    y: world.y,
    z: world.z - offset.z + afterCenter.z,
  };
}

function interpolateDistrict(
  d: DistrictDiff,
  t: number,
  districtAddStage: number,
  stageWidth: number,
): InterpolatedDistrict {
  if (d.changeType === 'unchanged') {
    return {
      path: d.path,
      worldBounds: d.after?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      opacity: 1,
      changeType: 'unchanged',
      fileCount: d.after?.fileCount,
      label: d.after?.label,
    };
  }

  if (d.changeType === 'removed') {
    return {
      path: d.path,
      worldBounds: d.before?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      opacity: 1,
      changeType: 'removed',
      fileCount: d.before?.fileCount,
      label: d.before?.label,
    };
  }

  if (d.changeType === 'added') {
    if (districtAddStage < 0) {
      return {
        path: d.path,
        worldBounds: d.after?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
        opacity: 1,
        changeType: 'added',
        fileCount: d.after?.fileCount,
        label: d.after?.label,
        appearingProgress: 1,
      };
    }
    const sStart = districtAddStage * stageWidth;
    const sEnd = sStart + stageWidth;
    if (t < sStart) {
      return {
        path: d.path,
        worldBounds: d.after?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
        opacity: 0,
        changeType: 'added',
        appearingProgress: 0,
      };
    }
    const stageT = Math.min((t - sStart) / (sEnd - sStart), 1);
    return {
      path: d.path,
      worldBounds: d.after?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
      opacity: stageT,
      changeType: 'added',
      fileCount: d.after?.fileCount,
      label: d.after?.label,
      appearingProgress: stageT,
    };
  }

  if (d.before && d.after) {
    const b = d.before.worldBounds;
    const a = d.after.worldBounds;
    const eased = easeInOutCubic(t);
    return {
      path: d.path,
      worldBounds: {
        minX: lerp(b.minX, a.minX, eased),
        maxX: lerp(b.maxX, a.maxX, eased),
        minZ: lerp(b.minZ, a.minZ, eased),
        maxZ: lerp(b.maxZ, a.maxZ, eased),
      },
      opacity: 1,
      changeType: 'moved',
      fileCount: d.after.fileCount,
      label: d.after.label,
    };
  }
  return {
    path: d.path,
    worldBounds: d.after?.worldBounds ?? { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
    opacity: 1,
    changeType: 'unchanged',
    fileCount: d.after?.fileCount,
    label: d.after?.label,
  };
}