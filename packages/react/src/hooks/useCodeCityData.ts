import { useState, useEffect, useMemo } from 'react';
import { FileTree as FileSystemTree } from '@principal-ai/file-city-builder';
import { MultiVersionCityBuilder, CityData } from '@principal-ai/file-city-builder';

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

export function useCodeCityData({
  fileSystemTree,
  autoUpdate = true,
}: UseCodeCityDataOptions): UseCodeCityDataReturn {
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [highlightedPaths, setHighlightedPaths] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [focusDirectory, setFocusDirectory] = useState<string | null>(null);

  // Rebuild city data
  const rebuild = useMemo(() => {
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
        const { unionCity } = MultiVersionCityBuilder.build(versionMap);
        setCityData(unionCity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to build city data');
        setCityData(null);
      } finally {
        setIsLoading(false);
      }
    };
  }, [fileSystemTree]);

  // Auto rebuild when dependencies change
  useEffect(() => {
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
