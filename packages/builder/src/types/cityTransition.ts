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
