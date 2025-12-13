// Main export for multi-version city building
export { buildMultiVersionCity } from './buildMultiVersionCity';

// Multi-version builder and options
export { MultiVersionCityBuilder } from './MultiVersionCityBuilder';
export type { MultiVersionOptions, MultiVersionResult } from './MultiVersionCityBuilder';

// Grid-based builder and layout manager
export { CodeCityBuilderWithGrid } from './CodeCityBuilderWithGrid';
export { GridLayoutManager } from './GridLayoutManager';

// File tree builder utilities
export { buildFileSystemTreeFromFileInfoList, getFilesFromGitHubTree } from './FileTreeBuilder';
export type { GitHubTreeResponse } from './FileTreeBuilder';

// Core types
export type {
  CityData,
  CityBuilding,
  CityDistrict,
  Bounds2D,
  Bounds3D,
  Position3D,
  FileChange,
  Commit,
  PRVisualizationData,
  SelectiveRenderOptions,
  DirectoryRenderMode,
} from './types/cityData';

// Re-export FileTree type from repository-abstraction for convenience
export type { FileTree } from '@principal-ai/repository-abstraction';

// Sort functions
export type { DirectorySortFunction, FileSortFunction } from './types/sorts';

export { CommonSorts } from './types/sorts';
