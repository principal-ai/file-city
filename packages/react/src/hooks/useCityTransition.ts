import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CityData,
  CityDiff,
  diffCityData,
  interpolateCityData,
  toCityData,
  InterpolatedBuilding,
} from '@principal-ai/file-city-builder';

export interface UseCityTransitionOptions {
  /** Duration of the transition in milliseconds. Default: 1500 */
  duration?: number;
  /** Easing function. Default: linear (0-1 mapped internally) */
  easing?: (t: number) => number;
  /** Whether to auto-start the transition when targetCityData changes. Default: false */
  autoStart?: boolean;
}

export interface UseCityTransitionReturn {
  /** The current interpolated city data (use this for rendering) */
  currentCityData: CityData;
  /** The current interpolated building data with opacity info */
  interpolatedBuildings: InterpolatedBuilding[];
  /** The computed diff between before and after */
  diff: CityDiff | null;
  /** Current animation progress (0-1) */
  progress: number;
  /** Whether a transition is currently running */
  isTransitioning: boolean;
  /** Start the transition from currentCityData to targetCityData */
  startTransition: () => void;
  /** Jump to a specific progress point (0 = before, 1 = after) */
  setProgress: (t: number) => void;
  /** Reset to the "before" state */
  reset: () => void;
  /** Jump to the "after" state */
  finish: () => void;
}

export function useCityTransition(
  beforeCityData: CityData,
  afterCityData: CityData,
  options: UseCityTransitionOptions = {},
): UseCityTransitionReturn {
  const { duration = 1500, autoStart = false } = options;

  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const beforeRef = useRef(beforeCityData);
  const afterRef = useRef(afterCityData);

  // Compute diff
  const [diff, setDiff] = useState<CityDiff | null>(() =>
    diffCityData(beforeCityData, afterCityData),
  );

  // Recompute diff when inputs change
  useEffect(() => {
    beforeRef.current = beforeCityData;
    afterRef.current = afterCityData;
    setDiff(diffCityData(beforeCityData, afterCityData));
  }, [beforeCityData, afterCityData]);

  // Interpolate at current progress
  const interpolated = diff
    ? interpolateCityData(diff, progress, afterCityData)
    : null;

  // Convert to CityData for the 3D component
  const currentCityData: CityData = interpolated
    ? toCityData(interpolated)
    : progress === 0
    ? beforeCityData
    : afterCityData;

  const interpolatedBuildings = interpolated?.buildings ?? [];

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);

      setProgress(t);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsTransitioning(false);
        animFrameRef.current = null;
        startTimeRef.current = null;
      }
    },
    [duration],
  );

  const startTransition = useCallback(() => {
    // Cancel any existing animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    // Reset to before state
    setProgress(0);
    startTimeRef.current = null;
    setIsTransitioning(true);

    // Start animation
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
    currentCityData,
    interpolatedBuildings,
    diff,
    progress,
    isTransitioning,
    startTransition,
    setProgress: setProgressFn,
    reset,
    finish,
  };
}
