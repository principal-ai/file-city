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
export function hasUIMetadata(metadata: unknown): metadata is { ui: UIMetadata } {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'ui' in metadata &&
    typeof (metadata as { ui: unknown }).ui === 'object'
  );
}

/**
 * Get UI metadata from a CodebaseView's metadata field
 * Returns defaults if no UI metadata is present
 */
export function getUIMetadata(metadata?: Record<string, unknown>): UIMetadata | undefined {
  if (!metadata || !hasUIMetadata(metadata)) {
    // Return undefined when no UI metadata is present
    return undefined;
  }
  // Merge provided metadata with defaults
  return mergeWithDefaults(metadata.ui);
}

/**
 * Set UI metadata in a metadata object
 */
export function setUIMetadata(
  metadata: Record<string, unknown> | undefined,
  ui: UIMetadata,
): Record<string, unknown> {
  return {
    ...metadata,
    ui,
  };
}

/**
 * Get UI metadata for a specific file cell
 */
export function getCellUIMetadata(
  cellMetadata?: Record<string, unknown>,
): FileCellUIMetadata | undefined {
  if (!cellMetadata || typeof cellMetadata.ui !== 'object') {
    return undefined;
  }
  // Extract only the FileCellUIMetadata fields from the ui object
  const ui = cellMetadata.ui as Record<string, unknown>;
  return {
    color: typeof ui.color === 'string' ? ui.color : undefined,
  };
}

/**
 * Set UI metadata for a file cell
 */
export function setCellUIMetadata(
  cellMetadata: Record<string, unknown> | undefined,
  ui: FileCellUIMetadata,
): Record<string, unknown> {
  return {
    ...cellMetadata,
    ui,
  };
}

/**
 * Default UI metadata values
 */
export const DEFAULT_UI_METADATA: UIMetadata = {
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
export function mergeWithDefaults(ui?: Partial<UIMetadata>): UIMetadata {
  return {
    ...DEFAULT_UI_METADATA,
    ...ui,
  };
}
