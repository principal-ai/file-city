import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { ArchitectureMapHighlightLayers } from '../components/ArchitectureMapHighlightLayers';
import type { CityData } from '../components/FileCity3D';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Prototypes/Leader Line Snippet Overlay',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

// Mirrors the default `padding` inside ArchitectureMapHighlightLayers, so the
// world->screen math here lines up with what the canvas actually draws.
const CANVAS_PADDING = 20;

const PANEL_WIDTH = 380;
const FADE_PX = 60; // distance over which a line fades after its card leaves the viewport
const DWELL_MS = 400; // card must be visible for this long before scroll-past auto-approves it
const APPROVED_COLOR = '#22c55e';
const BUILDING_RECT_INSET = -3; // outset px so the border sits around (not on top of) the building

type GitStatus = 'added' | 'modified' | 'deleted';

// GitHub-style diff palette. Approved is a brighter, more saturated green
// (#22c55e) so it reads as "settled" against the softer "added" green.
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

interface FitParams {
  scale: number;
  offsetX: number;
  offsetZ: number;
}

// Replicates calculateScaleAndOffset from ArchitectureMapHighlightLayers.
function fitCityToBox(
  bounds: CityData['bounds'],
  width: number,
  height: number,
  padding: number,
): FitParams {
  const cityWidth = bounds.maxX - bounds.minX;
  const cityDepth = bounds.maxZ - bounds.minZ;
  const horizontalPadding = padding;
  const verticalPadding = padding * 2;
  const scaleX = (width - horizontalPadding) / cityDepth;
  const scaleZ = (height - verticalPadding) / cityWidth;
  const scale = Math.min(scaleX, scaleZ);
  const scaledCityWidth = cityDepth * scale;
  const scaledCityHeight = cityWidth * scale;
  return {
    scale,
    offsetX: (width - scaledCityWidth) / 2,
    offsetZ: (height - scaledCityHeight) / 2,
  };
}

interface ItemLayout {
  path: string;
  buildingAnchor: { x: number; y: number };
  buildingRect: { x: number; y: number; w: number; h: number };
  card: { x: number; y: number; w: number; h: number };
}

interface StageLayout {
  stageW: number;
  stageH: number;
  viewport: { top: number; bottom: number } | null;
  items: ItemLayout[];
}

export const SingleLeaderLine: StoryObj = {
  render: function RenderLeaderLines() {
    const cityData = authServerCityData as CityData;
    const highlightLayers = createFileColorHighlightLayers(cityData.buildings);

    // Resolve which snippets actually have buildings in the dataset.
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
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    const [layout, setLayout] = useState<StageLayout>({
      stageW: 0,
      stageH: 0,
      viewport: null,
      items: [],
    });

    // Cards that have been visible for >= DWELL_MS at some point this session.
    // Sticky for the session. Auto-approval = seen && currently above viewport.
    const [seenPaths, setSeenPaths] = useState<Set<string>>(new Set());
    // Manual approvals. Sticky relative to scroll: scrolling back never undoes
    // these. Click again to toggle off.
    const [manualApproved, setManualApproved] = useState<Set<string>>(new Set());

    // Pending dwell timers per path; read inside `measure` via a ref so we
    // don't have to depend on rapidly-changing state.
    const seenTimersRef = useRef<Map<string, number>>(new Map());
    const seenPathsRef = useRef(seenPaths);
    seenPathsRef.current = seenPaths;

    useLayoutEffect(() => {
      const stage = stageRef.current;
      const canvasWrap = canvasWrapRef.current;
      if (!stage || !canvasWrap) return;

      const measure = () => {
        const stageRect = stage.getBoundingClientRect();
        const canvasRect = canvasWrap.getBoundingClientRect();
        const scrollRect = scrollContainerRef.current?.getBoundingClientRect();

        const fit = fitCityToBox(
          cityData.bounds,
          canvasRect.width,
          canvasRect.height,
          CANVAS_PADDING,
        );

        const items: ItemLayout[] = resolvedSnippets.flatMap(({ snippet, building }) => {
          const card = cardRefs.current.get(snippet.path);
          if (!card) return [];
          const cardRect = card.getBoundingClientRect();

          const buildingX =
            (building.position.x - cityData.bounds.minX) * fit.scale + fit.offsetX;
          const buildingY =
            (building.position.z - cityData.bounds.minZ) * fit.scale + fit.offsetZ;
          const halfW = (building.dimensions[0] / 2) * fit.scale;
          const halfH = (building.dimensions[2] / 2) * fit.scale;
          const stageBuildingX = canvasRect.left - stageRect.left + buildingX;
          const stageBuildingY = canvasRect.top - stageRect.top + buildingY;

          return [
            {
              path: snippet.path,
              buildingAnchor: { x: stageBuildingX, y: stageBuildingY },
              buildingRect: {
                x: stageBuildingX - halfW + BUILDING_RECT_INSET,
                y: stageBuildingY - halfH + BUILDING_RECT_INSET,
                w: halfW * 2 - BUILDING_RECT_INSET * 2,
                h: halfH * 2 - BUILDING_RECT_INSET * 2,
              },
              card: {
                x: cardRect.left - stageRect.left,
                y: cardRect.top - stageRect.top,
                w: cardRect.width,
                h: cardRect.height,
              },
            },
          ];
        });

        const viewport = scrollRect
          ? {
              top: scrollRect.top - stageRect.top,
              bottom: scrollRect.bottom - stageRect.top,
            }
          : null;

        setLayout({
          stageW: stageRect.width,
          stageH: stageRect.height,
          viewport,
          items,
        });

        // Track dwell: any card overlapping the viewport gets a timer that
        // adds it to `seenPaths` after DWELL_MS. If it leaves before then,
        // cancel. Already-seen paths are ignored.
        if (viewport) {
          const visibleNow = new Set<string>();
          for (const it of items) {
            const cardTop = it.card.y;
            const cardBottom = it.card.y + it.card.h;
            if (cardBottom > viewport.top && cardTop < viewport.bottom) {
              visibleNow.add(it.path);
            }
          }
          for (const p of visibleNow) {
            if (seenPathsRef.current.has(p)) continue;
            if (seenTimersRef.current.has(p)) continue;
            const id = window.setTimeout(() => {
              seenTimersRef.current.delete(p);
              setSeenPaths(prev => {
                if (prev.has(p)) return prev;
                const next = new Set(prev);
                next.add(p);
                return next;
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
        }
      };

      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(stage);
      ro.observe(canvasWrap);
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
    }, [cityData.bounds, resolvedSnippets]);

    const toggleManual = (path: string) =>
      setManualApproved(prev => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });

    // Per-snippet approval state: manual is sticky; auto fires once a card
    // has been seen (>= DWELL_MS visible) AND its bottom edge has cleared
    // the viewport's vertical midpoint (the whole card is above the line).
    const approvalFor = (path: string, cardBottomY: number, vpMid: number) => {
      if (manualApproved.has(path)) return 'manual' as const;
      if (seenPaths.has(path) && cardBottomY < vpMid) return 'auto' as const;
      return 'pending' as const;
    };

    // Build the per-snippet rendering data: clamp anchor to the viewport so
    // the line recedes (and fades) as the card scrolls out of view.
    const renderItems = layout.items.flatMap(item => {
      if (!layout.viewport) return [];
      const cardCenterY = item.card.y + item.card.h / 2;
      const { top, bottom } = layout.viewport;

      // Fade based on the leader-line intersection point only — the card's
      // vertical center. Once that point leaves the viewport, fade out over
      // FADE_PX of further scroll.
      let intersectionDistance = 0;
      if (cardCenterY < top) intersectionDistance = top - cardCenterY;
      else if (cardCenterY > bottom) intersectionDistance = cardCenterY - bottom;
      const lineOpacity = Math.max(0, 1 - intersectionDistance / FADE_PX);

      const clampedY = Math.max(top, Math.min(bottom, cardCenterY));
      const a = item.buildingAnchor;
      const b = { x: item.card.x, y: clampedY };
      const dx = Math.max(80, (b.x - a.x) * 0.5);
      const path = `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;

      const snippet = resolvedSnippets.find(s => s.snippet.path === item.path)?.snippet;
      const cardBottomY = item.card.y + item.card.h;
      const approval = approvalFor(item.path, cardBottomY, (top + bottom) / 2);
      const color = snippet ? STATUS_COLOR[snippet.status] : '#9ca3af';

      return [
        {
          path: item.path,
          color,
          d: path,
          buildingAnchor: a,
          buildingRect: item.buildingRect,
          panelAnchor: b,
          lineOpacity,
          approval,
        },
      ];
    });

    const approvalSet = new Set(
      renderItems.filter(r => r.approval !== 'pending').map(r => r.path),
    );

    const allApproved =
      resolvedSnippets.length > 0 &&
      resolvedSnippets.every(({ snippet }) => approvalSet.has(snippet.path));

    // "Has started": any card has crossed into the viewport. Initial state
    // (cards still parked below the bottom padding) shows the start prompt.
    const hasStarted =
      layout.viewport != null &&
      layout.items.some(it => it.card.y < layout.viewport!.bottom);
    const showStartPrompt = !hasStarted && !allApproved;

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
          }}
        >
          PR review prototype — {approvalSet.size}/{resolvedSnippets.length}{' '}
          approved. Scroll a card fully past the middle line to auto-approve
          (dashed → solid green); click "approve" to make it sticky.
        </div>

        <div
          ref={stageRef}
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            minHeight: 0,
          }}
        >
          <div ref={canvasWrapRef} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <ArchitectureMapHighlightLayers
              cityData={cityData}
              highlightLayers={highlightLayers}
              fullSize
              canvasBackgroundColor="#0f1419"
              defaultBuildingColor="#36454F"
              defaultDirectoryColor="#111827"
              enableZoom={false}
            />
          </div>

          <div
            ref={scrollContainerRef}
            style={{
              width: PANEL_WIDTH,
              borderLeft: '1px solid #1f2937',
              backgroundColor: '#0b0f14',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: 24,
                // Start cards below the viewport so the user has to scroll
                // them in (the "Scroll to Start" overlay covers the empty
                // initial state).
                paddingTop: '100vh',
                // Enough bottom padding that the last card can scroll well
                // above the midpoint approval line.
                paddingBottom: '70vh',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
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
                      backgroundColor: '#111827',
                      border: `1.5px ${borderStyle} ${
                        isApproved ? APPROVED_COLOR : '#374151'
                      }`,
                      borderRadius: 8,
                      padding: 14,
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
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

          <svg
            width={layout.stageW}
            height={layout.stageH}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {/* Approval boundary guide line across the panel's vertical
                midpoint, so the threshold is visible while tuning. */}
            {layout.viewport && (
              <line
                x1={layout.stageW - PANEL_WIDTH}
                x2={layout.stageW}
                y1={(layout.viewport.top + layout.viewport.bottom) / 2}
                y2={(layout.viewport.top + layout.viewport.bottom) / 2}
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={0.4}
              />
            )}

            {/* Building borders: drawn for every snippet, not gated by line
                visibility — so approved buildings stay marked even after
                their card scrolls off. */}
            {renderItems.map(item => {
              const approved = item.approval !== 'pending';
              const stroke = approved ? APPROVED_COLOR : item.color;
              return (
                <rect
                  key={`border-${item.path}`}
                  x={item.buildingRect.x}
                  y={item.buildingRect.y}
                  width={item.buildingRect.w}
                  height={item.buildingRect.h}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={approved ? 2 : 1.5}
                  strokeDasharray={approved ? undefined : '3 3'}
                  rx={1.5}
                  ry={1.5}
                  opacity={approved ? 1 : 0.9}
                />
              );
            })}

            {/* Leader lines + endpoint markers: fade with the card and are
                hidden once the snippet is approved (the building border alone
                carries the approved state). */}
            {renderItems.map(item => {
              if (item.lineOpacity <= 0) return null;
              if (item.approval !== 'pending') return null;
              return (
                <g key={`line-${item.path}`} opacity={item.lineOpacity}>
                  <path
                    d={item.d}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    opacity={0.85}
                  />
                  <rect
                    x={item.buildingAnchor.x - 3.5}
                    y={item.buildingAnchor.y - 3.5}
                    width={7}
                    height={7}
                    fill={item.color}
                    stroke="#0f1419"
                    strokeWidth={1.25}
                  />
                  <circle
                    cx={item.panelAnchor.x}
                    cy={item.panelAnchor.y}
                    r={3}
                    fill={item.color}
                  />
                </g>
              );
            })}
          </svg>

          {/* Review-complete overlay: pinned over the panel column, fades
              and scales in once every snippet is approved. */}
          <style>{`
            @keyframes leaderline-review-pop {
              0% { transform: scale(0.6) rotate(-12deg); opacity: 0; }
              60% { transform: scale(1.15) rotate(2deg); opacity: 1; }
              100% { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes leaderline-check-draw {
              from { stroke-dashoffset: 48; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes leaderline-ring-pulse {
              0% { transform: scale(0.85); opacity: 0.9; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes leaderline-arrow-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.7; }
              50% { transform: translateY(8px); opacity: 1; }
            }
          `}</style>

          {/* Start prompt: shown until the user scrolls a card into view. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: PANEL_WIDTH,
              height: '100%',
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
                    'leaderline-arrow-bounce 1400ms ease-in-out infinite',
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
              top: 0,
              right: 0,
              width: PANEL_WIDTH,
              height: '100%',
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
                  ? 'leaderline-review-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
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
                        'leaderline-ring-pulse 900ms ease-out 200ms both',
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
                          ? 'leaderline-check-draw 450ms ease-out 250ms both'
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
