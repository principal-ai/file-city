import { CityData, SelectiveRenderOptions } from '@principal-ai/code-city-builder';
export declare const filterCityDataForSelectiveRender: (cityData: CityData, selectiveRender?: SelectiveRenderOptions) => CityData;
/**
 * Filter city data to only include a subdirectory and optionally remap coordinates
 * to make the subdirectory the new origin (0,0)
 */
export declare const filterCityDataForSubdirectory: (cityData: CityData, subdirectoryPath: string, autoCenter?: boolean) => CityData;
/**
 * Filter city data based on multiple directory filters with include/exclude modes
 */
export declare const filterCityDataForMultipleDirectories: (cityData: CityData, filters: Array<{
    path: string;
    mode: "include" | "exclude";
}>, autoCenter?: boolean, combineMode?: "union" | "intersection") => CityData;
//# sourceMappingURL=cityDataUtils.d.ts.map