import { CityBuilding, CityDistrict } from '@principal-ai/code-city-builder';
export interface MapInteractionState {
    hoveredDistrict: CityDistrict | null;
    hoveredBuilding: CityBuilding | null;
    mousePos: {
        x: number;
        y: number;
    };
}
export interface MapDisplayOptions {
    showGrid: boolean;
    showConnections: boolean;
    maxConnections: number;
    gridSize: number;
    padding: number;
}
//# sourceMappingURL=react-types.d.ts.map