import { CityData } from '@principal-ai/code-city-builder';

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetZ: number;
  worldToCanvas: (x: number, z: number) => { x: number; y: number };
}

export function createDrawContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cityData: CityData,
  padding: number = 40,
): DrawContext {
  const { scale, offsetX, offsetZ } = calculateScaleAndOffset(
    cityData.bounds,
    width,
    height,
    padding,
  );

  const worldToCanvas = (x: number, z: number) => ({
    x: (x - cityData.bounds.minX) * scale + offsetX,
    y: (z - cityData.bounds.minZ) * scale + offsetZ,
  });

  return {
    ctx,
    width,
    height,
    scale,
    offsetX,
    offsetZ,
    worldToCanvas,
  };
}

function calculateScaleAndOffset(
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  width: number,
  height: number,
  padding: number,
) {
  const cityWidth = bounds.maxX - bounds.minX;
  const cityDepth = bounds.maxZ - bounds.minZ;

  const horizontalPadding = padding * 2;
  const verticalPadding = padding * 2;

  const scaleX = (width - horizontalPadding) / cityWidth;
  const scaleZ = (height - verticalPadding) / cityDepth;
  const scale = Math.min(scaleX, scaleZ);

  const scaledCityWidth = cityWidth * scale;
  const scaledCityHeight = cityDepth * scale;
  const offsetX = (width - scaledCityWidth) / 2;
  const offsetZ = (height - scaledCityHeight) / 2;

  return { scale, offsetX, offsetZ };
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, backgroundColor: string) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}
