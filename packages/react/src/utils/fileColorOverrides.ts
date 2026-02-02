import { FileSuffixColorConfig } from './fileColorHighlightLayers';

/**
 * Development overrides for file color configuration.
 * Add new file extensions here during development, then move them to
 * @principal-ai/file-city-builder/src/config/files.json when ready to publish.
 *
 * These overrides will merge with (and take precedence over) the default config.
 */
export const devFileColorOverrides: Partial<FileSuffixColorConfig> = {
  suffixConfigs: {
    // Add your new file extensions here during development
    "package.json": {
      primary: {
        color: "#CB3837",
        renderStrategy: "fill",
        opacity: 1.0,
      },
      icon: {
        type: "lucide",
        name: "Package",
        color: "#ffffff",
        size: 0.6,
      },
      displayName: "Package",
      description: "npm package.json files",
      category: "Configuration",
    },
  },
};

/**
 * Merges the default file color configuration with local development overrides.
 * Overrides take precedence over defaults.
 *
 * @param defaultConfig - The default configuration from the builder package
 * @param overrides - Local development overrides
 * @returns Merged configuration with overrides applied
 */
export function mergeFileColorConfig(
  defaultConfig: FileSuffixColorConfig,
  overrides: Partial<FileSuffixColorConfig>,
): FileSuffixColorConfig {
  return {
    ...defaultConfig,
    ...overrides,
    suffixConfigs: {
      ...defaultConfig.suffixConfigs,
      ...(overrides.suffixConfigs || {}),
    },
    // Keep default config's defaultConfig unless explicitly overridden
    ...(overrides.defaultConfig && { defaultConfig: overrides.defaultConfig }),
  };
}
