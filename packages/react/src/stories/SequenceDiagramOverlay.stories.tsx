import { useCallback, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import '@xyflow/react/dist/style.css';
import { SequenceDiagramRenderer } from '@principal-ai/principal-view-react';
import type {
  SequenceEvent,
  SequenceEdge,
} from '@principal-ai/principal-view-react';

import { FileCity3D } from '../components/FileCity3D';
import type { CityData, HighlightLayer } from '../components/FileCity3D';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Prototypes/Sequence Diagram Overlay (3D)',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

/**
 * Hand-tagged auth-server flow: each event carries a `filePath` in its
 * `data` bag pointing at a real building in the auth-server city data.
 * Clicking a step in the diagram drives `selectedPath` on the city below.
 */
const AUTH_FLOW: { events: SequenceEvent[]; edges: SequenceEdge[] } = {
  events: [
    {
      id: '1',
      name: 'request.middleware.intercepted',
      label: 'Middleware Intercepts',
      data: { filePath: 'auth-server/src/middleware.ts' },
    },
    {
      id: '2',
      name: 'workos.start.requested',
      label: 'Start WorkOS Auth',
      data: {
        filePath: 'auth-server/src/app/api/auth/workos/start/route.ts',
      },
    },
    {
      id: '3',
      name: 'workos.callback.received',
      label: 'Callback Received',
      data: {
        filePath: 'auth-server/src/app/api/auth/workos/callback/route.ts',
      },
    },
    {
      id: '4',
      name: 'workos.token.exchanged',
      label: 'Exchange Code → Token',
      data: {
        filePath: 'auth-server/src/app/api/auth/workos/token/route.ts',
      },
    },
    {
      id: '5',
      name: 'token.stored',
      label: 'Persist Token',
      data: { filePath: 'auth-server/src/lib/token-store.ts' },
    },
    {
      id: '6',
      name: 'session.created',
      label: 'Create Session',
      data: { filePath: 'auth-server/src/lib/auth-session-manager.ts' },
    },
    {
      id: '7',
      name: 'org.membership.checked',
      label: 'Check Org Membership',
      data: { filePath: 'auth-server/src/lib/org-membership.ts' },
    },
    {
      id: '8',
      name: 'cli.room-token.minted',
      label: 'Mint CLI Room Token',
      data: {
        filePath: 'auth-server/src/app/api/auth/cli/room-token/route.ts',
      },
    },
    {
      id: '9',
      name: 'workos.token.verified',
      label: 'Verify Token',
      data: {
        filePath: 'auth-server/src/app/api/auth/workos/verify/route.ts',
      },
    },
    {
      id: '10',
      name: 'user.fetched',
      label: 'Fetch User',
      data: { filePath: 'auth-server/src/app/api/auth/user/route.ts' },
    },
  ],
  edges: [
    { id: 'e1', fromEvent: '1', toEvent: '2' },
    { id: 'e2', fromEvent: '2', toEvent: '3' },
    { id: 'e3', fromEvent: '3', toEvent: '4' },
    { id: 'e4', fromEvent: '4', toEvent: '5' },
    { id: 'e5', fromEvent: '5', toEvent: '6' },
    { id: 'e6', fromEvent: '6', toEvent: '7' },
    { id: 'e7', fromEvent: '7', toEvent: '8' },
    { id: 'e8', fromEvent: '8', toEvent: '9' },
    { id: 'e9', fromEvent: '9', toEvent: '10' },
  ],
};

type Story = StoryObj;

const OVERLAY_HEIGHT_PCT = 50;
const COLLAPSE_MS = 320;

export const Default: Story = {
  render: () => {
    const cityData = useMemo(() => authServerCityData as CityData, []);
    const [opacity, setOpacity] = useState(0.85);
    const [interactive, setInteractive] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(
      null,
    );

    const eventById = useMemo(() => {
      const m = new Map<string, SequenceEvent>();
      for (const e of AUTH_FLOW.events) m.set(e.id, e);
      return m;
    }, []);

    const selectedPath = useMemo(() => {
      if (!selectedEventId) return null;
      const e = eventById.get(selectedEventId);
      const fp = e?.data?.filePath;
      return typeof fp === 'string' ? fp : null;
    }, [selectedEventId, eventById]);

    const highlightLayers = useMemo<HighlightLayer[]>(() => {
      if (!selectedPath) return [];
      return [
        {
          id: 'sequence-selection',
          name: 'Sequence Selection',
          enabled: true,
          color: '#22d3ee',
          opacity: 0.9,
          borderWidth: 4,
          priority: 100,
          items: [
            {
              path: selectedPath,
              type: 'file',
              renderStrategy: 'fill',
            },
          ],
        },
      ];
    }, [selectedPath]);

    const handleNodeClick = useCallback((nodeId: string) => {
      setSelectedEventId(prev => (prev === nodeId ? null : nodeId));
    }, []);

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0b0f14',
          overflow: 'hidden',
        }}
      >
        {/* 2D city background (flat mode) */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <FileCity3D
            cityData={cityData}
            width="100%"
            height="100%"
            isGrown={false}
            backgroundColor="#0b0f14"
            highlightLayers={highlightLayers}
          />
        </div>

        {/* Semi-transparent sequence diagram overlay — bottom half, collapsible */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${OVERLAY_HEIGHT_PCT}vh`,
            transform: collapsed
              ? 'translateY(calc(100% - 36px))'
              : 'translateY(0)',
            transition: `transform ${COLLAPSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          {/* Drawer handle / collapse toggle pinned to the top edge */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 16,
              pointerEvents: 'auto',
            }}
          >
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                backgroundColor: 'rgba(17, 24, 39, 0.92)',
                border: '1px solid #374151',
                borderRadius: 999,
                color: '#e5e7eb',
                fontSize: 11,
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: `transform ${COLLAPSE_MS}ms ease`,
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                ▲
              </span>
              <span>{collapsed ? 'Show sequence' : 'Hide sequence'}</span>
            </button>
          </div>

          {/* Diagram pane */}
          <div
            style={{
              position: 'absolute',
              top: 36,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: collapsed ? 0 : opacity,
              pointerEvents: interactive && !collapsed ? 'auto' : 'none',
              transition: `opacity ${COLLAPSE_MS}ms ease`,
            }}
          >
            <SequenceDiagramRenderer
              events={AUTH_FLOW.events}
              edges={AUTH_FLOW.edges}
              width="100%"
              height="100%"
              showControls={false}
              showBackground={false}
              stickyHeaders
              showEventLabels
              selectedNodeId={selectedEventId ?? undefined}
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>

        {/* Settings gear button — always visible, toggles the panel */}
        <button
          onClick={() => setSettingsOpen(o => !o)}
          aria-label={settingsOpen ? 'Hide settings' : 'Show settings'}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 60,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: settingsOpen
              ? 'rgba(34, 211, 238, 0.18)'
              : 'rgba(17, 24, 39, 0.92)',
            border: `1px solid ${settingsOpen ? '#22d3ee' : '#374151'}`,
            borderRadius: 8,
            color: settingsOpen ? '#22d3ee' : '#e5e7eb',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
            transition:
              'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              stroke="currentColor"
              strokeWidth={1.7}
            />
            <path
              d="M19.4 13.6a7.7 7.7 0 000-3.2l1.7-1.3-1.8-3.1-2 .8a7.7 7.7 0 00-2.8-1.6l-.3-2.1h-3.6l-.3 2.1a7.7 7.7 0 00-2.8 1.6l-2-.8-1.8 3.1 1.7 1.3a7.7 7.7 0 000 3.2l-1.7 1.3 1.8 3.1 2-.8a7.7 7.7 0 002.8 1.6l.3 2.1h3.6l.3-2.1a7.7 7.7 0 002.8-1.6l2 .8 1.8-3.1-1.7-1.3z"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Floating control panel */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 64,
            zIndex: 50,
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid #374151',
            borderRadius: 10,
            padding: '14px 16px',
            color: '#e5e7eb',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minWidth: 240,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            transformOrigin: 'top left',
            transform: settingsOpen
              ? 'translateX(0) scale(1)'
              : 'translateX(-8px) scale(0.96)',
            opacity: settingsOpen ? 1 : 0,
            pointerEvents: settingsOpen ? 'auto' : 'none',
            transition:
              'opacity 180ms ease, transform 180ms ease',
          }}
        >
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: '#9ca3af',
            }}
          >
            Sequence Diagram Overlay
          </div>

          <label
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Opacity</span>
              <span style={{ color: '#9ca3af' }}>{opacity.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={e => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <input
              type="checkbox"
              checked={interactive}
              onChange={e => setInteractive(e.target.checked)}
            />
            <span>Interactive (capture pointer)</span>
          </label>

          <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>
            Click an event to highlight the matching file in the city below.
            Use the handle at the seam to slide the diagram down.
          </div>

          {selectedPath && (
            <div
              style={{
                marginTop: 4,
                paddingTop: 10,
                borderTop: '1px solid #1f2937',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: '#9ca3af',
                }}
              >
                Selected
              </div>
              <code
                style={{
                  fontSize: 11,
                  color: '#e5e7eb',
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  wordBreak: 'break-all',
                }}
              >
                {selectedPath}
              </code>
            </div>
          )}
        </div>
      </div>
    );
  },
};
