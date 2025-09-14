import React from 'react';
import { HighlightLayer } from '../render/client/drawLayeredBuildings';
import { CityData, CityBuilding, CityDistrict, SelectiveRenderOptions } from '@principal-ai/code-city-builder';
export interface ArchitectureMapHighlightLayersProps {
    cityData?: CityData;
    highlightLayers?: HighlightLayer[];
    onLayerToggle?: (layerId: string, enabled: boolean) => void;
    showLayerControls?: boolean;
    defaultBuildingColor?: string;
    focusDirectory?: string | null;
    rootDirectoryName?: string;
    onDirectorySelect?: (directory: string | null) => void;
    onFileClick?: (path: string, type: 'file' | 'directory') => void;
    fullSize?: boolean;
    showGrid?: boolean;
    showFileNames?: boolean;
    className?: string;
    selectiveRender?: SelectiveRenderOptions;
    canvasBackgroundColor?: string;
    hoverBorderColor?: string;
    disableOpacityDimming?: boolean;
    defaultDirectoryColor?: string;
    subdirectoryMode?: {
        enabled?: boolean;
        rootPath?: string;
        autoCenter?: boolean;
        filters?: Array<{
            path: string;
            mode: 'include' | 'exclude';
        }>;
        combineMode?: 'union' | 'intersection';
    } | null;
    showFileTypeIcons?: boolean;
    showLegend?: boolean;
    showDirectoryLabels?: boolean;
    transform?: {
        rotation?: 0 | 90 | 180 | 270;
        flipHorizontal?: boolean;
        flipVertical?: boolean;
    };
    onHover?: (info: {
        hoveredDistrict: CityDistrict | null;
        hoveredBuilding: CityBuilding | null;
        mousePos: {
            x: number;
            y: number;
        };
        fileTooltip: {
            text: string;
        } | null;
        directoryTooltip: {
            text: string;
        } | null;
        fileCount: number | null;
    }) => void;
    buildingBorderRadius?: number;
    districtBorderRadius?: number;
}
export declare function ArchitectureMapHighlightLayers({ cityData, highlightLayers, onLayerToggle, focusDirectory, rootDirectoryName, onDirectorySelect, onFileClick, fullSize, showGrid, showFileNames, className, selectiveRender, canvasBackgroundColor, hoverBorderColor, disableOpacityDimming, defaultDirectoryColor, defaultBuildingColor, subdirectoryMode, showLayerControls, showFileTypeIcons, showLegend, showDirectoryLabels, transform, // Default to no rotation
onHover, buildingBorderRadius, districtBorderRadius, }: ArchitectureMapHighlightLayersProps): React.JSX.Element;
//# sourceMappingURL=ArchitectureMapHighlightLayers.d.ts.map