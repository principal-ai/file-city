import { FileSuffixColorConfig, FileTypeIconConfig } from './fileColorHighlightLayers';
import { getLucideIconImage } from './lucideIconConverter';

/**
 * Extract icon configurations from file color config
 * This creates a map of file extensions to their icon configs
 */
export function extractIconConfig(
  colorConfig: FileSuffixColorConfig,
): Map<string, FileTypeIconConfig> {
  const iconMap = new Map<string, FileTypeIconConfig>();

  Object.entries(colorConfig.suffixConfigs).forEach(([suffix, config]) => {
    if (config.icon) {
      iconMap.set(suffix, config.icon);
    }
  });

  return iconMap;
}

/**
 * Get icon configuration for a file path
 * Uses same matching logic as file color system
 */
export function getFileTypeIcon(
  filePath: string,
  iconMap: Map<string, FileTypeIconConfig>,
): FileTypeIconConfig | null {
  const lastSlash = filePath.lastIndexOf('/');
  const fileName = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);

  // Check exact filename match first (e.g., "package.json")
  if (iconMap.has(fileName)) {
    return iconMap.get(fileName) || null;
  }

  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    // No extension or ends with dot
    return null;
  }

  // Check compound extensions (longest first) - same as fileColorHighlightLayers
  const sortedExtensions = Array.from(iconMap.keys()).sort((a, b) => b.length - a.length);

  const lowerFileName = fileName.toLowerCase();
  for (const ext of sortedExtensions) {
    if (ext.startsWith('.') && lowerFileName.endsWith(ext)) {
      return iconMap.get(ext) || null;
    }
  }

  return null;
}

/**
 * Draw a file type icon on the canvas
 */
export function drawFileTypeIcon(
  ctx: CanvasRenderingContext2D,
  icon: FileTypeIconConfig,
  x: number,
  y: number,
  buildingWidth: number,
  buildingHeight: number,
) {
  ctx.save();

  if (icon.type === 'emoji') {
    // Calculate size as percentage of building
    const sizeScale = icon.size || 0.75;
    const emojiSize = Math.min(buildingWidth, buildingHeight) * sizeScale;

    // Glow effect
    if (icon.glow) {
      ctx.shadowColor = icon.color || '#00D8FF';
      ctx.shadowBlur = 8;
    }

    ctx.fillStyle = icon.color || '#ffffff';
    ctx.font = `${emojiSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon.name, x, y);
  } else if (icon.type === 'lucide') {
    // Calculate size as percentage of building (same as emoji)
    const sizeScale = icon.size || 0.5;
    const actualIconSize = Math.min(buildingWidth, buildingHeight) * sizeScale;

    // Round to nearest 4px to reduce cache misses and prevent flickering
    const roundedIconSize = Math.round(actualIconSize / 4) * 4;
    const svgSize = Math.max(16, Math.min(roundedIconSize, 64)); // Clamp between 16-64px for SVG generation

    // Optional background circle
    if (icon.backgroundColor) {
      const bgRadius = actualIconSize * 0.7;
      ctx.fillStyle = icon.backgroundColor;
      ctx.beginPath();
      ctx.arc(x, y, bgRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Lucide icon - use rounded size for cache, scale to actual size
    const img = getLucideIconImage(icon.name, icon.color || '#ffffff', svgSize);

    if (img) {
      const iconX = x - actualIconSize / 2;
      const iconY = y - actualIconSize / 2;
      // Scale the cached icon to actual size
      ctx.drawImage(img, iconX, iconY, actualIconSize, actualIconSize);
    }
  }

  ctx.restore();
}
