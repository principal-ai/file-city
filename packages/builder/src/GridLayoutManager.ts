import { FileTree, DirectoryInfo, FileInfo } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';

import { getUIMetadata } from './types/ui-metadata';

/**
 * Manages grid-based spatial layout for city visualization
 */
export class GridLayoutManager {
  // Cache compiled pattern matchers for performance

  /**
   * Get the grid dimensions for a codebase view config.
   * If rows/cols are not specified, compute them from cell coordinates.
   */
  public getGridDimensions(config: CodebaseView): { rows: number; cols: number } {
    const ui = getUIMetadata(config.metadata);

    if (ui?.rows !== undefined && ui?.cols !== undefined) {
      return { rows: ui.rows, cols: ui.cols };
    }

    // Compute dimensions from cell coordinates
    let maxRow = 0;
    let maxCol = 0;

    for (const cell of Object.values(config.cells)) {
      const [row, col] = cell.coordinates;
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
    }

    return {
      rows: ui?.rows ?? maxRow + 1,
      cols: ui?.cols ?? maxCol + 1,
    };
  }
  /**
   * Split a file tree into a grid of smaller trees based on configuration
   */
  public splitTreeIntoGrid(fileTree: FileTree, config: CodebaseView): Map<string, FileTree> {
    const grid = new Map<string, FileTree>();
    const { rows, cols } = this.getGridDimensions(config);

    // Initialize empty cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const key = `${row},${col}`;
        grid.set(key, this.createEmptyFileTree());
      }
    }

    // Track which items have been assigned
    const assignedItems = new Set<string>();

    // Assign directories to their target cells, considering priority
    const cellAssignments = this.assignDirectoriesToCells(fileTree.root, config, assignedItems);

    // Place assigned directories into their cells
    cellAssignments.forEach((items, cellKey) => {
      const cellTree = grid.get(cellKey);
      if (cellTree) {
        cellTree.root.children = items;
        this.updateTreeStats(cellTree);
      }
    });

    // Files not matching any cell patterns are not included in the grid

    return grid;
  }

  /**
   * Calculate the bounds for a specific cell in the grid
   */
  public calculateCellBounds(
    totalWidth: number,
    totalHeight: number,
    row: number,
    col: number,
    rows: number,
    cols: number,
    padding: number = 0,
    config?: CodebaseView,
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    labelBounds?: { x: number; y: number; width: number; height: number };
  } {
    // Calculate label space if configured (uses defaults from getUIMetadata)
    const ui = config ? getUIMetadata(config.metadata) : getUIMetadata(undefined);
    const showLabels = ui?.showCellLabels ?? true;

    let labelHeight = 0;

    // Calculate the base cell dimensions (content area without labels)
    // The totalHeight formula from CodeCityBuilderWithGrid is:
    // totalHeight = (maxCellHeight * rows) + (cellSpacing * (rows + 1)) + (labelHeight * rows) + (outerPadding * 2)
    // where cellSpacing = labelHeight when labels shown, and outerPadding = cellSpacing * 2

    let baseCellHeight = 0;
    let cellSpacing = padding; // Will be updated if labels are shown
    let outerPadding = padding * 2; // Outer padding around entire grid

    if (showLabels) {
      if (ui?.cellLabelHeight !== undefined) {
        // Use explicit pixel height if provided
        labelHeight = ui.cellLabelHeight;
        cellSpacing = labelHeight; // Use label height as spacing
        outerPadding = cellSpacing * 2; // Outer padding is 2x cell spacing
        // totalHeight = (baseCellHeight * rows) + (cellSpacing * (rows + 1)) + (labelHeight * rows) + (outerPadding * 2)
        // totalHeight = (baseCellHeight * rows) + (labelHeight * (rows + 1)) + (labelHeight * rows) + (labelHeight * 4)
        // totalHeight = (baseCellHeight * rows) + (labelHeight * (2 * rows + 5))
        // baseCellHeight = (totalHeight - labelHeight * (2 * rows + 5)) / rows
        baseCellHeight = Math.max(0, (totalHeight - labelHeight * (2 * rows + 5)) / rows);
      } else {
        // Calculate label height based on percentage of base cell height
        // Note: CodeCityBuilderWithGrid uses 0.15 (15%) as default, with min 30px
        const heightPercent = ui?.cellLabelHeightPercent || 0.15;
        const minLabelHeight = 30;

        // First, calculate assuming percentage-based label
        // totalHeight = baseCellHeight * rows + baseCellHeight * heightPercent * (2 * rows + 5)
        // totalHeight = baseCellHeight * (rows + heightPercent * (2 * rows + 5))
        const tentativeBaseCellHeight = totalHeight / (rows + heightPercent * (2 * rows + 5));
        const tentativeLabelHeight = tentativeBaseCellHeight * heightPercent;

        if (tentativeLabelHeight >= minLabelHeight) {
          // Percentage-based calculation works
          baseCellHeight = tentativeBaseCellHeight;
          labelHeight = tentativeLabelHeight;
          cellSpacing = labelHeight;
          outerPadding = cellSpacing * 2;
        } else {
          // Need to use minimum label height
          labelHeight = minLabelHeight;
          cellSpacing = labelHeight;
          outerPadding = cellSpacing * 2;
          // Recalculate base cell height with fixed label
          baseCellHeight = Math.max(0, (totalHeight - labelHeight * (2 * rows + 5)) / rows);
        }
      }
    } else {
      // No labels, so use the full height minus padding and outer padding
      outerPadding = padding * 2;
      const totalPadding = padding * (rows + 1) + outerPadding * 2;
      baseCellHeight = (totalHeight - totalPadding) / rows;
      cellSpacing = padding;
    }

    // The cell content height is the base cell height
    const cellHeight = baseCellHeight;

    const labelPosition = ui?.cellLabelPosition || (showLabels ? 'top' : 'none');

    // Calculate Y position for this row (add outer padding offset)
    // Each row takes up (cellHeight + labelHeight) plus cellSpacing
    const rowY = outerPadding + row * (cellHeight + labelHeight) + (row + 1) * cellSpacing;

    let contentY = rowY;
    let contentHeight = cellHeight;
    let labelBounds = undefined;

    if (labelHeight > 0 && labelPosition !== 'none') {
      // Reserve space for label at the top of the cell
      if (labelPosition === 'top') {
        // Calculate X position with cellSpacing and outer padding
        const adjustedCellWidth = (totalWidth - outerPadding * 2 - cellSpacing * (cols + 1)) / cols;
        const colX = outerPadding + col * adjustedCellWidth + (col + 1) * cellSpacing;

        labelBounds = {
          x: colX,
          y: rowY,
          width: adjustedCellWidth,
          height: labelHeight,
        };
        // Move content down to make room for label
        contentY = rowY + labelHeight;
        contentHeight = cellHeight;
      } else if (labelPosition === 'bottom') {
        // Content comes first, then label
        contentY = rowY;
        contentHeight = cellHeight;
        // Calculate X position with cellSpacing and outer padding
        const adjustedCellWidth = (totalWidth - outerPadding * 2 - cellSpacing * (cols + 1)) / cols;
        const colX = outerPadding + col * adjustedCellWidth + (col + 1) * cellSpacing;

        labelBounds = {
          x: colX,
          y: rowY + cellHeight,
          width: adjustedCellWidth,
          height: labelHeight,
        };
      }
    }

    // Calculate final position with cellSpacing and outer padding
    const adjustedCellWidth = (totalWidth - outerPadding * 2 - cellSpacing * (cols + 1)) / cols;
    const colX = outerPadding + col * adjustedCellWidth + (col + 1) * cellSpacing;

    return {
      x: colX,
      y: contentY,
      width: adjustedCellWidth,
      height: contentHeight,
      labelBounds,
    };
  }

  /**
   * Assign directories to cells based on cell configuration
   */
  private assignDirectoriesToCells(
    root: DirectoryInfo,
    config: CodebaseView,
    assignedItems: Set<string>,
  ): Map<string, (DirectoryInfo | FileInfo)[]> {
    const cellAssignments = new Map<string, (DirectoryInfo | FileInfo)[]>();

    // Sort cells by priority (higher priority first)
    const sortedCells = Object.entries(config.cells).sort((a, b) => {
      const priorityA = a[1].priority || 0;
      const priorityB = b[1].priority || 0;
      return priorityB - priorityA;
    });

    // Collect all items with their paths for matching
    const allItemsWithPaths = this.collectAllItemsWithPaths(root);

    // Process each cell
    for (const [_cellName, cellConfig] of sortedCells) {
      const cellKey = `${cellConfig.coordinates[0]},${cellConfig.coordinates[1]}`;

      if (!cellAssignments.has(cellKey)) {
        cellAssignments.set(cellKey, []);
      }

      const cellItems = cellAssignments.get(cellKey)!;

      // Find matching items using their full paths
      for (const { item, path } of allItemsWithPaths) {
        // Skip if already assigned
        if (assignedItems.has(path)) {
          continue;
        }

        // Check if item is in the cell's file list
        const matches = cellConfig.files && cellConfig.files.includes(path);

        if (matches) {
          cellItems.push(item);
          assignedItems.add(path);

          // If this is a directory, mark all descendants as assigned
          // This prevents them from being added as unassigned items
          if ('children' in item) {
            const markDescendantsAssigned = (
              node: DirectoryInfo | FileInfo,
              parentPath: string,
            ): void => {
              const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
              assignedItems.add(nodePath);
              if ('children' in node) {
                for (const child of node.children) {
                  markDescendantsAssigned(child, nodePath);
                }
              }
            };

            // Mark all children (but not the item itself, it's already marked)
            for (const child of item.children) {
              markDescendantsAssigned(child, path);
            }
          }
        }
      }
    }

    return cellAssignments;
  }

  /**
   * Recursively collect all items with their relative paths
   */
  private collectAllItemsWithPaths(
    node: DirectoryInfo | FileInfo,
    basePath: string = '',
  ): Array<{ item: DirectoryInfo | FileInfo; path: string }> {
    const results: Array<{ item: DirectoryInfo | FileInfo; path: string }> = [];

    // For the root node, just process its children
    if (basePath === '' && node.name === 'root') {
      if ('children' in node) {
        for (const child of node.children) {
          results.push(...this.collectAllItemsWithPaths(child, ''));
        }
      }
      return results;
    }

    const currentPath = basePath ? `${basePath}/${node.name}` : node.name;

    // Add current item
    results.push({ item: node, path: currentPath });

    // Recursively collect children if it's a directory
    if ('children' in node) {
      for (const child of node.children) {
        results.push(...this.collectAllItemsWithPaths(child, currentPath));
      }
    }

    return results;
  }

  /**
   * Create an empty file tree
   */
  private createEmptyFileTree(): FileTree {
    const root: DirectoryInfo = {
      name: 'cell-root',
      path: '',
      relativePath: '',
      children: [],
      fileCount: 0,
      totalSize: 0,
      depth: 0,
    };

    return {
      root,
      stats: {
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        maxDepth: 0,
        buildingTypeDistribution: {},
        directoryTypeDistribution: {},
        combinedTypeDistribution: {},
      },
      allFiles: [],
      allDirectories: [],
      sha: '',
    };
  }

  /**
   * Update statistics for a file tree
   */
  private updateTreeStats(tree: FileTree): void {
    const stats = {
      totalFiles: 0,
      totalDirectories: 0,
      totalSize: 0,
      maxDepth: 0,
    };

    this.calculateStats(tree.root, stats, 0);

    tree.stats = {
      ...tree.stats,
      ...stats,
    };
  }

  /**
   * Recursively calculate statistics for a directory
   */
  private calculateStats(
    node: DirectoryInfo | FileInfo,
    stats: {
      totalFiles: number;
      totalDirectories: number;
      totalSize: number;
      maxDepth: number;
    },
    depth: number,
  ): void {
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if ('children' in node) {
      // It's a directory
      stats.totalDirectories++;
      for (const child of node.children) {
        this.calculateStats(child, stats, depth + 1);
      }
    } else {
      // It's a file
      stats.totalFiles++;
      stats.totalSize += node.size || 0;
    }
  }
}
