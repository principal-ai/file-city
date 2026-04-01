/**
 * Centralized file configuration lookup
 *
 * Provides a single source of truth for file colors, icons, and metadata
 * based on the files.json configuration.
 */

import defaultFileColorConfig from './files.json' with { type: 'json' };

// Types for render strategies
export type RenderStrategy = 'fill' | 'border' | 'glow';

// Icon configuration
export interface FileIconConfig {
  type: 'lucide' | 'emoji';
  name: string;
  color?: string;
  size?: number;
}

// Secondary color configuration
export interface SecondaryColorConfig {
  color: string;
  renderStrategy?: RenderStrategy;
  opacity?: number;
  borderWidth?: number;
}

// Full result from getFileConfig
export interface FileConfigResult {
  // Primary color info
  color: string;
  renderStrategy: RenderStrategy;
  opacity: number;

  // Secondary color (optional)
  secondary?: SecondaryColorConfig;

  // Icon info (optional)
  icon?: FileIconConfig;

  // Metadata
  displayName?: string;
  description?: string;
  category?: string;

  // Match info - tells caller what pattern matched
  matchedPattern: string;
  matchType: 'filename' | 'extension' | 'default';
}

// Internal type for the JSON config structure
interface SuffixConfigEntry {
  primary?: {
    color?: string;
    renderStrategy?: RenderStrategy;
    opacity?: number;
  };
  secondary?: {
    color?: string;
    renderStrategy?: RenderStrategy;
    opacity?: number;
    borderWidth?: number;
  };
  icon?: {
    type?: 'lucide' | 'emoji';
    name?: string;
    color?: string;
    size?: number;
  };
  displayName?: string;
  description?: string;
  category?: string;
}

interface FileColorConfig {
  suffixConfigs?: Record<string, SuffixConfigEntry>;
  defaultConfig?: {
    primary?: {
      color?: string;
      renderStrategy?: RenderStrategy;
      opacity?: number;
    };
  };
}

const config = defaultFileColorConfig as FileColorConfig;
const suffixConfigs = config.suffixConfigs ?? {};

// Default fallback values
const DEFAULT_COLOR = '#8b949e';
const DEFAULT_RENDER_STRATEGY: RenderStrategy = 'fill';
const DEFAULT_OPACITY = 1.0;

/**
 * Get the full configuration for a file based on its path.
 *
 * Lookup priority:
 * 1. Full filename match (e.g., "package.json", "Dockerfile", "README.md")
 * 2. Compound extension match (e.g., ".stories.tsx", ".test.ts", ".spec.js")
 * 3. Simple extension match (e.g., ".ts", ".tsx", ".json")
 * 4. Default fallback
 *
 * @param filePath - The file path or filename to look up
 * @returns Full configuration including color, icon, and metadata
 */
export function getFileConfig(filePath: string): FileConfigResult {
  const fileName = filePath.split('/').pop() || filePath;

  // 1. Try full filename match first (higher priority for special files)
  const fileNameConfig = suffixConfigs[fileName];
  if (fileNameConfig?.primary?.color) {
    return buildResult(fileNameConfig, fileName, 'filename');
  }

  // 2. Try compound extension match (e.g., .stories.tsx, .test.ts, .spec.js)
  // Find second-to-last dot for compound extensions
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const secondLastDotIndex = fileName.lastIndexOf('.', lastDotIndex - 1);
    if (secondLastDotIndex > 0) {
      const compoundExt = fileName.slice(secondLastDotIndex); // e.g., ".stories.tsx"
      const compoundConfig = suffixConfigs[compoundExt];
      if (compoundConfig?.primary?.color) {
        return buildResult(compoundConfig, compoundExt, 'extension');
      }
    }

    // 3. Try simple extension match
    const extension = fileName.slice(lastDotIndex); // includes the dot
    const extConfig = suffixConfigs[extension];
    if (extConfig?.primary?.color) {
      return buildResult(extConfig, extension, 'extension');
    }
  }

  // 4. Fallback to default
  const defaultConfig = config.defaultConfig;
  return {
    color: defaultConfig?.primary?.color ?? DEFAULT_COLOR,
    renderStrategy: defaultConfig?.primary?.renderStrategy ?? DEFAULT_RENDER_STRATEGY,
    opacity: defaultConfig?.primary?.opacity ?? DEFAULT_OPACITY,
    matchedPattern: 'default',
    matchType: 'default',
  };
}

/**
 * Build a FileConfigResult from a suffix config entry
 */
function buildResult(
  entry: SuffixConfigEntry,
  pattern: string,
  matchType: 'filename' | 'extension',
): FileConfigResult {
  const result: FileConfigResult = {
    color: entry.primary?.color ?? DEFAULT_COLOR,
    renderStrategy: entry.primary?.renderStrategy ?? DEFAULT_RENDER_STRATEGY,
    opacity: entry.primary?.opacity ?? DEFAULT_OPACITY,
    matchedPattern: pattern,
    matchType,
  };

  // Add secondary if present
  if (entry.secondary?.color) {
    result.secondary = {
      color: entry.secondary.color,
      renderStrategy: entry.secondary.renderStrategy,
      opacity: entry.secondary.opacity,
      borderWidth: entry.secondary.borderWidth,
    };
  }

  // Add icon if present
  if (entry.icon?.name) {
    result.icon = {
      type: entry.icon.type ?? 'lucide',
      name: entry.icon.name,
      color: entry.icon.color,
      size: entry.icon.size,
    };
  }

  // Add metadata
  if (entry.displayName) result.displayName = entry.displayName;
  if (entry.description) result.description = entry.description;
  if (entry.category) result.category = entry.category;

  return result;
}

/**
 * Convenience function to get just the color for a file.
 * Use getFileConfig() if you need icon or other metadata.
 *
 * @param filePath - The file path or filename to look up
 * @returns The hex color string
 */
export function getFileColor(filePath: string): string {
  return getFileConfig(filePath).color;
}
