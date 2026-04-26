import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSelection,
  useFileTreeSelector,
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

const SCOPES_STORAGE_KEY = 'file-city.scope-overlay.scopes';

function loadScopesFromStorage(): MockScope[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SCOPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockScope[]) : [];
  } catch {
    return [];
  }
}

function saveScopesToStorage(scopes: readonly MockScope[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(scopes));
  } catch {
    // ignore quota / serialization errors in the story
  }
}

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

/**
 * Parent directory → list of immediate child directories. Top-level folders
 * (e.g. `electron-app`) live under the empty-string parent. Used to walk the
 * folder hierarchy when generating elevated panels for the file-tree tab.
 */
const ELECTRON_FOLDER_CHILDREN: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  const dirs = Array.from(ELECTRON_DIRECTORIES).sort();
  for (const dir of dirs) {
    const slash = dir.lastIndexOf('/');
    const parent = slash >= 0 ? dir.slice(0, slash) : '';
    const arr = m.get(parent);
    if (arr) arr.push(dir);
    else m.set(parent, [dir]);
  }
  return m;
})();

/**
 * Folder path → world bounds spanning every descendant district (including
 * the folder itself, when it is a district). A collapsed folder uses these
 * unioned bounds for its umbrella panel.
 */
const ELECTRON_FOLDER_BOUNDS: Map<
  string,
  { minX: number; maxX: number; minZ: number; maxZ: number }
> = (() => {
  const m = new Map<
    string,
    { minX: number; maxX: number; minZ: number; maxZ: number }
  >();
  for (const district of (electronAppCityData as CityData).districts) {
    const b = district.worldBounds;
    let path = district.path;
    while (path) {
      const cur = m.get(path);
      if (!cur) {
        m.set(path, { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ });
      } else {
        if (b.minX < cur.minX) cur.minX = b.minX;
        if (b.maxX > cur.maxX) cur.maxX = b.maxX;
        if (b.minZ < cur.minZ) cur.minZ = b.minZ;
        if (b.maxZ > cur.maxZ) cur.maxZ = b.maxZ;
      }
      const slash = path.lastIndexOf('/');
      if (slash < 0) break;
      path = path.slice(0, slash);
    }
  }
  return m;
})();

/**
 * Folder path → number of descendant files. Used to scale folder-panel
 * label text so larger folders read first when scanning the city.
 */
const ELECTRON_FOLDER_FILE_COUNTS: Map<string, number> = (() => {
  const m = new Map<string, number>();
  for (const b of (electronAppCityData as CityData).buildings) {
    let path = b.path;
    const slash = path.lastIndexOf('/');
    path = slash >= 0 ? path.slice(0, slash) : '';
    while (path) {
      m.set(path, (m.get(path) ?? 0) + 1);
      const s = path.lastIndexOf('/');
      if (s < 0) break;
      path = path.slice(0, s);
    }
  }
  return m;
})();

const FOLDER_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#14b8a6',
  '#a855f7',
  '#eab308',
];

function hashFolderColor(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) {
    h = (h * 31 + path.charCodeAt(i)) | 0;
  }
  return FOLDER_PALETTE[Math.abs(h) % FOLDER_PALETTE.length];
}

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
  const [scopes, setScopes] = React.useState<MockScope[]>(loadScopesFromStorage);

  React.useEffect(() => {
    saveScopesToStorage(scopes);
  }, [scopes]);
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

  // Filter the file tree by audit mode so the tree mirrors what's highlighted.
  const filteredFilePaths = React.useMemo(() => {
    if (auditMode === 'uncovered') return uncoveredFiles.map(b => b.path).sort();
    if (auditMode === 'covered') return coveredFiles.map(b => b.path).sort();
    return ELECTRON_PATHS;
  }, [auditMode, uncoveredFiles, coveredFiles]);

  const isFirstFileTreeSync = React.useRef(true);
  React.useEffect(() => {
    if (isFirstFileTreeSync.current) {
      isFirstFileTreeSync.current = false;
      return;
    }
    treeModel.resetPaths(filteredFilePaths);
  }, [treeModel, filteredFilePaths]);

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

  // Track which scope/namespace nodes are expanded in the scope tree. The
  // city panels mirror this: a collapsed scope shows one umbrella tile, an
  // expanded scope shows per-namespace tiles, and an expanded namespace
  // hides its tile so the buildings underneath are visible.
  const treeExpansion = useFileTreeSelector(
    scopeTreeModel,
    React.useCallback(
      (model: FileTree) => {
        const expandedScopes = new Set<string>();
        const expandedNamespaces = new Set<string>();
        for (const scope of scopes) {
          const scopeItem = model.getItem(scope.id);
          if (scopeItem?.isDirectory() && scopeItem.isExpanded()) {
            expandedScopes.add(scope.id);
            for (const ns of scope.namespaces) {
              const nsKey = `${scope.id}/${ns.name}`;
              const nsItem = model.getItem(nsKey);
              if (nsItem?.isDirectory() && nsItem.isExpanded()) {
                expandedNamespaces.add(nsKey);
              }
            }
          }
        }
        return { expandedScopes, expandedNamespaces };
      },
      [scopes],
    ),
    React.useCallback((prev, next) => {
      if (prev.expandedScopes.size !== next.expandedScopes.size) return false;
      for (const k of prev.expandedScopes) if (!next.expandedScopes.has(k)) return false;
      if (prev.expandedNamespaces.size !== next.expandedNamespaces.size) return false;
      for (const k of prev.expandedNamespaces) if (!next.expandedNamespaces.has(k)) return false;
      return true;
    }, []),
  );

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

  // Elevated scope panels — driven by the scope tree's expansion state.
  // - Collapsed scope → one gray umbrella tile per scope path.
  // - Expanded scope, collapsed namespace → colored tile per namespace path.
  // - Expanded namespace → no tile (buildings show through).
  const cityElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'scopes') return undefined;
    const panels: ElevatedScopePanel[] = [];

    for (const scope of scopes) {
      const isScopeExpanded = treeExpansion.expandedScopes.has(scope.id);

      if (!isScopeExpanded) {
        const onClick = () => {
          const item = scopeTreeModel.getItem(scope.id);
          if (item?.isDirectory()) item.toggle();
        };
        for (const sp of scope.paths) {
          const district = ELECTRON_DISTRICTS_BY_PATH.get(toCityPath(sp));
          if (!district) continue;
          panels.push({
            id: `${scope.id}::scope::${sp}`,
            color: '#64748b',
            height: 4,
            thickness: 2,
            bounds: district.worldBounds,
            label: scope.id,
            onClick,
          });
        }
        continue;
      }

      for (const ns of scope.namespaces) {
        const nsKey = `${scope.id}/${ns.name}`;
        if (treeExpansion.expandedNamespaces.has(nsKey)) continue;

        const onClick = () => {
          const item = scopeTreeModel.getItem(nsKey);
          if (item?.isDirectory()) item.toggle();
        };
        for (const np of ns.paths) {
          const district = ELECTRON_DISTRICTS_BY_PATH.get(toCityPath(np));
          if (!district) continue;
          panels.push({
            id: `${scope.id}::${ns.name}::${np}`,
            color: ns.color,
            height: 4,
            thickness: 2,
            bounds: district.worldBounds,
            label: ns.name,
            onClick,
          });
        }
      }
    }

    return panels.length > 0 ? panels : undefined;
  }, [activeTab, scopes, scopeTreeModel, treeExpansion]);

  // Track which folders are expanded in the file tree. The file-tree tab's
  // elevated panels mirror this: a collapsed folder shows one umbrella tile
  // covering every descendant district; expanding the folder reveals its
  // sub-folder tiles (or the buildings themselves at the leaves).
  const folderTreeExpansion = useFileTreeSelector(
    treeModel,
    React.useCallback((model: FileTree) => {
      const expanded = new Set<string>();
      for (const dir of ELECTRON_DIRECTORIES) {
        const item = model.getItem(dir);
        if (item?.isDirectory() && item.isExpanded()) expanded.add(dir);
      }
      return { expanded };
    }, []),
    React.useCallback((prev, next) => {
      if (prev.expanded.size !== next.expanded.size) return false;
      for (const k of prev.expanded) if (!next.expanded.has(k)) return false;
      return true;
    }, []),
  );

  // Elevated folder panels — driven by the file tree's expansion state.
  // Recursively walks from the top-level folders: an expanded folder
  // descends into its child folders; a collapsed folder emits one panel
  // covering the union of all descendant district bounds.
  const folderElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'files') return undefined;
    const panels: ElevatedScopePanel[] = [];
    const walk = (folderPath: string): void => {
      if (folderTreeExpansion.expanded.has(folderPath)) {
        const children = ELECTRON_FOLDER_CHILDREN.get(folderPath) ?? [];
        for (const child of children) walk(child);
        return;
      }
      const bounds = ELECTRON_FOLDER_BOUNDS.get(folderPath);
      if (!bounds) return;
      const label = folderPath.split('/').pop() ?? folderPath;
      const fileCount = ELECTRON_FOLDER_FILE_COUNTS.get(folderPath) ?? 0;
      // sqrt growth keeps ~10x file deltas inside a ~3x label-size delta;
      // the renderer still clamps to the tile footprint.
      const labelSize = Math.max(12, Math.min(240, 8 + Math.sqrt(fileCount) * 5));
      panels.push({
        id: `folder::${folderPath}`,
        color: hashFolderColor(folderPath),
        height: 4,
        thickness: 2,
        bounds,
        label,
        labelSize,
        onClick: () => {
          const item = treeModel.getItem(folderPath);
          if (item?.isDirectory()) item.toggle();
        },
      });
    };
    for (const top of ELECTRON_FOLDER_CHILDREN.get('') ?? []) walk(top);
    return panels.length > 0 ? panels : undefined;
  }, [activeTab, treeModel, folderTreeExpansion]);

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
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={sectionLabelStyle}>Audit filter</div>
              <div
                style={{
                  display: 'flex',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  overflow: 'hidden',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 12,
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
                        flex: 1,
                        padding: '6px 4px',
                        background: active ? accent : 'transparent',
                        border: 'none',
                        borderLeft: i === 0 ? 'none' : '1px solid #334155',
                        color: active ? '#ffffff' : '#cbd5e1',
                        fontWeight: active ? 500 : 400,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: active ? '#fef3c7' : '#64748b',
                          fontWeight: 400,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
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
          elevatedScopePanels={cityElevatedPanels ?? folderElevatedPanels}
          animation={{
            startFlat: true,
            autoStartDelay: null,
            staggerDelay: 5,
            tension: 150,
            friction: 16,
          }}
          showControls={true}
        />

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
