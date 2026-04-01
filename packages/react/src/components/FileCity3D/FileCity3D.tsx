/**
 * FileCity3D - 3D visualization of a codebase using React Three Fiber
 *
 * Renders CityData from file-city-builder as actual 3D buildings with
 * camera controls, lighting, and interactivity.
 *
 * Supports animated transition from 2D (flat) to 3D (grown buildings).
 */

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Canvas, useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { useTheme } from '@principal-ade/industry-theme';
import { animated, useSpring, config } from '@react-spring/three';
import {
  OrbitControls,
  PerspectiveCamera,
  Text,
  RoundedBox,
} from '@react-three/drei';
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
  linearScale: number = 0.05
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
  layers: HighlightLayer[]
): { color: string; opacity: number } | null {
  for (const layer of layers) {
    if (!layer.enabled) continue;

    for (const item of layer.items) {
      if (item.type === 'file' && item.path === path) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
      if (
        item.type === 'directory' &&
        (path === item.path || path.startsWith(item.path + '/'))
      ) {
        return { color: layer.color, opacity: layer.opacity ?? 1 };
      }
    }
  }
  return null;
}

function hasActiveHighlights(layers: HighlightLayer[]): boolean {
  return layers.some((layer) => layer.enabled && layer.items.length > 0);
}

// Animated RoundedBox wrapper
const AnimatedRoundedBox = animated(RoundedBox);

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
  highlightLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  hasActiveHighlights: boolean;
  dimOpacity: number;
  heightScaling: HeightScaling;
  linearScale: number;
  staggerIndices: number[];
}

function InstancedBuildings({
  buildings,
  centerOffset,
  onHover,
  onClick,
  hoveredIndex,
  growProgress,
  animationConfig,
  highlightLayers,
  isolationMode,
  hasActiveHighlights,
  dimOpacity,
  heightScaling,
  linearScale,
  staggerIndices,
}: InstancedBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTimeRef = useRef<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Pre-compute building data
  const buildingData = useMemo(() => {
    return buildings.map((building, index) => {
      const [width, , depth] = building.dimensions;
      const highlight = getHighlightForPath(building.path, highlightLayers);
      const isHighlighted = highlight !== null;
      const shouldDim = hasActiveHighlights && !isHighlighted;
      const shouldCollapse = shouldDim && isolationMode === 'collapse';
      const shouldHide = shouldDim && isolationMode === 'hide';

      const fullHeight = calculateBuildingHeight(
        building,
        heightScaling,
        linearScale
      );
      const targetHeight = shouldCollapse ? 0.5 : fullHeight;

      const baseColor = getColorForFile(building);
      const color = isHighlighted ? highlight.color : baseColor;

      const x = building.position.x - centerOffset.x;
      const z = building.position.z - centerOffset.z;

      const staggerIndex = staggerIndices[index] ?? index;
      const staggerDelayMs =
        (animationConfig.staggerDelay || 15) * staggerIndex;

      return {
        building,
        index,
        width,
        depth,
        targetHeight,
        color,
        x,
        z,
        shouldHide,
        shouldDim,
        staggerDelayMs,
        isHighlighted,
      };
    });
  }, [
    buildings,
    centerOffset,
    highlightLayers,
    hasActiveHighlights,
    isolationMode,
    heightScaling,
    linearScale,
    staggerIndices,
    animationConfig.staggerDelay,
  ]);

  const visibleBuildings = useMemo(
    () => buildingData.filter((b) => !b.shouldHide),
    [buildingData]
  );

  const minHeight = 0.3;
  const baseOffset = 0.2;
  const tension = animationConfig.tension || 120;
  const friction = animationConfig.friction || 14;
  const springDuration = Math.sqrt(1 / (tension * 0.001)) * friction * 20;

  useEffect(() => {
    if (!meshRef.current) return;

    visibleBuildings.forEach((data, instanceIndex) => {
      const { width, depth, x, z, color, targetHeight } = data;

      const height = growProgress * targetHeight + minHeight;
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
  }, [
    visibleBuildings,
    growProgress,
    tempObject,
    tempColor,
    minHeight,
    baseOffset,
  ]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    if (startTimeRef.current === null && growProgress > 0) {
      startTimeRef.current = clock.elapsedTime * 1000;
    }

    const currentTime = clock.elapsedTime * 1000;
    const animStartTime = startTimeRef.current ?? currentTime;

    visibleBuildings.forEach((data, instanceIndex) => {
      const { width, depth, targetHeight, x, z, staggerDelayMs, shouldDim } =
        data;

      const elapsed = currentTime - animStartTime - staggerDelayMs;
      let animProgress = growProgress;

      if (growProgress > 0 && elapsed >= 0) {
        const t = Math.min(elapsed / springDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        animProgress = eased * growProgress;
      } else if (growProgress > 0 && elapsed < 0) {
        animProgress = 0;
      }

      const height = animProgress * targetHeight + minHeight;
      const yPosition = height / 2 + baseOffset;

      const isHovered = hoveredIndex === data.index;
      const scale = isHovered ? 1.05 : 1;

      tempObject.position.set(x, yPosition, z);
      tempObject.scale.set(width * scale, height, depth * scale);
      tempObject.updateMatrix();

      meshRef.current!.setMatrixAt(instanceIndex, tempObject.matrix);

      const opacity =
        shouldDim && isolationMode === 'transparent' ? dimOpacity : 1;
      tempColor.set(data.color);
      if (opacity < 1) {
        tempColor.multiplyScalar(opacity + 0.3);
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
      if (
        e.instanceId !== undefined &&
        e.instanceId < visibleBuildings.length
      ) {
        const data = visibleBuildings[e.instanceId];
        onHover?.(data.building);
      }
    },
    [visibleBuildings, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (
        e.instanceId !== undefined &&
        e.instanceId < visibleBuildings.length
      ) {
        const data = visibleBuildings[e.instanceId];
        onClick?.(data.building);
      }
    },
    [visibleBuildings, onClick]
  );

  if (visibleBuildings.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, visibleBuildings.length]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial metalness={0.1} roughness={0.35} />
    </instancedMesh>
  );
}

// District floor component
interface DistrictFloorProps {
  district: CityDistrict;
  centerOffset: { x: number; z: number };
  opacity: number;
}

function DistrictFloor({
  district,
  centerOffset,
  opacity,
}: DistrictFloorProps) {
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
      <lineSegments
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, floorY, 0]}
        renderOrder={-1}
      >
        <edgesGeometry
          args={[new THREE.PlaneGeometry(width, depth)]}
          attach="geometry"
        />
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
interface AnimatedCameraProps {
  citySize: number;
  isFlat: boolean;
}

let cameraResetFn: (() => void) | null = null;

export function resetCamera() {
  cameraResetFn?.();
}

function AnimatedCamera({ citySize, isFlat }: AnimatedCameraProps) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

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
    resetToInitial();
  }, [resetToInitial]);

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
  const rawExt =
    building.fileExtension || building.path.split('.').pop() || '';
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
        {building.size !== undefined && (
          <span>{(building.size / 1024).toFixed(1)} KB</span>
        )}
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

function ControlsOverlay({
  isFlat,
  onToggle,
  onResetCamera,
}: ControlsOverlayProps) {
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
  dimOpacity: number;
  heightScaling: HeightScaling;
  linearScale: number;
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
  dimOpacity,
  heightScaling,
  linearScale,
}: CitySceneProps) {
  const centerOffset = useMemo(
    () => ({
      x: (cityData.bounds.minX + cityData.bounds.maxX) / 2,
      z: (cityData.bounds.minZ + cityData.bounds.maxZ) / 2,
    }),
    [cityData.bounds]
  );

  const citySize = Math.max(
    cityData.bounds.maxX - cityData.bounds.minX,
    cityData.bounds.maxZ - cityData.bounds.minZ
  );

  const activeHighlights = useMemo(
    () => hasActiveHighlights(highlightLayers),
    [highlightLayers]
  );

  const staggerIndices = useMemo(() => {
    const centerX = (cityData.bounds.minX + cityData.bounds.maxX) / 2;
    const centerZ = (cityData.bounds.minZ + cityData.bounds.maxZ) / 2;

    const withDistance = cityData.buildings.map((b, originalIndex) => ({
      originalIndex,
      distance: Math.sqrt(
        Math.pow(b.position.x - centerX, 2) +
          Math.pow(b.position.z - centerZ, 2)
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
    return cityData.buildings.findIndex((b) => b.path === hoveredBuilding.path);
  }, [hoveredBuilding, cityData.buildings]);

  return (
    <>
      <AnimatedCamera citySize={citySize} isFlat={growProgress === 0} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[citySize, citySize, citySize * 0.5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-citySize * 0.5, citySize * 0.5, -citySize * 0.5]}
        intensity={0.3}
      />

      {cityData.districts.map((district) => (
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
        highlightLayers={highlightLayers}
        isolationMode={isolationMode}
        hasActiveHighlights={activeHighlights}
        dimOpacity={dimOpacity}
        heightScaling={heightScaling}
        linearScale={linearScale}
        staggerIndices={staggerIndices}
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
}: FileCity3DProps) {
  const { theme } = useTheme();
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(
    null
  );
  const [internalIsGrown, setInternalIsGrown] = useState(false);

  const animationConfig = useMemo(
    () => ({ ...DEFAULT_ANIMATION, ...animation }),
    [animation]
  );

  const isGrown =
    externalIsGrown !== undefined ? externalIsGrown : internalIsGrown;
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
          background: theme.colors.background,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
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
          background: theme.colors.background,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
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
        background: theme.colors.background,
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
          dimOpacity={dimOpacity}
          heightScaling={heightScaling}
          linearScale={linearScale}
        />
      </Canvas>
      <InfoPanel building={hoveredBuilding} />
      {showControls && (
        <ControlsOverlay
          isFlat={!isGrown}
          onToggle={handleToggle}
          onResetCamera={resetCamera}
        />
      )}
    </div>
  );
}

export default FileCity3D;
