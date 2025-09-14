/**
 * UI metadata configuration for CodebaseView
 * These are rendering/visualization specific fields that extend
 * the core data model from a24z-memory.
 */
/**
 * Type guard to check if metadata has UI configuration
 */
export function hasUIMetadata(metadata) {
    return (typeof metadata === 'object' &&
        metadata !== null &&
        'ui' in metadata &&
        typeof metadata.ui === 'object');
}
/**
 * Get UI metadata from a CodebaseView's metadata field
 * Returns defaults if no UI metadata is present
 */
export function getUIMetadata(metadata) {
    if (!metadata || !hasUIMetadata(metadata)) {
        // Return defaults when no metadata is present
        return DEFAULT_UI_METADATA;
    }
    // Merge provided metadata with defaults
    return mergeWithDefaults(metadata.ui);
}
/**
 * Set UI metadata in a metadata object
 */
export function setUIMetadata(metadata, ui) {
    return {
        ...metadata,
        ui,
    };
}
/**
 * Get UI metadata for a specific file cell
 */
export function getCellUIMetadata(cellMetadata) {
    if (!cellMetadata || typeof cellMetadata.ui !== 'object') {
        return undefined;
    }
    // Extract only the FileCellUIMetadata fields from the ui object
    const ui = cellMetadata.ui;
    return {
        color: typeof ui.color === 'string' ? ui.color : undefined,
    };
}
/**
 * Set UI metadata for a file cell
 */
export function setCellUIMetadata(cellMetadata, ui) {
    return {
        ...cellMetadata,
        ui,
    };
}
/**
 * Default UI metadata values
 */
export const DEFAULT_UI_METADATA = {
    enabled: true,
    rows: 2,
    cols: 2,
    cellPadding: 10,
    showCellLabels: true,
    cellLabelPosition: 'top',
    cellLabelHeightPercent: 0.12,
};
/**
 * Merge UI metadata with defaults
 */
export function mergeWithDefaults(ui) {
    return {
        ...DEFAULT_UI_METADATA,
        ...ui,
    };
}
//# sourceMappingURL=ui-metadata.js.map