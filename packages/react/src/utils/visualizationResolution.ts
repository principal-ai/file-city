/**
 * Visualization State Resolution
 *
 * This module resolves visualization intent (focus, highlights, file colors)
 * into the primitives needed by the 2D and 3D components.
 *
 * Both ArchitectureMapHighlightLayers (2D) and FileCity3D (3D) use this
 * resolution internally to ensure consistent behavior.
 *
 * See docs/VISUALIZATION_STATE_RESOLUTION.md for detailed documentation.
 */

import { HighlightLayer, LayerItem } from '../render/client/drawLayeredBuildings';

// Re-export for convenience
export type { HighlightLayer, LayerItem };

/**
 * Input highlight layer type - more permissive than the full HighlightLayer
 * to allow both 2D and 3D components to use this resolution.
 * Uses generics to preserve the original layer type through resolution.
 */
export interface InputHighlightLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  items: Array<{ path: string; type: 'file' | 'directory' }>;
  opacity?: number;
  priority?: number;
  borderWidth?: number;
  dynamic?: boolean;
}

/**
 * Visualization intent - inputs to the resolution
 */
export interface VisualizationIntent {
  /** Directory/file to zoom camera to */
  focusPath?: string | null;
  /** Border color for the focused area */
  focusColor?: string | null;
  /** Highlight layers (specific directories/files to highlight) */
  highlightLayers?: InputHighlightLayer[];
  /** Base file type color layers */
  fileColorLayers?: InputHighlightLayer[];
}

/**
 * Resolved visualization state - what the components use internally
 */
export interface ResolvedVisualizationState {
  /** Combined and filtered highlight layers */
  highlightLayers: InputHighlightLayer[];
  /** Where to point camera (2D: zoomToPath, 3D: focusDirectory) */
  cameraFocusPath: string | null;
  /** Focus area border color */
  focusColor: string | null;
  /** Whether isolation/collapse should be enabled */
  shouldIsolate: boolean;
}

/**
 * Check if a path is within a given scope (directory or file)
 */
function isPathInScope(path: string, scope: string, scopeType: 'file' | 'directory'): boolean {
  if (scopeType === 'file') {
    return path === scope;
  }
  // Directory: path is the directory itself or is inside it
  return path === scope || path.startsWith(scope + '/');
}

/**
 * Get all paths covered by highlight layers
 */
function getHighlightedPaths(highlightLayers: InputHighlightLayer[]): Array<{ path: string; type: 'file' | 'directory' }> {
  const paths: Array<{ path: string; type: 'file' | 'directory' }> = [];
  for (const layer of highlightLayers) {
    if (!layer.enabled) continue;
    for (const item of layer.items) {
      paths.push({ path: item.path, type: item.type });
    }
  }
  return paths;
}

/**
 * Filter file color layers to only include items within the visible scope.
 *
 * Rules:
 * - If there are highlight layers, only show file colors for files within highlighted areas
 * - If there's only a focus path, show file colors for all files within the focus
 * - If neither, show all file colors
 */
function filterFileColorLayers(
  fileColorLayers: InputHighlightLayer[],
  focusPath: string | null,
  highlightLayers: InputHighlightLayer[],
): InputHighlightLayer[] {
  const highlightedPaths = getHighlightedPaths(highlightLayers);
  const hasHighlights = highlightedPaths.length > 0;

  // If no focus and no highlights, return all layers unfiltered
  if (!focusPath && !hasHighlights) {
    return fileColorLayers;
  }

  return fileColorLayers
    .map(layer => {
      const filteredItems = layer.items.filter(item => {
        if (hasHighlights) {
          // With highlights: only include items that are within a highlighted path
          return highlightedPaths.some(highlight =>
            isPathInScope(item.path, highlight.path, highlight.type),
          );
        } else if (focusPath) {
          // Focus only: include all items within the focus path
          return isPathInScope(item.path, focusPath, 'directory');
        }
        return true;
      });

      return {
        ...layer,
        items: filteredItems,
      };
    })
    .filter(layer => layer.items.length > 0);
}

/**
 * Resolve visualization intent to component primitives.
 *
 * Resolution Rules:
 * 1. When there's a focusPath or highlightLayers, fileColorLayers are filtered
 *    to only include files within the visible scope
 * 2. Buildings/files not in any highlight layer automatically collapse/dim
 * 3. Camera focuses on focusPath if provided
 *
 * @param intent - Visualization intent (focus, highlights, file colors)
 * @returns Resolved state with primitives for 2D/3D components
 */
export function resolveVisualizationIntent(intent: VisualizationIntent): ResolvedVisualizationState {
  const {
    focusPath = null,
    focusColor = null,
    highlightLayers = [],
    fileColorLayers = [],
  } = intent;

  // Filter file color layers based on focus/highlight scope
  const filteredFileColorLayers = filterFileColorLayers(fileColorLayers, focusPath, highlightLayers);

  // Combine filtered file colors with highlight layers
  // File colors go first (lower priority), highlight layers on top
  const combinedLayers = [...filteredFileColorLayers, ...highlightLayers];

  // Determine if we should isolate (collapse non-highlighted items)
  // Isolate when there's a focus path OR active highlight layers
  const hasActiveHighlights = getHighlightedPaths(highlightLayers).length > 0;
  const shouldIsolate = Boolean(focusPath) || hasActiveHighlights;

  return {
    highlightLayers: combinedLayers,
    cameraFocusPath: focusPath,
    focusColor,
    shouldIsolate,
  };
}
