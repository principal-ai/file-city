import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  CityData,
  diffMultiSourceCity,
  interpolateMultiSourceCity,
  MultiSourceCityDiff,
} from '@principal-ai/file-city-builder';

export interface UseCitySourceTransitionOptions {
  /** Duration of the transition in milliseconds. Default: 1500 */
  duration?: number;
  /** Auto-start transition when sources change. Default: false */
  autoStart?: boolean;
}

export interface UseCitySourceTransitionReturn {
  /** One result per source, containing interpolated city data for rendering. */
  sources: Array<{
    label: string;
    offset: { x: number; z: number };
    cityData: CityData;
    districtAppearingProgress: Record<string, number>;
  }>;
  /** Current overall animation progress (0-1). */
  progress: number;
  /** Whether a transition is running. */
  isTransitioning: boolean;
  /** Start the transition. */
  startTransition: () => void;
  /** Jump to a specific progress point. */
  setProgress: (t: number) => void;
  /** Reset to start (before). */
  reset: () => void;
  /** Jump to end (after). */
  finish: () => void;
}

export function useCitySourceTransition(
  beforeCityData: CityData | null,
  afterSources: Array<{ label: string; offset: { x: number; z: number }; cityData: CityData }>,
  options: UseCitySourceTransitionOptions = {},
): UseCitySourceTransitionReturn {
  const { duration = 1500, autoStart = false } = options;

  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Build the diff map and compute the multi-source diff
  const diff = useMemo<MultiSourceCityDiff | null>(() => {
    if (!beforeCityData || afterSources.length === 0) return null;
    const map = new Map<
      string,
      { cityData: CityData; label: string; offset: { x: number; z: number } }
    >();
    for (const s of afterSources) {
      map.set(s.label, { cityData: s.cityData, label: s.label, offset: s.offset });
    }
    return diffMultiSourceCity(beforeCityData, map);
  }, [beforeCityData, afterSources]);

  // Determine stage count
  const stageCount = useMemo(() => {
    if (!diff) return 1;
    const hasRemovals = diff.removed.length > 0;
    const hasMoves = diff.sources.some(s => s.movedCount > 0);
    const hasAdds = diff.sources.some(s => s.addedCount > 0);
    const hasNewDistricts = diff.sources.some(
      s => s.districts.some(d => d.changeType === 'added'),
    );
    const splitAdd = hasAdds && hasNewDistricts;
    return (
      (hasRemovals ? 1 : 0) + (hasMoves ? 1 : 0) + (splitAdd ? 2 : hasAdds ? 1 : 0)
    );
  }, [diff]);

  // Interpolate at the current progress
  const sources = useMemo(() => {
    if (!beforeCityData || afterSources.length === 0 || !diff) {
      return afterSources.map(s => ({
        label: s.label,
        offset: s.offset,
        cityData: s.cityData,
        districtAppearingProgress: {} as Record<string, number>,
      }));
    }

    const interpolated = interpolateMultiSourceCity(diff, progress, beforeCityData);

    return interpolated
      .map(is => ({
        label: is.label,
        offset: is.offset,
        cityData: is.currentCityData,
        districtAppearingProgress: is.districtAppearingProgress,
      }))
      // Drop empty layers (e.g. the removal layer once removals have faded).
      .filter(s => s.cityData.buildings.length > 0);
  }, [beforeCityData, afterSources, diff, progress]);

  // Animation loop
  const effectiveDuration = duration * stageCount;
  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const totalDuration = effectiveDuration;
      const t = Math.min(elapsed / totalDuration, 1);
      setProgress(t);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsTransitioning(false);
        animFrameRef.current = null;
        startTimeRef.current = null;
      }
    },
    [effectiveDuration],
  );

  const startTransition = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setProgress(0);
    startTimeRef.current = null;
    setIsTransitioning(true);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const setProgressFn = useCallback(
    (t: number) => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
        startTimeRef.current = null;
        setIsTransitioning(false);
      }
      setProgress(Math.max(0, Math.min(1, t)));
    },
    [],
  );

  const reset = useCallback(() => {
    setProgressFn(0);
  }, [setProgressFn]);

  const finish = useCallback(() => {
    setProgressFn(1);
  }, [setProgressFn]);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      startTransition();
    }
  }, [autoStart, startTransition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return {
    sources,
    progress,
    isTransitioning,
    startTransition,
    setProgress: setProgressFn,
    reset,
    finish,
  };
}