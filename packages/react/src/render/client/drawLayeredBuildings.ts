import { CityBuilding, CityDistrict } from '@principal-ai/code-city-builder';

// Layer types and interfaces
export type LayerRenderStrategy =
  | 'border'
  | 'fill'
  | 'glow'
  | 'pattern'
  | 'cover'
  | 'icon'
  | 'custom';

export interface LayerItem {
  path: string;
  type: 'file' | 'directory';
  renderStrategy?: LayerRenderStrategy;
  // Cover-specific options
  coverOptions?: {
    opacity?: number;
    image?: string;
    text?: string;
    textSize?: number;
    backgroundColor?: string;
    borderRadius?: number;
    icon?: string;
    iconSize?: number;
  };
  // Custom render function
  customRender?: (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number },
    scale: number,
  ) => void;
}

export interface HighlightLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  opacity?: number;
  borderWidth?: number;
  priority: number; // Higher priority layers render on top
  items: LayerItem[];
  // Performance optimization - mark frequently changing layers as dynamic
  dynamic?: boolean; // If true, this layer changes frequently (e.g., hover effects)
}

// Helper to check if a path matches a layer item
function pathMatchesItem(
  path: string,
  item: LayerItem,
  checkType: 'exact' | 'children' = 'children',
): boolean {
  if (item.type === 'file') {
    return path === item.path;
  } else {
    // Directory match
    if (checkType === 'exact') {
      // Only match the directory itself, not its children
      return path === item.path;
    } else {
      // Match directory and all its children (original behavior)
      return path === item.path || path.startsWith(item.path + '/');
    }
  }
}

// Helper function to draw rounded rectangles
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill?: boolean,
  stroke?: boolean,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Get all layer items that apply to a given path
function getLayerItemsForPath(
  path: string,
  layers: HighlightLayer[],
  checkType: 'exact' | 'children' = 'children',
): Array<{ layer: HighlightLayer; item: LayerItem }> {
  const matches: Array<{ layer: HighlightLayer; item: LayerItem }> = [];

  for (const layer of layers) {
    if (!layer.enabled) continue;

    for (const item of layer.items) {
      if (pathMatchesItem(path, item, checkType)) {
        matches.push({ layer, item });
      }
    }
  }

  // Sort by priority (highest first)
  return matches.sort((a, b) => b.layer.priority - a.layer.priority);
}

// Draw grid helper (copied from original)
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

// Draw legend helper (copied from original)
export function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  highlightedCount: number,
  focusDirectory: string | null,
  fullSize: boolean,
  _rootDirectoryName?: string,
) {
  ctx.fillStyle = '#ffffff';
  ctx.font = fullSize ? '12px monospace' : '10px monospace';

  if (focusDirectory) {
    ctx.fillText(`Focus: ${focusDirectory}`, 10, height - 22);
  }

  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = fullSize ? '11px monospace' : '9px monospace';
  ctx.restore();
}

// Helper function to break text intelligently
function breakTextIntelligently(text: string): string[] {
  // First try hyphen
  if (text.includes('-')) {
    const parts = text.split('-');
    // If we get reasonable parts, use them
    if (parts.length >= 2 && parts.every(p => p.length > 0)) {
      // Group parts to avoid too many lines
      if (parts.length > 3) {
        const mid = Math.ceil(parts.length / 2);
        return [parts.slice(0, mid).join('-'), parts.slice(mid).join('-')];
      }
      return parts;
    }
  }

  // Then try underscore
  if (text.includes('_')) {
    const parts = text.split('_');
    if (parts.length >= 2 && parts.every(p => p.length > 0)) {
      if (parts.length > 3) {
        const mid = Math.ceil(parts.length / 2);
        return [parts.slice(0, mid).join('_'), parts.slice(mid).join('_')];
      }
      return parts;
    }
  }

  // Then try camelCase
  const camelCaseParts = text.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)/g);
  if (camelCaseParts && camelCaseParts.length >= 2) {
    if (camelCaseParts.length > 3) {
      const mid = Math.ceil(camelCaseParts.length / 2);
      return [camelCaseParts.slice(0, mid).join(''), camelCaseParts.slice(mid).join('')];
    }
    return camelCaseParts;
  }

  // If no good break points, try breaking at word boundaries
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  // Last resort - break in the middle
  if (text.length > 20) {
    const mid = Math.floor(text.length / 2);
    // Try to find a better break point near the middle
    const searchRange = Math.floor(text.length * 0.2);
    let breakPoint = mid;

    // Look for special characters near the middle
    for (let i = 0; i < searchRange; i++) {
      if (mid + i < text.length && /[\W_]/.test(text[mid + i])) {
        breakPoint = mid + i;
        break;
      }
      if (mid - i >= 0 && /[\W_]/.test(text[mid - i])) {
        breakPoint = mid - i;
        break;
      }
    }

    return [text.substring(0, breakPoint).trim(), text.substring(breakPoint).trim()];
  }

  // Return as single line if text is short
  return [text];
}

// Render strategies implementation
function renderBorderStrategy(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  item: LayerItem,
  borderRadius: number = 0,
) {
  ctx.save();
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = layer.borderWidth || 2;
  ctx.globalAlpha = layer.opacity || 1;
  ctx.setLineDash([]);

  if (item.type === 'directory') {
    // Sharp corners for directories
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  } else {
    // Use configurable border radius for files/buildings
    const radius = Math.min(borderRadius, Math.min(bounds.width, bounds.height) / 6);
    if (radius > 0) {
      drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius, false, true);
    } else {
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  ctx.restore();
}

function renderFillStrategy(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  item: LayerItem,
  borderRadius: number = 0,
) {
  ctx.save();
  ctx.fillStyle = layer.color;
  ctx.globalAlpha = layer.opacity || 0.3;

  if (item.type === 'directory') {
    // Sharp corners for directories
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  } else {
    // Use configurable border radius for files/buildings
    const radius = Math.min(borderRadius, Math.min(bounds.width, bounds.height) / 6);
    if (radius > 0) {
      drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius, true, false);
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  ctx.restore();
}

function renderGlowStrategy(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  item: LayerItem,
  borderRadius: number = 0,
) {
  ctx.save();
  ctx.shadowColor = layer.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = layer.color;
  ctx.globalAlpha = layer.opacity || 0.5;

  if (item.type === 'directory') {
    // Sharp corners for directories
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  } else {
    // Use configurable border radius for files/buildings
    const radius = Math.min(borderRadius, Math.min(bounds.width, bounds.height) / 6);
    if (radius > 0) {
      drawRoundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, radius, true, false);
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  ctx.restore();
}

function renderPatternStrategy(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  _item: LayerItem,
) {
  ctx.save();
  ctx.strokeStyle = layer.color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = layer.opacity || 0.5;

  // Create diagonal line pattern
  const spacing = 5;
  ctx.beginPath();

  for (let offset = -bounds.height; offset < bounds.width; offset += spacing) {
    ctx.moveTo(bounds.x + offset, bounds.y);
    ctx.lineTo(bounds.x + offset + bounds.height, bounds.y + bounds.height);
  }

  ctx.stroke();
  ctx.restore();
}

function renderCoverStrategy(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  item: LayerItem,
  _scale: number,
) {
  const coverOptions = item.coverOptions || {};

  ctx.save();

  // Create clipping path for the cover area - always use sharp corners for directories
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.clip();

  // Background - always use sharp corners for directory covers
  ctx.fillStyle = coverOptions.backgroundColor || layer.color;
  ctx.globalAlpha = coverOptions.opacity || 0.8;
  ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

  // Reset alpha for text/icon
  ctx.globalAlpha = 1;

  // Image/SVG (takes precedence over text icon)
  if (coverOptions.image) {
    const img = new Image();
    img.onload = () => {
      const imageSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.4;
      const imageX = bounds.x + bounds.width / 2 - imageSize / 2;
      const imageY = coverOptions.text
        ? bounds.y + bounds.height * 0.25
        : bounds.y + bounds.height / 2 - imageSize / 2;

      ctx.drawImage(img, imageX, imageY, imageSize, imageSize);
    };
    img.src = coverOptions.image;
  }
  // Text Icon (fallback if no image)
  else if (coverOptions.icon) {
    const iconSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.3;
    ctx.font = `${iconSize}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const iconY = coverOptions.text
      ? bounds.y + bounds.height * 0.35
      : bounds.y + bounds.height * 0.5;

    ctx.fillText(coverOptions.icon, bounds.x + bounds.width / 2, iconY);
  }

  // Text
  if (coverOptions.text) {
    let textSize = coverOptions.textSize || Math.min(bounds.width, bounds.height) * 0.15;
    ctx.font = `${textSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Measure text and see if it fits
    const padding = bounds.width * 0.1;
    const maxWidth = bounds.width - padding * 2;
    const textToRender = coverOptions.text;
    let textWidth = ctx.measureText(textToRender).width;

    // If text is too wide, try breaking it up
    if (textWidth > maxWidth) {
      // Try to break by common separators
      const breakableText = breakTextIntelligently(coverOptions.text);

      if (breakableText.length > 1) {
        // Render multiple lines
        const lineHeight = textSize * 1.2;
        const totalHeight = lineHeight * breakableText.length;
        const startY = bounds.y + (bounds.height - totalHeight) / 2 + lineHeight / 2;

        // Adjust text size if needed to fit all lines
        const maxLines = Math.floor((bounds.height * 0.8) / lineHeight);
        if (breakableText.length > maxLines) {
          textSize = textSize * (maxLines / breakableText.length);
          ctx.font = `${textSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        }

        breakableText.forEach((line, index) => {
          const y = startY + index * lineHeight;
          ctx.textBaseline = 'middle';
          ctx.fillText(line, bounds.x + bounds.width / 2, y);
        });
      } else {
        // Single line - scale down text if needed
        while (textWidth > maxWidth && textSize > 8) {
          textSize--;
          ctx.font = `${textSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          textWidth = ctx.measureText(textToRender).width;
        }

        const textY = coverOptions.icon
          ? bounds.y + bounds.height * 0.65
          : bounds.y + bounds.height * 0.5;

        ctx.textBaseline = 'middle';
        ctx.fillText(textToRender, bounds.x + bounds.width / 2, textY);
      }
    } else {
      // Text fits - render normally
      const textY = coverOptions.icon
        ? bounds.y + bounds.height * 0.65
        : bounds.y + bounds.height * 0.5;

      ctx.textBaseline = 'middle';
      ctx.fillText(textToRender, bounds.x + bounds.width / 2, textY);
    }
  }

  ctx.restore();
}

// Apply layer rendering to a specific item
function applyLayerRendering(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  layer: HighlightLayer,
  item: LayerItem,
  scale: number,
  borderRadius: number = 0,
) {
  const strategy = item.renderStrategy || 'border';

  switch (strategy) {
    case 'border':
      renderBorderStrategy(ctx, bounds, layer, item, borderRadius);
      break;
    case 'fill':
      renderFillStrategy(ctx, bounds, layer, item, borderRadius);
      break;
    case 'glow':
      renderGlowStrategy(ctx, bounds, layer, item, borderRadius);
      break;
    case 'pattern':
      renderPatternStrategy(ctx, bounds, layer, item);
      break;
    case 'cover':
      renderCoverStrategy(ctx, bounds, layer, item, scale);
      break;
    case 'custom':
      if (item.customRender) {
        item.customRender(ctx, bounds, scale);
      }
      break;
  }
}

// Draw districts with layer support
export function drawLayeredDistricts(
  ctx: CanvasRenderingContext2D,
  districts: CityDistrict[],
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number, // This includes the zoom scale for text proportionality
  layers: HighlightLayer[],
  hoveredDistrict?: CityDistrict | null,
  fullSize?: boolean,
  defaultDirectoryColor?: string,
  layoutConfig?: {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
  },
  abstractedPaths?: Set<string>, // Paths of directories that are abstracted (have covers)
  showDirectoryLabels: boolean = true,
  borderRadius: number = 0, // Border radius for districts (default: sharp corners)
) {
  districts.forEach(district => {
    const districtPath = district.path || '';
    const isRoot = !districtPath || districtPath === '';

    // Check if this root district has layer matches (like covers) - if so, render it
    const rootLayerMatches = getLayerItemsForPath(districtPath, layers, 'exact');
    const hasLayerRendering = rootLayerMatches.length > 0;

    // Skip root districts unless they have layer rendering (covers, highlights, etc.)
    if (isRoot && !hasLayerRendering) return;

    const canvasPos = worldToCanvas(district.worldBounds.minX, district.worldBounds.minZ);
    const width = (district.worldBounds.maxX - district.worldBounds.minX) * scale;
    const depth = (district.worldBounds.maxZ - district.worldBounds.minZ) * scale;

    const bounds = {
      x: canvasPos.x,
      y: canvasPos.y,
      width: width,
      height: depth,
    };

    // Get base color

    const baseColorHex = defaultDirectoryColor || '#4B5155';
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [75, 80, 85];
    };

    const baseColor = hexToRgb(baseColorHex);

    // Base rendering
    let opacity = 0.3;
    let borderOpacity = 0.6;

    // Check if district has layer highlighting - use exact matching for districts
    const layerMatches = getLayerItemsForPath(districtPath, layers, 'exact');
    const hasLayerHighlight = layerMatches.length > 0;

    if (hasLayerHighlight) {
      opacity = 0.5;
      borderOpacity = 0.8;
    }

    const isHovered = hoveredDistrict === district;
    if (isHovered) {
      opacity = Math.max(opacity, 0.4);
      borderOpacity = Math.max(borderOpacity, 0.7);
    }

    // Fill districts with configurable border radius
    ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${opacity})`;
    if (borderRadius > 0) {
      drawRoundedRect(
        ctx,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        borderRadius,
        true,
        false,
      );
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Border with configurable border radius
    ctx.strokeStyle = `rgba(${Math.min(255, baseColor[0] + 40)}, ${Math.min(255, baseColor[1] + 40)}, ${Math.min(255, baseColor[2] + 40)}, ${borderOpacity})`;
    ctx.lineWidth = 1;
    if (borderRadius > 0) {
      drawRoundedRect(
        ctx,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        borderRadius,
        false,
        true,
      );
    } else {
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Apply layer-specific rendering (covers, etc.)
    for (const match of layerMatches) {
      // Only apply if this is specifically a directory item or if it's a cover strategy
      if (match.item.type === 'directory' || match.item.renderStrategy === 'cover') {
        applyLayerRendering(ctx, bounds, match.layer, match.item, scale, borderRadius);
      }
    }

    // Hover highlight with configurable border radius
    if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      if (borderRadius > 0) {
        drawRoundedRect(
          ctx,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          borderRadius,
          false,
          true,
        );
      } else {
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    }

    // Check if this district has a cover layer item or is abstracted
    const hasCover =
      layerMatches.some(match => match.item.renderStrategy === 'cover' && match.layer.enabled) ||
      (abstractedPaths && abstractedPaths.has(districtPath));

    // Skip label rendering if district has a cover or is abstracted
    if (showDirectoryLabels && !hasCover) {
      // Check if this is a grid cell with dedicated label space
      const isGridCell = district.path?.startsWith('grid-cell-') && district.label;

      let districtName: string;
      let labelBounds: { x: number; y: number; width: number; height: number } | undefined;

      if (isGridCell && district.label) {
        // Use grid cell label configuration
        districtName = district.label.text;
        // Transform label bounds from world space to canvas space
        const labelCanvasPos = worldToCanvas(
          district.label.bounds.minX,
          district.label.bounds.minZ,
        );
        const labelCanvasWidth = (district.label.bounds.maxX - district.label.bounds.minX) * scale;
        const labelCanvasHeight = (district.label.bounds.maxZ - district.label.bounds.minZ) * scale;

        labelBounds = {
          x: labelCanvasPos.x,
          y: labelCanvasPos.y,
          width: labelCanvasWidth,
          height: labelCanvasHeight,
        };
      } else {
        // Use traditional district name from path
        districtName = district.path?.split('/').pop() || 'root';
      }

      // Calculate actual available label space
      let availableLabelHeight: number;
      let actualLabelHeight: number;
      let labelWidth: number;
      let labelX: number;
      let labelY: number;

      if (labelBounds) {
        // For grid cells, use dedicated label space
        availableLabelHeight = labelBounds.height;
        actualLabelHeight = labelBounds.height * scale;
        labelWidth = labelBounds.width;
        labelX = labelBounds.x;
        labelY = labelBounds.y;
      } else {
        // For traditional districts, use padding space
        availableLabelHeight = layoutConfig?.paddingTop || (fullSize ? 24 : 20);
        actualLabelHeight = availableLabelHeight * scale;
        labelWidth = bounds.width;
        labelX = bounds.x;
        labelY = bounds.y;
      }

      // Only check absolute label space, not ratio
      const minMeaningfulLabelSpace = fullSize ? 12 : 10; // Just need readable space

      // For grid cells with dedicated label space, always show the label
      const labelSpaceSufficient = labelBounds
        ? true
        : actualLabelHeight >= minMeaningfulLabelSpace;

      if (labelSpaceSufficient) {
        ctx.save();
        ctx.fillStyle = hasLayerHighlight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)';

        // Step 1: Start with proportional sizing (for visual consistency)
        // For grid cell labels, use larger base size
        const baseFontSize = labelBounds ? (fullSize ? 28 : 20) : fullSize ? 18 : 13;
        const scaleFactor = Math.min(Math.max(scale / 1.0, 0.5), 3.0);
        const proportionalFontSize = baseFontSize * scaleFactor;

        // Step 2: Clamp to readable bounds (for usability)
        const minReadableSize = labelBounds ? 14 : 10; // Larger minimum for grid labels
        // No max for grid labels - let them scale with cell size, regular labels still capped
        const maxReadableSize = labelBounds ? Number.MAX_SAFE_INTEGER : 24;
        const clampedSize = Math.min(
          Math.max(proportionalFontSize, minReadableSize),
          maxReadableSize,
        );

        // Step 3: Apply container-fit within those bounds (for proper fitting)
        const horizontalPadding = 8; // Small padding from edges
        const availableWidth = labelWidth - horizontalPadding * 2;

        // Start with the clamped proportional size, but respect container limits
        let fontSize = Math.min(clampedSize, availableLabelHeight * 0.8); // Use 80% of available height as max
        // Use bold font for grid cell labels, normal for others
        const fontWeight = labelBounds ? 'bold' : 'normal';
        ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        let textWidth = ctx.measureText(districtName).width;

        // Scale down if text is too wide for the container
        while (textWidth > availableWidth && fontSize > minReadableSize) {
          fontSize--;
          ctx.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          textWidth = ctx.measureText(districtName).width;
        }

        // For grid cells, always render the label. For others, check minimum size
        if (labelBounds || fontSize >= minReadableSize) {
          ctx.textAlign = 'center';

          if (labelBounds) {
            // For grid cells, position label in dedicated label space
            // Position near bottom of label area for better visual connection to content
            ctx.textBaseline = 'bottom';
            ctx.fillText(
              districtName,
              labelX + labelWidth / 2,
              labelY + labelBounds.height * 0.95, // Position at 95% down in the label area (closer to bottom)
            );
          } else {
            // For traditional districts, position at bottom of district
            ctx.textBaseline = 'bottom';
            const bottomPadding = 2;
            ctx.fillText(
              districtName,
              labelX + labelWidth / 2,
              labelY + bounds.height - bottomPadding,
            );
          }
        }

        ctx.restore();
      }
    } // End of !hasCover check
  });
}

/**
 * Draw a React symbol (⚛) at the given position
 */
function drawReactSymbol(
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

  // Glow effect for React symbol
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }

  // Draw the React symbol (⚛)
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚛', 0, 0);

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

// Draw buildings with layer support
export function drawLayeredBuildings(
  ctx: CanvasRenderingContext2D,
  buildings: CityBuilding[],
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  scale: number,
  layers: HighlightLayer[],
  hoveredBuilding?: CityBuilding | null,
  defaultBuildingColor?: string,
  showFileNames?: boolean,
  hoverBorderColor?: string,
  disableOpacityDimming?: boolean,
  showFileTypeIcons?: boolean,
  borderRadius: number = 0, // Border radius for buildings (default: 0 - sharp corners)
) {
  buildings.forEach(building => {
    const pos = worldToCanvas(building.position.x, building.position.z);

    // Calculate building dimensions
    let width: number, height: number;

    if (building.dimensions[0] > 50 || building.dimensions[2] > 50) {
      width = building.dimensions[0] * scale * 0.95;
      height = building.dimensions[2] * scale * 0.95;
    } else {
      const size = Math.max(
        2,
        Math.max(building.dimensions[0], building.dimensions[2]) * scale * 0.9,
      );
      width = size;
      height = size;
    }

    const bounds = {
      x: pos.x - width / 2,
      y: pos.y - height / 2,
      width: width,
      height: height,
    };

    // Get layer matches for this building - only check file items, not parent directories
    const layerMatches = getLayerItemsForPath(building.path, layers).filter(
      match => match.item.type === 'file',
    ); // Only apply file-specific highlights to buildings
    const hasLayerHighlight = layerMatches.length > 0;
    const isHovered = hoveredBuilding === building;

    // Building color
    let color: string;
    if (building.color) {
      color = building.color;
    } else {
      color = defaultBuildingColor || '#A1A7AE';
    }

    // Opacity
    let opacity = 1;
    if (!disableOpacityDimming) {
      opacity = hasLayerHighlight ? 1 : 0.3;
    }

    // Draw building with configurable border radius
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const actualRadius = Math.min(borderRadius, Math.min(bounds.width, bounds.height) / 6);

    if (actualRadius > 0) {
      drawRoundedRect(
        ctx,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        actualRadius,
        true,
        false,
      );
    } else {
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    ctx.globalAlpha = 1;

    // Apply layer-specific rendering
    for (const match of layerMatches) {
      applyLayerRendering(ctx, bounds, match.layer, match.item, scale, actualRadius);
    }

    // Hover effect with configurable border radius
    if (isHovered) {
      ctx.strokeStyle = hoverBorderColor ? `${hoverBorderColor}CC` : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      if (actualRadius > 0) {
        drawRoundedRect(
          ctx,
          bounds.x - 1,
          bounds.y - 1,
          bounds.width + 2,
          bounds.height + 2,
          actualRadius,
          false,
          true,
        );
      } else {
        ctx.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
      }
    }

    // Draw React symbol for JSX/TSX files (only if enabled)
    if (showFileTypeIcons && isReactFile(building.fileExtension)) {
      // Position React symbol centered in the building
      // Size is 75% of the smaller dimension
      const reactSize = Math.min(width, height) * 0.75;
      const reactX = pos.x;
      const reactY = pos.y;
      drawReactSymbol(ctx, reactX, reactY, reactSize);
    }

    // Draw filename if enabled
    if (showFileNames && width > 100 && height > 30) {
      const fileName = building.path.split('/').pop() || '';

      ctx.save();

      const fontSize = Math.min(30, Math.max(10, Math.floor(Math.min(width, height) * 0.3)));
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textMetrics = ctx.measureText(fileName);
      const textWidth = textMetrics.width;

      if (textWidth < width - 8) {
        // Background for contrast
        const textPadding = 2;
        const textHeight = fontSize * 1.2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          pos.x - textWidth / 2 - textPadding,
          pos.y - textHeight / 2,
          textWidth + textPadding * 2,
          textHeight,
        );

        // Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillText(fileName, pos.x, pos.y);
      }

      ctx.restore();
    }
  });
}
