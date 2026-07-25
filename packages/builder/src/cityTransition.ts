import { CityData } from './types/cityData.js';
import { getFileConfig } from './config/getFileConfig.js';
import {
  BuildingDiff,
  CityDiff,
  DistrictDiff,
  InterpolatedBuilding,
  InterpolatedCityData,
  InterpolatedDistrict,
} from './types/cityTransition.js';

/**
 * Diff two city data states, producing a per-building change list.
 * Buildings are matched by path.
 */
export function diffCityData(before: CityData, after: CityData): CityDiff {
  const beforeMap = new Map(before.buildings.map(b => [b.path, b]));
  const afterMap = new Map(after.buildings.map(b => [b.path, b]));

  const allPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const buildings: BuildingDiff[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let movedCount = 0;
  let unchangedCount = 0;

  for (const path of allPaths) {
    const b = beforeMap.get(path);
    const a = afterMap.get(path);

    if (b && !a) {
      buildings.push({ path, changeType: 'removed', before: b });
      removedCount++;
    } else if (!b && a) {
      buildings.push({ path, changeType: 'added', after: a });
      addedCount++;
    } else if (b && a) {
      const positionChanged =
        b.position.x !== a.position.x || b.position.z !== a.position.z;
      const sizeChanged =
        b.dimensions[0] !== a.dimensions[0] ||
        b.dimensions[1] !== a.dimensions[1] ||
        b.dimensions[2] !== a.dimensions[2];

      if (positionChanged || sizeChanged) {
        buildings.push({ path, changeType: 'moved', before: b, after: a });
        movedCount++;
      } else {
        buildings.push({ path, changeType: 'unchanged', before: b, after: a });
        unchangedCount++;
      }
    }
  }

  // Diff districts
  const beforeDistrictMap = new Map(before.districts.map(d => [d.path, d]));
  const afterDistrictMap = new Map(after.districts.map(d => [d.path, d]));
  const allDistrictPaths = new Set([...beforeDistrictMap.keys(), ...afterDistrictMap.keys()]);
  const districts: DistrictDiff[] = [];

  for (const path of allDistrictPaths) {
    const b = beforeDistrictMap.get(path);
    const a = afterDistrictMap.get(path);

    if (b && !a) {
      districts.push({ path, changeType: 'removed', before: b });
      removedCount++;
    } else if (!b && a) {
      districts.push({ path, changeType: 'added', after: a });
      addedCount++;
    } else if (b && a) {
      const boundsChanged =
        b.worldBounds.minX !== a.worldBounds.minX ||
        b.worldBounds.maxX !== a.worldBounds.maxX ||
        b.worldBounds.minZ !== a.worldBounds.minZ ||
        b.worldBounds.maxZ !== a.worldBounds.maxZ;

      if (boundsChanged) {
        districts.push({ path, changeType: 'moved', before: b, after: a });
        movedCount++;
      } else {
        districts.push({ path, changeType: 'unchanged', before: b, after: a });
        unchangedCount++;
      }
    }
  }

  return {
    buildings,
    districts,
    addedCount,
    removedCount,
    movedCount,
    unchangedCount,
    hasMixedChanges: (addedCount > 0 ? 1 : 0) + (removedCount > 0 ? 1 : 0) + (movedCount > 0 ? 1 : 0) >= 2
      || districts.some(d => d.changeType === 'added'),
  };
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

/**
 * Interpolate between two city data states at a given t (0-1).
 *
 * - Moved buildings: position and dimensions lerp from before→after
 * - Added buildings: fade in (opacity 0→1, height 0→target)
 * - Removed buildings: fade out (opacity 1→0, height current→0)
 * - Unchanged buildings: stay at after values
 *
 * Added/removed buildings use a "pop" easing for a satisfying entrance/exit.
 */
export function interpolateCityData(
  diff: CityDiff,
  t: number,
  afterCity: CityData,
): InterpolatedCityData {
  // Compute adaptive stage boundaries based on which change types exist
  const hasRemovals = diff.removedCount > 0;
  const hasMoves = diff.movedCount > 0;
  const hasAdds = diff.addedCount > 0;
  const hasAddedDistricts = diff.districts.some(d => d.changeType === 'added');

  // Split "add" into districtAdd → buildingAdd when there are new directories
  const splitAdd = hasAdds && hasAddedDistricts;
  const activeStages = (hasRemovals ? 1 : 0) + (hasMoves ? 1 : 0) + (splitAdd ? 2 : (hasAdds ? 1 : 0));

  // Determine which stage each change type occupies
  // Order: remove → move → districtAdd → buildingAdd
  let currentStage = 0;
  const removeStage = hasRemovals ? currentStage++ : -1;
  const moveStage = hasMoves ? currentStage++ : -1;
  const districtAddStage = splitAdd ? currentStage++ : -1;
  const buildingAddStage = hasAdds ? (splitAdd ? currentStage++ : (districtAddStage >= 0 ? districtAddStage : currentStage++)) : -1;

  // Compute stage start/end boundaries (support up to 4 stages)
  const stageWidth = activeStages > 0 ? 1 / activeStages : 1;
  const stageStarts = [0, stageWidth, stageWidth * 2, stageWidth * 3];
  const stageEnds = [stageWidth, stageWidth * 2, stageWidth * 3, 1];

  const buildings: InterpolatedBuilding[] = diff.buildings.map(d => {
    if (diff.hasMixedChanges) {

      // Removed buildings: animate during their stage only
      if (d.changeType === 'removed' && removeStage >= 0) {
        const sStart = stageStarts[removeStage];
        const sEnd = stageEnds[removeStage];
        const eased = easeInOutCubic(Math.min((t - sStart) / (sEnd - sStart), 1));
        const b = d.before!;
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
      }

      // Added buildings: animate during their stage
      if (d.changeType === 'added' && buildingAddStage >= 0) {
        const sStart = stageStarts[buildingAddStage];
        const sEnd = stageEnds[buildingAddStage];
        if (t < sStart) {
          // Hidden before their stage
          const a = d.after!;
          return {
            path: d.path,
            position: { x: a.position.x, y: a.position.y, z: a.position.z },
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
        const a = d.after!;
        const finalColor = a.color ?? getFileConfig(a.path).color;
        return {
          path: d.path,
          position: { x: a.position.x, y: a.position.y, z: a.position.z },
          dimensions: [
            a.dimensions[0] * eased,
            a.dimensions[1] * eased,
            a.dimensions[2] * eased,
          ],
          opacity: stageT,
          changeType: 'added',
          color: lerpColor('#22c55e', finalColor, stageT),
          fileExtension: a.fileExtension,
          size: a.size,
          lineCount: a.lineCount,
        };
      }

      // Moved buildings: lerp during their stage only
      if (d.changeType === 'moved' && moveStage >= 0) {
        const sStart = stageStarts[moveStage];
        const sEnd = stageEnds[moveStage];
        if (t < sStart) {
          // Stay at before position before their stage
          const b = d.before!;
          return {
            path: d.path,
            position: { x: b.position.x, y: b.position.y, z: b.position.z },
            dimensions: [...b.dimensions] as [number, number, number],
            opacity: 1,
            changeType: 'moved',
            color: b.color,
            fileExtension: b.fileExtension,
            size: b.size,
            lineCount: b.lineCount,
          };
        }
        if (t >= sEnd) {
          // Stay at after position after their stage
          const a = d.after!;
          return {
            path: d.path,
            position: { x: a.position.x, y: a.position.y, z: a.position.z },
            dimensions: [...a.dimensions] as [number, number, number],
            opacity: 1,
            changeType: 'moved',
            color: a.color,
            fileExtension: a.fileExtension,
            size: a.size,
            lineCount: a.lineCount,
          };
        }
        // Lerp during their stage
        const stageT = easeInOutCubic((t - sStart) / (sEnd - sStart));
        const b = d.before!;
        const a = d.after!;
        return {
          path: d.path,
          position: {
            x: lerp(b.position.x, a.position.x, stageT),
            y: lerp(b.position.y, a.position.y, stageT),
            z: lerp(b.position.z, a.position.z, stageT),
          },
          dimensions: [
            lerp(b.dimensions[0], a.dimensions[0], stageT),
            lerp(b.dimensions[1], a.dimensions[1], stageT),
            lerp(b.dimensions[2], a.dimensions[2], stageT),
          ],
          opacity: 1,
          changeType: 'moved',
          color: a.color,
          fileExtension: a.fileExtension,
          size: a.size,
          lineCount: a.lineCount,
        };
      }
    }

    // Single-stage transition (or unchanged buildings in mixed mode)
    const eased = easeInOutCubic(t);

    switch (d.changeType) {
      case 'unchanged': {
        const b = d.after!;
        return {
          path: d.path,
          position: { x: b.position.x, y: b.position.y, z: b.position.z },
          dimensions: [...b.dimensions] as [number, number, number],
          opacity: 1,
          changeType: 'unchanged',
          color: b.color,
          fileExtension: b.fileExtension,
          size: b.size,
          lineCount: b.lineCount,
        };
      }

      case 'moved': {
        const b = d.before!;
        const a = d.after!;
        return {
          path: d.path,
          position: {
            x: lerp(b.position.x, a.position.x, eased),
            y: lerp(b.position.y, a.position.y, eased),
            z: lerp(b.position.z, a.position.z, eased),
          },
          dimensions: [
            lerp(b.dimensions[0], a.dimensions[0], eased),
            lerp(b.dimensions[1], a.dimensions[1], eased),
            lerp(b.dimensions[2], a.dimensions[2], eased),
          ],
          opacity: 1,
          changeType: 'moved',
          color: a.color,
          fileExtension: a.fileExtension,
          size: a.size,
          lineCount: a.lineCount,
        };
      }

      case 'added': {
        const a = d.after!;
        const popScale = easeOutBack(eased);
        const finalColor = a.color ?? getFileConfig(a.path).color;
        return {
          path: d.path,
          position: { x: a.position.x, y: a.position.y, z: a.position.z },
          dimensions: [
            a.dimensions[0] * popScale,
            a.dimensions[1] * popScale,
            a.dimensions[2] * popScale,
          ],
          opacity: eased,
          changeType: 'added',
          color: lerpColor('#22c55e', finalColor, t),
          fileExtension: a.fileExtension,
          size: a.size,
          lineCount: a.lineCount,
        };
      }

      case 'removed': {
        const b = d.before!;
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
      }

      default: {
        // Unchanged buildings
        const b = d.after!;
        return {
          path: d.path,
          position: { x: b.position.x, y: b.position.y, z: b.position.z },
          dimensions: [...b.dimensions] as [number, number, number],
          opacity: 1,
          changeType: 'unchanged' as const,
          color: b.color,
          fileExtension: b.fileExtension,
          size: b.size,
          lineCount: b.lineCount,
        };
      }
    }
  });

  // Interpolate districts
  const districts: InterpolatedDistrict[] = diff.districts.map(d => {
    if (diff.hasMixedChanges) {
      if (d.changeType === 'removed' && removeStage >= 0) {
        const sStart = stageStarts[removeStage];
        const sEnd = stageEnds[removeStage];
        const eased = easeInOutCubic(Math.min((t - sStart) / (sEnd - sStart), 1));
        const b = d.before!;
        return {
          path: d.path,
          worldBounds: b.worldBounds,
          opacity: 1 - eased,
          changeType: 'removed',
          fileCount: b.fileCount,
          label: b.label,
        };
      }

      if (d.changeType === 'added' && districtAddStage >= 0) {
        const sStart = stageStarts[districtAddStage];
        const sEnd = stageEnds[districtAddStage];
        if (t < sStart) {
          const a = d.after!;
          return {
            path: d.path,
            worldBounds: a.worldBounds,
            opacity: 0,
            changeType: 'added',
            fileCount: a.fileCount,
            label: a.label,
            appearingProgress: 0,
          };
        }
        const stageT = Math.min((t - sStart) / (sEnd - sStart), 1);
        // Stagger added districts by depth: parent first, then children
        const addedDistricts = diff.districts
          .filter(dd => dd.changeType === 'added')
          .sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
        const idx = addedDistricts.findIndex(dd => dd.path === d.path);
        const count = addedDistricts.length;
        const sliceWidth = 1 / count;
        const sliceStart = idx * sliceWidth;
        const sliceEnd = sliceStart + sliceWidth;
        const localT = Math.max(0, Math.min((stageT - sliceStart) / (sliceEnd - sliceStart), 1));
        const eased = easeInOutCubic(localT);
        const popScale = easeOutBack(eased);
        const labelT = Math.max(0, (localT - 0.3) / 0.7);
        const a = d.after!;
        const cx = (a.worldBounds.minX + a.worldBounds.maxX) / 2;
        const cz = (a.worldBounds.minZ + a.worldBounds.maxZ) / 2;
        const hw = (a.worldBounds.maxX - a.worldBounds.minX) / 2;
        const hd = (a.worldBounds.maxZ - a.worldBounds.minZ) / 2;
        return {
          path: d.path,
          worldBounds: {
            minX: cx - hw * popScale,
            maxX: cx + hw * popScale,
            minZ: cz - hd * popScale,
            maxZ: cz + hd * popScale,
          },
          opacity: eased,
          changeType: 'added',
          fileCount: a.fileCount,
          label: a.label,
          appearingProgress: labelT,
        };
      }

      if (d.changeType === 'moved' && moveStage >= 0) {
        const sStart = stageStarts[moveStage];
        const sEnd = stageEnds[moveStage];
        if (t < sStart) {
          const b = d.before!;
          return {
            path: d.path,
            worldBounds: b.worldBounds,
            opacity: 1,
            changeType: 'moved',
            fileCount: b.fileCount,
            label: b.label,
          };
        }
        if (t >= sEnd) {
          const a = d.after!;
          return {
            path: d.path,
            worldBounds: a.worldBounds,
            opacity: 1,
            changeType: 'moved',
            fileCount: a.fileCount,
            label: a.label,
          };
        }
        const stageT = easeInOutCubic((t - sStart) / (sEnd - sStart));
        const b = d.before!;
        const a = d.after!;
        return {
          path: d.path,
          worldBounds: {
            minX: lerp(b.worldBounds.minX, a.worldBounds.minX, stageT),
            maxX: lerp(b.worldBounds.maxX, a.worldBounds.maxX, stageT),
            minZ: lerp(b.worldBounds.minZ, a.worldBounds.minZ, stageT),
            maxZ: lerp(b.worldBounds.maxZ, a.worldBounds.maxZ, stageT),
          },
          opacity: 1,
          changeType: 'moved',
          fileCount: a.fileCount,
          label: a.label,
        };
      }
    }

    // Single-stage transition
    const eased = easeInOutCubic(t);

    switch (d.changeType) {
      case 'unchanged': {
        const b = d.after!;
        return {
          path: d.path,
          worldBounds: b.worldBounds,
          opacity: 1,
          changeType: 'unchanged',
          fileCount: b.fileCount,
          label: b.label,
        };
      }

      case 'moved': {
        const b = d.before!;
        const a = d.after!;
        return {
          path: d.path,
          worldBounds: {
            minX: lerp(b.worldBounds.minX, a.worldBounds.minX, eased),
            maxX: lerp(b.worldBounds.maxX, a.worldBounds.maxX, eased),
            minZ: lerp(b.worldBounds.minZ, a.worldBounds.minZ, eased),
            maxZ: lerp(b.worldBounds.maxZ, a.worldBounds.maxZ, eased),
          },
          opacity: 1,
          changeType: 'moved',
          fileCount: a.fileCount,
          label: a.label,
        };
      }

      case 'added': {
        const a = d.after!;
        const eased = easeInOutCubic(t);
        const popScale = easeOutBack(eased);
        // Scale bounds from center
        const cx = (a.worldBounds.minX + a.worldBounds.maxX) / 2;
        const cz = (a.worldBounds.minZ + a.worldBounds.maxZ) / 2;
        const hw = (a.worldBounds.maxX - a.worldBounds.minX) / 2;
        const hd = (a.worldBounds.maxZ - a.worldBounds.minZ) / 2;
        return {
          path: d.path,
          worldBounds: {
            minX: cx - hw * popScale,
            maxX: cx + hw * popScale,
            minZ: cz - hd * popScale,
            maxZ: cz + hd * popScale,
          },
          opacity: eased,
          changeType: 'added',
          fileCount: a.fileCount,
          label: a.label,
          appearingProgress: t,
        };
      }

      case 'removed': {
        const b = d.before!;
        const shrinkScale = 1 - eased;
        const cx = (b.worldBounds.minX + b.worldBounds.maxX) / 2;
        const cz = (b.worldBounds.minZ + b.worldBounds.maxZ) / 2;
        const hw = (b.worldBounds.maxX - b.worldBounds.minX) / 2;
        const hd = (b.worldBounds.maxZ - b.worldBounds.minZ) / 2;
        return {
          path: d.path,
          worldBounds: {
            minX: cx - hw * shrinkScale,
            maxX: cx + hw * shrinkScale,
            minZ: cz - hd * shrinkScale,
            maxZ: cz + hd * shrinkScale,
          },
          opacity: 1 - eased,
          changeType: 'removed',
          fileCount: b.fileCount,
          label: b.label,
        };
      }

      default: {
        // Unchanged districts
        const b = d.after!;
        return {
          path: d.path,
          worldBounds: b.worldBounds,
          opacity: 1,
          changeType: 'unchanged' as const,
          fileCount: b.fileCount,
          label: b.label,
        };
      }
    }
  });

  return {
    buildings,
    districts,
    bounds: afterCity.bounds,
    metadata: afterCity.metadata,
  };
}

/**
 * Convert interpolated data to a CityData for rendering.
 * Only includes buildings with opacity > 0.
 */
export function toCityData(interpolated: InterpolatedCityData): CityData {
  return {
    buildings: interpolated.buildings
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
    districts: interpolated.districts
      .filter(d => d.opacity > 0.01)
      .map(d => ({
        path: d.path,
        worldBounds: d.worldBounds,
        type: 'directory' as const,
        fileCount: d.fileCount ?? 0,
        label: d.label,
      })),
    bounds: interpolated.bounds,
    metadata: interpolated.metadata,
  };
}

// --- Easing functions ---

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
