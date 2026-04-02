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

import { animated, useSpring, config } from '@react-spring/three';
import { OrbitControls, PerspectiveCamera, Text, RoundedBox } from '@react-three/drei';
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

// Code file extensions - height based on line count
const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'pyw',
  'rs',
  'go',
  'java',
  'kt',
  'scala',
  'c',
  'cpp',
  'cc',
  'cxx',
  'h',
  'hpp',
  'cs',
  'rb',
  'php',
  'swift',
  'vue',
  'svelte',
  'lua',
  'sh',
  'bash',
  'zsh',
  'sql',
  'r',
  'dart',
  'elm',
  'ex',
  'exs',
  'clj',
  'cljs',
  'hs',
  'ml',
  'mli',
]);

function isCodeFile(extension: string): boolean {
  return CODE_EXTENSIONS.has(extension.toLowerCase());
}

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

// Animated RoundedBox wrapper
const AnimatedRoundedBox = animated(RoundedBox);

// Animated meshStandardMaterial for opacity transitions
const AnimatedMeshStandardMaterial = animated('meshStandardMaterial');

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

  // Check if highlight layers have any active items
  const hasActiveHighlightLayers = useMemo(() => {
    return highlightLayers.some(layer => layer.enabled && layer.items.length > 0);
  }, [highlightLayers]);

  // Initialize height multiplier arrays
  useEffect(() => {
    if (buildings.length > 0) {
      if (
        !heightMultipliersRef.current ||
        heightMultipliersRef.current.length !== buildings.length
      ) {
        heightMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        targetMultipliersRef.current = new Float32Array(buildings.length).fill(1);
      }
    }
  }, [buildings.length]);

  // Update target multipliers when focusDirectory or highlightLayers change
  useEffect(() => {
    if (!targetMultipliersRef.current) return;

    buildings.forEach((building, index) => {
      let shouldCollapse = false;

      // Priority 1: focusDirectory - collapse buildings outside
      if (focusDirectory) {
        const isInFocus = isPathInDirectory(building.path, focusDirectory);
        shouldCollapse = !isInFocus;
      }
      // Priority 2: highlightLayers with collapse isolation mode
      else if (hasActiveHighlightLayers && isolationMode === 'collapse') {
        const highlight = getHighlightForPath(building.path, highlightLayers);
        shouldCollapse = highlight === null;
      }

      targetMultipliersRef.current![index] = shouldCollapse ? 0.05 : 1;
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
      const scale = isHovered ? 1.05 : 1;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width * scale, height, depth * scale);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      // Desaturate collapsed buildings
      tempColor.set(data.color);
      if (newMultiplier < 0.5) {
        // Lerp towards gray based on collapse amount
        const grayAmount = 1 - newMultiplier * 2; // 0 at multiplier=0.5, 1 at multiplier=0
        const gray = 0.3;
        tempColor.r = tempColor.r * (1 - grayAmount) + gray * grayAmount;
        tempColor.g = tempColor.g * (1 - grayAmount) + gray * grayAmount;
        tempColor.b = tempColor.b * (1 - grayAmount) + gray * grayAmount;
      }
      if (isHovered) {
        tempColor.multiplyScalar(1.2);
      }
      meshRef.current!.setColorAt(instanceIndex, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
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
  const spriteRef = useRef<THREE.Sprite>(null);
  const startTimeRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);

  useFrame(({ clock }) => {
    if (!spriteRef.current) return;

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
    const yPosition = buildingTop + iconSize / 2 + 2;

    spriteRef.current.position.y = yPosition;

    if (materialRef.current) {
      materialRef.current.opacity = opacity * animProgress;
    }
  });

  return (
    <sprite ref={spriteRef} position={[x, 0, z]} scale={[iconSize, iconSize, 1]}>
      <spriteMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        depthTest={true}
        depthWrite={false}
      />
    </sprite>
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

  // Don't render if no progress yet
  if (growProgress < 0.1) return null;

  return (
    <>
      {buildingsWithIcons.map(
        ({ building, config, x, z, targetHeight, shouldDim, staggerDelayMs }) => {
          const icon = config.icon!;
          const texture = getIconTexture(icon.name, icon.color || '#ffffff');
          if (!texture) return null;

          // Icon size based on building dimensions
          const [width] = building.dimensions;
          const baseSize = Math.max(width * 0.8, 6);
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
}

function DistrictFloor({ district, centerOffset, opacity }: DistrictFloorProps) {
  const { worldBounds } = district;
  const width = worldBounds.maxX - worldBounds.minX;
  const depth = worldBounds.maxZ - worldBounds.minZ;
  const centerX = (worldBounds.minX + worldBounds.maxX) / 2 - centerOffset.x;
  const centerZ = (worldBounds.minZ + worldBounds.maxZ) / 2 - centerOffset.z;

  const dirName = district.path.split('/').pop() || district.path;

  const pathDepth = district.path.split('/').length;
  const floorY = -5 - pathDepth * 0.1;

  return (
    <group position={[centerX, 0, centerZ]}>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} renderOrder={-1}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} attach="geometry" />
        <lineBasicMaterial color="#475569" depthWrite={false} />
      </lineSegments>

      {district.label && (
        <Text
          position={[0, 1.5, depth / 2 + 2]}
          rotation={[-Math.PI / 6, 0, 0]}
          fontSize={Math.min(3, width / 6)}
          color="#cbd5e1"
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
}

let cameraResetFn: (() => void) | null = null;

export function resetCamera() {
  cameraResetFn?.();
}

function AnimatedCamera({ citySize, isFlat, focusTarget }: AnimatedCameraProps) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Animated camera position and target
  const targetPos = useMemo(() => {
    if (focusTarget) {
      // Position camera to look at focus target
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
    // Default: overview of entire city
    const targetHeight = isFlat ? citySize * 1.5 : citySize * 1.1;
    const targetZ = isFlat ? 0 : citySize * 1.3;
    return {
      x: 0,
      y: targetHeight,
      z: targetZ,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    };
  }, [focusTarget, isFlat, citySize]);

  // Spring animation for camera movement
  const { camX, camY, camZ, lookX, lookY, lookZ } = useSpring({
    camX: targetPos.x,
    camY: targetPos.y,
    camZ: targetPos.z,
    lookX: targetPos.targetX,
    lookY: targetPos.targetY,
    lookZ: targetPos.targetZ,
    config: { tension: 60, friction: 20 },
  });

  // Update camera each frame based on spring values
  useFrame(() => {
    if (!controlsRef.current) return;

    camera.position.set(camX.get(), camY.get(), camZ.get());
    controlsRef.current.target.set(lookX.get(), lookY.get(), lookZ.get());
    controlsRef.current.update();
  });

  const resetToInitial = useCallback(() => {
    const targetHeight = isFlat ? citySize * 1.5 : citySize * 1.1;
    const targetZ = isFlat ? 0 : citySize * 1.3;

    camera.position.set(0, targetHeight, targetZ);
    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [isFlat, citySize, camera]);

  useEffect(() => {
    if (!focusTarget) {
      resetToInitial();
    }
  }, [resetToInitial, focusTarget]);

  useEffect(() => {
    cameraResetFn = resetToInitial;
    return () => {
      cameraResetFn = null;
    };
  }, [resetToInitial]);

  return (
    <>
      <PerspectiveCamera makeDefault fov={50} near={1} far={citySize * 10} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={citySize * 3}
        maxPolarAngle={Math.PI / 2.1}
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
  const rawExt = building.fileExtension || building.path.split('.').pop() || '';
  const ext = rawExt.replace(/^\./, '');
  const isCode = isCodeFile(ext);

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
  growProgress: number;
  animationConfig: AnimationConfig;
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  heightScaling: HeightScaling;
  linearScale: number;
  focusDirectory: string | null;
}

function CityScene({
  cityData,
  onBuildingHover,
  onBuildingClick,
  hoveredBuilding,
  growProgress,
  animationConfig,
  highlightLayers,
  isolationMode,
  heightScaling,
  linearScale,
  focusDirectory,
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
  // We track two separate states:
  // - buildingFocusDirectory: controls which buildings are collapsed (passed to InstancedBuildings)
  // - cameraFocusDirectory: controls camera position (used for focusTarget calculation)
  const [buildingFocusDirectory, setBuildingFocusDirectory] = useState<string | null>(null);
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
      // Phase 1: Collapse buildings immediately
      setBuildingFocusDirectory(focusDirectory);
      // Phase 2: After collapse settles, zoom camera in
      const timer = setTimeout(() => {
        setCameraFocusDirectory(focusDirectory);
      }, 600);
      animationTimersRef.current.push(timer);
      return;
    }

    // Case 2: Going from a directory to overview (dir -> null)
    if (prevFocus !== null && focusDirectory === null) {
      // Phase 1: Zoom camera out first
      setCameraFocusDirectory(null);
      // Phase 2: After zoom-out settles, expand buildings
      const timer = setTimeout(() => {
        setBuildingFocusDirectory(null);
      }, 500);
      animationTimersRef.current.push(timer);
      return;
    }

    // Case 3: Switching between directories (dirA -> dirB)
    if (prevFocus !== null && focusDirectory !== null) {
      // Phase 1: Zoom camera out
      setCameraFocusDirectory(null);
      // Phase 2: After zoom-out, collapse/expand buildings
      const timer1 = setTimeout(() => {
        setBuildingFocusDirectory(focusDirectory);
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

    // Priority 2: highlight layers
    if (!activeHighlights) return null;

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

  // Calculate spring duration for animation sync
  const tension = animationConfig.tension || 120;
  const friction = animationConfig.friction || 14;
  const springDuration = Math.sqrt(1 / (tension * 0.001)) * friction * 20;

  return (
    <>
      <AnimatedCamera citySize={citySize} isFlat={growProgress === 0} focusTarget={focusTarget} />

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

      {cityData.districts.map(district => (
        <DistrictFloor
          key={district.path}
          district={district}
          centerOffset={centerOffset}
          opacity={1}
        />
      ))}

      <InstancedBuildings
        buildings={cityData.buildings}
        centerOffset={centerOffset}
        onHover={onBuildingHover}
        onClick={onBuildingClick}
        hoveredIndex={hoveredIndex}
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
  /** Callback when user clicks on a district to navigate */
  onDirectorySelect?: (directory: string | null) => void;
  /** Background color for the canvas container */
  backgroundColor?: string;
  /** Text color for secondary/placeholder text */
  textColor?: string;
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
  dimOpacity = 0.15,
  isLoading = false,
  loadingMessage = 'Loading file city...',
  emptyMessage = 'No file tree data available',
  heightScaling = 'logarithmic',
  linearScale = 0.05,
  focusDirectory = null,
  onDirectorySelect,
  backgroundColor = '#0f172a',
  textColor = '#94a3b8',
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
          growProgress={growProgress}
          animationConfig={animationConfig}
          highlightLayers={highlightLayers}
          isolationMode={isolationMode}
          heightScaling={heightScaling}
          linearScale={linearScale}
          focusDirectory={focusDirectory}
        />
      </Canvas>
      <InfoPanel building={hoveredBuilding} />
      {showControls && (
        <ControlsOverlay isFlat={!isGrown} onToggle={handleToggle} onResetCamera={resetCamera} />
      )}
    </div>
  );
}

export default FileCity3D;
