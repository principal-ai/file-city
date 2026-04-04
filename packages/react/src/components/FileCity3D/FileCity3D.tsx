/**
 * FileCity3D - 3D visualization of a codebase using React Three Fiber
 *
 * Renders CityData from file-city-builder as actual 3D buildings with
 * camera controls, lighting, and interactivity.
 *
 * Supports animated transition from 2D (flat) to 3D (grown buildings).
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent, useThree } from '@react-three/fiber';

import { useSpring } from '@react-spring/three';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { getFileConfig } from '@principal-ai/file-city-builder';
import type {
  CityData,
  CityBuilding,
  CityDistrict,
  FileConfigResult,
} from '@principal-ai/file-city-builder';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';

// Extend JSX with Three.js elements
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Re-export types for convenience
export type { CityData, CityBuilding, CityDistrict };

// Highlight layer types
export interface HighlightLayer {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Whether layer is active */
  enabled: boolean;
  /** Highlight color (hex) */
  color: string;
  /** Items to highlight */
  items: HighlightItem[];
  /** Opacity for highlighted items (0-1) */
  opacity?: number;
}

export interface HighlightItem {
  /** File or directory path */
  path: string;
  /** Type of item */
  type: 'file' | 'directory';
}

/** What to do with non-highlighted buildings */
export type IsolationMode =
  | 'none' // Show all buildings normally
  | 'transparent' // Make non-highlighted buildings transparent
  | 'collapse' // Flatten non-highlighted buildings to ground level
  | 'hide'; // Hide non-highlighted buildings entirely

// Animation configuration
export interface AnimationConfig {
  /** Start with buildings flat (2D view) */
  startFlat?: boolean;
  /** Auto-start the grow animation after this delay (ms). Set to null to disable. */
  autoStartDelay?: number | null;
  /** Duration of the grow animation in ms */
  growDuration?: number;
  /** Stagger delay between buildings in ms */
  staggerDelay?: number;
  /** Spring tension (higher = faster/snappier) */
  tension?: number;
  /** Spring friction (higher = less bouncy) */
  friction?: number;
}

/** Height scaling mode for buildings */
export type HeightScaling = 'logarithmic' | 'linear';

const DEFAULT_ANIMATION: AnimationConfig = {
  startFlat: false,
  autoStartDelay: 500,
  growDuration: 1500,
  staggerDelay: 15,
  tension: 120,
  friction: 14,
};

/**
 * Calculate building height based on file metrics.
 * - logarithmic: Compresses large values (default, good for mixed codebases)
 * - linear: Direct scaling (1 line = linearScale units of height)
 */
function calculateBuildingHeight(
  building: CityBuilding,
  scaling: HeightScaling = 'logarithmic',
  linearScale: number = 0.05,
): number {
  const minHeight = 2;

  // Use lineCount if available (any text file), otherwise fall back to size
  if (building.lineCount !== undefined) {
    const lines = Math.max(building.lineCount, 1);

    if (scaling === 'linear') {
      return minHeight + lines * linearScale;
    }
    // Logarithmic: log10(10) = 1, log10(100) = 2, log10(1000) = 3
    return minHeight + Math.log10(lines) * 12;
  } else if (building.size !== undefined) {
    const bytes = Math.max(building.size, 1);

    if (scaling === 'linear') {
      return minHeight + (bytes / 1024) * linearScale;
    }
    // Logarithmic scale based on size
    return minHeight + (Math.log10(bytes) - 2) * 12;
  }

  // Fallback to dimension height if no metrics available
  return building.dimensions[1];
}

// ============================================================================
// Icon Texture Generation - Lucide icon SVG paths
// ============================================================================

// Lucide icon paths (from lucide.dev)
const LUCIDE_ICONS: Record<string, string> = {
  Atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
  Lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  EyeOff:
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  Key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
  GitBranch:
    '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  TestTube:
    '<path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/>',
  FlaskConical:
    '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  BookText:
    '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M8 11h8"/><path d="M8 7h6"/>',
  BookOpen:
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  ScrollText:
    '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  Settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  Home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};

// Cache for icon textures
const iconTextureCache = new Map<string, THREE.Texture>();

/**
 * Generate a texture from a Lucide icon
 */
function getIconTexture(iconName: string, color: string = '#ffffff'): THREE.Texture | null {
  const cacheKey = `${iconName}-${color}`;

  if (iconTextureCache.has(cacheKey)) {
    return iconTextureCache.get(cacheKey)!;
  }

  const iconPath = LUCIDE_ICONS[iconName];
  if (!iconPath) {
    // Icon not in our subset, skip silently
    return null;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

  // Create canvas and draw SVG
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Create image from SVG
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  // Create texture (will update when image loads)
  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  img.onload = () => {
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, 128, 128);

    // Draw centered icon
    ctx.drawImage(img, 32, 32, 64, 64);

    texture.needsUpdate = true;
    URL.revokeObjectURL(url);
  };

  img.src = url;

  iconTextureCache.set(cacheKey, texture);
  return texture;
}

// Get full file config from centralized file-city-builder lookup
function getConfigForFile(building: CityBuilding): FileConfigResult {
  if (building.color) {
    return {
      color: building.color,
      renderStrategy: 'fill',
      opacity: 1,
      matchedPattern: 'preset',
      matchType: 'filename',
    };
  }
  return getFileConfig(building.path);
}

function getColorForFile(building: CityBuilding): string {
  return getConfigForFile(building).color;
}

/**
 * Check if a path is highlighted by any enabled layer.
 */
function getHighlightForPath(
  path: string,
  layers: HighlightLayer[],
): { color: string; opacity: number } | null {
  for (const layer of layers) {
    if (!layer.enabled) continue;

    for (const item of layer.items) {
      if (item.type === 'file' && item.path === path) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
      if (item.type === 'directory' && (path === item.path || path.startsWith(item.path + '/'))) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
    }
  }
  return null;
}

function hasActiveHighlights(layers: HighlightLayer[]): boolean {
  return layers.some(layer => layer.enabled && layer.items.length > 0);
}

// ============================================================================
// Building Edges - Batched edge rendering for performance
// ============================================================================

interface BuildingEdgeData {
  width: number;
  depth: number;
  fullHeight: number;
  x: number;
  z: number;
  staggerDelayMs: number;
  buildingIndex: number; // Index to look up height multiplier
}

interface BuildingEdgesProps {
  buildings: BuildingEdgeData[];
  growProgress: number;
  minHeight: number;
  baseOffset: number;
  springDuration: number;
  heightMultipliersRef: React.MutableRefObject<Float32Array | null>;
}

function BuildingEdges({
  buildings,
  growProgress,
  minHeight,
  baseOffset,
  springDuration,
  heightMultipliersRef,
}: BuildingEdgesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // 4 corner edges per building
  const numEdges = buildings.length * 4;

  // Pre-compute edge data
  const edgeData = useMemo(() => {
    return buildings.flatMap(data => {
      const { width, depth, x, z, fullHeight, staggerDelayMs, buildingIndex } = data;
      const halfW = width / 2;
      const halfD = depth / 2;

      return [
        { x: x - halfW, z: z - halfD, fullHeight, staggerDelayMs, buildingIndex },
        { x: x + halfW, z: z - halfD, fullHeight, staggerDelayMs, buildingIndex },
        { x: x - halfW, z: z + halfD, fullHeight, staggerDelayMs, buildingIndex },
        { x: x + halfW, z: z + halfD, fullHeight, staggerDelayMs, buildingIndex },
      ];
    });
  }, [buildings]);

  // Animate edges
  useFrame(({ clock }) => {
    if (!meshRef.current || edgeData.length === 0) return;

    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }

    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;

    edgeData.forEach((edge, idx) => {
      const { x, z, fullHeight, staggerDelayMs, buildingIndex } = edge;

      // Get height multiplier from shared ref (for collapse animation)
      const heightMultiplier = heightMultipliersRef.current?.[buildingIndex] ?? 1;

      // Calculate per-building animation progress
      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
      }

      // Apply both grow animation and collapse multiplier
      const height = animProgress * fullHeight * heightMultiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(0.3, height, 0.3); // Thin box for edge
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(idx, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (numEdges === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, numEdges]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#1a1a2e" transparent opacity={0.7} />
    </instancedMesh>
  );
}

// ============================================================================
// Instanced Buildings - High performance rendering for large scenes
// ============================================================================

interface InstancedBuildingsProps {
  buildings: CityBuilding[];
  centerOffset: { x: number; z: number };
  onHover?: (building: CityBuilding | null) => void;
  onClick?: (building: CityBuilding) => void;
  hoveredIndex: number | null;
  selectedIndex: number | null;
  growProgress: number;
  animationConfig: AnimationConfig;
  heightScaling: HeightScaling;
  linearScale: number;
  staggerIndices: number[];
  focusDirectory: string | null;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
}

// Helper to check if a path is inside a directory
function isPathInDirectory(path: string, directory: string | null): boolean {
  if (!directory) return true;
  return path === directory || path.startsWith(directory + '/');
}

function InstancedBuildings({
  buildings,
  centerOffset,
  onHover,
  onClick,
  hoveredIndex,
  selectedIndex,
  growProgress,
  animationConfig,
  heightScaling,
  linearScale,
  staggerIndices,
  focusDirectory,
  highlightLayers,
  isolationMode,
}: InstancedBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Track animated height multipliers for each building (for collapse animation)
  const heightMultipliersRef = useRef<Float32Array | null>(null);
  const targetMultipliersRef = useRef<Float32Array | null>(null);
  // Track dim state for buildings in focus but not highlighted (0 = dimmed, 1 = full)
  const dimMultipliersRef = useRef<Float32Array | null>(null);
  const targetDimRef = useRef<Float32Array | null>(null);

  // Check if highlight layers have any active items
  const hasActiveHighlightLayers = useMemo(() => {
    return highlightLayers.some(layer => layer.enabled && layer.items.length > 0);
  }, [highlightLayers]);

  // Initialize height and dim multiplier arrays
  useEffect(() => {
    if (buildings.length > 0) {
      if (
        !heightMultipliersRef.current ||
        heightMultipliersRef.current.length !== buildings.length
      ) {
        heightMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        targetMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        dimMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        targetDimRef.current = new Float32Array(buildings.length).fill(1);
      }
    }
  }, [buildings.length]);

  // Update target multipliers when focusDirectory or highlightLayers change
  useEffect(() => {
    if (!targetMultipliersRef.current || !targetDimRef.current) return;

    buildings.forEach((building, index) => {
      let shouldCollapse = false;
      let shouldDim = false;

      const isInFocusDirectory = focusDirectory
        ? isPathInDirectory(building.path, focusDirectory)
        : true; // No focusDirectory means all are "in focus"

      const isHighlighted = hasActiveHighlightLayers
        ? getHighlightForPath(building.path, highlightLayers) !== null
        : true; // No highlights means all are "highlighted"

      // Determine collapse and dim behavior based on what's active:
      // - focusDirectory only: collapse if outside focus
      // - highlightLayers only (with collapse mode): collapse if not highlighted
      // - both: collapse if outside focus, dim if in focus but not highlighted
      if (focusDirectory && hasActiveHighlightLayers && isolationMode === 'collapse') {
        // Both active: collapse if outside focus, dim if in focus but not highlighted
        shouldCollapse = !isInFocusDirectory;
        shouldDim = isInFocusDirectory && !isHighlighted;
      } else if (focusDirectory) {
        // Focus only: collapse if outside focus directory
        shouldCollapse = !isInFocusDirectory;
      } else if (hasActiveHighlightLayers && isolationMode === 'collapse') {
        // Highlight only with collapse: collapse if not highlighted
        shouldCollapse = !isHighlighted;
      }

      // Height: 1.0 = full, 0.05 = flat (collapsed or dimmed)
      if (shouldCollapse || shouldDim) {
        targetMultipliersRef.current![index] = 0.05;
      } else {
        targetMultipliersRef.current![index] = 1;
      }
      // Dim ref controls graying: 0 = gray out, 1 = keep color
      // Collapsed buildings go gray, dimmed buildings keep their color
      targetDimRef.current![index] = shouldCollapse ? 0 : 1;
    });
  }, [focusDirectory, buildings, highlightLayers, isolationMode, hasActiveHighlightLayers]);

  // Pre-compute building data
  const buildingData = useMemo(() => {
    return buildings.map((building, index) => {
      const [width, , depth] = building.dimensions;
      const fullHeight = calculateBuildingHeight(building, heightScaling, linearScale);
      const color = getColorForFile(building);

      const x = building.position.x - centerOffset.x;
      const z = building.position.z - centerOffset.z;

      const staggerIndex = staggerIndices[index] ?? index;
      const staggerDelayMs = (animationConfig.staggerDelay || 15) * staggerIndex;

      return {
        building,
        index,
        width,
        depth,
        fullHeight,
        color,
        x,
        z,
        staggerDelayMs,
      };
    });
  }, [
    buildings,
    centerOffset,
    heightScaling,
    linearScale,
    staggerIndices,
    animationConfig.staggerDelay,
  ]);

  const minHeight = 0.3;
  const baseOffset = 0.2;
  const tension = animationConfig.tension || 120;
  const friction = animationConfig.friction || 14;
  const springDuration = Math.sqrt(1 / (tension * 0.001)) * friction * 20;

  // Initialize all buildings (only on first render or when building data changes)
  // DO NOT include focusDirectory here - that would bypass the animation
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!meshRef.current || buildingData.length === 0) return;

    buildingData.forEach((data, instanceIndex) => {
      const { width, depth, x, z, color, fullHeight } = data;

      // Use the current animated multiplier, or default to 1 on first render
      const multiplier = heightMultipliersRef.current?.[instanceIndex] ?? 1;

      const height = growProgress * fullHeight * multiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width, height, depth);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      tempColor.set(color);
      meshRef.current!.setColorAt(instanceIndex, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    initializedRef.current = true;
  }, [buildingData, growProgress, tempObject, tempColor, minHeight, baseOffset]);

  // Animate buildings each frame
  useFrame(({ clock }) => {
    if (!meshRef.current || buildingData.length === 0) return;
    if (!heightMultipliersRef.current || !targetMultipliersRef.current) return;

    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }

    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;

    // Animation speed for collapse/expand (lerp factor per frame)
    const collapseSpeed = 0.08;

    buildingData.forEach((data, instanceIndex) => {
      const { width, depth, fullHeight, x, z, staggerDelayMs } = data;

      // Animate height multiplier towards target
      const currentMultiplier = heightMultipliersRef.current![instanceIndex];
      const targetMultiplier = targetMultipliersRef.current![instanceIndex];
      const newMultiplier =
        currentMultiplier + (targetMultiplier - currentMultiplier) * collapseSpeed;
      heightMultipliersRef.current![instanceIndex] = newMultiplier;

      // Animate dim multiplier towards target
      const currentDim = dimMultipliersRef.current![instanceIndex];
      const targetDim = targetDimRef.current![instanceIndex];
      const newDim = currentDim + (targetDim - currentDim) * collapseSpeed;
      dimMultipliersRef.current![instanceIndex] = newDim;

      // Calculate grow animation progress
      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
      }

      // Apply both grow animation and collapse multiplier
      const height = animProgress * fullHeight * newMultiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      const isHovered = hoveredIndex === data.index;
      const isSelected = selectedIndex === data.index;
      const scale = isSelected ? 1.08 : isHovered ? 1.05 : 1;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width * scale, height, depth * scale);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      // Apply color effects
      tempColor.set(data.color);

      // Gray out collapsed buildings (newDim < 0.5 means should be gray)
      if (newDim < 0.5) {
        const grayAmount = 1 - newDim * 2; // 0 at dim=0.5, 1 at dim=0
        const gray = 0.3;
        tempColor.r = tempColor.r * (1 - grayAmount) + gray * grayAmount;
        tempColor.g = tempColor.g * (1 - grayAmount) + gray * grayAmount;
        tempColor.b = tempColor.b * (1 - grayAmount) + gray * grayAmount;
      }

      if (isSelected) {
        tempColor.multiplyScalar(1.4);
      } else if (isHovered) {
        tempColor.multiplyScalar(1.2);
      }
      meshRef.current!.setColorAt(instanceIndex, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    // Update bounding sphere for raycasting as buildings grow/animate
    meshRef.current.computeBoundingSphere();
  });

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.instanceId !== undefined && e.instanceId < buildingData.length) {
        const data = buildingData[e.instanceId];
        onHover?.(data.building);
      }
    },
    [buildingData, onHover],
  );

  const handlePointerOut = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId !== undefined && e.instanceId < buildingData.length) {
        const data = buildingData[e.instanceId];
        onClick?.(data.building);
      }
    },
    [buildingData, onClick],
  );

  if (buildingData.length === 0) return null;

  return (
    <group>
      {/* All buildings - single mesh, original colors */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildingData.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.1} roughness={0.35} />
      </instancedMesh>

      {/* Building edge outlines */}
      <BuildingEdges
        buildings={buildingData.map(d => ({
          width: d.width,
          depth: d.depth,
          fullHeight: d.fullHeight,
          x: d.x,
          z: d.z,
          staggerDelayMs: d.staggerDelayMs,
          buildingIndex: d.index,
        }))}
        growProgress={growProgress}
        minHeight={minHeight}
        baseOffset={baseOffset}
        springDuration={springDuration}
        heightMultipliersRef={heightMultipliersRef}
      />
    </group>
  );
}

// ============================================================================
// Building Icons - Renders icons on top of buildings
// ============================================================================

interface BuildingIconsProps {
  buildings: CityBuilding[];
  centerOffset: { x: number; z: number };
  growProgress: number;
  heightScaling: HeightScaling;
  linearScale: number;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  hasActiveHighlights: boolean;
  staggerIndices: number[];
  springDuration: number;
  staggerDelay: number;
}

// Individual animated icon component
interface AnimatedIconProps {
  x: number;
  z: number;
  targetHeight: number;
  iconSize: number;
  texture: THREE.Texture;
  opacity: number;
  growProgress: number;
  staggerDelayMs: number;
  springDuration: number;
}

function AnimatedIcon({
  x,
  z,
  targetHeight,
  iconSize,
  texture,
  opacity,
  growProgress,
  staggerDelayMs,
  springDuration,
}: AnimatedIconProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }

    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;

    // Calculate per-icon animation progress
    const elapsed = currentTime - animStartTime - staggerDelayMs;
    let animProgress = growProgress;

    if (growProgress > 0 && elapsed >= 0) {
      const t = Math.min(elapsed / springDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      animProgress = eased * growProgress;
    } else if (growProgress > 0 && elapsed < 0) {
      animProgress = 0;
    }

    const minHeight = 0.3;
    const baseOffset = 0.2;
    const height = animProgress * targetHeight + minHeight;
    const buildingTop = height + baseOffset;

    // When flat (animProgress=0): icon lies flat at ground level
    // When grown (animProgress=1): icon floats above building
    const flatY = minHeight + baseOffset + 0.5;
    const grownY = buildingTop + iconSize / 2 + 2;
    const yPosition = flatY + (grownY - flatY) * animProgress;

    meshRef.current.position.y = yPosition;

    // Rotate from flat (facing up) to upright (facing camera-ish)
    // Flat: -Math.PI / 2 (facing up)
    // Grown: 0 (facing forward)
    const flatRotationX = -Math.PI / 2;
    const grownRotationX = 0;
    meshRef.current.rotation.x = flatRotationX + (grownRotationX - flatRotationX) * animProgress;

    if (materialRef.current) {
      // Show icons even when flat, fade out only slightly
      const minOpacity = 0.8;
      const effectiveOpacity = minOpacity + (1 - minOpacity) * animProgress;
      materialRef.current.opacity = opacity * effectiveOpacity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[x, 0, z]}
      scale={[iconSize, iconSize, 1]}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0.8}
        depthTest={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function BuildingIcons({
  buildings,
  centerOffset,
  growProgress,
  heightScaling,
  linearScale,
  highlightLayers,
  isolationMode,
  hasActiveHighlights,
  staggerIndices,
  springDuration,
  staggerDelay,
}: BuildingIconsProps) {
  // Pre-compute buildings with icons
  const buildingsWithIcons = useMemo(() => {
    return buildings
      .map((building, index) => {
        const config = getConfigForFile(building);
        if (!config.icon) return null;

        const highlight = getHighlightForPath(building.path, highlightLayers);
        const isHighlighted = highlight !== null;
        const shouldDim = hasActiveHighlights && !isHighlighted;
        const shouldHide = shouldDim && isolationMode === 'hide';
        const shouldCollapse = shouldDim && isolationMode === 'collapse';

        if (shouldHide) return null;

        const fullHeight = calculateBuildingHeight(building, heightScaling, linearScale);
        const targetHeight = shouldCollapse ? 0.5 : fullHeight;

        const x = building.position.x - centerOffset.x;
        const z = building.position.z - centerOffset.z;

        const staggerIndex = staggerIndices[index] ?? index;
        const staggerDelayMs = staggerDelay * staggerIndex;

        return {
          building,
          config,
          x,
          z,
          targetHeight,
          shouldDim,
          staggerDelayMs,
        };
      })
      .filter(Boolean) as Array<{
      building: CityBuilding;
      config: FileConfigResult;
      x: number;
      z: number;
      targetHeight: number;
      shouldDim: boolean;
      staggerDelayMs: number;
    }>;
  }, [
    buildings,
    centerOffset,
    highlightLayers,
    isolationMode,
    hasActiveHighlights,
    heightScaling,
    linearScale,
    staggerIndices,
    staggerDelay,
  ]);

  // Icons are now always rendered (flat or grown)
  return (
    <>
      {buildingsWithIcons.map(
        ({ building, config, x, z, targetHeight, shouldDim, staggerDelayMs }) => {
          const icon = config.icon!;
          const texture = getIconTexture(icon.name, icon.color || '#ffffff');
          if (!texture) return null;

          // Icon size based on building dimensions
          const [width] = building.dimensions;
          const baseSize = Math.max(width * 1.2, 8);
          const heightBoost = Math.min(targetHeight / 20, 3);
          const iconSize = (baseSize + heightBoost) * (icon.size || 1);

          const opacity = shouldDim && isolationMode === 'transparent' ? 0.3 : 1;

          return (
            <AnimatedIcon
              key={building.path}
              x={x}
              z={z}
              targetHeight={targetHeight}
              iconSize={iconSize}
              texture={texture}
              opacity={opacity}
              growProgress={growProgress}
              staggerDelayMs={staggerDelayMs}
              springDuration={springDuration}
            />
          );
        },
      )}
    </>
  );
}

// District floor component
interface DistrictFloorProps {
  district: CityDistrict;
  centerOffset: { x: number; z: number };
  opacity: number;
  highlightColor?: string | null;
  growProgress: number;
}

function DistrictFloor({ district, centerOffset, highlightColor, growProgress }: DistrictFloorProps) {
  const { worldBounds } = district;
  const width = worldBounds.maxX - worldBounds.minX;
  const depth = worldBounds.maxZ - worldBounds.minZ;
  const centerX = (worldBounds.minX + worldBounds.maxX) / 2 - centerOffset.x;
  const centerZ = (worldBounds.minZ + worldBounds.maxZ) / 2 - centerOffset.z;

  const dirName = district.path.split('/').pop() || district.path;

  const pathDepth = district.path.split('/').length;
  const floorY = -5 - pathDepth * 0.1;

  const borderColor = highlightColor || '#475569';
  const lineWidth = highlightColor ? 3 : 1;
  const labelColor = highlightColor || '#cbd5e1';

  // Interpolate text rotation and position based on growProgress
  // Flat: -Math.PI / 2 (facing up), positioned at center of district
  // Grown: -Math.PI / 6 (angled), positioned at edge of district
  const flatRotationX = -Math.PI / 2;
  const grownRotationX = -Math.PI / 6;
  const textRotationX = flatRotationX + (grownRotationX - flatRotationX) * growProgress;

  const flatY = 0.5;
  const grownY = 1.5;
  const textY = flatY + (grownY - flatY) * growProgress;

  const flatZ = 0; // Center of district when flat
  const grownZ = depth / 2 + 2; // Edge of district when grown
  const textZ = flatZ + (grownZ - flatZ) * growProgress;

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* Border outline */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} renderOrder={-1}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} attach="geometry" />
        <lineBasicMaterial color={borderColor} linewidth={lineWidth} depthWrite={false} />
      </lineSegments>

      {/* Highlighted floor fill when focused */}
      {highlightColor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY - 0.1, 0]} renderOrder={-2}>
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial color={highlightColor} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}

      {district.label && (
        <Text
          position={[0, textY, textZ]}
          rotation={[textRotationX, 0, 0]}
          fontSize={Math.min(3, width / 6)}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#0f172a"
        >
          {dirName}
        </Text>
      )}
    </group>
  );
}

// Camera controller
interface FocusTarget {
  x: number;
  z: number;
  size: number; // Approximate size of the focused area
}

interface AnimatedCameraProps {
  citySize: number;
  isFlat: boolean;
  focusTarget?: FocusTarget | null;
  maxBuildingHeight?: number;
}

// Camera rotation options
export interface RotateOptions {
  /** Animation duration in milliseconds. Default uses spring physics (~800ms feel). */
  duration?: number;
}

// Camera control API - populated by AnimatedCamera
interface CameraApi {
  reset: () => void;
  moveTo: (x: number, z: number, size?: number) => void;
  setTarget: (x: number, y: number, z: number, options?: RotateOptions) => void;
  rotateTo: (angleOrDirection: number | 'north' | 'south' | 'east' | 'west', options?: RotateOptions) => void;
  rotateBy: (degrees: number, options?: RotateOptions) => void;
  tiltTo: (angle: number | 'top' | 'level' | 'high' | 'low', options?: RotateOptions) => void;
  tiltBy: (degrees: number, options?: RotateOptions) => void;
  getCurrentPosition: () => { x: number; y: number; z: number } | null;
  getCurrentTarget: () => { x: number; y: number; z: number } | null;
  getCurrentAngle: () => number | null;
  getCurrentTilt: () => number | null;
}

let cameraApi: CameraApi | null = null;

export function resetCamera() {
  cameraApi?.reset();
}

export function moveCameraTo(x: number, z: number, size?: number) {
  cameraApi?.moveTo(x, z, size);
}

/**
 * Set the camera's look-at target (center point for orbiting).
 * Camera maintains its current distance and angles relative to the new target.
 * @param x - Target X coordinate
 * @param y - Target Y coordinate (usually 0 for ground level)
 * @param z - Target Z coordinate
 * @param options - Optional settings including duration in ms
 */
export function setCameraTarget(x: number, y: number, z: number, options?: RotateOptions) {
  cameraApi?.setTarget(x, y, z, options);
}

/**
 * Get the current camera target (look-at point).
 */
export function getCameraTarget() {
  return cameraApi?.getCurrentTarget() ?? null;
}

/**
 * Rotate the camera to view the city from a specific angle or cardinal direction.
 * Uses the shortest path (e.g., 350° to 10° goes through 0°, not 180°).
 * @param angleOrDirection - Angle in degrees (0 = south, 90 = west, 180 = north, 270 = east)
 *                           or a cardinal direction string ('north', 'south', 'east', 'west')
 * @param options - Optional settings including duration in ms
 */
export function rotateCameraTo(
  angleOrDirection: number | 'north' | 'south' | 'east' | 'west',
  options?: RotateOptions
) {
  cameraApi?.rotateTo(angleOrDirection, options);
}

/**
 * Rotate the camera by a relative amount.
 * @param degrees - Degrees to rotate. Positive = clockwise, negative = counter-clockwise.
 * @param options - Optional settings including duration in ms
 */
export function rotateCameraBy(degrees: number, options?: RotateOptions) {
  cameraApi?.rotateBy(degrees, options);
}

/**
 * Tilt the camera to a specific vertical angle or preset.
 * @param angle - Angle in degrees (0 = top-down, 90 = level/horizontal)
 *                or a preset: 'top' (15°), 'high' (35°), 'low' (60°), 'level' (80°)
 * @param options - Optional settings including duration in ms
 */
export function tiltCameraTo(
  angle: number | 'top' | 'level' | 'high' | 'low',
  options?: RotateOptions
) {
  cameraApi?.tiltTo(angle, options);
}

/**
 * Tilt the camera by a relative amount.
 * @param degrees - Degrees to tilt. Positive = tilt down (towards top-down), negative = tilt up (towards level).
 * @param options - Optional settings including duration in ms
 */
export function tiltCameraBy(degrees: number, options?: RotateOptions) {
  cameraApi?.tiltBy(degrees, options);
}

export function getCameraPosition() {
  return cameraApi?.getCurrentPosition() ?? null;
}

/**
 * Get the current camera angle in degrees (0-360).
 * 0 = south, 90 = west, 180 = north, 270 = east
 */
export function getCameraAngle() {
  return cameraApi?.getCurrentAngle() ?? null;
}

/**
 * Get the current camera tilt in degrees (0-90).
 * 0 = top-down view, 90 = level/horizontal view
 */
export function getCameraTilt() {
  return cameraApi?.getCurrentTilt() ?? null;
}

function AnimatedCamera({ citySize, isFlat, focusTarget, maxBuildingHeight = 0 }: AnimatedCameraProps) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const isAnimatingRef = useRef(false);
  const isOrbitingRef = useRef(false);
  const hasAppliedInitial = useRef(false);
  const frameCount = useRef(0);

  // Compute target camera position
  // When flat, always use top-down view (ignore focusTarget)
  // When grown, use focusTarget if available, otherwise angled overview
  const targetPos = useMemo(() => {
    // Flat state: always top-down, ignore any focus
    // Height calculated to match 2D view zoom level (with FOV=50°)
    if (isFlat) {
      return {
        x: 0,
        y: citySize * 1.2,
        z: 0.001, // Near-zero for top-down (tiny offset to avoid gimbal lock)
        targetX: 0,
        targetY: 0,
        targetZ: 0,
      };
    }

    // Grown state: use focusTarget if available
    if (focusTarget) {
      const distance = Math.max(focusTarget.size * 2, 50);
      const height = Math.max(focusTarget.size * 1.5, 40);
      return {
        x: focusTarget.x,
        y: height,
        z: focusTarget.z + distance,
        targetX: focusTarget.x,
        targetY: 0,
        targetZ: focusTarget.z,
      };
    }

    // Grown state without focus: angled overview
    const baseHeight = citySize * 1.1;
    const buildingAwareHeight = maxBuildingHeight > 0
      ? Math.max(baseHeight, maxBuildingHeight * 2.5)
      : baseHeight;
    return {
      x: 0,
      y: buildingAwareHeight,
      z: citySize * 1.3,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };
  }, [focusTarget, citySize, isFlat, maxBuildingHeight]);

  // Spring animation for camera movement
  const [{ camX, camY, camZ, lookX, lookY, lookZ }, api] = useSpring(() => ({
    camX: targetPos.x,
    camY: targetPos.y,
    camZ: targetPos.z,
    lookX: targetPos.targetX,
    lookY: targetPos.targetY,
    lookZ: targetPos.targetZ,
    config: { tension: 60, friction: 20 },
    onStart: () => {
      isAnimatingRef.current = true;
    },
    onRest: () => {
      isAnimatingRef.current = false;
    },
  }));

  // Separate spring for orbit angle animation (animates along horizontal arc)
  const [{ orbitAngle }, orbitApi] = useSpring(() => ({
    orbitAngle: 0,
    config: { tension: 80, friction: 18 },
    onStart: () => {
      isOrbitingRef.current = true;
    },
    onRest: () => {
      isOrbitingRef.current = false;
    },
  }));

  // Separate spring for tilt angle animation (animates along vertical arc)
  const isTiltingRef = useRef(false);
  const [{ tiltAngle }, tiltApi] = useSpring(() => ({
    tiltAngle: 0,
    config: { tension: 80, friction: 18 },
    onStart: () => {
      isTiltingRef.current = true;
    },
    onRest: () => {
      isTiltingRef.current = false;
    },
  }));

  // Track orbit parameters during horizontal rotation
  const orbitParamsRef = useRef<{
    centerX: number;
    centerZ: number;
    distance: number;
    height: number;
  } | null>(null);

  // Track tilt parameters during vertical rotation
  const tiltParamsRef = useRef<{
    centerX: number;
    centerY: number;
    centerZ: number;
    distance: number;
    azimuthAngle: number; // horizontal angle to maintain
  } | null>(null);

  // When targetPos changes after initial, animate to new position
  useEffect(() => {
    // Skip the first render - we handle that directly in useFrame
    if (!hasAppliedInitial.current) return;

    api.start({
      camX: targetPos.x,
      camY: targetPos.y,
      camZ: targetPos.z,
      lookX: targetPos.targetX,
      lookY: targetPos.targetY,
      lookZ: targetPos.targetZ,
      onRest: () => {
        isAnimatingRef.current = false;
      },
    });
  }, [targetPos, api]);

  // Update camera each frame
  useFrame(() => {
    frameCount.current++;

    // Skip first 2 frames to ensure OrbitControls is fully initialized
    if (frameCount.current < 3) return;
    if (!controlsRef.current) return;

    // Set initial position: apply camera position directly (no spring animation)
    if (!hasAppliedInitial.current) {
      camera.position.set(targetPos.x, targetPos.y, targetPos.z);
      controlsRef.current.target.set(targetPos.targetX, targetPos.targetY, targetPos.targetZ);
      controlsRef.current.update();

      // Sync spring to this position so future animations start from here
      api.set({
        camX: targetPos.x,
        camY: targetPos.y,
        camZ: targetPos.z,
        lookX: targetPos.targetX,
        lookY: targetPos.targetY,
        lookZ: targetPos.targetZ,
      });

      hasAppliedInitial.current = true;
      return;
    }

    // Handle orbit animation (horizontal rotation along arc)
    if (isOrbitingRef.current && orbitParamsRef.current) {
      const { centerX, centerZ, distance, height } = orbitParamsRef.current;
      const currentAngle = orbitAngle.get();
      const radians = (currentAngle * Math.PI) / 180;

      const newX = centerX + Math.sin(radians) * distance;
      const newZ = centerZ + Math.cos(radians) * distance;

      camera.position.set(newX, height, newZ);
      controlsRef.current.target.set(centerX, 0, centerZ);
      controlsRef.current.update();

      // Sync position spring to current orbit position
      api.set({
        camX: newX,
        camY: height,
        camZ: newZ,
        lookX: centerX,
        lookY: 0,
        lookZ: centerZ,
      });
    }
    // Handle tilt animation (vertical rotation along arc)
    else if (isTiltingRef.current && tiltParamsRef.current) {
      const { centerX, centerY, centerZ, distance, azimuthAngle } = tiltParamsRef.current;
      const currentTilt = tiltAngle.get();

      // Convert tilt angle to polar angle (0° tilt = looking down, 90° tilt = level)
      // Clamp to avoid extreme angles
      const clampedTilt = Math.max(5, Math.min(85, currentTilt));
      const polarRadians = (clampedTilt * Math.PI) / 180;
      const azimuthRadians = (azimuthAngle * Math.PI) / 180;

      // Spherical to Cartesian conversion
      // polarRadians: 0 = top, PI/2 = level
      const newX = centerX + distance * Math.sin(polarRadians) * Math.sin(azimuthRadians);
      const newY = centerY + distance * Math.cos(polarRadians);
      const newZ = centerZ + distance * Math.sin(polarRadians) * Math.cos(azimuthRadians);

      camera.position.set(newX, newY, newZ);
      controlsRef.current.target.set(centerX, centerY, centerZ);
      controlsRef.current.update();

      // Sync position spring to current tilt position
      api.set({
        camX: newX,
        camY: newY,
        camZ: newZ,
        lookX: centerX,
        lookY: centerY,
        lookZ: centerZ,
      });
    }
    // Handle position animation
    else if (isAnimatingRef.current) {
      camera.position.set(camX.get(), camY.get(), camZ.get());
      controlsRef.current.target.set(lookX.get(), lookY.get(), lookZ.get());
      controlsRef.current.update();
    }
  });

  const resetToInitial = useCallback(() => {
    const targetHeight = citySize * 1.1;
    const targetZ = citySize * 1.3;

    api.start({
      camX: 0,
      camY: targetHeight,
      camZ: targetZ,
      lookX: 0,
      lookY: 0,
      lookZ: 0,
    });
  }, [citySize, api]);

  const moveTo = useCallback((x: number, z: number, size?: number) => {
    const effectiveSize = size ?? citySize * 0.3;
    const distance = Math.max(effectiveSize * 2, 50);
    const height = Math.max(effectiveSize * 1.5, 40);

    api.start({
      camX: x,
      camY: height,
      camZ: z + distance,
      lookX: x,
      lookY: 0,
      lookZ: z,
    });
  }, [citySize, api]);

  // Set camera target (look-at point), maintaining current distance and angles
  const setTarget = useCallback((x: number, y: number, z: number, options?: RotateOptions) => {
    // Get current offset from target
    const currentTargetX = controlsRef.current?.target.x ?? 0;
    const currentTargetY = controlsRef.current?.target.y ?? 0;
    const currentTargetZ = controlsRef.current?.target.z ?? 0;

    const offsetX = camera.position.x - currentTargetX;
    const offsetY = camera.position.y - currentTargetY;
    const offsetZ = camera.position.z - currentTargetZ;

    // New camera position maintains same offset from new target
    const newCamX = x + offsetX;
    const newCamY = y + offsetY;
    const newCamZ = z + offsetZ;

    // Build animation config
    const animConfig = options?.duration
      ? { duration: options.duration, easing: (t: number) => t }
      : { tension: 60, friction: 20 };

    api.start({
      camX: newCamX,
      camY: newCamY,
      camZ: newCamZ,
      lookX: x,
      lookY: y,
      lookZ: z,
      config: animConfig,
    });
  }, [camera, api]);

  // Convert cardinal direction to angle in degrees
  const directionToAngle = (dir: 'north' | 'south' | 'east' | 'west'): number => {
    switch (dir) {
      case 'north': return 180;
      case 'south': return 0;
      case 'east': return 270;
      case 'west': return 90;
    }
  };

  // Get current angle (helper)
  const computeCurrentAngle = useCallback(() => {
    const targetX = controlsRef.current?.target.x ?? 0;
    const targetZ = controlsRef.current?.target.z ?? 0;
    const dx = camera.position.x - targetX;
    const dz = camera.position.z - targetZ;
    let angle = Math.atan2(dx, dz) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, [camera]);

  // Rotate to absolute angle using shortest path
  const rotateTo = useCallback((
    angleOrDirection: number | 'north' | 'south' | 'east' | 'west',
    options?: RotateOptions
  ) => {
    const targetAngle = typeof angleOrDirection === 'number'
      ? angleOrDirection
      : directionToAngle(angleOrDirection);

    // Get current state
    const centerX = controlsRef.current?.target.x ?? 0;
    const centerZ = controlsRef.current?.target.z ?? 0;
    const currentAngle = computeCurrentAngle();
    const distance = Math.sqrt(
      Math.pow(camera.position.x - centerX, 2) +
      Math.pow(camera.position.z - centerZ, 2)
    );
    const height = camera.position.y;

    // Store orbit parameters
    orbitParamsRef.current = { centerX, centerZ, distance, height };

    // Calculate shortest path
    let delta = targetAngle - currentAngle;
    // Normalize to -180 to 180
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    // Build animation config
    const animConfig = options?.duration
      ? { duration: options.duration }
      : { tension: 80, friction: 18 };

    // Animate from current angle to target using shortest path
    orbitApi.set({ orbitAngle: currentAngle });
    orbitApi.start({ orbitAngle: currentAngle + delta, config: animConfig });
  }, [camera, computeCurrentAngle, orbitApi]);

  // Rotate by relative degrees (positive = clockwise, negative = counter-clockwise)
  const rotateBy = useCallback((degrees: number, options?: RotateOptions) => {
    // Get current state
    const centerX = controlsRef.current?.target.x ?? 0;
    const centerZ = controlsRef.current?.target.z ?? 0;
    const currentAngle = computeCurrentAngle();
    const distance = Math.sqrt(
      Math.pow(camera.position.x - centerX, 2) +
      Math.pow(camera.position.z - centerZ, 2)
    );
    const height = camera.position.y;

    // Store orbit parameters
    orbitParamsRef.current = { centerX, centerZ, distance, height };

    // Build animation config
    const animConfig = options?.duration
      ? { duration: options.duration }
      : { tension: 80, friction: 18 };

    // Animate from current angle by the specified degrees
    orbitApi.set({ orbitAngle: currentAngle });
    orbitApi.start({ orbitAngle: currentAngle + degrees, config: animConfig });
  }, [camera, computeCurrentAngle, orbitApi]);

  // Convert tilt preset to angle
  const tiltPresetToAngle = (preset: 'top' | 'level' | 'high' | 'low'): number => {
    switch (preset) {
      case 'top': return 15;    // Near top-down
      case 'high': return 35;   // High angle
      case 'low': return 60;    // Low angle
      case 'level': return 80;  // Near horizontal
    }
  };

  // Compute current tilt angle (polar angle in degrees)
  const computeCurrentTilt = useCallback(() => {
    const centerX = controlsRef.current?.target.x ?? 0;
    const centerY = controlsRef.current?.target.y ?? 0;
    const centerZ = controlsRef.current?.target.z ?? 0;

    const dx = camera.position.x - centerX;
    const dy = camera.position.y - centerY;
    const dz = camera.position.z - centerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance === 0) return 45; // Default

    // Polar angle: arccos(dy / distance)
    const polarRadians = Math.acos(dy / distance);
    return (polarRadians * 180) / Math.PI;
  }, [camera]);

  // Tilt to absolute angle or preset
  const tiltTo = useCallback((
    angleOrPreset: number | 'top' | 'level' | 'high' | 'low',
    options?: RotateOptions
  ) => {
    const targetTilt = typeof angleOrPreset === 'number'
      ? angleOrPreset
      : tiltPresetToAngle(angleOrPreset);

    // Get current state
    const centerX = controlsRef.current?.target.x ?? 0;
    const centerY = controlsRef.current?.target.y ?? 0;
    const centerZ = controlsRef.current?.target.z ?? 0;

    const dx = camera.position.x - centerX;
    const dy = camera.position.y - centerY;
    const dz = camera.position.z - centerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const currentTilt = computeCurrentTilt();
    const azimuthAngle = computeCurrentAngle();

    // Store tilt parameters
    tiltParamsRef.current = { centerX, centerY, centerZ, distance, azimuthAngle };

    // Build animation config
    const animConfig = options?.duration
      ? { duration: options.duration }
      : { tension: 80, friction: 18 };

    // Animate from current tilt to target
    tiltApi.set({ tiltAngle: currentTilt });
    tiltApi.start({ tiltAngle: targetTilt, config: animConfig });
  }, [camera, computeCurrentTilt, computeCurrentAngle, tiltApi]);

  // Tilt by relative degrees (positive = down towards top-down, negative = up towards level)
  const tiltBy = useCallback((degrees: number, options?: RotateOptions) => {
    // Get current state
    const centerX = controlsRef.current?.target.x ?? 0;
    const centerY = controlsRef.current?.target.y ?? 0;
    const centerZ = controlsRef.current?.target.z ?? 0;

    const dx = camera.position.x - centerX;
    const dy = camera.position.y - centerY;
    const dz = camera.position.z - centerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const currentTilt = computeCurrentTilt();
    const azimuthAngle = computeCurrentAngle();

    // Store tilt parameters
    tiltParamsRef.current = { centerX, centerY, centerZ, distance, azimuthAngle };

    // Build animation config
    const animConfig = options?.duration
      ? { duration: options.duration }
      : { tension: 80, friction: 18 };

    // Animate from current tilt by the specified degrees
    tiltApi.set({ tiltAngle: currentTilt });
    tiltApi.start({ tiltAngle: currentTilt + degrees, config: animConfig });
  }, [camera, computeCurrentTilt, computeCurrentAngle, tiltApi]);

  const getCurrentPosition = useCallback(() => {
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    };
  }, [camera]);

  const getCurrentTarget = useCallback(() => {
    return {
      x: controlsRef.current?.target.x ?? 0,
      y: controlsRef.current?.target.y ?? 0,
      z: controlsRef.current?.target.z ?? 0,
    };
  }, []);

  const getCurrentAngle = useCallback(() => {
    return computeCurrentAngle();
  }, [computeCurrentAngle]);

  const getCurrentTilt = useCallback(() => {
    return computeCurrentTilt();
  }, [computeCurrentTilt]);

  useEffect(() => {
    cameraApi = {
      reset: resetToInitial,
      moveTo,
      setTarget,
      rotateTo,
      rotateBy,
      tiltTo,
      tiltBy,
      getCurrentPosition,
      getCurrentTarget,
      getCurrentAngle,
      getCurrentTilt,
    };
    return () => {
      cameraApi = null;
    };
  }, [resetToInitial, moveTo, setTarget, rotateTo, rotateBy, tiltTo, tiltBy, getCurrentPosition, getCurrentTarget, getCurrentAngle, getCurrentTilt]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={50}
        near={1}
        far={citySize * 10}
        position={[targetPos.x, targetPos.y, targetPos.z]}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={citySize * 3}
        maxPolarAngle={Math.PI / 2.1}
        target={[targetPos.targetX, targetPos.targetY, targetPos.targetZ]}
      />
    </>
  );
}

// Info panel overlay
interface InfoPanelProps {
  building: CityBuilding | null;
}

function InfoPanel({ building }: InfoPanelProps) {
  if (!building) return null;

  const fileName = building.path.split('/').pop();
  const dirPath = building.path.split('/').slice(0, -1).join('/');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '12px 16px',
        color: '#e2e8f0',
        fontSize: 14,
        fontFamily: 'monospace',
        maxWidth: 400,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{fileName}</div>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{dirPath}</div>
      <div
        style={{
          color: '#64748b',
          fontSize: 11,
          marginTop: 4,
          display: 'flex',
          gap: 12,
        }}
      >
        {building.lineCount !== undefined && (
          <span>{building.lineCount.toLocaleString()} lines</span>
        )}
        {building.size !== undefined && <span>{(building.size / 1024).toFixed(1)} KB</span>}
      </div>
    </div>
  );
}

// Control buttons overlay
interface ControlsOverlayProps {
  isFlat: boolean;
  onToggle: () => void;
  onResetCamera: () => void;
}

function ControlsOverlay({ isFlat, onToggle, onResetCamera }: ControlsOverlayProps) {
  const buttonStyle = {
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '8px 16px',
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        gap: 8,
      }}
    >
      <button onClick={onResetCamera} style={buttonStyle}>
        Reset View
      </button>
      <button onClick={onToggle} style={buttonStyle}>
        {isFlat ? 'Grow to 3D' : 'Flatten to 2D'}
      </button>
    </div>
  );
}

// Main scene component
interface CitySceneProps {
  cityData: CityData;
  onBuildingHover?: (building: CityBuilding | null) => void;
  onBuildingClick?: (building: CityBuilding) => void;
  hoveredBuilding: CityBuilding | null;
  selectedBuilding: CityBuilding | null;
  growProgress: number;
  animationConfig: AnimationConfig;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  heightScaling: HeightScaling;
  linearScale: number;
  focusDirectory: string | null;
  focusColor?: string | null;
  adaptCameraToBuildings?: boolean;
}

function CityScene({
  cityData,
  onBuildingHover,
  onBuildingClick,
  hoveredBuilding,
  selectedBuilding,
  growProgress,
  animationConfig,
  highlightLayers,
  isolationMode,
  heightScaling,
  linearScale,
  focusDirectory,
  focusColor,
  adaptCameraToBuildings = false,
}: CitySceneProps) {
  const centerOffset = useMemo(
    () => ({
      x: (cityData.bounds.minX + cityData.bounds.maxX) / 2,
      z: (cityData.bounds.minZ + cityData.bounds.maxZ) / 2,
    }),
    [cityData.bounds],
  );

  const citySize = Math.max(
    cityData.bounds.maxX - cityData.bounds.minX,
    cityData.bounds.maxZ - cityData.bounds.minZ,
  );

  // Calculate max building height for camera positioning (when adaptCameraToBuildings is true)
  const maxBuildingHeight = useMemo(() => {
    if (!adaptCameraToBuildings) return 0;
    return Math.max(...cityData.buildings.map(b => b.dimensions[1]), 0);
  }, [adaptCameraToBuildings, cityData.buildings]);

  const activeHighlights = useMemo(() => hasActiveHighlights(highlightLayers), [highlightLayers]);

  // Helper to check if a path is inside a directory
  const isPathInDirectory = useCallback((path: string, directory: string) => {
    if (!directory) return true;
    return path === directory || path.startsWith(directory + '/');
  }, []);

  // Three-phase animation when switching directories:
  // Phase 1: Camera zooms out to overview
  // Phase 2: Buildings collapse/expand
  // Phase 3: Camera zooms into new directory
  //
  // We track three separate states for smooth transitions:
  // - buildingFocusDirectory: controls which buildings are collapsed (passed to InstancedBuildings)
  // - buildingFocusColor: the color for the focused district (synced with buildingFocusDirectory)
  // - cameraFocusDirectory: controls camera position (used for focusTarget calculation)
  const [buildingFocusDirectory, setBuildingFocusDirectory] = useState<string | null>(null);
  const [buildingFocusColor, setBuildingFocusColor] = useState<string | null>(null);
  const [cameraFocusDirectory, setCameraFocusDirectory] = useState<string | null>(null);
  const prevFocusDirectoryRef = useRef<string | null>(null);
  const animationTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear any pending timers
    animationTimersRef.current.forEach(clearTimeout);
    animationTimersRef.current = [];

    const prevFocus = prevFocusDirectoryRef.current;
    prevFocusDirectoryRef.current = focusDirectory;

    // No change
    if (focusDirectory === prevFocus) return;

    // Case 1: Going from overview to a directory (null -> dir)
    if (prevFocus === null && focusDirectory !== null) {
      // Check if camera is already focused on this area via highlight layers
      const highlightMatchesFocus = highlightLayers.some(
        layer => layer.enabled && layer.items.some(
          item => item.type === 'directory' && (
            item.path === focusDirectory ||
            focusDirectory.startsWith(item.path + '/')
          )
        )
      );

      // Phase 1: Collapse buildings immediately with the new color
      setBuildingFocusDirectory(focusDirectory);
      setBuildingFocusColor(focusColor ?? null);

      if (highlightMatchesFocus) {
        // Camera is already there, set immediately
        setCameraFocusDirectory(focusDirectory);
      } else {
        // Phase 2: After collapse settles, zoom camera in
        const timer = setTimeout(() => {
          setCameraFocusDirectory(focusDirectory);
        }, 600);
        animationTimersRef.current.push(timer);
      }
      return;
    }

    // Case 2: Going from a directory to overview (dir -> null)
    if (prevFocus !== null && focusDirectory === null) {
      // Check if highlight layers will keep camera focused on same area
      const highlightMatchesPrevFocus = highlightLayers.some(
        layer => layer.enabled && layer.items.some(
          item => item.type === 'directory' && (
            item.path === prevFocus ||
            prevFocus.startsWith(item.path + '/')
          )
        )
      );

      if (highlightMatchesPrevFocus) {
        // Camera will stay focused via highlights, just clear focus state
        setCameraFocusDirectory(null);
        setBuildingFocusDirectory(null);
        setBuildingFocusColor(null);
      } else {
        // Phase 1: Zoom camera out first
        setCameraFocusDirectory(null);
        // Phase 2: After zoom-out settles, expand buildings and clear color
        const timer = setTimeout(() => {
          setBuildingFocusDirectory(null);
          setBuildingFocusColor(null);
        }, 500);
        animationTimersRef.current.push(timer);
      }
      return;
    }

    // Case 3: Switching between directories (dirA -> dirB)
    if (prevFocus !== null && focusDirectory !== null) {
      // Phase 1: Zoom camera out
      setCameraFocusDirectory(null);
      // Phase 2: After zoom-out, collapse/expand buildings with new color
      const timer1 = setTimeout(() => {
        setBuildingFocusDirectory(focusDirectory);
        setBuildingFocusColor(focusColor ?? null);
      }, 500);
      // Phase 3: After collapse settles, zoom camera into new directory
      const timer2 = setTimeout(() => {
        setCameraFocusDirectory(focusDirectory);
      }, 1100); // 500ms zoom-out + 600ms collapse
      animationTimersRef.current.push(timer1, timer2);
      return;
    }
  }, [focusDirectory]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Calculate focus target from cameraFocusDirectory (for camera)
  const focusTarget = useMemo((): FocusTarget | null => {
    // Use camera focus directory for camera movement
    if (cameraFocusDirectory) {
      const focusedBuildings = cityData.buildings.filter(building =>
        isPathInDirectory(building.path, cameraFocusDirectory),
      );

      if (focusedBuildings.length === 0) return null;

      let minX = Infinity,
        maxX = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      for (const building of focusedBuildings) {
        const x = building.position.x - centerOffset.x;
        const z = building.position.z - centerOffset.z;
        const [width, , depth] = building.dimensions;

        minX = Math.min(minX, x - width / 2);
        maxX = Math.max(maxX, x + width / 2);
        minZ = Math.min(minZ, z - depth / 2);
        maxZ = Math.max(maxZ, z + depth / 2);
      }

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const size = Math.max(maxX - minX, maxZ - minZ);

      return { x: centerX, z: centerZ, size };
    }

    // Priority 2: highlight layers (only if no focusDirectory is pending)
    // Don't focus on highlights if we're waiting for cameraFocusDirectory to catch up
    if (!activeHighlights || focusDirectory) return null;

    const highlightedBuildings = cityData.buildings.filter(building => {
      const highlight = getHighlightForPath(building.path, highlightLayers);
      return highlight !== null;
    });

    if (highlightedBuildings.length === 0) return null;

    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const building of highlightedBuildings) {
      const x = building.position.x - centerOffset.x;
      const z = building.position.z - centerOffset.z;
      const [width, , depth] = building.dimensions;

      minX = Math.min(minX, x - width / 2);
      maxX = Math.max(maxX, x + width / 2);
      minZ = Math.min(minZ, z - depth / 2);
      maxZ = Math.max(maxZ, z + depth / 2);
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxZ - minZ);

    return { x: centerX, z: centerZ, size };
  }, [
    cameraFocusDirectory,
    focusDirectory,
    activeHighlights,
    cityData.buildings,
    highlightLayers,
    centerOffset,
    isPathInDirectory,
  ]);

  const staggerIndices = useMemo(() => {
    const centerX = (cityData.bounds.minX + cityData.bounds.maxX) / 2;
    const centerZ = (cityData.bounds.minZ + cityData.bounds.maxZ) / 2;

    const withDistance = cityData.buildings.map((b, originalIndex) => ({
      originalIndex,
      distance: Math.sqrt(
        Math.pow(b.position.x - centerX, 2) + Math.pow(b.position.z - centerZ, 2),
      ),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);

    const indices: number[] = new Array(cityData.buildings.length);
    withDistance.forEach((item, staggerOrder) => {
      indices[item.originalIndex] = staggerOrder;
    });

    return indices;
  }, [cityData.buildings, cityData.bounds]);

  const hoveredIndex = useMemo(() => {
    if (!hoveredBuilding) return null;
    return cityData.buildings.findIndex(b => b.path === hoveredBuilding.path);
  }, [hoveredBuilding, cityData.buildings]);

  const selectedIndex = useMemo(() => {
    if (!selectedBuilding) return null;
    return cityData.buildings.findIndex(b => b.path === selectedBuilding.path);
  }, [selectedBuilding, cityData.buildings]);

  // Calculate spring duration for animation sync
  const tension = animationConfig.tension || 120;
  const friction = animationConfig.friction || 14;
  const springDuration = Math.sqrt(1 / (tension * 0.001)) * friction * 20;

  return (
    <>
      <AnimatedCamera citySize={citySize} isFlat={growProgress === 0} focusTarget={focusTarget} maxBuildingHeight={maxBuildingHeight} />

      <ambientLight intensity={1.2} />
      <hemisphereLight args={['#ddeeff', '#667788', 0.8]} position={[0, citySize, 0]} />
      <directionalLight
        position={[citySize, citySize * 1.5, citySize * 0.5]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-citySize * 0.5, citySize * 0.8, -citySize * 0.5]}
        intensity={1}
      />
      <directionalLight position={[citySize * 0.3, citySize, citySize]} intensity={0.6} />

      {cityData.districts.map(district => {
        // Check if district matches focusDirectory
        const isFocused = buildingFocusDirectory
          ? district.path === buildingFocusDirectory
          : false;

        // Check if district matches any highlight layer
        let highlightLayerColor: string | null = null;
        for (const layer of highlightLayers) {
          if (!layer.enabled) continue;
          for (const item of layer.items) {
            if (item.type === 'directory' && item.path === district.path) {
              highlightLayerColor = layer.color;
              break;
            }
          }
          if (highlightLayerColor) break;
        }

        // Use buildingFocusColor (synced with animation) instead of focusColor prop
        // Focus color takes priority, then highlight layer color
        const districtColor = (isFocused && buildingFocusColor) ? buildingFocusColor : highlightLayerColor;

        return (
          <DistrictFloor
            key={district.path}
            district={district}
            centerOffset={centerOffset}
            opacity={1}
            highlightColor={districtColor}
            growProgress={growProgress}
          />
        );
      })}

      <InstancedBuildings
        buildings={cityData.buildings}
        centerOffset={centerOffset}
        onHover={onBuildingHover}
        onClick={onBuildingClick}
        hoveredIndex={hoveredIndex}
        selectedIndex={selectedIndex}
        growProgress={growProgress}
        animationConfig={animationConfig}
        heightScaling={heightScaling}
        linearScale={linearScale}
        staggerIndices={staggerIndices}
        focusDirectory={buildingFocusDirectory}
        highlightLayers={highlightLayers}
        isolationMode={isolationMode}
      />

      <BuildingIcons
        buildings={cityData.buildings}
        centerOffset={centerOffset}
        growProgress={growProgress}
        heightScaling={heightScaling}
        linearScale={linearScale}
        highlightLayers={highlightLayers}
        isolationMode={isolationMode}
        hasActiveHighlights={activeHighlights}
        staggerIndices={staggerIndices}
        springDuration={springDuration}
        staggerDelay={animationConfig.staggerDelay || 15}
      />
    </>
  );
}

// ============================================================================
// Main Component Props and Export
// ============================================================================

export interface FileCity3DProps {
  /** City data from file-city-builder */
  cityData: CityData;
  /** Width of the container */
  width?: number | string;
  /** Height of the container */
  height?: number | string;
  /** Callback when a building is clicked */
  onBuildingClick?: (building: CityBuilding) => void;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Animation configuration */
  animation?: AnimationConfig;
  /** External control: set to true to grow buildings, false to flatten */
  isGrown?: boolean;
  /** Callback when grow state changes */
  onGrowChange?: (isGrown: boolean) => void;
  /** Show control buttons */
  showControls?: boolean;
  /** Highlight layers for focusing on specific files/directories */
  highlightLayers?: HighlightLayer[];
  /** How to handle non-highlighted buildings when highlights are active */
  isolationMode?: IsolationMode;
  /** Opacity for dimmed buildings in transparent mode (0-1) */
  dimOpacity?: number;
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Message to display while loading */
  loadingMessage?: string;
  /** Message to display when there's no data */
  emptyMessage?: string;
  /** Height scaling mode: 'logarithmic' (default) or 'linear' */
  heightScaling?: HeightScaling;
  /** Scale factor for linear mode (height per line, default 0.05) */
  linearScale?: number;
  /** Directory path to focus on - buildings outside will collapse */
  focusDirectory?: string | null;
  /** Color to highlight the focused directory (hex color, e.g. "#3b82f6") */
  focusColor?: string | null;
  /** Callback when user clicks on a district to navigate */
  onDirectorySelect?: (directory: string | null) => void;
  /** Background color for the canvas container */
  backgroundColor?: string;
  /** Text color for secondary/placeholder text */
  textColor?: string;
  /** Currently selected building (controlled by host) */
  selectedBuilding?: CityBuilding | null;
  /** When true, camera height adjusts based on tallest building when grown */
  adaptCameraToBuildings?: boolean;
}

/**
 * FileCity3D - 3D visualization of codebase structure
 *
 * Renders CityData as an interactive 3D city where buildings represent files
 * and their height corresponds to line count or file size.
 */
export function FileCity3D({
  cityData,
  width = '100%',
  height = 600,
  onBuildingClick,
  className,
  style,
  animation,
  isGrown: externalIsGrown,
  onGrowChange,
  showControls = true,
  highlightLayers = [],
  isolationMode = 'transparent',
  dimOpacity: _dimOpacity = 0.15,
  isLoading = false,
  loadingMessage = 'Loading file city...',
  emptyMessage = 'No file tree data available',
  heightScaling = 'logarithmic',
  linearScale = 0.05,
  focusDirectory = null,
  focusColor = null,
  onDirectorySelect: _onDirectorySelect,
  backgroundColor = '#0f172a',
  textColor = '#94a3b8',
  selectedBuilding = null,
  adaptCameraToBuildings = false,
}: FileCity3DProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(null);
  const [internalIsGrown, setInternalIsGrown] = useState(false);

  const animationConfig = useMemo(() => ({ ...DEFAULT_ANIMATION, ...animation }), [animation]);

  const isGrown = externalIsGrown !== undefined ? externalIsGrown : internalIsGrown;
  const setIsGrown = (value: boolean) => {
    setInternalIsGrown(value);
    onGrowChange?.(value);
  };

  useEffect(() => {
    if (animationConfig.startFlat && animationConfig.autoStartDelay !== null) {
      const timer = setTimeout(() => {
        setIsGrown(true);
      }, animationConfig.autoStartDelay);
      return () => clearTimeout(timer);
    } else if (!animationConfig.startFlat) {
      setIsGrown(true);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationConfig.startFlat, animationConfig.autoStartDelay]);

  const growProgress = isGrown ? 1 : 0;

  const handleToggle = () => {
    setIsGrown(!isGrown);
  };

  if (isLoading) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          position: 'relative',
          background: backgroundColor,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          ...style,
        }}
      >
        {loadingMessage}
      </div>
    );
  }

  if (!cityData || cityData.buildings.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          position: 'relative',
          background: backgroundColor,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          ...style,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        background: backgroundColor,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Canvas
        shadows
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <CityScene
          cityData={cityData}
          onBuildingHover={setHoveredBuilding}
          onBuildingClick={onBuildingClick}
          hoveredBuilding={hoveredBuilding}
          selectedBuilding={selectedBuilding}
          growProgress={growProgress}
          animationConfig={animationConfig}
          highlightLayers={highlightLayers}
          isolationMode={isolationMode}
          heightScaling={heightScaling}
          linearScale={linearScale}
          focusDirectory={focusDirectory}
          focusColor={focusColor}
          adaptCameraToBuildings={adaptCameraToBuildings}
        />
      </Canvas>
      <InfoPanel building={selectedBuilding || hoveredBuilding} />
      {showControls && (
        <ControlsOverlay isFlat={!isGrown} onToggle={handleToggle} onResetCamera={resetCamera} />
      )}
    </div>
  );
}

export default FileCity3D;
