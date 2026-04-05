# Visualization State Resolution

This document describes how visualization props get resolved into the primitives needed by the 2D and 3D components.

## Key Principle: Internal Resolution

**The resolution logic lives inside the components.** Both components accept the same props and internally resolve them to ensure consistent behavior.

```typescript
// Both components accept identical props
<FileCity3D
  cityData={cityData}
  focusDirectory="src/components"
  focusColor="#3b82f6"
  highlightLayers={scenarioHighlights}
  fileColorLayers={fileTypeColors}
/>

<ArchitectureMapHighlightLayers
  cityData={cityData}
  zoomToPath="src/components"
  focusColor="#3b82f6"
  highlightLayers={scenarioHighlights}
  fileColorLayers={fileTypeColors}
/>
```

## Props

| Property | 2D Prop Name | 3D Prop Name | Description |
|----------|--------------|--------------|-------------|
| Focus path | `zoomToPath` | `focusDirectory` | Directory/file to zoom camera to |
| Focus color | `focusColor` | `focusColor` | Border color for the focused area |
| Highlights | `highlightLayers` | `highlightLayers` | Specific directories/files to highlight |
| File colors | `fileColorLayers` | `fileColorLayers` | Base file type color layers |

## Resolution Rules

### 1. File Color Layer Filtering

When there's a focus path or highlight layers, `fileColorLayers` are filtered:

- **With highlightLayers**: Only include file colors for files within highlighted areas
- **With focusPath only**: Include file colors for all files within the focus
- **Neither**: Show all file colors unfiltered

### 2. Automatic Collapsing

Buildings/files not in `highlightLayers` automatically:
- **2D**: Dim to reduced opacity
- **3D**: Collapse to ground level + gray color

The `isolationMode` in 3D is auto-set to `'collapse'` when highlights exist, `'none'` otherwise.

## Resolution Scenarios

These scenarios define the expected resolution output for various inputs.

| # | Scenario | File Colors | Collapse |
|---|----------|-------------|----------|
| R1 | No focus, no highlights | All files show base colors | None |
| R2 | Focus only | Files in focus show base colors | Outside focus |
| R3 | Highlights only | Files in highlights show base colors | Outside highlights |
| R4 | Focus + highlight (same) | Files show base colors | Outside focus |
| R5 | Focus + highlight (subset) | Only highlighted subset shows colors | Outside highlighted subset |
| R6 | Multiple highlights | All highlighted areas show colors | Outside all highlights |
| R7 | Single file highlight | Only that file shows colors | Everything else |

### R1: Baseline

**Input:** `focusPath=null`, `highlightLayers=[]`, `fileColorLayers=[all]`

**Result:** Full city, all files show type colors, nothing collapsed.

### R2: Focus Only

**Input:** `focusPath='src'`, `highlightLayers=[]`, `fileColorLayers=[all]`

**Result:** Camera zooms to `src`, files inside show type colors, everything outside collapsed.

### R3: Highlights Only

**Input:** `focusPath=null`, `highlightLayers=[{path:'src/api', color:'green'}]`, `fileColorLayers=[all]`

**Result:** Full city view (no zoom), `src/api` files show type colors, everything else collapsed.

### R5: Focus + Highlight (Subset)

**Input:** `focusPath='src'`, `highlightLayers=[{path:'src/lib', color:'purple'}]`, `fileColorLayers=[all]`

**Result:** Camera zooms to `src`, only `src/lib` shows file colors + purple highlight, rest of `src` collapsed.

## Implementation

The resolution is implemented in `utils/visualizationResolution.ts`:

```typescript
import { resolveVisualizationIntent } from './utils/visualizationResolution';

const resolved = resolveVisualizationIntent({
  focusPath: 'src',
  focusColor: '#3b82f6',
  highlightLayers: scenarioHighlights,
  fileColorLayers: baseFileColors,
});

// resolved.highlightLayers - Combined & filtered layers
// resolved.cameraFocusPath - Where to focus camera
// resolved.focusColor - Border color for focus area
// resolved.shouldIsolate - Whether to collapse non-highlighted
```
