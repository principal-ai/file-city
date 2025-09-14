import { CityData } from '@principal-ai/code-city-builder';
export interface DrawContext {
    ctx: any;
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetZ: number;
    worldToCanvas: (x: number, z: number) => {
        x: number;
        y: number;
    };
}
export declare function createDrawContext(ctx: any, width: number, height: number, cityData: CityData, padding?: number): DrawContext;
export declare function clearCanvas(ctx: any, width: number, height: number, backgroundColor: string): void;
//# sourceMappingURL=drawingUtils.d.ts.map