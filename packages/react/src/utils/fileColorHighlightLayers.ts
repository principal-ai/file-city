import { defaultFileColorConfig } from '@principal-ai/file-city-builder';
import {
  HighlightLayer,
  LayerItem,
  LayerRenderStrategy,
} from '../render/client/drawLayeredBuildings';
import { devFileColorOverrides, mergeFileColorConfig } from './fileColorOverrides';

// Type definitions for the color configuration
export interface ColorLayerConfig {
  color: string;
  renderStrategy: LayerRenderStrategy;
  opacity?: number;
  borderWidth?: number;
  priority?: number;
  coverOptions?: {
    opacity?: number;
    image?: string;
    text?: string;
    textSize?: number;
    backgroundColor?: string;
    borderRadius?: number;
    icon?: string;
    iconSize?: number;
    lucideIcon?: string;
  };
  customRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number },
    scale: number,
  ) => void;
}

export interface FileTypeIconConfig {
  type: 'emoji' | 'lucide';
  name: string; // emoji character or Lucide icon name
  color?: string;
  backgroundColor?: string;
  glow?: boolean;
  size?: number; // Scale factor (0-1) relative to building size - default: 0.75 for emoji, 0.5 for lucide
}

export interface FileSuffixConfig {
  primary: ColorLayerConfig;
  secondary?: ColorLayerConfig;
  icon?: FileTypeIconConfig; // Optional icon configuration independent of render strategy
  displayName?: string;
  description?: string;
  category?: string;
  source?: string;
}

export interface FileSuffixColorConfig {
  version: string;
  description: string;
  lastUpdated: string;
  suffixConfigs: Record<string, FileSuffixConfig>;
  defaultConfig?: FileSuffixConfig;
  includeUnmatched?: boolean;
}

/**
 * Creates highlight layers for files based on file extension configurations.
 *
 * @param files - Array of file objects with at least a path property
 * @param config - Optional configuration object with suffix mappings. If not provided, uses default config from files.json
 * @returns Array of HighlightLayer objects for the map visualization
 *
 * @example
 * // Using default configuration
 * const files = [{ path: 'src/index.ts' }, { path: 'src/App.tsx' }];
 * const layers = createFileColorHighlightLayers(files);
 *
 * @example
 * // Using custom configuration
 * const customConfig: FileSuffixColorConfig = {
 *   version: "1.0.0",
 *   description: "Custom colors",
 *   lastUpdated: "2025-01-26",
 *   suffixConfigs: {
 *     ".ts": {
 *       primary: {
 *         color: "#ff0000",
 *         renderStrategy: "border"
 *       }
 *     }
 *   }
 * };
 * const layers = createFileColorHighlightLayers(files, customConfig);
 */
export function createFileColorHighlightLayers(
  files: Array<{ path: string }> | null | undefined,
  config?: FileSuffixColorConfig,
): HighlightLayer[] {
  if (!files || files.length === 0) {
    return [];
  }

  // Use provided config or fall back to default merged with dev overrides
  const colorConfig =
    config ||
    mergeFileColorConfig(defaultFileColorConfig as FileSuffixColorConfig, devFileColorOverrides);

  const { suffixConfigs, defaultConfig: defaultFileConfig, includeUnmatched = true } = colorConfig;

  // Validation
  if (!suffixConfigs || typeof suffixConfigs !== 'object') {
    console.error('[FileColorHighlightLayers] Invalid suffixConfigs structure');
    return [];
  }

  // Group files by their extension
  const filesBySuffix = new Map<string, string[]>();
  const unmatchedFilesBySuffix = new Map<string, string[]>();
  const noExtensionFiles: string[] = [];

  files.forEach(file => {
    const filePath = file.path;
    const lastSlash = filePath.lastIndexOf('/');
    const fileName = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);

    // Check for exact filename match first (e.g., LICENSE, Makefile)
    if (suffixConfigs[fileName]) {
      if (!filesBySuffix.has(fileName)) {
        filesBySuffix.set(fileName, []);
      }
      const fileNameFiles = filesBySuffix.get(fileName);
      if (fileNameFiles) {
        fileNameFiles.push(filePath);
      }
      return;
    }

    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1 || lastDot === fileName.length - 1) {
      // No extension or ends with dot
      if (includeUnmatched) {
        noExtensionFiles.push(filePath);
      }
      return;
    }

    // Check for compound extensions first (e.g., .test.ts, .spec.tsx, .d.ts)
    // Look for patterns like .test.ts, .spec.js, etc.
    let extension: string | null = null;
    const lowerFileName = fileName.toLowerCase();

    // Sort suffixes by length (longest first) to match compound extensions before simple ones
    // e.g., .test.ts should be checked before .ts
    const sortedSuffixes = Object.keys(suffixConfigs).sort((a, b) => b.length - a.length);

    // Check if any suffix config matches as a suffix of the filename
    for (const suffix of sortedSuffixes) {
      if (lowerFileName.endsWith(suffix)) {
        extension = suffix;
        break;
      }
    }

    // Fallback to simple extension if no compound match found
    if (!extension) {
      extension = fileName.substring(lastDot).toLowerCase();
    }

    if (suffixConfigs[extension]) {
      if (!filesBySuffix.has(extension)) {
        filesBySuffix.set(extension, []);
      }
      const extFiles = filesBySuffix.get(extension);
      if (extFiles) {
        extFiles.push(filePath);
      }
    } else if (includeUnmatched) {
      // Group unmatched files by their extension for individual legend entries
      if (!unmatchedFilesBySuffix.has(extension)) {
        unmatchedFilesBySuffix.set(extension, []);
      }
      const unmatchedExtFiles = unmatchedFilesBySuffix.get(extension);
      if (unmatchedExtFiles) {
        unmatchedExtFiles.push(filePath);
      }
    }
  });

  // Create highlight layers
  const layers: HighlightLayer[] = [];

  // Sort by file count (more files first) for consistent ordering
  const sortedSuffixes = Array.from(filesBySuffix.entries()).sort(
    ([, filesA], [, filesB]) => filesB.length - filesA.length,
  );

  // Create layers for matched files
  let basePriority = 1;
  sortedSuffixes.forEach(([suffix, files]) => {
    const suffixConfig = suffixConfigs[suffix];
    // Remove leading dot for extensions, use as-is for exact filenames
    const extensionName = suffix.startsWith('.') ? suffix.substring(1) : suffix;

    // Create primary layer
    const primaryLayer: HighlightLayer = {
      id: `ext-${extensionName}-primary`,
      name: suffixConfig.displayName || extensionName.toUpperCase(),
      color: suffixConfig.primary.color,
      enabled: true,
      opacity: suffixConfig.primary.opacity ?? 1.0,
      priority: suffixConfig.primary.priority ?? basePriority,
      items: files.map(
        (path): LayerItem => ({
          path,
          type: 'file' as const,
          renderStrategy: suffixConfig.primary.renderStrategy,
          ...(suffixConfig.primary.coverOptions && {
            coverOptions: suffixConfig.primary.coverOptions,
          }),
          ...(suffixConfig.primary.customRender && {
            customRender: suffixConfig.primary.customRender,
          }),
        }),
      ),
    };

    if (suffixConfig.primary.borderWidth) {
      primaryLayer.borderWidth = suffixConfig.primary.borderWidth;
    }

    layers.push(primaryLayer);

    // Create secondary layer if configured
    if (suffixConfig.secondary) {
      const secondary = suffixConfig.secondary;
      const secondaryLayer: HighlightLayer = {
        id: `ext-${extensionName}-secondary`,
        name: `${suffixConfig.displayName || extensionName.toUpperCase()} Secondary`,
        color: secondary.color,
        enabled: true,
        opacity: secondary.opacity ?? 1.0,
        priority: secondary.priority ?? basePriority + 100, // Higher priority by default
        items: files.map(
          (path): LayerItem => ({
            path,
            type: 'file' as const,
            renderStrategy: secondary.renderStrategy,
            ...(secondary.coverOptions && { coverOptions: secondary.coverOptions }),
            ...(secondary.customRender && { customRender: secondary.customRender }),
          }),
        ),
      };

      if (secondary.borderWidth) {
        secondaryLayer.borderWidth = secondary.borderWidth;
      }

      layers.push(secondaryLayer);
    }

    basePriority += 2; // Leave room for primary + secondary layers
  });

  // Add layers for unmatched file extensions (each extension gets its own legend entry)
  if (includeUnmatched && defaultFileConfig) {
    // Sort unmatched extensions by file count
    const sortedUnmatchedSuffixes = Array.from(unmatchedFilesBySuffix.entries()).sort(
      ([, filesA], [, filesB]) => filesB.length - filesA.length,
    );

    sortedUnmatchedSuffixes.forEach(([suffix, files]) => {
      const extensionName = suffix.startsWith('.') ? suffix.substring(1) : suffix;

      const unmatchedLayer: HighlightLayer = {
        id: `ext-${extensionName}-primary`,
        name: extensionName.toUpperCase(),
        color: defaultFileConfig.primary.color,
        enabled: true,
        opacity: defaultFileConfig.primary.opacity ?? 1.0,
        priority: defaultFileConfig.primary.priority ?? basePriority,
        items: files.map(
          (path): LayerItem => ({
            path,
            type: 'file' as const,
            renderStrategy: defaultFileConfig.primary.renderStrategy,
            ...(defaultFileConfig.primary.coverOptions && {
              coverOptions: defaultFileConfig.primary.coverOptions,
            }),
            ...(defaultFileConfig.primary.customRender && {
              customRender: defaultFileConfig.primary.customRender,
            }),
          }),
        ),
      };

      if (defaultFileConfig.primary.borderWidth) {
        unmatchedLayer.borderWidth = defaultFileConfig.primary.borderWidth;
      }

      layers.push(unmatchedLayer);

      // Add secondary layer if configured
      if (defaultFileConfig.secondary) {
        const secondary = defaultFileConfig.secondary;
        const unmatchedSecondaryLayer: HighlightLayer = {
          id: `ext-${extensionName}-secondary`,
          name: `${extensionName.toUpperCase()} Secondary`,
          color: secondary.color,
          enabled: true,
          opacity: secondary.opacity ?? 1.0,
          priority: secondary.priority ?? basePriority + 100,
          items: files.map(
            (path): LayerItem => ({
              path,
              type: 'file' as const,
              renderStrategy: secondary.renderStrategy,
              ...(secondary.coverOptions && { coverOptions: secondary.coverOptions }),
              ...(secondary.customRender && { customRender: secondary.customRender }),
            }),
          ),
        };

        if (secondary.borderWidth) {
          unmatchedSecondaryLayer.borderWidth = secondary.borderWidth;
        }

        layers.push(unmatchedSecondaryLayer);
      }

      basePriority += 2;
    });

    // Add layer for files with no extension
    if (noExtensionFiles.length > 0) {
      const noExtLayer: HighlightLayer = {
        id: 'other-files-primary',
        name: 'OTHER',
        color: defaultFileConfig.primary.color,
        enabled: true,
        opacity: defaultFileConfig.primary.opacity ?? 1.0,
        priority: defaultFileConfig.primary.priority ?? basePriority,
        items: noExtensionFiles.map(
          (path): LayerItem => ({
            path,
            type: 'file' as const,
            renderStrategy: defaultFileConfig.primary.renderStrategy,
            ...(defaultFileConfig.primary.coverOptions && {
              coverOptions: defaultFileConfig.primary.coverOptions,
            }),
            ...(defaultFileConfig.primary.customRender && {
              customRender: defaultFileConfig.primary.customRender,
            }),
          }),
        ),
      };

      if (defaultFileConfig.primary.borderWidth) {
        noExtLayer.borderWidth = defaultFileConfig.primary.borderWidth;
      }

      layers.push(noExtLayer);

      if (defaultFileConfig.secondary) {
        const secondary = defaultFileConfig.secondary;
        const noExtSecondaryLayer: HighlightLayer = {
          id: 'other-files-secondary',
          name: 'OTHER Secondary',
          color: secondary.color,
          enabled: true,
          opacity: secondary.opacity ?? 1.0,
          priority: secondary.priority ?? basePriority + 100,
          items: noExtensionFiles.map(
            (path): LayerItem => ({
              path,
              type: 'file' as const,
              renderStrategy: secondary.renderStrategy,
              ...(secondary.coverOptions && { coverOptions: secondary.coverOptions }),
              ...(secondary.customRender && { customRender: secondary.customRender }),
            }),
          ),
        };

        if (secondary.borderWidth) {
          noExtSecondaryLayer.borderWidth = secondary.borderWidth;
        }

        layers.push(noExtSecondaryLayer);
      }
    }
  }

  return layers;
}

/**
 * Get the default file color configuration.
 * This returns the configuration loaded from files.json merged with local dev overrides.
 */
export function getDefaultFileColorConfig(): FileSuffixColorConfig {
  return mergeFileColorConfig(defaultFileColorConfig as FileSuffixColorConfig, devFileColorOverrides);
}

/**
 * Get a simple color mapping from the configuration.
 * This is useful for backwards compatibility or simpler use cases.
 *
 * @param config - Optional configuration. If not provided, uses default config.
 * @returns Record mapping file extensions to hex color strings
 */
export function getFileColorMapping(config?: FileSuffixColorConfig): Record<string, string> {
  const colorConfig =
    config ||
    mergeFileColorConfig(defaultFileColorConfig as FileSuffixColorConfig, devFileColorOverrides);
  return Object.entries(colorConfig.suffixConfigs).reduce((acc, [extension, suffixConfig]) => {
    acc[extension] = suffixConfig.primary.color;
    return acc;
  }, {} as Record<string, string>);
}
