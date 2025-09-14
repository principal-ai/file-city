// Server-side rendering utilities for Code City

// Drawing utilities
export { createDrawContext, clearCanvas, type DrawContext } from './render/drawingUtils';

// Rendering functions
export {
  RenderMode,
  drawBuildings,
  drawDistricts,
  drawLegend,
  drawGrid
} from './render/renderUtils';

// Type exports
export type { BuildingTypeResolver } from './types/buildingTypes';
export type { ImportanceConfig } from './types/importanceTypes';
export type { ColorTheme, ColorFunction } from './types/themes';

// Re-export types from builder for convenience
export type {
  CityData,
  CityBuilding,
  CityDistrict
} from '@principal-ai/code-city-builder';