import { FileTree as FileSystemTree } from '@principal-ai/repository-abstraction';
import { CodebaseView } from '@a24z/core-library';
import { CityData } from './types/cityData';
export interface MultiVersionOptions {
    gridLayout?: CodebaseView;
}
export interface MultiVersionResult {
    unionCity: CityData;
    presenceByVersion: Map<string, Set<string>>;
}
/**
 * Multi-version city builder that preserves all city data including grid labels.
 * This builder creates a single union city from multiple file trees and provides
 * filtered views for each version while maintaining all visual metadata.
 */
export declare class MultiVersionCityBuilder {
    /**
     * Build a multi-version city that preserves all metadata including grid labels
     */
    static build(versionTrees: Map<string, FileSystemTree>, options?: MultiVersionOptions): MultiVersionResult;
    /**
     * Get a filtered view of the city for a specific version
     */
    static getVersionView(unionCity: CityData, presentFiles: Set<string>, options?: {
        filterPrefix?: string;
    }): CityData;
    private static normalizeRootPath;
    private static mergeTreesByPath;
    private static buildPresenceSets;
}
//# sourceMappingURL=MultiVersionCityBuilder.d.ts.map