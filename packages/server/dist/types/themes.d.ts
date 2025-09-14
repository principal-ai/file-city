export interface ColorTheme {
    name: string;
    colors: {
        [fileExtension: string]: string;
    };
    default: string;
}
export declare const THEMES: Record<string, ColorTheme>;
export type ColorFunction = (building: {
    fileExtension?: string;
    size?: number;
    lastModified?: Date;
    path: string;
}) => string | null;
/**
 * Get building color based on theme and optional custom function
 */
export declare function getBuildingColor(building: {
    fileExtension?: string;
    size?: number;
    lastModified?: Date;
    path: string;
}, theme: ColorTheme, customColorFn?: ColorFunction): string;
//# sourceMappingURL=themes.d.ts.map