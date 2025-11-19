# @principal-ai/code-city-builder

Core algorithms and data structures for generating code city visualizations.

## Overview

This package provides the multi-version city builder functionality, which allows visualization of multiple versions of a codebase in a unified 3D city layout.

## Main Entry Point

The primary export is `buildMultiVersionCity`:

```typescript
import { buildMultiVersionCity } from '@principal-ai/code-city-builder';
import { FileTree } from '@principal-ai/repository-abstraction';

// Create a map of version trees
const versionTrees = new Map<string, FileTree>();
versionTrees.set('v1.0', fileTreeV1);
versionTrees.set('v2.0', fileTreeV2);

// Build the multi-version city
const { unionCity, presenceByVersion, getVersionView } = buildMultiVersionCity(versionTrees);

// Get a filtered view for a specific version
const v1View = getVersionView('v1.0');
```

## Key Features

- **Multi-Version Support**: Visualize multiple versions of a codebase simultaneously
- **Grid Layout**: Optional grid-based layout for organizing directories
- **Treemap Algorithm**: Uses D3's treemap algorithm for optimal space utilization
- **Flexible Filtering**: Get filtered views for specific versions or directory prefixes

## Architecture

The package uses a layered approach:

1. **Input Layer**: Accepts FileTree structures from @principal-ai/repository-abstraction
2. **Builder Layer**: MultiVersionCityBuilder orchestrates the building process
3. **Layout Layer**: CodeCityBuilderWithGrid handles the spatial layout using D3 treemap
4. **Output Layer**: Produces CityData with positioned buildings and districts

## Dependencies

- `@principal-ai/repository-abstraction`: File system abstraction
- `@principal-ai/alexandria-core-library`: CodebaseView for grid layouts
- `d3-hierarchy`: Treemap algorithm for spatial layout

## Recent Changes

### Sizing Strategy Simplification (Latest)

Simplified the codebase by removing unused sizing strategies and keeping only the proven `legacy-sqrt` approach:

**Removed Components:**
- `SizingStrategy` enum and all alternative sizing strategies
- `calculateMinimumAreaSize`, `calculateHierarchicalSize`, `calculateBracketedSize`, `calculateContentAwareSize`, `calculateViewportOptimizedSize` methods
- `SizingPresets` constant with all preset configurations
- Unused sizing-related options from `TreemapOptions`: `sizingStrategy`, `minBuildingVisualSize`, `guaranteedMinArea`, `hierarchyDepthWeight`, `contentAwareScaling`, `aspectRatioOptimization`, `disableAutomaticSpacing`, `bufferMultiplier`

**Simplified Components:**
- `calculateOptimalSize` method now directly uses legacy square root scaling
- `calculateLegacySqrtSize` method signature simplified (removed unused width/height parameters)
- `TreemapOptions` interface streamlined to focus on core functionality

**Rationale:**
The codebase was using only the `legacy-sqrt` sizing strategy in practice. Removing the unused alternatives reduces complexity, improves maintainability, and eliminates dead code paths.

### Previous Changes

- Removed color/theme dependencies (handled in React layer) ✅
- Migrated from `a24z-memory` to `@a24z/core-library` to `@principal-ai/alexandria-core-library` ✅
- Established clean separation between builder logic and presentation concerns ✅

## Testing

The package includes Jest tests for the core functionality:

```bash
bun test
# or
npm test
```

Tests cover:
- Multi-version city building with union trees
- Version filtering and presence tracking
- Grid layout integration with CodebaseView
- Building and district filtering logic

## Future Enhancements

- Optimize performance for large codebases (1000+ files)
- Additional deep nesting optimization strategies