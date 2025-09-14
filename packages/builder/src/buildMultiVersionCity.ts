import { FileTree } from '@principal-ai/repository-abstraction';

import { CityData } from './types/cityData';

import { MultiVersionCityBuilder, MultiVersionOptions } from './MultiVersionCityBuilder';

/**
 * Build a multi-version city using the simplified approach.
 * This is the recommended way to build multi-version cities.
 */
export function buildMultiVersionCity(
  versionTrees: Map<string, FileTree>,
  options: MultiVersionOptions = {},
): {
  unionCity: CityData;
  presenceByVersion: Map<string, Set<string>>;
  getVersionView: (versionId: string, filterPrefix?: string) => CityData | undefined;
} {
  const result = MultiVersionCityBuilder.build(versionTrees, options);

  return {
    ...result,
    getVersionView: (versionId: string, filterPrefix?: string) => {
      const presentFiles = result.presenceByVersion.get(versionId);
      if (!presentFiles) return undefined;

      return MultiVersionCityBuilder.getVersionView(result.unionCity, presentFiles, {
        filterPrefix,
      });
    },
  };
}
