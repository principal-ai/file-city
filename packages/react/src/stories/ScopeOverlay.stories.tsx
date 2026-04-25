import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSelection,
} from '@pierre/trees/react';
import {
  FileCity3D,
  type CityData,
  type CityDistrict,
  type ElevatedScopePanel,
  type HighlightLayer,
} from '../components/FileCity3D';
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';

import electronAppCityData from '../../../../assets/electron-app-city-data.json';

/**
 * Scope / Namespace Overlay experiments
 *
 * Prototypes the mapping described in docs/scope-namespace-overlay.md:
 *
 *   scope      → LayerGroup (toggleable lens on the city)
 *   namespace  → HighlightLayer (one stable color, directory items)
 *   paths[]    → LayerItem { type: 'directory', renderStrategy: 'fill' }
 *
 * The scopes/namespaces below are hand-authored against paths that exist in
 * the electron-app city data — they stand in for what would eventually be
 * parsed from principal-view-core-library *.events.canvas files.
 */

const meta: Meta<typeof FileCity3D> = {
  title: 'Experiments/ScopeOverlay',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// ---------------------------------------------------------------------------
// Mock scope / namespace model
// ---------------------------------------------------------------------------

interface MockEvent {
  /** Action portion of the event name — full name is `${namespace}.${action}`. */
  action: string;
  severity: 'info' | 'warn' | 'error';
  description: string;
}

interface MockNamespace {
  name: string;
  description: string;
  color: string;
  paths: string[];
  /**
   * Events on this namespace. Per the doc, events are namespace-level metadata —
   * they don't claim files at this level. (Files-per-event is a future layer.)
   */
  events: MockEvent[];
}

interface MockScope {
  id: string;
  name: string;
  description: string;
  /**
   * Scope-level paths (mirrors planned addition in principal-view-core-library).
   * Cover everything not claimed by a more specific namespace.
   */
  paths: string[];
  namespaces: MockNamespace[];
}

const INITIAL_SCOPES: MockScope[] = [
  {
    id: 'principal-view.electron-ui',
    name: 'principal-view.electron-ui',
    description: 'Top-level views rendered inside the principal window.',
    paths: ['src/renderer/principal-window/views'],
    namespaces: [
      {
        name: 'skill-browser',
        description: 'Skill discovery, install, and config UI.',
        color: '#22c55e',
        paths: ['src/renderer/principal-window/views/SkillBrowserView'],
        events: [
          { action: 'opened', severity: 'info', description: 'User opened the skill browser.' },
          { action: 'installed', severity: 'info', description: 'A skill was installed.' },
          { action: 'uninstalled', severity: 'info', description: 'A skill was uninstalled.' },
          { action: 'install-failed', severity: 'error', description: 'Skill install failed.' },
        ],
      },
      {
        name: 'onboarding',
        description: 'First-run onboarding flow.',
        color: '#3b82f6',
        paths: ['src/renderer/principal-window/views/OnboardingView'],
        events: [
          { action: 'started', severity: 'info', description: 'Onboarding flow began.' },
          { action: 'step-completed', severity: 'info', description: 'A step finished.' },
          { action: 'completed', severity: 'info', description: 'Onboarding completed.' },
          { action: 'skipped', severity: 'warn', description: 'User skipped onboarding.' },
        ],
      },
      {
        name: 'settings',
        description: 'User and workspace settings.',
        color: '#f59e0b',
        paths: ['src/renderer/principal-window/views/Settings'],
        events: [
          { action: 'opened', severity: 'info', description: 'Settings view opened.' },
          { action: 'changed', severity: 'info', description: 'A setting was changed.' },
          { action: 'reset', severity: 'warn', description: 'Settings reset to defaults.' },
        ],
      },
      {
        name: 'auth',
        description: 'Authentication view and components.',
        color: '#ec4899',
        paths: ['src/renderer/principal-window/views/AuthView'],
        events: [
          { action: 'login', severity: 'info', description: 'User signed in.' },
          { action: 'logout', severity: 'info', description: 'User signed out.' },
          { action: 'refresh', severity: 'info', description: 'Auth token refreshed.' },
          { action: 'error', severity: 'error', description: 'Auth flow failed.' },
        ],
      },
      {
        name: 'projects',
        description: 'Project list and management.',
        color: '#8b5cf6',
        paths: ['src/renderer/principal-window/views/ProjectsView'],
        events: [
          { action: 'opened', severity: 'info', description: 'A project was opened.' },
          { action: 'created', severity: 'info', description: 'A project was created.' },
          { action: 'deleted', severity: 'warn', description: 'A project was deleted.' },
        ],
      },
      {
        name: 'worlds',
        description: 'Worlds / environment view.',
        color: '#06b6d4',
        paths: ['src/renderer/principal-window/views/WorldsView'],
        events: [
          { action: 'opened', severity: 'info', description: 'Worlds view opened.' },
          { action: 'created', severity: 'info', description: 'A world was created.' },
        ],
      },
    ],
  },
  {
    id: 'principal-view.services',
    name: 'principal-view.services',
    description: 'Renderer-side services and the views that observe them.',
    paths: [
      'src/renderer/services',
      'src/renderer/panels/localhost-processes',
      'src/renderer/principal-window/views/GitSyncView',
      'src/renderer/principal-window/views/LocalhostProcessesView',
      'src/renderer/principal-window/views/ConnectionsView',
      'src/renderer/principal-window/views/SystemMonitor',
    ],
    namespaces: [
      {
        name: 'git-sync',
        description: 'Git sync service + its UI.',
        color: '#22c55e',
        paths: [
          'src/renderer/services/git-sync',
          'src/renderer/principal-window/views/GitSyncView',
        ],
        events: [
          { action: 'pull-started', severity: 'info', description: 'Git pull began.' },
          { action: 'pull-completed', severity: 'info', description: 'Git pull finished.' },
          { action: 'push-failed', severity: 'error', description: 'Git push failed.' },
          { action: 'conflict-detected', severity: 'warn', description: 'Merge conflict detected.' },
        ],
      },
      {
        name: 'storage',
        description: 'Renderer-side storage service.',
        color: '#f59e0b',
        paths: ['src/renderer/services/storage'],
        events: [
          { action: 'read', severity: 'info', description: 'Read from storage.' },
          { action: 'write', severity: 'info', description: 'Wrote to storage.' },
          { action: 'quota-exceeded', severity: 'error', description: 'Storage quota hit.' },
        ],
      },
      {
        name: 'processes',
        description: 'Localhost process monitor + its panel.',
        color: '#ef4444',
        paths: [
          'src/renderer/panels/localhost-processes',
          'src/renderer/principal-window/views/LocalhostProcessesView',
        ],
        events: [
          { action: 'started', severity: 'info', description: 'A process started.' },
          { action: 'exited', severity: 'info', description: 'A process exited.' },
          { action: 'crashed', severity: 'error', description: 'A process crashed.' },
        ],
      },
      {
        name: 'connections',
        description: 'Remote connections view.',
        color: '#3b82f6',
        paths: ['src/renderer/principal-window/views/ConnectionsView'],
        events: [
          { action: 'connected', severity: 'info', description: 'Connection established.' },
          { action: 'disconnected', severity: 'warn', description: 'Connection dropped.' },
        ],
      },
      {
        name: 'system-monitor',
        description: 'System health / resource monitor.',
        color: '#8b5cf6',
        paths: ['src/renderer/principal-window/views/SystemMonitor'],
        events: [
          { action: 'sample', severity: 'info', description: 'Health sample recorded.' },
          { action: 'threshold-exceeded', severity: 'warn', description: 'A threshold tripped.' },
        ],
      },
    ],
  },
  {
    id: 'principal-view.shell',
    name: 'principal-view.shell',
    description: 'Chrome: titlebar, sidebar, panels, integrated shell.',
    paths: [
      'src/renderer/components/Titlebar',
      'src/renderer/components/Sidebar',
      'src/renderer/panels',
      'src/renderer/principal-window/components/IntegratedShell',
    ],
    namespaces: [
      {
        name: 'titlebar',
        description: 'Window titlebar.',
        color: '#22c55e',
        paths: ['src/renderer/components/Titlebar'],
        events: [
          { action: 'menu-opened', severity: 'info', description: 'Window menu opened.' },
          { action: 'window-action', severity: 'info', description: 'Window action invoked.' },
        ],
      },
      {
        name: 'sidebar',
        description: 'Navigation sidebar.',
        color: '#3b82f6',
        paths: ['src/renderer/components/Sidebar'],
        events: [
          { action: 'item-selected', severity: 'info', description: 'Sidebar item selected.' },
          { action: 'collapsed', severity: 'info', description: 'Sidebar collapsed.' },
        ],
      },
      {
        name: 'panels',
        description: 'Bottom/side panel surface.',
        color: '#f59e0b',
        paths: ['src/renderer/panels'],
        events: [
          { action: 'opened', severity: 'info', description: 'A panel was opened.' },
          { action: 'closed', severity: 'info', description: 'A panel was closed.' },
          { action: 'resized', severity: 'info', description: 'A panel was resized.' },
        ],
      },
      {
        name: 'integrated-shell',
        description: 'Terminal shell embedded in the window.',
        color: '#ec4899',
        paths: ['src/renderer/principal-window/components/IntegratedShell'],
        events: [
          { action: 'session-started', severity: 'info', description: 'A shell session began.' },
          { action: 'session-ended', severity: 'info', description: 'A shell session ended.' },
          { action: 'command-failed', severity: 'error', description: 'A command exited non-zero.' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// File tree paths (extracted once from city data)
// ---------------------------------------------------------------------------

const ELECTRON_PATHS: string[] = (() => {
  const set = new Set<string>();
  for (const b of (electronAppCityData as CityData).buildings) set.add(b.path);
  return Array.from(set).sort();
})();

const ELECTRON_DIRECTORIES: Set<string> = new Set(
  (electronAppCityData as CityData).districts.map(d => d.path),
);

const ELECTRON_DISTRICTS_BY_PATH: Map<string, CityDistrict> = new Map(
  (electronAppCityData as CityData).districts.map(d => [d.path, d]),
);

// ---------------------------------------------------------------------------
// Scope tree paths
// ---------------------------------------------------------------------------

interface ScopeTreeSelection {
  scopeId: string;
  namespaceName?: string;
  eventAction?: string;
}

/**
 * Sentinel leaves used when a scope has no namespaces or a namespace has no
 * events — the trees library infers directories from paths, so empty branches
 * need a placeholder leaf to render.
 */
const EMPTY_NS_SENTINEL = '(no namespaces)';
const EMPTY_EVENTS_SENTINEL = '(no events)';

/**
 * Build canonical paths for the scope tree: `<scope.id>/<namespace.name>/<event.action>`.
 * Scopes are top-level directories, namespaces children, events leaves.
 * Empty scopes/namespaces emit a sentinel leaf so they still appear.
 */
function buildScopeTreePaths(scopes: readonly MockScope[]): string[] {
  const out: string[] = [];
  for (const scope of scopes) {
    if (scope.namespaces.length === 0) {
      out.push(`${scope.id}/${EMPTY_NS_SENTINEL}`);
      continue;
    }
    for (const ns of scope.namespaces) {
      if (ns.events.length === 0) {
        out.push(`${scope.id}/${ns.name}/${EMPTY_EVENTS_SENTINEL}`);
        continue;
      }
      for (const ev of ns.events) {
        out.push(`${scope.id}/${ns.name}/${ev.action}`);
      }
    }
  }
  return out;
}

function parseScopeTreePath(path: string): ScopeTreeSelection {
  const [scopeId, namespaceName, eventAction] = path.split('/');
  const result: ScopeTreeSelection = { scopeId };
  if (namespaceName && namespaceName !== EMPTY_NS_SENTINEL) {
    result.namespaceName = namespaceName;
  }
  if (eventAction && eventAction !== EMPTY_EVENTS_SENTINEL) {
    result.eventAction = eventAction;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Info overlay component
// ---------------------------------------------------------------------------

const SEVERITY_BG: Record<MockEvent['severity'], string> = {
  error: '#7f1d1d',
  warn: '#78350f',
  info: '#1e3a8a',
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 360,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  background: 'rgba(15, 23, 42, 0.96)',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  zIndex: 100,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const ScopeInfoOverlay: React.FC<{
  info: { scope: MockScope; ns: MockNamespace | null; ev: MockEvent | null };
}> = ({ info }) => {
  const { scope, ns, ev } = info;

  // Event leaf selected — show event detail.
  if (ns && ev) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Event</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>
            {ns.name}.{ev.action}
          </div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 10,
              marginTop: 8,
              padding: '2px 6px',
              borderRadius: 3,
              background: SEVERITY_BG[ev.severity],
              color: '#fde68a',
            }}
          >
            {ev.severity}
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>
            {ev.description}
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Owning namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: 3, background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 14, fontStyle: 'italic' }}>
            Files-per-event mapping not wired yet — for now the event highlights its parent
            namespace's paths.
          </div>
        </div>
      </div>
    );
  }

  // Namespace selected — show namespace detail.
  if (ns) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: 3, background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
            {ns.description}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            in <span style={{ fontFamily: 'monospace' }}>{scope.id}</span>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Claimed paths ({ns.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {ns.paths.map(p => (
              <code
                key={p}
                style={{
                  fontSize: 11,
                  color: '#cbd5e1',
                  background: '#0b1220',
                  padding: '4px 6px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                }}
              >
                {p}
              </code>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Events ({ns.events.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {ns.events.map(e => (
              <div
                key={e.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  background: '#0b1220',
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    borderRadius: 2,
                    background: SEVERITY_BG[e.severity],
                    color: '#fde68a',
                    flexShrink: 0,
                  }}
                >
                  {e.severity}
                </span>
                <code style={{ fontSize: 11, color: '#cbd5e1' }}>
                  {ns.name}.{e.action}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Scope selected — show scope summary.
  const totalEvents = scope.namespaces.reduce((n, x) => n + x.events.length, 0);
  return (
    <div style={overlayStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={sectionLabelStyle}>Scope</div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{scope.id}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
          {scope.description}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: '#64748b' }}>
          <div>
            <div>{scope.paths.length}</div>
            <div style={sectionLabelStyle}>scope paths</div>
          </div>
          <div>
            <div>{scope.namespaces.length}</div>
            <div style={sectionLabelStyle}>namespaces</div>
          </div>
          <div>
            <div>{totalEvents}</div>
            <div style={sectionLabelStyle}>events</div>
          </div>
        </div>
      </div>
      {scope.paths.length > 0 && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Scope-level paths ({scope.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {scope.paths.map(p => (
              <code
                key={p}
                style={{
                  fontSize: 11,
                  color: '#cbd5e1',
                  background: '#0b1220',
                  padding: '4px 6px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                }}
              >
                {p}
              </code>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={sectionLabelStyle}>Namespaces</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {scope.namespaces.map(n => (
            <div
              key={n.name}
              style={{ padding: 8, background: '#0b1220', borderRadius: 6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: n.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.name}</span>
                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
                  {n.events.length} event{n.events.length === 1 ? '' : 's'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#64748b',
                  fontFamily: 'monospace',
                  marginTop: 4,
                  wordBreak: 'break-all',
                }}
              >
                {n.paths.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add-to-scope modal
// ---------------------------------------------------------------------------

const AddToScopeModal: React.FC<{
  path: string;
  scopes: readonly MockScope[];
  scopeId: string;
  namespaceName: string;
  onScopeIdChange: (value: string) => void;
  onNamespaceNameChange: (value: string) => void;
  onPickExisting: (scopeId: string, namespaceName: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({
  path,
  scopes,
  scopeId,
  namespaceName,
  onScopeIdChange,
  onNamespaceNameChange,
  onPickExisting,
  onSubmit,
  onClose,
}) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedScope = scopeId.trim();
  const trimmedNs = namespaceName.trim();
  const canSubmit = trimmedScope.length > 0;

  // Determine what the submit will do, for the action label.
  const targetScope = scopes.find(s => s.id === trimmedScope);
  const targetNs = trimmedNs
    ? targetScope?.namespaces.find(n => n.name === trimmedNs) ?? null
    : null;
  const alreadyClaimed = trimmedNs
    ? targetNs?.paths.includes(path) ?? false
    : targetScope?.paths.includes(path) ?? false;

  let actionLabel = 'Add';
  if (alreadyClaimed) actionLabel = 'Already added';
  else if (!targetScope && !trimmedNs) actionLabel = 'Create scope';
  else if (!targetScope) actionLabel = 'Create scope + namespace';
  else if (!trimmedNs) actionLabel = 'Add to scope';
  else if (!targetNs) actionLabel = 'Create namespace';
  else actionLabel = 'Add path';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: 'min(80vh, 700px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          color: '#e2e8f0',
          borderRadius: 8,
          border: '1px solid #334155',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div style={sectionLabelStyle}>Add to scope</div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#94a3b8',
                marginTop: 6,
                wordBreak: 'break-all',
              }}
            >
              {path}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabelStyle}>Scope</span>
            <input
              type="text"
              value={scopeId}
              list="scope-id-options"
              autoFocus
              placeholder="e.g. principal-view.cli"
              onChange={e => onScopeIdChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !alreadyClaimed) onSubmit();
              }}
              style={{
                padding: '8px 10px',
                background: '#0b1220',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
            <datalist id="scope-id-options">
              {scopes.map(s => (
                <option key={s.id} value={s.id} />
              ))}
            </datalist>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabelStyle}>Namespace (optional)</span>
            <input
              type="text"
              value={namespaceName}
              placeholder="leave blank to add to scope itself"
              onChange={e => onNamespaceNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !alreadyClaimed) onSubmit();
              }}
              style={{
                padding: '8px 10px',
                background: '#0b1220',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || alreadyClaimed}
              style={{
                padding: '8px 14px',
                background: !canSubmit || alreadyClaimed ? '#1e293b' : '#3b82f6',
                color: !canSubmit || alreadyClaimed ? '#475569' : '#ffffff',
                border: '1px solid #334155',
                borderRadius: 4,
                cursor: !canSubmit || alreadyClaimed ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={sectionLabelStyle}>Existing scopes (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {scopes.map(scope => (
              <div key={scope.id}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#cbd5e1',
                    marginBottom: 6,
                  }}
                >
                  {scope.id}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <button
                    onClick={() => onPickExisting(scope.id, '')}
                    title={
                      scope.paths.includes(path)
                        ? 'Scope already claims this path'
                        : 'Prefill (scope-level)'
                    }
                    style={{
                      fontSize: 11,
                      padding: '3px 7px',
                      background: scope.paths.includes(path) ? '#0f172a' : '#1e293b',
                      color: scope.paths.includes(path) ? '#475569' : '#cbd5e1',
                      border: '1px dashed #475569',
                      borderRadius: 3,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontStyle: 'italic',
                      opacity: scope.paths.includes(path) ? 0.6 : 1,
                    }}
                  >
                    (scope-level)
                    {scope.paths.includes(path) && (
                      <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>
                    )}
                  </button>
                  {scope.namespaces.map(ns => {
                    const claims = ns.paths.includes(path);
                    return (
                      <button
                        key={ns.name}
                        onClick={() => onPickExisting(scope.id, ns.name)}
                        title={claims ? 'Already claims this path' : 'Prefill inputs'}
                        style={{
                          fontSize: 11,
                          padding: '3px 7px',
                          background: claims ? '#0f172a' : '#1e293b',
                          color: claims ? '#475569' : '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: 3,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          opacity: claims ? 0.6 : 1,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: ns.color,
                            flexShrink: 0,
                          }}
                        />
                        {ns.name}
                        {claims && <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single-scope explorer
// ---------------------------------------------------------------------------

type AuditMode = 'off' | 'uncovered' | 'covered';

const ALL_BUILDINGS = (electronAppCityData as CityData).buildings;

/**
 * The electron-app city is rooted at `electron-app/` in the JSON data, but
 * scope/namespace paths are authored relative to the package root (matching
 * how principal-view canvases are stored). These helpers convert between the
 * two representations.
 */
const PACKAGE_ROOT = 'electron-app/';

function toScopePath(cityPath: string): string {
  let p = cityPath.endsWith('/') ? cityPath.slice(0, -1) : cityPath;
  if (p.startsWith(PACKAGE_ROOT)) p = p.slice(PACKAGE_ROOT.length);
  return p;
}

function toCityPath(scopePath: string): string {
  return scopePath.startsWith(PACKAGE_ROOT) ? scopePath : PACKAGE_ROOT + scopePath;
}

const NAMESPACE_PALETTE = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#14b8a6',
  '#a855f7',
  '#eab308',
];

function pickNamespaceColor(scopes: readonly MockScope[]): string {
  const used = new Set(scopes.flatMap(s => s.namespaces.map(n => n.color)));
  return NAMESPACE_PALETTE.find(c => !used.has(c)) ?? NAMESPACE_PALETTE[scopes.length % NAMESPACE_PALETTE.length];
}

/**
 * Build highlight layers for a scope: one fill layer per namespace plus a
 * border-only layer for scope-level paths. Priority is path depth (longest-
 * prefix wins) per the partition convention in docs/scope-namespace-overlay.md.
 */
function buildLayersForScope(scope: MockScope): HighlightLayer[] {
  const layers: HighlightLayer[] = scope.namespaces.map(ns => {
    const maxDepth = Math.max(1, ...ns.paths.map(p => p.split('/').length));
    return {
      id: `${scope.id}::${ns.name}`,
      name: ns.name,
      enabled: true,
      color: ns.color,
      opacity: 0.55,
      priority: maxDepth,
      items: ns.paths.map(p => ({
        path: toCityPath(p),
        type: 'directory' as const,
        renderStrategy: 'fill' as const,
      })),
    };
  });
  if (scope.paths.length > 0) {
    layers.push({
      id: `${scope.id}::__scope__`,
      name: `${scope.id} (scope-level)`,
      enabled: true,
      color: '#64748b',
      opacity: 0.4,
      priority: 0,
      items: scope.paths.map(p => ({
        path: toCityPath(p),
        type: 'directory' as const,
        renderStrategy: 'fill' as const,
      })),
    });
  }
  return layers;
}

const SingleScopeTemplate: React.FC = () => {
  const [scopes, setScopes] = React.useState<MockScope[]>(INITIAL_SCOPES);
  const [focusDirectory, setFocusDirectory] = React.useState<string | null>(null);
  const [scopeSelection, setScopeSelection] = React.useState<ScopeTreeSelection | null>(null);
  const [auditMode, setAuditMode] = React.useState<AuditMode>('off');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [modalScopeId, setModalScopeId] = React.useState('');
  const [modalNamespaceName, setModalNamespaceName] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'files' | 'scopes'>('files');

  // Coverage derived from current scope state.
  const claimedPaths = React.useMemo(
    () =>
      Array.from(
        new Set(
          scopes.flatMap(s => [...s.paths, ...s.namespaces.flatMap(ns => ns.paths)]),
        ),
      ),
    [scopes],
  );
  const isPathCovered = React.useCallback(
    (cityPath: string) => {
      const candidate = toScopePath(cityPath);
      for (const claimed of claimedPaths) {
        if (candidate === claimed || candidate.startsWith(claimed + '/')) return true;
      }
      return false;
    },
    [claimedPaths],
  );
  const { uncoveredFiles, coveredFiles } = React.useMemo(() => {
    const u: typeof ALL_BUILDINGS = [];
    const c: typeof ALL_BUILDINGS = [];
    for (const b of ALL_BUILDINGS) (isPathCovered(b.path) ? c : u).push(b);
    return { uncoveredFiles: u, coveredFiles: c };
  }, [isPathCovered]);

  const auditHighlightLayers = React.useMemo(() => {
    if (auditMode === 'uncovered') return createFileColorHighlightLayers(uncoveredFiles);
    if (auditMode === 'covered') return createFileColorHighlightLayers(coveredFiles);
    return undefined;
  }, [auditMode, uncoveredFiles, coveredFiles]);

  const totalFiles = ALL_BUILDINGS.length;
  const uncoveredCount = uncoveredFiles.length;
  const coveredCount = coveredFiles.length;

  const { model: treeModel } = useFileTree({
    paths: ELECTRON_PATHS,
    search: true,
    initialExpandedPaths: ['electron-app', 'electron-app/src', 'electron-app/src/renderer'],
    onSelectionChange: paths => {
      const selected = paths[0];
      if (!selected) {
        setFocusDirectory(null);
        return;
      }
      // Selecting a directory focuses the city on it; selecting a file focuses
      // the file's parent directory (closest ancestor that exists as a district).
      if (ELECTRON_DIRECTORIES.has(selected)) {
        setFocusDirectory(selected);
        return;
      }
      const parts = selected.split('/');
      while (parts.length > 1) {
        parts.pop();
        const candidate = parts.join('/');
        if (ELECTRON_DIRECTORIES.has(candidate)) {
          setFocusDirectory(candidate);
          return;
        }
      }
      setFocusDirectory(null);
    },
  });
  const selectedPaths = useFileTreeSelection(treeModel);

  const scopeTreePaths = React.useMemo(() => buildScopeTreePaths(scopes), [scopes]);
  const initialScopeTreePaths = React.useRef(scopeTreePaths);
  const initialExpandedScopeIds = React.useRef(scopes.map(s => s.id));
  const { model: scopeTreeModel } = useFileTree({
    paths: initialScopeTreePaths.current,
    search: true,
    initialExpandedPaths: initialExpandedScopeIds.current,
    onSelectionChange: paths => {
      const selected = paths[0];
      if (!selected) {
        setScopeSelection(null);
        return;
      }
      const parsed = parseScopeTreePath(selected);
      setScopeSelection(parsed);

      // Selecting a namespace or event also focuses the city on the namespace's
      // first declared path; selecting a bare scope clears the focus.
      if (parsed.namespaceName) {
        const scope = scopes.find(s => s.id === parsed.scopeId);
        const ns = scope?.namespaces.find(n => n.name === parsed.namespaceName);
        if (ns?.paths[0]) setFocusDirectory(toCityPath(ns.paths[0]));
      } else {
        setFocusDirectory(null);
      }
    },
  });

  // Keep the scope tree's paths in sync as scopes mutate (the model is created
  // once; later option changes need resetPaths per @pierre/trees docs).
  const isFirstScopeTreeSync = React.useRef(true);
  const pendingExpand = React.useRef<string[]>([]);
  React.useEffect(() => {
    if (isFirstScopeTreeSync.current) {
      isFirstScopeTreeSync.current = false;
      return;
    }
    scopeTreeModel.resetPaths(scopeTreePaths);
    for (const dirPath of pendingExpand.current) {
      const item = scopeTreeModel.getItem(dirPath);
      if (item && item.isDirectory()) item.expand();
    }
    pendingExpand.current = [];
  }, [scopeTreeModel, scopeTreePaths]);

  // Resolve the current scope tree selection into the underlying objects.
  const scopeInfo = React.useMemo(() => {
    if (!scopeSelection) return null;
    const scope = scopes.find(s => s.id === scopeSelection.scopeId);
    if (!scope) return null;
    const ns = scopeSelection.namespaceName
      ? scope.namespaces.find(n => n.name === scopeSelection.namespaceName) ?? null
      : null;
    const ev =
      ns && scopeSelection.eventAction
        ? ns.events.find(e => e.action === scopeSelection.eventAction) ?? null
        : null;
    return { scope, ns, ev };
  }, [scopeSelection, scopes]);

  const selectedFilePath = selectedPaths[0] ?? null;

  // City highlight layers derive from the active tab:
  //   files tab  → audit layers (uncovered / covered / off)
  //   scopes tab → selected scope's namespace fills (+ scope-level borders)
  const cityHighlightLayers = React.useMemo(() => {
    if (activeTab === 'scopes') {
      return scopeInfo ? buildLayersForScope(scopeInfo.scope) : undefined;
    }
    return auditHighlightLayers;
  }, [activeTab, scopeInfo, auditHighlightLayers]);

  // Elevated scope panels — only on the scopes tab when a scope is selected.
  // Scope-level paths render lower (gray); namespace paths render higher
  // (namespace color), so they read as "this scope owns this region, with
  // these namespaces partitioning it."
  const cityElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'scopes' || !scopeInfo) return undefined;
    const panels: ElevatedScopePanel[] = [];
    const scope = scopeInfo.scope;

    for (const sp of scope.paths) {
      const district = ELECTRON_DISTRICTS_BY_PATH.get(toCityPath(sp));
      if (!district) continue;
      panels.push({
        id: `${scope.id}::scope::${sp}`,
        color: '#64748b',
        opacity: 0.35,
        height: 350,
        thickness: 8,
        bounds: district.worldBounds,
      });
    }

    for (const ns of scope.namespaces) {
      for (const np of ns.paths) {
        const district = ELECTRON_DISTRICTS_BY_PATH.get(toCityPath(np));
        if (!district) continue;
        panels.push({
          id: `${scope.id}::${ns.name}::${np}`,
          color: ns.color,
          opacity: 0.55,
          height: 200,
          thickness: 6,
          bounds: district.worldBounds,
        });
      }
    }

    return panels;
  }, [activeTab, scopeInfo]);

  const openAddModal = React.useCallback((prefillScopeId?: string) => {
    setModalScopeId(prefillScopeId ?? '');
    setModalNamespaceName('');
    setShowAddModal(true);
  }, []);

  // Scopes that already cover the selected file-tree path (via scope-level
  // paths or any namespace path).
  const coveringScopes = React.useMemo(() => {
    if (!selectedFilePath) return [] as MockScope[];
    const sp = toScopePath(selectedFilePath);
    return scopes.filter(scope => {
      if (scope.paths.some(p => sp === p || sp.startsWith(p + '/'))) return true;
      return scope.namespaces.some(ns =>
        ns.paths.some(p => sp === p || sp.startsWith(p + '/')),
      );
    });
  }, [selectedFilePath, scopes]);

  const submitAddToScope = React.useCallback(() => {
    if (!selectedFilePath) return;
    const path = toScopePath(selectedFilePath);
    const scopeId = modalScopeId.trim();
    const namespaceName = modalNamespaceName.trim();
    if (!scopeId) return;

    // Queue branches to auto-expand once the tree re-resets.
    pendingExpand.current = namespaceName ? [scopeId, `${scopeId}/${namespaceName}`] : [scopeId];

    // Invariant: a scope's `paths` must cover every path claimed by any of
    // its namespaces. If `path` isn't already covered by scope.paths, we add
    // it.
    const ensureScopePathCovers = (scope: MockScope): MockScope => {
      const covered = scope.paths.some(p => path === p || path.startsWith(p + '/'));
      if (covered) return scope;
      return { ...scope, paths: [...scope.paths, path] };
    };

    setScopes(prev => {
      const scopeIdx = prev.findIndex(s => s.id === scopeId);

      // Existing scope.
      if (scopeIdx >= 0) {
        const scope = prev[scopeIdx];

        // No namespace given → add to scope-level paths.
        if (!namespaceName) {
          if (scope.paths.includes(path)) return prev;
          const next = [...prev];
          next[scopeIdx] = { ...scope, paths: [...scope.paths, path] };
          return next;
        }

        const nsIdx = scope.namespaces.findIndex(n => n.name === namespaceName);

        // Existing namespace — push the path if not already there.
        if (nsIdx >= 0) {
          const ns = scope.namespaces[nsIdx];
          if (ns.paths.includes(path)) return prev;
          const newNs = { ...ns, paths: [...ns.paths, path] };
          const newNamespaces = [...scope.namespaces];
          newNamespaces[nsIdx] = newNs;
          const next = [...prev];
          next[scopeIdx] = ensureScopePathCovers({ ...scope, namespaces: newNamespaces });
          return next;
        }

        // New namespace under existing scope.
        const newNs: MockNamespace = {
          name: namespaceName,
          description: '(new namespace)',
          color: pickNamespaceColor(prev),
          paths: [path],
          events: [],
        };
        const next = [...prev];
        next[scopeIdx] = ensureScopePathCovers({
          ...scope,
          namespaces: [...scope.namespaces, newNs],
        });
        return next;
      }

      // Brand-new scope. Scope paths are required, so the path always seeds
      // scope.paths even when a namespace is also being created.
      if (!namespaceName) {
        return [
          ...prev,
          {
            id: scopeId,
            name: scopeId,
            description: '(new scope)',
            paths: [path],
            namespaces: [],
          },
        ];
      }
      const newNs: MockNamespace = {
        name: namespaceName,
        description: '(new namespace)',
        color: pickNamespaceColor(prev),
        paths: [path],
        events: [],
      };
      return [
        ...prev,
        {
          id: scopeId,
          name: scopeId,
          description: '(new scope)',
          paths: [path],
          namespaces: [newNs],
        },
      ];
    });

    setShowAddModal(false);
  }, [selectedFilePath, modalScopeId, modalNamespaceName]);

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0f172a' }}>
      {/* Left pane — tabbed: file tree | scopes tree */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
          background: '#0b1220',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Tab strip */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #1e293b',
            background: '#0f172a',
          }}
        >
          {(
            [
              { id: 'files' as const, label: 'File tree', accent: '#3b82f6' },
              { id: 'scopes' as const, label: 'Scopes', accent: '#a855f7' },
            ]
          ).map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: active ? '#0b1220' : 'transparent',
                  color: active ? '#e2e8f0' : '#64748b',
                  border: 'none',
                  borderBottom: `2px solid ${active ? tab.accent : 'transparent'}`,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'files' ? (
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1e293b',
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Selection
              <div
                style={{
                  marginTop: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#94a3b8',
                  textTransform: 'none',
                  letterSpacing: 0,
                  minHeight: 14,
                  wordBreak: 'break-all',
                }}
              >
                {selectedFilePath ?? '(no selection)'}
              </div>
              {selectedFilePath && (
                <div
                  style={{
                    marginTop: 8,
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {coveringScopes.length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#94a3b8',
                        marginBottom: 6,
                      }}
                    >
                      In scope:{' '}
                      {coveringScopes.map((s, i) => (
                        <React.Fragment key={s.id}>
                          {i > 0 && ', '}
                          <code style={{ color: '#cbd5e1' }}>{s.id}</code>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {coveringScopes.map(scope => (
                      <button
                        key={scope.id}
                        onClick={() => openAddModal(scope.id)}
                        style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          background: '#1e293b',
                          color: '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: 4,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        + Add event namespace to <code>{scope.id}</code>
                      </button>
                    ))}
                    <button
                      onClick={() => openAddModal()}
                      style={{
                        fontSize: 11,
                        padding: '4px 10px',
                        background: coveringScopes.length === 0 ? '#1e293b' : 'transparent',
                        color: coveringScopes.length === 0 ? '#e2e8f0' : '#94a3b8',
                        border: '1px solid #334155',
                        borderRadius: 4,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {coveringScopes.length === 0
                        ? '+ Add to scope'
                        : '+ Add to a different scope'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <FileTree
              model={treeModel}
              style={
                {
                  flex: 1,
                  minHeight: 0,
                  '--trees-theme-list-active-selection-bg':
                    'color-mix(in oklab, #3b82f6 28%, transparent)',
                  '--trees-theme-list-hover-bg':
                    'color-mix(in oklab, #3b82f6 14%, transparent)',
                } as React.CSSProperties
              }
            />
          </>
        ) : (
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1e293b',
                fontSize: 11,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Scopes / namespaces / events
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: '#94a3b8',
                  textTransform: 'none',
                  letterSpacing: 0,
                  lineHeight: 1.4,
                }}
              >
                Selecting a scope highlights its namespace coverage on the map.
              </div>
            </div>
            <FileTree
              model={scopeTreeModel}
              style={
                {
                  flex: 1,
                  minHeight: 0,
                  '--trees-theme-list-active-selection-bg':
                    'color-mix(in oklab, #a855f7 28%, transparent)',
                  '--trees-theme-list-hover-bg':
                    'color-mix(in oklab, #a855f7 14%, transparent)',
                } as React.CSSProperties
              }
            />
          </>
        )}
      </div>

      {/* Right pane — city + scope panel */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <FileCity3D
          cityData={electronAppCityData as CityData}
          height="100%"
          width="100%"
          heightScaling="linear"
          linearScale={0.5}
          focusDirectory={focusDirectory}
          highlightLayers={cityHighlightLayers}
          elevatedScopePanels={cityElevatedPanels}
          animation={{
            startFlat: true,
            autoStartDelay: 600,
            staggerDelay: 5,
            tension: 150,
            friction: 16,
          }}
          showControls={true}
        />

        {/* Audit segmented control — only meaningful on the files tab */}
        {activeTab === 'files' && <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 100,
            display: 'flex',
            gap: 0,
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid #334155',
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 13,
          }}
        >
          {(
            [
              { mode: 'off' as const, label: 'Off', count: totalFiles, accent: '#475569' },
              {
                mode: 'uncovered' as const,
                label: 'Uncovered',
                count: uncoveredCount,
                accent: '#dc2626',
              },
              {
                mode: 'covered' as const,
                label: 'Covered',
                count: coveredCount,
                accent: '#16a34a',
              },
            ]
          ).map(({ mode, label, count, accent }, i) => {
            const active = auditMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setAuditMode(mode)}
                style={{
                  padding: '10px 14px',
                  background: active ? accent : 'transparent',
                  border: 'none',
                  borderLeft: i === 0 ? 'none' : '1px solid #334155',
                  color: active ? '#ffffff' : '#cbd5e1',
                  fontWeight: active ? 500 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {label}
                <span
                  style={{
                    fontSize: 11,
                    color: active ? '#fef3c7' : '#64748b',
                    fontWeight: 400,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>}

      {/* Info overlay — driven by scope tree selection */}
      {scopeInfo && <ScopeInfoOverlay info={scopeInfo} />}
      </div>

      {/* Add-to-scope modal */}
      {showAddModal && selectedFilePath && (
        <AddToScopeModal
          path={toScopePath(selectedFilePath)}
          scopes={scopes}
          scopeId={modalScopeId}
          namespaceName={modalNamespaceName}
          onScopeIdChange={setModalScopeId}
          onNamespaceNameChange={setModalNamespaceName}
          onPickExisting={(s, n) => {
            setModalScopeId(s);
            setModalNamespaceName(n);
          }}
          onSubmit={submitAddToScope}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export const SingleScope: Story = {
  render: () => <SingleScopeTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Story 1 from docs/scope-namespace-overlay.md — apply one scope at a time over the ' +
          'electron-app city. Toggle namespaces in the legend, switch between scopes, and change ' +
          'how uncovered (uninstrumented) files render.',
      },
    },
  },
};
