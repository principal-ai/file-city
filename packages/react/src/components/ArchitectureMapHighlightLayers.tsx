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

const DEFAULT_DISPLAY_OPTIONS: MapDisplayOptions = {
  showGrid: false,
  showConnections: true,
  maxConnections: 20,
  gridSize: 50,
  padding: 20,
};

export interface ArchitectureMapHighlightLayersProps {
  // Core data
  cityData?: CityData;

  // Layer-based highlighting instead of path sets
  highlightLayers?: HighlightLayer[];
  onLayerToggle?: (layerId: string, enabled: boolean) => void;
  showLayerControls?: boolean;
  defaultBuildingColor?: string;

  // Navigation and interaction
  focusDirectory?: string | null;
  rootDirectoryName?: string;
  onDirectorySelect?: (directory: string | null) => void;
  onFileClick?: (path: string, type: 'file' | 'directory') => void;
  enableZoom?: boolean;

  // Animated zoom to directory
  zoomToPath?: string | null; // When set, animates zoom to frame this directory/file
  onZoomComplete?: () => void; // Called when zoom animation completes
  zoomAnimationSpeed?: number; // Animation easing factor (0-1), default 0.12
  allowZoomToPath?: boolean; // Allow programmatic zoomToPath even when enableZoom is false (default: true)

  // Display options
  fullSize?: boolean;
  showGrid?: boolean;
  showFileNames?: boolean;
  className?: string;

  // Selective rendering
  selectiveRender?: SelectiveRenderOptions;

  // Canvas appearance
  canvasBackgroundColor?: string;

  // Additional styling options
  hoverBorderColor?: string;
  disableOpacityDimming?: boolean;
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

  onHover?: (info: {
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

function ArchitectureMapHighlightLayersInner({
  cityData,
  highlightLayers = [],
  onLayerToggle,
  focusDirectory = null,
  rootDirectoryName,
  onDirectorySelect,
  onFileClick,
  enableZoom = false,
  zoomToPath = null,
  onZoomComplete,
  zoomAnimationSpeed = 0.12,
  allowZoomToPath = true,
  fullSize = false,
  showGrid = false,
  showFileNames = false,
  className = '',
  selectiveRender,
  canvasBackgroundColor,
  hoverBorderColor,
  disableOpacityDimming = true,
  defaultDirectoryColor,
  defaultBuildingColor,
  subdirectoryMode,
  showLayerControls = false,
  showFileTypeIcons = true,
  showDirectoryLabels = true,
  transform = { rotation: 0 }, // Default to no rotation
  onHover,
  buildingBorderRadius = 0,
  districtBorderRadius = 0,
}: ArchitectureMapHighlightLayersProps) {
  const { theme } = useTheme();

  // Use theme colors as defaults, with prop overrides
  const resolvedCanvasBackgroundColor = canvasBackgroundColor ?? theme.colors.background;
  const resolvedHoverBorderColor = hoverBorderColor ?? theme.colors.text;
  const resolvedDefaultDirectoryColor = defaultDirectoryColor ?? theme.colors.backgroundSecondary;
  const resolvedDefaultBuildingColor = defaultBuildingColor ?? theme.colors.muted;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Track the last zoomToPath to detect changes
  const lastZoomToPathRef = useRef<string | null>(null);

  // Throttle ref for hover updates (improves performance with large datasets)
  const lastHoverUpdateRef = useRef<number>(0);
  const HOVER_THROTTLE_MS = 16; // ~60fps max for hover updates

  useEffect(() => {
    // Reset user interaction state when enableZoom is disabled
    if (!enableZoom) {
      setZoomState(prev => ({
        ...prev,
        isDragging: false,
        hasMouseMoved: false,
      }));
    }
    // Only reset zoom position when both user zoom AND programmatic zoom are disabled
    if (!enableZoom && !allowZoomToPath) {
      setZoomState(prev => ({
        ...prev,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }));
      setTargetZoom(null);
    }
  }, [enableZoom, allowZoomToPath]);

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
    const resolution = Math.max(minSize, minSize + scaleFactor * 300);

    return { width: resolution, height: resolution };
  };

  const [canvasSize, setCanvasSize] = useState(() =>
    calculateCanvasResolution(cityData?.buildings?.length || 10, cityData?.bounds),
  );

  const [displayOptions] = useState<MapDisplayOptions>({
    ...DEFAULT_DISPLAY_OPTIONS,
    showGrid,
  });

  const filteredCityData = useMemo(() => {
    if (!cityData) {
      return undefined;
    }

    let processedData = cityData;
    if (subdirectoryMode?.enabled) {
      const autoCenter = subdirectoryMode.autoCenter === true;

      // Use new multi-filter function if filters are provided
      if (subdirectoryMode.filters && subdirectoryMode.filters.length > 0) {
        processedData = filterCityDataForMultipleDirectories(
          cityData,
          subdirectoryMode.filters,
          autoCenter,
          subdirectoryMode.combineMode || 'union',
        );
      } else if (subdirectoryMode.rootPath) {
        // Fallback to single path for backward compatibility
        processedData = filterCityDataForSubdirectory(
          cityData,
          subdirectoryMode.rootPath,
          autoCenter,
        );
      }
    }

    return filterCityDataForSelectiveRender(processedData, selectiveRender);
  }, [cityData, selectiveRender, subdirectoryMode]);

  const canvasSizingData = useMemo(() => {
    if (subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData) {
      return cityData;
    }
    return filteredCityData;
  }, [subdirectoryMode?.enabled, subdirectoryMode?.autoCenter, cityData, filteredCityData]);

  // Handle zoomToPath changes - calculate target zoom to frame the specified path
  useEffect(() => {
    // Skip if programmatic zoom is not allowed or path hasn't changed
    if (!allowZoomToPath || zoomToPath === lastZoomToPathRef.current) {
      return;
    }

    lastZoomToPathRef.current = zoomToPath;

    // If zoomToPath is null, reset to default view
    if (zoomToPath === null) {
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
    const normalizedPath = zoomToPath.replace(/^\/+|\/+$/g, '');
    const targetDistrict = filteredCityData.districts.find(
      d => d.path === normalizedPath || d.path === zoomToPath,
    );
    const targetBuilding = filteredCityData.buildings.find(
      b => b.path === normalizedPath || b.path === zoomToPath,
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
    const { scale: baseScale, offsetX: baseOffsetX, offsetZ: baseOffsetZ } = calculateScaleAndOffset(
      coordinateData,
      displayWidth,
      displayHeight,
      displayOptions.padding,
    );

    // Calculate target center in world coordinates
    const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2;
    const targetCenterZ = (targetBounds.minZ + targetBounds.maxZ) / 2;

    // Calculate target size in screen coordinates (at base zoom)
    const targetScreenWidth = (targetBounds.maxX - targetBounds.minX) * baseScale;
    const targetScreenHeight = (targetBounds.maxZ - targetBounds.minZ) * baseScale;

    // Calculate zoom scale to fit target with padding (80% of display)
    const paddingFactor = 0.8;
    const scaleToFitWidth = (displayWidth * paddingFactor) / targetScreenWidth;
    const scaleToFitHeight = (displayHeight * paddingFactor) / targetScreenHeight;
    const newZoomScale = Math.min(scaleToFitWidth, scaleToFitHeight, 5); // Cap at 5x

    // Calculate the base screen position of target center (before zoom transform)
    // This matches the worldToCanvas formula: ((x - bounds.minX) * scale + offsetX)
    const baseScreenX = (targetCenterX - coordinateData.bounds.minX) * baseScale + baseOffsetX;
    const baseScreenY = (targetCenterZ - coordinateData.bounds.minZ) * baseScale + baseOffsetZ;

    // Calculate offset to center the target
    // Full formula: screenPos = baseScreenPos * zoomScale + zoomOffset
    // To center: displayCenter = baseScreen * zoomScale + zoomOffset
    // Therefore: zoomOffset = displayCenter - baseScreen * zoomScale
    const newOffsetX = displayWidth / 2 - baseScreenX * newZoomScale;
    const newOffsetY = displayHeight / 2 - baseScreenY * newZoomScale;

    setTargetZoom({
      scale: newZoomScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }, [
    zoomToPath,
    allowZoomToPath,
    filteredCityData,
    canvasSizingData,
    canvasSize,
    displayOptions.padding,
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
        subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
          ? cityData
          : filteredCityData;

      const { scale } = calculateScaleAndOffset(
        coordinateSystemData,
        displayWidth,
        displayHeight,
        displayOptions.padding,
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
    cityData,
    allLayersWithoutAbstraction,
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
    const { scale, offsetX, offsetZ } = calculateScaleAndOffset(
      filteredCityData,
      width,
      height,
      displayOptions.padding,
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

    const displayWidth = canvas.clientWidth || canvasSize.width;
    const displayHeight = canvas.clientHeight || canvasSize.height;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.fillStyle = resolvedCanvasBackgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (displayOptions.showGrid) {
      drawGrid(ctx, displayWidth, displayHeight, displayOptions.gridSize);
    }

    const coordinateSystemData =
      subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
        ? cityData
        : filteredCityData;

    const { scale, offsetX, offsetZ } = calculateScaleAndOffset(
      coordinateSystemData,
      displayWidth,
      displayHeight,
      displayOptions.padding,
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
      disableOpacityDimming,
      showFileTypeIcons,
      buildingBorderRadius,
      layerIndex, // Pre-built index for O(1) lookups
    );

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
    disableOpacityDimming,
    focusDirectory,
    subdirectoryMode,
    cityData,
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
        subdirectoryMode?.enabled && subdirectoryMode.autoCenter !== true && cityData
          ? cityData
          : filteredCityData;

      const { scale, offsetX, offsetZ } = calculateScaleAndOffset(
        coordinateSystemData,
        width,
        height,
        displayOptions.padding,
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
      cityData,
    ],
  );

  // Mouse event handlers
  // Call onHover callback when interaction state changes
  useEffect(() => {
    if (onHover && interactionState) {
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

      onHover({
        hoveredDistrict: interactionState.hoveredDistrict,
        hoveredBuilding: interactionState.hoveredBuilding,
        mousePos: interactionState.mousePos,
        fileTooltip,
        directoryTooltip,
        fileCount: interactionState.hoveredDistrict
          ? Math.round(interactionState.hoveredDistrict.fileCount || 0)
          : null,
      });
    }
  }, [interactionState, onHover]);

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

  const handleClick = () => {
    if (zoomState.hasMouseMoved) {
      return;
    }

    if (interactionState.hoveredBuilding && onFileClick) {
      /*const fullPath = subdirectoryMode?.enabled && subdirectoryMode.rootPath
        ? `${subdirectoryMode.rootPath}/${interactionState.hoveredBuilding.path}`
        : interactionState.hoveredBuilding.path;*/
      onFileClick(interactionState.hoveredBuilding.path, 'file');
      return;
    }

    if (interactionState.hoveredDistrict) {
      const districtPath = interactionState.hoveredDistrict.path || '';
      const isRoot = !districtPath || districtPath === '';

      const fullPath =
        subdirectoryMode?.enabled && subdirectoryMode.rootPath && !isRoot
          ? `${subdirectoryMode.rootPath}/${districtPath}`
          : districtPath;

      if (onFileClick && !isRoot) {
        onFileClick(fullPath, 'directory');
      } else if (onDirectorySelect) {
        onDirectorySelect(focusDirectory === fullPath ? null : fullPath);
      }
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
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: `${theme.radii[2]}px`,
          padding: `${theme.space[4]}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body }}>
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

  const scaleX = (width - horizontalPadding) / cityDepth;
  const scaleZ = (height - verticalPadding) / cityWidth;
  const scale = Math.min(scaleX, scaleZ);

  const scaledCityWidth = cityDepth * scale;
  const scaledCityHeight = cityWidth * scale;
  const offsetX = (width - scaledCityWidth) / 2;
  const offsetZ = (height - scaledCityHeight) / 2;

  return { scale, offsetX, offsetZ };
}

export const ArchitectureMapHighlightLayers = ArchitectureMapHighlightLayersInner;
