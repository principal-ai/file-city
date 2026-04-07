// Main export for multi-version city building
export { buildMultiVersionCity } from './buildMultiVersionCity.js';

// Multi-version builder and options
export { MultiVersionCityBuilder } from './MultiVersionCityBuilder.js';
export type { MultiVersionOptions, MultiVersionResult } from './MultiVersionCityBuilder.js';

// Grid-based builder and layout manager
export { CodeCityBuilderWithGrid } from './CodeCityBuilderWithGrid.js';
export { GridLayoutManager } from './GridLayoutManager.js';

// File tree builder utilities
export { buildFileSystemTreeFromFileInfoList, getFilesFromGitHubTree } from './FileTreeBuilder.js';
export type { GitHubTreeResponse } from './FileTreeBuilder.js';

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
} from './types/cityData.js';

// CodebaseView types (for grid-based layouts)
export type {
  CodebaseView,
  CodebaseViewCell,
  CodebaseViewFileCell,
  CodebaseViewScope,
  CodebaseViewLinks,
} from './types/codebaseView.js';

// Re-export FileTree type from repository-abstraction for convenience
export type { FileTree } from '@principal-ai/repository-abstraction';

// Sort functions
export type { DirectorySortFunction, FileSortFunction } from './types/sorts.js';

export { CommonSorts } from './types/sorts.js';

// File color configuration
export { default as defaultFileColorConfig } from './config/files.json' with { type: 'json' };

// File config lookup utilities
export { getFileConfig, getFileColor } from './config/getFileConfig.js';
export type {
  FileConfigResult,
  FileIconConfig,
  SecondaryColorConfig,
  RenderStrategy,
} from './config/getFileConfig.js';

// Layer types for highlighting and visualization
export type { LayerItem, LayerRenderStrategy, HighlightLayer, FileTypeIconConfig } from './layers/types.js';

// Highlight layer creation utilities
export { createFileHighlightLayers, extractFileIconMap } from './layers/createFileHighlightLayers.js';
export type { FileHighlightLayersResult, FileHighlightLayersOptions } from './layers/createFileHighlightLayers.js';

// Tour types and utilities
export type {
  IntroductionTour,
  IntroductionTourStep,
  HighlightLayerConfig,
  InteractiveAction,
  InteractiveActionType,
  TourResource,
  TourResourceType,
  TourMetadata,
  ColorMode,
} from './tour/types.js';

// Tour validation
export { TourValidationError, parseTour, parseTourOrThrow } from './tour/validation.js';
export type { TourParseResult } from './tour/validation.js';

// Tour discovery
export {
  findTourFilePathInFileTree,
  findAllTourFilesInFileTree,
  loadTourFromFileTree,
  loadAllToursFromFileTree,
} from './tour/discovery.js';
