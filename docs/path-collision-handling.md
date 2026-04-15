# Path Collision Handling: Buildings and Districts

## Overview

In File City visualizations, **buildings** (files) and **districts** (directories) can have identical paths. This is valid file system behavior but requires special handling in the rendering layer to prevent districts from incorrectly inheriting file-based highlight layers.

## The Issue

### Example Scenario

Consider a repository with this structure:
```
/project/
  autoplan          (file - no extension)
  autoplan/         (directory)
    README.md
    config.json
```

Both the file and directory will have the path `"autoplan"` in the city data:
- **Building** (file): `path: "autoplan"`
- **District** (directory): `path: "autoplan"`

### Why This Happens

The file-city-builder constructs paths the same way for both buildings and districts:

**Districts** (`CodeCityBuilderWithGrid.ts:840`):
```typescript
fullPath = data.relativePath || data.name  // "autoplan"
```

**Buildings** (`CodeCityBuilderWithGrid.ts:942`):
```typescript
fullFilePath = fileData.relativePath || fileData.name  // "autoplan"
```

No trailing slashes are added to distinguish directories from files.

## The Problem with Highlight Layers

When using `createFileHighlightLayers()` to generate file-based highlights:

1. Files are grouped by extension/name and assigned colors and render strategies
2. The file `autoplan` gets matched to a highlight layer (e.g., "DEFAULT" layer with `renderStrategy: 'fill'`)
3. These highlights are stored in a shared `Map<path, highlights>`

### Map Collision

The `highlightMatchMap` is built in two passes:

```typescript
const highlightMatchMap = new Map();

// Pass 1: Buildings
cityData.buildings.forEach((building) => {
  const matches = layerIndex.getItemsForPath(building.path)
    .filter((match) => match.item.type === 'file');
  if (matches.length > 0) {
    map.set(building.path, matches);  // Sets "autoplan" -> [file highlights]
  }
});

// Pass 2: Districts
cityData.districts.forEach((district) => {
  const matches = layerIndex.getItemsForPath(district.path, 'exact')
    .filter((match) => match.item.type === 'directory');
  if (matches.length > 0) {
    map.set(district.path, matches);  // Would overwrite, but no directory matches exist
  }
  // ⚠️ District "autoplan" finds NO directory-type matches (filtered out)
  // ⚠️ Map entry from building "autoplan" remains!
});
```

Later when rendering districts:

```typescript
const layerMatches = highlightMatchMap.get(district.path);  // Gets building's file highlights!
const renderStrategy = layerMatches[0]?.item.renderStrategy;  // "fill"
```

**Result**: District `"autoplan"` incorrectly renders with `renderStrategy: 'fill'` and the file's highlight color.

## The Solution

When a district matches file-type highlights (which we filter out), **explicitly delete the map entry** to prevent the district from using building highlights:

```typescript
cityData.districts.forEach((district) => {
  const allMatches = layerIndex.getItemsForPath(district.path, 'exact');
  const matches = allMatches.filter((match) => match.item.type === 'directory');

  if (allMatches.length > 0 && matches.length === 0) {
    // District has file-type highlights (filtered out)
    // Remove any building entry to prevent collision
    map.delete(district.path);  // ✅ Removes building's highlights
  }

  if (matches.length > 0) {
    map.set(district.path, matches);
  }
});
```

### Why This Works

1. Building `"autoplan"` adds file-type highlights to the map
2. District `"autoplan"` checks for matches, finds file-type matches
3. File-type matches are filtered out (we only want directory-type)
4. **`map.delete(district.path)`** removes the building's entry
5. District now has no highlights (correct behavior)

## Implementation Locations

### Web (3D) Implementation
File: `packages/react/src/components/FileCity3D/FileCity3D.tsx`

Districts are rendered with borders only (no fills by default). Highlight layers with `type: 'directory'` can add fills/borders.

### Mobile (2D) Implementation
File: `mobile-app/src/components/FileCity/FileCityCanvas.tsx`

**Fixed in commit**: [Reference the commit where this was fixed]

The `highlightMatchMap` computation includes the `map.delete()` fix to handle path collisions.

## Expected Behavior

### Without Explicit Directory Highlights

- **Files (buildings)**: Rendered with fills colored by file type
- **Directories (districts)**: Rendered with borders only (no fills)

### With Directory-Type Highlight Layers

Directories can have fills/borders when explicitly included in a highlight layer:

```typescript
const highlightLayer: HighlightLayer = {
  id: 'important-dirs',
  name: 'Important Directories',
  color: '#ff0000',
  items: [
    { path: 'src/core', type: 'directory', renderStrategy: 'fill' }
  ]
};
```

## Testing

To verify the fix works:

1. Open a repo with files that have no extensions (e.g., `autoplan`, `benchmark`)
2. Check that directories with the same names as these files:
   - Do NOT have fill colors
   - Only show borders
3. Check console logs (if enabled) for:
   - `"District has file-type highlights (filtered out)"`
   - No logs about districts having fills

## Notes

- This is **expected file system behavior** - files and directories can share names at different levels
- The file-city-builder does not add trailing slashes to directory paths
- Highlight layers from `createFileHighlightLayers()` only contain `type: 'file'` items
- Districts should only receive highlights from explicit directory-type layer items

## Related Files

- `packages/builder/src/CodeCityBuilderWithGrid.ts` - Path construction logic
- `packages/builder/src/layers/createFileHighlightLayers.ts` - File highlight generation
- `packages/react/src/components/FileCity3D/FileCity3D.tsx` - Web 3D renderer
- `mobile-app/src/components/FileCity/FileCityCanvas.tsx` - Mobile 2D renderer
