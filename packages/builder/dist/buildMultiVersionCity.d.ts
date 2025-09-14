import { FileTree } from '@principal-ai/repository-abstraction';
import { CityData } from './types/cityData';
import { MultiVersionOptions } from './MultiVersionCityBuilder';
/**
 * Build a multi-version city using the simplified approach.
 * This is the recommended way to build multi-version cities.
 */
export declare function buildMultiVersionCity(versionTrees: Map<string, FileTree>, options?: MultiVersionOptions): {
    unionCity: CityData;
    presenceByVersion: Map<string, Set<string>>;
    getVersionView: (versionId: string, filterPrefix?: string) => CityData | undefined;
};
//# sourceMappingURL=buildMultiVersionCity.d.ts.map