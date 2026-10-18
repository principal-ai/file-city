import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTheme } from '@principal-ade/industry-theme';

import {
  filterCityDataForSelectiveRender,
  filterCityDataForSubdirectory,
  filterCityDataForMultipleDirectories,
} from '../builder/cityDataUtils';
import {
  drawLayeredBuildings,
  drawLayeredDistricts,
  drawGrid,
  HighlightLayer,
  LayerItem,
  LayerIndex,
} from '../render/client/drawLayeredBuildings';
import {
  CityData,
  CityBuilding,
  CityDistrict,
  SelectiveRenderOptions,
} from '@principal-ai/file-city-builder';
import { MapInteractionState, MapDisplayOptions } from '../types/react-types';
import { getDefaultFileColorConfig } from '../utils/fileColorHighlightLayers';
import { extractIconConfig } from '../utils/fileTypeIcons';
import { resolveVisualizationIntent } from '../utils/visualizationResolution';
import type { CitySource, IsolationMode, SafeArea } from './FileCity3D';
import { resolveSourceOffsets, computeGlobalBounds } from '../utils/citySourceLayout';

const DEFAULT_DISPLAY_OPTIONS: MapDisplayOptions = {
  showGrid: false,
  showConnections: true,
  maxConnections: 20,
  gridSize: 50,
  padding: 20,
};

export interface ArchitectureMapHighlightLayersProps {
  // Core data — one city, or several (mirrors FileCity3D). When `citySources`
  // is set it renders instead of `cityData` (each source at its resolved
  // offset) and the canvas fits the combined bounds; `cityData` is ignored.
  cityData?: CityData;
  citySources?: CitySource[];
  /** Gap (world units) between grid cells when sources use `gridCell`. */
  gridGap?: number;
  /** Sources to focus: every other source is dimmed to `dimOpacity`.
   *  Omitted/empty = overview framing, no dim. Compared by object reference. */
  focusedSources?: CitySource[];
  /** Fired when a repo label is clicked; receives `null` for a clear-focus
   *  intent (clicking the already-focused source). */
  onSourceFocusChange?: (source: CitySource | null) => void;

  // Layer-based highlighting instead of path sets
  highlightLayers?: HighlightLayer[];
  onLayerToggle?: (layerId: string, enabled: boolean) => void;
  showLayerControls?: boolean;
  defaultBuildingColor?: string;

  // Navigation and interaction
  focusDirectory?: string | null;
  rootDirectoryName?: string;
  onDirectorySelect?: (directory: string | null) => void;
  onDirectoryHover?: (directory: string | null) => void;
  onBuildingClick?: (building: CityBuilding, event: MouseEvent) => void;
  onBuildingHover?: (building: CityBuilding | null) => void;
  enableZoom?: boolean;

  // Animated focus framing. 2D-only companions (the 3D camera animation
  // exposes no completion callback).
  onZoomComplete?: () => void; // Called when the focus animation completes
  zoomAnimationSpeed?: number; // Animation easing factor (0-1), default 0.12

  // Safe area — inset rect (fractions of the canvas) the flat city frames
  // itself into, matching FileCity3D's `safeArea`. The canvas stays full-size;
  // the fit (and hit-testing) treat the inner rect as the boundary.
  safeArea?: SafeArea;

  // Display options
  fullSize?: boolean;
  showGrid?: boolean;
  showFileNames?: boolean;
  className?: string;

  // Selective rendering
  selectiveRender?: SelectiveRenderOptions;

  // Canvas appearance
  canvasBackgroundColor?: string;
  maxCanvasSize?: number; // Maximum canvas dimension in pixels (default: 6000, use ~2048 for mobile)

  // Additional styling options
  hoverBorderColor?: string;
  /** How to handle non-highlighted buildings when highlights are active
   *  (`none` | `transparent` | `collapse` | `hide`). Defaults to `collapse`
   *  when highlights are present, `none` otherwise — same as FileCity3D. */
  isolationMode?: IsolationMode;
  /** Opacity for dimmed buildings (`transparent` isolation) and for unfocused
   *  sources. Default 0.2. */
  dimOpacity?: number;
  defaultDirectoryColor?: string;

  // Subdirectory mode
  subdirectoryMode?: {
    enabled?: boolean;
    rootPath?: string;
    autoCenter?: boolean;
    filters?: Array<{ path: string; mode: 'include' | 'exclude' }>;
    combineMode?: 'union' | 'intersection';
  } | null;

  // Additional display options
  showFileTypeIcons?: boolean;
  showDirectoryLabels?: boolean; // Control visibility of directory labels

  // Transformation options
  transform?: {
    rotation?: 0 | 90 | 180 | 270; // Rotation in degrees
    flipHorizontal?: boolean; // Mirror along vertical axis
    flipVertical?: boolean; // Mirror along horizontal axis
  };

  /** Rich hover payload (2D-only extras: mouse position, tooltips, file
   *  count). Fires alongside `onBuildingHover`; ignore if you don't need it. */
  onHoverInfo?: (info: {
    hoveredDistrict: CityDistrict | null;
    hoveredBuilding: CityBuilding | null;
    mousePos: { x: number; y: number };
    fileTooltip: { text: string } | null;
    directoryTooltip: { text: string } | null;
    fileCount: number | null;
  }) => void;

  // Border radius configuration
  buildingBorderRadius?: number; // Border radius for buildings (files), default: 0 (sharp corners)
  districtBorderRadius?: number; // Border radius for districts (directories), default: 0 (sharp corners)

  /** Color to highlight the focused directory border (hex color, e.g. "#3b82f6") */
  focusColor?: string | null;

  /** Base file type color layers (resolved with highlightLayers) */
  fileColorLayers?: HighlightLayer[];
}

// Spatial Grid for fast hit testing (copied from original for now)
class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, (CityBuilding | CityDistrict)[]> = new Map();
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    cellSize: number = 100,
  ) {
    this.bounds = bounds;
    this.cellSize = cellSize;
  }

  private getCellsForBounds(minX: number, maxX: number, minZ: number, maxZ: number): string[] {
    const cells: string[] = [];
    const startCellX = Math.floor((minX - this.bounds.minX) / this.cellSize);
    const endCellX = Math.floor((maxX - this.bounds.minX) / this.cellSize);
    const startCellZ = Math.floor((minZ - this.bounds.minZ) / this.cellSize);
    const endCellZ = Math.floor((maxZ - this.bounds.minZ) / this.cellSize);

    for (let x = startCellX; x <= endCellX; x++) {
      for (let z = startCellZ; z <= endCellZ; z++) {
        cells.push(`${x},${z}`);
      }
    }
    return cells;
  }

  addBuilding(building: CityBuilding): void {
    const size = Math.max(building.dimensions[0], building.dimensions[2]);
    const halfSize = size / 2;
    const minX = building.position.x - halfSize;
    const maxX = building.position.x + halfSize;
    const minZ = building.position.z - halfSize;
    const maxZ = building.position.z + halfSize;

    const cells = this.getCellsForBounds(minX, maxX, minZ, maxZ);
    cells.forEach(cellKey => {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      const cellItems = this.grid.get(cellKey);
      if (cellItems) {
        cellItems.push(building);
      }
    });
  }

  addDistrict(district: CityDistrict): void {
    const cells = this.getCellsForBounds(
      district.worldBounds.minX,
      district.worldBounds.maxX,
      district.worldBounds.minZ,
      district.worldBounds.maxZ,
    );
    cells.forEach(cellKey => {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      const cellItems = this.grid.get(cellKey);
      if (cellItems) {
        cellItems.push(district);
      }
    });
  }

  query(x: number, z: number, radius: number = 10): (CityBuilding | CityDistrict)[] {
    const cells = this.getCellsForBounds(x - radius, x + radius, z - radius, z + radius);
    const results: (CityBuilding | CityDistrict)[] = [];
    const seen = new Set<string>();

    cells.forEach(cellKey => {
      const items = this.grid.get(cellKey);
      if (items) {
        items.forEach(item => {
          const key = 'dimensions' in item ? `b_${item.path}` : `d_${item.path}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(item);
          }
        });
      }
    });

    return results;
  }

  clear(): void {
    this.grid.clear();
  }
}

/**
 * Hierarchical path lookup for O(depth) containment checks instead of O(A) iteration.
 * Given a set of abstracted paths, efficiently checks if a path is contained within any of them.
 */
class PathHierarchyLookup {
  private abstractedPaths: Set<string>;

  constructor(paths: Set<string> | string[]) {
    this.abstractedPaths = paths instanceof Set ? paths : new Set(paths);
  }

  /**
   * Check if the given path is inside any abstracted directory.
   * Walks up the path hierarchy checking each ancestor.
   * Complexity: O(depth) where depth is the path depth, instead of O(A) for each abstracted path.
   */
  isPathAbstracted(path: string): boolean {
    // Check for root abstraction
    if (this.abstractedPaths.has('')) {
      return true;
    }

    // Walk up the path hierarchy
    let currentPath = path;
    while (currentPath.includes('/')) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      if (this.abstractedPaths.has(currentPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the path is a direct child of an abstracted directory
   * (the path itself is abstracted, not just its ancestors).
   */
  isDirectlyAbstracted(path: string): boolean {
    return this.abstractedPaths.has(path);
  }

  /**
   * Check if the path is a child (not itself) of any abstracted directory.
   */
  isChildOfAbstracted(path: string): boolean {
    if (!path) return false;

    // Check for root abstraction first
    if (this.abstractedPaths.has('')) {
      return true;
    }

    // Check each abstracted path to see if this path starts with it
    for (const abstractedPath of this.abstractedPaths) {
      if (abstractedPath && path.startsWith(abstractedPath + '/')) {
        return true;
      }
    }

    return false;
  }

  get size(): number {
    return this.abstractedPaths.size;
  }

  has(path: string): boolean {
    return this.abstractedPaths.has(path);
  }
}

interface HitTestCache {
  spatialGrid: SpatialGrid;
  transformParams: {
    scale: number;
    offsetX: number;
    offsetZ: number;
    zoomScale: number;
    zoomOffsetX: number;
    zoomOffsetY: number;
  };
  abstractedPaths: Set<string>;
  pathLookup: PathHierarchyLookup;
  timestamp: number;
}

/** Screen-space rect of a rendered source label, for click hit-testing. */
interface LabelHitRect {
  x: number;
  y: number;
  width: number;
  height: number;
  source: CitySource;
}

/** A source label's world anchor plus the source's dim state. */
interface SourceLabelPlacement {
  source: CitySource;
  focused: boolean;
  dim: number;
  /** Fade-in progress (0-1) from `useCitySourceTransition`. */
  labelProgress: number;
  x: number;
  z: number;
}

/**
 * One source's draw group in a multi-city layout. Each carries its own
 * highlight layers / isolation / focus / color (matching FileCity3D's
 * MultiCityScene, which reads these from `CitySource` rather than the
 * top-level props) plus its buildings/districts shifted into the shared
 * global X/Z space.
 */
interface SourceDrawGroup {
  source: CitySource;
  dim: number;
  buildings: CityBuilding[];
  districts: CityDistrict[];
  layers: HighlightLayer[];
  isolationMode: IsolationMode;
  focusDirectory: string | null;
  focusColor: string | null;
  defaultBuildingColor?: string;
  districtAppearingProgress?: Record<string, number>;
}

function ArchitectureMapHighlightLayersInner({
  cityData,
  citySources,
  gridGap,
  focusedSources,
  onSourceFocusChange,
  highlightLayers: externalHighlightLayers,
  onLayerToggle,
  focusDirectory = null,
  rootDirectoryName,
  onDirectorySelect,
  onDirectoryHover,
  onBuildingClick,
  onBuildingHover,
  enableZoom = false,
  onZoomComplete,
  zoomAnimationSpeed = 0.12,
  safeArea,
  fullSize = false,
  showGrid = false,
  showFileNames = false,
  className = '',
  selectiveRender,
  canvasBackgroundColor,
  maxCanvasSize,
  hoverBorderColor,
  isolationMode: externalIsolationMode,
  dimOpacity = 0.2,
  defaultDirectoryColor,
  defaultBuildingColor,
  subdirectoryMode,
  showLayerControls = false,
  showFileTypeIcons = true,
  showDirectoryLabels = true,
  transform = { rotation: 0 }, // Default to no rotation
  onHoverInfo,
  buildingBorderRadius = 0,
  districtBorderRadius = 0,
  focusColor: externalFocusColor,
  fileColorLayers,
}: ArchitectureMapHighlightLayersProps) {
  const { theme } = useTheme();

  // ============================================================================
  // Visualization Resolution
  // Always resolve: combines highlightLayers with fileColorLayers,
  // filtering fileColorLayers based on focus/highlight scope.
  // ============================================================================
  const resolved = useMemo(() => {
    // Cast to InputHighlightLayer[] for resolution - types are compatible at runtime
    const resolution = resolveVisualizationIntent({
      focusPath: focusDirectory,
      focusColor: externalFocusColor,
      highlightLayers: (externalHighlightLayers ?? []) as Parameters<typeof resolveVisualizationIntent>[0]['highlightLayers'],
      fileColorLayers: (fileColorLayers ?? []) as Parameters<typeof resolveVisualizationIntent>[0]['fileColorLayers'],
    });

    return {
      highlightLayers: resolution.highlightLayers,
      focusPath: resolution.cameraFocusPath,
      focusColor: resolution.focusColor,
      shouldIsolate: resolution.shouldIsolate,
    };
  }, [
    fileColorLayers,
    externalHighlightLayers,
    focusDirectory,
    externalFocusColor,
  ]);

  // Use resolved values, ensuring layers have required priority for drawing functions
  const highlightLayers: HighlightLayer[] = useMemo(() =>
    resolved.highlightLayers.map((layer, index) => ({
      ...layer,
      priority: layer.priority ?? index,
    })) as HighlightLayer[],
    [resolved.highlightLayers]
  );
  const focusPath = resolved.focusPath;
  const focusColor = resolved.focusColor;

  // Isolation — mirror FileCity3D's resolution: `collapse` when highlights are
  // active, `none` otherwise, unless the host sets it explicitly.
  const hasActiveHighlights = useMemo(
    () => highlightLayers.some(l => l.enabled && l.items.length > 0),
    [highlightLayers],
  );
  const isolationMode: IsolationMode =
    externalIsolationMode ?? (resolved.shouldIsolate ? 'collapse' : 'none');

  // --- Multi-source model --------------------------------------------------
  // When `citySources` is set, each source's buildings/districts are shifted
  // into one shared global X/Z space (centered on its resolved offset — the
  // same math FileCity3D uses) so the fit, hit-testing, abstraction, and focus
  // run against a single synthetic city. Drawing, however, stays *per source*:
  // each group carries its own highlight layers, isolation mode, directory
  // focus, and default building color — matching FileCity3D's MultiCityScene,
  // which reads those from `CitySource` rather than the top-level props.
  const sourceModel = useMemo(() => {
    if (!citySources || citySources.length === 0) return null;

    // Base file-type colors (unscoped) — per-source layers sit on top.
    const fileColorOnly = resolveVisualizationIntent({
      focusPath: null,
      highlightLayers: [],
      fileColorLayers: (fileColorLayers ?? []) as Parameters<
        typeof resolveVisualizationIntent
      >[0]['fileColorLayers'],
    }).highlightLayers as HighlightLayer[];

    const offsets = resolveSourceOffsets(citySources, gridGap);
    const global = computeGlobalBounds(citySources, offsets);
    const focusedSet =
      focusedSources && focusedSources.length > 0 ? new Set(focusedSources) : null;

    const buildings: CityBuilding[] = [];
    const districts: CityDistrict[] = [];
    const groups: SourceDrawGroup[] = [];
    const labels: SourceLabelPlacement[] = [];

    citySources.forEach((s, i) => {
      const b = s.cityData.bounds;
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const dx = offsets[i].x - cx;
      const dz = offsets[i].z - cz;
      const focused = focusedSet ? focusedSet.has(s) : false;
      const dimmed = focusedSet !== null && !focused;
      // Per-source alpha: an explicit `cityDim` wins; else focus-driven dim.
      const dim = s.cityDim ?? (dimmed ? dimOpacity : 1);

      const gBuildings: CityBuilding[] = s.cityData.buildings.map(bd => ({
        ...bd,
        position: { ...bd.position, x: bd.position.x + dx, z: bd.position.z + dz },
      }));
      const gDistricts: CityDistrict[] = s.cityData.districts.map(d => ({
        ...d,
        worldBounds: {
          minX: d.worldBounds.minX + dx,
          maxX: d.worldBounds.maxX + dx,
          minZ: d.worldBounds.minZ + dz,
          maxZ: d.worldBounds.maxZ + dz,
        },
      }));

      buildings.push(...gBuildings);
      districts.push(...gDistricts);
      groups.push({
        source: s,
        dim,
        buildings: gBuildings,
        districts: gDistricts,
        layers: [...(s.highlightLayers ?? []), ...fileColorOnly],
        isolationMode: s.isolationMode ?? 'none',
        focusDirectory: s.focusDirectory ?? null,
        focusColor: s.focusColor ?? null,
        defaultBuildingColor: s.defaultBuildingColor,
        districtAppearingProgress: s.districtAppearingProgress,
      });

      // Labels: synthetic removal layers draw no badge, and a source dimmed by
      // focus hides its label (mirrors FileCity3D's MultiCityScene).
      if (s.label && !s.isRemovalLayer && !dimmed) {
        const labelProgress = Math.max(0, Math.min(1, s.labelProgress ?? 1));
        if (labelProgress > 0) {
          const depth = b.maxZ - b.minZ;
          const halfD = depth / 2;
          // Same clearance 3D uses (computeCityLabelAnchor): a small gap behind
          // the back edge so the chip doesn't sit flush against the footprint.
          const gap = Math.max(8, halfD * 0.04);
          labels.push({
            source: s,
            focused,
            dim,
            labelProgress,
            x: offsets[i].x,
            z: offsets[i].z - halfD - gap,
          });
        }
      }
    });

    const merged: CityData = {
      ...citySources[0].cityData,
      bounds: {
        minX: global.minX,
        maxX: global.maxX,
        minZ: global.minZ,
        maxZ: global.maxZ,
      },
      buildings,
      districts,
    };

    return { merged, groups, labels };
  }, [citySources, gridGap, focusedSources, dimOpacity, fileColorLayers]);

  // The city everything downstream renders/fits against — the merged
  // multi-source city, or the single `cityData` prop.
  const sourceCityData: CityData | undefined = sourceModel
    ? sourceModel.merged
    : cityData;

  // Screen-space rects of the source labels, written during the draw pass and
  // read by the click handler to drive `onSourceFocusChange`.
  const labelRectsRef = useRef<LabelHitRect[]>([]);

  // Reserve a top band for the source label chips (13px text + 2×4px pad + 8px
  // gap, plus a little room) so the fitted city leaves space for them instead
  // of clipping the top row's labels. Keyed on multi-source mode rather than
  // the current label list so the fit doesn't jump mid-transition as labels
  // fade in.
  const labelBandPx = citySources && citySources.length > 0 ? 34 : 0;

  // Focus-out dimming: `focusDirectory` recedes every building outside its
  // subtree (independent of highlight layers), mirroring FileCity3D.
  const focusOutDim = useCallback(
    (b: CityBuilding, focusDir: string | null, base = 1) => {
      let mul = base;
      if (focusDir) {
        const fp = focusDir.replace(/\/+$/, '');
        const inFocus = b.path === fp || b.path.startsWith(fp + '/');
        if (!inFocus) mul *= dimOpacity;
      }
      return mul;
    },
    [dimOpacity],
  );

  // Use theme colors as defaults, with prop overrides
  const resolvedCanvasBackgroundColor = canvasBackgroundColor ?? theme.colors.background;
  const resolvedHoverBorderColor = hoverBorderColor ?? theme.colors.text;
  const resolvedDefaultDirectoryColor = defaultDirectoryColor ?? theme.colors.backgroundSecondary;
  const resolvedDefaultBuildingColor = defaultBuildingColor ?? theme.colors.muted;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract icon configuration from file color config
  const iconMap = useMemo(() => {
    const colorConfig = getDefaultFileColorConfig();
    return extractIconConfig(colorConfig);
  }, []);

  const [interactionState, setInteractionState] = useState<MapInteractionState>({
    hoveredDistrict: null,
    hoveredBuilding: null,
    mousePos: { x: 0, y: 0 },
  });

  const [zoomState, setZoomState] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMousePos: { x: 0, y: 0 },
    hasMouseMoved: false,
  });

  // Target zoom state for animated transitions
  const [targetZoom, setTargetZoom] = useState<{
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Stable zoom scale - only updates when animation completes or user stops zooming
  // Used for expensive calculations that shouldn't run every frame
  const [stableZoomScale, setStableZoomScale] = useState(1);
  const stableZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if we're currently animating
  const isAnimating = targetZoom !== null;

  // Track the last focusPath to detect changes
  const lastFocusPathRef = useRef<string | null>(null);

  // Throttle ref for hover updates (improves performance with large datasets)
  const lastHoverUpdateRef = useRef<number>(0);
  const HOVER_THROTTLE_MS = 16; // ~60fps max for hover updates

  useEffect(() => {
    // Reset user interaction state when enableZoom is disabled. Programmatic
    // focus (`focusDirectory`) is always honored regardless of `enableZoom`.
    if (!enableZoom) {
      setZoomState(prev => ({
        ...prev,
        isDragging: false,
        hasMouseMoved: false,
      }));
    }
  }, [enableZoom]);

  // Animation loop for smooth zoom transitions
  useEffect(() => {
    if (!targetZoom) return;

    const animate = () => {
      setZoomState(prev => {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const easing = zoomAnimationSpeed;

        const newScale = lerp(prev.scale, targetZoom.scale, easing);
        const newOffsetX = lerp(prev.offsetX, targetZoom.offsetX, easing);
        const newOffsetY = lerp(prev.offsetY, targetZoom.offsetY, easing);

        // Check if close enough to target (within 0.1% for scale, 0.5px for offset)
        const scaleDone = Math.abs(newScale - targetZoom.scale) < 0.001;
        const offsetXDone = Math.abs(newOffsetX - targetZoom.offsetX) < 0.5;
        const offsetYDone = Math.abs(newOffsetY - targetZoom.offsetY) < 0.5;

        if (scaleDone && offsetXDone && offsetYDone) {
          // Animation complete - set exact target values
          setTargetZoom(null);
          onZoomComplete?.();
          return {
            ...prev,
            scale: targetZoom.scale,
            offsetX: targetZoom.offsetX,
            offsetY: targetZoom.offsetY,
          };
        }

        return {
          ...prev,
          scale: newScale,
          offsetX: newOffsetX,
          offsetY: newOffsetY,
        };
      });
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetZoom, zoomState, zoomAnimationSpeed, onZoomComplete]);

  // Update stable zoom scale with debouncing
  // This ensures expensive calculations only run when zoom stabilizes
  useEffect(() => {
    // Clear any pending timeout
    if (stableZoomTimeoutRef.current) {
      clearTimeout(stableZoomTimeoutRef.current);
    }

    // If animating, wait for animation to complete
    if (isAnimating) {
      return;
    }

    // Debounce the stable zoom update (100ms after last zoom change)
    stableZoomTimeoutRef.current = setTimeout(() => {
      setStableZoomScale(zoomState.scale);
    }, 100);

    return () => {
      if (stableZoomTimeoutRef.current) {
        clearTimeout(stableZoomTimeoutRef.current);
      }
    };
  }, [zoomState.scale, isAnimating]);

  // Immediately update stable zoom when animation completes
  useEffect(() => {
    if (!isAnimating && targetZoom === null) {
      // Animation just completed, update stable zoom immediately
      setStableZoomScale(zoomState.scale);
    }
  }, [isAnimating, targetZoom, zoomState.scale]);

  const [hitTestCache, setHitTestCache] = useState<HitTestCache | null>(null);

  const calculateCanvasResolution = (
    fileCount: number,
    _cityBounds?: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => {
    const minSize = 400;
    const scaleFactor = Math.sqrt(fileCount / 5);
    let resolution = Math.max(minSize, minSize + scaleFactor * 300);

    if (maxCanvasSize !== undefined) {
      resolution = Math.min(resolution, maxCanvasSize);
    }

    return { width: resolution, height: resolution };
  };

  const [canvasSize, setCanvasSize] = useState(() =>
    calculateCanvasResolution(
      sourceCityData?.buildings?.length || 10,
      sourceCityData?.bounds,
    ),
  );

  const [displayOptions] = useState<MapDisplayOptions>({
    ...DEFAULT_DISPLAY_OPTIONS,
    showGrid,
  });

  const filteredCityData = useMemo(() => {
    if (!sourceCityData) {
      return undefined;
    }

    let processedData = sourceCityData;
    if (subdirectoryMode?.enabled) {
      const autoCenter = subdirectoryMode.autoCenter === true;

      // Use new multi-filter function if filters are provided
      if (subdirectoryMode.filters && subdirectoryMode.filters.length > 0) {
        processedData = filterCityDataForMultipleDirectories(
          sourceCityData,
          subdirectoryMode.filters,
          autoCenter,
          subdirectoryMode.combineMode || 'union',
        );
      } else if (subdirectoryMode.rootPath) {
        // Fallback to single path for backward compatibility
        processedData = filterCityDataForSubdirectory(
          sourceCityData,
          subdirectoryMode.rootPath,
          autoCenter,
        );
      }
    }

    return filterCityDataForSelectiveRender(processedData, selectiveRender);
  }, [sourceCityData, selectiveRender, subdirectoryMode]);

  const canvasSizingData = useMemo(() => {
    if (subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && sourceCityData) {
      return sourceCityData;
    }
    return filteredCityData;
  }, [subdirectoryMode?.enabled, subdirectoryMode?.autoCenter, sourceCityData, filteredCityData]);

  // Handle focusPath changes - calculate target zoom to frame the specified path
  useEffect(() => {
    // Skip if the focus path hasn't changed
    if (focusPath === lastFocusPathRef.current) {
      return;
    }

    lastFocusPathRef.current = focusPath;

    // If focusPath is null, reset to default view
    if (focusPath === null) {
      setTargetZoom({
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      });
      return;
    }

    // Need city data and canvas ref to calculate zoom
    if (!filteredCityData || !canvasRef.current) {
      return;
    }

    // Get actual display size - the canvas is resized to match this during render
    // so canvas coordinates = display coordinates
    const displayWidth = canvasRef.current.clientWidth || canvasSize.width;
    const displayHeight = canvasRef.current.clientHeight || canvasSize.height;

    if (!displayWidth || !displayHeight) {
      return;
    }

    // Find the target - first check districts, then buildings
    const normalizedPath = focusPath.replace(/^\/+|\/+$/g, '');
    const targetDistrict = filteredCityData.districts.find(
      d => d.path === normalizedPath || d.path === focusPath,
    );
    const targetBuilding = filteredCityData.buildings.find(
      b => b.path === normalizedPath || b.path === focusPath,
    );

    if (!targetDistrict && !targetBuilding) {
      return;
    }

    // Get the bounds to zoom to
    let targetBounds: { minX: number; maxX: number; minZ: number; maxZ: number };

    if (targetDistrict) {
      targetBounds = targetDistrict.worldBounds;
    } else if (targetBuilding) {
      // Create bounds around the building with some padding
      const [width, , depth] = targetBuilding.dimensions;
      const padding = Math.max(width, depth) * 2;
      targetBounds = {
        minX: targetBuilding.position.x - width / 2 - padding,
        maxX: targetBuilding.position.x + width / 2 + padding,
        minZ: targetBuilding.position.z - depth / 2 - padding,
        maxZ: targetBuilding.position.z + depth / 2 + padding,
      };
    } else {
      return;
    }

    // Use the same coordinate system as rendering
    const coordinateData = canvasSizingData || filteredCityData;
    const {
      scale: baseScale,
      offsetX: baseOffsetX,
      offsetZ: baseOffsetZ,
      innerLeft,
      innerTop,
      innerWidth,
      innerHeight,
    } = calculateFitWithSafeArea(
      coordinateData,
      displayWidth,
      displayHeight,
      displayOptions.padding,
      safeArea,
      labelBandPx,
    );

    // Calculate target center in world coordinates
    const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2;
    const targetCenterZ = (targetBounds.minZ + targetBounds.maxZ) / 2;

    // Calculate target size in screen coordinates (at base zoom)
    const targetScreenWidth = (targetBounds.maxX - targetBounds.minX) * baseScale;
    const targetScreenHeight = (targetBounds.maxZ - targetBounds.minZ) * baseScale;

    // Calculate zoom scale to fit target with padding (80% of the inset rect)
    const paddingFactor = 0.8;
    const scaleToFitWidth = (innerWidth * paddingFactor) / targetScreenWidth;
    const scaleToFitHeight = (innerHeight * paddingFactor) / targetScreenHeight;
    const newZoomScale = Math.min(scaleToFitWidth, scaleToFitHeight, 5); // Cap at 5x

    // Calculate the base screen position of target center (before zoom transform)
    // This matches the worldToCanvas formula: ((x - bounds.minX) * scale + offsetX)
    const baseScreenX = (targetCenterX - coordinateData.bounds.minX) * baseScale + baseOffsetX;
    const baseScreenY = (targetCenterZ - coordinateData.bounds.minZ) * baseScale + baseOffsetZ;

    // Calculate offset to center the target on the inset rect's center.
    // Full formula: screenPos = baseScreenPos * zoomScale + zoomOffset
    // To center: innerCenter = baseScreen * zoomScale + zoomOffset
    // Therefore: zoomOffset = innerCenter - baseScreen * zoomScale
    const newOffsetX = innerLeft + innerWidth / 2 - baseScreenX * newZoomScale;
    const newOffsetY = innerTop + innerHeight / 2 - baseScreenY * newZoomScale;

    setTargetZoom({
      scale: newZoomScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }, [
    focusPath,
    filteredCityData,
    canvasSizingData,
    canvasSize,
    displayOptions.padding,
    safeArea?.left,
    safeArea?.right,
    safeArea?.top,
    safeArea?.bottom,
    labelBandPx,
  ]);

  // Build hit test cache with spatial indexing
  const buildHitTestCache = useCallback(
    (
      cityData: CityData,
      scale: number,
      offsetX: number,
      offsetZ: number,
      zoomState: {
        scale: number;
        offsetX: number;
        offsetY: number;
        isDragging: boolean;
        lastMousePos: { x: number; y: number };
        hasMouseMoved: boolean;
      },
      abstractedPaths: Set<string>,
    ): HitTestCache => {
      const spatialGrid = new SpatialGrid(cityData.bounds);
      const pathLookup = new PathHierarchyLookup(abstractedPaths);

      // Only add visible buildings to spatial grid
      // Use PathHierarchyLookup for O(depth) checks instead of O(A) iteration
      cityData.buildings.forEach(building => {
        if (!pathLookup.isPathAbstracted(building.path)) {
          spatialGrid.addBuilding(building);
        }
      });

      // Add districts to spatial grid
      cityData.districts.forEach(district => {
        if (!district.path) {
          spatialGrid.addDistrict(district); // Keep root
          return;
        }

        // For hit testing, we need to include abstracted districts too
        // because they have visual covers that users can click on.
        // Only skip children of abstracted directories.
        if (!pathLookup.isChildOfAbstracted(district.path)) {
          spatialGrid.addDistrict(district);
        }
      });

      return {
        spatialGrid,
        transformParams: {
          scale,
          offsetX,
          offsetZ,
          zoomScale: zoomState.scale,
          zoomOffsetX: zoomState.offsetX,
          zoomOffsetY: zoomState.offsetY,
        },
        abstractedPaths,
        pathLookup,
        timestamp: Date.now(),
      };
    },
    [],
  );

  // Update canvas size when city data changes
  useEffect(() => {
    if (canvasSizingData) {
      const newSize = calculateCanvasResolution(
        canvasSizingData.buildings.length,
        canvasSizingData.bounds,
      );
      setCanvasSize(newSize);
    }
  }, [canvasSizingData, subdirectoryMode]);

  // Separate stable and dynamic layers for performance optimization
  const stableLayers = useMemo(
    () => highlightLayers.filter(layer => layer.dynamic !== true),
    [highlightLayers],
  );

  const dynamicLayers = useMemo(
    () => highlightLayers.filter(layer => layer.dynamic === true),
    [highlightLayers],
  );

  // Combine all layers for rendering (moved up so abstractionLayer can use it)
  const allLayersWithoutAbstraction = useMemo(
    () => [...stableLayers, ...dynamicLayers],
    [stableLayers, dynamicLayers],
  );

  // Directory tree node for abstraction calculation
  interface DirectoryNode {
    path: string;
    district: CityDistrict;
    screenSize: { width: number; height: number };
    children: DirectoryNode[];
    buildings: CityBuilding[];
    containsHighlights: boolean;
    shouldAbstract: boolean;
  }

  // Calculate abstracted directories based on current zoom using tree structure
  const abstractionLayer = useMemo(() => {
    // Define the extended interface for abstraction layers
    interface AbstractionLayer extends HighlightLayer {
      abstractionLayer?: boolean;
      abstractionConfig?: {
        maxZoomLevel?: number;
        minPercentage?: number;
        backgroundColor?: string;
        allowRootAbstraction?: boolean;
        projectInfo?: {
          repoName?: string;
          rootDirectoryName?: string;
          currentBranch?: string;
        };
      };
    }

    // Find the abstraction layer in our highlight layers
    const abstractionLayerDef = highlightLayers.find(
      layer => layer.id === 'directory-abstraction' && (layer as AbstractionLayer).abstractionLayer,
    ) as AbstractionLayer | undefined;

    if (!abstractionLayerDef || !abstractionLayerDef.enabled || !filteredCityData) {
      return null;
    }

    const config = abstractionLayerDef.abstractionConfig;

    // Disable abstraction when zoomed in beyond a certain threshold
    // Use stableZoomScale to avoid recalculating during animation
    const maxZoomForAbstraction = config?.maxZoomLevel ?? 5.0;
    if (stableZoomScale > maxZoomForAbstraction) {
      return null; // No abstractions when zoomed in
    }

    // Calculate which directories are too small at current zoom
    const abstractedItems: LayerItem[] = [];

    if (canvasRef.current) {
      const displayWidth = canvasRef.current.clientWidth || canvasSize.width;
      const displayHeight = canvasRef.current.clientHeight || canvasSize.height;

      const coordinateSystemData =
        subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && sourceCityData
          ? sourceCityData
          : filteredCityData;

      const { scale } = calculateFitWithSafeArea(
        coordinateSystemData,
        displayWidth,
        displayHeight,
        displayOptions.padding,
        safeArea,
        labelBandPx,
      );

      // Use stableZoomScale for abstraction calculation to avoid recalculating during animation
      const totalScale = scale * stableZoomScale;

      // Get all highlighted paths from enabled layers
      const highlightedPaths = new Set<string>();
      allLayersWithoutAbstraction.forEach(layer => {
        if (layer.enabled && layer.id !== 'directory-abstraction') {
          layer.items.forEach(item => {
            if (item.type === 'file') {
              highlightedPaths.add(item.path);
            }
          });
        }
      });

      // Build directory tree
      const nodeMap = new Map<string, DirectoryNode>();
      const rootNode: DirectoryNode = {
        path: '',
        district: {
          path: '',
          worldBounds: filteredCityData.bounds,
          fileCount: 0,
          type: 'directory',
        },
        screenSize: { width: Infinity, height: Infinity },
        children: [],
        buildings: [],
        containsHighlights: false,
        shouldAbstract: false,
      };
      nodeMap.set('', rootNode);

      // Create nodes for all districts
      filteredCityData.districts.forEach(district => {
        if (!district.path) return;

        const screenWidth = (district.worldBounds.maxX - district.worldBounds.minX) * totalScale;
        const screenHeight = (district.worldBounds.maxZ - district.worldBounds.minZ) * totalScale;

        const node: DirectoryNode = {
          path: district.path,
          district: district,
          screenSize: { width: screenWidth, height: screenHeight },
          children: [],
          buildings: [],
          containsHighlights: false,
          shouldAbstract: false,
        };
        nodeMap.set(district.path, node);
      });

      // Build parent-child relationships
      nodeMap.forEach((node, path) => {
        if (!path) return; // Skip root

        // Find parent path
        const lastSlash = path.lastIndexOf('/');
        const parentPath = lastSlash > 0 ? path.substring(0, lastSlash) : '';
        const parent = nodeMap.get(parentPath);

        if (parent) {
          parent.children.push(node);
        } else {
          rootNode.children.push(node);
        }
      });

      // Assign buildings to their directories and check for highlights
      filteredCityData.buildings.forEach(building => {
        const dirPath = building.path.substring(0, building.path.lastIndexOf('/')) || '';
        const node = nodeMap.get(dirPath);
        if (node) {
          node.buildings.push(building);
          if (highlightedPaths.has(building.path)) {
            // Mark this node and all parents as containing highlights
            let current: DirectoryNode | undefined = node;
            let depth = 0;
            while (current && depth < 100) {
              // Add safety limit
              depth++;
              current.containsHighlights = true;
              const parentPath =
                current.path.lastIndexOf('/') > 0
                  ? current.path.substring(0, current.path.lastIndexOf('/'))
                  : '';
              if (parentPath === current.path) break; // Prevent infinite loop
              current = nodeMap.get(parentPath);
            }
            if (depth >= 100) {
              console.error('[Abstraction] Highlight propagation exceeded depth limit');
            }
          }
        }
      });

      if (config?.allowRootAbstraction) {
        const cityWidth =
          (filteredCityData.bounds.maxX - filteredCityData.bounds.minX) * totalScale;
        const cityHeight =
          (filteredCityData.bounds.maxZ - filteredCityData.bounds.minZ) * totalScale;
        const cityArea = cityWidth * cityHeight;
        const canvasArea = displayWidth * displayHeight;
        const minPercentage = config?.minPercentage || 0.01;
        const cityMeetsThreshold = cityArea >= canvasArea * minPercentage;

        if (!cityMeetsThreshold && !highlightedPaths.size) {
          // Abstract the entire city

          // Build meaningful project info text
          const projectInfo = config.projectInfo;
          let displayText = '';

          if (projectInfo?.repoName || projectInfo?.rootDirectoryName) {
            displayText = projectInfo.repoName || projectInfo.rootDirectoryName || 'Project';
            if (projectInfo.currentBranch) {
              displayText += `\n${projectInfo.currentBranch}`;
            }
          } else {
            displayText = 'Project Overview';
          }

          abstractedItems.push({
            path: '', // Empty path for root
            type: 'directory',
            renderStrategy: 'cover',
            coverOptions: {
              text: displayText,
              backgroundColor: config?.backgroundColor ?? '#1e40af',
              opacity: 1.0,
              borderRadius: 6,
              textSize: 16,
            },
          });

          // Return early with just the city abstraction
          return {
            ...abstractionLayerDef,
            items: abstractedItems,
          };
        }
      }

      // BFS to determine abstractions for subdirectories
      const queue: DirectoryNode[] = [...rootNode.children];

      while (queue.length > 0) {
        const node = queue.shift();
        if (!node) continue;

        // Decision logic - using percentage of canvas/viewport area
        // Current screen area of the directory
        const currentArea = node.screenSize.width * node.screenSize.height;

        // Canvas/viewport area
        const canvasArea = displayWidth * displayHeight;

        // Check if current size is at least X% of canvas
        const minPercentage = config?.minPercentage || 0.01; // Default 1% of canvas
        const meetsThreshold = currentArea >= canvasArea * minPercentage;

        if (meetsThreshold) {
          // Large enough - show contents, continue to children
          queue.push(...node.children);
        } else if (node.containsHighlights) {
          // Too small but has highlights - show contents, continue to children
          queue.push(...node.children);
        } else {
          // Too small and no highlights - abstract this level
          node.shouldAbstract = true;
          const dirName = node.path.split('/').pop() || node.path;

          abstractedItems.push({
            path: node.path,
            type: 'directory',
            renderStrategy: 'cover',
            coverOptions: {
              text: dirName,
              backgroundColor: config?.backgroundColor ?? '#1e40af',
              opacity: 1.0,
              borderRadius: 6,
              textSize: 12,
            },
          });
          // Don't process children - they're covered by this abstraction
        }
      }
    }

    // Return a new layer with calculated items
    return {
      ...abstractionLayerDef,
      items: abstractedItems,
    };
  }, [
    highlightLayers,
    filteredCityData,
    canvasSize,
    displayOptions.padding,
    stableZoomScale, // Use stable zoom scale instead of live zoomState.scale
    subdirectoryMode,
    sourceCityData,
    allLayersWithoutAbstraction,
    safeArea?.left,
    safeArea?.right,
    safeArea?.top,
    safeArea?.bottom,
    labelBandPx,
  ]);

  // Combine all layers for rendering, including calculated abstraction layer
  const allLayers = useMemo(() => {
    const layers = [...stableLayers, ...dynamicLayers];

    // Replace abstraction layer with calculated one if it exists
    if (abstractionLayer) {
      const index = layers.findIndex(l => l.id === 'directory-abstraction');
      if (index >= 0) {
        layers[index] = abstractionLayer;
      }
    }

    return layers;
  }, [stableLayers, dynamicLayers, abstractionLayer]);

  // Memoize layer index for O(1) path lookups - only rebuilds when layers change
  const layerIndex = useMemo(() => new LayerIndex(allLayers), [allLayers]);

  // Memoize abstracted paths lookup - only recalculates when abstraction layer changes
  const { abstractedPathsSet, abstractedPathLookup } = useMemo(() => {
    const pathsSet = new Set<string>();
    const abstractionLayerDef = allLayers.find(l => l.id === 'directory-abstraction');
    if (abstractionLayerDef && abstractionLayerDef.enabled) {
      abstractionLayerDef.items.forEach(item => {
        if (item.type === 'directory') {
          pathsSet.add(item.path);
        }
      });
    }
    return {
      abstractedPathsSet: pathsSet,
      abstractedPathLookup: new PathHierarchyLookup(pathsSet),
    };
  }, [allLayers]);

  // Memoize visible districts - only recalculates when data or abstraction changes, NOT on hover
  const visibleDistrictsMemo = useMemo(() => {
    if (!filteredCityData) return [];

    let districts =
      abstractedPathLookup.size > 0
        ? filteredCityData.districts.filter(district => {
            // Check for root abstraction first
            if (abstractedPathLookup.has('')) {
              return !district.path || district.path === '';
            }
            if (!district.path) return true;
            if (abstractedPathLookup.has(district.path)) return true;
            return !abstractedPathLookup.isChildOfAbstracted(district.path);
          })
        : filteredCityData.districts;

    // If root is abstracted and there's no root district, create one for the cover
    if (abstractedPathsSet.has('')) {
      const hasRootDistrict = districts.some(d => !d.path || d.path === '');
      if (!hasRootDistrict) {
        districts = [
          {
            path: '',
            worldBounds: filteredCityData.bounds,
            fileCount: filteredCityData.buildings.length,
            type: 'directory' as const,
          },
          ...districts,
        ];
      }
    }

    return districts;
  }, [filteredCityData, abstractedPathLookup, abstractedPathsSet]);

  // Memoize visible buildings - only recalculates when data or abstraction changes, NOT on hover
  const visibleBuildingsMemo = useMemo(() => {
    if (!filteredCityData) return [];

    return abstractedPathLookup.size > 0
      ? filteredCityData.buildings.filter(building => {
          return !abstractedPathLookup.isPathAbstracted(building.path);
        })
      : filteredCityData.buildings;
  }, [filteredCityData, abstractedPathLookup]);

  // Update hit test cache when geometry or abstraction changes
  // Note: We don't depend on zoomState here because:
  // 1. The spatial grid only depends on buildings/districts and abstraction
  // 2. performHitTest calculates coordinates using the current zoomState directly
  // 3. This avoids expensive cache rebuilds during zoom animation
  useEffect(() => {
    if (!filteredCityData) return;

    const width = canvasRef.current?.clientWidth || canvasSize.width;
    const height = canvasRef.current?.clientHeight || canvasSize.height;
    const { scale, offsetX, offsetZ } = calculateFitWithSafeArea(
      filteredCityData,
      width,
      height,
      displayOptions.padding,
      safeArea,
      labelBandPx,
    );

    // Get abstracted paths from the abstraction layer
    const abstractedPaths = new Set<string>();
    if (abstractionLayer && abstractionLayer.enabled) {
      abstractionLayer.items.forEach(item => {
        if (item.type === 'directory') {
          abstractedPaths.add(item.path);
        }
      });
    }

    // Pass a stable zoom state for cache metadata (not used for coordinate calculations)
    const stableZoomState = {
      scale: stableZoomScale,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      lastMousePos: { x: 0, y: 0 },
      hasMouseMoved: false,
    };

    const newCache = buildHitTestCache(
      filteredCityData,
      scale,
      offsetX,
      offsetZ,
      stableZoomState,
      abstractedPaths,
    );
    setHitTestCache(newCache);
  }, [
    filteredCityData,
    canvasSize,
    displayOptions.padding,
    stableZoomScale, // Only rebuild when zoom stabilizes
    buildHitTestCache,
    abstractionLayer,
    safeArea?.left,
    safeArea?.right,
    safeArea?.top,
    safeArea?.bottom,
    labelBandPx,
  ]);

  // Main canvas drawing with layer-based highlighting
  useEffect(() => {
    if (!canvasRef.current || !filteredCityData) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Performance monitoring start available for debugging

    let displayWidth = canvas.clientWidth || canvasSize.width;
    let displayHeight = canvas.clientHeight || canvasSize.height;

    // Cap canvas size if maxCanvasSize is set (prevents iOS Safari crashes)
    if (maxCanvasSize !== undefined) {
      displayWidth = Math.min(displayWidth, maxCanvasSize);
      displayHeight = Math.min(displayHeight, maxCanvasSize);
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.fillStyle = resolvedCanvasBackgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (displayOptions.showGrid) {
      drawGrid(ctx, displayWidth, displayHeight, displayOptions.gridSize);
    }

    const coordinateSystemData =
      subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && sourceCityData
        ? sourceCityData
        : filteredCityData;

    const { scale, offsetX, offsetZ } = calculateFitWithSafeArea(
      coordinateSystemData,
      displayWidth,
      displayHeight,
      displayOptions.padding,
      safeArea,
      labelBandPx,
    );

    const worldToCanvas = (x: number, z: number) => ({
      x:
        ((x - coordinateSystemData.bounds.minX) * scale + offsetX) * zoomState.scale +
        zoomState.offsetX,
      y:
        ((z - coordinateSystemData.bounds.minZ) * scale + offsetZ) * zoomState.scale +
        zoomState.offsetY,
    });

    // Use memoized visible districts and buildings (pre-filtered, doesn't recalculate on hover)
    if (sourceModel) {
      // Multi-source: draw each source with its own layers / isolation /
      // default color / directory focus, sharing the global transform.
      for (const g of sourceModel.groups) {
        const groupHasHighlights = g.layers.some(l => l.enabled && l.items.length > 0);
        drawLayeredDistricts(
          ctx,
          g.districts,
          worldToCanvas,
          scale * zoomState.scale,
          g.layers,
          interactionState.hoveredDistrict,
          fullSize,
          resolvedDefaultDirectoryColor,
          filteredCityData.metadata.layoutConfig,
          abstractedPathsSet,
          showDirectoryLabels,
          districtBorderRadius,
          undefined, // per-source index (small sets)
          g.districtAppearingProgress,
        );
        drawLayeredBuildings(
          ctx,
          g.buildings,
          worldToCanvas,
          scale * zoomState.scale,
          g.layers,
          interactionState.hoveredBuilding,
          g.defaultBuildingColor ?? resolvedDefaultBuildingColor,
          showFileNames,
          resolvedHoverBorderColor,
          g.isolationMode,
          dimOpacity,
          groupHasHighlights,
          showFileTypeIcons,
          buildingBorderRadius,
          undefined, // per-source index (small sets)
          iconMap,
          b => focusOutDim(b, g.focusDirectory, g.dim),
        );
      }
    } else {
      // Draw districts with layer support
      drawLayeredDistricts(
        ctx,
        visibleDistrictsMemo,
        worldToCanvas,
        scale * zoomState.scale,
        allLayers,
        interactionState.hoveredDistrict,
        fullSize,
        resolvedDefaultDirectoryColor,
        filteredCityData.metadata.layoutConfig,
        abstractedPathsSet, // Pass abstracted paths to skip labels
        showDirectoryLabels,
        districtBorderRadius,
        layerIndex, // Pre-built index for O(1) lookups
      );

      // Draw buildings with layer support
      drawLayeredBuildings(
        ctx,
        visibleBuildingsMemo,
        worldToCanvas,
        scale * zoomState.scale,
        allLayers,
        interactionState.hoveredBuilding,
        resolvedDefaultBuildingColor,
        showFileNames,
        resolvedHoverBorderColor,
        isolationMode,
        dimOpacity,
        hasActiveHighlights,
        showFileTypeIcons,
        buildingBorderRadius,
        layerIndex, // Pre-built index for O(1) lookups
        iconMap, // Icon configuration map for file type icons
        b => focusOutDim(b, focusPath),
      );
    }

    // Source labels (multi-city). Drawn in screen space at each source's
    // back-center; hit rects are cached so clicks can drive onSourceFocusChange.
    if (sourceModel && sourceModel.labels.length > 0) {
      const rects: LabelHitRect[] = [];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (const label of sourceModel.labels) {
        const p = worldToCanvas(label.x, label.z);
        const text = label.source.label as string;
        ctx.font = '600 13px -apple-system, "SF Pro", "Segoe UI", Roboto, sans-serif';
        const padX = 8;
        const padY = 4;
        const w = ctx.measureText(text).width + padX * 2;
        const h = 13 + padY * 2;
        const rx = p.x - w / 2;
        const ry = p.y - h - 8;
        ctx.globalAlpha = label.dim * label.labelProgress;
        ctx.fillStyle = 'rgba(10, 14, 22, 0.72)';
        ctx.fillRect(rx, ry, w, h);
        if (label.focused) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx + 0.5, ry + 0.5, w - 1, h - 1);
        }
        ctx.fillStyle = '#fff';
        ctx.fillText(text, p.x, ry + h - padY);
        ctx.globalAlpha = 1;
        rects.push({ x: rx, y: ry, width: w, height: h, source: label.source });
      }
      labelRectsRef.current = rects;
    } else if (labelRectsRef.current.length > 0) {
      labelRectsRef.current = [];
    }

    // Focus border(s). Single city: the global focusDirectory/focusColor.
    // Multi-source: each group's own focusDirectory/focusColor.
    if (sourceModel) {
      for (const g of sourceModel.groups) {
        if (!g.focusColor || !g.focusDirectory) continue;
        const np = g.focusDirectory.replace(/^\/+|\/+$/g, '');
        const d = g.districts.find(x => x.path === np || x.path === g.focusDirectory);
        const b2 = d
          ? undefined
          : g.buildings.find(x => x.path === np || x.path === g.focusDirectory);
        strokeFocusBorder(ctx, worldToCanvas, d, b2, g.focusColor, zoomState.scale);
      }
    } else if (focusColor && focusPath) {
      const normalizedPath = focusPath.replace(/^\/+|\/+$/g, '');
      const targetDistrict = filteredCityData.districts?.find(
        d => d.path === normalizedPath || d.path === focusPath,
      );
      const targetBuilding = !targetDistrict
        ? filteredCityData.buildings?.find(
            b => b.path === normalizedPath || b.path === focusPath,
          )
        : null;
      strokeFocusBorder(
        ctx,
        worldToCanvas,
        targetDistrict,
        targetBuilding,
        focusColor,
        zoomState.scale,
      );
    }

    // Performance monitoring end available for debugging
    // Performance stats available but not logged to reduce console noise
    // Uncomment for debugging: render time, buildings/districts counts, layer counts
  }, [
    filteredCityData,
    canvasSize,
    displayOptions,
    zoomState,
    selectiveRender,
    rootDirectoryName,
    highlightLayers,
    interactionState.hoveredBuilding,
    interactionState.hoveredDistrict,
    resolvedDefaultDirectoryColor,
    showFileNames,
    fullSize,
    resolvedHoverBorderColor,
    isolationMode,
    dimOpacity,
    hasActiveHighlights,
    focusDirectory,
    subdirectoryMode,
    sourceCityData,
    resolvedCanvasBackgroundColor,
    showDirectoryLabels,
    allLayers,
    buildingBorderRadius,
    resolvedDefaultBuildingColor,
    districtBorderRadius,
    showFileTypeIcons,
    // Memoized values for performance (don't recalculate on hover)
    visibleDistrictsMemo,
    visibleBuildingsMemo,
    abstractedPathsSet,
    layerIndex,
    iconMap,
    // Focus color border
    focusColor,
    focusPath,
    sourceModel,
    focusOutDim,
    safeArea?.left,
    safeArea?.right,
    safeArea?.top,
    safeArea?.bottom,
    labelBandPx,
  ]);

  // Optimized hit testing
  const performHitTest = useCallback(
    (
      canvasX: number,
      canvasY: number,
    ): {
      hoveredBuilding: CityBuilding | null;
      hoveredDistrict: CityDistrict | null;
    } => {
      if (!hitTestCache || !filteredCityData) {
        return { hoveredBuilding: null, hoveredDistrict: null };
      }

      const width = canvasRef.current?.clientWidth || canvasSize.width;
      const height = canvasRef.current?.clientHeight || canvasSize.height;

      const coordinateSystemData =
        subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && sourceCityData
          ? sourceCityData
          : filteredCityData;

      const { scale, offsetX, offsetZ } = calculateFitWithSafeArea(
        coordinateSystemData,
        width,
        height,
        displayOptions.padding,
        safeArea,
        labelBandPx,
      );

      const screenX = (canvasX - zoomState.offsetX) / zoomState.scale;
      const screenY = (canvasY - zoomState.offsetY) / zoomState.scale;
      const worldX = (screenX - offsetX) / scale + coordinateSystemData.bounds.minX;
      const worldZ = (screenY - offsetZ) / scale + coordinateSystemData.bounds.minZ;

      const nearbyItems = hitTestCache.spatialGrid.query(worldX, worldZ, 20);

      let hoveredBuilding: CityBuilding | null = null;
      let hoveredDistrict: CityDistrict | null = null;
      let minBuildingDistance = Infinity;
      let deepestDistrictLevel = -1;

      for (const item of nearbyItems) {
        if ('dimensions' in item) {
          const building = item as CityBuilding;

          const size = Math.max(building.dimensions[0], building.dimensions[2]);
          const halfSize = size / 2;

          if (
            worldX >= building.position.x - halfSize &&
            worldX <= building.position.x + halfSize &&
            worldZ >= building.position.z - halfSize &&
            worldZ <= building.position.z + halfSize
          ) {
            const distance = Math.sqrt(
              Math.pow(worldX - building.position.x, 2) + Math.pow(worldZ - building.position.z, 2),
            );

            if (distance < minBuildingDistance) {
              minBuildingDistance = distance;
              hoveredBuilding = building;
            }
          }
        }
      }

      for (const item of nearbyItems) {
        if (!('dimensions' in item)) {
          const district = item as CityDistrict;
          const districtPath = district.path || '';
          const isRoot = !districtPath || districtPath === '';

          // Skip root districts UNLESS they are abstracted (have covers)
          if (isRoot && !hitTestCache.abstractedPaths.has('')) continue;

          if (
            worldX >= district.worldBounds.minX &&
            worldX <= district.worldBounds.maxX &&
            worldZ >= district.worldBounds.minZ &&
            worldZ <= district.worldBounds.maxZ
          ) {
            const level = districtPath.split('/').filter(Boolean).length;
            if (level > deepestDistrictLevel) {
              deepestDistrictLevel = level;
              hoveredDistrict = district;
            }
          }
        }
      }
      return { hoveredBuilding, hoveredDistrict };
    },
    [
      hitTestCache,
      filteredCityData,
      canvasSize,
      displayOptions.padding,
      zoomState,
      subdirectoryMode,
      sourceCityData,
      safeArea?.left,
      safeArea?.right,
      safeArea?.top,
      safeArea?.bottom,
      labelBandPx,
    ],
  );

  // Mouse event handlers
  // Fire the 3D-shaped hover callbacks plus the rich 2D hover payload whenever
  // interaction state changes. `onBuildingHover` / `onDirectoryHover` mirror
  // FileCity3D's shapes; `onHoverInfo` carries the 2D-only extras.
  useEffect(() => {
    if (!interactionState) return;

    onBuildingHover?.(interactionState.hoveredBuilding ?? null);
    onDirectoryHover?.(interactionState.hoveredDistrict?.path || null);

    if (!onHoverInfo) return;

    const fileTooltip = interactionState.hoveredBuilding
      ? {
          text:
            interactionState.hoveredBuilding.path.split('/').pop() ||
            interactionState.hoveredBuilding.path,
        }
      : null;

    const directoryTooltip =
      interactionState.hoveredDistrict && interactionState.hoveredDistrict.path !== '/'
        ? { text: interactionState.hoveredDistrict.path || '/' }
        : null;

    onHoverInfo({
      hoveredDistrict: interactionState.hoveredDistrict,
      hoveredBuilding: interactionState.hoveredBuilding,
      mousePos: interactionState.mousePos,
      fileTooltip,
      directoryTooltip,
      fileCount: interactionState.hoveredDistrict
        ? Math.round(interactionState.hoveredDistrict.fileCount || 0)
        : null,
    });
  }, [interactionState, onBuildingHover, onDirectoryHover, onHoverInfo]);

  // Helper function to transform mouse coordinates based on rotation/flip
  const transformMouseCoordinates = useCallback(
    (x: number, y: number, canvasWidth: number, canvasHeight: number) => {
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      // Translate to center
      let transformedX = x - centerX;
      let transformedY = y - centerY;

      // Apply inverse rotation (negative angle to undo visual rotation)
      const rotationDegrees = transform?.rotation || 0;
      if (rotationDegrees) {
        const angle = -(rotationDegrees * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = transformedX * cos - transformedY * sin;
        const newY = transformedX * sin + transformedY * cos;
        transformedX = newX;
        transformedY = newY;
      }

      // Apply inverse flips
      if (transform?.flipHorizontal) {
        transformedX = -transformedX;
      }
      if (transform?.flipVertical) {
        transformedY = -transformedY;
      }

      // Translate back from center
      transformedX += centerX;
      transformedY += centerY;

      return { x: transformedX, y: transformedY };
    },
    [transform],
  );

  const handleMouseMoveInternal = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !containerRef.current || !filteredCityData || zoomState.isDragging)
        return;

      // Throttle hover updates to improve performance with large datasets
      const now = performance.now();
      if (now - lastHoverUpdateRef.current < HOVER_THROTTLE_MS) {
        return;
      }
      lastHoverUpdateRef.current = now;

      // Get the container rect for mouse position
      const containerRect = containerRef.current.getBoundingClientRect();
      // Get mouse position relative to the container
      const rawX = e.clientX - containerRect.left;
      const rawY = e.clientY - containerRect.top;

      // Use canvas dimensions for transformation since that's what the hit testing uses
      const canvasWidth = canvasRef.current.width;
      const canvasHeight = canvasRef.current.height;

      // Transform the mouse coordinates to account for rotation/flips
      const { x, y } = transformMouseCoordinates(rawX, rawY, canvasWidth, canvasHeight);

      const { hoveredBuilding, hoveredDistrict } = performHitTest(x, y);

      setInteractionState(prev => {
        const hoveredItemChanged =
          prev.hoveredBuilding !== hoveredBuilding || prev.hoveredDistrict !== hoveredDistrict;
        const positionChanged = prev.mousePos.x !== x || prev.mousePos.y !== y;

        if (!hoveredItemChanged && !positionChanged) {
          return prev;
        }

        // Tooltip data will be calculated in onHover callback
        return {
          hoveredBuilding,
          hoveredDistrict,
          mousePos: { x, y },
        };
      });
    },
    [filteredCityData, zoomState.isDragging, performHitTest, transformMouseCoordinates],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (enableZoom && zoomState.isDragging) {
        const rawDeltaX = e.clientX - zoomState.lastMousePos.x;
        const rawDeltaY = e.clientY - zoomState.lastMousePos.y;

        // Transform the drag deltas based on rotation/flips
        let deltaX = rawDeltaX;
        let deltaY = rawDeltaY;

        const rotationDegrees = transform?.rotation || 0;
        if (rotationDegrees) {
          // Apply inverse rotation to the deltas
          const angle = -(rotationDegrees * Math.PI) / 180;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          deltaX = rawDeltaX * cos - rawDeltaY * sin;
          deltaY = rawDeltaX * sin + rawDeltaY * cos;
        }

        // Apply inverse flips
        if (transform?.flipHorizontal) {
          deltaX = -deltaX;
        }
        if (transform?.flipVertical) {
          deltaY = -deltaY;
        }

        setZoomState(prev => ({
          ...prev,
          offsetX: prev.offsetX + deltaX,
          offsetY: prev.offsetY + deltaY,
          lastMousePos: { x: e.clientX, y: e.clientY },
          hasMouseMoved: true,
        }));
        return;
      }

      handleMouseMoveInternal(e as unknown as React.MouseEvent<HTMLCanvasElement>);
    },
    [enableZoom, zoomState.isDragging, zoomState.lastMousePos, handleMouseMoveInternal, transform],
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomState.hasMouseMoved) {
      return;
    }

    // Source labels take priority — a label click focuses that repo (or clears
    // focus when it's already focused), mirroring FileCity3D's source focus.
    if (
      sourceModel &&
      canvasRef.current &&
      labelRectsRef.current.length > 0 &&
      containerRef.current
    ) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const { x, y } = transformMouseCoordinates(
        e.clientX - containerRect.left,
        e.clientY - containerRect.top,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      const hit = labelRectsRef.current.find(
        r => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height,
      );
      if (hit) {
        const alreadyFocused = (focusedSources ?? []).includes(hit.source);
        onSourceFocusChange?.(alreadyFocused ? null : hit.source);
        return;
      }
    }

    if (interactionState.hoveredBuilding) {
      onBuildingClick?.(interactionState.hoveredBuilding, e.nativeEvent);
      return;
    }

    if (interactionState.hoveredDistrict) {
      const districtPath = interactionState.hoveredDistrict.path || '';
      const isRoot = !districtPath || districtPath === '';
      if (isRoot) return;

      const fullPath =
        subdirectoryMode?.enabled && subdirectoryMode.rootPath
          ? `${subdirectoryMode.rootPath}/${districtPath}`
          : districtPath;

      onDirectorySelect?.(focusDirectory === fullPath ? null : fullPath);
    }
  };

  const handleMouseLeave = useCallback(() => {
    setInteractionState(prev => ({
      ...prev,
      hoveredDistrict: null,
      hoveredBuilding: null,
    }));
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!enableZoom || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, zoomState.scale * zoomFactor));

    const scaleChange = newScale / zoomState.scale;
    const newOffsetX = mouseX - (mouseX - zoomState.offsetX) * scaleChange;
    const newOffsetY = mouseY - (mouseY - zoomState.offsetY) * scaleChange;

    setZoomState(prev => ({
      ...prev,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    }));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setZoomState(prev => ({
      ...prev,
      isDragging: enableZoom ? true : false,
      lastMousePos: enableZoom ? { x: e.clientX, y: e.clientY } : prev.lastMousePos,
      hasMouseMoved: false,
    }));
  };

  const handleMouseUp = useCallback(() => {
    setZoomState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const interactionCursor = useMemo(() => {
    if (enableZoom) {
      if (zoomState.isDragging) {
        return 'grabbing';
      }
      if (interactionState.hoveredBuilding || interactionState.hoveredDistrict) {
        return 'pointer';
      }
      return 'grab';
    }

    if (interactionState.hoveredBuilding || interactionState.hoveredDistrict) {
      return 'pointer';
    }

    return 'default';
  }, [
    enableZoom,
    zoomState.isDragging,
    interactionState.hoveredBuilding,
    interactionState.hoveredDistrict,
  ]);

  if (!filteredCityData) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '250px',
          backgroundColor: resolvedCanvasBackgroundColor,
          borderRadius: fullSize ? 0 : `${theme.radii[2]}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative grid background with integrated text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
            gridAutoRows: 'minmax(80px, 1fr)',
            gap: '20px',
            padding: '20px',
          }}
        >
          {/* Generate grid squares to fill space */}
          {Array.from({ length: 200 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: resolvedDefaultBuildingColor,
                borderRadius: buildingBorderRadius,
                opacity: 0.6 + (i % 3) * 0.2,
              }}
            />
          ))}
        </div>
        {/* Text overlay centered */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textMuted,
            fontFamily: theme.fonts.body,
            fontSize: `${theme.fontSizes[3]}px`,
            fontWeight: theme.fontWeights.medium,
            backgroundColor: resolvedCanvasBackgroundColor,
            borderRadius: `${theme.radii[2]}px`,
            padding: `${theme.space[4]}px ${theme.space[5]}px`,
            textAlign: 'center',
            minWidth: '300px',
          }}
        >
          No city data available
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: resolvedCanvasBackgroundColor,
        transform: (() => {
          const transforms = [];

          // Apply rotation
          const rotationDegrees = transform?.rotation || 0;
          if (rotationDegrees) {
            transforms.push(`rotate(${rotationDegrees}deg)`);
          }

          // Apply flips
          if (transform?.flipHorizontal) {
            transforms.push('scaleX(-1)');
          }
          if (transform?.flipVertical) {
            transforms.push('scaleY(-1)');
          }

          return transforms.length > 0 ? transforms.join(' ') : undefined;
        })(),
      }}
    >
      {/* Layer Controls - Toggle Buttons */}
      {showLayerControls && highlightLayers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: `${theme.space[4]}px`,
            left: `${theme.space[4]}px`,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: `${theme.space[2]}px`,
          }}
        >
          {highlightLayers.map(layer => (
            <button
              key={layer.id}
              onClick={() => onLayerToggle?.(layer.id, !layer.enabled)}
              style={{
                padding: `${theme.space[2]}px ${theme.space[3]}px`,
                borderRadius: `${theme.radii[2]}px`,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: `${theme.space[2]}px`,
                fontSize: `${theme.fontSizes[0]}px`,
                fontWeight: theme.fontWeights.medium,
                fontFamily: theme.fonts.body,
                backgroundColor: layer.enabled
                  ? theme.colors.backgroundSecondary
                  : theme.colors.background,
                color: layer.enabled ? theme.colors.text : theme.colors.textSecondary,
                border: `2px solid ${layer.enabled ? layer.color : theme.colors.border}`,
                minWidth: '120px',
                cursor: 'pointer',
              }}
              title={`Toggle ${layer.name}`}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: layer.color,
                  opacity: layer.enabled ? 1 : 0.4,
                  transition: 'opacity 0.2s ease',
                }}
              />
              <span style={{ textAlign: 'left', flex: 1 }}>{layer.name}</span>
              {layer.items && layer.items.length > 0 && (
                <span
                  style={{
                    fontSize: `${theme.fontSizes[0]}px`,
                    color: layer.enabled ? theme.colors.textSecondary : theme.colors.textMuted,
                  }}
                >
                  {layer.items.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          zIndex: 1,
        }}
      />

      {/* Interaction layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          cursor: interactionCursor,
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}

function calculateScaleAndOffset(
  cityData: CityData,
  width: number,
  height: number,
  padding: number,
) {
  const cityWidth = cityData.bounds.maxX - cityData.bounds.minX;
  const cityDepth = cityData.bounds.maxZ - cityData.bounds.minZ;

  const horizontalPadding = padding;
  const verticalPadding = padding * 2;

  // Screen X spans the city's world-X extent and screen Y its world-Z extent
  // (see `worldToCanvas`), so each axis fits its own extent. Dividing by the
  // swapped pair pushed non-square cities off-center.
  const scaleX = (width - horizontalPadding) / cityWidth;
  const scaleZ = (height - verticalPadding) / cityDepth;
  const scale = Math.min(scaleX, scaleZ);

  const scaledCityWidth = cityWidth * scale;
  const scaledCityHeight = cityDepth * scale;
  const offsetX = (width - scaledCityWidth) / 2;
  const offsetZ = (height - scaledCityHeight) / 2;

  return { scale, offsetX, offsetZ };
}

/**
 * Stroke the focus border for a matched district (preferred) or building, in
 * the shared global transform. Shared by the single-city and multi-source
 * draw paths.
 */
function strokeFocusBorder(
  ctx: CanvasRenderingContext2D,
  worldToCanvas: (x: number, z: number) => { x: number; y: number },
  district: CityDistrict | undefined | null,
  building: CityBuilding | undefined | null,
  color: string,
  zoomScale: number,
) {
  const target = district
    ? {
        minX: district.worldBounds.minX,
        maxX: district.worldBounds.maxX,
        minZ: district.worldBounds.minZ,
        maxZ: district.worldBounds.maxZ,
      }
    : building
      ? (() => {
          const size = Math.max(building.dimensions[0], building.dimensions[2]);
          const half = size / 2;
          return {
            minX: building.position.x - half,
            maxX: building.position.x + half,
            minZ: building.position.z - half,
            maxZ: building.position.z + half,
          };
        })()
      : null;
  if (!target) return;

  const tl = worldToCanvas(target.minX, target.minZ);
  const br = worldToCanvas(target.maxX, target.maxZ);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * zoomScale;
  ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  ctx.restore();
}

/**
 * Fit the city into the canvas, honoring `safeArea`. The canvas stays
 * full-size; the fit treats the inset inner rect as the boundary (so chrome can
 * float over the margins), matching FileCity3D's `safeArea` semantics. Returns
 * the shifted `offsetX`/`offsetZ` (so `worldToCanvas` and hit-testing, which
 * both run through this, stay in lockstep) plus the inner-rect metrics needed
 * to center a focus zoom on the inset region rather than the full canvas.
 */
function calculateFitWithSafeArea(
  cityData: CityData,
  width: number,
  height: number,
  padding: number,
  safeArea?: SafeArea,
  /**
   * Screen-space band reserved at the TOP of the fit for source label chips
   * (multi-city layouts draw a repo label just above each city's back edge).
   * Analogous to FileCity3D padding its camera frame for the label chip.
   */
  reserveTopPx: number = 0,
) {
  const left = safeArea?.left ?? 0;
  const right = safeArea?.right ?? 0;
  const top = safeArea?.top ?? 0;
  const bottom = safeArea?.bottom ?? 0;

  const insetLeft = left * width;
  const insetTop = top * height + reserveTopPx;
  const innerWidth = Math.max(1, width * Math.max(0, 1 - left - right));
  const innerHeight = Math.max(
    1,
    height * Math.max(0, 1 - top - bottom) - reserveTopPx,
  );

  const { scale, offsetX, offsetZ } = calculateScaleAndOffset(
    cityData,
    innerWidth,
    innerHeight,
    padding,
  );

  return {
    scale,
    offsetX: offsetX + insetLeft,
    offsetZ: offsetZ + insetTop,
    innerLeft: insetLeft,
    innerTop: insetTop,
    innerWidth,
    innerHeight,
  };
}

export const ArchitectureMapHighlightLayers = ArchitectureMapHighlightLayersInner;
