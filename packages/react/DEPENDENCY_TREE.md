# Dependency Tree for ArchitectureMapHighlightLayers

## Entry Point

`ArchitectureMapHighlightLayers.tsx`

- External: `react` (useEffect, useRef, useState, useMemo, useCallback)
- Internal: `../builder/cityDataUtils`
  - `filterCityDataForSelectiveRender`
  - `filterCityDataForSubdirectory`
  - `filterCityDataForMultipleDirectories`
- Internal: `../render/client/drawLayeredBuildings`
  - `drawLayeredBuildings`
  - `drawLayeredDistricts`
  - `drawGrid`
  - `drawLegend`
  - `HighlightLayer`
  - `LayerItem`
- Internal: `../types/cityData`
  - `CityData`
  - `CityBuilding`
  - `CityDistrict`
  - `MapInteractionState`
  - `MapDisplayOptions`
  - `SelectiveRenderOptions`

## Level 1: cityDataUtils.ts

- Internal: `../types/cityData`
  - `CityBuilding`
  - `CityData`
  - `CityDistrict`
  - `SelectiveRenderOptions`

## Level 1: drawLayeredBuildings.ts

- Internal: `../../types/cityData`
  - `CityBuilding`
  - `CityDistrict`

## Level 1: types/cityData.ts

- ❌ NEEDS MODIFICATION: Remove dependency on `./themes`
- Currently imports `ColorTheme` and `ColorFunction` but these are only used in `ArchitectureMapProps` which is not needed by HighlightLayers component

## Types and Interfaces Summary

### From types/cityData.ts:

- `Position3D` - 3D position coordinates
- `Bounds3D` - 3D bounding box
- `Bounds2D` - 2D bounding box
- `CityBuilding` - Building/file representation
- `CityDistrict` - District/directory representation
- `CityData` - Main city data structure
- `DirectoryRenderMode` - Rendering mode types
- `SelectiveRenderOptions` - Selective rendering configuration
- `MapInteractionState` - Mouse interaction state
- `MapDisplayOptions` - Display configuration
- `ArchitectureMapProps` - Props for main architecture map (not used by HighlightLayers)

### From render/client/drawLayeredBuildings.ts:

- `LayerRenderStrategy` - Rendering strategy types
- `LayerItem` - Individual layer item
- `HighlightLayer` - Layer configuration

## Files to Copy

1. ⬜ ArchitectureMapHighlightLayers.tsx
2. ⬜ builder/cityDataUtils.ts
3. ⬜ render/client/drawLayeredBuildings.ts
4. ⬜ types/cityData.ts (modified version without themes import)

## Modifications Needed

### types/cityData.ts

- Remove import of `ColorTheme` and `ColorFunction` from `./themes`
- Remove `ArchitectureMapProps` interface (not used by HighlightLayers)
- Keep only the types actually used by HighlightLayers component

## External Dependencies Needed

- react (already standard in React projects)

## Notes

- The component is self-contained with minimal external dependencies
- The SpatialGrid class is defined inline in the component
- The component handles canvas rendering, layer management, and user interactions
- No external libraries beyond React are required
- Theme system removed in favor of simpler defaultBuildingColor + highlight layers approach
