/**
 * Zoom Calculations - Shared utilities for zoom-to-path functionality
 *
 * Extracted from ArchitectureMapHighlightLayers.tsx to enable code reuse
 * between web (Canvas 2D) and mobile (React Native Skia) implementations.
 */

import type { CityData } from '../types/cityData';

/**
 * Target bounds for zoom calculation
 */
export interface TargetBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Zoom target with scale and translation offset
 */
export interface ZoomTarget {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * Scale and offset for coordinate transformation
 * (base transformation before user zoom/pan)
 */
export interface ScaleAndOffset {
  scale: number;
  offsetX: number;
  offsetZ: number;
}

/**
 * Find bounds for a building or district by path.
 *
 * Searches for the target by:
 * 1. Normalizing the path (trimming slashes)
 * 2. Checking exact district match (uses pre-calculated worldBounds)
 * 3. Checking exact building match (calculates bounds with padding)
 *
 * @param path - File or directory path to find
 * @param cityData - City data containing buildings and districts
 * @returns Target bounds or null if path not found
 */
export function findTargetBounds(
  path: string,
  cityData: CityData
): TargetBounds | null {
  if (!path || path === '') {
    // Empty path or root - return full city bounds
    return cityData.bounds;
  }

  // Normalize path (trim leading/trailing slashes)
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');

  // 1. Try exact district match
  const targetDistrict = cityData.districts.find(
    d => d.path === normalizedPath || d.path === path
  );

  if (targetDistrict) {
    return targetDistrict.worldBounds;
  }

  // 2. Try exact building match
  const targetBuilding = cityData.buildings.find(
    b => b.path === normalizedPath || b.path === path
  );

  if (targetBuilding) {
    // Create bounds around the building with padding
    const [width, , depth] = targetBuilding.dimensions;
    const padding = Math.max(width, depth) * 2;

    return {
      minX: targetBuilding.position.x - width / 2 - padding,
      maxX: targetBuilding.position.x + width / 2 + padding,
      minZ: targetBuilding.position.z - depth / 2 - padding,
      maxZ: targetBuilding.position.z + depth / 2 - padding,
    };
  }

  // Path not found
  return null;
}

/**
 * Calculate zoom target to frame bounds in viewport.
 *
 * Algorithm:
 * 1. Calculate target center in world coordinates
 * 2. Calculate target size in screen coordinates (at base scale)
 * 3. Calculate zoom scale needed to fit target with padding
 * 4. Calculate translation offset to center the target
 *
 * @param bounds - Target bounds to frame
 * @param cityData - City data (for bounds reference)
 * @param scaleAndOffset - Base coordinate transformation
 * @param canvasWidth - Viewport width in pixels
 * @param canvasHeight - Viewport height in pixels
 * @param maxZoom - Maximum allowed zoom level
 * @param padding - Padding factor (0-1), default 0.8 (80% of viewport)
 * @returns Zoom target with scale and translation offsets
 */
export function calculateZoomTarget(
  bounds: TargetBounds,
  cityData: CityData,
  scaleAndOffset: ScaleAndOffset,
  canvasWidth: number,
  canvasHeight: number,
  maxZoom: number,
  padding: number = 0.8
): ZoomTarget {
  const { scale: baseScale, offsetX: baseOffsetX, offsetZ: baseOffsetZ } = scaleAndOffset;

  // Calculate target center in world coordinates
  const targetCenterX = (bounds.minX + bounds.maxX) / 2;
  const targetCenterZ = (bounds.minZ + bounds.maxZ) / 2;

  // Calculate target size in screen coordinates (at base zoom)
  const targetScreenWidth = (bounds.maxX - bounds.minX) * baseScale;
  const targetScreenHeight = (bounds.maxZ - bounds.minZ) * baseScale;

  // Calculate zoom scale to fit target with padding (default 80% of display)
  const scaleToFitWidth = (canvasWidth * padding) / targetScreenWidth;
  const scaleToFitHeight = (canvasHeight * padding) / targetScreenHeight;
  const newZoomScale = Math.min(scaleToFitWidth, scaleToFitHeight, maxZoom);

  // Calculate the base screen position of target center (before zoom transform)
  // This matches the worldToCanvas formula: ((x - bounds.minX) * scale + offsetX)
  const baseScreenX = (targetCenterX - cityData.bounds.minX) * baseScale + baseOffsetX;
  const baseScreenY = (targetCenterZ - cityData.bounds.minZ) * baseScale + baseOffsetZ;

  // Calculate offset to center the target
  // Full formula: screenPos = baseScreenPos * zoomScale + zoomOffset
  // To center: displayCenter = baseScreen * zoomScale + zoomOffset
  // Therefore: zoomOffset = displayCenter - baseScreen * zoomScale
  const newOffsetX = canvasWidth / 2 - baseScreenX * newZoomScale;
  const newOffsetY = canvasHeight / 2 - baseScreenY * newZoomScale;

  return {
    scale: newZoomScale,
    translateX: newOffsetX,
    translateY: newOffsetY,
  };
}

/**
 * Calculate animation duration based on distance to travel.
 *
 * Returns a duration between 300ms and 800ms based on the normalized
 * distance for both scale and translation changes.
 *
 * @param currentScale - Current zoom scale
 * @param targetScale - Target zoom scale
 * @param currentTranslateX - Current X translation
 * @param targetTranslateX - Target X translation
 * @param currentTranslateY - Current Y translation
 * @param targetTranslateY - Target Y translation
 * @returns Animation duration in milliseconds (300-800)
 */
export function calculateAnimationDuration(
  currentScale: number,
  targetScale: number,
  currentTranslateX: number,
  targetTranslateX: number,
  currentTranslateY: number,
  targetTranslateY: number
): number {
  // Calculate scale delta (normalized to 0-1, assuming max scale change is 4x)
  const scaleDelta = Math.abs(targetScale - currentScale);
  const normalizedScaleDelta = Math.min(scaleDelta / 4, 1);

  // Calculate translation delta (normalized to 0-1, assuming max translate is 1000px)
  const translateDelta = Math.sqrt(
    Math.pow(targetTranslateX - currentTranslateX, 2) +
      Math.pow(targetTranslateY - currentTranslateY, 2)
  );
  const normalizedTranslateDelta = Math.min(translateDelta / 1000, 1);

  // Use the maximum of the two deltas
  const maxDelta = Math.max(normalizedScaleDelta, normalizedTranslateDelta);

  // Duration: 300ms to 800ms based on distance
  return Math.min(800, Math.max(300, maxDelta * 800));
}
