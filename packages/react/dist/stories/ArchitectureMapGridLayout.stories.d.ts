import type { StoryObj } from '@storybook/react';
import React from 'react';
import { CityData } from '@principal-ai/code-city-builder';
import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
declare const meta: {
    title: string;
    component: typeof ArchitectureMapHighlightLayers;
    parameters: {
        layout: string;
    };
    decorators: ((Story: import("@storybook/types").PartialStoryFn<import("@storybook/react").ReactRenderer, {
        cityData?: CityData | undefined;
        highlightLayers?: import("..").HighlightLayer[] | undefined;
        onLayerToggle?: ((layerId: string, enabled: boolean) => void) | undefined;
        showLayerControls?: boolean | undefined;
        defaultBuildingColor?: string | undefined;
        focusDirectory?: string | null | undefined;
        rootDirectoryName?: string | undefined;
        onDirectorySelect?: ((directory: string | null) => void) | undefined;
        onFileClick?: ((path: string, type: "file" | "directory") => void) | undefined;
        fullSize?: boolean | undefined;
        showGrid?: boolean | undefined;
        showFileNames?: boolean | undefined;
        className?: string | undefined;
        selectiveRender?: import("@principal-ai/code-city-builder").SelectiveRenderOptions | undefined;
        canvasBackgroundColor?: string | undefined;
        hoverBorderColor?: string | undefined;
        disableOpacityDimming?: boolean | undefined;
        defaultDirectoryColor?: string | undefined;
        subdirectoryMode?: {
            enabled?: boolean;
            rootPath?: string;
            autoCenter?: boolean;
            filters?: Array<{
                path: string;
                mode: "include" | "exclude";
            }>;
            combineMode?: "union" | "intersection";
        } | null | undefined;
        showFileTypeIcons?: boolean | undefined;
        showLegend?: boolean | undefined;
        showDirectoryLabels?: boolean | undefined;
        transform?: {
            rotation?: 0 | 90 | 180 | 270;
            flipHorizontal?: boolean;
            flipVertical?: boolean;
        } | undefined;
        onHover?: ((info: {
            hoveredDistrict: import("@principal-ai/code-city-builder").CityDistrict | null;
            hoveredBuilding: import("@principal-ai/code-city-builder").CityBuilding | null;
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
        }) => void) | undefined;
        buildingBorderRadius?: number | undefined;
        districtBorderRadius?: number | undefined;
    }>) => React.JSX.Element)[];
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const DefaultsTest: Story;
export declare const TwoByTwoGrid: Story;
export declare const ThreeByThreeGrid: Story;
export declare const SparseGrid: Story;
export declare const GridWithHighlights: Story;
export declare const LargeGrid: Story;
//# sourceMappingURL=ArchitectureMapGridLayout.stories.d.ts.map