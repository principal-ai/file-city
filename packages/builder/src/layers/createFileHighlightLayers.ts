/**
 * Creates highlight layers and icon map from a list of files
 *
 * This is a shared utility for both web and mobile File City implementations.
 * It groups files by extension/filename and creates HighlightLayer objects
 * with colors and render strategies from the file config.
 */

import { getFileConfig } from '../config/getFileConfig.js';
import type { HighlightLayer, LayerItem, FileTypeIconConfig } from './types.js';

/**
 * Result from createFileHighlightLayers
 */
export interface FileHighlightLayersResult {
  /** Highlight layers grouped by file extension */
  highlightLayers: HighlightLayer[];
  /** Map of file extension/name to icon config */
  iconMap: Map<string, FileTypeIconConfig>;
}

/**
 * Options for createFileHighlightLayers
 */
export interface FileHighlightLayersOptions {
  /** Include files that don't match any config (default: true) */
  includeUnmatched?: boolean;
}

/**
 * Creates highlight layers and an icon map from a list of file paths.
 *
 * Groups files by their extension or filename, using the file config
 * to determine colors, render strategies, and icons.
 *
 * @param files - Array of file objects with at least a path property
 * @param options - Optional configuration
 * @returns Object containing highlightLayers and iconMap
 *
 * @example
 * ```typescript
 * import { createFileHighlightLayers } from '@principal-ai/file-city-builder';
 *
 * const files = [
 *   { path: 'src/index.ts' },
 *   { path: 'src/App.tsx' },
 *   { path: 'package.json' },
 * ];
 *
 * const { highlightLayers, iconMap } = createFileHighlightLayers(files);
 * // highlightLayers: grouped by .ts, .tsx, package.json
 * // iconMap: Map with icon configs for each extension
 * ```
 */
export function createFileHighlightLayers(
  files: Array<{ path: string }> | null | undefined,
  options: FileHighlightLayersOptions = {},
): FileHighlightLayersResult {
  const { includeUnmatched = true } = options;

  if (!files || files.length === 0) {
    return {
      highlightLayers: [],
      iconMap: new Map(),
    };
  }

  // Group files by their matched pattern (extension or filename)
  const filesByPattern = new Map<
    string,
    {
      files: string[];
      config: ReturnType<typeof getFileConfig>;
    }
  >();

  files.forEach((file) => {
    const config = getFileConfig(file.path);

    // Skip unmatched files if not including them
    if (!includeUnmatched && config.matchType === 'default') {
      return;
    }

    const pattern = config.matchedPattern;

    if (!filesByPattern.has(pattern)) {
      filesByPattern.set(pattern, {
        files: [],
        config,
      });
    }

    filesByPattern.get(pattern)!.files.push(file.path);
  });

  // Build highlight layers and icon map
  const highlightLayers: HighlightLayer[] = [];
  const iconMap = new Map<string, FileTypeIconConfig>();

  // Sort by file count (more files first) for consistent ordering
  const sortedPatterns = Array.from(filesByPattern.entries()).sort(
    ([, a], [, b]) => b.files.length - a.files.length,
  );

  let priority = 1;

  sortedPatterns.forEach(([pattern, { files: filePaths, config }]) => {
    // Create display name from pattern
    const displayName = config.displayName || (pattern.startsWith('.') ? pattern.substring(1).toUpperCase() : pattern.toUpperCase());

    // Create primary highlight layer
    const primaryLayer: HighlightLayer = {
      id: `ext-${pattern}-primary`,
      name: displayName,
      color: config.color,
      enabled: true,
      opacity: config.opacity,
      priority: priority,
      items: filePaths.map(
        (path): LayerItem => ({
          path,
          type: 'file',
          renderStrategy: config.renderStrategy,
        }),
      ),
    };

    highlightLayers.push(primaryLayer);

    // Create secondary layer if configured (lower priority than primary)
    if (config.secondary) {
      const secondaryLayer: HighlightLayer = {
        id: `ext-${pattern}-secondary`,
        name: `${displayName} Secondary`,
        color: config.secondary.color,
        enabled: true,
        opacity: config.secondary.opacity ?? 1.0,
        priority: priority - 1,
        items: filePaths.map(
          (path): LayerItem => ({
            path,
            type: 'file',
            renderStrategy: config.secondary!.renderStrategy ?? 'border',
          }),
        ),
      };

      if (config.secondary.borderWidth) {
        secondaryLayer.borderWidth = config.secondary.borderWidth;
      }

      highlightLayers.push(secondaryLayer);
    }

    // Add to icon map if icon is configured
    if (config.icon) {
      iconMap.set(pattern, {
        type: config.icon.type,
        name: config.icon.name,
        color: config.icon.color,
        size: config.icon.size,
      });
    }

    priority += 2;
  });

  return {
    highlightLayers,
    iconMap,
  };
}

/**
 * Extracts just the icon map from file config.
 * Use this if you only need icons without highlight layers.
 *
 * @param files - Array of file objects with at least a path property
 * @returns Map of file extension/name to icon config
 */
export function extractFileIconMap(
  files: Array<{ path: string }> | null | undefined,
): Map<string, FileTypeIconConfig> {
  return createFileHighlightLayers(files).iconMap;
}
