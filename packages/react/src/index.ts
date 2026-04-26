// Main component export
export {
  ArchitectureMapHighlightLayers,
  type ArchitectureMapHighlightLayersProps,
} from './components/ArchitectureMapHighlightLayers';

// Layer and rendering types
export {
  type LayerRenderStrategy,
  type LayerItem,
  type HighlightLayer,
  LayerIndex,
} from './render/client/drawLayeredBuildings';

// React-specific types
export { type MapInteractionState, type MapDisplayOptions } from './types/react-types';

// Utility functions
export {
  filterCityDataForSelectiveRender,
  filterCityDataForSubdirectory,
  filterCityDataForMultipleDirectories,
} from './builder/cityDataUtils';

// File color highlight layer utilities
export {
  createFileColorHighlightLayers,
  getDefaultFileColorConfig,
  getFileColorMapping,
} from './utils/fileColorHighlightLayers';

export type {
  ColorLayerConfig,
  FileSuffixConfig,
  FileSuffixColorConfig,
  FileTypeIconConfig,
} from './utils/fileColorHighlightLayers';

// File color override utilities for development
export { devFileColorOverrides, mergeFileColorConfig } from './utils/fileColorOverrides';

// File type icon utilities
export { extractIconConfig, getFileTypeIcon, drawFileTypeIcon } from './utils/fileTypeIcons';

// Re-export commonly used types from builder
export type {
  CityData,
  CityBuilding,
  CityDistrict,
  SelectiveRenderOptions,
  Bounds2D,
  Position3D,
} from '@principal-ai/file-city-builder';

// Re-export MultiVersionCityBuilder which was requested
export { MultiVersionCityBuilder } from '@principal-ai/file-city-builder';

// Export the useCodeCityData hook
export { useCodeCityData } from './hooks/useCodeCityData';
export type { UseCodeCityDataOptions, UseCodeCityDataReturn } from './hooks/useCodeCityData';

// Re-export FileTree type for convenience
export type { FileTree } from '@principal-ai/file-city-builder';

// Export React Flow based city view component
export {
  CityViewWithReactFlow,
  type CityViewWithReactFlowProps,
} from './components/CityViewWithReactFlow';

// Re-export theme utilities for consumers
export { ThemeProvider, useTheme } from '@principal-ade/industry-theme';

// 3D visualization component
export { FileCity3D, resetCamera, DEFAULT_FLAT_PATTERNS } from './components/FileCity3D';
export type {
  FileCity3DProps,
  AnimationConfig,
  HighlightLayer as FileCity3DHighlightLayer,
  IsolationMode,
  HeightScaling,
  FlatPattern,
  ElevatedScopePanel,
} from './components/FileCity3D';

// Re-export HighlightLayer from FileCity3D with distinct name to avoid conflict
// with the 2D HighlightLayer from drawLayeredBuildings
export type { HighlightLayer as FileCity3DHL } from './components/FileCity3D';

// Visualization resolution utilities
// See docs/VISUALIZATION_STATE_RESOLUTION.md for documentation
export { resolveVisualizationIntent } from './utils/visualizationResolution';
export type {
  VisualizationIntent,
  ResolvedVisualizationState,
} from './utils/visualizationResolution';
