/* eslint-disable react/no-unknown-property -- R3F element props */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, QuadraticBezierLine } from '@react-three/drei';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import type { FileInfo } from '@principal-ai/repository-abstraction';

import {
  FileCity3D,
  calculateBuildingHeight,
  rotateCameraTo,
  tiltCameraTo,
} from '../components/FileCity3D';
import type { CityData, CityBuilding, HighlightLayer } from '../components/FileCity3D';

const meta = {
  title: 'Prototypes/Hero Subsystem Projection',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

// ============================================================================
// Synthetic repo → city
// ============================================================================

const REPO_FILES: Array<{ path: string; lineCount: number }> = [
  { path: 'src/checkout/api.ts', lineCount: 240 },
  { path: 'src/checkout/validate.ts', lineCount: 90 },
  { path: 'src/checkout/pricing.ts', lineCount: 140 },
  { path: 'src/checkout/receipt.ts', lineCount: 70 },
  { path: 'src/cart/cartStore.ts', lineCount: 180 },
  { path: 'src/cart/cartSelectors.ts', lineCount: 60 },
  { path: 'src/cart/cartEvents.ts', lineCount: 45 },
  { path: 'src/payments/stripeClient.ts', lineCount: 210 },
  { path: 'src/payments/webhooks.ts', lineCount: 120 },
  { path: 'src/payments/types.ts', lineCount: 40 },
  { path: 'src/orders/ordersRepo.ts', lineCount: 160 },
  { path: 'src/orders/orderStatus.ts', lineCount: 55 },
  { path: 'src/orders/migrations/001_init.sql', lineCount: 80 },
  { path: 'src/orders/migrations/002_status.sql', lineCount: 30 },
  { path: 'src/catalog/products.ts', lineCount: 130 },
  { path: 'src/catalog/search.ts', lineCount: 95 },
  { path: 'src/catalog/inventory.ts', lineCount: 110 },
  { path: 'src/auth/session.ts', lineCount: 85 },
  { path: 'src/auth/middleware.ts', lineCount: 65 },
  { path: 'src/ui/App.tsx', lineCount: 120 },
  { path: 'src/ui/CheckoutPage.tsx', lineCount: 200 },
  { path: 'src/ui/CartDrawer.tsx', lineCount: 150 },
  { path: 'src/ui/ProductGrid.tsx', lineCount: 170 },
  { path: 'src/ui/components/Button.tsx', lineCount: 40 },
  { path: 'src/ui/components/Modal.tsx', lineCount: 75 },
  { path: 'src/ui/components/Price.tsx', lineCount: 30 },
  { path: 'src/ui/hooks/useCart.ts', lineCount: 60 },
  { path: 'src/ui/hooks/useCheckout.ts', lineCount: 80 },
  { path: 'src/ui/styles/global.css', lineCount: 220 },
  { path: 'src/lib/http.ts', lineCount: 70 },
  { path: 'src/lib/logger.ts', lineCount: 50 },
  { path: 'src/lib/env.ts', lineCount: 35 },
  { path: 'src/index.ts', lineCount: 40 },
  { path: 'tests/checkout.test.ts', lineCount: 180 },
  { path: 'tests/cart.test.ts', lineCount: 120 },
  { path: 'tests/payments.test.ts', lineCount: 140 },
  { path: 'tests/fixtures/orders.json', lineCount: 300 },
  { path: 'package.json', lineCount: 60 },
  { path: 'tsconfig.json', lineCount: 25 },
  { path: 'README.md', lineCount: 90 },
];

function buildCity(): CityData {
  const infos: FileInfo[] = REPO_FILES.map(f => ({
    name: f.path.split('/').pop() || f.path,
    path: f.path,
    relativePath: f.path,
    size: f.lineCount * 38,
    lineCount: f.lineCount,
    extension: f.path.includes('.') ? '.' + (f.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
  const tree = buildFileSystemTreeFromFileInfoList(infos, 'shop');
  return new CodeCityBuilderWithGrid().buildCityFromFileSystem(tree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });
}

// ============================================================================
// Subsystem model (the "Checkout" example from the marketing hero)
// ============================================================================

type Construct = 'function' | 'store' | 'service' | 'repository' | 'external';

interface ModelComponent {
  alias: string;
  construct: Construct;
  role?: 'entry' | 'service';
  /** Source file this component is anchored to. Externals have none. */
  file?: string;
  /** Where to float an un-anchored (external) node, relative to the city. */
  edge?: 'west' | 'east' | 'north' | 'south';
}

interface ModelStep {
  from: string;
  to: string;
  mechanism: 'calls' | 'reads' | 'writes' | 'emits';
}

const COMPONENTS: ModelComponent[] = [
  { alias: 'Web client', construct: 'external', edge: 'west' },
  { alias: 'checkout-api', construct: 'function', role: 'entry', file: 'src/checkout/api.ts' },
  { alias: 'cart-store', construct: 'store', file: 'src/cart/cartStore.ts' },
  { alias: 'payments', construct: 'service', file: 'src/payments/stripeClient.ts' },
  { alias: 'orders-repo', construct: 'repository', file: 'src/orders/ordersRepo.ts' },
  { alias: 'Stripe', construct: 'external', role: 'service', edge: 'east' },
];

const STEPS: ModelStep[] = [
  { from: 'Web client', to: 'checkout-api', mechanism: 'calls' },
  { from: 'checkout-api', to: 'cart-store', mechanism: 'reads' },
  { from: 'checkout-api', to: 'payments', mechanism: 'calls' },
  { from: 'payments', to: 'Stripe', mechanism: 'calls' },
  { from: 'checkout-api', to: 'orders-repo', mechanism: 'writes' },
];

/** Hop count from the trail's first `from` to each alias, following steps. */
function trailDepth(steps: ModelStep[]): Map<string, number> {
  const depth = new Map<string, number>();
  if (steps.length === 0) return depth;
  depth.set(steps[0].from, 0);
  // Steps are authored in walk order, so a single pass settles every node.
  for (const s of steps) {
    const d = depth.get(s.from) ?? 0;
    if (!depth.has(s.to)) depth.set(s.to, d + 1);
  }
  return depth;
}

const ACCENT = '#2dd4bf';
const ACCENT_SOFT = '#99f6e4';
const EXTERNAL = '#a78bfa';
const HEIGHT_SCALING = 'linear' as const;

/**
 * Pick a linear height scale so the tallest file reaches about an eighth of
 * the city's footprint: a low-rise base the projection can float over. Logarithmic scaling reads as flat tiles at this size.
 */
function heightScaleFor(cityData: CityData): number {
  const { minX, maxX, minZ, maxZ } = cityData.bounds;
  const citySize = Math.max(maxX - minX, maxZ - minZ);
  // Mirror calculateBuildingHeight's linear rule: lineCount when present,
  // otherwise KiB. The builder only carries `size` for this synthetic tree.
  const units = cityData.buildings.map(b =>
    b.lineCount !== undefined ? b.lineCount : (b.size ?? 0) / 1024,
  );
  const maxUnits = Math.max(1, ...units);
  return (citySize * 0.12) / maxUnits;
}

const CONSTRUCT_LABEL: Record<Construct, string> = {
  function: 'fn',
  store: 'store',
  service: 'svc',
  repository: 'repo',
  external: 'ext',
};

// ============================================================================
// Reveal timeline — a single clock shared by every projected element.
//
// The reveal walks the trail from its first step. Each step is the same beat:
// any node not yet shown appears (beam + card, or just the card for an
// external), then the edge draws into it. Every element gets a window on the
// 0–1 clock, derived here so the order lives in one place.
// ============================================================================

type Window = readonly [number, number];

interface RevealTimeline {
  /** Per-alias window for the node card. */
  cards: Map<string, Window>;
  /** Per-alias window for the beam (anchored nodes only; leads the card). */
  beams: Map<string, Window>;
  /** Per-step-index window for the edge. */
  edges: Window[];
  /** Total duration in ms; grows with the number of beats. */
  durationMs: number;
}

const BEAT_MS = 520;
/** How much each beat overlaps the next (0 = strictly sequential). */
const BEAT_OVERLAP = 0.35;

function buildTimeline(components: ModelComponent[], steps: ModelStep[]): RevealTimeline {
  // One beat per element, in trail order: (new nodes, edge) per step.
  type Beat = { kind: 'node'; alias: string } | { kind: 'edge'; index: number };
  const beats: Beat[] = [];
  const shown = new Set<string>();
  const showNode = (alias: string) => {
    if (shown.has(alias)) return;
    shown.add(alias);
    beats.push({ kind: 'node', alias });
  };

  steps.forEach((s, index) => {
    showNode(s.from);
    showNode(s.to);
    beats.push({ kind: 'edge', index });
  });

  const stride = 1 - BEAT_OVERLAP;
  const totalUnits = (beats.length - 1) * stride + 1;
  const byAlias = new Map(components.map(c => [c.alias, c]));

  const cards = new Map<string, Window>();
  const beams = new Map<string, Window>();
  const edges: Window[] = [];
  beats.forEach((beat, i) => {
    const start = (i * stride) / totalUnits;
    const end = (i * stride + 1) / totalUnits;
    const span = end - start;
    if (beat.kind === 'edge') {
      edges[beat.index] = [start, end];
      return;
    }
    const anchored = !!byAlias.get(beat.alias)?.file;
    if (anchored) {
      // Beam rises through the first ~60% of the beat; the card lands on top.
      beams.set(beat.alias, [start, start + span * 0.6]);
      cards.set(beat.alias, [start + span * 0.35, end]);
    } else {
      cards.set(beat.alias, [start, end]);
    }
  });

  return { cards, beams, edges, durationMs: Math.round(totalUnits * BEAT_MS) };
}

const TIMELINE = buildTimeline(COMPONENTS, STEPS);
const REVEAL_MS = TIMELINE.durationMs;

function windowProgress(t: number, [a, b]: Window) {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

interface RevealClock {
  /** 0–1 across the whole reveal. */
  t: number;
}

/**
 * Drives a 0→1 reveal clock from inside the canvas. FileCity3D renders on
 * demand, so this also requests frames for as long as the reveal is running.
 */
function useRevealClock(active: boolean): React.MutableRefObject<RevealClock> {
  const clockRef = useRef<RevealClock>({ t: 0 });
  const startRef = useRef<number | null>(null);
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    if (active) {
      startRef.current = null;
      invalidate();
    }
  }, [active, invalidate]);

  useFrame(() => {
    if (!active || clockRef.current.t >= 1) return;
    const now = performance.now();
    if (startRef.current === null) startRef.current = now;
    clockRef.current.t = Math.min(1, (now - startRef.current) / REVEAL_MS);
    invalidate();
  });

  return clockRef;
}

// ============================================================================
// Scene pieces
// ============================================================================

interface Anchor {
  component: ModelComponent;
  /** World position of the node on the projection plane. */
  node: THREE.Vector3;
  /** World position of the roof of the anchored building (anchored only). */
  roof?: THREE.Vector3;
}

/**
 * Screen-aligned grid panel floating behind the city. It copies the camera's
 * orientation every frame (a billboard), so it always reads as a flat screen
 * behind the scene rather than a wall on the city's own axes.
 */
function Backdrop({
  bounds,
  top,
  bottom,
  clock,
}: {
  bounds: CityData['bounds'];
  /** Height of the highest node tier. */
  top: number;
  /** Height of the lowest node tier; the panel is cut off just below it. */
  bottom: number;
  clock: React.MutableRefObject<RevealClock>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const gridMatRef = useRef<THREE.LineBasicMaterial>(null);
  const fillMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const citySize = Math.max(w, d);
  // Wide enough to sit behind the external nodes floating off the city's sides.
  const width = citySize * 2.3;
  // Looser below than above: the panel should read as a backdrop the graph
  // sits on, with the beams crossing its lower part on the way to the city.
  const padTop = citySize * 0.14;
  const padBottom = citySize * 0.42;
  const height = top - bottom + padTop + padBottom;
  const centerY = (top + padTop + (bottom - padBottom)) / 2;
  const center = useMemo(
    () => new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2),
    [bounds],
  );
  const forward = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const p = easeOutCubic(windowProgress(clock.current.t, [0, 0.12]));
    if (gridMatRef.current) gridMatRef.current.opacity = 0.16 * p;
    if (fillMatRef.current) fillMatRef.current.opacity = 0.05 * p;

    const g = groupRef.current;
    if (!g) return;
    // Push the panel back from the city's center along the camera's horizontal
    // view direction, lift it to the node layer, and face the camera.
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    g.position.copy(center).addScaledVector(forward, citySize * 0.55);
    g.position.y = centerY;
    g.quaternion.copy(camera.quaternion);
  });

  const cells = 20;
  const gridSize = Math.max(width, height);
  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={fillMatRef} color={ACCENT} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* gridHelper lies in XZ; stand it into XY and squash to the panel size */}
      <gridHelper
        args={[gridSize, cells, ACCENT, ACCENT]}
        rotation-x={Math.PI / 2}
        scale={[width / gridSize, 1, height / gridSize]}
      >
        <lineBasicMaterial ref={gridMatRef} color={ACCENT} transparent opacity={0} depthWrite={false} />
      </gridHelper>
    </group>
  );
}

function Beam({
  anchor,
  slot,
  clock,
}: {
  anchor: Required<Anchor>;
  slot: Window;
  clock: React.MutableRefObject<RevealClock>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coneRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.MeshBasicMaterial>(null);
  const height = anchor.node.y - anchor.roof.y;

  useFrame(() => {
    const p = easeOutCubic(windowProgress(clock.current.t, slot));
    if (groupRef.current) groupRef.current.scale.y = Math.max(0.0001, p);
    if (coneRef.current) coneRef.current.opacity = 0.22 * p;
    if (ringRef.current) ringRef.current.opacity = 0.9 * p;
  });

  return (
    <group position={anchor.roof}>
      {/* Landing ring on the roof */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.15}>
        <ringGeometry args={[2.2, 3.2, 40]} />
        <meshBasicMaterial ref={ringRef} color={ACCENT} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={groupRef} scale-y={0.0001}>
        {/* Light cone: narrow at the roof, wider at the plane */}
        <mesh position-y={height / 2}>
          <cylinderGeometry args={[3.4, 1.2, height, 24, 1, true]} />
          <meshBasicMaterial
            ref={coneRef}
            color={ACCENT}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Core thread */}
        <mesh position-y={height / 2}>
          <cylinderGeometry args={[0.25, 0.25, height, 8]} />
          <meshBasicMaterial color={ACCENT_SOFT} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function NodeCard({
  anchor,
  slot,
  clock,
}: {
  anchor: Anchor;
  slot: Window;
  clock: React.MutableRefObject<RevealClock>;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const isExternal = anchor.component.construct === 'external';
  const color = isExternal ? EXTERNAL : ACCENT;

  useFrame(() => {
    const el = elRef.current;
    if (!el) return;
    const p = easeOutCubic(windowProgress(clock.current.t, slot));
    el.style.opacity = String(p);
    el.style.transform = `translateY(${(1 - p) * 14}px) scale(${0.92 + 0.08 * p})`;
  });

  return (
    <Html position={anchor.node} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
      <div
        ref={elRef}
        style={{
          opacity: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 11px 7px 9px',
          borderRadius: 8,
          border: `1px solid ${color}`,
          background: isExternal ? 'rgba(49, 36, 94, 0.82)' : 'rgba(4, 47, 46, 0.82)',
          boxShadow: `0 0 0 1px rgba(0,0,0,0.35), 0 0 24px ${color}55`,
          backdropFilter: 'blur(6px)',
          color: '#e2e8f0',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          whiteSpace: 'nowrap',
          willChange: 'opacity, transform',
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color,
            border: `1px solid ${color}88`,
            borderRadius: 4,
            padding: '1px 4px',
          }}
        >
          {CONSTRUCT_LABEL[anchor.component.construct]}
        </span>
        <span style={{ fontWeight: 600 }}>{anchor.component.alias}</span>
        {anchor.component.role === 'entry' && (
          <span style={{ color: '#fbbf24', fontSize: 10 }}>entry</span>
        )}
      </div>
    </Html>
  );
}

function TrailEdge({
  from,
  to,
  mechanism,
  slot,
  clock,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  mechanism: ModelStep['mechanism'];
  slot: Window;
  clock: React.MutableRefObject<RevealClock>;
}) {
  // drei's Line2 instance; typed loosely because the ref type is internal.
  const lineRef = useRef<any>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<THREE.MeshBasicMaterial>(null);

  const mid = useMemo(() => {
    const m = from.clone().lerp(to, 0.5);
    m.y += Math.min(14, from.distanceTo(to) * 0.18);
    return m;
  }, [from, to]);

  // Approximate curve length so dash animation can "draw" the edge.
  const length = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return curve.getLength();
  }, [from, mid, to]);

  useFrame(() => {
    const p = easeOutCubic(windowProgress(clock.current.t, slot));
    const line = lineRef.current;
    if (line?.material) {
      line.material.dashSize = length * p;
      line.material.gapSize = length;
      line.material.opacity = Math.min(1, p * 3);
      line.material.needsUpdate = true;
    }
    if (labelRef.current) {
      const lp = Math.max(0, (p - 0.6) / 0.4);
      labelRef.current.style.opacity = String(lp);
    }
    if (dotRef.current) dotRef.current.opacity = p >= 0.98 ? 1 : 0;
  });

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef}
        start={from}
        end={to}
        mid={mid}
        color={ACCENT_SOFT}
        lineWidth={1.6}
        dashed
        dashSize={0}
        gapSize={length}
        transparent
        opacity={0}
        depthWrite={false}
      />
      {/* Arrival dot at the target node */}
      <mesh position={to}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshBasicMaterial ref={dotRef} color={ACCENT_SOFT} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={mid} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
        <div
          ref={labelRef}
          style={{
            opacity: 0,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10,
            color: '#ccfbf1',
            background: 'rgba(2, 6, 23, 0.7)',
            padding: '1px 5px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            transition: 'opacity 120ms linear',
          }}
        >
          {mechanism}
        </div>
      </Html>
    </group>
  );
}

/** Everything that floats above the city. Rendered as FileCity3D children. */
function SubsystemProjection({
  cityData,
  heightScale,
  active,
}: {
  cityData: CityData;
  heightScale: number;
  active: boolean;
}) {
  const clock = useRevealClock(active);

  const { anchors, planeY, baseY } = useMemo(() => {
    const byPath = new Map(cityData.buildings.map(b => [b.path, b]));
    const anchoredBuildings = COMPONENTS.flatMap(c =>
      c.file && byPath.has(c.file) ? [byPath.get(c.file) as CityBuilding] : [],
    );
    const maxRoof = Math.max(
      0,
      ...anchoredBuildings.map(b => calculateBuildingHeight(b, HEIGHT_SCALING, heightScale)),
    );
    const { minX, maxX, minZ, maxZ } = cityData.bounds;
    const citySize = Math.max(maxX - minX, maxZ - minZ);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const margin = citySize * 0.15;

    // Nodes are staggered by trail depth so the flow reads top-to-bottom on
    // screen instead of piling up on one foreshortened plane. x/z still come
    // from the anchored building; only the height is free.
    const depth = trailDepth(STEPS);
    const maxDepth = Math.max(0, ...depth.values());
    const tierGap = citySize * 0.13;
    const baseY = maxRoof + citySize * 0.5;
    const planeY = baseY + maxDepth * tierGap;

    // Ground positions first (x/z), then heights.
    const placed = COMPONENTS.map(component => {
      const building = component.file ? byPath.get(component.file) : undefined;
      if (building) {
        const roofY = calculateBuildingHeight(building, HEIGHT_SCALING, heightScale);
        return {
          component,
          x: building.position.x,
          z: building.position.z,
          roof: new THREE.Vector3(building.position.x, roofY, building.position.z),
        };
      }
      // Externals float just outside the city footprint so they read as
      // "not in this repo": no beam, no building.
      const edgePos: Record<NonNullable<ModelComponent['edge']>, [number, number]> = {
        west: [minX - margin, cz],
        east: [maxX + margin, cz],
        north: [cx, minZ - margin],
        south: [cx, maxZ + margin],
      };
      const [x, z] = edgePos[component.edge ?? 'west'];
      return { component, x, z, roof: undefined };
    });

    // Siblings on one tier fan out vertically so neighbouring buildings don't
    // put their cards on top of each other once the camera foreshortens the
    // layer. Far buildings (small z) already project higher on screen, so they
    // take the higher slots and the fan widens that spread instead of
    // fighting it.
    const byTier = new Map<number, typeof placed>();
    for (const p of placed) {
      const d = depth.get(p.component.alias) ?? maxDepth;
      byTier.set(d, [...(byTier.get(d) ?? []), p]);
    }
    const yFor = new Map<string, number>();
    for (const [d, group] of byTier) {
      const tierY = baseY + (maxDepth - d) * tierGap;
      const sorted = [...group].sort((a, b) => a.z - b.z);
      sorted.forEach((p, i) => {
        const fan = ((sorted.length - 1) / 2 - i) * tierGap * 0.55;
        yFor.set(p.component.alias, tierY + fan);
      });
    }

    const anchors: Anchor[] = placed.map(p => ({
      component: p.component,
      roof: p.roof,
      node: new THREE.Vector3(p.x, yFor.get(p.component.alias) ?? baseY, p.z),
    }));
    return { anchors, planeY, baseY };
  }, [cityData, heightScale]);

  const byAlias = useMemo(() => new Map(anchors.map(a => [a.component.alias, a])), [anchors]);
  const anchored = anchors.filter((a): a is Required<Anchor> => a.roof !== undefined);

  return (
    <>
      <Backdrop bounds={cityData.bounds} top={planeY} bottom={baseY} clock={clock} />
      {anchored.map(a => (
        <Beam
          key={a.component.alias}
          anchor={a}
          slot={TIMELINE.beams.get(a.component.alias) ?? [0, 0]}
          clock={clock}
        />
      ))}
      {STEPS.map((s, i) => {
        const from = byAlias.get(s.from);
        const to = byAlias.get(s.to);
        if (!from || !to) return null;
        return (
          <TrailEdge
            key={`${s.from}->${s.to}`}
            from={from.node}
            to={to.node}
            mechanism={s.mechanism}
            slot={TIMELINE.edges[i] ?? [0, 0]}
            clock={clock}
          />
        );
      })}
      {anchors.map(a => (
        <NodeCard
          key={a.component.alias}
          anchor={a}
          slot={TIMELINE.cards.get(a.component.alias) ?? [0, 0]}
          clock={clock}
        />
      ))}
    </>
  );
}

// ============================================================================
// Story
// ============================================================================

// Tilt is measured from straight down (0 = top-down, 90 = level). The default
// grown pose sits near 49; this reads as "more isometric" and lifts the graph
// clear of the city.
const CAMERA_AZIMUTH = 30;
const CAMERA_TILT = 69;

function HeroScene({ replayKey }: { replayKey: number }) {
  const cityData = useMemo(() => buildCity(), []);
  const heightScale = useMemo(() => heightScaleFor(cityData), [cityData]);
  const [revealActive, setRevealActive] = useState(false);
  // Show the whole city first; the collapse only starts once layers are set.
  const [isolate, setIsolate] = useState(false);

  const highlightLayers = useMemo<HighlightLayer[]>(
    () => [
      {
        id: 'subsystem',
        name: 'Checkout subsystem',
        enabled: true,
        priority: 1,
        color: ACCENT,
        // No fill strategy: the anchored files keep their file-type color and
        // stand out by being the only buildings left standing.
        items: COMPONENTS.flatMap(c => (c.file ? [{ path: c.file, type: 'file' as const }] : [])),
      },
    ],
    [],
  );

  // Beats: hold the full city, sink everything outside the subsystem, swing
  // the camera into the diagram pose, then start the projection.
  const handleCameraReady = useCallback(() => {
    const isolateTimer = setTimeout(() => setIsolate(true), 1600);
    const poseTimer = setTimeout(() => {
      rotateCameraTo(CAMERA_AZIMUTH, { duration: 1100 });
      tiltCameraTo(CAMERA_TILT, { duration: 1100 });
    }, 2400);
    const revealTimer = setTimeout(() => setRevealActive(true), 3600);
    return () => {
      clearTimeout(isolateTimer);
      clearTimeout(poseTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        background: 'radial-gradient(ellipse at 30% 20%, #0b1f3a 0%, #020617 65%)',
        overflow: 'hidden',
      }}
    >
      <FileCity3D
        key={replayKey}
        cityData={cityData}
        width="100%"
        height="100%"
        backgroundColor="transparent"
        heightScaling={HEIGHT_SCALING}
        linearScale={heightScale}
        animation={{ startFlat: false }}
        highlightLayers={isolate ? highlightLayers : undefined}
        // Everything outside the subsystem sinks to the ground and greys out,
        // leaving the anchored files as the only buildings standing.
        isolationMode="collapse"
        showInfoPanel={false}
        // Frame the city low in the viewport so the projection above it has
        // headroom; the hero copy owns the left third.
        safeArea={{ left: 0.34, top: 0.34, right: 0.04, bottom: 0.08 }}
        onCameraReady={handleCameraReady}
      >
        <SubsystemProjection cityData={cityData} heightScale={heightScale} active={revealActive} />
      </FileCity3D>

      {/* Hero copy — sits in the safe-area inset the camera frames around */}
      <div
        style={{
          position: 'absolute',
          left: 56,
          top: '50%',
          transform: 'translateY(-50%)',
          maxWidth: 420,
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: ACCENT,
            border: `1px solid ${ACCENT}66`,
            borderRadius: 999,
            padding: '4px 10px',
            marginBottom: 18,
          }}
        >
          Subsystem Model
        </div>
        <h1 style={{ fontSize: 44, lineHeight: 1.08, margin: '0 0 16px', fontWeight: 700 }}>
          Your mental model,
          <br />
          projected from real code.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: '#94a3b8', margin: 0 }}>
          Every node points at a file. Every edge points at a line. If the code moves, the
          diagram tells you.
        </p>
      </div>
    </div>
  );
}

export const Hero: StoryObj = {
  render: function RenderHero() {
    const [replayKey, setReplayKey] = useState(0);
    return (
      <>
        <HeroScene replayKey={replayKey} />
        <button
          onClick={() => setReplayKey(k => k + 1)}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#e2e8f0',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Replay
        </button>
      </>
    );
  },
};
