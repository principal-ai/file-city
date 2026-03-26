import { CanvasRenderingContext2D } from 'canvas';
import { BuildingTypeResolver } from '../types/buildingTypes';
import { CityBuilding, CityDistrict } from '@principal-ai/file-city-builder';
import { ImportanceConfig, DEFAULT_VISUAL_SETTINGS } from '../types/importanceTypes';
import { ColorTheme, ColorFunction } from '../types/themes';
import { calculateImportance, getStarCount, shouldShowImportance } from '../utils/importanceUtils';
export enum RenderMode {
  HIGHLIGHT = 'highlight',
  ISOLATE = 'isolate',
}
// Helper functions for drawing

/**
 * Draw a star at the given position
 */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = '#FFD700',
  strokeColor: string = '#FFB000',
  glow: boolean = true,
) {
  ctx.save();

  // Position and scale
  ctx.translate(x, y);
  ctx.scale(size, size);

  // Glow effect
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  // Draw star path manually since node-canvas doesn't support fill(path)/stroke(path)
  ctx.beginPath();
  const outerRadius = 1;
  const innerRadius = 0.4;
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  // Fill star
  ctx.fillStyle = color;
  ctx.fill();

  // Stroke star
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 0.1;
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw multiple stars (for higher importance levels)
 */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  size: number,
  config?: ImportanceConfig,
) {
  const settings = config?.visualSettings || DEFAULT_VISUAL_SETTINGS;
  const starSize = size * (settings.starSize || 1);
  const spacing = starSize * 1.2;

  // Center the star group
  const totalWidth = (count - 1) * spacing;
  const startX = x - totalWidth / 2;

  for (let i = 0; i < count; i++) {
    drawStar(
      ctx,
      startX + i * spacing,
      y,
      starSize,
      settings.starColor,
      undefined,
      settings.enableGlow,
    );
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

// Border-based highlighting functions
export function drawBuildingBorder(
  ctx: CanvasRenderingContext2D,
  building: CityBuilding,
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number,
  color: string = '#ffffff',
  lineWidth: number = 2,
) {
  const size = Math.max(building.dimensions[0], building.dimensions[2]);
  const halfSize = size / 2;

  const topLeft = worldToCanvas(building.position.x - halfSize, building.position.z - halfSize);
  const width = size * scale;
  const height = size * scale;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.rect(topLeft.x, topLeft.y, width, height);
  ctx.stroke();

  ctx.restore();
}

export function drawDistrictBorder(
  ctx: CanvasRenderingContext2D,
  district: CityDistrict,
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number,
  color: string = '#60a5fa',
  lineWidth: number = 2,
  dashPattern: number[] = [],
) {
  const canvasPos = worldToCanvas(district.worldBounds.minX, district.worldBounds.minZ);
  const width = (district.worldBounds.maxX - district.worldBounds.minX) * scale;
  const height = (district.worldBounds.maxZ - district.worldBounds.minZ) * scale;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashPattern);

  ctx.beginPath();
  ctx.rect(canvasPos.x, canvasPos.y, width, height);
  ctx.stroke();

  ctx.restore();
}

export function drawDistricts(
  mode: RenderMode,
  ctx: CanvasRenderingContext2D,
  districts: CityDistrict[],
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number,
  highlightedDirectories?: Set<string>,
  hoveredDirectories?: Set<string>,
  hoveredDistrict?: CityDistrict,
  fullSize?: boolean,
  selectedPaths?: Set<string>,
  changedFiles?: Map<string, 'added' | 'modified' | 'deleted' | 'renamed'>,
  theme?: ColorTheme,
  customColorFn?: ColorFunction,
  defaultDirectoryColor?: string,
  showDirectoryLabels: boolean = true,
) {
  // Count districts by depth for debugging
  const depthCounts = new Map<number, number>();
  districts.forEach(district => {
    const depth = (district.path || '').split('/').filter(Boolean).length;
    depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1);
  });

  // Helper function to check if a district contains any visible buildings or should be shown as a parent
  const districtContainsVisibleBuildings = (districtPath: string): boolean => {
    // Highlight mode (highlight mode): render ALL districts, visual highlighting is handled separately
    if (mode === RenderMode.HIGHLIGHT) {
      return true; // Always render if not in isolate mode
    }

    // In isolate mode, use changedFiles if available, otherwise fall back to selectedPaths
    const pathsToCheck = changedFiles ? new Set(changedFiles.keys()) : selectedPaths || new Set();

    // Normalize district path - remove trailing slashes for consistent comparison
    const normalizedDistrictPath = districtPath.replace(/\/$/, '');

    if (pathsToCheck.size === 0) {
      // In isolate mode with no paths to check, only show the root district for context
      const isRootDistrict =
        normalizedDistrictPath === '' || normalizedDistrictPath.split('/').length <= 1;
      if (isRootDistrict) {
        return true;
      } else {
        return false;
      }
    }

    // Check if any visible path is within this district OR if this district is a parent of visible paths
    for (const visiblePath of pathsToCheck) {
      // Case 1: Visible path is exactly the district itself
      if (visiblePath === normalizedDistrictPath) {
        return true;
      }

      // Case 2: Visible path is a file/subdirectory within this district
      if (normalizedDistrictPath === '') {
        // Root directory case - check if it's a top-level file (no slashes)
        if (!visiblePath.includes('/')) {
          return true;
        }
        // Also check if any visible path starts from root (any file path with slashes)
        if (visiblePath.includes('/')) {
          return true;
        }
      } else {
        // Non-root directory case - check if visible path starts with district path + '/'
        if (visiblePath.startsWith(normalizedDistrictPath + '/')) {
          return true;
        }

        // Case 3: Check if this district is a parent path of any visible path
        // This handles cases where we need to show parent directories for navigation
        const districtParts = normalizedDistrictPath.split('/');
        const visibleParts = visiblePath.split('/');

        // Check if this district is a parent path (shorter path that matches the beginning)
        if (districtParts.length < visibleParts.length) {
          const isParent = districtParts.every((part, index) => part === visibleParts[index]);
          if (isParent) {
            return true;
          }
        }
      }
    }

    return false;
  };

  districts.forEach((district, _index) => {
    const districtPath = district.path || '';
    const isRoot = !districtPath || districtPath === '';

    // Skip root districts (empty path)
    if (isRoot) return;

    // Skip districts that don't contain visible buildings in isolate mode
    if (!districtContainsVisibleBuildings(districtPath)) {
      return;
    }

    const canvasPos = worldToCanvas(district.worldBounds.minX, district.worldBounds.minZ);
    const width = (district.worldBounds.maxX - district.worldBounds.minX) * scale;
    const depth = (district.worldBounds.maxZ - district.worldBounds.minZ) * scale;

    // Use default directory color (matching React's behavior - no classification)
    const baseColorHex = defaultDirectoryColor || '#4B5155';

    // Convert hex to RGB for the rgba() format used below
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [75, 80, 85]; // Default grey if parsing fails
    };

    const baseColor = hexToRgb(baseColorHex);

    // Base opacity
    let opacity = 0.3;
    let borderOpacity = 0.6;

    // Highlighting
    const isHighlighted = highlightedDirectories?.has(districtPath) || false;
    const isInHoveredPath = hoveredDirectories?.has(districtPath) || false;
    const isDirectlyHovered = hoveredDistrict === district;
    const isHovered = isInHoveredPath || isDirectlyHovered;

    if (isHighlighted) {
      opacity = 0.5;
      borderOpacity = 0.8;
    }

    if (isHovered) {
      opacity = Math.max(opacity, 0.4);
      borderOpacity = Math.max(borderOpacity, 0.7);
    }

    // Fill with subtle gradients
    if (isHighlighted) {
      // Subtle white/gray highlight instead of blue
      ctx.fillStyle = `rgba(120, 120, 120, ${opacity})`;
    } else {
      // Use the elegant grey colors
      ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`;
    }
    ctx.fillRect(canvasPos.x, canvasPos.y, width, depth);

    // Border with better contrast
    if (isHighlighted) {
      // White/light gray border instead of blue
      ctx.strokeStyle = `rgba(180, 180, 180, ${borderOpacity})`;
    } else {
      // Lighter grey borders for better definition
      ctx.strokeStyle = `rgba(${Math.min(255, baseColor[0] + 40)}, ${Math.min(
        255,
        baseColor[1] + 40,
      )}, ${Math.min(255, baseColor[2] + 40)}, ${borderOpacity})`;
    }
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.strokeRect(canvasPos.x, canvasPos.y, width, depth);

    // Hover highlight - white border for directly hovered district and all districts in hover path
    if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvasPos.x, canvasPos.y, width, depth);
    }

    // Label - show for all districts with sufficient size
    if (showDirectoryLabels) {
      const districtName = district.path?.split('/').pop() || 'root';
      const minSize = fullSize ? 40 : 30;

      if (width > minSize && depth > minSize) {
      ctx.save();
      ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)';

      // Scale font size proportionally with district size, with reasonable bounds
      const baseFontSize = fullSize ? 18 : 13;
      const scaleFactor = Math.min(Math.max(scale / 1.0, 0.5), 3.0); // Clamp scale factor
      const fontSize = Math.round(baseFontSize * scaleFactor);
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayName = districtName;

      // Position label at the bottom of the district boundary
      // Use a small offset from the bottom edge for padding
      const bottomPadding = 2; //Math.max(4, fontSize * 0.5); // Small padding based on font size
      ctx.textBaseline = 'bottom'; // Change baseline to bottom for proper bottom alignment
      ctx.fillText(
        displayName,
        canvasPos.x + width / 2,
        canvasPos.y + depth - bottomPadding, // Position at bottom minus small padding
      );
      ctx.restore();
      }
    }
  });
}

export function drawBuildings(
  mode: 'highlight' | 'isolate',
  ctx: CanvasRenderingContext2D,
  buildings: CityBuilding[],
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number,
  highlightedPaths?: Set<string>,
  selectedPaths?: Set<string>,
  focusDirectory?: string,
  hoveredBuilding?: CityBuilding,
  theme?: ColorTheme,
  customColorFn?: ColorFunction,
  showFileNames?: boolean,
  fullSize?: boolean,
  changedFiles?: Map<string, 'added' | 'modified' | 'deleted' | 'renamed'>,
  hoverBorderColor?: string,
  selectedBorderColor?: string,
  disableOpacityDimming?: boolean,
  importanceConfig?: ImportanceConfig,
) {
  buildings.forEach(building => {
    // Isolate mode: only render changed files (more restrictive than showOnlyChangedFiles)
    if (mode === 'isolate' && changedFiles && !changedFiles.has(building.path)) {
      return; // Skip rendering this building but keep it in layout
    }

    const pos = worldToCanvas(building.position.x, building.position.z);

    // Calculate building dimensions (no coordinate swapping needed)
    let width: number, height: number;

    if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
      width = building.dimensions[0] * scale * 0.95;
      height = building.dimensions[2] * scale * 0.95;
    } else {
      // Traditional layout - use small squares
      const size = Math.max(
        2,
        Math.max(building.dimensions[0], building.dimensions[2]) * scale * 0.9,
      );
      width = size;
      height = size;
    }

    const isHighlighted = highlightedPaths?.has(building.path) || false;
    const isSelected = selectedPaths?.has(building.path) || false;
    const isHovered = hoveredBuilding === building;
    const isInHoveredPath = hoveredBuilding?.path === building.path;
    const isInFocus = !focusDirectory || building.path.startsWith(focusDirectory);

    // Check if this file has changes (for PR visualization)
    const changeType = changedFiles?.get(building.path);
    const hasChanges = !!changeType;
    const isInPRMode = !!changedFiles;

    // Building color logic - NEW PR HIGHLIGHTING STRATEGY
    let color: string;
    let opacity = 1;
    if (isInPRMode) {
      // In PR mode, always use the regular file type colors
      if (building.color) {
        color = building.color;
      } else {
        // Use centralized BuildingTypeResolver for consistent color determination
        const resolver = new BuildingTypeResolver(theme, customColorFn);
        const result = resolver.classifyBuilding({
          path: building.path,
          fileExtension: building.fileExtension,
          size: building.size,
          lastModified: building.lastModified,
        });
        color = result.buildingType.color;
      }

      // Set opacity based on whether file has changes
      if (hasChanges) {
        opacity = changeType === 'deleted' ? 0.5 : 1; // Deleted files are semi-transparent
      } else {
        // Unchanged files are dimmed
        opacity = 0.3;
      }
    } else {
      // Normal mode: use centralized building type system
      if (building.color) {
        color = building.color;
      } else {
        // Use centralized BuildingTypeResolver for consistent color determination
        const resolver = new BuildingTypeResolver(theme, customColorFn);
        const result = resolver.classifyBuilding({
          path: building.path,
          fileExtension: building.fileExtension,
          size: building.size,
          lastModified: building.lastModified,
        });
        color = result.buildingType.color;
      }
      // Apply opacity dimming unless disabled
      if (disableOpacityDimming) {
        opacity = 1; // No dimming - all buildings at full opacity
      } else {
        // When in highlight mode, dim non-highlighted buildings
        if (mode === 'highlight' && (highlightedPaths?.size || 0) > 0) {
          opacity = isHighlighted ? 1 : 0.3;
        } else {
          opacity = isInFocus ? 1 : 0.3;
        }
      }
    }

    // Draw building
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fillRect(pos.x - width / 2, pos.y - height / 2, width, height);
    ctx.globalAlpha = 1;

    // PR Mode: Draw borders and effects based on change type
    if (isInPRMode && hasChanges) {
      ctx.save();

      switch (changeType) {
        case 'added':
          // Green border for new files
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.strokeRect(pos.x - width / 2 - 2, pos.y - height / 2 - 2, width + 4, height + 4);
          break;

        case 'modified':
          // Purple border for modified files
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.strokeRect(pos.x - width / 2 - 2, pos.y - height / 2 - 2, width + 4, height + 4);
          break;

        case 'deleted':
          // Red strikethrough for deleted files
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          // Draw diagonal strikethrough
          ctx.beginPath();
          ctx.moveTo(pos.x - width / 2, pos.y - height / 2);
          ctx.lineTo(pos.x + width / 2, pos.y + height / 2);
          ctx.moveTo(pos.x + width / 2, pos.y - height / 2);
          ctx.lineTo(pos.x - width / 2, pos.y + height / 2);
          ctx.stroke();
          // Also add a red border
          ctx.strokeRect(pos.x - width / 2 - 2, pos.y - height / 2 - 2, width + 4, height + 4);
          break;

        case 'renamed':
          // Blue dashed border for renamed files
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(pos.x - width / 2 - 2, pos.y - height / 2 - 2, width + 4, height + 4);
          break;
      }

      ctx.restore();
    }

    // Legacy highlighting effects (for non-PR mode)
    else if (!isInPRMode) {
      if (isSelected) {
        ctx.strokeStyle = selectedBorderColor
          ? `${selectedBorderColor}CC`
          : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(pos.x - width / 2 - 3, pos.y - height / 2 - 3, width + 6, height + 6);
      } else if (isHighlighted || isInHoveredPath) {
        // Configurable border for highlighted buildings
        ctx.strokeStyle = selectedBorderColor
          ? `${selectedBorderColor}CC`
          : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - width / 2 - 1, pos.y - height / 2 - 1, width + 2, height + 2);
      }
    }

    // Hover effect (always show)
    if (isHovered) {
      ctx.strokeStyle = hoverBorderColor ? `${hoverBorderColor}CC` : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(pos.x - width / 2 - 1, pos.y - height / 2 - 1, width + 2, height + 2);
    }

    // Draw importance stars
    if (importanceConfig?.visualSettings?.showStars !== false) {
      const importanceResult = calculateImportance(building.path, 'file', importanceConfig);
      if (importanceResult && shouldShowImportance(importanceResult.importance, importanceConfig)) {
        const starCount = getStarCount(importanceResult.importance, importanceConfig);
        if (starCount > 0) {
          // Position stars above the building
          const starY = pos.y - height / 2 - 10;
          const starSize = Math.min(8, width / 4);
          drawStars(ctx, pos.x, starY, starCount, starSize, importanceConfig);
        }
      }
    }

    // Draw React symbol for JSX/TSX files
    // Track icon bottom position for placing filename below
    let iconBottomY = pos.y;
    let hasIcon = false;
    if (isReactFile(building.fileExtension)) {
      hasIcon = true;
      // Position React symbol centered in the building
      // Size is 75% of the smaller dimension
      const reactSize = Math.min(width, height) * 0.75;
      const reactX = pos.x;

      // For wide buildings (wider than tall), shift icon up to make room for text below
      // Only shift if text will actually be rendered
      const willShowText = showFileNames && width > 100 && height > 30;
      const isWide = width > height;
      const iconYOffset = (willShowText && isWide) ? -height * 0.15 : 0;
      const reactY = pos.y + iconYOffset;

      drawReactSymbol(ctx, reactX, reactY, reactSize);
      iconBottomY = reactY + reactSize / 2;
    }

    // Draw filename if enabled and building is large enough
    if (showFileNames && width > 100 && height > 30) {
      const fileName = building.path.split('/').pop() || '';

      // Set up text rendering
      ctx.save();

      // Calculate font size based on building size with better scaling
      // Adjusted for 1000x1000 minimum canvas size
      const minFontSize = fullSize ? 40 : 30;
      const maxFontSize = fullSize ? 40 : 30;

      // Improved scaling algorithm that considers both building size and text length
      const calculateOptimalFontSize = () => {
        // Method 1: Size-based scaling with better progression
        // Adjusted for 1000x1000 minimum canvas - buildings will be larger
        const minDimension = Math.min(width, height);
        let sizeBasedFontSize: number;

        if (minDimension < 20) {
          // Very small buildings: conservative scaling
          sizeBasedFontSize = minDimension * 0.4;
        } else if (minDimension < 40) {
          // Small buildings: moderate scaling
          sizeBasedFontSize = minDimension * 0.35;
        } else if (minDimension < 80) {
          // Medium buildings: standard scaling
          sizeBasedFontSize = minDimension * 0.3;
        } else if (minDimension < 150) {
          // Large buildings: less aggressive scaling
          sizeBasedFontSize = minDimension * 0.25;
        } else {
          // Very large buildings: minimal scaling to avoid huge text
          sizeBasedFontSize = minDimension * 0.2;
        }

        // Method 2: Text-length aware adjustment
        // Longer filenames need relatively smaller font sizes
        // Less aggressive reduction for higher resolution canvas
        const textLengthFactor = Math.max(0.75, 1 - (fileName.length - 10) * 0.015);

        // Method 3: Aspect ratio consideration
        const aspectRatio = width / height;
        const aspectMultiplier = aspectRatio > 1.8 ? 1.15 : aspectRatio > 1.3 ? 1.05 : 1.0; // Progressive scaling for wide buildings

        // Combine all factors
        return sizeBasedFontSize * textLengthFactor * aspectMultiplier;
      };

      let fontSize = calculateOptimalFontSize();

      // Final clamp to bounds
      fontSize = Math.min(maxFontSize, Math.max(minFontSize, Math.floor(fontSize)));

      // Use sans-serif for better readability at small sizes
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';

      // Measure text and adjust font size if needed to ensure it fits
      let textMetrics = ctx.measureText(fileName);
      let textWidth = textMetrics.width;
      const availableWidth = width - 8; // Leave 8px padding for higher resolution

      // If text is too wide, reduce font size iteratively
      while (textWidth > availableWidth && fontSize > minFontSize) {
        fontSize = Math.max(minFontSize, fontSize - 1);
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        textMetrics = ctx.measureText(fileName);
        textWidth = textMetrics.width;
      }

      // Only draw if text fits within building with padding
      if (textWidth < width - 8) {
        let textY: number;

        if (hasIcon) {
          // Position text below icon
          ctx.textBaseline = 'top';
          const spacing = 4;
          textY = iconBottomY + spacing;
        } else {
          // Center text vertically when no icon
          ctx.textBaseline = 'middle';
          textY = pos.y;
        }

        // Draw text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(fileName, pos.x, textY);
      }

      ctx.restore();
    }
  });
}

/**
 * Draw a React symbol (atom with orbits) at the given position using canvas paths
 * This avoids font rendering issues with the Unicode ⚛ character
 */
export function drawReactSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = '#00D8FF',
  glow: boolean = true,
) {
  ctx.save();

  // Position and setup
  ctx.translate(x, y);

  // Scale factor - size is the overall diameter
  const scale = size / 24; // Base icon is 24x24

  // Glow effect for React symbol
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5 * scale;

  // Draw center nucleus (small filled circle)
  ctx.beginPath();
  ctx.arc(0, 0, 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Draw three elliptical orbits rotated at 0°, 60°, and 120°
  const orbitRadiusX = 10 * scale; // Horizontal radius of ellipse
  const orbitRadiusY = 4 * scale;  // Vertical radius of ellipse

  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3); // Rotate by 0°, 60°, 120°

    // Draw ellipse
    ctx.beginPath();
    ctx.ellipse(0, 0, orbitRadiusX, orbitRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Check if a file is a React file (JSX/TSX)
 */
function isReactFile(fileExtension?: string): boolean {
  if (!fileExtension) return false;
  const ext = fileExtension.toLowerCase();
  return ext === '.jsx' || ext === '.tsx';
}

export function drawConnections(
  ctx: CanvasRenderingContext2D,
  buildings: CityBuilding[],
  highlightedPaths: Set<string>,
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
) {
  const highlightedBuildings = buildings.filter(b => highlightedPaths.has(b.path));

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  for (let i = 0; i < highlightedBuildings.length - 1; i++) {
    const from = worldToCanvas(
      highlightedBuildings[i].position.x,
      highlightedBuildings[i].position.z,
    );
    const to = worldToCanvas(
      highlightedBuildings[i + 1].position.x,
      highlightedBuildings[i + 1].position.z,
    );

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.restore();
}
