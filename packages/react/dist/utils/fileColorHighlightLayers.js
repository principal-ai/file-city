"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileColorHighlightLayers = createFileColorHighlightLayers;
exports.getDefaultFileColorConfig = getDefaultFileColorConfig;
exports.getFileColorMapping = getFileColorMapping;
const files_json_1 = __importDefault(require("../config/files.json"));
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
function createFileColorHighlightLayers(files, config) {
    if (!files || files.length === 0) {
        return [];
    }
    // Use provided config or fall back to default from files.json
    const colorConfig = config || files_json_1.default;
    const { suffixConfigs, defaultConfig: defaultFileConfig, includeUnmatched = true } = colorConfig;
    // Validation
    if (!suffixConfigs || typeof suffixConfigs !== 'object') {
        console.error('[FileColorHighlightLayers] Invalid suffixConfigs structure');
        return [];
    }
    // Group files by their extension
    const filesBySuffix = new Map();
    const unmatchedFiles = [];
    files.forEach(file => {
        const filePath = file.path;
        const lastDot = filePath.lastIndexOf('.');
        if (lastDot === -1 || lastDot === filePath.length - 1) {
            // No extension or ends with dot
            if (includeUnmatched) {
                unmatchedFiles.push(filePath);
            }
            return;
        }
        const extension = filePath.substring(lastDot).toLowerCase();
        if (suffixConfigs[extension]) {
            if (!filesBySuffix.has(extension)) {
                filesBySuffix.set(extension, []);
            }
            filesBySuffix.get(extension).push(filePath);
        }
        else if (includeUnmatched) {
            unmatchedFiles.push(filePath);
        }
    });
    // Create highlight layers
    const layers = [];
    // Sort by file count (more files first) for consistent ordering
    const sortedSuffixes = Array.from(filesBySuffix.entries()).sort(([, filesA], [, filesB]) => filesB.length - filesA.length);
    // Create layers for matched files
    let basePriority = 1;
    sortedSuffixes.forEach(([suffix, files]) => {
        const suffixConfig = suffixConfigs[suffix];
        const extensionName = suffix.substring(1); // Remove leading dot
        // Create primary layer
        const primaryLayer = {
            id: `ext-${extensionName}-primary`,
            name: suffixConfig.displayName || extensionName.toUpperCase(),
            color: suffixConfig.primary.color,
            enabled: true,
            opacity: suffixConfig.primary.opacity ?? 1.0,
            priority: suffixConfig.primary.priority ?? basePriority,
            items: files.map((path) => ({
                path,
                type: 'file',
                renderStrategy: suffixConfig.primary.renderStrategy,
                ...(suffixConfig.primary.coverOptions && {
                    coverOptions: suffixConfig.primary.coverOptions,
                }),
                ...(suffixConfig.primary.customRender && {
                    customRender: suffixConfig.primary.customRender,
                }),
            })),
        };
        if (suffixConfig.primary.borderWidth) {
            primaryLayer.borderWidth = suffixConfig.primary.borderWidth;
        }
        layers.push(primaryLayer);
        // Create secondary layer if configured
        if (suffixConfig.secondary) {
            const secondary = suffixConfig.secondary;
            const secondaryLayer = {
                id: `ext-${extensionName}-secondary`,
                name: `${suffixConfig.displayName || extensionName.toUpperCase()} Secondary`,
                color: secondary.color,
                enabled: true,
                opacity: secondary.opacity ?? 1.0,
                priority: secondary.priority ?? basePriority + 100, // Higher priority by default
                items: files.map((path) => ({
                    path,
                    type: 'file',
                    renderStrategy: secondary.renderStrategy,
                    ...(secondary.coverOptions && { coverOptions: secondary.coverOptions }),
                    ...(secondary.customRender && { customRender: secondary.customRender }),
                })),
            };
            if (secondary.borderWidth) {
                secondaryLayer.borderWidth = secondary.borderWidth;
            }
            layers.push(secondaryLayer);
        }
        basePriority += 2; // Leave room for primary + secondary layers
    });
    // Add unmatched files layer if configured
    if (includeUnmatched && unmatchedFiles.length > 0 && defaultFileConfig) {
        const defaultLayer = {
            id: 'other-files-primary',
            name: 'OTHER',
            color: defaultFileConfig.primary.color,
            enabled: true,
            opacity: defaultFileConfig.primary.opacity ?? 1.0,
            priority: defaultFileConfig.primary.priority ?? basePriority,
            items: unmatchedFiles.map((path) => ({
                path,
                type: 'file',
                renderStrategy: defaultFileConfig.primary.renderStrategy,
                ...(defaultFileConfig.primary.coverOptions && {
                    coverOptions: defaultFileConfig.primary.coverOptions,
                }),
                ...(defaultFileConfig.primary.customRender && {
                    customRender: defaultFileConfig.primary.customRender,
                }),
            })),
        };
        if (defaultFileConfig.primary.borderWidth) {
            defaultLayer.borderWidth = defaultFileConfig.primary.borderWidth;
        }
        layers.push(defaultLayer);
        // Add default secondary layer if configured
        if (defaultFileConfig.secondary) {
            const secondary = defaultFileConfig.secondary;
            const defaultSecondaryLayer = {
                id: 'other-files-secondary',
                name: 'OTHER Secondary',
                color: secondary.color,
                enabled: true,
                opacity: secondary.opacity ?? 1.0,
                priority: secondary.priority ?? basePriority + 100,
                items: unmatchedFiles.map((path) => ({
                    path,
                    type: 'file',
                    renderStrategy: secondary.renderStrategy,
                    ...(secondary.coverOptions && { coverOptions: secondary.coverOptions }),
                    ...(secondary.customRender && { customRender: secondary.customRender }),
                })),
            };
            if (secondary.borderWidth) {
                defaultSecondaryLayer.borderWidth = secondary.borderWidth;
            }
            layers.push(defaultSecondaryLayer);
        }
    }
    return layers;
}
/**
 * Get the default file color configuration.
 * This returns the configuration loaded from files.json.
 */
function getDefaultFileColorConfig() {
    return files_json_1.default;
}
/**
 * Get a simple color mapping from the configuration.
 * This is useful for backwards compatibility or simpler use cases.
 *
 * @param config - Optional configuration. If not provided, uses default config.
 * @returns Record mapping file extensions to hex color strings
 */
function getFileColorMapping(config) {
    const colorConfig = config || files_json_1.default;
    return Object.entries(colorConfig.suffixConfigs).reduce((acc, [extension, suffixConfig]) => {
        acc[extension] = suffixConfig.primary.color;
        return acc;
    }, {});
}
