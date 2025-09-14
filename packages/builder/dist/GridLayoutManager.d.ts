import { FileTree } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';
/**
 * Manages grid-based spatial layout for city visualization
 */
export declare class GridLayoutManager {
    /**
     * Get the grid dimensions for a codebase view config.
     * If rows/cols are not specified, compute them from cell coordinates.
     */
    getGridDimensions(config: CodebaseView): {
        rows: number;
        cols: number;
    };
    /**
     * Split a file tree into a grid of smaller trees based on configuration
     */
    splitTreeIntoGrid(fileTree: FileTree, config: CodebaseView): Map<string, FileTree>;
    /**
     * Calculate the bounds for a specific cell in the grid
     */
    calculateCellBounds(totalWidth: number, totalHeight: number, row: number, col: number, rows: number, cols: number, padding?: number, config?: CodebaseView): {
        x: number;
        y: number;
        width: number;
        height: number;
        labelBounds?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    /**
     * Assign directories to cells based on cell configuration
     */
    private assignDirectoriesToCells;
    /**
     * Recursively collect all items with their relative paths
     */
    private collectAllItemsWithPaths;
    /**
     * Create an empty file tree
     */
    private createEmptyFileTree;
    /**
     * Update statistics for a file tree
     */
    private updateTreeStats;
    /**
     * Recursively calculate statistics for a directory
     */
    private calculateStats;
}
//# sourceMappingURL=GridLayoutManager.d.ts.map