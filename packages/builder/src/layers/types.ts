/**
 * Layer types for file city visualization
 * These define how files and directories can be highlighted and styled
 */

/**
 * Rendering strategy for layer items
 */
export type LayerRenderStrategy =
  | 'border'
  | 'fill'
  | 'glow'
  | 'pattern'
  | 'cover'
  | 'icon'
  | 'custom';

/**
 * A single item in a highlight layer
 * Can represent a file or directory with custom rendering options
 */
export interface LayerItem {
  /** File or directory path (relative to repository root) */
  path: string;
  /** Type of item */
  type: 'file' | 'directory';
  /** Optional render strategy override */
  renderStrategy?: LayerRenderStrategy;
  /** Cover-specific rendering options */
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
  /** Custom render function (for advanced use cases) */
  customRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number },
    scale: number,
  ) => void;
}

/**
 * A highlight layer that can highlight multiple files/directories
 * Used for visualization and guided tours
 */
export interface HighlightLayer {
  /** Unique identifier for the layer */
  id: string;
  /** Display name */
  name: string;
  /** Whether the layer is currently enabled/visible */
  enabled: boolean;
  /** Color for the highlight (hex format) */
  color: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Border width in pixels */
  borderWidth?: number;
  /** Rendering priority (higher renders on top) */
  priority: number;
  /** Items to highlight in this layer */
  items: LayerItem[];
  /** Performance hint - mark layers that change frequently */
  dynamic?: boolean;
}
