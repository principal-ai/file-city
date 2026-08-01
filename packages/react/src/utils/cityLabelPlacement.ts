export interface WorldRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CityLabelAnchorInput {
  /** World-space center of the city's grid cell. */
  positionOffset: { x: number; z: number };
  /** City footprint bounds (from cityData.bounds). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /**
   * Extra clearance between the city's back edge and the chip's bottom (near)
   * edge, in world units. Defaults to a small margin that scales with the
   * footprint depth.
   */
  backEdgeMargin?: number;
}

export interface CityLabelAnchor {
  /** World position for the label overlay. The chip's bottom edge lands here. */
  position: { x: number; y: number; z: number };
  /** Distance from the city's back edge to the anchor point. */
  gap: number;
  /** World-space rect of the city footprint. */
  footprintRect: WorldRect;
}

/**
 * Compute where a city label chip should sit relative to a city footprint.
 *
 * The chip's bottom (near) edge anchors just behind the city's back edge and
 * the chip extends away from the city (world -Z, the side away from the default
 * camera), so the chip always lands in the empty grid space behind the
 * footprint instead of overlaying its buildings.
 */
export function computeCityLabelAnchor(input: CityLabelAnchorInput): CityLabelAnchor {
  const { positionOffset, bounds, backEdgeMargin } = input;
  const halfD = (bounds.maxZ - bounds.minZ) / 2;
  const gap = backEdgeMargin ?? Math.max(8, halfD * 0.04);
  const z = positionOffset.z - halfD - gap;
  return {
    position: { x: positionOffset.x, y: 1.5, z },
    gap,
    footprintRect: {
      minX: positionOffset.x - (bounds.maxX - bounds.minX) / 2,
      maxX: positionOffset.x + (bounds.maxX - bounds.minX) / 2,
      minZ: positionOffset.z - halfD,
      maxZ: positionOffset.z + halfD,
    },
  };
}

export interface ChipWorldRectInput {
  /** Anchor from {@link computeCityLabelAnchor} — the chip's bottom edge lands here. */
  anchor: CityLabelAnchor;
  /** Rendered chip size in screen pixels. */
  chipSizePx: { width: number; height: number };
  /** World units per screen pixel at the chip's depth. */
  worldPerPx: number;
}

/**
 * World-space rect of the label chip. The chip is a screen-space overlay
 * anchored at its bottom edge, extending toward world -Z (away from the city)
 * by its full on-screen height.
 */
export function computeChipWorldRect(input: ChipWorldRectInput): WorldRect {
  const { anchor, chipSizePx, worldPerPx } = input;
  const ax = anchor.position.x;
  const az = anchor.position.z;
  const chipW = chipSizePx.width * worldPerPx;
  const chipH = chipSizePx.height * worldPerPx;
  return {
    minX: ax - chipW / 2,
    maxX: ax + chipW / 2,
    minZ: az - chipH,
    maxZ: az,
  };
}

export function rectsIntersect(a: WorldRect, b: WorldRect, tolerance = 0): boolean {
  return (
    a.minX < b.maxX - tolerance &&
    a.maxX > b.minX + tolerance &&
    a.minZ < b.maxZ - tolerance &&
    a.maxZ > b.minZ + tolerance
  );
}
