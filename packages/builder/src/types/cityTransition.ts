import { CityBuilding, CityData, CityDistrict } from './cityData.js';

export type BuildingChangeType = 'added' | 'removed' | 'moved' | 'unchanged';

export interface BuildingDiff {
  path: string;
  changeType: BuildingChangeType;
  before?: CityBuilding;
  after?: CityBuilding;
}

export interface DistrictDiff {
  path: string;
  changeType: BuildingChangeType;
  before?: CityDistrict;
  after?: CityDistrict;
}

export interface CityDiff {
  buildings: BuildingDiff[];
  districts: DistrictDiff[];
  addedCount: number;
  removedCount: number;
  movedCount: number;
  unchangedCount: number;
  hasMixedChanges: boolean;
}

export interface InterpolatedBuilding {
  path: string;
  position: { x: number; y: number; z: number };
  dimensions: [number, number, number];
  opacity: number;
  changeType: BuildingChangeType;
  color?: string;
  fileExtension?: string;
  size?: number;
  lineCount?: number;
}

export interface InterpolatedDistrict {
  path: string;
  worldBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  opacity: number;
  changeType: BuildingChangeType;
  fileCount?: number;
  label?: CityDistrict['label'];
  /** 0→1 progress for the "appearing" animation (border expand + label pop). Only non-zero for added districts. */
  appearingProgress?: number;
}

export interface InterpolatedCityData {
  buildings: InterpolatedBuilding[];
  districts: InterpolatedDistrict[];
  bounds: CityData['bounds'];
  metadata: CityData['metadata'];
}

// ============================================================================
// Cross-source (multi-city) transition types
// ============================================================================

/**
 * Describes how a single building transitions from its position in a unified
 * "before" CityData to its position in one of several per-package "after"
 * CityData instances on the target CitySource grid.
 */
export interface CrossSourceBuildingDiff {
  path: string;
  changeType: BuildingChangeType;
  /** Position+dimensions in the single before-city (if unchanged/moved/removed). */
  before?: CityBuilding;
  /** Position+dimensions in the per-source after-city (if unchanged/moved/added). */
  after?: CityBuilding;
  /** World-space offset of the target CitySource. Added when lerping. */
  targetOffset: { x: number; z: number };
}

/**
 * Per-source counterpart to CityDiff — holds the buildings assigned to one
 * grid cell / package, each already stamped with that source's position offset.
 */
export interface CrossSourceDiff {
  /** Human label for this source (e.g. package name). */
  label: string;
  /** The offset in world space where this source's city sits. */
  offset: { x: number; z: number };
  /** Per-building change list for this source only. */
  buildings: CrossSourceBuildingDiff[];
  /** Districts that appear in this source in the after-state. */
  districts: DistrictDiff[];
  addedCount: number;
  removedCount: number;
  movedCount: number;
  unchangedCount: number;
  hasMixedChanges: boolean;
  /** The fully-built after CityData for this source. */
  afterCity: CityData;
}

/**
 * Top-level diff for a single-city → multi-source grid transition.
 * Each source (package) gets its own CrossSourceDiff plus the after
 * CityData that should render once the transition is complete.
 */
export interface MultiSourceCityDiff {
  sources: CrossSourceDiff[];
  /**
   * Buildings that exist in the before city but in NO after source. These are
   * rendered as a "removal layer" (the original unified city, offset {0,0})
   * where they shrink and fade away during the transition.
   */
  removed: BuildingDiff[];
}
