// Main component export
export {
  ArchitectureMapHighlightLayers,
  type ArchitectureMapHighlightLayersProps
} from './components/ArchitectureMapHighlightLayers';

// Layer and rendering types
export {
  type LayerRenderStrategy,
  type LayerItem,
  type HighlightLayer,
} from './render/client/drawLayeredBuildings';

// React-specific types
export {
  type MapInteractionState,
  type MapDisplayOptions,
} from './types/react-types';

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
} from './utils/fileColorHighlightLayers';

// Re-export commonly used types from builder
export type {
  CityData,
  CityBuilding,
  CityDistrict,
  SelectiveRenderOptions,
  Bounds2D,
  Position3D,
} from '@principal-ai/code-city-builder';

// Re-export MultiVersionCityBuilder which was requested
export { MultiVersionCityBuilder } from '@principal-ai/code-city-builder';

// Export the useCodeCityData hook
export { useCodeCityData } from './hooks/useCodeCityData';
export type { UseCodeCityDataOptions, UseCodeCityDataReturn } from './hooks/useCodeCityData';

// Re-export FileTree type for convenience
export type { FileTree } from '@principal-ai/code-city-builder';

// Export React Flow based city view component
export {
  CityViewWithReactFlow,
  type CityViewWithReactFlowProps
} from './components/CityViewWithReactFlow';