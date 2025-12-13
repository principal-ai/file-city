# React Flow Grid Layout Architecture

## Overview

This document explains how the grid-based city visualization works and how we're integrating it with React Flow for a more interactive, node-based layout system.

## Current Grid Layout System

### 1. How Multi-Cell Maps Work Currently

The current system uses a canvas-based approach with the following flow:

```markdown
FileTree → GridLayoutManager → Multiple CityData → Canvas Rendering
```

#### Step-by-Step Process:

1. **Grid Configuration Definition** (`CodebaseView`)
   ```typescript
   {
     cells: {
       'Source Code': {
         files: ['src/**/*'],  // Pattern to match
         coordinates: [0, 0],   // Grid position
       },
       'Tests': {
         files: ['tests/**/*'],
         coordinates: [0, 1],
       }
     },
     metadata: {
       ui: {
         rows: 2,
         cols: 2,
       }
     }
   }
   ```
2. **Tree Splitting** (`GridLayoutManager.splitTreeIntoGrid`)
   - Takes the full `FileTree` and `CodebaseView` config
   - Creates an empty `FileTree` for each grid cell
   - **IMPORTANT**: Currently uses exact path matching, NOT glob patterns
   - Assigns files/directories to cells based on `files` array
   - Returns `Map<string, FileTree>` where key is "row,col"
3. **City Building** (`CodeCityBuilderWithGrid.buildCityWithGridLayout`)
   - For each cell's `FileTree`:
     - Builds a separate `CityData` using D3 treemap
     - Calculates cell bounds based on grid position
     - Translates all buildings/districts to cell's position
     - Adds cell boundary districts
4. **Canvas Rendering**
   - Single canvas renders all cells
   - Each cell's buildings and districts are drawn at calculated positions
   - Labels and spacing handled by grid layout calculations

## React Flow Integration Approach

### Current Implementation Status

```markdown
FileTree → GridLayoutManager → Multiple FileTrees → React Flow Nodes → Individual City Visualizations
```

#### What We've Built:

1. **CityViewWithReactFlow Component**
   - Creates React Flow nodes for each grid cell
   - Each node contains:
     - Header with cell name and stats
     - `ArchitectureMapHighlightLayers` component for 3D visualization
   - Nodes are draggable and connected with edges
2. **CellNode Component**

   ```typescript
   const CellNode = ({ data }) => {
     const { fileTree } = data;

     // Build city data for this specific cell
     const cityData = cityBuilder.buildCityFromFileSystem(fileTree);

     return (
       <div>
         <ArchitectureMapHighlightLayers cityData={cityData} />
       </div>
     );
   };
   ```

### Current Issues

1. **Pattern Matching Problem**
   - `GridLayoutManager` expects exact paths: `['src', 'src/components/Button.tsx']`
   - Does NOT support glob patterns: `['src/**/*']`
   - This means we must list every file/directory explicitly
2. **Empty Cell Problem**
   - Cells show as "empty" because file matching fails
   - The `splitTreeIntoGrid` returns FileTrees with no children
   - City builder gets empty trees and produces no buildings
3. **Data Structure Mismatch**
   - `GridLayoutManager` creates: `{ root: { name: 'cell-root', children: [...] } }`
   - City builder might expect different structure
   - Stats might not be properly updated after splitting

## Proposed Solutions

### Option 1: Fix GridLayoutManager Pattern Matching

Add glob pattern support to `GridLayoutManager`:

```typescript
// In GridLayoutManager.assignDirectoriesToCells
import micromatch from 'micromatch';

const matches = cellConfig.files && micromatch.isMatch(path, cellConfig.files);
```

**Pros:**

- Works with intuitive patterns like `'src/**/*'`
- No need to list every file explicitly

**Cons:**

- Requires adding a glob matching library
- Need to handle edge cases (nested patterns, exclusions)

### Option 2: Pre-process File Lists

Before passing to React Flow component:

```typescript
function expandGlobPatterns(fileTree: FileTree, patterns: string[]): string[] {
  const allPaths = collectAllPaths(fileTree.root);
  return patterns.flatMap(pattern => {
    if (pattern.includes('*')) {
      return micromatch(allPaths, pattern);
    }
    return [pattern];
  });
}
```

**Pros:**

- Keeps GridLayoutManager simple
- Pattern expansion happens at component level

**Cons:**

- Duplicates logic
- Performance overhead for large trees

### Option 3: Create Dedicated React Flow Builder

New class specifically for React Flow integration:

```typescript
class ReactFlowCityBuilder {
  buildNodesFromFileTree(
    fileTree: FileTree,
    config: CodebaseView,
  ): { nodes: Node[]; edges: Edge[] } {
    // Handle splitting and city building
    // Return React Flow compatible structure
  }
}
```

**Pros:**

- Optimized for React Flow use case
- Can handle patterns and splitting together
- Better encapsulation

**Cons:**

- Some code duplication with existing builder
- Need to maintain two systems

## Recommended Approach

1. **Short term**: Fix the pattern matching in `GridLayoutManager` (Option 1)
   - Add micromatch or similar for glob support
   - Update `assignDirectoriesToCells` to use pattern matching
   - This fixes the immediate "empty cell" issue
2. **Long term**: Create dedicated React Flow builder (Option 3)
   - Better separation of concerns
   - Optimize for interactive use cases
   - Can add React Flow specific features (dynamic loading, etc.)

## Testing Strategy

1. **Unit Tests**
   - Test pattern matching with various glob patterns
   - Test tree splitting produces correct FileTrees
   - Test city building from split trees
2. **Integration Tests**
   - Test full flow from FileTree to React Flow nodes
   - Test cell interactions (click, drag, zoom)
   - Test performance with large codebases
3. **Visual Tests**
   - Storybook stories for different grid configurations
   - Test responsive behavior
   - Test highlight layers work in each cell

## Benefits of React Flow Integration

1. **Interactivity**
   - Drag and rearrange cells
   - Zoom into specific cells
   - Create custom layouts on the fly
2. **Extensibility**
   - Easy to add new node types (metrics, dependencies, etc.)
   - Can add edges to show relationships
   - Plugin ecosystem for additional features
3. **Performance**
   - Only render visible nodes
   - Virtualization for large grids
   - Independent cell updates
4. **User Experience**
   - Familiar node-graph interface
   - Better navigation with minimap
   - Can save/load custom layouts

## Next Steps

1. Fix pattern matching issue in `GridLayoutManager`
2. Verify FileTrees have correct structure after splitting
3. Ensure city builder handles split trees correctly
4. Add proper TypeScript types for all data flows
5. Optimize performance for large codebases
6. Add tests for the integration
