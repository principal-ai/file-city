/**
 * FileCity3D - 3D visualization of a codebase using React Three Fiber
 *
 * Renders CityData from file-city-builder as actual 3D buildings with
 * camera controls, lighting, and interactivity.
 *
 * Supports animated transition from 2D (flat) to 3D (grown buildings).
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { useSpring } from '@react-spring/three';
import { Html, MapControls, PerspectiveCamera } from '@react-three/drei';
import type {
  CityData,
  CityBuilding,
  CityDistrict,
  HighlightLayer as BuilderHighlightLayer,
  LayerItem,
  LayerRenderStrategy,
} from '@principal-ai/file-city-builder';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { resolveVisualizationIntent } from '../../utils/visualizationResolution';
import { computeCityLabelAnchor } from '../../utils/cityLabelPlacement';
import { CityContent } from './CityContent';
import { CityLights } from './CityLights';

// Extend JSX with Three.js elements
/* eslint-disable react/no-unknown-property */
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Re-export types for convenience
export type { CityData, CityBuilding, CityDistrict, LayerItem, LayerRenderStrategy };
export type HighlightLayer = BuilderHighlightLayer;

/** Visual style for the `selectedPath` ring on a directory. */
export interface SelectionStyle {
  /** Ring color. Defaults to the theme accent. */
  color?: string;
  /** Ring border width in world units. Default: 2. */
  borderWidth?: number;
}

/**
 * Per-frame camera callback signature. Fires once per R3F render frame from
 * inside the Canvas, so projection done in the callback is in lockstep with
 * the city render — useful for HTML/SVG overlays that need to track world
 * positions (e.g. leader lines anchored to buildings).
 *
 * The callback receives the live `THREE.Camera` and the current canvas
 * size in CSS pixels. To project a world point to canvas-local pixels:
 *
 *   const v = new THREE.Vector3(x, y, z).project(camera);
 *   const px = (v.x *  0.5 + 0.5) * size.width;
 *   const py = (v.y * -0.5 + 0.5) * size.height;
 */
export type OnCameraFrame = (
  camera: THREE.Camera,
  size: { width: number; height: number },
) => void;

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
  /**
   * Target time (ms) for the ENTIRE grow ripple to finish, from the first
   * building starting to the last building topping out. When set, the
   * per-building stagger is derived from it (and the building count) so the
   * whole city finishes in roughly this time regardless of how many buildings
   * there are. Overrides `staggerDelay` when present. Leave unset to control
   * the ripple manually via `staggerDelay`.
   */
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

/**
 * An opaque slab rendered above the flat city to visualize scope coverage.
 * Only renders when the city is in 2D (flat) mode — in 3D the buildings show
 * through normally. When opaque, the slab's depth value occludes buildings and
 * icons beneath its `bounds`, so the scope reads as a single colored tile.
 */
export interface ElevatedScopePanel {
  /** Unique identifier (used as React key) */
  id: string;
  /** Hex color */
  color: string;
  /** 0–1 opacity. Default 1 (fully opaque). */
  opacity?: number;
  /** Y position (world units) above the ground when flat. Default 4. */
  height?: number;
  /** Slab thickness in world units (default 2) */
  thickness?: number;
  /** World-space bounds the slab covers */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Optional label rendered flat on top of the slab. */
  label?: string;
  /** Hex color for the label (default white). */
  labelColor?: string;
  /**
   * Absolute label font size in world units. When omitted, falls back to a
   * size derived from the panel's footprint. Always clamped to fit the tile.
   */
  labelSize?: number;
  /** Optional secondary label rendered above the main label in a smaller font. */
  displayLabel?: string;
  /** Hex color for the display label (default `labelColor` or white). */
  displayLabelColor?: string;
  /** Click handler. When set, the slab becomes interactive and shows a pointer cursor. */
  onClick?: (event: MouseEvent) => void;
  /** Double-click handler. The slab becomes interactive (pointer cursor) when either onClick or onDoubleClick is set. */
  onDoubleClick?: (event: MouseEvent) => void;
}

/** Pattern for files that should render flat (e.g., lock files, generated files) */
export interface FlatPattern {
  /** Glob-like pattern or regex to match file paths */
  pattern: string | RegExp;
  /** Height to use for matched files (default: 0.5) */
  height?: number;
}

/** Default patterns for files that should render flat */
export const DEFAULT_FLAT_PATTERNS: FlatPattern[] = [
  { pattern: /package-lock\.json$/ },
  { pattern: /yarn\.lock$/ },
  { pattern: /pnpm-lock\.yaml$/ },
  { pattern: /composer\.lock$/ },
  { pattern: /Gemfile\.lock$/ },
  { pattern: /Cargo\.lock$/ },
  { pattern: /poetry\.lock$/ },
  { pattern: /\.lock$/ }, // Generic lock files
];

/**
 * Check if a file path matches any flat pattern.
 * Returns the matched pattern's height or undefined if no match.
 */
const DEFAULT_ANIMATION: AnimationConfig = {
  startFlat: false,
  autoStartDelay: 500,
  // growDuration is intentionally unset: by default the ripple is paced by
  // staggerDelay. Set growDuration on the `animation` prop to instead target a
  // fixed total time for the whole city to finish growing.
  staggerDelay: 15,
  tension: 120,
  friction: 14,
};












// District floor component

// Camera controller
interface FocusTarget {
  x: number;
  z: number;
  size: number; // Approximate size of the focused area (max of width/depth)
  width: number; // Footprint extent along X
  depth: number; // Footprint extent along Z
}

/**
 * Fractional insets describing the sub-rect of the canvas the flat city should
 * frame itself into — each value a fraction of the canvas dimension in [0, 1).
 * `{ left: 0.28, right: 0.3, bottom: 0.22 }` frames the city into the band that
 * excludes the left 28%, right 30%, and bottom 22% (e.g. under a panel's
 * overlays). The canvas is unchanged; only the framing math treats the inner
 * rect as the boundary. Omitted / all-zero = full canvas.
 */
export interface SafeArea {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface AnimatedCameraProps {
  citySize: number;
  /** City footprint extent along X (for viewport-aware rect framing). */
  cityWidth: number;
  /** City footprint extent along Z (for viewport-aware rect framing). */
  cityDepth: number;
  /** World-space center of the framed footprint. Defaults to the origin.
   *  Multi-city layouts whose combined bounds aren't centered at the origin
   *  pass the global center here so the overview frames the actual city. */
  cityCenter?: { x: number; z: number };
  /** Inset rect the flat overview frames into. See {@link SafeArea}. */
  safeArea?: SafeArea;
  isFlat: boolean;
  /** Whether the city has content to frame. The one-shot initial framing waits
   * for this so it never locks onto a degenerate (empty) citySize. */
  cityReady?: boolean;
  focusTarget?: FocusTarget | null;
  maxBuildingHeight?: number;
  cameraControls?: CameraControlsConfig;
}

// Camera rotation options
export interface RotateOptions {
  /** Animation duration in milliseconds. Default uses spring physics (~800ms feel). */
  duration?: number;
}

export type MouseDragAction = 'pan' | 'rotate' | 'zoom' | 'none';
export type TouchOneAction = 'pan' | 'rotate' | 'none';
export type TouchTwoAction = 'pan' | 'rotate' | 'dolly-pan' | 'dolly-rotate' | 'none';
export type WheelAction = 'zoom' | 'pan';

export interface CameraControlsConfig {
  /** Left mouse button drag. Default: 'pan' */
  leftDrag?: MouseDragAction;
  /** Right mouse button drag. Default: 'rotate' */
  rightDrag?: MouseDragAction;
  /** Middle mouse button drag. Default: 'zoom' */
  middleDrag?: MouseDragAction;
  /** Mouse wheel / two-finger trackpad scroll. Default: 'zoom'.
   *  When 'pan', ctrl/⌘+wheel still zooms (matches trackpad pinch). */
  wheel?: WheelAction;
  /** One-finger touch. Default: 'pan' */
  oneFingerTouch?: TouchOneAction;
  /** Two-finger touch. Default: 'dolly-pan' */
  twoFingerTouch?: TouchTwoAction;
  /** Pan speed multiplier. Default: 1 */
  panSpeed?: number;
  /** Rotate speed multiplier. Default: 1 */
  rotateSpeed?: number;
  /** Zoom speed multiplier. Default: 1 */
  zoomSpeed?: number;
  /** Closest the camera can get to its target (world units). Default: 10. */
  minDistance?: number;
  /** Farthest the camera can get from its target (world units). Default:
   *  `citySize * 3`. Override with a larger value when consumers need to
   *  zoom out beyond that — e.g. fitting the city into a small canvas
   *  sub-rect via `setCameraFlatView`. */
  maxDistance?: number;
}

export const DEFAULT_CAMERA_CONTROLS: Required<Omit<CameraControlsConfig, 'panSpeed' | 'rotateSpeed' | 'zoomSpeed' | 'minDistance' | 'maxDistance'>> & Pick<CameraControlsConfig, 'panSpeed' | 'rotateSpeed' | 'zoomSpeed' | 'minDistance' | 'maxDistance'> = {
  leftDrag: 'pan',
  rightDrag: 'rotate',
  middleDrag: 'zoom',
  wheel: 'pan',
  oneFingerTouch: 'pan',
  twoFingerTouch: 'dolly-pan',
};

function mouseAction(action: MouseDragAction): number | undefined {
  switch (action) {
    case 'pan': return THREE.MOUSE.PAN;
    case 'rotate': return THREE.MOUSE.ROTATE;
    case 'zoom': return THREE.MOUSE.DOLLY;
    case 'none': return undefined;
  }
}

function touchOneAction(action: TouchOneAction): number | undefined {
  switch (action) {
    case 'pan': return THREE.TOUCH.PAN;
    case 'rotate': return THREE.TOUCH.ROTATE;
    case 'none': return undefined;
  }
}

function touchTwoAction(action: TouchTwoAction): number | undefined {
  switch (action) {
    case 'pan': return THREE.TOUCH.PAN;
    case 'rotate': return THREE.TOUCH.ROTATE;
    case 'dolly-pan': return THREE.TOUCH.DOLLY_PAN;
    case 'dolly-rotate': return THREE.TOUCH.DOLLY_ROTATE;
    case 'none': return undefined;
  }
}

// Camera control API - populated by AnimatedCamera
interface CameraApi {
  reset: () => void;
  moveTo: (x: number, z: number, size?: number) => void;
  setFlatView: (x: number, z: number, height: number, options?: RotateOptions) => void;
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
 * Position the camera straight overhead a target at a specific height (flat
 * top-down view). Use to fit the city inside a sub-rect of the canvas — e.g.
 * when overlays cover part of the viewport. Larger `height` = city appears
 * smaller; smaller `height` = zoomed in.
 */
export function setCameraFlatView(
  x: number,
  z: number,
  height: number,
  options?: RotateOptions,
) {
  cameraApi?.setFlatView(x, z, height, options);
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


/**
 * Bridge for piping the live camera + canvas size out of the R3F Canvas on
 * every frame. Mounted as a child of `<Canvas>` so it has access to the R3F
 * render loop; runs zero work if no callback is provided.
 */
function CameraFrameBridge({ onCameraFrame }: { onCameraFrame?: OnCameraFrame }) {
  const { camera, size } = useThree();
  useFrame(() => {
    onCameraFrame?.(camera, { width: size.width, height: size.height });
  });
  return null;
}

const AnimatedCamera = React.memo(function AnimatedCamera({
  citySize,
  cityWidth,
  cityDepth,
  cityCenter,
  safeArea,
  isFlat,
  cityReady = true,
  focusTarget,
  maxBuildingHeight = 0,
  cameraControls,
  onCameraReady,
}: AnimatedCameraProps & { onCameraReady?: () => void }) {
  // Use selector to only subscribe to camera, not the entire R3F state
  // This prevents re-renders on pointer movement
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  // On-demand kick: AnimatedCamera re-renders on exactly the reframe triggers
  // (isFlat, focusTarget, viewport/aspect, cameraControls, citySize). Requesting
  // one frame per commit lets the per-frame owner run and START easing to the new
  // pose; the owner then self-sustains via invalidate() below until it settles.
  useEffect(() => {
    invalidate();
  });
  // Subscribe to the measured canvas size so the flat overview re-frames when the
  // viewport aspect changes (resize, or the first real measurement landing after
  // the one-shot). Only changes on resize, so it doesn't cause pointer-move churn.
  const viewportSize = useThree((state) => state.size);
  const controlsConfig = useMemo(
    () => ({ ...DEFAULT_CAMERA_CONTROLS, ...cameraControls }),
    [cameraControls],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  // Frame-loop drive gate. True only while a deliberate camera move (focus,
  // 2D<->3D, exported moves) is in flight; set/cleared by `driveCameraTo`. While
  // false the per-frame handler leaves the camera to MapControls. react-spring's
  // deferred mount animation toward the seed never flips this, so it can't drag
  // the camera to the stale seed height.
  const isAnimatingRef = useRef(false);
  // True only while the user is mid-gesture on MapControls (between onStart and
  // onEnd). The grown-3D hold owner stands down during the gesture so MapControls
  // can move freely, then re-asserts the captured pose once the gesture ends.
  const draggingRef = useRef(false);
  // Last user-posed grown-3D camera pose, captured on every MapControls change.
  // The hold owner re-applies this each frame so the re-applied camera seed (and
  // MapControls residual) can't snap a rotated/zoomed 3D view back to the seed.
  const held3DPoseRef = useRef<{
    camX: number;
    camY: number;
    camZ: number;
    lookX: number;
    lookY: number;
    lookZ: number;
  } | null>(null);
  const isOrbitingRef = useRef(false);
  const hasAppliedInitial = useRef(false);
  const frameCount = useRef(0);
  const hasNotifiedReady = useRef(false);
  const prevIsFlatRef = useRef(isFlat); // Track previous isFlat to detect actual state changes
  // Always-latest mirrors of isFlat/focusTarget. The resize re-frame effect reads
  // these but must NOT fire when they change — focus and 2D<->3D have their own
  // easing effects, and re-triggering the snap-based resize effect on those
  // changes would override the ease with an instant jump (the "camera snaps
  // instead of moving" bug). Refs let resize read the current values without
  // listing them as dependencies.
  const isFlatRef = useRef(isFlat);
  isFlatRef.current = isFlat;
  const focusTargetRef = useRef(focusTarget);
  focusTargetRef.current = focusTarget;
  // Always-latest safe-area insets, read by the per-frame flat owner.
  const safeAreaRef = useRef(safeArea);
  safeAreaRef.current = safeArea;
  // True while the user is actively dragging/zooming via MapControls. The
  // per-frame flat owner stands down so the user can move freely; it re-engages
  // on the next reframe trigger (safeArea / viewport / footprint change), which
  // resets this below.
  const userInteractingRef = useRef(false);
  // Imperative flat-pose override. `setFlatView` / `setTarget` set this so the
  // single owner eases to a host-supplied pose instead of `computeFlatPose`'s
  // safeArea framing — that's how the imperative API stays effective without a
  // second writer competing with the owner. Cleared on an explicit safeArea
  // change (declarative path takes back over) and by `resetToInitial`.
  const flatOverrideRef = useRef<{
    camX: number;
    camY: number;
    camZ: number;
    lookX: number;
    lookY: number;
    lookZ: number;
  } | null>(null);

  // The authoritative viewport aspect. Prefer R3F's measured canvas size
  // (`viewportSize`) — it's the source of truth that `perspCam.aspect` is derived
  // from, and it updates reactively (so the resize effect below re-frames when it
  // lands). Reading `perspCam.aspect` directly was the root of the "overview
  // sometimes fits width, sometimes height on reload" bug: R3F sets it in an
  // effect a beat after measurement, so the one-shot often captured the default 1.
  const getViewportAspect = useCallback(() => {
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      return viewportSize.width / viewportSize.height;
    }
    const el = gl.domElement;
    if (el && el.clientWidth > 0 && el.clientHeight > 0) {
      return el.clientWidth / el.clientHeight;
    }
    const perspCam = camera as THREE.PerspectiveCamera;
    return perspCam.aspect || 1;
  }, [viewportSize, gl, camera]);

  // World-space center of the framed footprint (origin for single cities).
  const cityCenterRef = useRef(cityCenter ?? { x: 0, z: 0 });
  cityCenterRef.current = cityCenter ?? { x: 0, z: 0 };

  // Flat (top-down) camera height that fits a footprint rectangle (width x depth)
  // into the viewport rectangle for the given aspect. Depth fills the vertical
  // FOV; width fills the horizontal FOV; whichever needs more height wins, so the
  // whole footprint is always visible. This replaces the old
  // `max(width,depth) / (2*tan * min(1,aspect))` form, which framed against a
  // single dimension and flipped fit-to-width vs fit-to-height at aspect === 1.
  const fitFlatHeight = useCallback((width: number, depth: number, aspect: number) => {
    const fovRad = (50 * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const safeAspect = aspect > 0 ? aspect : 1;
    const heightForDepth = depth / (2 * tanHalfFov);
    const heightForWidth = width / (2 * tanHalfFov * safeAspect);
    const paddingFactor = 1.08; // ~8% breathing room, matches 2D component
    return Math.max(heightForDepth, heightForWidth) * paddingFactor;
  }, []);

  // Calculate flat camera height for the whole-city overview at a given aspect.
  const calculateFlatCameraHeight = useCallback(
    (aspect: number) => fitFlatHeight(cityWidth, cityDepth, aspect),
    [fitFlatHeight, cityWidth, cityDepth],
  );

  // ===========================================================================
  // SINGLE SOURCE OF TRUTH for flat (2D) framing.
  //
  // Pure function of (footprint, viewport, safeArea): the camera pose that fits
  // the city into the safe-area inner rect and pans the city center to that
  // rect's center. Everything flat derives from this — the one-shot, the seed,
  // and the per-frame flat owner — so there is exactly one framing authority and
  // nothing competes. With no safeArea it is the full-canvas overview.
  // ===========================================================================
  const computeFlatPose = useCallback(
    (sa?: SafeArea, footprint?: { width: number; depth: number; centerX: number; centerZ: number }) => {
      const aspect = getViewportAspect();
      // Default to the whole-city footprint centered at the origin; a focused
      // directory passes its own footprint + center so the same safe-area math
      // frames the directory into the inner rect instead of the full city.
      const fpWidth = footprint?.width ?? cityWidth;
      const fpDepth = footprint?.depth ?? cityDepth;
      const cx = footprint?.centerX ?? cityCenterRef.current.x;
      const cz = footprint?.centerZ ?? cityCenterRef.current.z;
      const clamp01 = (n: number | undefined) => Math.min(0.9, Math.max(0, n ?? 0));
      const l = clamp01(sa?.left);
      const r = clamp01(sa?.right);
      const t = clamp01(sa?.top);
      const b = clamp01(sa?.bottom);
      const fracW = Math.max(0.05, 1 - l - r);
      const fracH = Math.max(0.05, 1 - t - b);
      // Inflate the footprint by the inset fractions so fitFlatHeight frames it
      // into the inner rect rather than the full canvas.
      const height = fitFlatHeight(fpWidth / fracW, fpDepth / fracH, aspect);
      const w = viewportSize.width;
      const h = viewportSize.height;
      let targetX = cx;
      let targetZ = cz;
      if (w && h && (l || r || t || b)) {
        // Pan so the footprint center lands at the inner-rect center. The camera
        // target projects to canvas center; world-per-px is uniform top-down.
        const tanHalfFov = Math.tan((50 * Math.PI) / 180 / 2);
        const worldPerPx = (2 * height * tanHalfFov) / h;
        const visibleCenterX = (l * w + (w - r * w)) / 2;
        const visibleCenterY = (t * h + (h - b * h)) / 2;
        targetX = cx + (w / 2 - visibleCenterX) * worldPerPx;
        targetZ = cz + (h / 2 - visibleCenterY) * worldPerPx;
      }
      return {
        camX: targetX,
        camY: height,
        camZ: targetZ + 0.001, // tiny offset to avoid gimbal lock looking straight down
        lookX: targetX,
        lookY: 0,
        lookZ: targetZ,
      };
    },
    [getViewportAspect, fitFlatHeight, cityWidth, cityDepth, viewportSize.width, viewportSize.height],
  );

  // ===========================================================================
  // safeArea-aware 3D (grown) overview framing — the angled analog of
  // computeFlatPose. Two moves, mirroring the flat authority:
  //
  //   1. FIT — pull the rig back so the grown city SHRINKS to fit the safe-area
  //      inner rect, not just nudge. The camera height that fits a footprint
  //      scales linearly with the footprint, so the ratio of inset-fit to base-fit
  //      (the same fracW/fracH inflation computeFlatPose uses) is the distance
  //      multiplier. camY and camZ scale together, so the tilt/angle is preserved.
  //   2. PAN — slide the whole rig (camera AND look-at by the same world offset)
  //      so the city center lands at the inner-rect center instead of canvas center.
  //
  // With no insets fitScale is 1 and the pan is 0, so it returns the original
  // origin-centered overview and unframed consumers see no change.
  //
  // Horizontal (X) centering is exact: world X is parallel to the screen at this
  // azimuth. Vertical centering is first-order: a screen-vertical shift maps to a
  // world-Z move foreshortened by the camera tilt, so the Z pan is divided by
  // sin(tilt). Enough to seat the city in the inner rect; not the pixel-exact fit
  // the top-down path gets.
  // ===========================================================================
  const compute3DPose = useCallback(
    (sa?: SafeArea, footprint?: { centerX: number; centerZ: number }) => {
      const cx = footprint?.centerX ?? cityCenterRef.current.x;
      const cz = footprint?.centerZ ?? cityCenterRef.current.z;
      const baseCamY =
        maxBuildingHeight > 0 ? Math.max(citySize * 1.1, maxBuildingHeight * 2.5) : citySize * 1.1;
      const baseCamZ = citySize * 1.3; // camera sits this far behind the look-at on +Z
      const w = viewportSize.width;
      const h = viewportSize.height;
      const clamp01 = (n: number | undefined) => Math.min(0.9, Math.max(0, n ?? 0));
      const l = clamp01(sa?.left);
      const r = clamp01(sa?.right);
      const t = clamp01(sa?.top);
      const b = clamp01(sa?.bottom);
      const hasInset = !!(w && h && (l || r || t || b));
      const aspect = getViewportAspect();

      // FIT: distance multiplier = inset-fit height / base-fit height. The padding
      // factor in fitFlatHeight cancels in the ratio.
      const fracW = Math.max(0.05, 1 - l - r);
      const fracH = Math.max(0.05, 1 - t - b);
      const fitScale = hasInset
        ? fitFlatHeight(cityWidth / fracW, cityDepth / fracH, aspect) /
          Math.max(1e-6, fitFlatHeight(cityWidth, cityDepth, aspect))
        : 1;
      const camY = baseCamY * fitScale;
      const camZ = baseCamZ * fitScale;

      // PAN: convert the inner-rect-center pixel offset to a world shift at the
      // (scaled) look-at distance.
      let targetX = cx;
      let targetZ = cz;
      if (hasInset) {
        const tanHalfFov = Math.tan((50 * Math.PI) / 180 / 2);
        const dist = Math.hypot(camY, camZ);
        const sinTilt = dist > 0 ? camY / dist : 1;
        const worldPerPxX = (2 * dist * tanHalfFov * aspect) / w;
        const worldPerPxY = (2 * dist * tanHalfFov) / h;
        const visibleCenterX = (l * w + (w - r * w)) / 2;
        const visibleCenterY = (t * h + (h - b * h)) / 2;
        // X is parallel to the screen; Z is foreshortened by the tilt, so divide
        // it back out.
        targetX = cx + (w / 2 - visibleCenterX) * worldPerPxX;
        targetZ = cz + ((h / 2 - visibleCenterY) * worldPerPxY) / Math.max(0.2, sinTilt);
      }
      return {
        camX: targetX,
        camY,
        camZ: targetZ + camZ,
        lookX: targetX,
        lookY: 0,
        lookZ: targetZ,
      };
    },
    [getViewportAspect, fitFlatHeight, cityWidth, cityDepth, citySize, maxBuildingHeight, viewportSize.width, viewportSize.height],
  );

  // Calculate initial 2D position (component always starts in 2D mode). Derives
  // from the single flat-framing authority above (reads latest safeArea via ref).
  const getInitial2DPosition = useCallback(() => {
    const p = computeFlatPose(safeAreaRef.current);
    return {
      x: p.camX,
      y: p.camY,
      z: p.camZ,
      targetX: p.lookX,
      targetY: p.lookY,
      targetZ: p.lookZ,
    };
  }, [computeFlatPose]);

  // Spring animation for camera movement
  // Initialize with correct 2D position from the start
  const [{ camX, camY, camZ, lookX, lookY, lookZ }, api] = useSpring(() => {
    // Seed from the REAL measured aspect, not a hardcoded 1. react-spring runs a
    // deferred mount animation toward whatever this seed is, and that mount
    // animation always processes after the one-shot — so a hardcoded-aspect seed
    // (329) becomes the spring's standing goal and pulls the camera back down on
    // every remount/resize. Seeding from `getViewportAspect()` (which reads the
    // canvas size that exists from the first frame) makes the standing goal the
    // correct height, so the mount animation is a no-op instead of a regression.
    const initialHeight = calculateFlatCameraHeight(getViewportAspect());

    return {
      camX: 0,
      camY: initialHeight,
      camZ: 0.001,
      lookX: 0,
      lookY: 0,
      lookZ: 0,
      config: { tension: 60, friction: 20 },
      // No onStart/onRest here on purpose. The frame-loop drive gate
      // (`isAnimatingRef`) is owned by `driveCameraTo` below — set synchronously
      // when we issue a move, cleared when that move's promise resolves. Driving
      // the gate from react-spring's async onStart was racy: an `api.set`
      // (resync/snap) settling the spring fired onRest and cleared the gate
      // *after* the effect opened it, so the next onStart saw it closed and the
      // camera never moved (the "focus change freezes" bug).
    };
  });

  // Issue a deliberate camera move and own the frame-loop drive gate directly.
  // Setting `isAnimatingRef` synchronously here (rather than from the spring's
  // async onStart) removes the api.set/onStart race entirely. A monotonic token
  // ensures only the most recent move clears the gate — so rapid step changes
  // that interrupt each other (their promises resolving `finished:false`) can't
  // switch driving off while a newer move is still running.
  const cameraMoveToken = useRef(0);
  const driveCameraTo = useCallback(
    (to: Record<string, unknown>) => {
      if (!hasAppliedInitial.current) return; // one-shot owns the first framing
      // Resync the spring's stored value to the live camera first. MapControls
      // (drag/wheel) and the api.set snap paths move the camera without touching
      // the spring, so its stored value can drift; without this, a target equal
      // to the stale stored value would be a no-op and leave the visible camera
      // stranded. Safe now that onRest no longer owns the drive gate.
      if (controlsRef.current) {
        api.set({
          camX: camera.position.x,
          camY: camera.position.y,
          camZ: camera.position.z,
          lookX: controlsRef.current.target.x,
          lookY: controlsRef.current.target.y,
          lookZ: controlsRef.current.target.z,
        });
      }
      isAnimatingRef.current = true;
      invalidate(); // on-demand kick: start rendering the spring move
      const token = ++cameraMoveToken.current;
      const results = api.start(to as Parameters<typeof api.start>[0]);
      const promises = (Array.isArray(results) ? results : [results]) as Promise<
        { finished?: boolean } | undefined
      >[];
      Promise.all(promises).then((settled) => {
        // Only release the gate when the move actually RAN TO COMPLETION. An
        // `api.set` from the overview-correction effects (citySize / resize)
        // interrupts the spring and resolves these promises with
        // `finished:false`; clearing on that would freeze the camera partway
        // ("moves a little then stops"). A genuinely superseding move bumps the
        // token, so the stale `.then` is filtered out by the token check below.
        const finished = settled.every((r) => r?.finished !== false);
        if (cameraMoveToken.current === token && finished)
          isAnimatingRef.current = false;
      });
    },
    [api, camera, invalidate],
  );

  // Separate spring for orbit angle animation (animates along horizontal arc)
  const [{ orbitAngle }] = useSpring(() => ({
    orbitAngle: 0,
    config: { tension: 80, friction: 18 },
    onStart: () => {
      isOrbitingRef.current = true;
      invalidate(); // on-demand kick: start rendering the orbit
      // Claim the camera like a manual drag: a programmatic orbit chooses a
      // heading the grown-3D owner doesn't (the owner pins the framed azimuth),
      // so without this the owner eases the rotation straight back when the orbit
      // settles. Holds until the next reframe trigger re-engages the owner.
      userInteractingRef.current = true;
    },
    onRest: () => {
      isOrbitingRef.current = false;
    },
  }));

  // Separate spring for tilt angle animation (animates along vertical arc)
  const isTiltingRef = useRef(false);
  const [{ tiltAngle }] = useSpring(() => ({
    tiltAngle: 0,
    config: { tension: 80, friction: 18 },
    onStart: () => {
      isTiltingRef.current = true;
      invalidate(); // on-demand kick: start rendering the tilt
      // Same as orbit: a chosen tilt is the user's, so stand the owner down.
      userInteractingRef.current = true;
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

  // When isFlat changes from true to false, animate to 3D view
  // Component always starts in 2D, so we only animate the 2D→3D transition
  useEffect(() => {
    if (!hasAppliedInitial.current) return;

    const isFlatChanged = prevIsFlatRef.current !== isFlat;
    if (!isFlatChanged) return;

    prevIsFlatRef.current = isFlat;

    // Calculate target position for 3D view. The grown overview frames through
    // compute3DPose so it lands in the safe-area inner rect, not the full canvas.
    const overview3D = compute3DPose(safeAreaRef.current);
    const newPos = isFlat
      ? getInitial2DPosition() // Going back to 2D
      : focusTarget
      ? {
          x: focusTarget.x,
          y: Math.max(focusTarget.size * 1.5, 40),
          z: focusTarget.z + Math.max(focusTarget.size * 2, 50),
          targetX: focusTarget.x,
          targetY: 0,
          targetZ: focusTarget.z,
        }
      : {
          x: overview3D.camX,
          y: overview3D.camY,
          z: overview3D.camZ,
          targetX: overview3D.lookX,
          targetY: overview3D.lookY,
          targetZ: overview3D.lookZ,
        };

    driveCameraTo({
      camX: newPos.x,
      camY: newPos.y,
      camZ: newPos.z,
      lookX: newPos.targetX,
      lookY: newPos.targetY,
      lookZ: newPos.targetZ,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlat]); // Only animate when isFlat changes, not when focusTarget/citySize/etc change

  // Animate the camera when focusTarget changes (works in both 2D and 3D).
  // - 3D + target:  frame the directory using the same math as the 2D→3D path
  // - 3D + null:    ease back to the overview position
  // - 2D + target:  pan top-down camera over the directory and zoom to fit it
  // - 2D + null:    return to the centered top-down overview
  useEffect(() => {
    if (!hasAppliedInitial.current) return;

    let newPos: {
      x: number;
      y: number;
      z: number;
      targetX: number;
      targetY: number;
      targetZ: number;
    };

    // FLAT mode: the per-frame owner is the single writer. Feed it an imperative
    // pose via flatOverrideRef (the focused footprint, or null to fall back to the
    // safeArea overview) and let it ease there and HOLD it. Routing flat focus
    // through the spring (driveCameraTo) let the useSpring seed's standing OVERVIEW
    // goal re-assert and drag the camera back out ("eases in, then fills the whole
    // view"). The owner runs every frame and overrides the spring, so the seed
    // can't win. This mirrors how setCameraFlatView frames a sub-rect.
    if (isFlat) {
      if (focusTarget) {
        // Same rect-fit as the overview, framing the focused directory's
        // footprint through the safe-area authority, so the directory lands in the
        // inner rect (clear of overlay insets) rather than dead center.
        flatOverrideRef.current = computeFlatPose(safeAreaRef.current, {
          width: focusTarget.width,
          depth: focusTarget.depth,
          centerX: focusTarget.x,
          centerZ: focusTarget.z,
        });
      } else {
        // Unfocus: drop the override so the owner returns to the safeArea overview.
        flatOverrideRef.current = null;
      }
      userInteractingRef.current = false;
      return;
    }

    // 3D mode: animate via the spring (the owner only runs while flat). The
    // unfocused overview frames through compute3DPose so it lands in the
    // safe-area inner rect rather than the full canvas.
    if (focusTarget) {
      newPos = {
        x: focusTarget.x,
        y: Math.max(focusTarget.size * 1.5, 40),
        z: focusTarget.z + Math.max(focusTarget.size * 2, 50),
        targetX: focusTarget.x,
        targetY: 0,
        targetZ: focusTarget.z,
      };
    } else {
      const p = compute3DPose(safeAreaRef.current);
      newPos = {
        x: p.camX,
        y: p.camY,
        z: p.camZ,
        targetX: p.lookX,
        targetY: p.lookY,
        targetZ: p.lookZ,
      };
    }

    driveCameraTo({
      camX: newPos.x,
      camY: newPos.y,
      camZ: newPos.z,
      lookX: newPos.targetX,
      lookY: newPos.targetY,
      lookZ: newPos.targetZ,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, isFlat]);

  // Re-engage the per-frame flat owner on any reframe trigger. While the user is
  // dragging (userInteractingRef, set by MapControls `onStart`) the owner stands
  // down so they can move freely; a change to the safe area, viewport, or city
  // footprint means "reframe", so clearing the flag lets the owner ease to the
  // new pose. The snap-based citySize/resize correctors are GONE — the single
  // owner in the frame loop below reads these inputs live and maintains the
  // framing, so there is no second writer to fight (the whole "eases to the right
  // place then fills the view" / "reverts to full on hover" class of bugs).
  useEffect(() => {
    userInteractingRef.current = false;
  }, [viewportSize.width, viewportSize.height, cityWidth, cityDepth]);

  // An explicit safeArea change is the declarative path asserting itself: drop
  // any imperative setFlatView/setTarget override so the owner frames from
  // safeArea, and re-engage after interaction. EXCEPT when a focusDirectory is
  // active — that's a declarative focus that must survive the reframe, so
  // re-derive its pose into the NEW safeArea (the same rect-fit the focus
  // effect uses) rather than reverting to the full-city overview. Without this,
  // anything that shrinks the map viewport (e.g. opening the file-tree side
  // panel) changes safeArea, drops the override, and the city rezooms back out
  // to the whole skyline.
  useEffect(() => {
    const focus = focusTargetRef.current;
    if (isFlatRef.current && focus) {
      flatOverrideRef.current = computeFlatPose(safeAreaRef.current, {
        width: focus.width,
        depth: focus.depth,
        centerX: focus.x,
        centerZ: focus.z,
      });
    } else {
      flatOverrideRef.current = null;
    }
    userInteractingRef.current = false;
  }, [safeArea?.top, safeArea?.bottom, safeArea?.left, safeArea?.right]);

  // When cityData changes (new cityWidth/cityDepth), reset the one-shot guard so
  // the useFrame block re-fires the initial framing. Without this, switching repos
  // while FileCity3D stays mounted would lerp from the old camera position to the
  // new one via the flat owner (~660ms visible animation) instead of snapping
  // instantly. Resetting hasNotifiedReady lets onCameraReady fire again so the
  // host can re-hide visibility until the new frame lands.
  useEffect(() => {
    hasAppliedInitial.current = false;
    hasNotifiedReady.current = false;
  }, [cityWidth, cityDepth]);

  // No 3D-specific reframe effect: the grown overview owner in the frame loop
  // reads safeArea/viewport/footprint LIVE every frame, and the resize/safeArea
  // effects above already drop userInteractingRef so the owner re-engages after
  // interaction. Adding a driveCameraTo here would be a second writer competing
  // with the owner — the exact bug class the single-owner design removes.

  // Update camera each frame
  useFrame((_state, delta) => {
    frameCount.current++;

    // One-shot initial 2D framing. Component always starts in 2D mode, so we
    // set the correct top-down position once — but on the first frame where the
    // city is actually framable (has content) AND the controls ref is attached,
    // not literally frame 1. Firing only on frame 1 meant that if the city
    // bounds weren't populated yet (or MapControls hadn't mounted), the camera
    // locked onto a degenerate `citySize` — a tiny height that reads as "zoomed
    // in at the origin" — and never recovered. Retrying until ready frames the
    // overview correctly on the first paintable frame, with no wrong-camera flash.
    if (!hasAppliedInitial.current) {
      if (!cityReady || !controlsRef.current) {
        invalidate(); // keep polling frames until the city is framable
        return;
      }
      // Also wait until the canvas has a real measured size. Framing before the
      // measurement lands would compute the flat height from the default aspect
      // (1) and freeze it — the "fits height instead of width in a portrait
      // viewport" bug. The resize effect above is a safety net, but gating here
      // frames correctly on the first visible frame with no snap.
      const measured = viewportSize.width > 0 && viewportSize.height > 0;
      const domMeasured =
        gl.domElement && gl.domElement.clientWidth > 0 && gl.domElement.clientHeight > 0;
      if (!measured && !domMeasured) {
        invalidate(); // keep polling frames until the canvas is measured
        return;
      }

      // Ensure camera FOV is correct (defaults to 75 before prop applies)
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.fov !== 50) {
        perspCam.fov = 50;
        perspCam.updateProjectionMatrix();
      }

      // Calculate initial 2D position with correct aspect ratio
      const initialPos = getInitial2DPosition();

      camera.position.set(initialPos.x, initialPos.y, initialPos.z);
      controlsRef.current.target.set(initialPos.targetX, initialPos.targetY, initialPos.targetZ);
      controlsRef.current.update();

      // Pin the spring to the framed position. Use `api.set` (not
      // `api.start({ immediate: true })`): set updates the spring's GOAL and
      // cancels any pending animation, whereas the immediate-start only jumped
      // the displayed value — leaving the goal at the `useSpring` seed (the
      // aspect=1 height) so react-spring's deferred initial animation eased the
      // camera right back down to it.
      api.set({
        camX: initialPos.x,
        camY: initialPos.y,
        camZ: initialPos.z,
        lookX: initialPos.targetX,
        lookY: initialPos.targetY,
        lookZ: initialPos.targetZ,
      });

      hasAppliedInitial.current = true;

      // Notify parent that camera is ready
      if (!hasNotifiedReady.current && onCameraReady) {
        hasNotifiedReady.current = true;
        onCameraReady();
      }
      invalidate(); // let the per-frame owner engage on the next frame
      return;
    }

    // Wait for controls before driving the camera.
    if (!controlsRef.current) return;

    // On-demand drive gate: this frame requests another only while the camera is
    // actually moving (orbit/tilt/spring active, or an owner still easing to its
    // pose). Once every lerp snaps to target, needsFrame stays false and demand
    // mode goes quiet — no per-frame writer churning while the view is at rest.
    let needsFrame = false;


    // Handle orbit animation (horizontal rotation along arc)
    if (isOrbitingRef.current && orbitParamsRef.current) {
      needsFrame = true; // spring-driven; runs until orbitApi's onRest clears the ref
      const { centerX, centerZ, distance, height } = orbitParamsRef.current;
      const currentAngle = orbitAngle.get();
      const radians = (currentAngle * Math.PI) / 180;

      const newX = centerX + Math.sin(radians) * distance;
      const newZ = centerZ + Math.cos(radians) * distance;

      camera.position.set(newX, height, newZ);
      controlsRef.current.target.set(centerX, 0, centerZ);
      controlsRef.current.update();

      // Sync position spring + the held pose to the current orbit position, so the
      // 3D hold owner re-asserts the rotated pose once the orbit settles.
      const orbitPose = { camX: newX, camY: height, camZ: newZ, lookX: centerX, lookY: 0, lookZ: centerZ };
      api.set(orbitPose);
      held3DPoseRef.current = orbitPose;
    }
    // Handle tilt animation (vertical rotation along arc)
    else if (isTiltingRef.current && tiltParamsRef.current) {
      needsFrame = true; // spring-driven; runs until tiltApi's onRest clears the ref
      const { centerX, centerY, centerZ, distance, azimuthAngle } = tiltParamsRef.current;
      const currentTilt = tiltAngle.get();

      // Convert tilt angle to polar angle (0° tilt = looking down, 90° tilt = level)
      // Clamp to avoid extreme angles
      const clampedTilt = Math.max(0, Math.min(85, currentTilt));
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

      // Sync position spring + held pose to the current tilt position, so the 3D
      // hold owner re-asserts the tilted pose once the tilt settles.
      const tiltPose = { camX: newX, camY: newY, camZ: newZ, lookX: centerX, lookY: centerY, lookZ: centerZ };
      api.set(tiltPose);
      held3DPoseRef.current = tiltPose;
    }
    // Handle position animation (spring-driven 2D<->3D / focus / imperative moves)
    // THE flat-framing owner. In flat mode this is the SINGLE writer of the
    // camera, and it takes PRIORITY over the spring branch below — so a stale
    // `isAnimatingRef` (a deliberate move whose promise never resolved) can't
    // starve it and leave an imperative `setFlatView` override unapplied (the
    // "panel stays full" bug). The spring branch only drives NON-flat moves
    // (2D<->3D / focus transitions), where `isFlat` is false. The owner eases
    // toward the one pose `computeFlatPose` defines; runs after React commit (so
    // it overrides drei re-applying the seed); reads inputs live (absorbing
    // resize / citySize / safeArea with no separate corrector); and stands down
    // while the user is interacting so MapControls owns the camera.
    else if (isFlat && !userInteractingRef.current) {
      // Source of the target pose: an imperative override (setFlatView / setTarget,
      // OR a flat focus on a directory) wins; otherwise the declarative safeArea
      // framing.
      const pose = flatOverrideRef.current ?? computeFlatPose(safeAreaRef.current);
      // Make sure the controls/projection can actually REACH this pose. A deep
      // inset (small visible band) demands a tall camera; an imperative override
      // isn't reactive in the maxDistance/far props, so without this the camera
      // clamps short — "stops shrinking before it fits." Bump per-frame; drei
      // resets the props on render and we re-bump after commit.
      const reach = pose.camY * 1.25;
      if (controlsRef.current.maxDistance < reach) controlsRef.current.maxDistance = reach;
      const perspCam = camera as THREE.PerspectiveCamera;
      if (perspCam.far < reach * 1.5) {
        perspCam.far = reach * 1.5;
        perspCam.updateProjectionMatrix();
      }
      // Exponential smoothing — frame-rate independent. Snap the last fraction
      // so it settles cleanly instead of asymptoting forever.
      const a = 1 - Math.exp(-7 * delta);
      const lerp = (cur: number, to: number) => {
        if (Math.abs(to - cur) < 0.01) return to;
        needsFrame = true; // still easing — request another frame
        return cur + (to - cur) * a;
      };
      // Lerp the look-at target and the height, then place the camera STRICTLY
      // above the (interpolated) target. Lerping camera.position and target
      // independently lets the horizontal offset between them be briefly nonzero
      // mid-ease, so OrbitControls reads a drifting azimuth — the "rotate a
      // little clockwise then fix" wobble. Deriving the camera from the target
      // pins the azimuth to 0 (top-down) for the whole transition.
      const tx = lerp(controlsRef.current.target.x, pose.lookX);
      const ty = lerp(controlsRef.current.target.y, pose.lookY);
      const tz = lerp(controlsRef.current.target.z, pose.lookZ);
      const camHeight = lerp(camera.position.y, pose.camY);
      controlsRef.current.target.set(tx, ty, tz);
      camera.position.set(tx, camHeight, tz + 0.001);
      controlsRef.current.update();
      // Keep the spring's stored value in step so a later spring-driven move
      // (2D->3D, focus) starts from the true current pose, not a stale one.
      api.set({
        camX: camera.position.x,
        camY: camera.position.y,
        camZ: camera.position.z,
        lookX: controlsRef.current.target.x,
        lookY: controlsRef.current.target.y,
        lookZ: controlsRef.current.target.z,
      });
    }
    // THE grown (3D) owner — the angled analog of the flat owner above. It NEVER
    // fully stands down in 3D (except during an active MapControls gesture), so
    // there is always a per-frame writer defeating drei re-applying the camera
    // seed and any MapControls residual — the second-writers that yank a 3D view
    // back to the seed ("starts to move, then snaps back"). Two modes:
    //   HOLD  (user has posed it): re-assert their captured pose every frame, so a
    //         rotate/tilt/zoom/pan sticks instead of being clobbered to the seed.
    //   FRAME (declarative): ease toward compute3DPose(safeArea) and keep it.
    // Stands down only mid-gesture (draggingRef) so MapControls can move freely,
    // and during a focus (the close-up is spring-driven below).
    else if (!isFlat && !draggingRef.current && !focusTargetRef.current) {
      if (userInteractingRef.current) {
        const h = held3DPoseRef.current;
        if (h) {
          // Ease toward the held pose (so a rotate/tilt animates smoothly) and
          // hold it. Ease the look-at AND the rig offset so the camera is always
          // derived from target + offset — no independent drift, no yaw wobble.
          // When already at held, lerp snaps to it, so this still defeats the seed
          // every frame like a hard re-assert.
          const a = 1 - Math.exp(-7 * delta);
          const lerp = (cur: number, to: number) => {
            if (Math.abs(to - cur) < 0.01) return to;
            needsFrame = true; // still easing toward the held pose
            return cur + (to - cur) * a;
          };
          const tx = lerp(controlsRef.current.target.x, h.lookX);
          const ty = lerp(controlsRef.current.target.y, h.lookY);
          const tz = lerp(controlsRef.current.target.z, h.lookZ);
          const ox = lerp(camera.position.x - controlsRef.current.target.x, h.camX - h.lookX);
          const oy = lerp(camera.position.y - controlsRef.current.target.y, h.camY - h.lookY);
          const oz = lerp(camera.position.z - controlsRef.current.target.z, h.camZ - h.lookZ);
          controlsRef.current.target.set(tx, ty, tz);
          camera.position.set(tx + ox, ty + oy, tz + oz);
          controlsRef.current.update();
        }
      } else {
        const pose = compute3DPose(safeAreaRef.current);
        // Reach: the inset fit pulls the rig back, so make sure the controls/
        // projection can get there (drei resets these on render; re-bump after).
        const reach =
          Math.hypot(pose.camX - pose.lookX, pose.camY - pose.lookY, pose.camZ - pose.lookZ) * 1.25;
        if (controlsRef.current.maxDistance < reach) controlsRef.current.maxDistance = reach;
        const perspCam = camera as THREE.PerspectiveCamera;
        if (perspCam.far < reach * 1.5) {
          perspCam.far = reach * 1.5;
          perspCam.updateProjectionMatrix();
        }
        const a = 1 - Math.exp(-7 * delta);
        const lerp = (cur: number, to: number) => {
          if (Math.abs(to - cur) < 0.01) return to;
          needsFrame = true; // still easing toward the framed 3D pose
          return cur + (to - cur) * a;
        };
        // Ease the look-at AND the rig offset (camera relative to target). Deriving
        // the camera from target + offset — rather than lerping its absolute
        // position independently — pins the azimuth, so the tilt eases in without a
        // yaw wobble (the same reasoning as the flat owner's strictly-above trick).
        const tx = lerp(controlsRef.current.target.x, pose.lookX);
        const ty = lerp(controlsRef.current.target.y, pose.lookY);
        const tz = lerp(controlsRef.current.target.z, pose.lookZ);
        const ox = lerp(camera.position.x - controlsRef.current.target.x, pose.camX - pose.lookX);
        const oy = lerp(camera.position.y - controlsRef.current.target.y, pose.camY - pose.lookY);
        const oz = lerp(camera.position.z - controlsRef.current.target.z, pose.camZ - pose.lookZ);
        controlsRef.current.target.set(tx, ty, tz);
        camera.position.set(tx + ox, ty + oy, tz + oz);
        controlsRef.current.update();
        // Seed the held pose from the framed pose, so a later takeover holds from
        // here, and keep the spring's stored value in step for a focus / 3D->2D move.
        held3DPoseRef.current = {
          camX: camera.position.x,
          camY: camera.position.y,
          camZ: camera.position.z,
          lookX: controlsRef.current.target.x,
          lookY: controlsRef.current.target.y,
          lookZ: controlsRef.current.target.z,
        };
        api.set({
          camX: camera.position.x,
          camY: camera.position.y,
          camZ: camera.position.z,
          lookX: controlsRef.current.target.x,
          lookY: controlsRef.current.target.y,
          lookZ: controlsRef.current.target.z,
        });
      }
    }
    // Spring-driven non-flat moves: 3D focus close-up transitions. Gated on
    // !userInteractingRef so it NEVER fights the user: the grown owner interrupts
    // the toggle/overview spring (api.set each frame), which resolves its promise
    // `finished:false` and leaves `isAnimatingRef` stuck true — without this gate
    // the branch would re-assert the stored spring pose the instant the user grabs
    // the camera ("touch it and it snaps back"). MapControls owns the camera while
    // the user interacts, just like the flat path.
    else if (isAnimatingRef.current && !userInteractingRef.current) {
      needsFrame = true; // spring move in flight; driveCameraTo clears the gate on rest
      camera.position.set(camX.get(), camY.get(), camZ.get());
      controlsRef.current.target.set(lookX.get(), lookY.get(), lookZ.get());
      controlsRef.current.update();
    }

    if (needsFrame) invalidate();
  });

  const resetToInitial = useCallback(() => {
    // Drop any imperative flat override so the owner returns to the default
    // overview (safeArea or full-canvas) in flat mode.
    flatOverrideRef.current = null;
    userInteractingRef.current = false;
    const targetHeight = citySize * 1.1;
    const targetZ = citySize * 1.3;
    const { x: cx, z: cz } = cityCenterRef.current;

    driveCameraTo({
      camX: cx,
      camY: targetHeight,
      camZ: cz + targetZ,
      lookX: cx,
      lookY: 0,
      lookZ: cz,
    });
  }, [citySize, driveCameraTo]);

  const moveTo = useCallback((x: number, z: number, size?: number) => {
    const effectiveSize = size ?? citySize * 0.3;
    const distance = Math.max(effectiveSize * 2, 50);
    const height = Math.max(effectiveSize * 1.5, 40);

    driveCameraTo({
      camX: x,
      camY: height,
      camZ: z + distance,
      lookX: x,
      lookY: 0,
      lookZ: z,
    });
  }, [citySize, driveCameraTo]);

  // Position the camera directly above a target at a given height (flat /
  // top-down view). Useful for fitting the city into a visible sub-rect of
  // the canvas — raise `height` to make the city appear smaller, lower it to
  // zoom in. Pairs with `setTarget` for pan-only changes.
  const setFlatView = useCallback(
    (x: number, z: number, height: number) => {
      // Feed the single flat owner an imperative pose. The owner eases to it and
      // holds it (no correctors/seed to revert it). Clearing userInteracting lets
      // the imperative call take control even if the user had grabbed the camera.
      flatOverrideRef.current = {
        camX: x,
        camY: height,
        camZ: z + 0.001, // tiny offset to avoid gimbal lock looking straight down
        lookX: x,
        lookY: 0,
        lookZ: z,
      };
      userInteractingRef.current = false;
      invalidate(); // on-demand kick: ref-only change, so the owner won't run without it
    },
    [invalidate],
  );

  // Set camera target (look-at point). In flat mode this is a top-down pan fed
  // to the owner (keeping the current height); in 3D it maintains the current
  // offset and animates via the spring.
  const setTarget = useCallback((x: number, y: number, z: number, options?: RotateOptions) => {
    if (isFlatRef.current) {
      flatOverrideRef.current = {
        camX: x,
        camY: camera.position.y,
        camZ: z + 0.001,
        lookX: x,
        lookY: y,
        lookZ: z,
      };
      userInteractingRef.current = false;
      invalidate(); // on-demand kick: ref-only change in flat mode
      return;
    }
    // 3D: maintain current offset from target, animate via the spring.
    const currentTargetX = controlsRef.current?.target.x ?? 0;
    const currentTargetY = controlsRef.current?.target.y ?? 0;
    const currentTargetZ = controlsRef.current?.target.z ?? 0;
    const newCamX = x + (camera.position.x - currentTargetX);
    const newCamY = y + (camera.position.y - currentTargetY);
    const newCamZ = z + (camera.position.z - currentTargetZ);
    const animConfig = options?.duration
      ? { duration: options.duration, easing: (t: number) => t }
      : { tension: 60, friction: 20 };
    driveCameraTo({
      camX: newCamX,
      camY: newCamY,
      camZ: newCamZ,
      lookX: x,
      lookY: y,
      lookZ: z,
      config: animConfig,
    });
  }, [camera, driveCameraTo, invalidate]);

  // Convert cardinal direction to angle in degrees
  const directionToAngle = (dir: 'north' | 'south' | 'east' | 'west'): number => {
    switch (dir) {
      case 'north': return 180;
      case 'south': return 0;
      case 'east': return 270;
      case 'west': return 90;
    }
  };

  // Current azimuth (degrees, measured from +Z toward +X).
  const computeCurrentAngle = useCallback(() => {
    const targetX = controlsRef.current?.target.x ?? 0;
    const targetZ = controlsRef.current?.target.z ?? 0;
    const dx = camera.position.x - targetX;
    const dz = camera.position.z - targetZ;
    let angle = Math.atan2(dx, dz) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, [camera]);

  // Current polar angle (degrees from straight-up: 0 = top-down, 90 = level).
  const computeCurrentTilt = useCallback(() => {
    const targetX = controlsRef.current?.target.x ?? 0;
    const targetY = controlsRef.current?.target.y ?? 0;
    const targetZ = controlsRef.current?.target.z ?? 0;
    const dx = camera.position.x - targetX;
    const dy = camera.position.y - targetY;
    const dz = camera.position.z - targetZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance === 0) return 45;
    return (Math.acos(dy / distance) * 180) / Math.PI;
  }, [camera]);

  const tiltPresetToAngle = (preset: 'top' | 'level' | 'high' | 'low'): number => {
    switch (preset) {
      case 'top': return 15; // Near top-down
      case 'high': return 35; // High angle
      case 'low': return 60; // Low angle
      case 'level': return 80; // Near horizontal
    }
  };

  // 3D distance from the camera to its look-at target.
  const cameraTargetDistance = useCallback(() => {
    const tx = controlsRef.current?.target.x ?? 0;
    const ty = controlsRef.current?.target.y ?? 0;
    const tz = controlsRef.current?.target.z ?? 0;
    return Math.hypot(camera.position.x - tx, camera.position.y - ty, camera.position.z - tz);
  }, [camera]);

  // The rotation/tilt path. Place the held grown-3D pose from spherical coords
  // around the look-at target and claim the camera, so the per-frame hold owner
  // eases the camera there and HOLDS it. This bypasses the orbit/tilt springs
  // entirely (they did not animate to their goal reliably — a single start landed
  // at 0->18->0) and reuses the one writer we know holds: the 3D hold owner.
  const setHeldFromSpherical = useCallback(
    (azimuthDeg: number, polarDeg: number, dist: number, tx: number, ty: number, tz: number) => {
      const az = (azimuthDeg * Math.PI) / 180;
      // Clamp polar away from straight-down / under-ground to avoid gimbal flips.
      const po = (Math.max(5, Math.min(88, polarDeg)) * Math.PI) / 180;
      const horiz = dist * Math.sin(po);
      held3DPoseRef.current = {
        camX: tx + horiz * Math.sin(az),
        camY: ty + dist * Math.cos(po),
        camZ: tz + horiz * Math.cos(az),
        lookX: tx,
        lookY: ty,
        lookZ: tz,
      };
      userInteractingRef.current = true;
      isAnimatingRef.current = false;
    },
    [],
  );

  // Rotate to an absolute azimuth (degrees or compass direction), keeping tilt.
  const rotateTo = useCallback(
    (angleOrDirection: number | 'north' | 'south' | 'east' | 'west', _options?: RotateOptions) => {
      if (!controlsRef.current) return;
      const targetAngle =
        typeof angleOrDirection === 'number' ? angleOrDirection : directionToAngle(angleOrDirection);
      setHeldFromSpherical(
        targetAngle,
        computeCurrentTilt(),
        cameraTargetDistance(),
        controlsRef.current.target.x,
        controlsRef.current.target.y,
        controlsRef.current.target.z,
      );
    },
    [computeCurrentTilt, cameraTargetDistance, setHeldFromSpherical],
  );

  // Rotate by a relative azimuth delta (positive = clockwise), keeping tilt.
  const rotateBy = useCallback(
    (degrees: number, _options?: RotateOptions) => {
      if (!controlsRef.current) return;
      setHeldFromSpherical(
        computeCurrentAngle() + degrees,
        computeCurrentTilt(),
        cameraTargetDistance(),
        controlsRef.current.target.x,
        controlsRef.current.target.y,
        controlsRef.current.target.z,
      );
    },
    [computeCurrentAngle, computeCurrentTilt, cameraTargetDistance, setHeldFromSpherical],
  );

  // Tilt to an absolute polar angle or preset, keeping azimuth.
  const tiltTo = useCallback(
    (angleOrPreset: number | 'top' | 'level' | 'high' | 'low', _options?: RotateOptions) => {
      if (!controlsRef.current) return;
      const targetTilt =
        typeof angleOrPreset === 'number' ? angleOrPreset : tiltPresetToAngle(angleOrPreset);
      setHeldFromSpherical(
        computeCurrentAngle(),
        targetTilt,
        cameraTargetDistance(),
        controlsRef.current.target.x,
        controlsRef.current.target.y,
        controlsRef.current.target.z,
      );
    },
    [computeCurrentAngle, cameraTargetDistance, setHeldFromSpherical],
  );

  // Tilt by a relative polar delta, keeping azimuth.
  const tiltBy = useCallback(
    (degrees: number, _options?: RotateOptions) => {
      if (!controlsRef.current) return;
      setHeldFromSpherical(
        computeCurrentAngle(),
        computeCurrentTilt() + degrees,
        cameraTargetDistance(),
        controlsRef.current.target.x,
        controlsRef.current.target.y,
        controlsRef.current.target.z,
      );
    },
    [computeCurrentAngle, computeCurrentTilt, cameraTargetDistance, setHeldFromSpherical],
  );

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
      setFlatView,
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
  }, [resetToInitial, moveTo, setFlatView, setTarget, rotateTo, rotateBy, tiltTo, tiltBy, getCurrentPosition, getCurrentTarget, getCurrentAngle, getCurrentTilt]);

  // Custom wheel handler for wheel === 'pan'. We disable MapControls' built-in
  // zoom (otherwise it competes with our handler) and handle both axes here:
  // ctrl/⌘+wheel = zoom (matches trackpad pinch), plain wheel = pan along the
  // camera-relative ground plane.
  useEffect(() => {
    if (controlsConfig.wheel !== 'pan') return;
    const canvas = gl.domElement;
    const right = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const panSpeed = controlsConfig.panSpeed ?? 1;
    const zoomSpeed = controlsConfig.zoomSpeed ?? 1;

    const onWheel = (e: WheelEvent) => {
      const controls = controlsRef.current;
      if (!controls) return;
      e.preventDefault();
      const target = controls.target as THREE.Vector3;

      if (e.ctrlKey || e.metaKey) {
        direction.subVectors(camera.position, target);
        const distance = direction.length();
        const scale = Math.exp(e.deltaY * 0.01 * zoomSpeed);
        const minD = controls.minDistance ?? 0;
        const maxD = controls.maxDistance ?? Infinity;
        const newDistance = Math.min(Math.max(distance * scale, minD), maxD);
        direction.normalize().multiplyScalar(newDistance);
        camera.position.copy(target).add(direction);
        controls.update();
        return;
      }

      const distance = camera.position.distanceTo(target);
      const factor = distance * 0.0015 * panSpeed;

      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
      forward.normalize();
      right.crossVectors(forward, camera.up).normalize();

      offset.set(0, 0, 0);
      offset.addScaledVector(right, e.deltaX * factor);
      offset.addScaledVector(forward, -e.deltaY * factor);

      camera.position.add(offset);
      target.add(offset);
      controls.update();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [camera, gl, controlsConfig.wheel, controlsConfig.panSpeed, controlsConfig.zoomSpeed]);

  const mouseButtons = useMemo(() => ({
    LEFT: mouseAction(controlsConfig.leftDrag),
    MIDDLE: mouseAction(controlsConfig.middleDrag),
    RIGHT: mouseAction(controlsConfig.rightDrag),
  }), [controlsConfig.leftDrag, controlsConfig.middleDrag, controlsConfig.rightDrag]);

  const touches = useMemo(() => ({
    ONE: touchOneAction(controlsConfig.oneFingerTouch),
    TWO: touchTwoAction(controlsConfig.twoFingerTouch),
  }), [controlsConfig.oneFingerTouch, controlsConfig.twoFingerTouch]);

  // Stable seed position for the PerspectiveCamera. drei applies the `position`
  // prop whenever its reference changes, so a fresh `[0, h, 0.001]` array built
  // inline on every render re-applied the top-down OVERVIEW on every re-render —
  // including hover/highlight re-renders while the camera was focused on a
  // directory and the spring was at rest. With nothing driving the camera back,
  // that yanked it to the city center ("zoom out all the way on hover"). Memoize
  // on the only inputs the height actually depends on — the viewport aspect and
  // the city footprint — so the seed still updates when the canvas measures or
  // the city resizes (the init-race fix this prop exists for), but stays
  // referentially stable across unrelated re-renders so drei stops re-applying it.
  //
  // Seed the SAFE-AREA-INDEPENDENT overview pose, NOT computeFlatPose(safeArea).
  // drei re-applies this `position` prop whenever the memo's value changes, so
  // keying it on the insets made every safeArea set/clear snap camera.position
  // (the height) at commit — before the per-frame owner could ease it. The pan
  // (controls target) isn't seeded, so it eased while the zoom jumped; on Clear,
  // where the visible motion IS the zoom, the transition looked like it didn't
  // animate.
  //
  // The seed only needs to give MapControls a sane connect-radius at mount; the
  // inset framing is owned downstream (the one-shot init snaps to it via
  // getInitial2DPosition, then the per-frame owner eases to it), and both read
  // the live safeArea. Because the value is ALWAYS the overview height, drei can
  // never re-apply an inset height — so the height never snaps, on toggle OR on
  // resize. The owner owns both axes of the transition; height eases like the pan.
  const seedCameraPosition = useMemo<[number, number, number]>(() => {
    const p = computeFlatPose();
    return [p.camX, p.camY, p.camZ];
    // Depend on the STABLE PRIMITIVE inputs, NOT the `computeFlatPose` callback.
    // computeFlatPose's identity churns every render (getViewportAspect closes
    // over the viewportSize OBJECT), so keying the memo on it recomputed the seed
    // every frame — drei then re-applied the overview camera.position on a loop.
    // Harmless at the overview (the owner writes the same pose), but during a
    // focus the owner stands down and this loop yanked the camera back to the
    // overview ("starts moving then fills the whole thing"). The overview height
    // only actually changes when the viewport or the city footprint changes, so
    // those primitives are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportSize.width, viewportSize.height, cityWidth, cityDepth, cityCenter?.x, cityCenter?.z]);

  // MapControls clamps the camera distance to `maxDistance`. The inset framing
  // raises the camera well above the full-canvas overview (height inflates by
  // ~1/visibleFraction), so a tight safeArea can demand a height past the
  // default `citySize * 3` — the owner would then ease toward the inset pose and
  // get clamped short ("starts moving, then adjusts to the component"). Grow the
  // ceiling to cover the active flat framing.
  const pose3D = compute3DPose(safeArea);
  const effectiveMaxDistance = Math.max(
    controlsConfig.maxDistance ?? citySize * 3,
    computeFlatPose(safeArea).camY * 1.25,
    // The grown 3D fit pulls the rig back by the same inset inflation; without
    // covering it here MapControls clamps the pulled-back camera short and the
    // city won't shrink into the inner rect.
    Math.hypot(pose3D.camX - pose3D.lookX, pose3D.camY - pose3D.lookY, pose3D.camZ - pose3D.lookZ) *
      1.25,
    // Headroom for imperative `setFlatView` overrides (which can demand a tall
    // inset framing and aren't reactive here): cover up to ~3x the full-canvas
    // overview height. Rarely dominates the citySize*3 default for no insets.
    calculateFlatCameraHeight(getViewportAspect()) * 3,
  );

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={50}
        near={1}
        // Seed the camera at the top-down overview height from the start.
        // Without an explicit position the camera mounts at R3F's default
        // (~distance 5), and MapControls — which connects asynchronously and
        // clamps to `minDistance` (10) — seeds its orbit radius from that
        // default. When MapControls finishes connecting AFTER the frame-1
        // init, it re-applies that radius-10 state and pins the camera at
        // y≈10 ("zoomed in at the origin"), overriding the init's correct
        // height. Starting at the overview height makes MapControls connect to
        // the right radius regardless of ordering, killing that race.
        //
        // Use the real viewport aspect, not a hardcoded 1. drei re-applies this
        // `position` prop on every re-render, so a hardcoded-aspect seed would
        // clobber the one-shot/resize framing back to the aspect=1 height on the
        // next render — the "fits height instead of width in portrait" bug. Tied
        // to `getViewportAspect()` (which depends on the measured `viewportSize`),
        // the seed re-applies at the correct height once the canvas is measured.
        position={seedCameraPosition}
        // far must comfortably exceed the camera's maxDistance, otherwise
        // the city clips out of view when consumers raise maxDistance.
        far={Math.max(citySize * 10, effectiveMaxDistance * 1.5)}
      />
      <MapControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={controlsConfig.minDistance ?? 10}
        maxDistance={effectiveMaxDistance}
        maxPolarAngle={Math.PI / 2.1}
        mouseButtons={mouseButtons}
        touches={touches}
        enableZoom={controlsConfig.wheel !== 'pan'}
        panSpeed={controlsConfig.panSpeed ?? 1}
        rotateSpeed={controlsConfig.rotateSpeed ?? 1}
        zoomSpeed={controlsConfig.zoomSpeed ?? 1}
        // User grabbed the camera — the per-frame owner (flat or grown-3D) stands
        // down so they can move freely; a reframe trigger (safeArea / viewport /
        // footprint) re-engages it.
        onStart={() => {
          userInteractingRef.current = true;
          // Cancel any in-flight spring move so it can't fight the drag / re-assert
          // its goal when the grab ends (the stuck-isAnimatingRef snap-back).
          isAnimatingRef.current = false;
          // Mid-gesture: the grown-3D hold owner stands down so MapControls moves
          // freely; onChange below captures the evolving pose.
          draggingRef.current = true;
        }}
        onEnd={() => {
          draggingRef.current = false;
        }}
        onChange={() => {
          // Capture the live grown-3D pose so the hold owner can re-assert it every
          // frame (defeating the re-applied seed). ONLY while the user is actively
          // dragging — otherwise the hold owner's own update() (which fires this
          // change event) feeds its slightly-nudged pose back into held, and held
          // creeps back to the framed azimuth every frame (the "rotate, then drifts
          // back" bug). Orbit/tilt write held directly, so they don't need this.
          if (!isFlatRef.current && draggingRef.current && controlsRef.current) {
            held3DPoseRef.current = {
              camX: camera.position.x,
              camY: camera.position.y,
              camZ: camera.position.z,
              lookX: controlsRef.current.target.x,
              lookY: controlsRef.current.target.y,
              lookZ: controlsRef.current.target.z,
            };
          }
        }}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: re-render when isFlat, citySize, cityWidth/cityDepth,
  // maxBuildingHeight, cameraControls, or focusTarget change. focusTarget is
  // included so the useEffect that animates the camera on focus changes actually
  // fires. cityWidth/cityDepth are included because the rect-fit framing depends
  // on them and they can change while citySize (their max) stays equal.
  return (
    prevProps.isFlat === nextProps.isFlat &&
    prevProps.citySize === nextProps.citySize &&
    prevProps.cityWidth === nextProps.cityWidth &&
    prevProps.cityDepth === nextProps.cityDepth &&
    prevProps.cityCenter?.x === nextProps.cityCenter?.x &&
    prevProps.cityCenter?.z === nextProps.cityCenter?.z &&
    prevProps.maxBuildingHeight === nextProps.maxBuildingHeight &&
    prevProps.cameraControls === nextProps.cameraControls &&
    prevProps.focusTarget === nextProps.focusTarget &&
    // By value, so a fresh `{…}` literal each render doesn't re-render, but an
    // actual inset change does — which re-engages the flat owner via the effect.
    prevProps.safeArea?.top === nextProps.safeArea?.top &&
    prevProps.safeArea?.bottom === nextProps.safeArea?.bottom &&
    prevProps.safeArea?.left === nextProps.safeArea?.left &&
    prevProps.safeArea?.right === nextProps.safeArea?.right
  );
});

// Info panel overlay
interface InfoPanelProps {
  building: CityBuilding | null;
}

function InfoPanel({ building }: InfoPanelProps) {
  const { theme } = useTheme();
  if (!building) return null;

  const fileName = building.path.split('/').pop();
  const dirPath = building.path.split('/').slice(0, -1).join('/');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 60,
        background: `color-mix(in oklab, ${theme.colors.background} 90%, transparent)`,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii[4],
        padding: '12px 16px',
        color: theme.colors.text,
        fontSize: theme.fontSizes[1],
        fontFamily: theme.fonts.monospace,
        maxWidth: 400,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: theme.fontWeights.semibold, marginBottom: 4 }}>{fileName}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.fontSizes[0] }}>{dirPath}</div>
      <div
        style={{
          color: theme.colors.textTertiary,
          fontSize: 11,
          marginTop: 4,
          display: 'flex',
          gap: theme.space[3],
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
  onLookDown: () => void;
}

function ControlsOverlay({ isFlat, onToggle, onResetCamera, onLookDown }: ControlsOverlayProps) {
  const { theme } = useTheme();
  const buttonStyle = {
    background: `color-mix(in oklab, ${theme.colors.background} 90%, transparent)`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii[4],
    padding: '10px',
    color: theme.colors.text,
    fontSize: theme.fontSizes[1],
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    fontWeight: theme.fontWeights.medium,
  };

  return (
    <>
      {/* 2D/3D Toggle - Bottom Right (moved from top-left to leave room
         for story-level overlays like the focus-directory readout). */}
      <button
        onClick={onToggle}
        style={{
          ...buttonStyle,
          position: 'absolute',
          bottom: 8,
          right: 8,
        }}
      >
        {isFlat ? '3D' : '2D'}
      </button>

      {/* Look Down - Bottom Left */}
      <button
        onClick={onLookDown}
        style={{
          ...buttonStyle,
          position: 'absolute',
          bottom: 8,
          left: 8,
        }}
        title="Look down"
      >
        ⬇
      </button>

      {/* Reset Camera - Bottom Left (right of Look Down) */}
      <button
        onClick={onResetCamera}
        style={{
          ...buttonStyle,
          position: 'absolute',
          bottom: 8,
          left: 56,
        }}
        title="Reset View"
      >
        ↻
      </button>
    </>
  );
}

// Distance (world units) the panel lifts upward when dismissed. Reads as
// "toward the camera" because the camera looks down in flat mode.


// Main scene component
interface CitySceneProps {
  cityData: CityData;
  /** Inset rect the flat overview frames itself into. See {@link SafeArea}. */
  safeArea?: SafeArea;
  onBuildingHover?: (building: CityBuilding | null) => void;
  onBuildingClick?: (building: CityBuilding, event: MouseEvent) => void;
  onHighlightClick?: (path: string, layer: HighlightLayer, event: MouseEvent) => void;
  onHighlightHover?: (path: string | null, layer: HighlightLayer | null) => void;
  hoveredBuilding: CityBuilding | null;
  selectedBuilding: CityBuilding | null;
  selectedDistrict: CityDistrict | null;
  selectionStyle?: SelectionStyle;
  growProgress: number;
  animationConfig: AnimationConfig;
  highlightLayers: HighlightLayer[];
  /** User-supplied highlight layers (no file-color layers) for visibility logic. */
  visibilityLayers: HighlightLayer[];
  isolationMode: IsolationMode;
  heightScaling: HeightScaling;
  linearScale: number;
  flatPatterns: FlatPattern[];
  focusDirectory: string | null;
  focusColor?: string | null;
  adaptCameraToBuildings?: boolean;
  elevatedScopePanels?: ElevatedScopePanel[];
  dismissingPanelIds?: ReadonlySet<string>;
  onPanelDismissed?: (id: string) => void;
  cameraControls?: CameraControlsConfig;
  defaultBuildingColor?: string;
  districtAppearingProgress?: Record<string, number>;
  modifiedFiles?: Record<string, { lineDelta: number }>;
  transitionProgress?: number;
}

function CityScene({
  cityData,
  safeArea,
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
  adaptCameraToBuildings = false,
  elevatedScopePanels,
  dismissingPanelIds,
  onPanelDismissed,
  cameraControls,
  defaultBuildingColor,
  onCameraReady,
  districtAppearingProgress,
  modifiedFiles,
  transitionProgress = 0,
}: CitySceneProps & { onCameraReady?: () => void }) {
  // CityScene composes the 3D scene: camera + lights + city content.
  // Camera focus animation and city-dimension math live here so they
  // can feed <AnimatedCamera> before passing the rest to <CityContent>.
  // On-demand safety net. Most in-scene visuals are driven imperatively inside
  // useFrame (instanced-mesh hover/selection scale, colors) rather than through
  // React three props, so R3F's built-in "render on prop change" won't schedule
  // a frame for them. Requesting one render per CityScene commit means any state
  // change that reaches this subtree — hover, selection, grow toggle, data /
  // safeArea props — paints exactly one frame, then goes quiet again. It costs a
  // single frame per React commit (bounded, event-driven), NOT a continuous loop.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  });

  const centerOffset = useMemo(
    () => ({
      x: (cityData.bounds.minX + cityData.bounds.maxX) / 2,
      z: (cityData.bounds.minZ + cityData.bounds.maxZ) / 2,
    }),
    [cityData.bounds],
  );

  const cityWidth = cityData.bounds.maxX - cityData.bounds.minX;
  const cityDepth = cityData.bounds.maxZ - cityData.bounds.minZ;
  const citySize = Math.max(cityWidth, cityDepth);

  // Calculate max building height for camera positioning (when adaptCameraToBuildings is true)
  const maxBuildingHeight = useMemo(() => {
    if (!adaptCameraToBuildings) return 0;
    return Math.max(...cityData.buildings.map(b => b.dimensions[1]), 0);
  }, [adaptCameraToBuildings, cityData.buildings]);


  // Helper to check if a path is inside a directory
  const isPathInDirectory = useCallback((path: string, directory: string) => {
    if (!directory) return true;
    return path === directory || path.startsWith(directory + '/');
  }, []);

  // Camera focus state — manages camera zooming when focusDirectory changes.
  // CityContent handles building collapse/expand timing internally.
  const [cameraFocusDirectory, setCameraFocusDirectory] = useState<string | null>(null);
  const prevFocusRef = useRef<string | null>(null);
  const focusTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    focusTimersRef.current.forEach(clearTimeout);
    focusTimersRef.current = [];
    const prev = prevFocusRef.current;
    prevFocusRef.current = focusDirectory;
    if (focusDirectory === prev) return;

    if (prev === null && focusDirectory !== null) {
      const t = setTimeout(() => setCameraFocusDirectory(focusDirectory), 600);
      focusTimersRef.current.push(t);
      return;
    }
    if (prev !== null && focusDirectory === null) {
      setCameraFocusDirectory(null);
      return;
    }
    if (prev !== null && focusDirectory !== null) {
      const isDescendant = focusDirectory.startsWith(prev + '/');
      const isAncestor = prev.startsWith(focusDirectory + '/');
      const parentOf = (p: string) => { const i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i) : ''; };
      const isSibling = parentOf(prev) === parentOf(focusDirectory);
      if (isDescendant || isAncestor || isSibling) {
        setCameraFocusDirectory(focusDirectory);
      } else {
        setCameraFocusDirectory(null);
        const t = setTimeout(() => setCameraFocusDirectory(focusDirectory), 1100);
        focusTimersRef.current.push(t);
      }
    }
  }, [focusDirectory]);

  useEffect(() => {
    return () => { focusTimersRef.current.forEach(clearTimeout); };
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
      const width = maxX - minX;
      const depth = maxZ - minZ;
      const size = Math.max(width, depth);

      return { x: centerX, z: centerZ, size, width, depth };
    }

    // No auto-focus on highlights - camera only moves with explicit focusDirectory
    return null;
  }, [
    cameraFocusDirectory,
    cityData.buildings,
    centerOffset,
    isPathInDirectory,
  ]);




  // Use original building colors (line delta indicators are shown separately via ModifiedIndicator)

  return (
    <>
      <AnimatedCamera
        citySize={citySize}
        cityWidth={cityWidth}
        cityDepth={cityDepth}
        safeArea={safeArea}
        isFlat={growProgress === 0}
        cityReady={cityData.buildings.length > 0}
        focusTarget={focusTarget}
        maxBuildingHeight={maxBuildingHeight}
        cameraControls={cameraControls}
        onCameraReady={onCameraReady}
      />

      <CityLights citySize={citySize} />

      <CityContent
        cityData={cityData}
        onBuildingHover={onBuildingHover}
        onBuildingClick={onBuildingClick}
        onHighlightClick={onHighlightClick}
        onHighlightHover={onHighlightHover}
        hoveredBuilding={hoveredBuilding}
        selectedBuilding={selectedBuilding}
        selectedDistrict={selectedDistrict}
        selectionStyle={selectionStyle}
        growProgress={growProgress}
        animationConfig={animationConfig}
        highlightLayers={highlightLayers}
        visibilityLayers={visibilityLayers}
        isolationMode={isolationMode}
        heightScaling={heightScaling}
        linearScale={linearScale}
        flatPatterns={flatPatterns}
        focusDirectory={focusDirectory}
        focusColor={focusColor}
        elevatedScopePanels={elevatedScopePanels}
        dismissingPanelIds={dismissingPanelIds}
        onPanelDismissed={onPanelDismissed}
        defaultBuildingColor={defaultBuildingColor}
        districtAppearingProgress={districtAppearingProgress}
        modifiedFiles={modifiedFiles}
        transitionProgress={transitionProgress}
      />
    </>
  );
}

// ============================================================================
// Multi-City Scene
// ============================================================================

/**
 * Compute the combined bounding box from multiple CitySource instances.
 *
 * CityContent subtracts each city's own centerOffset from its building
 * positions and THEN applies positionOffset — so a city's rendered footprint is
 * centered on `positionOffset`, spanning `±bounds/2`. The raw `cityData.bounds`
 * are NOT shifted by the offset (that would double-count the city's center,
 * e.g. a city at offset −120 with bounds 0..50 would be treated as −120..−70
 * when it actually renders −145..−95).
 */
function computeGlobalBounds(
  sources: CitySource[],
): { minX: number; maxX: number; minZ: number; maxZ: number; centerX: number; centerZ: number; width: number; depth: number; size: number } {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const s of sources) {
    const b = s.cityData.bounds;
    const ox = s.positionOffset.x;
    const oz = s.positionOffset.z;
    const halfW = (b.maxX - b.minX) / 2;
    const halfD = (b.maxZ - b.minZ) / 2;
    minX = Math.min(minX, ox - halfW);
    maxX = Math.max(maxX, ox + halfW);
    minZ = Math.min(minZ, oz - halfD);
    maxZ = Math.max(maxZ, oz + halfD);
  }
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const size = Math.max(width, depth);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth, size };
}

/**
 * Repo label for a city source — owner avatar + repo name, sitting on the
 * floor in the empty grid space just behind the city's footprint, at the
 * city's center column. Rendered as a screen-space HTML overlay via drei so
 * the avatar image stays crisp.
 */
export function CitySourceLabel({
  source,
  onClick,
  focused = false,
}: {
  source: CitySource;
  onClick?: (source: CitySource) => void;
  focused?: boolean;
}) {
  const [badgeFailed, setBadgeFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  if (!source.label) return null;
  const { positionOffset, cityData } = source;
  const { bounds } = cityData;
  // The chip's bottom (near) edge anchors just behind the city's back edge and
  // the chip extends away from the city (world -Z, the side opposite the default
  // camera), so the whole chip lands in the empty grid space behind the
  // footprint instead of overlaying its buildings.
  const anchor = computeCityLabelAnchor({ positionOffset, bounds });
  const position: [number, number, number] = [
    anchor.position.x,
    anchor.position.y,
    anchor.position.z,
  ];
  const owner =
    source.ownerAvatarUrl
      ?.replace(/\?.*$/, '')
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\.(png|jpg|jpeg|webp)$/i, '') ?? null;
  return (
    <Html
      position={position}
      // No `center`: the chip is anchored at its bottom edge via the transform
      // (translateX centers it on the cell column, translateY(-100%) puts its
      // bottom edge on the anchor point so it rises away from the city).
      style={{ transform: 'translate3d(-50%, -100%, 0)', pointerEvents: 'none' }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(source);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          boxSizing: 'border-box',
          maxWidth: 128,
          borderRadius: 6,
          background: 'rgba(10, 14, 22, 0.72)',
          backdropFilter: 'blur(2px)',
          border: focused ? '1px solid rgba(251, 191, 36, 0.55)' : '1px solid rgba(255,255,255,0.14)',
          fontFamily: '-apple-system, "SF Pro", "Segoe UI", Roboto, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          boxShadow: focused ? '0 0 0 2px rgba(251,191,36,0.25), 0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.35)',
          pointerEvents: 'auto',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {source.badgeLogoUrl && !badgeFailed ? (
          <img
            src={source.badgeLogoUrl}
            onError={() => setBadgeFailed(true)}
            alt=""
            width={20}
            height={20}
            style={{
              borderRadius: 6,
              display: 'block',
              flexShrink: 0,
              background: '#0f172a',
              objectFit: 'cover',
              padding: 2,
            }}
          />
        ) : source.ownerAvatarUrl && !avatarFailed ? (
          <img
            src={source.ownerAvatarUrl}
            onError={() => setAvatarFailed(true)}
            alt=""
            width={20}
            height={20}
            style={{ borderRadius: 6, display: 'block', flexShrink: 0 }}
          />
        ) : (
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#3b82f6',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(owner ?? '?').charAt(0).toUpperCase()}
          </span>
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          {source.label}
        </span>
      </div>
    </Html>
  );
}

interface MultiCitySceneProps {
  sources: CitySource[];
  safeArea?: SafeArea;
  growProgress: number;
  animationConfig: AnimationConfig;
  heightScaling: HeightScaling;
  linearScale: number;
  flatPatterns: FlatPattern[];
  onBuildingHover?: (building: CityBuilding | null) => void;
  onBuildingClick?: (building: CityBuilding, event: MouseEvent) => void;
  onHighlightClick?: (path: string, layer: HighlightLayer, event: MouseEvent) => void;
  onHighlightHover?: (path: string | null, layer: HighlightLayer | null) => void;
  hoveredBuilding: CityBuilding | null;
  selectedBuilding: CityBuilding | null;
  selectedDistrict: CityDistrict | null;
  selectionStyle?: SelectionStyle;
  cameraControls?: CameraControlsConfig;
  adaptCameraToBuildings?: boolean;
  onCameraFrame?: OnCameraFrame;
  onCameraReady?: () => void;
}

function MultiCityScene({
  sources,
  safeArea,
  growProgress,
  animationConfig,
  heightScaling,
  linearScale,
  flatPatterns,
  onBuildingHover,
  onBuildingClick,
  onHighlightClick,
  onHighlightHover,
  hoveredBuilding,
  selectedBuilding,
  selectedDistrict,
  selectionStyle,
  cameraControls,
  adaptCameraToBuildings = false,
  onCameraFrame,
  onCameraReady,
}: MultiCitySceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); });

  // Clicking a city's repo label frames the camera on that city's footprint.
  // Clicking the same city's label again resets back to the overview.
  const focusedCityRef = useRef<CitySource | null>(null);
  const handleCityLabelClick = useCallback((s: CitySource) => {
    const b = s.cityData.bounds;
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    const focused = focusedCityRef.current;
    const sameCity =
      !!focused &&
      focused.positionOffset.x === s.positionOffset.x &&
      focused.positionOffset.z === s.positionOffset.z;
    if (sameCity) {
      focusedCityRef.current = null;
      resetCamera();
    } else {
      focusedCityRef.current = s;
      moveCameraTo(s.positionOffset.x, s.positionOffset.z, size);
    }
  }, []);

  const global = useMemo(() => computeGlobalBounds(sources), [sources]);

  const maxBuildingHeight = useMemo(() => {
    if (!adaptCameraToBuildings) return 0;
    let maxH = 0;
    for (const s of sources) {
      for (const b of s.cityData.buildings) {
        maxH = Math.max(maxH, b.dimensions[1]);
      }
    }
    return maxH;
  }, [adaptCameraToBuildings, sources]);

  return (
    <>
      <AnimatedCamera
        citySize={global.size}
        cityWidth={global.width}
        cityDepth={global.depth}
        cityCenter={{ x: global.centerX, z: global.centerZ }}
        safeArea={safeArea}
        isFlat={growProgress === 0}
        cityReady={sources.some(s => s.cityData.buildings.length > 0)}
        focusTarget={null}
        maxBuildingHeight={maxBuildingHeight}
        cameraControls={cameraControls}
        onCameraReady={onCameraReady}
      />

      <CityLights citySize={global.size} />

      {onCameraFrame && <CameraFrameBridge onCameraFrame={onCameraFrame} />}

      {sources.map((s, i) => (
        <React.Fragment key={s.label ?? i}>
          <CityContent
            cityData={s.cityData}
            onBuildingHover={onBuildingHover}
            onBuildingClick={onBuildingClick}
            onHighlightClick={onHighlightClick}
            onHighlightHover={onHighlightHover}
            hoveredBuilding={hoveredBuilding}
            selectedBuilding={selectedBuilding}
            selectedDistrict={selectedDistrict}
            selectionStyle={selectionStyle}
            growProgress={growProgress}
            animationConfig={animationConfig}
            highlightLayers={s.highlightLayers ?? []}
            visibilityLayers={s.visibilityLayers ?? []}
            isolationMode={s.isolationMode ?? 'none'}
            heightScaling={heightScaling}
            linearScale={linearScale}
            flatPatterns={flatPatterns}
            focusDirectory={s.focusDirectory ?? null}
            focusColor={s.focusColor ?? null}
            defaultBuildingColor={s.defaultBuildingColor}
            elevatedScopePanels={s.elevatedScopePanels}
            modifiedFiles={s.modifiedFiles}
            districtAppearingProgress={s.districtAppearingProgress}
            transitionProgress={s.transitionProgress}
            positionOffset={s.positionOffset}
          />
          <CitySourceLabel source={s} onClick={handleCityLabelClick} />
        </React.Fragment>
      ))}
    </>
  );
}

// ============================================================================
// Main Component Props and Export
// ============================================================================

export interface FileCity3DProps {
  /**
   * City data from file-city-builder. Mutually exclusive with `citySources`:
   * when `citySources` is provided, this prop is ignored.
   */
  cityData?: CityData;
  /**
   * Multi-city layout. When set, renders one `CityContent` per source at its
   * `positionOffset`, sharing a single camera (framing the combined bounding
   * box) and lighting rig. Ignored when empty/undefined.
   */
  citySources?: CitySource[];
  /**
   * Inset rect the flat overview frames itself into (fractions of the canvas).
   * The canvas stays full-size; the component frames as if its boundary were the
   * inner rect — so a host keeps the city out from under floating overlays
   * declaratively, and the framing holds across re-render / resize / hover with
   * no imperative camera push. See {@link SafeArea}.
   */
  safeArea?: SafeArea;
  /** Width of the container */
  width?: number | string;
  /** Height of the container */
  height?: number | string;
  /** Callback when a building is clicked */
  onBuildingClick?: (building: CityBuilding, event: MouseEvent) => void;
  /** Callback when the hovered building changes (fires with null on hover-out) */
  onBuildingHover?: (building: CityBuilding | null) => void;
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
  /** Show control buttons (default: false). Use isGrown prop and resetCamera() for programmatic control. */
  showControls?: boolean;
  /**
   * Render the built-in selection info panel (filename / dir / size)
   * for the selected building. Default `true`. Set `false` when the
   * host already surfaces the same info elsewhere (e.g. a side panel
   * or brief card) so the corner panel doesn't duplicate it.
   */
  showInfoPanel?: boolean;
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
  /** Patterns for files that should render flat (e.g., lock files). Set to DEFAULT_FLAT_PATTERNS for common lock files, or [] to disable. */
  flatPatterns?: FlatPattern[];
  /** Directory path to focus on - buildings outside will collapse */
  focusDirectory?: string | null;
  /** Color to highlight the focused directory (hex color, e.g. "#3b82f6") */
  focusColor?: string | null;
  /** Callback when user clicks on a district to navigate */
  onDirectorySelect?: (directory: string | null) => void;
  /** Callback when user hovers over a directory fill layer */
  onDirectoryHover?: (directory: string | null) => void;
  /** Background color for the canvas container */
  backgroundColor?: string;
  /** Text color for secondary/placeholder text */
  textColor?: string;
  /**
   * @deprecated Use `selectedPath` instead. When both are set, `selectedPath`
   * wins. This prop will be removed in a future release.
   */
  selectedBuilding?: CityBuilding | null;

  /**
   * Path of the selected building or directory. The component resolves the
   * path against `cityData.buildings` (file selection — emphasizes the
   * building and shows the InfoPanel) and `cityData.districts` (directory
   * selection — draws a ring around the district). When both `selectedPath`
   * and `selectedBuilding` are set, `selectedPath` wins.
   */
  selectedPath?: string | null;

  /** Visual style for the directory selection ring drawn for `selectedPath`. */
  selectionStyle?: SelectionStyle;
  /** When true, camera height adjusts based on tallest building when grown */
  adaptCameraToBuildings?: boolean;

  /** Base file type color layers (resolved with highlightLayers) */
  fileColorLayers?: HighlightLayer[];

  /**
   * Override the per-building color fallback. When unset (default), buildings
   * not matched by a fill highlight layer are colored by file extension via
   * the built-in file-type palette. Set to a CSS color (e.g. `'#475569'`) to
   * render unmatched buildings in a neutral tone — useful for debug stories
   * that want to isolate highlight-layer rendering.
   */
  defaultBuildingColor?: string;

  /**
   * Translucent slabs rendered above the city showing scope coverage as
   * elevated planes over the directories they own.
   */
  elevatedScopePanels?: ElevatedScopePanel[];

  /**
   * Set of panel ids that should play the "lift up and fade out" dismiss
   * animation. Add an id here to start the animation; once it settles,
   * `onPanelDismissed` fires so the host can drop the panel from
   * `elevatedScopePanels`.
   */
  dismissingPanelIds?: ReadonlySet<string>;

  /**
   * Fires once a panel's dismiss animation has settled. The host should
   * remove the id from both `dismissingPanelIds` and `elevatedScopePanels`.
   */
  onPanelDismissed?: (id: string) => void;

  /**
   * Configure how mouse / trackpad / touch input drives the camera.
   * Defaults match Google Maps style: left-drag pans, right-drag rotates,
   * wheel zooms. Set `wheel: 'pan'` to make trackpad two-finger scroll pan
   * (ctrl/⌘+wheel still zooms so pinch-zoom keeps working).
   *
   * Memoize this object to avoid unnecessary camera re-mounts.
   */
  cameraControls?: CameraControlsConfig;

  /**
   * Fires once per R3F render frame with the live camera and canvas size.
   * Use to project world points to canvas pixels for HTML/SVG overlays that
   * need to track buildings as the camera pans / zooms / rotates.
   *
   * Memoize the callback to avoid re-mounting the bridge.
   */
  onCameraFrame?: OnCameraFrame;

  /**
   * Fires once when the camera has been positioned in the safe area and the
   * initial frame has rendered. The host can use this to reveal the canvas
   * (e.g. `visibility: hidden` until ready) so the city never appears mid-layout
   * or mid-animation.
   */
  onCameraReady?: () => void;

  /**
   * Per-district appearing progress (0-1) keyed by district path.
   * Used to animate new directory borders expanding from center with a
   * bright accent color, and labels popping in.
   */
  districtAppearingProgress?: Record<string, number>;

  /**
   * Files modified in the current commit, keyed by path.
   * Each entry includes a lineDelta (lines added minus lines removed).
   * During a transition (transitionProgress between 0 and 1), these
   * buildings flash yellow and show a floating +/- indicator.
   */
  modifiedFiles?: Record<string, { lineDelta: number }>;

  /**
   * Current transition progress (0-1). When combined with modifiedFiles,
   * buildings flash yellow and show +/- indicators during the transition.
   */
  transitionProgress?: number;
}

/**
 * One city in a multi-city layout. Each source renders a `CityContent`
 * instance at its `positionOffset`; highlight layers, focus, and any other
 * per-city visual state live here rather than on the shared `FileCity3D`
 * props. The camera frames the bounding box of ALL sources together.
 */
export interface CitySource {
  /** City data to render for this source. */
  cityData: CityData;
  /** World-space offset placing this city in the shared scene. */
  positionOffset: { x: number; z: number };
  /** Optional label for this city (display only). */
  label?: string;
  /**
   * Optional owner avatar URL (e.g. a GitHub avatar) shown next to the city
   * label. Rendered as an HTML overlay anchored in the grid space just in
   * front of the city's footprint.
   */
  ownerAvatarUrl?: string;
  /**
   * Optional logo URL (e.g. a package-manager logo) shown in the label badge.
   * Takes precedence over `ownerAvatarUrl`; falls back to the letter badge.
   */
  badgeLogoUrl?: string;
  /** Per-city highlight layers (paths relative to this city's data). */
  highlightLayers?: HighlightLayer[];
  /** Per-city user-supplied highlight layers only (visibility decisions). */
  visibilityLayers?: HighlightLayer[];
  /** Per-city isolation mode for non-highlighted buildings. Default: 'none'. */
  isolationMode?: IsolationMode;
  /** Per-city directory focus (collapses non-matching buildings). */
  focusDirectory?: string | null;
  /** Per-city color for the focused directory. */
  focusColor?: string | null;
  /** Per-city building color fallback. */
  defaultBuildingColor?: string;
  /** Per-city elevated scope panels (flat mode only). */
  elevatedScopePanels?: ElevatedScopePanel[];
  /** Per-city files modified in the current transition. */
  modifiedFiles?: Record<string, { lineDelta: number }>;
  /** Per-city district appearing progress. */
  districtAppearingProgress?: Record<string, number>;
  /** Per-city transition progress (0-1). */
  transitionProgress?: number;
}

/**
 * FileCity3D - 3D visualization of codebase structure
 *
 * Renders CityData as an interactive 3D city where buildings represent files
 * and their height corresponds to line count or file size.
 */
export function FileCity3D({
  cityData,
  citySources,
  safeArea,
  width = '100%',
  height = 600,
  onBuildingClick,
  onBuildingHover,
  className,
  style,
  animation,
  isGrown: externalIsGrown,
  onGrowChange,
  showControls = false,
  showInfoPanel = true,
  elevatedScopePanels,
  dismissingPanelIds,
  onPanelDismissed,
  highlightLayers: externalHighlightLayers,
  isolationMode: externalIsolationMode,
  dimOpacity: _dimOpacity = 0.15,
  isLoading = false,
  loadingMessage = 'Loading file city...',
  emptyMessage = 'No file tree data available',
  heightScaling = 'linear',
  linearScale = 1,
  flatPatterns = DEFAULT_FLAT_PATTERNS,
  focusDirectory: externalFocusDirectory,
  focusColor: externalFocusColor,
  onDirectorySelect,
  onDirectoryHover,
  backgroundColor = '#0f172a',
  textColor = '#94a3b8',
  selectedBuilding = null,
  selectedPath = null,
  selectionStyle,
  adaptCameraToBuildings = false,
  fileColorLayers,
  defaultBuildingColor,
  cameraControls,
  onCameraFrame,
  onCameraReady: onCameraReadyProp,
  districtAppearingProgress,
  modifiedFiles,
  transitionProgress,
}: FileCity3DProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<CityBuilding | null>(null);
  const [internalIsGrown, setInternalIsGrown] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const handleBuildingHover = useCallback(
    (building: CityBuilding | null) => {
      setHoveredBuilding(building);
      onBuildingHover?.(building);
    },
    [onBuildingHover],
  );

  const handleHighlightClick = useCallback(
    (path: string, _layer: HighlightLayer, _event: MouseEvent) => {
      onDirectorySelect?.(path);
    },
    [onDirectorySelect],
  );

  const handleHighlightHover = useCallback(
    (path: string | null, _layer: HighlightLayer | null) => {
      onDirectoryHover?.(path);
    },
    [onDirectoryHover],
  );

  const animationConfig = useMemo(() => ({ ...DEFAULT_ANIMATION, ...animation }), [animation]);

  // ============================================================================
  // Visualization Resolution
  // Always resolve: combines highlightLayers with fileColorLayers,
  // filtering fileColorLayers based on focus/highlight scope.
  // ============================================================================
  const resolved = useMemo(() => {
    // Cast to InputHighlightLayer[] for resolution - types are compatible at runtime
    const resolution = resolveVisualizationIntent({
      focusPath: externalFocusDirectory,
      focusColor: externalFocusColor,
      highlightLayers: (externalHighlightLayers ?? []) as Parameters<typeof resolveVisualizationIntent>[0]['highlightLayers'],
      fileColorLayers: (fileColorLayers ?? []) as Parameters<typeof resolveVisualizationIntent>[0]['fileColorLayers'],
    });

    return {
      highlightLayers: resolution.highlightLayers as HighlightLayer[],
      focusDirectory: resolution.cameraFocusPath,
      focusColor: resolution.focusColor,
      // Use explicit isolation mode if provided, otherwise auto-determine
      isolationMode: externalIsolationMode ?? (resolution.shouldIsolate ? 'collapse' : 'none'),
    };
  }, [
    fileColorLayers,
    externalHighlightLayers,
    externalFocusDirectory,
    externalFocusColor,
    externalIsolationMode,
  ]);

  // Use resolved values
  const highlightLayers = resolved.highlightLayers;
  const focusDirectory = resolved.focusDirectory;
  const focusColor = resolved.focusColor;
  const isolationMode = resolved.isolationMode as IsolationMode;

  // User-supplied highlight layers only — used for visibility decisions so
  // file-color layers don't keep every building visible in 'hide' mode.
  const visibilityLayers = useMemo(
    () => (externalHighlightLayers ?? []) as HighlightLayer[],
    [externalHighlightLayers],
  );

  const hasSources = (citySources?.length ?? 0) > 0;

  // `selectedPath` wins over the deprecated `selectedBuilding` when both are
  // set. A path resolves to either a building (file selection) or a district
  // (directory selection) — never both. In multi-city mode the path resolves
  // across ALL sources.
  const resolvedSelection = useMemo<{
    building: CityBuilding | null;
    district: CityDistrict | null;
  }>(() => {
    if (selectedPath != null) {
      if (hasSources) {
        for (const s of citySources!) {
          const building = s.cityData.buildings.find(b => b.path === selectedPath);
          if (building) return { building, district: null };
          const district = s.cityData.districts.find(d => d.path === selectedPath);
          if (district) return { building: null, district };
        }
        return { building: null, district: null };
      }
      if (cityData) {
        const building = cityData.buildings.find(b => b.path === selectedPath) ?? null;
        if (building) return { building, district: null };
        const district = cityData.districts.find(d => d.path === selectedPath) ?? null;
        return { building: null, district };
      }
      return { building: null, district: null };
    }
    return { building: selectedBuilding ?? null, district: null };
  }, [selectedPath, selectedBuilding, cityData, hasSources, citySources]);

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

  const isEmpty = hasSources
    ? citySources!.every(s => !s.cityData || s.cityData.buildings.length === 0)
    : !cityData || cityData.buildings.length === 0;

  if (isEmpty) {
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
        // Ensure the WebGL layer can receive hits when stacked under chrome
        // that uses pointer-events: none (GuideStage overlay pattern).
        pointerEvents: 'auto',
        ...style,
      }}
    >
      <Canvas
        shadows
        flat // Disables tone mapping for true colors
        // On-demand rendering: render only when something actually changes
        // (invalidate() calls in the animation drivers + a per-render net in
        // CityScene/AnimatedCamera). Without this, R3F defaults to
        // frameloop="always" — a permanent rAF loop + ~8 useFrame callbacks
        // firing 60x/sec even while idle, which saturates the main thread and
        // starves hover repaints (the "repo page hover lag" bug).
        frameloop="demand"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: cameraReady ? 1 : 0,
          transition: onCameraReadyProp ? 'none' : 'opacity 0.1s ease-in',
        }}
      >
        {hasSources ? (
          <MultiCityScene
            sources={citySources!}
            safeArea={safeArea}
            growProgress={growProgress}
            animationConfig={animationConfig}
            heightScaling={heightScaling}
            linearScale={linearScale}
            flatPatterns={flatPatterns}
            onBuildingHover={handleBuildingHover}
            onBuildingClick={onBuildingClick}
            onHighlightClick={handleHighlightClick}
            onHighlightHover={handleHighlightHover}
            hoveredBuilding={hoveredBuilding}
            selectedBuilding={resolvedSelection.building}
            selectedDistrict={resolvedSelection.district}
            selectionStyle={selectionStyle}
            cameraControls={cameraControls}
            adaptCameraToBuildings={adaptCameraToBuildings}
            onCameraFrame={onCameraFrame}
            onCameraReady={() => {
              setCameraReady(true);
              onCameraReadyProp?.();
            }}
          />
        ) : (
          <>
            {/* Non-source path is guarded by `isEmpty` above (early return), so
                cityData is defined here. */}
            <CityScene
              cityData={cityData!}
              safeArea={safeArea}
              onBuildingHover={handleBuildingHover}
              onBuildingClick={onBuildingClick}
              onHighlightClick={handleHighlightClick}
              onHighlightHover={handleHighlightHover}
              hoveredBuilding={hoveredBuilding}
              selectedBuilding={resolvedSelection.building}
              selectedDistrict={resolvedSelection.district}
              selectionStyle={selectionStyle}
              growProgress={growProgress}
              animationConfig={animationConfig}
              highlightLayers={highlightLayers}
              visibilityLayers={visibilityLayers}
              isolationMode={isolationMode}
              heightScaling={heightScaling}
              linearScale={linearScale}
              flatPatterns={flatPatterns}
              focusDirectory={focusDirectory}
              focusColor={focusColor}
              adaptCameraToBuildings={adaptCameraToBuildings}
              elevatedScopePanels={elevatedScopePanels}
              dismissingPanelIds={dismissingPanelIds}
              onPanelDismissed={onPanelDismissed}
              cameraControls={cameraControls}
              defaultBuildingColor={defaultBuildingColor}
              onCameraReady={() => {
                setCameraReady(true);
                onCameraReadyProp?.();
              }}
              districtAppearingProgress={districtAppearingProgress}
              modifiedFiles={modifiedFiles}
              transitionProgress={transitionProgress}
            />
            {onCameraFrame && <CameraFrameBridge onCameraFrame={onCameraFrame} />}
          </>
        )}
      </Canvas>
      {showInfoPanel && <InfoPanel building={resolvedSelection.building} />}
      {showControls && (
        <ControlsOverlay
          isFlat={!isGrown}
          onToggle={handleToggle}
          onResetCamera={resetCamera}
          onLookDown={() => tiltCameraTo(0)}
        />
      )}
    </div>
  );
}

export default FileCity3D;
