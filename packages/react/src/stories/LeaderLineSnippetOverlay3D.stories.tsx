import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import * as THREE from 'three';

import { FileCity3D } from '../components/FileCity3D';
import type {
  CityData,
  HighlightLayer,
  OnCameraFrame,
} from '../components/FileCity3D';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Prototypes/Leader Line Snippet Overlay (3D Flat)',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

const PANEL_WIDTH = 380;
const PANEL_INSET = 16;
const FADE_PX = 60;
const DWELL_MS = 400;
const APPROVED_COLOR = '#22c55e';

type GitStatus = 'added' | 'modified' | 'deleted';

const STATUS_COLOR: Record<GitStatus, string> = {
  added: '#3fb950',
  modified: '#d29922',
  deleted: '#f85149',
};

const STATUS_LABEL: Record<GitStatus, string> = {
  added: '+ added',
  modified: '~ modified',
  deleted: '− deleted',
};

interface Snippet {
  path: string;
  label: string;
  status: GitStatus;
  code: string;
}

const SNIPPETS: Snippet[] = [
  {
    path: 'auth-server/src/lib/auth-provider.ts',
    label: 'auth-provider.ts',
    status: 'modified',
    code: `export const authProvider = {
  async getSession(req: Request) {
    const cookie = req.headers.get('cookie');
    return parseSessionCookie(cookie);
  },
};`,
  },
  {
    path: 'auth-server/src/lib/org-membership.ts',
    label: 'org-membership.ts',
    status: 'added',
    code: `export async function getOrgMembership(userId: string) {
  return db.query.memberships.findFirst({
    where: eq(memberships.userId, userId),
  });
}`,
  },
  {
    path: 'auth-server/src/app/api/auth/workos/callback/route.ts',
    label: 'callback / route.ts',
    status: 'modified',
    code: `export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code');
  if (!code) return NextResponse.redirect('/login');
  const session = await workos.userManagement
    .authenticateWithCode({ clientId: env.WORKOS_CLIENT_ID, code });
  return setSessionCookie(session);
}`,
  },
  {
    path: 'auth-server/src/app/api/auth/workos/refresh/route.ts',
    label: 'refresh / route.ts',
    status: 'added',
    code: `export async function POST(req: Request) {
  const { refreshToken } = await req.json();
  const next = await workos.userManagement
    .authenticateWithRefreshToken({ refreshToken });
  return Response.json(next);
}`,
  },
  {
    path: 'auth-server/src/app/api/auth/cli/room-token/route.ts',
    label: 'cli / room-token',
    status: 'modified',
    code: `export async function POST(req: Request) {
  const session = await authProvider.getSession(req);
  if (!session) return new Response('unauthorized', { status: 401 });
  return Response.json({ token: mintRoomToken(session.userId) });
}`,
  },
  {
    path: 'auth-server/src/app/api/auth/workos/verify/route.ts',
    label: 'verify / route.ts',
    status: 'modified',
    code: `export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.slice(7);
  const claims = await verifyJwt(token);
  return Response.json({ ok: true, claims });
}`,
  },
  {
    path: 'auth-server/src/lib/token-store.ts',
    label: 'token-store.ts',
    status: 'added',
    code: `export const tokenStore = {
  async put(key: string, value: string, ttlSec: number) {
    await redis.set(key, value, 'EX', ttlSec);
  },
  async get(key: string) {
    return redis.get(key);
  },
};`,
  },
  {
    path: 'auth-server/src/app/api/auth/workos/start/route.ts',
    label: 'start / route.ts',
    status: 'modified',
    code: `export function GET(req: Request) {
  const url = workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    redirectUri: env.WORKOS_REDIRECT_URI,
  });
  return NextResponse.redirect(url);
}`,
  },
  {
    path: 'auth-server/src/app/api/auth/workos/token/route.ts',
    label: 'token / route.ts',
    status: 'deleted',
    code: `export async function POST(req: Request) {
  const { code, codeVerifier } = await req.json();
  const result = await workos.userManagement
    .authenticateWithCode({ code, codeVerifier });
  return Response.json(result);
}`,
  },
  {
    path: 'auth-server/src/app/page.tsx',
    label: 'page.tsx',
    status: 'modified',
    code: `export default async function Page() {
  const session = await authProvider.getSession(headers());
  if (!session) redirect('/login');
  return <Dashboard session={session} />;
}`,
  },
];

interface CardLayout {
  path: string;
  // World position of the building's center, captured once at mount.
  world: { x: number; y: number; z: number };
  // World-space footprint corners (4 corners on the y=0 plane), used to draw
  // a screen-space outline polygon that pans/zooms/rotates with the city.
  corners: { x: number; y: number; z: number }[];
  // Card position in stage-local pixels, updated on scroll/resize.
  card: { x: number; y: number; w: number; h: number };
}

interface ViewportInfo {
  top: number;
  bottom: number;
  left: number;
}

export const FloatingOverlay: StoryObj = {
  render: function RenderFloatingOverlay() {
    const cityData = authServerCityData as CityData;
    const cityCenter = useMemo(
      () => ({
        x: (cityData.bounds.minX + cityData.bounds.maxX) / 2,
        z: (cityData.bounds.minZ + cityData.bounds.maxZ) / 2,
      }),
      [cityData.bounds],
    );

    const fileColorLayers = useMemo(
      () => createFileColorHighlightLayers(cityData.buildings),
      [cityData.buildings],
    );

    const resolvedSnippets = useMemo(
      () =>
        SNIPPETS.flatMap(s => {
          const building = cityData.buildings.find(b => b.path === s.path);
          return building ? [{ snippet: s, building }] : [];
        }),
      [cityData.buildings],
    );

    const stageRef = useRef<HTMLDivElement | null>(null);
    const canvasWrapRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const svgRef = useRef<SVGSVGElement | null>(null);
    const pathRefs = useRef<Map<string, SVGPathElement | null>>(new Map());
    const anchorMarkerRefs = useRef<Map<string, SVGRectElement | null>>(new Map());
    const cardDotRefs = useRef<Map<string, SVGCircleElement | null>>(new Map());

    const [seenPaths, setSeenPaths] = useState<Set<string>>(new Set());
    const [manualApproved, setManualApproved] = useState<Set<string>>(new Set());
    // Auto-approved is derived from scroll position (`cardBottom < vpMid`),
    // which lives in refs and changes without React knowing. We promote it
    // into state from inside `measure()` so highlightLayers / card UI
    // re-render when a card crosses the midline.
    const [autoApproved, setAutoApproved] = useState<Set<string>>(new Set());
    const [hasStarted, setHasStarted] = useState(false);
    const seenTimersRef = useRef<Map<string, number>>(new Map());
    const seenPathsRef = useRef(seenPaths);
    seenPathsRef.current = seenPaths;
    const manualApprovedRef = useRef(manualApproved);
    manualApprovedRef.current = manualApproved;
    const autoApprovedRef = useRef(autoApproved);
    autoApprovedRef.current = autoApproved;

    // ------------------------------------------------------------------------
    // Card layout: stage-local card rectangles + the building's world position.
    // Updated on scroll and resize; NOT updated on every camera frame.
    // ------------------------------------------------------------------------
    const cardLayoutsRef = useRef<Map<string, CardLayout>>(new Map());
    const viewportRef = useRef<ViewportInfo | null>(null);
    const stageOriginRef = useRef<{ left: number; top: number; w: number; h: number }>({
      left: 0,
      top: 0,
      w: 0,
      h: 0,
    });
    const canvasRectRef = useRef<{ left: number; top: number; w: number; h: number }>({
      left: 0,
      top: 0,
      w: 0,
      h: 0,
    });

    useLayoutEffect(() => {
      const stage = stageRef.current;
      const canvasWrap = canvasWrapRef.current;
      if (!stage || !canvasWrap) return;

      const measure = () => {
        const stageRect = stage.getBoundingClientRect();
        const canvasRect = canvasWrap.getBoundingClientRect();
        const scrollRect = scrollContainerRef.current?.getBoundingClientRect();
        const panelRect = panelRef.current?.getBoundingClientRect();

        stageOriginRef.current = {
          left: stageRect.left,
          top: stageRect.top,
          w: stageRect.width,
          h: stageRect.height,
        };
        canvasRectRef.current = {
          left: canvasRect.left - stageRect.left,
          top: canvasRect.top - stageRect.top,
          w: canvasRect.width,
          h: canvasRect.height,
        };

        viewportRef.current = scrollRect
          ? {
              top: scrollRect.top - stageRect.top,
              bottom: scrollRect.bottom - stageRect.top,
              left: panelRect
                ? panelRect.left - stageRect.left
                : scrollRect.left - stageRect.left,
            }
          : null;

        const next = new Map<string, CardLayout>();
        let anyVisible = false;
        for (const { snippet, building } of resolvedSnippets) {
          const card = cardRefs.current.get(snippet.path);
          if (!card) continue;
          const cardRect = card.getBoundingClientRect();
          const cardLocal = {
            x: cardRect.left - stageRect.left,
            y: cardRect.top - stageRect.top,
            w: cardRect.width,
            h: cardRect.height,
          };
          const wx = building.position.x - cityCenter.x;
          const wz = building.position.z - cityCenter.z;
          const halfW = building.dimensions[0] / 2;
          const halfD = building.dimensions[2] / 2;
          // Footprint corners on the y=0 plane, ordered for a closed polygon
          // (TL, TR, BR, BL).
          const corners = [
            { x: wx - halfW, y: 0, z: wz - halfD },
            { x: wx + halfW, y: 0, z: wz - halfD },
            { x: wx + halfW, y: 0, z: wz + halfD },
            { x: wx - halfW, y: 0, z: wz + halfD },
          ];
          next.set(snippet.path, {
            path: snippet.path,
            world: { x: wx, y: 0, z: wz },
            corners,
            card: cardLocal,
          });
          if (
            viewportRef.current &&
            cardLocal.y < viewportRef.current.bottom &&
            cardLocal.y + cardLocal.h > viewportRef.current.top
          ) {
            anyVisible = true;
          }
        }
        cardLayoutsRef.current = next;

        if (
          viewportRef.current &&
          !hasStarted &&
          [...next.values()].some(c => c.card.y < viewportRef.current!.bottom)
        ) {
          setHasStarted(true);
        }

        // Dwell tracking — same logic as the v1 prototype but driven by the
        // refs we just updated.
        if (viewportRef.current) {
          const vp = viewportRef.current;
          const vpMid = (vp.top + vp.bottom) / 2;
          const visibleNow = new Set<string>();
          for (const c of next.values()) {
            const cardTop = c.card.y;
            const cardBottom = c.card.y + c.card.h;
            if (cardBottom > vp.top && cardTop < vp.bottom) {
              visibleNow.add(c.path);
            }
          }
          for (const p of visibleNow) {
            if (seenPathsRef.current.has(p)) continue;
            if (seenTimersRef.current.has(p)) continue;
            const id = window.setTimeout(() => {
              seenTimersRef.current.delete(p);
              setSeenPaths(prev => {
                if (prev.has(p)) return prev;
                const nextSeen = new Set(prev);
                nextSeen.add(p);
                return nextSeen;
              });
            }, DWELL_MS);
            seenTimersRef.current.set(p, id);
          }
          for (const [p, id] of seenTimersRef.current) {
            if (!visibleNow.has(p)) {
              clearTimeout(id);
              seenTimersRef.current.delete(p);
            }
          }

          // Promote auto-approval into React state so highlightLayers /
          // card UI track scroll position. Only setState when the set
          // actually changes (cheap superset comparison).
          const wantAuto = new Set<string>();
          for (const c of next.values()) {
            if (
              seenPathsRef.current.has(c.path) &&
              c.card.y + c.card.h < vpMid
            ) {
              wantAuto.add(c.path);
            }
          }
          const cur = autoApprovedRef.current;
          let same = wantAuto.size === cur.size;
          if (same) {
            for (const p of wantAuto) {
              if (!cur.has(p)) {
                same = false;
                break;
              }
            }
          }
          if (!same) setAutoApproved(wantAuto);
        }

        void anyVisible;
      };

      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(stage);
      ro.observe(canvasWrap);
      if (panelRef.current) ro.observe(panelRef.current);
      cardRefs.current.forEach(el => el && ro.observe(el));
      window.addEventListener('resize', measure);
      const scrollEl = scrollContainerRef.current;
      scrollEl?.addEventListener('scroll', measure, { passive: true });
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', measure);
        scrollEl?.removeEventListener('scroll', measure);
        for (const id of seenTimersRef.current.values()) clearTimeout(id);
        seenTimersRef.current.clear();
      };
    }, [cityCenter, resolvedSnippets, hasStarted]);

    // ------------------------------------------------------------------------
    // Approval state — derived from refs/state. Used both to drive React
    // rendering of the cards AND to color the per-frame SVG paths/markers.
    // ------------------------------------------------------------------------
    const approvalFor = useCallback(
      (path: string): 'manual' | 'auto' | 'pending' => {
        if (manualApprovedRef.current.has(path)) return 'manual';
        if (autoApprovedRef.current.has(path)) return 'auto';
        return 'pending';
      },
      [],
    );

    // The set of currently-approved paths. Both inputs are React state that
    // get committed by `measure()` and the manual button, so this useMemo
    // stays in sync with the UI.
    const approvalSet = useMemo(() => {
      const set = new Set<string>(manualApproved);
      for (const p of autoApproved) set.add(p);
      return set;
    }, [manualApproved, autoApproved]);

    const allApproved =
      resolvedSnippets.length > 0 &&
      resolvedSnippets.every(({ snippet }) => approvalSet.has(snippet.path));
    const showStartPrompt = !hasStarted && !allApproved;

    // ------------------------------------------------------------------------
    // 3D building borders via highlightLayers — these live in the city scene
    // and pan/zoom/rotate with the camera automatically.
    // ------------------------------------------------------------------------
    const highlightLayers = useMemo<HighlightLayer[]>(() => {
      // One border layer per status, plus an "approved" override at higher
      // priority so approved buildings display the green ring.
      const byStatus: Record<GitStatus, string[]> = {
        added: [],
        modified: [],
        deleted: [],
      };
      const approvedPaths: string[] = [];
      for (const { snippet } of resolvedSnippets) {
        if (approvalSet.has(snippet.path)) approvedPaths.push(snippet.path);
        else byStatus[snippet.status].push(snippet.path);
      }
      const layers: HighlightLayer[] = [];
      // BorderHighlights renders thickness = max(0.2, borderWidth * 0.1)
      // in WORLD units, not screen pixels. The auth-server city is ~1200
      // world units across, so anything under ~10 is sub-visible from the
      // flat camera. 30 → 3 world units → readable line on each building.
      (Object.keys(byStatus) as GitStatus[]).forEach((status, i) => {
        if (byStatus[status].length === 0) return;
        layers.push({
          id: `pr-${status}`,
          name: `PR — ${status}`,
          enabled: true,
          color: STATUS_COLOR[status],
          priority: 10 + i,
          borderWidth: 30,
          items: byStatus[status].map(path => ({
            path,
            type: 'file',
            renderStrategy: 'border',
          })),
        });
      });
      if (approvedPaths.length > 0) {
        layers.push({
          id: 'pr-approved',
          name: 'PR — approved',
          enabled: true,
          color: APPROVED_COLOR,
          priority: 100,
          borderWidth: 45,
          items: approvedPaths.map(path => ({
            path,
            type: 'file',
            renderStrategy: 'border',
          })),
        });
      }
      return layers;
    }, [resolvedSnippets, approvalSet]);

    // ------------------------------------------------------------------------
    // Per-frame SVG update — runs inside R3F's render loop. Projects each
    // building's world position through the live camera, recomputes the
    // bezier path to the card edge, and writes attributes imperatively.
    // No setState here — the SVG element refs are updated directly so we
    // don't trigger React reconciliation 60 times a second.
    // ------------------------------------------------------------------------
    const projectScratch = useRef(new THREE.Vector3());

    const onCameraFrame = useCallback<OnCameraFrame>(
      (camera, size) => {
        const vp = viewportRef.current;
        const canvasLocal = canvasRectRef.current;
        if (size.width === 0 || size.height === 0) return;

        const layouts = cardLayoutsRef.current;
        const v = projectScratch.current;

        for (const layout of layouts.values()) {
          const path = layout.path;
          const pathEl = pathRefs.current.get(path);
          const anchorEl = anchorMarkerRefs.current.get(path);
          const dotEl = cardDotRefs.current.get(path);

          // Project world point → NDC → canvas-local pixels → stage pixels.
          v.set(layout.world.x, layout.world.y, layout.world.z).project(camera);
          // For a point behind the camera the homogeneous divide flips the
          // sign of x/y, so guard against that. Otherwise let the projected
          // point go anywhere — we don't need it to be inside the canvas;
          // overflow:visible lets the bezier extend past the stage edges.
          const behindCamera = v.z > 1;
          const sxCanvas = (v.x * 0.5 + 0.5) * size.width;
          const syCanvas = (v.y * -0.5 + 0.5) * size.height;
          const sx = canvasLocal.left + sxCanvas;
          const sy = canvasLocal.top + syCanvas;

          // Approval state drives color + visibility.
          const approval = approvalFor(path);
          const snippet = resolvedSnippets.find(
            s => s.snippet.path === path,
          )?.snippet;
          const baseColor = snippet ? STATUS_COLOR[snippet.status] : '#9ca3af';

          // Card-side anchor: panel left edge at the card's vertical center,
          // clamped to the visible portion of the scroll viewport so the line
          // recedes as the card scrolls offscreen.
          if (!vp) {
            pathEl?.setAttribute('opacity', '0');
            anchorEl?.setAttribute('opacity', '0');
            dotEl?.setAttribute('opacity', '0');
            continue;
          }
          const cardCenterY = layout.card.y + layout.card.h / 2;
          let intersection = 0;
          if (cardCenterY < vp.top) intersection = vp.top - cardCenterY;
          else if (cardCenterY > vp.bottom) intersection = cardCenterY - vp.bottom;
          const lineOpacity = Math.max(0, 1 - intersection / FADE_PX);
          const clampedY = Math.max(vp.top, Math.min(vp.bottom, cardCenterY));
          // Land on the card's left edge — the SVG sits above the panel
          // (zIndex 11) so the segment crossing the panel padding is visible.
          const bx = layout.card.x;
          const by = clampedY;

          // Hide the leader-line when the snippet is approved (the 3D border
          // alone carries that state, same as the v1 prototype).
          const lineVisible =
            !behindCamera && approval === 'pending' && lineOpacity > 0;

          if (pathEl) {
            if (!lineVisible) {
              pathEl.setAttribute('opacity', '0');
            } else {
              const dx = Math.max(80, (bx - sx) * 0.5);
              const d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${bx - dx} ${by}, ${bx} ${by}`;
              pathEl.setAttribute('d', d);
              pathEl.setAttribute('stroke', baseColor);
              pathEl.setAttribute('opacity', String(0.85 * lineOpacity));
            }
          }

          if (anchorEl) {
            if (!lineVisible) {
              anchorEl.setAttribute('opacity', '0');
            } else {
              anchorEl.setAttribute('x', String(sx - 3.5));
              anchorEl.setAttribute('y', String(sy - 3.5));
              anchorEl.setAttribute('fill', baseColor);
              anchorEl.setAttribute('opacity', String(lineOpacity));
            }
          }

          if (dotEl) {
            if (!lineVisible) {
              dotEl.setAttribute('opacity', '0');
            } else {
              dotEl.setAttribute('cx', String(bx));
              dotEl.setAttribute('cy', String(by));
              dotEl.setAttribute('fill', baseColor);
              dotEl.setAttribute('opacity', String(lineOpacity));
            }
          }
        }
      },
      [approvalFor, resolvedSnippets],
    );

    const toggleManual = (path: string) =>
      setManualApproved(prev => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });

    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f1419',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#1f2937',
            borderBottom: '1px solid #374151',
            color: '#9ca3af',
            fontSize: 13,
            zIndex: 50,
          }}
        >
          PR review prototype (3D flat) — {approvalSet.size}/
          {resolvedSnippets.length} approved. Drag to pan the city, scroll a
          card past the midpoint to auto-approve, click "approve" to make it
          sticky.
        </div>

        <div
          ref={stageRef}
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            ref={canvasWrapRef}
            style={{ position: 'absolute', inset: 0 }}
          >
            <FileCity3D
              cityData={cityData}
              width="100%"
              height="100%"
              fileColorLayers={fileColorLayers}
              highlightLayers={highlightLayers}
              isolationMode="none"
              backgroundColor="#0f1419"
              textColor="#94a3b8"
              isGrown={false}
              animation={{
                startFlat: true,
                autoStartDelay: null,
                staggerDelay: 0,
                tension: 200,
                friction: 24,
              }}
              showControls={false}
              onCameraFrame={onCameraFrame}
            />
          </div>

          {/* Floating snippet rail — translucent + blurred, anchored top-right
              like FileCityExplorer's overlays. Scrollable. */}
          <div
            ref={panelRef}
            style={{
              position: 'absolute',
              top: PANEL_INSET,
              right: PANEL_INSET,
              bottom: PANEL_INSET,
              width: PANEL_WIDTH,
              borderRadius: 12,
              border: '1px solid rgba(55, 65, 81, 0.6)',
              backgroundColor: 'rgba(11, 15, 20, 0.65)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            <div
              ref={scrollContainerRef}
              style={{
                position: 'absolute',
                inset: 0,
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  padding: 20,
                  paddingTop: 'calc(100vh - 120px)',
                  paddingBottom: 'calc(70vh)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {resolvedSnippets.map(({ snippet }) => {
                  const statusColor = STATUS_COLOR[snippet.status];
                  const isManual = manualApproved.has(snippet.path);
                  const isApproved = approvalSet.has(snippet.path);
                  const borderColor = isApproved ? APPROVED_COLOR : statusColor;
                  const borderStyle = isApproved ? 'solid' : 'dashed';
                  return (
                    <div
                      key={snippet.path}
                      ref={el => {
                        cardRefs.current.set(snippet.path, el);
                      }}
                      style={{
                        backgroundColor: 'rgba(17, 24, 39, 0.92)',
                        border: `1.5px ${borderStyle} ${
                          isApproved ? APPROVED_COLOR : '#374151'
                        }`,
                        borderRadius: 8,
                        padding: 14,
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                        borderLeft: `3px solid ${borderColor}`,
                        transition: 'border-color 200ms ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                              color: statusColor,
                              padding: '2px 6px',
                              borderRadius: 3,
                              backgroundColor: `${statusColor}22`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {STATUS_LABEL[snippet.status]}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#9ca3af',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {snippet.label}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleManual(snippet.path)}
                          style={{
                            fontSize: 10,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase',
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: `1px solid ${
                              isManual ? APPROVED_COLOR : '#374151'
                            }`,
                            backgroundColor: isManual
                              ? 'rgba(34, 197, 94, 0.15)'
                              : isApproved
                                ? 'rgba(34, 197, 94, 0.08)'
                                : 'transparent',
                            color: isApproved ? APPROVED_COLOR : '#9ca3af',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {isManual
                            ? '✓ approved'
                            : isApproved
                              ? '✓ auto'
                              : 'approve'}
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          fontSize: 11.5,
                          lineHeight: 1.5,
                          color: '#e5e7eb',
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {snippet.code}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SVG overlay with empty per-snippet shells — actual geometry is
              written imperatively each frame inside `onCameraFrame`. */}
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'visible',
              // Above the panel (zIndex 10) so the line and card-side dot
              // are visible across the panel's translucent gutter; below the
              // start prompt (15) and review-complete overlay (20).
              zIndex: 11,
            }}
          >
            {resolvedSnippets.map(({ snippet }) => (
              <g key={snippet.path}>
                <path
                  ref={el => {
                    pathRefs.current.set(snippet.path, el);
                  }}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0}
                />
                <rect
                  ref={el => {
                    anchorMarkerRefs.current.set(snippet.path, el);
                  }}
                  width={7}
                  height={7}
                  stroke="#0f1419"
                  strokeWidth={1.25}
                  opacity={0}
                />
                <circle
                  ref={el => {
                    cardDotRefs.current.set(snippet.path, el);
                  }}
                  r={3}
                  opacity={0}
                />
              </g>
            ))}
          </svg>

          <style>{`
            @keyframes leaderline3d-review-pop {
              0% { transform: scale(0.6) rotate(-12deg); opacity: 0; }
              60% { transform: scale(1.15) rotate(2deg); opacity: 1; }
              100% { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes leaderline3d-check-draw {
              from { stroke-dashoffset: 48; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes leaderline3d-ring-pulse {
              0% { transform: scale(0.85); opacity: 0.9; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes leaderline3d-arrow-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.7; }
              50% { transform: translateY(8px); opacity: 1; }
            }
          `}</style>

          <div
            style={{
              position: 'absolute',
              top: PANEL_INSET,
              right: PANEL_INSET,
              bottom: PANEL_INSET,
              width: PANEL_WIDTH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              opacity: showStartPrompt ? 1 : 0,
              transition: 'opacity 300ms ease-out',
              zIndex: 15,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                color: '#9ca3af',
                textAlign: 'center',
                padding: '0 24px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                  color: '#6b7280',
                }}
              >
                {resolvedSnippets.length} files changed
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#e5e7eb',
                  letterSpacing: 0.3,
                }}
              >
                Scroll to Start Code Review
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', maxWidth: 260 }}>
                Each snippet you scroll past the midpoint line is auto-approved.
              </div>
              <svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  marginTop: 4,
                  animation:
                    'leaderline3d-arrow-bounce 1400ms ease-in-out infinite',
                }}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: PANEL_INSET,
              right: PANEL_INSET,
              bottom: PANEL_INSET,
              width: PANEL_WIDTH,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              backgroundColor: allApproved
                ? 'rgba(11, 15, 20, 0.78)'
                : 'transparent',
              backdropFilter: allApproved ? 'blur(2px)' : 'none',
              opacity: allApproved ? 1 : 0,
              transition:
                'opacity 350ms ease-out, background-color 350ms ease-out',
              zIndex: 20,
            }}
          >
            <div
              key={allApproved ? 'shown' : 'hidden'}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                animation: allApproved
                  ? 'leaderline3d-review-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
                  : 'none',
              }}
            >
              <div style={{ position: 'relative', width: 84, height: 84 }}>
                {allApproved && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      border: `2px solid ${APPROVED_COLOR}`,
                      animation:
                        'leaderline3d-ring-pulse 900ms ease-out 200ms both',
                    }}
                  />
                )}
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: `2px solid ${APPROVED_COLOR}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l4.5 4.5L19 7"
                      stroke={APPROVED_COLOR}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={48}
                      style={{
                        animation: allApproved
                          ? 'leaderline3d-check-draw 450ms ease-out 250ms both'
                          : 'none',
                      }}
                    />
                  </svg>
                </div>
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: '#e5e7eb',
                  letterSpacing: 0.3,
                }}
              >
                Review Completed
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af' }}>
                {approvalSet.size} of {resolvedSnippets.length} files approved
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};
