import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  CityData,
  CodeCityBuilderWithGrid,
  excludeDirectoryFromFileTree,
  diffCityData,
  interpolateCityData,
  toCityData,
} from '@principal-ai/file-city-builder';
import type { FileTree } from '@principal-ai/repository-abstraction';

export interface UseDirectoryHideOptions {
  /** Duration of the hide/show animation in milliseconds. Default: 1500 */
  duration?: number;
  /** Treemap layout options passed to the builder */
  layoutOptions?: {
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingInner?: number;
    paddingOuter?: number;
  };
}

export interface UseDirectoryHideReturn {
  /** Current city data to render */
  currentCityData: CityData;
  /** Whether the directory is currently hidden */
  isHidden: boolean;
  /** Current animation progress (0 = fully visible, 1 = fully hidden) */
  progress: number;
  /** Whether an animation is currently running */
  isAnimating: boolean;
  /** Hide the directory (animate from visible to hidden) */
  hide: () => void;
  /** Show the directory (animate from hidden to visible) */
  show: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Jump to hidden state without animation */
  skipToHidden: () => void;
  /** Jump to visible state without animation */
  skipToVisible: () => void;
}

export function useDirectoryHide(
  fileTree: FileTree,
  directoryPath: string,
  options: UseDirectoryHideOptions = {},
): UseDirectoryHideReturn {
  const { duration = 1500, layoutOptions = {} } = options;

  // Build both city data states
  const fullCityData = useMemo(() => {
    const builder = new CodeCityBuilderWithGrid();
    return builder.buildCityFromFileSystem(fileTree, '', layoutOptions);
  }, [fileTree, layoutOptions]);

  const hiddenCityData = useMemo(() => {
    const filteredTree = excludeDirectoryFromFileTree(fileTree, directoryPath);
    if (filteredTree.allFiles.length === 0) {
      return fullCityData;
    }
    const builder = new CodeCityBuilderWithGrid();
    return builder.buildCityFromFileSystem(filteredTree, '', layoutOptions);
  }, [fileTree, directoryPath, layoutOptions, fullCityData]);

  const [progress, setProgress] = useState(0);
  const [isHidden, setIsHidden] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const directionRef = useRef<'hiding' | 'showing'>('hiding');
  const isVisibleRef = useRef(true);

  // Compute diff (always from full → hidden, we flip progress manually)
  const diff = useMemo(() => diffCityData(fullCityData, hiddenCityData), [fullCityData, hiddenCityData]);

  // Interpolate based on direction
  const currentCityData = useMemo(() => {
    const t = directionRef.current === 'hiding' ? progress : 1 - progress;
    const interpolated = interpolateCityData(diff, t, hiddenCityData);
    return toCityData(interpolated);
  }, [diff, progress, hiddenCityData]);

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
        const nowVisible = directionRef.current === 'showing';
        isVisibleRef.current = nowVisible;
        setIsHidden(!nowVisible);
        setIsAnimating(false);
        animFrameRef.current = null;
        startTimeRef.current = null;
      }
    },
    [duration],
  );

  const startAnimation = useCallback(
    (direction: 'hiding' | 'showing') => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      directionRef.current = direction;
      setProgress(0);
      startTimeRef.current = null;
      setIsAnimating(true);
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [animate],
  );

  const hide = useCallback(() => {
    if (!isVisibleRef.current) return;
    startAnimation('hiding');
  }, [startAnimation]);

  const show = useCallback(() => {
    if (isVisibleRef.current) return;
    startAnimation('showing');
  }, [startAnimation]);

  const toggle = useCallback(() => {
    if (isVisibleRef.current) {
      hide();
    } else {
      show();
    }
  }, [hide, show]);

  const skipToHidden = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
    isVisibleRef.current = false;
    setIsHidden(true);
    setIsAnimating(false);
    directionRef.current = 'hiding';
    setProgress(1);
  }, []);

  const skipToVisible = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
    isVisibleRef.current = true;
    setIsHidden(false);
    setIsAnimating(false);
    directionRef.current = 'hiding';
    setProgress(0);
  }, []);

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
    isHidden,
    progress,
    isAnimating,
    hide,
    show,
    toggle,
    skipToHidden,
    skipToVisible,
  };
}
