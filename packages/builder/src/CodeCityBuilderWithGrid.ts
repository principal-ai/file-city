import {
  FileTree as FileSystemTree,
  FileInfo,
  DirectoryInfo,
} from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@principal-ai/alexandria-core-library';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import type { HierarchyRectangularNode } from 'd3-hierarchy';

import { CityData, CityBuilding, CityDistrict, Bounds2D } from './types/cityData.js';
import { DirectorySortFunction, FileSortFunction } from './types/sorts.js';
import { getUIMetadata } from './types/ui-metadata.js';

import { GridLayoutManager } from './GridLayoutManager.js';

// D3 Hierarchy data structure
interface D3HierarchyData {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  lastModified?: Date;
  fileCount?: number;
  totalSize?: number;
  children?: D3HierarchyData[];
  weight?: number;
  originalPath?: string;
  flattenedFrom?: string;
  deepNestingBoost?: number;
}

// Cache entry for treemap results
interface TreemapCacheEntry {
  cityData: CityData;
  createdAt: number;
}

// Options that affect cache key (layout-related only)
interface CacheRelevantOptions {
  padding?: number;
  paddingOuter?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingInner?: number;
  round?: boolean;
  maxNestingDepth?: number;
  deepNestingStrategy?: string;
  minimumBuildingSizeOverride?: boolean;
  deepNestingSizeBoost?: number;
  flattenThreshold?: number;
}

// File system complexity statistics
interface FileSystemComplexityStats {
  totalFiles: number;
  totalDirectories: number;
  totalFileSize: number;
  maxDepth: number;
  avgFilesPerDirectory: number;
}

// Legend types removed - legends should be handled in the React layer

export interface TreemapOptions {
  // Grid layout configuration - now always used internally
  // If not specified, defaults to 1x1 grid (traditional single treemap)
  gridLayout?: CodebaseView;

  // Deep nesting handling flags
  maxNestingDepth?: number; // Flatten beyond this depth
  deepNestingStrategy?: 'flatten' | 'boost-size' | 'reduce-padding' | 'hybrid';
  depthBasedPaddingReduction?: boolean; // Reduce padding at deeper levels
  minimumBuildingSizeOverride?: boolean; // Force minimum sizes even if treemap disagrees
  deepNestingSizeBoost?: number; // Size multiplier for deep files (e.g., 1.5)
  flattenThreshold?: number; // Files per directory threshold for flattening

  padding?: number;
  paddingOuter?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingInner?: number;
  round?: boolean;
  tile?: typeof treemapSquarify;
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
export class CodeCityBuilderWithGrid {
  private minBuildingSize: number = 4;
  private maxBuildingSize: number = 40;

  // LRU cache for treemap results
  private layoutCache: Map<string, TreemapCacheEntry> = new Map();
  private readonly maxCacheSize: number;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(options?: { maxCacheSize?: number }) {
    // Removed theme and color parameters - these should be handled in the React layer
    this.maxCacheSize = options?.maxCacheSize ?? 20;
  }

  /**
   * Generate a cache key from file tree and options
   * Uses a fast hash of the structural properties that affect layout
   */
  private generateCacheKey(
    fileSystemTree: FileSystemTree,
    rootPath: string,
    options: TreemapOptions,
  ): string {
    // Extract only the options that affect treemap layout
    const cacheRelevantOptions: CacheRelevantOptions = {
      padding: options.padding,
      paddingOuter: options.paddingOuter,
      paddingTop: options.paddingTop,
      paddingBottom: options.paddingBottom,
      paddingLeft: options.paddingLeft,
      paddingRight: options.paddingRight,
      paddingInner: options.paddingInner,
      round: options.round,
      maxNestingDepth: options.maxNestingDepth,
      deepNestingStrategy: options.deepNestingStrategy,
      minimumBuildingSizeOverride: options.minimumBuildingSizeOverride,
      deepNestingSizeBoost: options.deepNestingSizeBoost,
      flattenThreshold: options.flattenThreshold,
    };

    // Build tree identity from multiple factors to ensure uniqueness
    // For grid cells, metadata.id may be 'empty-cell' for all cells, so we need
    // additional differentiators based on actual content
    const statsKey = `${fileSystemTree.stats.totalFiles}:${fileSystemTree.stats.totalDirectories}:${fileSystemTree.stats.totalSize}`;

    // Include top-level children names to differentiate grid cells with same stats
    const childrenKey = fileSystemTree.root.children
      .map(child => child.name)
      .sort()
      .join(',');

    // Use metadata ID if it's meaningful (not 'empty-cell' from grid splitting)
    const metadataId = fileSystemTree.metadata?.id;
    const isGridCell = metadataId === 'empty-cell';

    const treeIdentity = isGridCell
      ? `grid:${statsKey}:${childrenKey}`
      : metadataId
        ? `${metadataId}:${fileSystemTree.metadata?.timestamp?.getTime() ?? 0}`
        : `stats:${statsKey}:${childrenKey}`;

    const optionsHash = JSON.stringify(cacheRelevantOptions);

    return `${treeIdentity}|${rootPath}|${optionsHash}`;
  }

  /**
   * Get cached result or undefined if not cached
   */
  private getCached(key: string): CityData | undefined {
    const entry = this.layoutCache.get(key);
    if (entry) {
      this.cacheHits++;
      // Move to end for LRU behavior (delete and re-add)
      this.layoutCache.delete(key);
      this.layoutCache.set(key, entry);
      return entry.cityData;
    }
    this.cacheMisses++;
    return undefined;
  }

  /**
   * Store result in cache with LRU eviction
   */
  private setCached(key: string, cityData: CityData): void {
    // Evict oldest entries if at capacity
    while (this.layoutCache.size >= this.maxCacheSize) {
      const oldestKey = this.layoutCache.keys().next().value;
      if (oldestKey) {
        this.layoutCache.delete(oldestKey);
      }
    }

    this.layoutCache.set(key, {
      cityData,
      createdAt: Date.now(),
    });
  }

  /**
   * Clear all cached treemap results
   */
  public clearCache(): void {
    this.layoutCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics for debugging/monitoring
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.layoutCache.size,
      maxSize: this.maxCacheSize,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Calculate maximum depth of directory hierarchy
   */
  private calculateMaxDepth(directory: DirectoryInfo, currentDepth: number = 0): number {
    let maxDepth = currentDepth;

    directory.children.forEach(child => {
      if ('children' in child) {
        const childDepth = this.calculateMaxDepth(child as DirectoryInfo, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    });

    return maxDepth;
  }

  /**
   * Analyze file system complexity for content-aware sizing
   */
  private analyzeFileSystemComplexity(
    directory: DirectoryInfo,
    stats: FileSystemComplexityStats = {
      totalFiles: 0,
      totalDirectories: 0,
      totalFileSize: 0,
      maxDepth: 0,
      avgFilesPerDirectory: 0,
    },
    currentDepth: number = 0,
  ): FileSystemComplexityStats {
    stats.totalDirectories++;
    stats.maxDepth = Math.max(stats.maxDepth, currentDepth);

    directory.children.forEach(child => {
      if ('children' in child) {
        this.analyzeFileSystemComplexity(child as DirectoryInfo, stats, currentDepth + 1);
      } else {
        const file = child as FileInfo;
        stats.totalFiles++;
        stats.totalFileSize += file.size || 0;
      }
    });

    if (currentDepth === 0) {
      stats.avgFilesPerDirectory = stats.totalFiles / Math.max(1, stats.totalDirectories);
    }

    return stats;
  }

  /**
   * Legacy square root scaling (original method)
   */
  private calculateLegacySqrtSize(totalFiles: number): { width: number; height: number } {
    const minDimension = 500;
    const maxDimension = 1200;

    // Square root scaling: balanced growth
    const filesPerUnit = 10;
    const scaleFactor = Math.max(1, Math.sqrt(totalFiles / filesPerUnit));
    const width = Math.min(Math.max(minDimension * scaleFactor, minDimension), maxDimension);
    const height = width; // Keep square

    return { width, height };
  }

  /**
   * Calculate optimal size using the specified sizing strategy
   */
  private calculateOptimalSize(
    totalFiles: number,
    totalDirectories: number,
    _options: TreemapOptions,
  ): { width: number; height: number } {
    const result = this.calculateLegacySqrtSize(totalFiles);

    // Enforce minimum dimensions based on file count and directory structure
    if (totalFiles > 0) {
      // More aggressive minimum dimensions to prevent overlaps
      const baseMinPerFile = 50; // Base minimum dimension per file
      const directoryMultiplier = Math.max(1, totalDirectories / totalFiles); // Penalty for spread out files

      // Use a formula that ensures enough space even for worst-case scenarios
      const minDimension = Math.max(
        1000, // Absolute minimum
        baseMinPerFile * Math.sqrt(totalFiles) * (1 + directoryMultiplier),
      );

      if (result.width < minDimension || result.height < minDimension) {
        result.width = Math.max(result.width, minDimension);
        result.height = Math.max(result.height, minDimension);
      }
    }

    return result;
  }

  /**
   * Post-process buildings to enforce minimum sizes for deeply nested items
   */
  private enforceMinimumBuildingSizes(
    buildings: CityBuilding[],
    options: TreemapOptions,
  ): CityBuilding[] {
    if (!options.minimumBuildingSizeOverride) {
      return buildings;
    }

    const minSize = 6;
    const minArea = minSize * minSize;

    const adjustedBuildings = buildings.map(building => {
      const currentArea = building.dimensions[0] * building.dimensions[2];

      if (currentArea < minArea) {
        const scaleFactor = Math.sqrt(minArea / currentArea);

        return {
          ...building,
          dimensions: [
            Math.max(minSize, building.dimensions[0] * scaleFactor),
            building.dimensions[1], // Keep height unchanged
            Math.max(minSize, building.dimensions[2] * scaleFactor),
          ] as [number, number, number],
        };
      }

      return building;
    });

    return adjustedBuildings;
  }

  /**
   * Main method to convert file system tree to city data using D3 treemap with grid layout
   *
   * @param fileSystemTree - The file system structure to visualize
   * @param rootPath - The root path for the visualization
   * @param options - Treemap configuration options
   * @returns CityData with districts and buildings positioned via grid-based D3 treemap
   */
  public buildCityFromFileSystem(
    fileSystemTree: FileSystemTree,
    rootPath: string = '',
    options: TreemapOptions = {},
  ): CityData {
    // Always use grid layout - default to 1x1 grid if not specified
    const gridConfig: CodebaseView = options.gridLayout || {
      id: 'default-single-cell',
      version: '1.0',
      name: 'Default Single Cell View',
      description: 'Default single-cell grid layout for entire codebase',
      overviewPath: 'README.md',
      category: 'default',
      displayOrder: 0,
      referenceGroups: {
        main: {
          files: ['*'],
          coordinates: [0, 0],
        },
      },
      metadata: {
        ui: {
          enabled: true,
          rows: 1,
          cols: 1,
        },
      },
    };

    return this.buildCityWithGridLayout(fileSystemTree, rootPath, {
      ...options,
      gridLayout: gridConfig,
    });
  }

  /**
   * Build city with grid-based spatial layout (now the primary implementation)
   *
   * @param fileSystemTree - The file system structure to visualize
   * @param rootPath - The root path for the visualization
   * @param options - Treemap configuration options with grid layout
   * @returns CityData with districts and buildings positioned in grid cells
   */
  private buildCityWithGridLayout(
    fileSystemTree: FileSystemTree,
    rootPath: string = '',
    options: TreemapOptions = {},
  ): CityData {
    if (!options.gridLayout) {
      throw new Error('Grid layout configuration is required');
    }

    const gridConfig = options.gridLayout;

    // Multi-cell grid layout - get dimensions first
    const gridManager = new GridLayoutManager();
    const { rows, cols } = gridManager.getGridDimensions(gridConfig);

    // Optimization: For single-cell grids (1x1), skip the grid splitting overhead
    if (rows === 1 && cols === 1) {
      // Direct single-cell rendering without grid overhead
      return this.buildSingleCellCity(fileSystemTree, rootPath, options);
    }

    const gridTrees = gridManager.splitTreeIntoGrid(fileSystemTree, gridConfig);

    // PHASE 1: Calculate adaptive dimensions for each cell
    let maxCellWidth = 0;
    let maxCellHeight = 0;

    gridTrees.forEach(cellTree => {
      // Skip empty cells
      if (cellTree.root.children.length === 0) {
        return;
      }

      const totalFiles = cellTree.stats.totalFiles;
      const totalDirectories = cellTree.stats.totalDirectories;

      // Calculate optimal size for this cell using adaptive sizing
      const cellDimensions = this.calculateOptimalSize(totalFiles, totalDirectories, options);

      // Track maximum dimensions needed
      maxCellWidth = Math.max(maxCellWidth, cellDimensions.width);
      maxCellHeight = Math.max(maxCellHeight, cellDimensions.height);
    });

    // PHASE 2: Calculate total grid canvas size based on uniform cell size + label space
    const ui = getUIMetadata(gridConfig.metadata);
    const cellPadding = ui?.cellPadding ?? 10;

    // Calculate label space to add to total canvas size
    const showLabels = ui?.showCellLabels ?? true;

    let labelHeight = 0;
    if (showLabels) {
      if (ui?.cellLabelHeight !== undefined) {
        // Use explicit pixel height if provided
        labelHeight = ui.cellLabelHeight;
      } else {
        // Use percentage-based height (uses default from ui-metadata)
        const heightPercent = ui?.cellLabelHeightPercent ?? 0.12;
        const calculatedHeight = maxCellHeight * heightPercent;
        // Apply reasonable bounds: min 30px
        labelHeight = Math.max(30, calculatedHeight);
      }
    }

    const totalLabelHeight = labelHeight * rows; // Labels for each row

    // Add padding equal to label height around each cell for better spacing
    const cellSpacing = labelHeight > 0 ? labelHeight : cellPadding;

    // Add outer padding around the entire grid (2x the cell spacing for good breathing room)
    const outerPadding = cellSpacing * 2;

    // For single column layouts, constrain the width to maintain a reasonable aspect ratio
    let effectiveMaxCellWidth = maxCellWidth;
    if (cols === 1) {
      // For single column, limit width to be no more than 2x the height for better proportions
      effectiveMaxCellWidth = Math.min(maxCellWidth, maxCellHeight * 2);
    }

    const totalWidth = effectiveMaxCellWidth * cols + cellSpacing * (cols + 1) + outerPadding * 2;
    const totalHeight =
      maxCellHeight * rows + cellSpacing * (rows + 1) + totalLabelHeight + outerPadding * 2;

    const allBuildings: CityBuilding[] = [];
    const allDistricts: CityDistrict[] = [];

    // PHASE 3: Build each cell using the uniform maximum dimensions
    gridTrees.forEach((cellTree, cellKey) => {
      const [row, col] = cellKey.split(',').map(Number);

      // Calculate bounds for this cell using uniform dimensions
      const cellBounds = gridManager.calculateCellBounds(
        totalWidth,
        totalHeight,
        row,
        col,
        rows,
        cols,
        cellSpacing, // Use cellSpacing which equals labelHeight when labels are shown
        gridConfig,
      );

      // Skip empty cells
      if (cellTree.root.children.length === 0) {
        return;
      }

      // Build city for this cell using the uniform maximum dimensions
      const cellOptions: TreemapOptions = {
        ...options,
        gridLayout: undefined, // Prevent recursion
      };

      // Build the city for this cell using treemap layout with explicit cell dimensions
      const cellCity = this.buildSingleCellCity(
        cellTree,
        rootPath,
        cellOptions,
        cellBounds.width,
        cellBounds.height,
      );

      // Translate all positions to the grid cell location
      cellCity.buildings.forEach(building => {
        building.position.x += cellBounds.x;
        building.position.z += cellBounds.y; // Map Y to Z for 3D visualization
      });

      cellCity.districts.forEach(district => {
        district.worldBounds.minX += cellBounds.x;
        district.worldBounds.maxX += cellBounds.x;
        district.worldBounds.minZ += cellBounds.y;
        district.worldBounds.maxZ += cellBounds.y;
      });

      // Add a cell boundary district for visual clarity (optional)
      const cellDistrict: CityDistrict = {
        path: `grid-cell-${row}-${col}`,
        worldBounds: {
          minX: cellBounds.x,
          maxX: cellBounds.x + cellBounds.width,
          minZ: cellBounds.y,
          maxZ: cellBounds.y + cellBounds.height,
        },
        fileCount: cellCity.buildings.length,
        type: 'directory',
      };

      // Add label metadata if configured (default: true unless explicitly disabled)
      const showLabels = ui?.showCellLabels !== undefined ? ui.showCellLabels : true;
      if (showLabels && cellBounds.labelBounds) {
        // Determine label text from group configuration
        let labelText = 'Misc';

        // Find the cell name for this position
        for (const [cellName, cellConfig] of Object.entries(gridConfig.referenceGroups)) {
          if (cellConfig.coordinates[0] === row && cellConfig.coordinates[1] === col) {
            labelText = cellName;
            break;
          }
        }

        cellDistrict.label = {
          text: labelText,
          bounds: {
            minX: cellBounds.labelBounds.x,
            maxX: cellBounds.labelBounds.x + cellBounds.labelBounds.width,
            minZ: cellBounds.labelBounds.y,
            maxZ: cellBounds.labelBounds.y + cellBounds.labelBounds.height,
          },
          position: (ui?.cellLabelPosition || 'top') as 'top' | 'bottom',
        };
      }

      allBuildings.push(...cellCity.buildings);
      allDistricts.push(cellDistrict, ...cellCity.districts);
    });

    // Calculate overall bounds - use the total canvas dimensions we calculated
    // This ensures the bounds include the outer padding we added
    const bounds: Bounds2D = {
      minX: 0,
      maxX: totalWidth,
      minZ: 0,
      maxZ: totalHeight,
    };

    return {
      buildings: allBuildings,
      districts: allDistricts,
      bounds,
      metadata: {
        totalFiles: allBuildings.length,
        totalDirectories: allDistricts.length,
        analyzedAt: new Date(),
        rootPath,
        layoutConfig: {
          paddingTop: options.paddingTop || 20,
          paddingBottom: options.paddingBottom || 20,
          paddingLeft: options.paddingLeft || 4,
          paddingRight: options.paddingRight || 4,
          paddingInner: options.paddingInner || 4,
          paddingOuter: options.paddingOuter || 8,
        },
      },
    };
  }

  /**
   * Build city for a single grid cell using treemap layout
   * This is the core treemap implementation without grid splitting
   *
   * Results are cached based on file tree identity and layout options.
   * Cache hits skip the expensive D3 treemap computation entirely.
   *
   * @param explicitWidth - Optional explicit width to use instead of calculating
   * @param explicitHeight - Optional explicit height to use instead of calculating
   */
  private buildSingleCellCity(
    fileSystemTree: FileSystemTree,
    rootPath: string = '',
    options: TreemapOptions = {},
    explicitWidth?: number,
    explicitHeight?: number,
  ): CityData {
    // Check cache first
    const cacheKey = this.generateCacheKey(fileSystemTree, rootPath, options);
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const {
      padding = 4,
      paddingOuter = 8,
      paddingTop = 20,
      paddingBottom = 20,
      paddingLeft = 4,
      paddingRight = 4,
      paddingInner = 4,
      round = true,
      tile = treemapSquarify,
    } = options;

    // Use explicit dimensions if provided (for grid cells), otherwise calculate adaptive dimensions
    let width: number;
    let height: number;

    if (explicitWidth !== undefined && explicitHeight !== undefined) {
      width = explicitWidth;
      height = explicitHeight;
    } else {
      const totalFiles = fileSystemTree.stats.totalFiles;
      const totalDirectories = fileSystemTree.stats.totalDirectories;

      const sizeResult = this.calculateOptimalSize(totalFiles, totalDirectories, options);

      width = sizeResult.width;
      height = sizeResult.height;
    }

    const buildings: CityBuilding[] = [];
    const districts: CityDistrict[] = [];

    // Step 1: Convert FileSystemTree to D3 hierarchy format
    const hierarchyData = this.convertToD3Hierarchy(fileSystemTree.root);

    // Step 2: Deep nesting handling - DISABLED (see comments in original implementation)
    const processedHierarchyData = hierarchyData;

    // Step 3: Create D3 hierarchy and calculate file counts
    const hierarchyRoot = hierarchy<D3HierarchyData>(processedHierarchyData)
      .sum(d => {
        if (d.type === 'file') {
          return d.weight || 1;
        }
        if (d.type === 'directory') {
          // Directories should not take space themselves - only their file children should
          // Previously set to 1, but this created empty space at every directory level
          return 0;
        }
        return 0;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Step 4: Create D3 treemap layout
    const treemapLayout = treemap<D3HierarchyData>()
      .size([width, height])
      .padding(padding)
      .paddingOuter(paddingOuter)
      .paddingTop(paddingTop)
      .paddingBottom(paddingBottom)
      .paddingLeft(paddingLeft)
      .paddingRight(paddingRight)
      .paddingInner(paddingInner)
      .tile(tile)
      .round(round);

    // Step 5: Apply treemap layout
    const root = treemapLayout(hierarchyRoot);

    // Step 6: Convert D3 treemap nodes back to districts and buildings
    this.convertD3TreemapToCityData(root, districts, buildings, rootPath);

    // Calculate overall bounds
    const bounds = this.calculateBounds(buildings, districts);

    // Post-process buildings to enforce minimum sizes for deeply nested items
    const finalBuildings = this.enforceMinimumBuildingSizes(buildings, options);

    const result: CityData = {
      buildings: finalBuildings,
      districts,
      bounds,
      metadata: {
        totalFiles: fileSystemTree.stats.totalFiles,
        totalDirectories: fileSystemTree.stats.totalDirectories,
        analyzedAt: new Date(),
        rootPath,
        layoutConfig: {
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
          paddingInner,
          paddingOuter,
        },
      },
    };

    // Cache the result before returning
    this.setCached(cacheKey, result);

    return result;
  }

  /**
   * Convert FileSystemTree format to D3 hierarchy format
   *
   * D3 expects a specific hierarchy structure with name, children, and value properties.
   * This method recursively transforms our FileSystemTree into that format.
   */
  private convertToD3Hierarchy(directory: DirectoryInfo): D3HierarchyData {
    const children: D3HierarchyData[] = [];

    // Sort children using configured sort functions
    const sortedChildren = [...directory.children];

    // Add subdirectories
    sortedChildren.forEach(child => {
      if ('children' in child) {
        // It's a directory
        const subdir = child as DirectoryInfo;
        children.push(this.convertToD3Hierarchy(subdir));
      } else {
        // It's a file
        const file = child as FileInfo;

        children.push({
          name: file.name,
          relativePath: file.relativePath,
          type: 'file',
          size: file.size,
          extension: file.extension,
          lastModified: file.lastModified,
        });
      }
    });

    return {
      name: directory.name,
      relativePath: directory.relativePath,
      type: 'directory',
      fileCount: directory.fileCount,
      totalSize: directory.totalSize,
      children: children.length > 0 ? children : undefined,
    };
  }

  /**
   * Convert D3 treemap layout results back to our CityData format
   *
   * This method traverses the D3 treemap result and creates districts for directories
   * and buildings for files, using the calculated rectangle positions and sizes.
   */
  private convertD3TreemapToCityData(
    node: HierarchyRectangularNode<D3HierarchyData>,
    districts: CityDistrict[],
    buildings: CityBuilding[],
    rootPath: string,
    depth: number = 0,
    parentPath: string = '',
  ): void {
    const data = node.data;

    if (data.type === 'file') {
      // Create building for file using the data's relativePath
      const building = this.createBuildingFromD3Node(node, data, rootPath);
      buildings.push(building);
    } else if (data.type === 'directory') {
      // Always create district for directory, even if it has no direct area allocated
      // This ensures directories containing only subdirectories are still rendered
      const hasArea = (node.x1 || 0) > (node.x0 || 0) && (node.y1 || 0) > (node.y0 || 0);
      const hasChildren = node.children && node.children.length > 0;

      // Create district if it has area OR if it has children (subdirectories/files)
      if (hasArea || hasChildren) {
        // Use the relativePath from the data
        let fullPath: string;
        if (depth === 0) {
          // Root directory - use the root path or empty for relative trees
          fullPath = rootPath.startsWith('/') ? rootPath.substring(1) : rootPath;
        } else {
          // Child directory - construct path properly
          const cleanRoot = rootPath.startsWith('/') ? rootPath.substring(1) : rootPath;
          if (cleanRoot === '' || cleanRoot === '.') {
            // For relative path trees, use relativePath directly
            fullPath = data.relativePath || data.name;
          } else {
            // For rooted trees, prefix with root
            fullPath = `${cleanRoot}/${data.relativePath}`;
          }
        }

        // Remove any incorrect prefix like "PrincipleMD/"
        if (fullPath.startsWith('PrincipleMD/')) {
          console.warn('⚠️ Removing incorrect PrincipleMD prefix from district path:', fullPath);
          fullPath = fullPath.substring('PrincipleMD/'.length);
        }

        // For directories without area, compute bounds from children
        let bounds = {
          minX: node.x0 || 0,
          maxX: node.x1 || 0,
          minZ: node.y0 || 0,
          maxZ: node.y1 || 0,
        };

        // If no area allocated but has children, compute bounds from children
        if (!hasArea && hasChildren) {
          const childBounds = this.computeBoundsFromChildren(node);
          if (childBounds) {
            bounds = childBounds;
          }
        }

        // Calculate actual file count (direct files in this directory only)
        const directFileCount = node.children
          ? node.children.filter(child => child.data.type === 'file').length
          : 0;

        const district: CityDistrict = {
          path: fullPath,
          worldBounds: bounds,
          fileCount: directFileCount, // Direct files only, not D3 sum
          type: 'directory',
        };

        districts.push(district);
      }
    }

    // Recursively process children
    if (node.children) {
      // Pass the current node's path as parent path for children
      const currentPath =
        data.type === 'directory' ? data.relativePath || data.name || '' : parentPath;
      node.children.forEach(child => {
        this.convertD3TreemapToCityData(
          child,
          districts,
          buildings,
          rootPath,
          depth + 1,
          currentPath,
        );
      });
    }
  }

  /**
   * Create a building from D3 treemap node data
   *
   * Buildings are positioned at the center of their allocated treemap rectangle,
   * with dimensions that fill the rectangle and height based on file size.
   *
   * UPDATED: Use D3's built-in padding system for proper space management
   * instead of manual post-processing adjustments.
   */
  private createBuildingFromD3Node(
    node: HierarchyRectangularNode<D3HierarchyData>,
    fileData: D3HierarchyData,
    rootPath: string = '',
  ): CityBuilding {
    // Calculate building dimensions from treemap rectangle
    const rawWidth = (node.x1 || 0) - (node.x0 || 0);
    const rawDepth = (node.y1 || 0) - (node.y0 || 0);

    // SIMPLIFIED: D3 treemap now handles padding and label space properly
    // Apply minimal padding to prevent buildings from exactly touching district edges
    const paddingFactor = 0.95; // Slight reduction for visual separation

    const width = Math.max(1, rawWidth * paddingFactor);
    const depth = Math.max(1, rawDepth * paddingFactor);

    // Calculate center position - treemap already accounts for label space
    const centerX = (node.x0 || 0) + rawWidth / 2;
    const centerZ = (node.y0 || 0) + rawDepth / 2;

    // Calculate building height based on file size (normalized)
    const sizeRatio = Math.min((fileData.size || 0) / 10000, 1); // Normalize to 10KB max
    const buildingHeight =
      this.minBuildingSize + sizeRatio * (this.maxBuildingSize - this.minBuildingSize);

    // Use the relativePath from fileData with the root prefix
    const cleanRoot = rootPath.startsWith('/') ? rootPath.substring(1) : rootPath;
    let fullFilePath: string;
    if (cleanRoot === '' || cleanRoot === '.') {
      // For relative path trees, use relativePath directly
      fullFilePath = fileData.relativePath || fileData.name;
    } else {
      // For rooted trees, prefix with root
      fullFilePath = `${cleanRoot}/${fileData.relativePath}`;
    }

    return {
      path: fullFilePath,
      position: { x: centerX, y: buildingHeight / 2, z: centerZ },
      dimensions: [width, buildingHeight, depth], // [width, height, depth]
      type: 'file',
      // Removed color property to allow theme system to work
      size: fileData.size,
      fileExtension: fileData.extension,
      lastModified: fileData.lastModified,
    };
  }

  /**
   * Compute bounds from children nodes when a directory has no allocated area
   */
  private computeBoundsFromChildren(node: HierarchyRectangularNode<D3HierarchyData>): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null {
    if (!node.children || node.children.length === 0) {
      return null;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Recursively compute bounds from all descendant nodes that have area
    const computeBounds = (n: HierarchyRectangularNode<D3HierarchyData>) => {
      // Check if this node has area
      if (n.x0 !== undefined && n.x1 !== undefined && n.y0 !== undefined && n.y1 !== undefined) {
        const hasArea = (n.x1 || 0) > (n.x0 || 0) && (n.y1 || 0) > (n.y0 || 0);
        if (hasArea) {
          minX = Math.min(minX, n.x0 || 0);
          maxX = Math.max(maxX, n.x1 || 0);
          minZ = Math.min(minZ, n.y0 || 0);
          maxZ = Math.max(maxZ, n.y1 || 0);
        }
      }

      // Recursively check children
      if (n.children) {
        n.children.forEach(child => computeBounds(child));
      }
    };

    // Start computing from children
    node.children.forEach(child => computeBounds(child));

    // Return null if no bounds were found
    if (minX === Infinity || maxX === -Infinity || minZ === Infinity || maxZ === -Infinity) {
      return null;
    }

    return { minX, maxX, minZ, maxZ };
  }

  // Removed color-related methods:
  // - generateLegend: Legends should be handled in the React layer
  // - updateBuildingTypeDistribution: Type distribution for colors not needed in builder
  // - updateColorConfig: Color configuration belongs in presentation layer
  // - getDistrictColor: Colors should be determined by React components
  // - getBuildingColor: Colors should be determined by React components

  /**
   * Calculate overall bounds of the city
   *
   * This determines the total area covered by all districts and buildings
   * for camera positioning and viewport calculations.
   */
  private calculateBounds(buildings: CityBuilding[], districts: CityDistrict[]): Bounds2D {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Check building bounds
    buildings.forEach(building => {
      const halfWidth = building.dimensions[0] / 2;
      const halfDepth = building.dimensions[2] / 2;

      minX = Math.min(minX, building.position.x - halfWidth);
      maxX = Math.max(maxX, building.position.x + halfWidth);
      minZ = Math.min(minZ, building.position.z - halfDepth);
      maxZ = Math.max(maxZ, building.position.z + halfDepth);
    });

    // Check district bounds
    districts.forEach(district => {
      minX = Math.min(minX, district.worldBounds.minX);
      maxX = Math.max(maxX, district.worldBounds.maxX);
      minZ = Math.min(minZ, district.worldBounds.minZ);
      maxZ = Math.max(maxZ, district.worldBounds.maxZ);
    });

    // Fallback if no items
    if (buildings.length === 0 && districts.length === 0) {
      return { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
    }

    return { minX, maxX, minZ, maxZ };
  }
}
