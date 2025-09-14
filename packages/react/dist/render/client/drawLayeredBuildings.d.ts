import { CityBuilding, CityDistrict } from '@principal-ai/code-city-builder';
export type LayerRenderStrategy = 'border' | 'fill' | 'glow' | 'pattern' | 'cover' | 'icon' | 'custom';
export interface LayerItem {
    path: string;
    type: 'file' | 'directory';
    renderStrategy?: LayerRenderStrategy;
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
    customRender?: (ctx: CanvasRenderingContext2D, bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, scale: number) => void;
}
export interface HighlightLayer {
    id: string;
    name: string;
    enabled: boolean;
    color: string;
    opacity?: number;
    borderWidth?: number;
    priority: number;
    items: LayerItem[];
    dynamic?: boolean;
}
export declare function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number): void;
export declare function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number, highlightedCount: number, focusDirectory: string | null, fullSize: boolean, _rootDirectoryName?: string): void;
export declare function drawLayeredDistricts(ctx: CanvasRenderingContext2D, districts: CityDistrict[], worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, // This includes the zoom scale for text proportionality
layers: HighlightLayer[], hoveredDistrict?: CityDistrict | null, fullSize?: boolean, defaultDirectoryColor?: string, layoutConfig?: {
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
}, abstractedPaths?: Set<string>, // Paths of directories that are abstracted (have covers)
showDirectoryLabels?: boolean, borderRadius?: number): void;
export declare function drawLayeredBuildings(ctx: CanvasRenderingContext2D, buildings: CityBuilding[], worldToCanvas: (x: number, z: number) => {
    x: number;
    y: number;
}, scale: number, layers: HighlightLayer[], hoveredBuilding?: CityBuilding | null, defaultBuildingColor?: string, showFileNames?: boolean, hoverBorderColor?: string, disableOpacityDimming?: boolean, showFileTypeIcons?: boolean, borderRadius?: number): void;
//# sourceMappingURL=drawLayeredBuildings.d.ts.map