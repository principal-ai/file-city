import { FileTree as FileSystemTree } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';
import { CityData } from './types/cityData';
import { DirectorySortFunction, FileSortFunction } from './types/sorts';
export interface TreemapOptions {
    gridLayout?: CodebaseView;
    maxNestingDepth?: number;
    deepNestingStrategy?: 'flatten' | 'boost-size' | 'reduce-padding' | 'hybrid';
    depthBasedPaddingReduction?: boolean;
    minimumBuildingSizeOverride?: boolean;
    deepNestingSizeBoost?: number;
    flattenThreshold?: number;
    padding?: number;
    paddingOuter?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingInner?: number;
    round?: boolean;
    tile?: any;
    directorySortFn?: DirectorySortFunction;
    fileSortFn?: FileSortFunction;
}
/**
 * CodeCityBuilderWithGrid - D3 Treemap Implementation with Grid Layout
 *
 * This class converts a FileSystemTree into a CityData visualization using D3's
 * robust treemap algorithms with grid-based spatial organization.
 *
 * Grid Layout:
 * - Default: 1x1 grid (traditional single treemap)
 * - Multi-cell: Organize code into spatial regions (src, tests, docs, etc.)
 * - Each directory becomes a district (rectangular boundary)
 * - Each file becomes a building (3D block) within those districts
 *
 * The grid system provides better organization for large codebases while
 * maintaining backward compatibility through the 1x1 default configuration.
 */
export declare class CodeCityBuilderWithGrid {
    private minBuildingSize;
    private maxBuildingSize;
    constructor();
    /**
     * Default alphabetical sort for directories
     */
    private defaultDirectorySort;
    /**
     * Default alphabetical sort for files
     */
    private defaultFileSort;
    /**
     * Calculate maximum depth of directory hierarchy
     */
    private calculateMaxDepth;
    /**
     * Analyze file system complexity for content-aware sizing
     */
    private analyzeFileSystemComplexity;
    /**
     * Legacy square root scaling (original method)
     */
    private calculateLegacySqrtSize;
    /**
     * Calculate optimal size using the specified sizing strategy
     */
    private calculateOptimalSize;
    /**
     * Apply deep nesting handling to the hierarchy data before treemap layout
     */
    private handleDeepNesting;
    /**
     * Flatten directory structure beyond a certain depth
     * Moves deeply nested files to shallower directories with path-based names
     */
    private flattenDeepStructure;
    /**
     * Recursively collect files from deeply nested directories
     */
    private collectDeepFiles;
    /**
     * Boost the importance (value) of files in deeply nested directories
     * This makes treemap allocate more space to them
     */
    private boostDeepFileImportance;
    /**
     * Calculate depth-aware padding that reduces at deeper levels
     */
    private calculateDepthAwarePadding;
    /**
     * Post-process buildings to enforce minimum sizes for deeply nested items
     */
    private enforceMinimumBuildingSizes;
    /**
     * Main method to convert file system tree to city data using D3 treemap with grid layout
     *
     * @param fileSystemTree - The file system structure to visualize
     * @param rootPath - The root path for the visualization
     * @param options - Treemap configuration options
     * @returns CityData with districts and buildings positioned via grid-based D3 treemap
     */
    buildCityFromFileSystem(fileSystemTree: FileSystemTree, rootPath?: string, options?: TreemapOptions): CityData;
    /**
     * Build city with grid-based spatial layout (now the primary implementation)
     *
     * @param fileSystemTree - The file system structure to visualize
     * @param rootPath - The root path for the visualization
     * @param options - Treemap configuration options with grid layout
     * @returns CityData with districts and buildings positioned in grid cells
     */
    private buildCityWithGridLayout;
    /**
     * Build city for a single grid cell using treemap layout
     * This is the core treemap implementation without grid splitting
     */
    private buildSingleCellCity;
    /**
     * Convert FileSystemTree format to D3 hierarchy format
     *
     * D3 expects a specific hierarchy structure with name, children, and value properties.
     * This method recursively transforms our FileSystemTree into that format.
     */
    private convertToD3Hierarchy;
    /**
     * Convert D3 treemap layout results back to our CityData format
     *
     * This method traverses the D3 treemap result and creates districts for directories
     * and buildings for files, using the calculated rectangle positions and sizes.
     */
    private convertD3TreemapToCityData;
    /**
     * Create a building from D3 treemap node data
     *
     * Buildings are positioned at the center of their allocated treemap rectangle,
     * with dimensions that fill the rectangle and height based on file size.
     *
     * UPDATED: Use D3's built-in padding system for proper space management
     * instead of manual post-processing adjustments.
     */
    private createBuildingFromD3Node;
    /**
     * Compute bounds from children nodes when a directory has no allocated area
     */
    private computeBoundsFromChildren;
    /**
     * Calculate overall bounds of the city
     *
     * This determines the total area covered by all districts and buildings
     * for camera positioning and viewport calculations.
     */
    private calculateBounds;
    /**
     * Validate that buildings are properly contained within their parent districts
     * This helps debug coordinate system issues with the D3 treemap layout
     */
    private validateBuildingDistrictContainment;
}
//# sourceMappingURL=CodeCityBuilderWithGrid.d.ts.map