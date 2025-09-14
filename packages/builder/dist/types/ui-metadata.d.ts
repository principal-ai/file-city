/**
 * UI metadata configuration for CodebaseView
 * These are rendering/visualization specific fields that extend
 * the core data model from a24z-memory.
 */
/**
 * UI configuration stored in CodebaseView metadata.ui field
 */
export interface UIMetadata {
    /**
     * Whether grid layout is enabled
     */
    enabled: boolean;
    /**
     * Number of rows in the grid
     */
    rows?: number;
    /**
     * Number of columns in the grid
     */
    cols?: number;
    /**
     * Padding between cells in pixels
     */
    cellPadding?: number;
    /**
     * Whether to show labels for grid cells
     */
    showCellLabels?: boolean;
    /**
     * Position of cell labels relative to the cell
     */
    cellLabelPosition?: 'none' | 'top' | 'bottom';
    /**
     * Height of cell labels in pixels (deprecated, use cellLabelHeightPercent)
     */
    cellLabelHeight?: number;
    /**
     * Height of cell labels as a percentage of cell height (0-1)
     */
    cellLabelHeightPercent?: number;
    /**
     * Strategy for handling unassigned files/directories
     * @deprecated Use scope.exclude patterns instead
     */
    unassignedStrategy?: 'hide' | 'default' | 'distribute';
}
/**
 * UI metadata for file cells
 */
export interface FileCellUIMetadata {
    /**
     * Color for highlighting this cell
     */
    color?: string;
}
/**
 * Type guard to check if metadata has UI configuration
 */
export declare function hasUIMetadata(metadata: unknown): metadata is {
    ui: UIMetadata;
};
/**
 * Get UI metadata from a CodebaseView's metadata field
 * Returns defaults if no UI metadata is present
 */
export declare function getUIMetadata(metadata?: Record<string, unknown>): UIMetadata | undefined;
/**
 * Set UI metadata in a metadata object
 */
export declare function setUIMetadata(metadata: Record<string, unknown> | undefined, ui: UIMetadata): Record<string, unknown>;
/**
 * Get UI metadata for a specific file cell
 */
export declare function getCellUIMetadata(cellMetadata?: Record<string, unknown>): FileCellUIMetadata | undefined;
/**
 * Set UI metadata for a file cell
 */
export declare function setCellUIMetadata(cellMetadata: Record<string, unknown> | undefined, ui: FileCellUIMetadata): Record<string, unknown>;
/**
 * Default UI metadata values
 */
export declare const DEFAULT_UI_METADATA: UIMetadata;
/**
 * Merge UI metadata with defaults
 */
export declare function mergeWithDefaults(ui?: Partial<UIMetadata>): UIMetadata;
//# sourceMappingURL=ui-metadata.d.ts.map