import { FileTree as FileSystemTree } from '@principal-ai/code-city-builder';
import { CityData } from '@principal-ai/code-city-builder';
export interface UseCodeCityDataOptions {
    fileSystemTree?: FileSystemTree;
    autoUpdate?: boolean;
    colorMapping?: Record<string, string>;
}
export interface UseCodeCityDataReturn {
    cityData: CityData | null;
    isLoading: boolean;
    error: string | null;
    rebuild: () => void;
    setHighlightedPaths: (paths: Set<string>) => void;
    setSelectedPaths: (paths: Set<string>) => void;
    setFocusDirectory: (directory: string | null) => void;
    highlightedPaths: Set<string>;
    selectedPaths: Set<string>;
    focusDirectory: string | null;
}
export declare function useCodeCityData({ fileSystemTree, autoUpdate, }: UseCodeCityDataOptions): UseCodeCityDataReturn;
//# sourceMappingURL=useCodeCityData.d.ts.map