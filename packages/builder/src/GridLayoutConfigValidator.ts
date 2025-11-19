import { CodebaseView } from '@principal-ai/alexandria-core-library';

import { getUIMetadata } from './types/ui-metadata';

import { GridLayoutManager } from './GridLayoutManager';

export interface GridConfigValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  details?: unknown;
}

export interface GridConfigValidationReport {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: GridConfigValidationIssue[];
  suggestions: string[];
}

/**
 * Validates a CodebaseView to ensure it's properly formed and usable
 */
export function validateCodebaseViewConfig(config: CodebaseView): GridConfigValidationReport {
  const issues: GridConfigValidationIssue[] = [];
  const suggestions: string[] = [];

  // Check if config exists
  if (!config) {
    issues.push({
      code: 'config.missing',
      severity: 'error',
      message: 'Configuration is missing or undefined',
    });
    return createReport(issues, suggestions);
  }

  // Validate required fields for CodebaseView
  if (!config.id || typeof config.id !== 'string' || config.id.trim() === '') {
    issues.push({
      code: 'config.id.missing',
      severity: 'error',
      message: 'id is required and must be a non-empty string',
      field: 'id',
    });
  }

  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    issues.push({
      code: 'config.name.missing',
      severity: 'error',
      message: 'name is required and must be a non-empty string',
      field: 'name',
    });
  }

  // Version is optional - will default to latest if not provided
  if (
    config.version !== undefined &&
    (typeof config.version !== 'string' || config.version.trim() === '')
  ) {
    issues.push({
      code: 'config.version.invalid',
      severity: 'warning',
      message: 'version should be a non-empty string when provided (e.g., "1.0.0")',
      field: 'version',
    });
  }

  // Validate UI metadata
  const ui = getUIMetadata(config.metadata);
  if (ui && typeof ui.enabled !== 'boolean') {
    issues.push({
      code: 'config.metadata.ui.enabled.invalid',
      severity: 'error',
      message: 'metadata.ui.enabled must be a boolean value',
      field: 'metadata.ui.enabled',
    });
  }

  // Get actual grid dimensions (computed if not specified)
  const gridManager = new GridLayoutManager();
  const { rows, cols } = gridManager.getGridDimensions(config);

  // Validate grid dimensions (now using computed values)
  if (config.rows !== undefined && (!Number.isInteger(config.rows) || config.rows < 1)) {
    issues.push({
      code: 'config.rows.invalid',
      severity: 'error',
      message: 'rows must be a positive integer',
      field: 'rows',
      details: { value: config.rows },
    });
  } else if (rows > 10) {
    issues.push({
      code: 'config.rows.large',
      severity: 'warning',
      message: `Grid has ${rows} rows, which may be difficult to visualize`,
      field: 'rows',
    });
    suggestions.push('Consider using fewer rows (recommended: 1-6) for better visualization');
  }

  if (config.cols !== undefined && (!Number.isInteger(config.cols) || config.cols < 1)) {
    issues.push({
      code: 'config.cols.invalid',
      severity: 'error',
      message: 'cols must be a positive integer',
      field: 'cols',
      details: { value: config.cols },
    });
  } else if (cols > 10) {
    issues.push({
      code: 'config.cols.large',
      severity: 'warning',
      message: `Grid has ${cols} columns, which may be difficult to visualize`,
      field: 'cols',
    });
    suggestions.push('Consider using fewer columns (recommended: 1-6) for better visualization');
  }

  // Validate cells
  if (!config.referenceGroups || typeof config.referenceGroups !== 'object') {
    issues.push({
      code: 'config.referenceGroups.missing',
      severity: 'error',
      message: 'cells must be an object',
      field: 'cells',
    });
  } else {
    const cellsUsed = new Set<string>();
    const cellNames = Object.keys(config.referenceGroups);

    // Check for empty cells
    const ui = getUIMetadata(config.metadata);
    if (cellNames.length === 0 && ui?.enabled) {
      issues.push({
        code: 'config.referenceGroups.empty',
        severity: 'warning',
        message: 'No cells defined for enabled grid configuration',
        field: 'cells',
      });
      suggestions.push('Add cells to organize your codebase into grid cells');
    }

    // Validate each cell
    cellNames.forEach(cellName => {
      const cell = config.referenceGroups[cellName];

      if (!cell) {
        issues.push({
          code: 'cell.undefined',
          severity: 'error',
          message: `Cell "${cellName}" is undefined`,
          field: `cells.${cellName}`,
        });
        return;
      }

      // Validate cell name
      if (!cellName || cellName.trim() === '') {
        issues.push({
          code: 'cell.name.empty',
          severity: 'error',
          message: 'Cell name cannot be empty',
          field: `cells.${cellName}`,
        });
      }

      // Validate files
      if (!cell.files || !Array.isArray(cell.files)) {
        issues.push({
          code: 'cell.files.missing',
          severity: 'error',
          message: `Cell "${cellName}" must have a files array`,
          field: `cells.${cellName}.files`,
        });
      } else if (cell.files.length === 0) {
        issues.push({
          code: 'cell.files.empty',
          severity: 'warning',
          message: `Cell "${cellName}" has empty files array`,
          field: `cells.${cellName}.files`,
        });
      }

      // Validate cell position
      if (!Array.isArray(cell.coordinates) || cell.coordinates.length !== 2) {
        issues.push({
          code: 'cell.coordinates.invalid',
          severity: 'error',
          message: `Cell "${cellName}" must have a coordinates array with [row, col]`,
          field: `cells.${cellName}.coordinates`,
        });
      } else {
        const [row, col] = cell.coordinates;

        if (!Number.isInteger(row) || !Number.isInteger(col)) {
          issues.push({
            code: 'cell.coordinates.notInteger',
            severity: 'error',
            message: `Cell "${cellName}" coordinates must be integers`,
            field: `cells.${cellName}.coordinates`,
            details: { coordinates: cell.coordinates },
          });
        } else if (row < 0 || col < 0) {
          issues.push({
            code: 'cell.coordinates.negative',
            severity: 'error',
            message: `Cell "${cellName}" coordinates cannot be negative`,
            field: `cells.${cellName}.coordinates`,
            details: { coordinates: cell.coordinates },
          });
        } else if (row >= rows || col >= cols) {
          issues.push({
            code: 'cell.coordinates.outOfBounds',
            severity: 'error',
            message: `Cell "${cellName}" coordinates [${row},${col}] are outside grid bounds [${rows}x${cols}]`,
            field: `cells.${cellName}.coordinates`,
          });
        } else {
          // Check for duplicate cell usage
          const cellKey = `${row},${col}`;
          if (cellsUsed.has(cellKey)) {
            issues.push({
              code: 'cell.coordinates.duplicate',
              severity: 'warning',
              message: `Multiple cells assigned to position [${row},${col}]`,
              field: `cells.${cellName}.coordinates`,
              details: { cellKey },
            });
            suggestions.push(
              `Consider using priority values to control which cell takes precedence at position [${row},${col}]`,
            );
          }
          cellsUsed.add(cellKey);
        }
      }

      // Validate priority
      if (cell.priority !== undefined && !Number.isFinite(cell.priority)) {
        issues.push({
          code: 'cell.priority.invalid',
          severity: 'warning',
          message: `Cell "${cellName}" priority must be a number`,
          field: `cells.${cellName}.priority`,
        });
      }

      // Validate color (check both UI extension format and metadata format)
      const cellAsUIType = cell as { color?: unknown };
      const colorFromUI = cellAsUIType.color;
      const colorFromMetadata = (cell.metadata as { ui?: { color?: unknown } } | undefined)?.ui?.color;
      const actualColor = colorFromUI || colorFromMetadata;

      if (actualColor !== undefined) {
        if (typeof actualColor !== 'string') {
          issues.push({
            code: 'cell.color.invalid',
            severity: 'warning',
            message: `Cell "${cellName}" color must be a string`,
            field: `cells.${cellName}.color`,
          });
        } else if (!isValidColor(actualColor)) {
          issues.push({
            code: 'cell.color.format',
            severity: 'warning',
            message: `Cell "${cellName}" color "${actualColor}" may not be a valid color format`,
            field: `cells.${cellName}.color`,
          });
          suggestions.push(
            `Use hex colors (#RRGGBB), RGB(r,g,b), or CSS color names for "${cellName}"`,
          );
        }
      }
    });

    // Check for unused cells (info only)
    const totalCells = rows * cols;
    const usedCells = cellsUsed.size;
    const uiConfig = getUIMetadata(config.metadata);
    if (usedCells < totalCells && uiConfig?.enabled) {
      issues.push({
        code: 'grid.cells.unused',
        severity: 'info',
        message: `${totalCells - usedCells} of ${totalCells} cells are not assigned`,
        details: { usedCells, totalCells },
      });
      suggestions.push('Files not explicitly listed in any cell will not be included in the grid');
    }
  }

  // Validate optional settings in metadata.ui
  const uiMetadata = getUIMetadata(config.metadata);

  if (uiMetadata?.cellPadding !== undefined) {
    if (!Number.isFinite(uiMetadata.cellPadding) || uiMetadata.cellPadding < 0) {
      issues.push({
        code: 'config.cellPadding.invalid',
        severity: 'warning',
        message: 'cellPadding must be a non-negative number',
        field: 'metadata.ui.cellPadding',
      });
    }
  }

  if (uiMetadata?.cellLabelPosition !== undefined) {
    const validPositions = ['none', 'top', 'bottom'];
    if (!validPositions.includes(uiMetadata.cellLabelPosition)) {
      issues.push({
        code: 'config.cellLabelPosition.invalid',
        severity: 'warning',
        message: `cellLabelPosition must be one of: ${validPositions.join(', ')}`,
        field: 'metadata.ui.cellLabelPosition',
      });
    }
  }

  if (uiMetadata?.cellLabelHeightPercent !== undefined) {
    if (
      !Number.isFinite(uiMetadata.cellLabelHeightPercent) ||
      uiMetadata.cellLabelHeightPercent < 0 ||
      uiMetadata.cellLabelHeightPercent > 1
    ) {
      issues.push({
        code: 'config.cellLabelHeightPercent.invalid',
        severity: 'warning',
        message: 'cellLabelHeightPercent must be between 0 and 1',
        field: 'metadata.ui.cellLabelHeightPercent',
        details: { value: uiMetadata.cellLabelHeightPercent },
      });
    }
  }

  return createReport(issues, suggestions);
}

/**
 * Helper function to validate color format
 */
function isValidColor(color: string): boolean {
  // Basic validation for common color formats
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i;
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i;

  // CSS color names (subset of common ones)
  const cssColors = [
    'red',
    'green',
    'blue',
    'yellow',
    'orange',
    'purple',
    'pink',
    'black',
    'white',
    'gray',
    'grey',
    'brown',
    'cyan',
    'magenta',
  ];

  return (
    hexPattern.test(color) ||
    rgbPattern.test(color) ||
    rgbaPattern.test(color) ||
    cssColors.includes(color.toLowerCase())
  );
}

/**
 * Create the validation report from issues and suggestions
 */
function createReport(
  issues: GridConfigValidationIssue[],
  suggestions: string[],
): GridConfigValidationReport {
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return {
    valid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
    suggestions: [...new Set(suggestions)], // Remove duplicates
  };
}

/**
 * Auto-fix common issues in a GridLayoutConfig
 */
export function autoFixGridConfig(config: CodebaseView): CodebaseView {
  const fixed = { ...config };

  // Ensure required fields exist
  if (!fixed.overviewPath) {
    fixed.overviewPath = 'README.md'; // Add default overview path
  }

  // Ensure metadata.ui exists and is enabled
  if (!fixed.metadata) {
    fixed.metadata = {};
  }
  if (!fixed.metadata.ui) {
    fixed.metadata.ui = { enabled: true };
  }
  if (typeof fixed.metadata.ui.enabled !== 'boolean') {
    fixed.metadata.ui.enabled = true;
  }

  // Only validate rows/cols if explicitly provided
  if (fixed.rows !== undefined && (!Number.isInteger(fixed.rows) || fixed.rows < 1)) {
    fixed.rows = 1;
  }

  if (fixed.cols !== undefined && (!Number.isInteger(fixed.cols) || fixed.cols < 1)) {
    fixed.cols = 1;
  }

  if (!fixed.referenceGroups || typeof fixed.referenceGroups !== 'object') {
    fixed.referenceGroups = {};
  }

  // Compute actual dimensions for clamping cell coordinates
  const gridManager = new GridLayoutManager();
  const { rows: actualRows, cols: actualCols } = gridManager.getGridDimensions(fixed);

  // Fix each cell
  Object.keys(fixed.referenceGroups).forEach(cellName => {
    const cell = fixed.referenceGroups[cellName];

    // Ensure cell is valid
    if (!Array.isArray(cell.coordinates) || cell.coordinates.length !== 2) {
      cell.coordinates = [0, 0];
    } else {
      // Clamp cell values to grid bounds
      const [row, col] = cell.coordinates;
      cell.coordinates = [
        Math.max(0, Math.min(row, actualRows - 1)),
        Math.max(0, Math.min(col, actualCols - 1)),
      ];
    }

    // Ensure files exist
    if (!cell.files) {
      cell.files = [];
    }
  });

  // Fix optional settings in metadata.ui
  if (fixed.metadata?.ui) {
    const ui = fixed.metadata.ui as { cellPadding?: number };
    if (ui.cellPadding !== undefined && ui.cellPadding < 0) {
      ui.cellPadding = 0;
    }
  }

  return fixed;
}
