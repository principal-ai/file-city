import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import '@xyflow/react/dist/style.css';
import { WorkflowSequenceDiagram } from '@principal-ai/principal-view-react';
import { getEventTemplateString } from '@principal-ai/principal-view-core';
import type {
  ExtendedCanvas,
  ExtendedCanvasNode,
  WorkflowScenario,
} from '@principal-ai/principal-view-core';

import { FileCity3D } from '../components/FileCity3D';
import type { CityData, HighlightLayer } from '../components/FileCity3D';
import authServerCityData from '../../../../assets/auth-server-city-data.json';

const meta = {
  title: 'Prototypes/Workflow Sequence Diagram (3D Overlay)',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

const HAPPY_PATH: WorkflowScenario = {
  id: 'authenticated',
  priority: 1,
  description: 'User authenticates via WorkOS and a CLI room token is minted',
  template: {
    summary: 'Successful auth for {{user.login}}',
    events: {
      'request.middleware.intercepted': '{{http.method}} {{http.route}}',
      'workos.start.requested': 'Redirecting to WorkOS',
      'workos.callback.received': 'Callback received (code: {{code}})',
      'workos.token.exchanged':
        'Exchanged code for token (status: {{response.status}})',
      'session.created': 'Session minted for {{user.login}}',
      'org.membership.checked': 'Org membership verified ({{org}})',
      'cli.room_token.minted': 'CLI room token issued',
    },
  },
};

const UNAUTHENTICATED: WorkflowScenario = {
  id: 'unauthenticated',
  priority: 2,
  description: 'No valid session — middleware short-circuits the request',
  template: {
    summary: 'Not authenticated: {{reason}}',
    events: {
      'request.middleware.intercepted': '{{http.method}} {{http.route}}',
      'session.lookup': 'Looking up session (has_cookie: {{has_cookie}})',
      'session.unauthenticated': 'No valid session: {{reason}}',
    },
  },
};

const ERROR_PATH: WorkflowScenario = {
  id: 'error',
  priority: 3,
  description: 'WorkOS rejected the callback code',
  template: {
    summary: 'Auth failed: {{error.message}}',
    events: {
      'request.middleware.intercepted': '{{http.method}} {{http.route}}',
      'workos.start.requested': 'Redirecting to WorkOS',
      'workos.callback.received': 'Callback received (code: {{code}})',
      'workos.token.exchanged':
        'Token exchange failed (status: {{response.status}})',
      'workos.error': '{{error.type}}: {{error.message}}',
    },
  },
};

const SCENARIOS: WorkflowScenario[] = [
  HAPPY_PATH,
  UNAUTHENTICATED,
  ERROR_PATH,
];

/**
 * Inline OTEL canvas covering every event referenced by the scenarios above.
 * The diagram uses `otel.scope` to assign swimlanes; on selection we read
 * `otel.files` (primary instrumentation site) and `otel.references` (related
 * code) to drive two distinctly-colored highlight layers.
 */
const eventNode = (
  id: string,
  label: string,
  eventName: string,
  scope: string,
  files: string[],
  references: string[] = [],
): ExtendedCanvasNode =>
  ({
    id,
    type: 'otel-event',
    x: 0,
    y: 0,
    width: 220,
    height: 80,
    label,
    event: { name: eventName },
    otel: { scope, files, references, status: 'implemented' },
  }) as ExtendedCanvasNode;

const AUTH_CANVAS: ExtendedCanvas = {
  name: 'Auth Server (prototype)',
  nodes: [
    eventNode(
      'middleware-intercept',
      'Middleware Intercepts',
      'request.middleware.intercepted',
      'middleware',
      ['auth-server/src/middleware.ts'],
      ['auth-server/src/lib/auth-session-manager.ts'],
    ),
    eventNode(
      'workos-start',
      'Start WorkOS Auth',
      'workos.start.requested',
      'workos',
      ['auth-server/src/app/api/auth/workos/start/route.ts'],
    ),
    eventNode(
      'workos-callback',
      'Callback Received',
      'workos.callback.received',
      'workos',
      ['auth-server/src/app/api/auth/workos/callback/route.ts'],
    ),
    eventNode(
      'workos-token',
      'Exchange Code → Token',
      'workos.token.exchanged',
      'workos',
      ['auth-server/src/app/api/auth/workos/token/route.ts'],
      ['auth-server/src/lib/token-store.ts'],
    ),
    eventNode(
      'workos-error',
      'WorkOS Error',
      'workos.error',
      'workos',
      ['auth-server/src/app/api/auth/workos/callback/route.ts'],
    ),
    eventNode(
      'session-lookup',
      'Look Up Session',
      'session.lookup',
      'session',
      ['auth-server/src/lib/auth-session-manager.ts'],
      ['auth-server/src/middleware.ts'],
    ),
    eventNode(
      'session-unauth',
      'No Session',
      'session.unauthenticated',
      'session',
      ['auth-server/src/middleware.ts'],
    ),
    eventNode(
      'session-created',
      'Create Session',
      'session.created',
      'session',
      ['auth-server/src/lib/auth-session-manager.ts'],
      ['auth-server/src/lib/token-store.ts'],
    ),
    eventNode(
      'org-membership',
      'Check Org Membership',
      'org.membership.checked',
      'session',
      ['auth-server/src/lib/org-membership.ts'],
    ),
    eventNode(
      'cli-room-token',
      'Mint CLI Room Token',
      'cli.room_token.minted',
      'cli',
      ['auth-server/src/app/api/auth/cli/room-token/route.ts'],
      [
        'auth-server/src/lib/token-store.ts',
        'auth-server/src/lib/auth-session-manager.ts',
      ],
    ),
  ],
};

const FILE_HIGHLIGHT_COLOR = '#22d3ee'; // cyan — primary instrumentation site
const REFERENCE_HIGHLIGHT_COLOR = '#a78bfa'; // violet — auxiliary references

function PathList({
  label,
  color,
  paths,
}: {
  label: string;
  color: string;
  paths: string[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          color: '#9ca3af',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
            display: 'inline-block',
          }}
        />
        <span>{label}</span>
      </div>
      {paths.map(path => (
        <code
          key={path}
          style={{
            fontSize: 11,
            color: '#e5e7eb',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            wordBreak: 'break-all',
          }}
        >
          {path}
        </code>
      ))}
    </div>
  );
}

const FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const OVERLAY_HEIGHT_PCT = 50;
const COLLAPSE_MS = 320;

type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const cityData = useMemo(() => authServerCityData as CityData, []);

    const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
    const scenario = useMemo(
      () => SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0],
      [scenarioId],
    );
    const [selectedEventIndex, setSelectedEventIndex] = useState<
      number | undefined
    >(undefined);

    const [opacity, setOpacity] = useState(1);
    const [interactive, setInteractive] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const eventNameToPaths = useMemo(() => {
      const m = new Map<string, { files: string[]; references: string[] }>();
      for (const node of AUTH_CANVAS.nodes ?? []) {
        if (node.type !== 'otel-event') continue;
        const name = node.event?.name;
        if (!name) continue;
        m.set(name, {
          files: node.otel?.files ?? [],
          references: node.otel?.references ?? [],
        });
      }
      return m;
    }, []);

    const eventNames = useMemo(
      () => Object.keys(scenario.template.events ?? {}),
      [scenario],
    );
    const selectedEventName =
      selectedEventIndex !== undefined
        ? eventNames[selectedEventIndex]
        : undefined;
    const selectedEventEntry =
      selectedEventName !== undefined
        ? scenario.template.events?.[selectedEventName]
        : undefined;
    const selectedEventTemplate = selectedEventEntry
      ? getEventTemplateString(selectedEventEntry)
      : undefined;
    const selectedPaths =
      selectedEventName !== undefined
        ? (eventNameToPaths.get(selectedEventName) ?? {
            files: [],
            references: [],
          })
        : { files: [], references: [] };

    const highlightLayers = useMemo<HighlightLayer[]>(() => {
      const layers: HighlightLayer[] = [];
      // References render first / underneath so primary files stay visually dominant.
      if (selectedPaths.references.length > 0) {
        layers.push({
          id: 'workflow-selection-references',
          name: 'Workflow References',
          enabled: true,
          color: REFERENCE_HIGHLIGHT_COLOR,
          opacity: 0.7,
          borderWidth: 3,
          priority: 90,
          items: selectedPaths.references.map(path => ({
            path,
            type: 'file' as const,
            renderStrategy: 'fill' as const,
          })),
        });
      }
      if (selectedPaths.files.length > 0) {
        layers.push({
          id: 'workflow-selection-files',
          name: 'Workflow Files',
          enabled: true,
          color: FILE_HIGHLIGHT_COLOR,
          opacity: 0.9,
          borderWidth: 4,
          priority: 100,
          items: selectedPaths.files.map(path => ({
            path,
            type: 'file' as const,
            renderStrategy: 'fill' as const,
          })),
        });
      }
      return layers;
    }, [selectedPaths]);

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

        {/* Semi-transparent workflow diagram overlay — bottom half, collapsible */}
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
                fontFamily: FONT,
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
              <span>{collapsed ? 'Show workflow' : 'Hide workflow'}</span>
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
              backgroundColor: '#0b0f14',
              borderTop: '1px solid #1f2937',
              opacity: collapsed ? 0 : opacity,
              pointerEvents: interactive && !collapsed ? 'auto' : 'none',
              transition: `opacity ${COLLAPSE_MS}ms ease`,
            }}
          >
            <WorkflowSequenceDiagram
              scenario={scenario}
              canvas={AUTH_CANVAS}
              width="100%"
              height="100%"
              showControls={false}
              showBackground={false}
              selectedEventIndex={selectedEventIndex}
              onEventIndexChange={setSelectedEventIndex}
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
            fontFamily: FONT,
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minWidth: 260,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            transformOrigin: 'top left',
            transform: settingsOpen
              ? 'translateX(0) scale(1)'
              : 'translateX(-8px) scale(0.96)',
            opacity: settingsOpen ? 1 : 0,
            pointerEvents: settingsOpen ? 'auto' : 'none',
            transition: 'opacity 180ms ease, transform 180ms ease',
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
            Workflow Diagram Overlay
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: '#9ca3af',
              }}
            >
              Scenario
            </span>
            <select
              value={scenarioId}
              onChange={e => {
                setScenarioId(e.target.value);
                setSelectedEventIndex(undefined);
              }}
              style={{
                backgroundColor: 'rgba(11, 15, 20, 0.92)',
                color: '#e5e7eb',
                border: '1px solid #374151',
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: 12,
                fontFamily: FONT,
                cursor: 'pointer',
              }}
            >
              {SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.4 }}>
              {scenario.description}
            </span>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={interactive}
              onChange={e => setInteractive(e.target.checked)}
            />
            <span>Interactive (capture pointer)</span>
          </label>

          <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.4 }}>
            Click an event to inspect its template and highlight the matching
            file in the city below. Use the handle at the seam to slide the
            diagram down.
          </div>
        </div>

        {/* Right-side event inspector overlay */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 50,
            width: 320,
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid #374151',
            borderRadius: 10,
            padding: '14px 16px',
            color: '#e5e7eb',
            fontFamily: FONT,
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            transformOrigin: 'top right',
            transform: selectedEventName
              ? 'translateX(0) scale(1)'
              : 'translateX(8px) scale(0.96)',
            opacity: selectedEventName ? 1 : 0,
            pointerEvents: selectedEventName ? 'auto' : 'none',
            transition: 'opacity 180ms ease, transform 180ms ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: '#9ca3af',
              }}
            >
              Event
            </span>
            {selectedEventIndex !== undefined && (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                {selectedEventIndex + 1} / {eventNames.length}
              </span>
            )}
          </div>
          <code
            style={{
              fontSize: 12,
              color: '#22d3ee',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              wordBreak: 'break-all',
            }}
          >
            {selectedEventName}
          </code>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: '1px solid #1f2937',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                color: '#9ca3af',
              }}
            >
              Template
            </span>
            <code
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: '#e5e7eb',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                backgroundColor: 'rgba(11, 15, 20, 0.6)',
                border: '1px solid #1f2937',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              {selectedEventTemplate}
            </code>
          </div>

          <div
            style={{
              marginTop: 4,
              paddingTop: 10,
              borderTop: '1px solid #1f2937',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {selectedPaths.files.length === 0 &&
            selectedPaths.references.length === 0 ? (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                No files or references mapped for this event.
              </span>
            ) : (
              <>
                {selectedPaths.files.length > 0 && (
                  <PathList
                    label="Files"
                    color={FILE_HIGHLIGHT_COLOR}
                    paths={selectedPaths.files}
                  />
                )}
                {selectedPaths.references.length > 0 && (
                  <PathList
                    label="References"
                    color={REFERENCE_HIGHLIGHT_COLOR}
                    paths={selectedPaths.references}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
};
