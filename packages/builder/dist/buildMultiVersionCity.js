import { MultiVersionCityBuilder } from './MultiVersionCityBuilder';
/**
 * Build a multi-version city using the simplified approach.
 * This is the recommended way to build multi-version cities.
 */
export function buildMultiVersionCity(versionTrees, options = {}) {
    const result = MultiVersionCityBuilder.build(versionTrees, options);
    return {
        ...result,
        getVersionView: (versionId, filterPrefix) => {
            const presentFiles = result.presenceByVersion.get(versionId);
            if (!presentFiles)
                return undefined;
            return MultiVersionCityBuilder.getVersionView(result.unionCity, presentFiles, {
                filterPrefix,
            });
        },
    };
}
//# sourceMappingURL=buildMultiVersionCity.js.map