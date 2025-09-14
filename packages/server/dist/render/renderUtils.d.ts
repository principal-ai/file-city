import { CityBuilding, CityDistrict } from '@principal-ai/code-city-builder';
import { ImportanceConfig } from '../types/importanceTypes';
import { ColorTheme, ColorFunction } from '../types/themes';
export declare enum RenderMode {
    HIGHLIGHT = "highlight",
    ISOLATE = "isolate"
}
/**
 * Draw a star at the given position
 */
export declare function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color?: string, strokeColor?: string, glow?: boolean): void;
/**
 * Draw multiple stars (for higher importance levels)
 */
export declare function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, size: number, config?: ImportanceConfig): void;
export declare function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number): void;
export declare function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number, highlightedCount: number, focusDirectory: string | null, fullSize: boolean, _rootDirectoryName?: string): void;
export declare function drawBuildingBorder(ctx: CanvasRenderingContext2D, building: CityBuilding, worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, color?: string, lineWidth?: number): void;
export declare function drawDistrictBorder(ctx: CanvasRenderingContext2D, district: CityDistrict, worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, color?: string, lineWidth?: number, dashPattern?: number[]): void;
export declare function drawDistricts(mode: RenderMode, ctx: CanvasRenderingContext2D, districts: CityDistrict[], worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, highlightedDirectories?: Set<string>, hoveredDirectories?: Set<string>, hoveredDistrict?: CityDistrict, fullSize?: boolean, emphasizedDirectories?: Set<string>, selectedPaths?: Set<string>, changedFiles?: Map<string, 'added' | 'modified' | 'deleted' | 'renamed'>, theme?: ColorTheme, customColorFn?: ColorFunction, defaultDirectoryColor?: string): void;
export declare function drawBuildings(mode: 'highlight' | 'isolate', ctx: CanvasRenderingContext2D, buildings: CityBuilding[], worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, highlightedPaths?: Set<string>, selectedPaths?: Set<string>, focusDirectory?: string, hoveredBuilding?: CityBuilding, theme?: ColorTheme, customColorFn?: ColorFunction, emphasizedDirectories?: Set<string>, showFileNames?: boolean, fullSize?: boolean, changedFiles?: Map<string, 'added' | 'modified' | 'deleted' | 'renamed'>, hoverBorderColor?: string, selectedBorderColor?: string, disableOpacityDimming?: boolean, importanceConfig?: ImportanceConfig): void;
/**
 * Draw a React symbol (⚛) at the given position
 */
export declare function drawReactSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color?: string, glow?: boolean): void;
export declare function drawConnections(ctx: CanvasRenderingContext2D, buildings: CityBuilding[], highlightedPaths: Set<string>, worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}): void;
//# sourceMappingURL=renderUtils.d.ts.map