/**
 * CityContent - Per-city rendering content for FileCity3D
 *
 * Renders all the 3D content for a single CityData: buildings, districts,
 * icons, scope panels, indicators, etc. This is the "per-city" part of
 * the 3D scene — no camera, no lights, no canvas. Multiple instances can
 * be rendered side-by-side in a single canvas for multi-city views.
 */

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { getFileConfig } from '@principal-ai/file-city-builder';
import type {
  CityData,
  CityBuilding,
  CityDistrict,
  FileConfigResult,
  HighlightLayer,
  LayerItem,
  LayerRenderStrategy,
} from '@principal-ai/file-city-builder';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IntrinsicElements extends ThreeElements {}
  }
}

// ============================================================================
// Local type definitions (shared with parent via imports)
// ============================================================================

export type { CityData, CityBuilding, CityDistrict, LayerItem, LayerRenderStrategy };

export type IsolationMode =
  | 'none'
  | 'transparent'
  | 'collapse'
  | 'hide';

export interface AnimationConfig {
  startFlat?: boolean;
  autoStartDelay?: number | null;
  growDuration?: number;
  staggerDelay?: number;
  tension?: number;
  friction?: number;
}

export type HeightScaling = 'logarithmic' | 'linear';

export interface FlatPattern {
  pattern: string | RegExp;
  height?: number;
}

export interface SelectionStyle {
  color?: string;
  borderWidth?: number;
}

export interface ElevatedScopePanel {
  id: string;
  color: string;
  opacity?: number;
  height?: number;
  thickness?: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  label?: string;
  labelColor?: string;
  labelSize?: number;
  displayLabel?: string;
  displayLabelColor?: string;
  onClick?: (event: MouseEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
}

// ============================================================================
// Helper Utilities
// ============================================================================

function matchFlatPattern(path: string, patterns: FlatPattern[]): number | undefined {
  for (const { pattern, height } of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (regex.test(path)) {
      return height ?? 0.5;
    }
  }
  return undefined;
}

function computeSpringDuration(animationConfig: AnimationConfig): number {
  const tension = animationConfig.tension || 120;
  const friction = animationConfig.friction || 14;
  return Math.sqrt(1 / (tension * 0.001)) * friction * 20;
}

function resolveStaggerDelay(animationConfig: AnimationConfig, buildingCount: number): number {
  if (animationConfig.growDuration && animationConfig.growDuration > 0) {
    const gaps = Math.max(1, buildingCount - 1);
    const spread = animationConfig.growDuration - computeSpringDuration(animationConfig);
    return Math.max(0, spread / gaps);
  }
  return animationConfig.staggerDelay ?? 15;
}

function calculateBuildingHeight(
  building: CityBuilding,
  scaling: HeightScaling = 'logarithmic',
  linearScale: number = 1,
  flatPatterns: FlatPattern[] = [],
): number {
  const flatHeight = matchFlatPattern(building.path, flatPatterns);
  if (flatHeight !== undefined) {
    return flatHeight;
  }

  const minHeight = 2;

  if (building.lineCount !== undefined) {
    const lines = Math.max(building.lineCount, 1);
    if (scaling === 'linear') {
      return minHeight + lines * linearScale;
    }
    return minHeight + Math.log10(lines) * 12;
  } else if (building.size !== undefined) {
    const bytes = Math.max(building.size, 1);
    if (scaling === 'linear') {
      return minHeight + (bytes / 1024) * linearScale;
    }
    return minHeight + (Math.log10(bytes) - 2) * 12;
  }

  return building.dimensions[1];
}

// ============================================================================
// Icon Texture Generation
// ============================================================================

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

const iconTextureCache = new Map<string, THREE.Texture>();

function getIconTexture(iconName: string, color: string = '#ffffff'): THREE.Texture | null {
  const cacheKey = `${iconName}-${color}`;
  if (iconTextureCache.has(cacheKey)) {
    return iconTextureCache.get(cacheKey)!;
  }

  const iconPath = LUCIDE_ICONS[iconName];
  if (!iconPath) return null;

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  img.onload = () => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.drawImage(img, 32, 32, 64, 64);
    texture.needsUpdate = true;
    URL.revokeObjectURL(url);
  };

  img.src = url;
  iconTextureCache.set(cacheKey, texture);
  return texture;
}

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

interface LayerMatch {
  layer: HighlightLayer;
  item: LayerItem;
  color: string;
  opacity: number;
  borderWidth?: number;
  renderStrategy: LayerRenderStrategy;
}

function getLayerMatchesForPath(
  path: string,
  layers: HighlightLayer[],
): LayerMatch[] {
  const matches: LayerMatch[] = [];
  for (const layer of layers) {
    if (!layer.enabled) continue;
    for (const item of layer.items) {
      let isMatch = false;
      if (item.type === 'file' && item.path === path) {
        isMatch = true;
      } else if (item.type === 'directory' && (path === item.path || path.startsWith(item.path + '/'))) {
        isMatch = true;
      }
      if (isMatch) {
        matches.push({
          layer,
          item,
          color: layer.color,
          opacity: layer.opacity ?? 1,
          borderWidth: layer.borderWidth,
          renderStrategy: item.renderStrategy || 'border',
        });
      }
    }
  }
  return matches.sort((a, b) => (b.layer.priority ?? 0) - (a.layer.priority ?? 0));
}

function getHighlightForPath(
  path: string,
  layers: HighlightLayer[],
): { color: string; opacity: number } | null {
  const matches = getLayerMatchesForPath(path, layers);
  const fillMatch = matches.find(m => m.renderStrategy === 'fill');
  if (fillMatch) {
    return { color: fillMatch.color, opacity: fillMatch.opacity };
  }
  return null;
}

function hasActiveHighlights(layers: HighlightLayer[]): boolean {
  return layers.some(layer => layer.enabled && layer.items.length > 0);
}

function isPathInDirectory(path: string, directory: string | null): boolean {
  if (!directory) return true;
  return path === directory || path.startsWith(directory + '/');
}

// ============================================================================
// Easing Utilities
// ============================================================================

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// Building Edges
// ============================================================================

interface BuildingEdgeData {
  width: number;
  depth: number;
  fullHeight: number;
  x: number;
  z: number;
  staggerDelayMs: number;
  buildingIndex: number;
}

interface BuildingEdgesProps {
  buildings: BuildingEdgeData[];
  growProgress: number;
  minHeight: number;
  baseOffset: number;
  springDuration: number;
  heightMultipliersRef: React.MutableRefObject<Float32Array | null>;
  hiddenRef?: React.MutableRefObject<Uint8Array | null>;
}

function BuildingEdges({
  buildings,
  growProgress,
  minHeight,
  baseOffset,
  springDuration,
  heightMultipliersRef,
  hiddenRef,
}: BuildingEdgesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const invalidate = useThree((s) => s.invalidate);

  const numEdges = buildings.length * 4;

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

  useFrame(({ clock }) => {
    if (!meshRef.current || edgeData.length === 0) return;
    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }
    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;
    let stillAnimating = false;

    edgeData.forEach((edge, idx) => {
      const { x, z, fullHeight, staggerDelayMs, buildingIndex } = edge;
      const isHidden = hiddenRef?.current?.[buildingIndex] === 1;

      if (isHidden) {
        tempObject.position.set(x, baseOffset, z);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(idx, tempObject.matrix);
        return;
      }

      const heightMultiplier = heightMultipliersRef.current?.[buildingIndex] ?? 1;
      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
        if (t < 1) stillAnimating = true;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
        stillAnimating = true;
      }

      const height = animProgress * fullHeight * heightMultiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(0.3, height, 0.3);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(idx, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (stillAnimating) invalidate();
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
// Border Highlights
// ============================================================================

interface BorderEdgeData {
  x: number;
  z: number;
  fullHeight: number;
  buildingIndex: number;
  staggerDelayMs: number;
  color: string;
  opacity: number;
  borderWidth: number;
  edgeType: 'vertical' | 'horizontal-x' | 'horizontal-z';
  width?: number;
  depth?: number;
}

interface BorderHighlightsProps {
  buildings: CityBuilding[];
  centerOffset: { x: number; z: number };
  highlightLayers: HighlightLayer[];
  growProgress: number;
  minHeight: number;
  baseOffset: number;
  springDuration: number;
  heightMultipliersRef: React.MutableRefObject<Float32Array | null>;
  heightScaling: HeightScaling;
  linearScale: number;
  flatPatterns: FlatPattern[];
  staggerIndices: number[];
  animationConfig: AnimationConfig;
}

function BorderHighlights({
  buildings,
  centerOffset,
  highlightLayers,
  growProgress,
  minHeight,
  baseOffset,
  springDuration,
  heightMultipliersRef,
  heightScaling,
  linearScale,
  flatPatterns,
  staggerIndices,
  animationConfig,
}: BorderHighlightsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const invalidate = useThree((s) => s.invalidate);

  const borderEdgeData = useMemo(() => {
    const edges: BorderEdgeData[] = [];
    const staggerStep = resolveStaggerDelay(animationConfig, staggerIndices.length);

    buildings.forEach((building, buildingIndex) => {
      const matches = getLayerMatchesForPath(building.path, highlightLayers);
      const borderMatches = matches.filter(m => m.renderStrategy === 'border');
      if (borderMatches.length === 0) return;

      const borderMatch = borderMatches[0];
      const [width, , depth] = building.dimensions;
      const fullHeight = calculateBuildingHeight(building, heightScaling, linearScale, flatPatterns);
      const x = building.position.x - centerOffset.x;
      const z = building.position.z - centerOffset.z;
      const staggerIndex = staggerIndices[buildingIndex] ?? buildingIndex;
      const staggerDelayMs = staggerStep * staggerIndex;
      const halfW = width / 2;
      const halfD = depth / 2;

      const corners = [
        { x: x - halfW, z: z - halfD },
        { x: x + halfW, z: z - halfD },
        { x: x - halfW, z: z + halfD },
        { x: x + halfW, z: z + halfD },
      ];

      corners.forEach(corner => {
        edges.push({
          x: corner.x, z: corner.z,
          fullHeight, buildingIndex, staggerDelayMs,
          color: borderMatch.color, opacity: borderMatch.opacity,
          borderWidth: borderMatch.borderWidth ?? 2, edgeType: 'vertical',
        });
      });

      edges.push({
        x, z: z - halfD, fullHeight, buildingIndex, staggerDelayMs,
        color: borderMatch.color, opacity: borderMatch.opacity,
        borderWidth: borderMatch.borderWidth ?? 2, edgeType: 'horizontal-x', width,
      });
      edges.push({
        x, z: z + halfD, fullHeight, buildingIndex, staggerDelayMs,
        color: borderMatch.color, opacity: borderMatch.opacity,
        borderWidth: borderMatch.borderWidth ?? 2, edgeType: 'horizontal-x', width,
      });
      edges.push({
        x: x - halfW, z, fullHeight, buildingIndex, staggerDelayMs,
        color: borderMatch.color, opacity: borderMatch.opacity,
        borderWidth: borderMatch.borderWidth ?? 2, edgeType: 'horizontal-z', depth,
      });
      edges.push({
        x: x + halfW, z, fullHeight, buildingIndex, staggerDelayMs,
        color: borderMatch.color, opacity: borderMatch.opacity,
        borderWidth: borderMatch.borderWidth ?? 2, edgeType: 'horizontal-z', depth,
      });
    });

    return edges;
  }, [
    buildings, centerOffset, highlightLayers, heightScaling, linearScale,
    flatPatterns, staggerIndices, animationConfig,
  ]);

  useFrame(({ clock }) => {
    if (!meshRef.current || borderEdgeData.length === 0) return;
    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }
    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;
    let stillAnimating = false;

    borderEdgeData.forEach((edge, idx) => {
      const { x, z, fullHeight, staggerDelayMs, buildingIndex, color, borderWidth, edgeType, width, depth } = edge;
      const heightMultiplier = heightMultipliersRef.current?.[buildingIndex] ?? 1;
      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
        if (t < 1) stillAnimating = true;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
        stillAnimating = true;
      }

      const height = animProgress * fullHeight * heightMultiplier + minHeight;
      const thickness = Math.max(0.2, borderWidth * 0.1);

      if (edgeType === 'vertical') {
        const yPosition = height / 2 + baseOffset;
        tempObject.position.set(x, yPosition, z);
        tempObject.rotation.set(0, 0, 0);
        tempObject.scale.set(thickness, height, thickness);
      } else if (edgeType === 'horizontal-x') {
        const yPosition = height + baseOffset;
        tempObject.position.set(x, yPosition, z);
        tempObject.rotation.set(0, 0, Math.PI / 2);
        tempObject.scale.set(thickness, width!, thickness);
      } else if (edgeType === 'horizontal-z') {
        const yPosition = height + baseOffset;
        tempObject.position.set(x, yPosition, z);
        tempObject.rotation.set(Math.PI / 2, 0, 0);
        tempObject.scale.set(thickness, depth!, thickness);
      }

      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(idx, tempObject.matrix);
      tempColor.set(color);
      meshRef.current!.setColorAt(idx, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    if (stillAnimating) invalidate();
  });

  if (borderEdgeData.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, borderEdgeData.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.9} />
    </instancedMesh>
  );
}

// ============================================================================
// Directory Fills
// ============================================================================

interface DirectoryFillsProps {
  districts: CityDistrict[];
  centerOffset: { x: number; z: number };
  highlightLayers: HighlightLayer[];
  growProgress: number;
  onHighlightClick?: (path: string, layer: HighlightLayer, event: MouseEvent) => void;
  onHighlightHover?: (path: string | null, layer: HighlightLayer | null) => void;
}

function DirectoryFills({
  districts,
  centerOffset,
  highlightLayers,
  growProgress,
  onHighlightClick,
  onHighlightHover,
}: DirectoryFillsProps) {
  const invalidate = useThree((s) => s.invalidate);
  const hoveredRef = useRef<string | null>(null);
  const materialRefs = useRef<Map<string, THREE.MeshBasicMaterial>>(new Map());
  const originalsRef = useRef<Map<string, { color: THREE.Color; opacity: number }>>(new Map());
  const cursorCleanupRef = useRef<(() => void) | null>(null);

  const fillItems = useMemo(() => {
    const items: Array<{ layer: HighlightLayer; item: LayerItem }> = [];
    for (const layer of highlightLayers) {
      if (!layer.enabled) continue;
      for (const item of layer.items) {
        if (item.type === 'directory' && (item.renderStrategy ?? 'border') === 'fill') {
          items.push({ layer, item });
        }
      }
    }
    return items.sort((a, b) => b.layer.priority - a.layer.priority);
  }, [highlightLayers]);

  const fillPlanes = useMemo(() => {
    const planes: Array<{
      district: CityDistrict;
      color: string;
      opacity: number;
      priority: number;
      interactive: boolean;
      layer: HighlightLayer;
    }> = [];

    for (const { layer, item } of fillItems) {
      const dir = item.path.replace(/^\/+|\/+$/g, '');
      const district = districts.find((d) => d.path === dir || d.path === item.path);
      if (!district) continue;

      const existing = planes.find((p) => p.district.path === district.path);
      if (existing && existing.priority >= (layer.priority ?? 0)) continue;

      if (existing) {
        const idx = planes.indexOf(existing);
        planes[idx] = {
          district, color: layer.color, opacity: layer.opacity ?? 0.3,
          priority: layer.priority ?? 0, interactive: item.interactive ?? false, layer,
        };
      } else {
        planes.push({
          district, color: layer.color, opacity: layer.opacity ?? 0.3,
          priority: layer.priority ?? 0, interactive: item.interactive ?? false, layer,
        });
      }
    }
    return planes;
  }, [fillItems, districts]);

  useEffect(() => { invalidate(); }, [fillPlanes, invalidate]);

  if (fillPlanes.length === 0) {
    if (fillItems.length > 0) {
      console.warn('[DirectoryFills] fillItems found but no districts matched:', fillItems.map(i => i.item.path), 'district paths:', districts.map(d => d.path));
    }
    return null;
  }

  const applyHover = (path: string, hovered: boolean) => {
    const mat = materialRefs.current.get(path);
    const orig = originalsRef.current.get(path);
    if (!mat || !orig) return;
    if (hovered) {
      mat.opacity = Math.max(orig.opacity - 0.15, 0);
      document.body.style.cursor = 'pointer';
      cursorCleanupRef.current = () => { document.body.style.cursor = ''; };
    } else {
      mat.opacity = orig.opacity;
      cursorCleanupRef.current?.();
      cursorCleanupRef.current = null;
    }
    requestAnimationFrame(() => invalidate());
  };

  const FILL_HEIGHT = 12;

  return (
    <group>
      {fillPlanes.map(({ district, color, opacity, interactive, layer }) => {
        const { worldBounds } = district;
        const width = worldBounds.maxX - worldBounds.minX;
        const depth = worldBounds.maxZ - worldBounds.minZ;
        const centerX = (worldBounds.minX + worldBounds.maxX) / 2 - centerOffset.x;
        const centerZ = (worldBounds.minZ + worldBounds.maxZ) / 2 - centerOffset.z;

        const handlePointerMove = interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (hoveredRef.current !== district.path) {
                if (hoveredRef.current) applyHover(hoveredRef.current, false);
                hoveredRef.current = district.path;
                applyHover(district.path, true);
                onHighlightHover?.(district.path, layer);
              }
            }
          : undefined;
        const handlePointerOut = interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (hoveredRef.current === district.path) {
                hoveredRef.current = null;
                applyHover(district.path, false);
                onHighlightHover?.(null, null);
              }
            }
          : undefined;
        const handleClick = interactive
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onHighlightClick?.(district.path, layer, e.nativeEvent);
            }
          : undefined;

        return (
          <mesh
            key={`fill-${district.path}`}
            position={[centerX, FILL_HEIGHT * growProgress, centerZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={1}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <planeGeometry args={[width, depth]} />
            <meshBasicMaterial
              ref={(mat) => {
                if (mat) {
                  materialRefs.current.set(district.path, mat);
                  originalsRef.current.set(district.path, {
                    color: new THREE.Color(color), opacity,
                  });
                }
              }}
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// Instanced Buildings
// ============================================================================

interface InstancedBuildingsProps {
  buildings: CityBuilding[];
  centerOffset: { x: number; z: number };
  onHover?: (building: CityBuilding | null) => void;
  onClick?: (building: CityBuilding, event: MouseEvent) => void;
  hoveredIndex: number | null;
  selectedIndex: number | null;
  growProgress: number;
  animationConfig: AnimationConfig;
  heightScaling: HeightScaling;
  linearScale: number;
  flatPatterns: FlatPattern[];
  staggerIndices: number[];
  focusDirectory: string | null;
  highlightLayers: HighlightLayer[];
  visibilityLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  defaultBuildingColor?: string;
  modifiedFiles?: Record<string, { lineDelta: number }>;
  /** Whole-city alpha multiplier (0–1), eased per-frame toward full opacity. */
  cityDim?: number;
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
  flatPatterns,
  staggerIndices,
  focusDirectory,
  highlightLayers,
  visibilityLayers,
  isolationMode,
  defaultBuildingColor,
  modifiedFiles,
  cityDim = 1,
}: InstancedBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const invalidate = useThree((s) => s.invalidate);
  const buildingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cityDimRef = useRef(1);
  const cityDimTargetRef = useRef(1);
  const dimEaseRef = useRef<{ start: number; from: number; to: number } | null>(null);

  useEffect(() => {
    cityDimTargetRef.current = cityDim;
  }, [cityDim]);

  const heightMultipliersRef = useRef<Float32Array | null>(null);
  const targetMultipliersRef = useRef<Float32Array | null>(null);
  const dimMultipliersRef = useRef<Float32Array | null>(null);
  const targetDimRef = useRef<Float32Array | null>(null);
  const hiddenRef = useRef<Uint8Array | null>(null);

  const hasActiveHighlightLayers = useMemo(() => {
    return visibilityLayers.some(layer => layer.enabled && layer.items.length > 0);
  }, [visibilityLayers]);

  const hasModifiedFilesIsolation = !!modifiedFiles;

  const interactiveFillDirs = useMemo(() => {
    const dirs: string[] = [];
    for (const layer of highlightLayers) {
      if (!layer.enabled) continue;
      for (const item of layer.items) {
        if (item.type === 'directory' && (item.renderStrategy ?? 'border') === 'fill' && item.interactive) {
          dirs.push(item.path);
        }
      }
    }
    return dirs;
  }, [highlightLayers]);

  const narrowedDirectories = useMemo(() => {
    const dirs: string[] = [];
    const files: string[] = [];
    for (const layer of visibilityLayers) {
      if (!layer.enabled) continue;
      for (const item of layer.items) {
        if (item.type === 'directory') dirs.push(item.path);
        else if (item.type === 'file') files.push(item.path);
      }
    }
    const narrowed = new Set<string>();
    for (const dir of dirs) {
      for (const f of files) {
        if (f === dir || f.startsWith(dir + '/')) {
          narrowed.add(dir);
          break;
        }
      }
    }
    return narrowed;
  }, [visibilityLayers]);

  useEffect(() => {
    if (buildings.length > 0) {
      if (!heightMultipliersRef.current || heightMultipliersRef.current.length !== buildings.length) {
        heightMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        targetMultipliersRef.current = new Float32Array(buildings.length).fill(1);
        const initialDim = hasModifiedFilesIsolation ? 0 : 1;
        dimMultipliersRef.current = new Float32Array(buildings.length).fill(initialDim);
        targetDimRef.current = new Float32Array(buildings.length).fill(initialDim);
        hiddenRef.current = new Uint8Array(buildings.length);
      }
    }
  }, [buildings.length, hasModifiedFilesIsolation]);

  const prevHasIsolationRef = useRef(hasModifiedFilesIsolation);
  useLayoutEffect(() => {
    if (hasModifiedFilesIsolation && !prevHasIsolationRef.current && dimMultipliersRef.current) {
      dimMultipliersRef.current.fill(0);
      if (meshRef.current && buildingData.length > 0) {
        buildingData.forEach((data, i) => {
          tempColor.set(data.color);
          const gray = 0.3;
          tempColor.r = gray;
          tempColor.g = gray;
          tempColor.b = gray;
          meshRef.current!.setColorAt(i, tempColor);
        });
        if (meshRef.current.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true;
        }
        invalidate();
      }
    }
    prevHasIsolationRef.current = hasModifiedFilesIsolation;
  }, [hasModifiedFilesIsolation]);

  useEffect(() => {
    if (!targetMultipliersRef.current || !targetDimRef.current || !hiddenRef.current) return;

    buildings.forEach((building, index) => {
      let shouldCollapse = false;
      let shouldDim = false;
      let shouldHide = false;

      const isInFocusDirectory = focusDirectory
        ? isPathInDirectory(building.path, focusDirectory)
        : true;

      const layerMatches = hasActiveHighlightLayers
        ? getLayerMatchesForPath(building.path, visibilityLayers)
        : [];
      const isSpecificallyHighlighted = hasActiveHighlightLayers
        ? layerMatches.some(m =>
            m.item.type === 'file' || !narrowedDirectories.has(m.item.path),
          )
        : hasModifiedFilesIsolation
          ? modifiedFiles![building.path] !== undefined
          : true;

      if (focusDirectory && (hasActiveHighlightLayers || hasModifiedFilesIsolation) && isolationMode === 'collapse') {
        shouldCollapse = !isInFocusDirectory;
        shouldDim = isInFocusDirectory && !isSpecificallyHighlighted;
      } else if (focusDirectory && (hasActiveHighlightLayers || hasModifiedFilesIsolation) && isolationMode === 'hide') {
        shouldCollapse = !isInFocusDirectory;
        shouldHide = isInFocusDirectory && !isSpecificallyHighlighted;
      } else if (focusDirectory) {
        shouldCollapse = !isInFocusDirectory;
      } else if ((hasActiveHighlightLayers || hasModifiedFilesIsolation) && isolationMode === 'collapse') {
        shouldCollapse = !isSpecificallyHighlighted;
      } else if ((hasActiveHighlightLayers || hasModifiedFilesIsolation) && isolationMode === 'hide') {
        shouldHide = !isSpecificallyHighlighted;
      }

      if (shouldCollapse || shouldDim) {
        targetMultipliersRef.current![index] = 0.05;
      } else {
        targetMultipliersRef.current![index] = 1;
      }
      targetDimRef.current![index] = shouldCollapse ? 0 : 1;
      hiddenRef.current![index] = shouldHide ? 1 : 0;
    });
  }, [focusDirectory, buildings, visibilityLayers, isolationMode, hasActiveHighlightLayers, narrowedDirectories, hasModifiedFilesIsolation, modifiedFiles]);

  const buildingData = useMemo(() => {
    const staggerStep = resolveStaggerDelay(animationConfig, staggerIndices.length);
    return buildings.map((building, index) => {
      const [width, , depth] = building.dimensions;
      const fullHeight = calculateBuildingHeight(building, heightScaling, linearScale, flatPatterns);
      const hasAnyLayerMatch = highlightLayers && getLayerMatchesForPath(building.path, highlightLayers).length > 0;
      const layerFill = hasAnyLayerMatch ? getHighlightForPath(building.path, highlightLayers!) : null;
      const color = layerFill?.color
        ?? (hasAnyLayerMatch ? getColorForFile(building) : defaultBuildingColor)
        ?? getColorForFile(building);

      const x = building.position.x - centerOffset.x;
      const z = building.position.z - centerOffset.z;
      const staggerIndex = staggerIndices[index] ?? index;
      const staggerDelayMs = staggerStep * staggerIndex;

      return {
        building, index, width, depth, fullHeight, color, x, z, staggerDelayMs,
      };
    });
  }, [
    buildings, centerOffset, heightScaling, linearScale, flatPatterns,
    staggerIndices, animationConfig, defaultBuildingColor, highlightLayers,
  ]);

  const minHeight = 0.3;
  const baseOffset = 0.2;
  const springDuration = computeSpringDuration(animationConfig);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!meshRef.current || buildingData.length === 0) return;

    if (hasModifiedFilesIsolation && dimMultipliersRef.current && targetDimRef.current) {
      for (let i = 0; i < dimMultipliersRef.current.length; i++) {
        dimMultipliersRef.current[i] = targetDimRef.current[i];
      }
    }

    buildingData.forEach((data, instanceIndex) => {
      const { width, depth, x, z, color, fullHeight } = data;
      const multiplier = heightMultipliersRef.current?.[instanceIndex] ?? 1;
      const height = growProgress * fullHeight * multiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width, height, depth);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      const dim = targetDimRef.current?.[instanceIndex] ?? 1;
      tempColor.set(color);
      if (dim < 0.5) {
        const grayAmount = 1 - dim * 2;
        const gray = 0.3;
        tempColor.r = tempColor.r * (1 - grayAmount) + gray * grayAmount;
        tempColor.g = tempColor.g * (1 - grayAmount) + gray * grayAmount;
        tempColor.b = tempColor.b * (1 - grayAmount) + gray * grayAmount;
      }
      meshRef.current!.setColorAt(instanceIndex, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.computeBoundingSphere();
    invalidate();

    initializedRef.current = true;
  }, [buildingData, growProgress, tempObject, tempColor, minHeight, baseOffset, invalidate]);

  useFrame(({ clock }) => {
    if (!meshRef.current || buildingData.length === 0) return;
    if (!heightMultipliersRef.current || !targetMultipliersRef.current) return;

    let stillAnimating = false;

    // Whole-city alpha: ease toward the target `cityDim` in lockstep with the
    // camera focus move (same 0.7s smoothstep duration as FLAT_EASE_DURATION_S),
    // so the dim never front-loads ahead of the zoom. Then apply as real
    // per-city material opacity.
    const dimTarget = cityDimTargetRef.current;
    let dimEased = cityDimRef.current;
    if (Math.abs(dimTarget - dimEased) > 0.001) {
      const ease = dimEaseRef.current;
      if (!ease || ease.to !== dimTarget) {
        dimEaseRef.current = { start: clock.elapsedTime, from: dimEased, to: dimTarget };
      }
      const e = dimEaseRef.current!;
      const t = Math.min(1, Math.max(0, (clock.elapsedTime - e.start) / 0.7));
      const p = t >= 1 ? 1 : t * t * (3 - 2 * t);
      dimEased = e.from + (e.to - e.from) * p;
      if (t < 1) stillAnimating = true;
    } else {
      dimEaseRef.current = null;
    }
    cityDimRef.current = dimEased;
    if (buildingMaterialRef.current) {
      const mat = buildingMaterialRef.current;
      mat.opacity = cityDimRef.current;
      const wantTransparent = cityDimRef.current < 0.999;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
    }

    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }

    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;
    const collapseSpeed = 0.08;
    const SETTLE_EPS = 0.001;

    buildingData.forEach((data, instanceIndex) => {
      const { width, depth, fullHeight, x, z, staggerDelayMs } = data;
      const isHidden = hiddenRef.current?.[instanceIndex] === 1;

      if (isHidden) {
        tempObject.position.set(x, baseOffset, z);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);
        return;
      }

      const currentMultiplier = heightMultipliersRef.current![instanceIndex];
      const targetMultiplier = targetMultipliersRef.current![instanceIndex];
      let newMultiplier = currentMultiplier + (targetMultiplier - currentMultiplier) * collapseSpeed;
      if (Math.abs(targetMultiplier - newMultiplier) < SETTLE_EPS) newMultiplier = targetMultiplier;
      else stillAnimating = true;
      heightMultipliersRef.current![instanceIndex] = newMultiplier;

      const currentDim = dimMultipliersRef.current![instanceIndex];
      const targetDim = targetDimRef.current![instanceIndex];
      let newDim = currentDim + (targetDim - currentDim) * collapseSpeed;
      if (Math.abs(targetDim - newDim) < SETTLE_EPS) newDim = targetDim;
      else stillAnimating = true;
      dimMultipliersRef.current![instanceIndex] = newDim;

      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
        if (t < 1) stillAnimating = true;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
        stillAnimating = true;
      }

      const height = animProgress * fullHeight * newMultiplier + minHeight;
      const yPosition = height / 2 + baseOffset;

      const isHovered = hoveredIndex === data.index;
      const isSelected = selectedIndex === data.index;
      const scale = isSelected ? 1.08 : isHovered ? 1.05 : 1;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width * scale, height, depth * scale);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      tempColor.set(data.color);
      if (newDim < 0.5) {
        const grayAmount = 1 - newDim * 2;
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
    meshRef.current.computeBoundingSphere();
    if (stillAnimating) invalidate();
  });

  const isPathUnderInteractiveFill = useCallback(
    (path: string) => interactiveFillDirs.some(dir => path === dir || path.startsWith(dir + '/')),
    [interactiveFillDirs],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.instanceId !== undefined && e.instanceId < buildingData.length) {
        const data = buildingData[e.instanceId];
        if (!isPathUnderInteractiveFill(data.building.path)) {
          e.stopPropagation();
          onHover?.(data.building);
        }
      }
    },
    [buildingData, onHover, isPathUnderInteractiveFill],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.instanceId != null && e.instanceId < buildingData.length && isPathUnderInteractiveFill(buildingData[e.instanceId].building.path)) {
        return;
      }
      onHover?.(null);
    },
    [buildingData, onHover, isPathUnderInteractiveFill],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (e.instanceId !== undefined && e.instanceId < buildingData.length) {
        const data = buildingData[e.instanceId];
        if (!isPathUnderInteractiveFill(data.building.path)) {
          e.stopPropagation();
          onClick?.(data.building, e.nativeEvent);
        }
      }
    },
    [buildingData, onClick, isPathUnderInteractiveFill],
  );

  if (buildingData.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, buildingData.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={buildingMaterialRef} />
      </instancedMesh>

      <BuildingEdges
        buildings={buildingData.map(d => ({
          width: d.width, depth: d.depth, fullHeight: d.fullHeight,
          x: d.x, z: d.z, staggerDelayMs: d.staggerDelayMs, buildingIndex: d.index,
        }))}
        growProgress={growProgress}
        minHeight={minHeight}
        baseOffset={baseOffset}
        springDuration={springDuration}
        heightMultipliersRef={heightMultipliersRef}
        hiddenRef={hiddenRef}
      />

      <BorderHighlights
        buildings={buildings}
        centerOffset={centerOffset}
        highlightLayers={highlightLayers}
        growProgress={growProgress}
        minHeight={minHeight}
        baseOffset={baseOffset}
        springDuration={springDuration}
        heightMultipliersRef={heightMultipliersRef}
        heightScaling={heightScaling}
        linearScale={linearScale}
        flatPatterns={flatPatterns}
        staggerIndices={staggerIndices}
        animationConfig={animationConfig}
      />
    </group>
  );
}

// ============================================================================
// Building Icons
// ============================================================================

interface BuildingIconsProps {
  buildings: CityBuilding[];
  centerOffset: { x: number; z: number };
  growProgress: number;
  heightScaling: HeightScaling;
  linearScale: number;
  flatPatterns: FlatPattern[];
  highlightLayers: HighlightLayer[];
  visibilityLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  hasActiveHighlights: boolean;
  modifiedFiles?: Record<string, { lineDelta: number }>;
  /** Whole-city alpha multiplier (0–1) applied to every icon. */
  cityDim?: number;
}

interface AnimatedIconProps {
  x: number;
  z: number;
  targetHeight: number;
  iconSize: number;
  texture: THREE.Texture;
  opacity: number;
  growProgress: number;
  /** Whole-city alpha multiplier (0–1), eased per-frame toward full opacity. */
  cityDim: number;
}

function AnimatedIcon({
  x, z, targetHeight, iconSize, texture, opacity, growProgress, cityDim,
}: AnimatedIconProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cityDimRef = useRef(1);
  const dimEaseRef = useRef<{ start: number; from: number; to: number } | null>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const minHeight = 0.3;
    const baseOffset = 0.2;
    const height = growProgress * targetHeight + minHeight;
    const buildingTop = height + baseOffset;
    const flatY = minHeight + baseOffset + 0.5;
    const grownY = buildingTop + 0.5;
    const yPosition = flatY + (grownY - flatY) * growProgress;

    meshRef.current.position.y = yPosition;
    meshRef.current.rotation.x = -Math.PI / 2;

    // Icon fade tracks the whole-city camera-focus dim (0.7s smoothstep), so
    // icons and buildings dim in lockstep instead of icons front-loading.
    let dimEased = cityDimRef.current;
    if (Math.abs(cityDim - dimEased) > 0.001) {
      const ease = dimEaseRef.current;
      if (!ease || ease.to !== cityDim) {
        dimEaseRef.current = { start: clock.elapsedTime, from: dimEased, to: cityDim };
      }
      const e = dimEaseRef.current!;
      const t = Math.min(1, Math.max(0, (clock.elapsedTime - e.start) / 0.7));
      const p = t >= 1 ? 1 : t * t * (3 - 2 * t);
      dimEased = e.from + (e.to - e.from) * p;
      if (t < 1) invalidate();
    } else {
      dimEaseRef.current = null;
    }
    cityDimRef.current = dimEased;
    if (materialRef.current) {
      materialRef.current.opacity = opacity * cityDimRef.current;
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
  flatPatterns,
  visibilityLayers,
  isolationMode,
  hasActiveHighlights,
  modifiedFiles,
  cityDim = 1,
}: BuildingIconsProps) {
  const narrowedDirectories = useMemo(() => {
    const dirs: string[] = [];
    const files: string[] = [];
    for (const layer of visibilityLayers) {
      if (!layer.enabled) continue;
      for (const item of layer.items) {
        if (item.type === 'directory') dirs.push(item.path);
        else if (item.type === 'file') files.push(item.path);
      }
    }
    const narrowed = new Set<string>();
    for (const dir of dirs) {
      for (const f of files) {
        if (f === dir || f.startsWith(dir + '/')) {
          narrowed.add(dir);
          break;
        }
      }
    }
    return narrowed;
  }, [visibilityLayers]);

  const hasModifiedFilesIsolation = !!modifiedFiles;

  const buildingsWithIcons = useMemo(() => {
    return buildings
      .map((building) => {
        const config = getConfigForFile(building);
        if (!config.icon) return null;

        const matches = getLayerMatchesForPath(building.path, visibilityLayers);
        const isSpecificallyHighlighted = matches.some(
          m => m.item.type === 'file' || !narrowedDirectories.has(m.item.path),
        );
        const shouldDim = (hasActiveHighlights || hasModifiedFilesIsolation) && !isSpecificallyHighlighted && !(hasModifiedFilesIsolation && modifiedFiles?.[building.path] !== undefined);
        const shouldHide =
          (hasActiveHighlights || hasModifiedFilesIsolation) && (isolationMode === 'hide' || (hasModifiedFilesIsolation && modifiedFiles?.[building.path] === undefined)) && !isSpecificallyHighlighted;
        const shouldCollapse = shouldDim && isolationMode === 'collapse';

        if (shouldHide || shouldCollapse) return null;

        const fullHeight = calculateBuildingHeight(building, heightScaling, linearScale, flatPatterns);
        const targetHeight = fullHeight;
        const x = building.position.x - centerOffset.x;
        const z = building.position.z - centerOffset.z;

        return { building, config, x, z, targetHeight, shouldDim };
      })
      .filter(Boolean) as Array<{
        building: CityBuilding;
        config: FileConfigResult;
        x: number;
        z: number;
        targetHeight: number;
        shouldDim: boolean;
      }>;
  }, [
    buildings, centerOffset, visibilityLayers, isolationMode,
    hasActiveHighlights, heightScaling, linearScale, flatPatterns,
    narrowedDirectories, hasModifiedFilesIsolation, modifiedFiles,
  ]);

  return (
    <>
      {buildingsWithIcons.map(
        ({ building, config, x, z, targetHeight, shouldDim }) => {
          const icon = config.icon!;
          const texture = getIconTexture(icon.name, icon.color || '#ffffff');
          if (!texture) return null;

          const [width, , depth] = building.dimensions;
          const minDimension = Math.min(width, depth);
          const iconSize = minDimension * (icon.size || 0.6) * 1.7;

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
              cityDim={cityDim}
            />
          );
        },
      )}
    </>
  );
}

// ============================================================================
// Modified Indicator
// ============================================================================

interface ModifiedIndicatorProps {
  building: CityBuilding;
  centerOffset: { x: number; z: number };
  lineDelta: number;
}

function ModifiedIndicator({ building, centerOffset, lineDelta }: ModifiedIndicatorProps) {
  const sign = lineDelta > 0 ? '+' : '';
  const text = `${sign}${lineDelta}`;
  const color = lineDelta > 0 ? '#22c55e' : '#ef4444';

  const x = building.position.x - centerOffset.x;
  const z = building.position.z - centerOffset.z;
  const y = 10;

  const fontSize = Math.max(15, Math.min(30, building.dimensions[0] / 8));

  return (
    <Text
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={fontSize * 0.06}
      outlineColor="#000000"
      renderOrder={999}
      frustumCulled={false}
    >
      {text}
      <meshBasicMaterial depthTest={false} />
    </Text>
  );
}

// ============================================================================
// District Floor
// ============================================================================

interface DistrictFloorProps {
  district: CityDistrict;
  centerOffset: { x: number; z: number };
  opacity: number;
  highlightColor?: string | null;
  growProgress: number;
  appearingProgress?: number;
}

function DistrictFloor({ district, centerOffset, highlightColor, growProgress, appearingProgress = 0 }: DistrictFloorProps) {
  const { worldBounds } = district;
  const width = worldBounds.maxX - worldBounds.minX;
  const depth = worldBounds.maxZ - worldBounds.minZ;
  const centerX = (worldBounds.minX + worldBounds.maxX) / 2 - centerOffset.x;
  const centerZ = (worldBounds.minZ + worldBounds.maxZ) / 2 - centerOffset.z;

  const dirName = district.path.split('/').pop() || district.path;
  const pathDepth = district.path.split('/').length;
  const floorY = -5 - pathDepth * 0.1;

  const accentColor = '#22d3ee';
  const borderColor = appearingProgress > 0
    ? (highlightColor || accentColor)
    : (highlightColor || '#475569');
  const lineWidth = (highlightColor || appearingProgress > 0) ? 3 : 1;
  const labelColor = appearingProgress > 0
    ? (highlightColor || accentColor)
    : (highlightColor || '#cbd5e1');

  const flatRotationX = -Math.PI / 2;
  const grownRotationX = -Math.PI / 6;
  const textRotationX = flatRotationX + (grownRotationX - flatRotationX) * growProgress;

  const flatY = 0.5;
  const grownY = 1.5;
  const textY = flatY + (grownY - flatY) * growProgress;

  const flatZ = depth / 2 - 6;
  const grownZ = depth / 2 + 2;
  const textZ = flatZ + (grownZ - flatZ) * growProgress;

  const positionT = appearingProgress > 0
    ? easeOutCubic(Math.max(0, (appearingProgress - 0.5) / 0.5))
    : 0;
  const appearingZ = appearingProgress > 0
    ? lerp(0, flatZ, positionT)
    : undefined;
  const finalTextZ = appearingZ !== undefined ? appearingZ : textZ;

  const labelScale = appearingProgress > 0
    ? lerp(10, 1, easeOutCubic(Math.max(0, (appearingProgress - 0.5) / 0.5)))
    : 1;

  return (
    <group position={[centerX, 0, centerZ]}>
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} renderOrder={-1}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} attach="geometry" />
        <lineBasicMaterial color={borderColor} linewidth={lineWidth} depthWrite={false} />
      </lineSegments>

      <group position={[0, textY, finalTextZ]} scale={[labelScale, labelScale, labelScale]}>
        <Text
          rotation={[textRotationX, 0, 0]}
          fontSize={Math.max(6, Math.min(12, width / 3))}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#0f172a"
        >
          {dirName}
        </Text>
      </group>
    </group>
  );
}

// ============================================================================
// Elevated Scope Panel Mesh
// ============================================================================

const PANEL_DISMISS_LIFT = 60;
const PANEL_DISMISS_DURATION = 0.7;

interface ElevatedScopePanelMeshProps {
  panel: ElevatedScopePanel;
  centerOffset: { x: number; z: number };
  dismissing: boolean;
  onDismissed?: (id: string) => void;
}

function ElevatedScopePanelMesh({
  panel,
  centerOffset,
  dismissing,
  onDismissed,
}: ElevatedScopePanelMeshProps) {
  const cx = (panel.bounds.minX + panel.bounds.maxX) / 2 - centerOffset.x;
  const cz = (panel.bounds.minZ + panel.bounds.maxZ) / 2 - centerOffset.z;
  const w = Math.max(1, panel.bounds.maxX - panel.bounds.minX);
  const d = Math.max(1, panel.bounds.maxZ - panel.bounds.minZ);
  const t = panel.thickness ?? 2;
  const y = (panel.height ?? 4) + t / 2;
  const baseOpacity = panel.opacity ?? 1;
  const isOpaqueStatic = baseOpacity >= 1;
  const topY = y + t / 2;
  const tileMax = Math.min(w, d) / 2;
  const requested = panel.labelSize ?? Math.min(w, d) / 6;
  const labelSize = Math.max(4, Math.min(tileMax, requested));

  const groupRef = useRef<THREE.Group>(null);
  const slabMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const labelMaterialRefs = useRef<THREE.MeshBasicMaterial[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const [fullyDismissed, setFullyDismissed] = useState(false);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (dismissing) invalidate();
  }, [dismissing, invalidate]);

  useFrame(({ clock }) => {
    if (!dismissing || finishedRef.current) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - startTimeRef.current;
    const t = Math.min(elapsed / PANEL_DISMISS_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    if (groupRef.current) {
      groupRef.current.position.y = eased * PANEL_DISMISS_LIFT;
    }
    const opacityNow = baseOpacity * (1 - eased);
    if (slabMaterialRef.current) {
      slabMaterialRef.current.opacity = opacityNow;
    }
    for (const mat of labelMaterialRefs.current) {
      if (mat) mat.opacity = opacityNow;
    }

    if (t >= 1) {
      finishedRef.current = true;
      setFullyDismissed(true);
      onDismissed?.(panel.id);
    } else {
      invalidate();
    }
  });

  if (fullyDismissed) return null;

  const slabDepthWrite = isOpaqueStatic && !dismissing;

  const interactive = Boolean(panel.onClick || panel.onDoubleClick);
  const handleClick = panel.onClick
    ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); panel.onClick!(e.nativeEvent); }
    : undefined;
  const handleDoubleClick = panel.onDoubleClick
    ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); panel.onDoubleClick!(e.nativeEvent); }
    : undefined;
  const handlePointerOver = interactive
    ? (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }
    : undefined;
  const handlePointerOut = interactive
    ? () => { document.body.style.cursor = ''; }
    : undefined;

  const labelColor = panel.labelColor ?? '#ffffff';
  const displayLabelColor = panel.displayLabelColor ?? panel.labelColor ?? '#ffffff';

  labelMaterialRefs.current = [];
  const captureLabelMat = (mat: THREE.MeshBasicMaterial | null) => {
    if (mat) labelMaterialRefs.current.push(mat);
  };

  return (
    <group ref={groupRef}>
      <mesh
        position={[cx, y, cz]}
        renderOrder={10}
        onClick={dismissing ? undefined : handleClick}
        onDoubleClick={dismissing ? undefined : handleDoubleClick}
        onPointerOver={dismissing ? undefined : handlePointerOver}
        onPointerOut={dismissing ? undefined : handlePointerOut}
      >
        <boxGeometry args={[w, t, d]} />
        <meshBasicMaterial
          ref={slabMaterialRef}
          color={panel.color}
          transparent
          opacity={baseOpacity}
          depthWrite={slabDepthWrite}
        />
      </mesh>
      {panel.displayLabel && (
        <>
          <Text
            position={[cx, topY + 0.05, cz - labelSize * 0.6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={labelSize}
            color={displayLabelColor}
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.9}
            textAlign="center"
            renderOrder={11}
            frustumCulled={false}
          >
            {panel.displayLabel}
            <meshBasicMaterial
              ref={captureLabelMat}
              attach="material"
              color={displayLabelColor}
              depthWrite={false}
              depthTest={false}
              transparent
              opacity={baseOpacity}
            />
          </Text>
          <mesh
            position={[cx, topY + 0.06, cz - labelSize * 0.05]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={11}
          >
            <planeGeometry
              args={[
                Math.min(w * 0.9, panel.displayLabel.length * labelSize * 0.55),
                labelSize * 0.06,
              ]}
            />
            <meshBasicMaterial
              ref={captureLabelMat}
              color={displayLabelColor}
              depthWrite={false}
              depthTest={false}
              transparent
              opacity={baseOpacity}
            />
          </mesh>
        </>
      )}
      {panel.label && (
        <Text
          position={[cx, topY + 0.05, cz + (panel.displayLabel ? labelSize * 0.6 : 0)]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={labelSize}
          color={labelColor}
          anchorX="center"
          anchorY="middle"
          maxWidth={w * 0.9}
          textAlign="center"
          renderOrder={11}
          frustumCulled={false}
        >
          {panel.label}
          <meshBasicMaterial
            ref={captureLabelMat}
            attach="material"
            color={labelColor}
            depthWrite={false}
            depthTest={false}
            transparent
            opacity={baseOpacity}
          />
        </Text>
      )}
    </group>
  );
}

// ============================================================================
// Selection Ring
// ============================================================================

interface SelectionRingProps {
  district: CityDistrict;
  centerOffset: { x: number; z: number };
  color: string;
  borderWidth: number;
  growProgress: number;
}

const SELECTION_RING_FLAT_Y = 7;

function SelectionRing({
  district,
  centerOffset,
  color,
  borderWidth,
  growProgress,
}: SelectionRingProps) {
  const { worldBounds } = district;
  const inflate = 1;
  const minX = worldBounds.minX - inflate;
  const maxX = worldBounds.maxX + inflate;
  const minZ = worldBounds.minZ - inflate;
  const maxZ = worldBounds.maxZ + inflate;
  const cx = (minX + maxX) / 2 - centerOffset.x;
  const cz = (minZ + maxZ) / 2 - centerOffset.z;
  const w = maxX - minX;
  const d = maxZ - minZ;

  const pathDepth = district.path.split('/').length;
  const groundY = -5 - pathDepth * 0.1 + 0.2;
  const y = SELECTION_RING_FLAT_Y + (groundY - SELECTION_RING_FLAT_Y) * growProgress;

  const t = Math.max(0.5, borderWidth);
  const barH = 0.5;

  return (
    <group position={[cx, y, cz]}>
      <mesh position={[0, 0, -d / 2]} renderOrder={20}>
        <boxGeometry args={[w + t, barH, t]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0, d / 2]} renderOrder={20}>
        <boxGeometry args={[w + t, barH, t]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]} renderOrder={20}>
        <boxGeometry args={[t, barH, d + t]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <mesh position={[w / 2, 0, 0]} renderOrder={20}>
        <boxGeometry args={[t, barH, d + t]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// ============================================================================
// CityContent Props & Component
// ============================================================================

export interface CityContentProps {
  /** City data to render */
  cityData: CityData;
  /** Growth animation progress (0 = flat, 1 = fully grown) */
  growProgress: number;
  /** Animation configuration */
  animationConfig: AnimationConfig;
  /** Combined highlight layers (user highlights + file-color layers) */
  highlightLayers: HighlightLayer[];
  /** User-supplied highlight layers only (for visibility decisions) */
  visibilityLayers: HighlightLayer[];
  /** How to handle non-highlighted buildings */
  isolationMode: IsolationMode;
  /** Height scaling mode */
  heightScaling: HeightScaling;
  /** Scale factor for linear height mode */
  linearScale: number;
  /** Patterns for files that should render flat */
  flatPatterns: FlatPattern[];
  /** Base building color fallback */
  defaultBuildingColor?: string;
  /** Callback when a building is clicked */
  onBuildingClick?: (building: CityBuilding, event: MouseEvent) => void;
  /** Callback when a building is hovered */
  onBuildingHover?: (building: CityBuilding | null) => void;
  /** Callback when a highlight fill is clicked */
  onHighlightClick?: (path: string, layer: HighlightLayer, event: MouseEvent) => void;
  /** Callback when a highlight fill is hovered */
  onHighlightHover?: (path: string | null, layer: HighlightLayer | null) => void;
  /** Current hovered building */
  hoveredBuilding: CityBuilding | null;
  /** Currently selected building */
  selectedBuilding: CityBuilding | null;
  /** Currently selected district */
  selectedDistrict: CityDistrict | null;
  /** Visual style for the selection ring */
  selectionStyle?: SelectionStyle;
  /** Directory to focus on (collapses non-matching buildings) */
  focusDirectory: string | null;
  /** Color for the focused directory */
  focusColor?: string | null;
  /** Elevated scope panels rendered in flat mode */
  elevatedScopePanels?: ElevatedScopePanel[];
  /** Set of panel ids to dismiss */
  dismissingPanelIds?: ReadonlySet<string>;
  /** Callback when a panel dismiss animation settles */
  onPanelDismissed?: (id: string) => void;
  /** Per-district appearing progress (0-1) */
  districtAppearingProgress?: Record<string, number>;
  /** Files modified in the current transition */
  modifiedFiles?: Record<string, { lineDelta: number }>;
  /** Current transition progress (0-1) */
  transitionProgress?: number;
  /**
   * World-space offset for positioning this city in a multi-city layout.
   * Defaults to `{ x: 0, z: 0 }` (no offset).
   */
  positionOffset?: { x: number; z: number };
  /**
   * Per-city alpha multiplier applied to this city's buildings + icons.
   * `1` = full opacity (default), `<1` = transparent. Eased per-frame in
   * lockstep with the camera move so a focused repo brightens as the camera
   * settles on it.
   */
  cityDim?: number;
}

export function CityContent({
  cityData,
  onBuildingHover,
  onBuildingClick,
  onHighlightClick,
  onHighlightHover,
  hoveredBuilding,
  selectedBuilding,
  selectedDistrict,
  selectionStyle,
  growProgress,
  animationConfig,
  highlightLayers,
  visibilityLayers,
  isolationMode,
  heightScaling,
  linearScale,
  flatPatterns,
  focusDirectory,
  focusColor,
  elevatedScopePanels,
  dismissingPanelIds,
  onPanelDismissed,
  defaultBuildingColor,
  districtAppearingProgress,
  modifiedFiles,
  transitionProgress = 0,
  positionOffset = { x: 0, z: 0 },
  cityDim = 1,
}: CityContentProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); });

  const centerOffset = useMemo(
    () => ({
      x: (cityData.bounds.minX + cityData.bounds.maxX) / 2,
      z: (cityData.bounds.minZ + cityData.bounds.maxZ) / 2,
    }),
    [cityData.bounds],
  );

  const activeHighlights = useMemo(() => hasActiveHighlights(visibilityLayers), [visibilityLayers]);

  // Focus directory phase-animation
  const [buildingFocusDirectory, setBuildingFocusDirectory] = useState<string | null>(null);
  const [buildingFocusColor, setBuildingFocusColor] = useState<string | null>(null);
  const prevFocusDirectoryRef = useRef<string | null>(null);
  const animationTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    animationTimersRef.current.forEach(clearTimeout);
    animationTimersRef.current = [];

    const prevFocus = prevFocusDirectoryRef.current;
    prevFocusDirectoryRef.current = focusDirectory;

    if (focusDirectory === prevFocus) return;

    // Going from overview to a directory (null -> dir)
    if (prevFocus === null && focusDirectory !== null) {
      setBuildingFocusDirectory(focusDirectory);
      setBuildingFocusColor(focusColor ?? null);
      return;
    }

    // Going from a directory to overview (dir -> null)
    if (prevFocus !== null && focusDirectory === null) {
      setBuildingFocusDirectory(null);
      setBuildingFocusColor(null);
      return;
    }

    // Switching between directories (dirA -> dirB)
    if (prevFocus !== null && focusDirectory !== null) {
      const isDescendant = focusDirectory.startsWith(prevFocus + '/');
      const isAncestor = prevFocus.startsWith(focusDirectory + '/');
      const parentOf = (p: string) => { const i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i) : ''; };
      const isSibling = parentOf(prevFocus) === parentOf(focusDirectory);

      if (isDescendant || isAncestor || isSibling) {
        setBuildingFocusDirectory(focusDirectory);
        setBuildingFocusColor(focusColor ?? null);
        return;
      }

      // Unrelated branches — use the 3-phase transition
      setBuildingFocusDirectory(null);
      const timer1 = setTimeout(() => {
        setBuildingFocusDirectory(focusDirectory);
        setBuildingFocusColor(focusColor ?? null);
      }, 500);
      animationTimersRef.current.push(timer1);
    }
  }, [focusDirectory]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { animationTimersRef.current.forEach(clearTimeout); };
  }, []);

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

  const displayBuildings = useMemo(() => cityData.buildings, [cityData.buildings]);

  const ox = positionOffset.x;
  const oz = positionOffset.z;

  return (
    <group position={[ox, 0, oz]}>
      {cityData.districts.map(district => {
        const isFocused = buildingFocusDirectory
          ? district.path === buildingFocusDirectory
          : false;

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

        const districtColor = (isFocused && buildingFocusColor) ? buildingFocusColor : highlightLayerColor;

        return (
          <DistrictFloor
            key={district.path}
            district={district}
            centerOffset={centerOffset}
            opacity={1}
            highlightColor={districtColor}
            growProgress={growProgress}
            appearingProgress={districtAppearingProgress?.[district.path] ?? 0}
          />
        );
      })}

      <InstancedBuildings
        buildings={displayBuildings}
        centerOffset={centerOffset}
        onHover={onBuildingHover}
        onClick={onBuildingClick}
        hoveredIndex={hoveredIndex}
        selectedIndex={selectedIndex}
        growProgress={growProgress}
        animationConfig={animationConfig}
        heightScaling={heightScaling}
        linearScale={linearScale}
        flatPatterns={flatPatterns}
        staggerIndices={staggerIndices}
        focusDirectory={buildingFocusDirectory}
        highlightLayers={highlightLayers}
        visibilityLayers={visibilityLayers}
        isolationMode={isolationMode}
        defaultBuildingColor={defaultBuildingColor}
        modifiedFiles={modifiedFiles}
        cityDim={cityDim}
      />

      <DirectoryFills
        districts={cityData.districts}
        centerOffset={centerOffset}
        highlightLayers={highlightLayers}
        growProgress={growProgress}
        onHighlightClick={onHighlightClick}
        onHighlightHover={onHighlightHover}
      />

      <BuildingIcons
        buildings={displayBuildings}
        centerOffset={centerOffset}
        growProgress={growProgress}
        heightScaling={heightScaling}
        linearScale={linearScale}
        flatPatterns={flatPatterns}
        highlightLayers={highlightLayers}
        visibilityLayers={visibilityLayers}
        isolationMode={isolationMode}
        hasActiveHighlights={activeHighlights}
        modifiedFiles={modifiedFiles}
        cityDim={cityDim}
      />

      {modifiedFiles && transitionProgress > 0 && transitionProgress < 1 && cityData.buildings
        .filter(b => modifiedFiles[b.path] && modifiedFiles[b.path].lineDelta !== 0)
        .map(building => (
          <ModifiedIndicator
            key={`modified-${building.path}`}
            building={building}
            centerOffset={centerOffset}
            lineDelta={modifiedFiles[building.path].lineDelta}
          />
        ))}

      {growProgress === 0 &&
        elevatedScopePanels?.map(panel => (
          <ElevatedScopePanelMesh
            key={panel.id}
            panel={panel}
            centerOffset={centerOffset}
            dismissing={dismissingPanelIds?.has(panel.id) ?? false}
            onDismissed={onPanelDismissed}
          />
        ))}

      {selectedDistrict && (
        <SelectionRing
          district={selectedDistrict}
          centerOffset={centerOffset}
          color={selectionStyle?.color ?? '#facc15'}
          borderWidth={selectionStyle?.borderWidth ?? 2}
          growProgress={growProgress}
        />
      )}
    </group>
  );
}
