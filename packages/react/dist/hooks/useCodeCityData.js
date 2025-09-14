"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCodeCityData = useCodeCityData;
const react_1 = require("react");
const code_city_builder_1 = require("@principal-ai/code-city-builder");
function useCodeCityData({ fileSystemTree, autoUpdate = true, }) {
    const [cityData, setCityData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // UI state
    const [highlightedPaths, setHighlightedPaths] = (0, react_1.useState)(new Set());
    const [selectedPaths, setSelectedPaths] = (0, react_1.useState)(new Set());
    const [focusDirectory, setFocusDirectory] = (0, react_1.useState)(null);
    // Rebuild city data
    const rebuild = (0, react_1.useMemo)(() => {
        return () => {
            if (!fileSystemTree) {
                setCityData(null);
                setError('No file system tree provided');
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                // Create a single-version map for the builder
                const versionMap = new Map([['main', fileSystemTree]]);
                const { unionCity } = code_city_builder_1.MultiVersionCityBuilder.build(versionMap);
                setCityData(unionCity);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to build city data');
                setCityData(null);
            }
            finally {
                setIsLoading(false);
            }
        };
    }, [fileSystemTree]);
    // Auto rebuild when dependencies change
    (0, react_1.useEffect)(() => {
        if (autoUpdate) {
            rebuild();
        }
    }, [autoUpdate, rebuild]);
    return {
        cityData,
        isLoading,
        error,
        rebuild,
        setHighlightedPaths,
        setSelectedPaths,
        setFocusDirectory,
        highlightedPaths,
        selectedPaths,
        focusDirectory,
    };
}
