import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSelector,
  type UseFileTreeResult,
} from '@pierre/trees/react';
import type { FileTreeDirectoryHandle, FileTreeItemHandle } from '@pierre/trees';

type FileTreeModel = UseFileTreeResult['model'];

/**
 * Narrow a `FileTreeItemHandle` to its directory variant. The library's
 * `isDirectory()` method returns `true`/`false` literals but isn't a
 * `this is X` predicate, so callers can't use it to access directory-only
 * methods (`expand`, `collapse`, `toggle`) without help.
 */
function asDir(
  handle: FileTreeItemHandle | null | undefined,
): FileTreeDirectoryHandle | null {
  return handle && handle.isDirectory() ? (handle as FileTreeDirectoryHandle) : null;
}
import {
  FileCity3D,
  type CityData,
  type CityDistrict,
  type ElevatedScopePanel,
  type HighlightLayer,
} from '../components/FileCity3D';
import { buildFolderElevatedPanels, buildFolderIndex } from '../utils/folderElevatedPanels';
import type { EventNamespaceNode, ProjectArea } from '@principal-ai/principal-view-core';

import electronAppCityData from '../../../../assets/electron-app-city-data.json';

/**
 * @deprecated FROZEN — do not modify.
 *
 * This is the original prototype-as-story implementation of the explorer.
 * It has been extracted into a real component at
 * `packages/react/src/components/FileCityExplorer/`, exercised via
 * `FileCityExplorerComponent.stories.tsx`. This file is kept only for
 * side-by-side comparison while the new component is shaken out.
 *
 * Slated for deletion once the extracted component is confirmed equivalent
 * (see "Pending cleanup" in `docs/file-city-explorer.md`). Make changes to
 * the new component, not here.
 *
 * --- Original notes ---
 *
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
  title: 'Deprecated/FileCityExplorer (legacy story)',
  component: FileCity3D,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FileCity3D>;

// ---------------------------------------------------------------------------
// Scope / namespace model
//
// `Event` and `Namespace` are derived from the upstream
// `EventNamespaceNode['namespace']` shape in `@principal-ai/principal-view-core`.
// `Namespace` adds a UI-required `color` (palette pick); `Event` is unchanged.
//
// `Scope` stays local: it flattens namespaces inline (`scope.namespaces[]`),
// which the upstream canvas-node split (`OtelScopeNode` + per-scope
// `*.events.canvas`) doesn't model. Treat as an explorer view-model.
//
// `ProjectArea` is imported directly from upstream.
// ---------------------------------------------------------------------------

type Event = EventNamespaceNode['namespace']['events'][number];

type Namespace = EventNamespaceNode['namespace'] & {
  /** UI palette pick — not part of the upstream canvas-node shape. */
  color: string;
  /** Required here even though upstream allows `paths?` — explorer always sets it. */
  paths: string[];
};

interface Scope {
  /** Maps to `OtelScopeNode.otel.scope` upstream. */
  id: string;
  name: string;
  description: string;
  /** Scope-level paths — corresponds to optional `OtelScopeNode.paths` upstream. */
  paths: string[];
  namespaces: Namespace[];
}

const SCOPES_STORAGE_KEY = 'file-city.scope-overlay.scopes';

function loadScopesFromStorage(): Scope[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SCOPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Scope[]) : [];
  } catch {
    return [];
  }
}

function saveScopesToStorage(scopes: readonly Scope[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(scopes));
  } catch {
    // ignore quota / serialization errors in the story
  }
}

const AREAS_STORAGE_KEY = 'file-city.scope-overlay.areas';

const DEFAULT_AREAS: ProjectArea[] = [
  {
    name: 'Documentation',
    description: 'Project docs, READMEs, and design notes — not OTEL-instrumented.',
    paths: ['docs'],
  },
  {
    name: 'Build & tooling',
    description: 'Build scripts, bundler config, and developer tooling.',
    paths: ['scripts', 'build'],
  },
];

function loadAreasFromStorage(): ProjectArea[] {
  if (typeof window === 'undefined') return DEFAULT_AREAS;
  try {
    const raw = window.localStorage.getItem(AREAS_STORAGE_KEY);
    if (!raw) return DEFAULT_AREAS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectArea[]) : DEFAULT_AREAS;
  } catch {
    return DEFAULT_AREAS;
  }
}

function saveAreasToStorage(areas: readonly ProjectArea[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(areas));
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
 * Pre-built folder index (children, bounds, file counts) for the static
 * electron-app city. Cached once at module load so the story doesn't
 * recompute on every render.
 */
const ELECTRON_FOLDER_INDEX = buildFolderIndex(electronAppCityData as CityData);

// ---------------------------------------------------------------------------
// Scope tree paths
// ---------------------------------------------------------------------------

interface ScopeTreeSelection {
  scopeId: string;
  namespaceName?: string;
  eventName?: string;
}

/**
 * Sentinel leaves used when a scope has no namespaces or a namespace has no
 * events — the trees library infers directories from paths, so empty branches
 * need a placeholder leaf to render.
 */
const EMPTY_NS_SENTINEL = '(no namespaces)';
const EMPTY_EVENTS_SENTINEL = '(no events)';

/**
 * Build canonical paths for the scope tree: `<scope.id>/<namespace.name>/<event.name>`.
 * Scopes are top-level directories, namespaces children, events leaves.
 * Empty scopes/namespaces emit a sentinel leaf so they still appear.
 */
function buildScopeTreePaths(scopes: readonly Scope[]): string[] {
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
        out.push(`${scope.id}/${ns.name}/${ev.name}`);
      }
    }
  }
  return out;
}

function parseScopeTreePath(path: string): ScopeTreeSelection {
  const [scopeId, namespaceName, eventName] = path.split('/');
  const result: ScopeTreeSelection = { scopeId };
  if (namespaceName && namespaceName !== EMPTY_NS_SENTINEL) {
    result.namespaceName = namespaceName;
  }
  if (eventName && eventName !== EMPTY_EVENTS_SENTINEL) {
    result.eventName = eventName;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Info overlay component
// ---------------------------------------------------------------------------

const SEVERITY_BG: Record<NonNullable<Event['severity']>, string> = {
  ERROR: '#7f1d1d',
  WARN: '#78350f',
  INFO: '#1e3a8a',
};
const DEFAULT_SEVERITY_BG = '#1e293b';

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 360,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  background: 'rgba(15, 23, 42, 0.72)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  zIndex: 100,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const ScopeInfoOverlay: React.FC<{
  info: { scope: Scope; ns: Namespace | null; ev: Event | null };
}> = ({ info }) => {
  const { scope, ns, ev } = info;

  // Event leaf selected — show event detail.
  if (ns && ev) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Event</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>
            {ev.name}
          </div>
          {ev.severity && (
            <div
              style={{
                display: 'inline-block',
                fontSize: 12,
                marginTop: 8,
                padding: '2px 6px',
                borderRadius: 3,
                background: SEVERITY_BG[ev.severity] ?? DEFAULT_SEVERITY_BG,
                color: '#fde68a',
              }}
            >
              {ev.severity}
            </div>
          )}
          {ev.description && (
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>
              {ev.description}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Owning namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: 3, background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 14, fontStyle: 'italic' }}>
            Files-per-event mapping not wired yet — for now the event highlights its parent
            namespace&apos;s paths.
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
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
            {ns.description}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
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
                  fontSize: 12,
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
                key={e.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  background: '#0b1220',
                  borderRadius: 4,
                }}
              >
                {e.severity && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: '1px 4px',
                      borderRadius: 2,
                      background: SEVERITY_BG[e.severity] ?? DEFAULT_SEVERITY_BG,
                      color: '#fde68a',
                      flexShrink: 0,
                    }}
                  >
                    {e.severity}
                  </span>
                )}
                <code style={{ fontSize: 12, color: '#cbd5e1' }}>
                  {e.name}
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
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
          {scope.description}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#64748b' }}>
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
                  fontSize: 12,
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
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                  {n.events.length} event{n.events.length === 1 ? '' : 's'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
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

const AREA_PANEL_COLOR = '#64748b';

// ---------------------------------------------------------------------------
// Add-to-scope modal
// ---------------------------------------------------------------------------

const AddToScopeModal: React.FC<{
  path: string;
  scopes: readonly Scope[];
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
                fontSize: 14,
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
                fontSize: 14,
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
                fontSize: 14,
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
                fontSize: 14,
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
                      fontSize: 12,
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
                      <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>
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
                          fontSize: 12,
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
                        {claims && <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>}
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
// Add-to-area modal
// ---------------------------------------------------------------------------

const AddToAreaModal: React.FC<{
  path: string;
  areas: readonly ProjectArea[];
  areaName: string;
  description: string;
  onAreaNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPickExisting: (areaName: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({
  path,
  areas,
  areaName,
  description,
  onAreaNameChange,
  onDescriptionChange,
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

  const trimmedName = areaName.trim();
  const canSubmit = trimmedName.length > 0;
  const targetArea = areas.find(a => a.name === trimmedName);
  const alreadyClaimed = targetArea?.paths.includes(path) ?? false;

  let actionLabel = 'Add';
  if (alreadyClaimed) actionLabel = 'Already added';
  else if (!targetArea) actionLabel = 'Create area';
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
            <div style={sectionLabelStyle}>Add to area</div>
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
            <span style={sectionLabelStyle}>Area</span>
            <input
              type="text"
              value={areaName}
              list="area-name-options"
              autoFocus
              placeholder="e.g. Documentation"
              onChange={e => onAreaNameChange(e.target.value)}
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
                fontSize: 14,
              }}
            />
            <datalist id="area-name-options">
              {areas.map(a => (
                <option key={a.name} value={a.name} />
              ))}
            </datalist>
          </label>

          {!targetArea && trimmedName.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={sectionLabelStyle}>Description (optional)</span>
              <input
                type="text"
                value={description}
                placeholder="Why this area exists, what it covers"
                onChange={e => onDescriptionChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && canSubmit) onSubmit();
                }}
                style={{
                  padding: '8px 10px',
                  background: '#0b1220',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </label>
          )}

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
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || alreadyClaimed}
              style={{
                padding: '8px 14px',
                background: !canSubmit || alreadyClaimed ? '#1e293b' : '#94a3b8',
                color: !canSubmit || alreadyClaimed ? '#475569' : '#0f172a',
                border: '1px solid #334155',
                borderRadius: 4,
                cursor: !canSubmit || alreadyClaimed ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          <div style={sectionLabelStyle}>Existing areas (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {areas.length === 0 && (
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                No areas yet. Type a name above to create the first one.
              </div>
            )}
            {areas.map(area => {
              const claims = area.paths.includes(path);
              return (
                <button
                  key={area.name}
                  onClick={() => onPickExisting(area.name)}
                  title={claims ? 'Area already claims this path' : 'Prefill the area name'}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    background: claims ? '#0f172a' : '#1e293b',
                    color: claims ? '#475569' : '#e2e8f0',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: claims ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: AREA_PANEL_COLOR,
                      border: '1px dashed #94a3b8',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{area.name}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      color: '#64748b',
                    }}
                  >
                    {area.paths.length} path{area.paths.length === 1 ? '' : 's'}
                  </span>
                  {claims && <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single-scope explorer
// ---------------------------------------------------------------------------

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

function pickNamespaceColor(scopes: readonly Scope[]): string {
  const used = new Set(scopes.flatMap(s => s.namespaces.map(n => n.color)));
  return NAMESPACE_PALETTE.find(c => !used.has(c)) ?? NAMESPACE_PALETTE[scopes.length % NAMESPACE_PALETTE.length];
}

/**
 * Build highlight layers for a scope: one fill layer per namespace plus a
 * border-only layer for scope-level paths. Priority is path depth (longest-
 * prefix wins) per the partition convention in docs/scope-namespace-overlay.md.
 */
function buildLayersForScope(scope: Scope): HighlightLayer[] {
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

const FileCityExplorerTemplate: React.FC = () => {
  const [scopes, setScopes] = React.useState<Scope[]>(loadScopesFromStorage);
  const [areas, setAreas] = React.useState<ProjectArea[]>(loadAreasFromStorage);

  React.useEffect(() => {
    saveScopesToStorage(scopes);
  }, [scopes]);
  React.useEffect(() => {
    saveAreasToStorage(areas);
  }, [areas]);
  const [focusDirectory, setFocusDirectory] = React.useState<string | null>('electron-app');
  const [focusPinned, setFocusPinned] = React.useState(false);
  // While pinned, tree/scope selections must not change focusDirectory.
  // Wrapping the setter (rather than gating each call site) keeps the pin
  // honoured even from event handlers we add later.
  const focusPinnedRef = React.useRef(focusPinned);
  React.useEffect(() => {
    focusPinnedRef.current = focusPinned;
  }, [focusPinned]);
  // Keep a ref to focusDirectory so event handlers (e.g. the city's
  // double-click handler) can branch on it without taking a hard dep
  // and re-rebuilding folder panels on every focus change.
  const focusDirectoryRef = React.useRef(focusDirectory);
  React.useEffect(() => {
    focusDirectoryRef.current = focusDirectory;
  }, [focusDirectory]);
  const setFocusDirectoryIfUnpinned = React.useCallback(
    (next: string | null) => {
      if (focusPinnedRef.current) return;
      setFocusDirectory(next);
    },
    [],
  );
  const [selectedPanelFolder, setSelectedPanelFolder] = React.useState<string | null>(null);
  const [showPanelFolderContents, setShowPanelFolderContents] = React.useState(false);
  const [showAddPicker, setShowAddPicker] = React.useState(false);
  const addPickerRef = React.useRef<HTMLDivElement | null>(null);
  // Close the +Add picker on any click outside of it. Listens at the
  // document level so clicks anywhere — canvas, header, other overlays —
  // dismiss the menu just like a native dropdown.
  React.useEffect(() => {
    if (!showAddPicker) return;
    const onPointerDown = (e: MouseEvent) => {
      if (addPickerRef.current?.contains(e.target as Node)) return;
      setShowAddPicker(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showAddPicker]);
  // Anchor for the top-right "Hidden parent layers" panel: tracks the
  // most-recently-interacted folder so the panel always shows the chain of
  // expanded ancestors up from the user's current focus. Updated by
  // umbrella clicks, building clicks, and file tree selections.
  const [parentLayersAnchor, setParentLayersAnchor] = React.useState<string | null>(null);
  // When true, the panel is hidden until the next folder interaction.
  const [parentLayersDismissed, setParentLayersDismissed] = React.useState(false);

  // Sub-tree of paths under the currently selected panel folder. Computed
  // on demand so we only rebuild when the user actually opens the contents
  // view. Paths are stripped of the folder prefix so the tree renders rooted
  // at the folder itself.
  const panelFolderContentsPaths = React.useMemo(() => {
    if (!selectedPanelFolder || !showPanelFolderContents) return [] as string[];
    const prefix = selectedPanelFolder + '/';
    return ELECTRON_PATHS.filter(p => p.startsWith(prefix))
      .map(p => p.slice(prefix.length))
      .sort();
  }, [selectedPanelFolder, showPanelFolderContents]);

  const initialPanelFolderPaths = React.useRef<string[]>([]);
  const { model: panelFolderContentsTreeModel } = useFileTree({
    paths: initialPanelFolderPaths.current,
    search: true,
  });

  // Keep the sub-tree in sync as the selected folder or visibility changes.
  React.useEffect(() => {
    panelFolderContentsTreeModel.resetPaths(panelFolderContentsPaths);
  }, [panelFolderContentsTreeModel, panelFolderContentsPaths]);

  const [scopeSelection, setScopeSelection] = React.useState<ScopeTreeSelection | null>(null);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [scopeModalTargetPath, setScopeModalTargetPath] = React.useState<string | null>(null);
  const [modalScopeId, setModalScopeId] = React.useState('');
  const [modalNamespaceName, setModalNamespaceName] = React.useState('');
  const [showAddAreaModal, setShowAddAreaModal] = React.useState(false);
  const [areaModalTargetPath, setAreaModalTargetPath] = React.useState<string | null>(null);
  const [modalAreaName, setModalAreaName] = React.useState('');
  const [modalAreaDescription, setModalAreaDescription] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'files' | 'scopes'>('files');

  const { model: treeModel } = useFileTree({
    paths: ELECTRON_PATHS,
    search: true,
    initialExpandedPaths: [],
    onSelectionChange: paths => {
      const selected = paths[0];
      if (!selected) {
        setFocusDirectoryIfUnpinned(null);
        return;
      }
      // Selecting a directory focuses the city on it; selecting a file focuses
      // the file's parent directory (closest ancestor that exists as a district).
      if (ELECTRON_DIRECTORIES.has(selected)) {
        setFocusDirectoryIfUnpinned(selected);
        setParentLayersAnchor(selected);
        setParentLayersDismissed(false);
        return;
      }
      const parts = selected.split('/');
      while (parts.length > 1) {
        parts.pop();
        const candidate = parts.join('/');
        if (ELECTRON_DIRECTORIES.has(candidate)) {
          setFocusDirectoryIfUnpinned(candidate);
          setParentLayersAnchor(selected);
          setParentLayersDismissed(false);
          return;
        }
      }
      setFocusDirectoryIfUnpinned(null);
    },
  });

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
        if (ns?.paths[0]) setFocusDirectoryIfUnpinned(toCityPath(ns.paths[0]));
      } else {
        setFocusDirectoryIfUnpinned(null);
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
      asDir(scopeTreeModel.getItem(dirPath))?.expand();
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
      (model: FileTreeModel) => {
        const expandedScopes = new Set<string>();
        const expandedNamespaces = new Set<string>();
        for (const scope of scopes) {
          const scopeItem = asDir(model.getItem(scope.id));
          if (scopeItem && scopeItem.isExpanded()) {
            expandedScopes.add(scope.id);
            for (const ns of scope.namespaces) {
              const nsKey = `${scope.id}/${ns.name}`;
              const nsItem = asDir(model.getItem(nsKey));
              if (nsItem && nsItem.isExpanded()) {
                expandedNamespaces.add(nsKey);
              }
            }
          }
        }
        return { expandedScopes, expandedNamespaces };
      },
      [scopes],
    ),
    React.useCallback(
      (
        prev: { expandedScopes: Set<string>; expandedNamespaces: Set<string> },
        next: { expandedScopes: Set<string>; expandedNamespaces: Set<string> },
      ) => {
        if (prev.expandedScopes.size !== next.expandedScopes.size) return false;
        for (const k of prev.expandedScopes) if (!next.expandedScopes.has(k)) return false;
        if (prev.expandedNamespaces.size !== next.expandedNamespaces.size) return false;
        for (const k of prev.expandedNamespaces) if (!next.expandedNamespaces.has(k)) return false;
        return true;
      },
      [],
    ),
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
      ns && scopeSelection.eventName
        ? ns.events.find(e => e.name === scopeSelection.eventName) ?? null
        : null;
    return { scope, ns, ev };
  }, [scopeSelection, scopes]);

  // City highlight layers derive from the active tab:
  //   scopes tab → selected scope's namespace fills (+ scope-level borders)
  //   files tab  → none
  const cityHighlightLayers = React.useMemo(() => {
    if (activeTab === 'scopes') {
      return scopeInfo ? buildLayersForScope(scopeInfo.scope) : undefined;
    }
    return undefined;
  }, [activeTab, scopeInfo]);

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
        const onClick = () => asDir(scopeTreeModel.getItem(scope.id))?.toggle();
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

        const onClick = () => asDir(scopeTreeModel.getItem(nsKey))?.toggle();
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
    React.useCallback((model: FileTreeModel) => {
      const expanded = new Set<string>();
      for (const dir of ELECTRON_DIRECTORIES) {
        const item = asDir(model.getItem(dir));
        if (item && item.isExpanded()) expanded.add(dir);
      }
      return { expanded };
    }, []),
    React.useCallback(
      (prev: { expanded: Set<string> }, next: { expanded: Set<string> }) => {
        if (prev.expanded.size !== next.expanded.size) return false;
        for (const k of prev.expanded) if (!next.expanded.has(k)) return false;
        return true;
      },
      [],
    ),
  );

  // Mirror contents-tree expansion onto the main tree so the city's folder
  // umbrellas hide for folders the user expands in the floating contents
  // view. Contents-tree paths are stripped of the selected-folder prefix;
  // we re-prefix them to address the same node in the main model.
  const contentsFolderExpansion = useFileTreeSelector(
    panelFolderContentsTreeModel,
    React.useCallback(
      (model: FileTreeModel) => {
        const expanded = new Set<string>();
        if (!selectedPanelFolder) return { expanded };
        const prefix = selectedPanelFolder + '/';
        for (const dir of ELECTRON_DIRECTORIES) {
          if (!dir.startsWith(prefix)) continue;
          const stripped = dir.slice(prefix.length);
          const item = asDir(model.getItem(stripped));
          if (item && item.isExpanded()) expanded.add(dir);
        }
        return { expanded };
      },
      [selectedPanelFolder],
    ),
    React.useCallback(
      (prev: { expanded: Set<string> }, next: { expanded: Set<string> }) => {
        if (prev.expanded.size !== next.expanded.size) return false;
        for (const k of prev.expanded) if (!next.expanded.has(k)) return false;
        return true;
      },
      [],
    ),
  );

  // Diff against the prior mirror so collapses propagate without stomping
  // folders the user expanded directly via city umbrella clicks.
  const prevContentsExpansionRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const next = contentsFolderExpansion.expanded;
    const prev = prevContentsExpansionRef.current;
    for (const dir of next) {
      if (!prev.has(dir)) asDir(treeModel.getItem(dir))?.expand();
    }
    for (const dir of prev) {
      if (!next.has(dir)) asDir(treeModel.getItem(dir))?.collapse();
    }
    prevContentsExpansionRef.current = new Set(next);
  }, [contentsFolderExpansion, treeModel]);

  // Folder city-path → area display name. Lets folder umbrella tiles surface
  // the human-readable area name above the technical path component.
  const areaNameByCityPath = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const area of areas) {
      for (const p of area.paths) m.set(toCityPath(p), area.name);
    }
    return m;
  }, [areas]);

  const folderElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'files') return undefined;
    const rawPanels = buildFolderElevatedPanels({
      cityData: electronAppCityData as CityData,
      expandedFolders: folderTreeExpansion.expanded,
      onToggleFolder: (folderPath) => {
        // Plain click → surface the clicked folder in the panel-selection
        // card (with an "Open" button) instead of expanding immediately,
        // so the umbrella tile doesn't vanish out from under the click.
        // showPanelFolderContents is intentionally not reset here: if the
        // user already opted into the contents view, switching folders
        // keeps the contents view active for the new folder.
        setSelectedPanelFolder(folderPath);
        setParentLayersAnchor(folderPath);
        setParentLayersDismissed(false);
      },
      onDoubleClickFolder: (folderPath) => {
        // Double-click → focus the camera on this folder. Double-clicking
        // a folder that is *already* the focus pops the focus up by one
        // ancestor (clamped at the package root), giving an iterative
        // "zoom out" gesture as the user keeps double-clicking.
        let next = folderPath;
        let nextSelected = folderPath;
        if (focusDirectoryRef.current === folderPath) {
          const slash = folderPath.lastIndexOf('/');
          next = slash > 0 ? folderPath.slice(0, slash) : 'electron-app';
          nextSelected = next;
        }
        setSelectedPanelFolder(nextSelected);
        setFocusDirectoryIfUnpinned(next);
        setParentLayersAnchor(nextSelected);
        setParentLayersDismissed(false);
      },
      index: ELECTRON_FOLDER_INDEX,
    });
    const panels: ElevatedScopePanel[] = rawPanels.map(panel => {
      const folderPath = panel.id.startsWith('folder::') ? panel.id.slice('folder::'.length) : null;
      const displayLabel = folderPath ? areaNameByCityPath.get(folderPath) : undefined;
      return displayLabel ? { ...panel, displayLabel } : panel;
    });
    // Selection indicator: render a thin, slightly-larger panel underneath
    // the selected folder's umbrella so an accent ring peeks out around its
    // edges. Inserted *before* the umbrella in the list so the umbrella
    // draws on top — only the inflated rim shows. If the folder is expanded
    // (no umbrella in the panel list) findIndex returns -1 and no ring is
    // drawn, which is exactly what we want.
    if (selectedPanelFolder) {
      const idx = panels.findIndex(p => p.id === `folder::${selectedPanelFolder}`);
      if (idx >= 0) {
        const target = panels[idx];
        const inflate = 4;
        const border: ElevatedScopePanel = {
          id: `folder-border::${selectedPanelFolder}`,
          color: '#fbbf24',
          height: (target.height ?? 4) - 2,
          thickness: 1,
          bounds: {
            minX: target.bounds.minX - inflate,
            maxX: target.bounds.maxX + inflate,
            minZ: target.bounds.minZ - inflate,
            maxZ: target.bounds.maxZ + inflate,
          },
        };
        const next = [...panels];
        next.splice(idx, 0, border);
        return next;
      }
    }

    return panels.length > 0 ? panels : undefined;
  }, [
    activeTab,
    selectedPanelFolder,
    treeModel,
    folderTreeExpansion,
    setFocusDirectoryIfUnpinned,
    areaNameByCityPath,
  ]);

  // Cmd-click on a building → surface the chain of expanded ancestor folders
  // (their umbrellas are currently hidden because they're expanded). Each
  // entry in the popup can be clicked to collapse that ancestor, which
  // restores its umbrella so the user can navigate back up.
  const parentLayers = React.useMemo<string[]>(() => {
    if (!parentLayersAnchor) return [];
    const parts = parentLayersAnchor.split('/');
    const out: string[] = [];
    // Walk shallowest → deepest so the list reads outermost-first.
    // Include the anchor itself: if it's expanded, its umbrella is hidden
    // (children took its place), so the user should be able to collapse it
    // back from the panel.
    for (let i = 1; i <= parts.length; i++) {
      const ancestor = parts.slice(0, i).join('/');
      if (folderTreeExpansion.expanded.has(ancestor)) out.push(ancestor);
    }
    return out;
  }, [parentLayersAnchor, folderTreeExpansion]);

  const handleBuildingClick = React.useCallback(
    (building: { path: string }) => {
      setParentLayersAnchor(building.path);
      setParentLayersDismissed(false);
    },
    [],
  );

  const collapseFolder = React.useCallback(
    (folderPath: string) => asDir(treeModel.getItem(folderPath))?.collapse(),
    [treeModel],
  );

  const openAddModal = React.useCallback(
    (targetPath: string, prefillScopeId?: string) => {
      setScopeModalTargetPath(targetPath);
      setModalScopeId(prefillScopeId ?? '');
      setModalNamespaceName('');
      setShowAddModal(true);
    },
    [],
  );

  // Coverage lookup for the city-panel-clicked folder. Returns scope hits
  // (with the most specific covering namespace, if any) and area hits.
  const panelFolderCoverage = React.useMemo(() => {
    if (!selectedPanelFolder) return null;
    const sp = toScopePath(selectedPanelFolder);
    const covers = (claim: string) => sp === claim || sp.startsWith(claim + '/');

    const scopeHits: { scope: Scope; namespace: Namespace | null }[] = [];
    for (const scope of scopes) {
      const ns = scope.namespaces.find(n => n.paths.some(covers)) ?? null;
      const scopeLevel = scope.paths.some(covers);
      if (ns || scopeLevel) scopeHits.push({ scope, namespace: ns });
    }

    const areaHits = areas.filter(a => a.paths.some(covers));

    return { scopeHits, areaHits };
  }, [selectedPanelFolder, scopes, areas]);

  const submitAddToScope = React.useCallback(() => {
    if (!scopeModalTargetPath) return;
    const path = toScopePath(scopeModalTargetPath);
    const scopeId = modalScopeId.trim();
    const namespaceName = modalNamespaceName.trim();
    if (!scopeId) return;

    // Queue branches to auto-expand once the tree re-resets.
    pendingExpand.current = namespaceName ? [scopeId, `${scopeId}/${namespaceName}`] : [scopeId];

    // Invariant: a scope's `paths` must cover every path claimed by any of
    // its namespaces. If `path` isn't already covered by scope.paths, we add
    // it.
    const ensureScopePathCovers = (scope: Scope): Scope => {
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
        const newNs: Namespace = {
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
      const newNs: Namespace = {
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
    setScopeModalTargetPath(null);
  }, [scopeModalTargetPath, modalScopeId, modalNamespaceName]);

  const openAddAreaModal = React.useCallback((targetPath: string) => {
    setAreaModalTargetPath(targetPath);
    setModalAreaName('');
    setModalAreaDescription('');
    setShowAddAreaModal(true);
  }, []);

  const submitAddToArea = React.useCallback(() => {
    if (!areaModalTargetPath) return;
    const path = toScopePath(areaModalTargetPath);
    const name = modalAreaName.trim();
    const desc = modalAreaDescription.trim();
    if (!name) return;

    setAreas(prev => {
      const idx = prev.findIndex(a => a.name === name);
      if (idx >= 0) {
        const area = prev[idx];
        if (area.paths.includes(path)) return prev;
        const next = [...prev];
        next[idx] = { ...area, paths: [...area.paths, path] };
        return next;
      }
      return [
        ...prev,
        { name, description: desc || '(new area)', paths: [path] },
      ];
    });

    setShowAddAreaModal(false);
    setAreaModalTargetPath(null);
  }, [areaModalTargetPath, modalAreaName, modalAreaDescription]);

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0f172a' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        {/* Canvas wrapper — pushed down by HEADER_HEIGHT so the focus
            bar doesn't occlude the camera's framing area. The 3D camera
            sizes itself to the canvas, so shrinking the canvas is what
            makes focus calculations exclude the header. */}
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <FileCity3D
            cityData={electronAppCityData as CityData}
            height="100%"
            width="100%"
            heightScaling="linear"
            linearScale={0.5}
            focusDirectory={focusDirectory}
            highlightLayers={cityHighlightLayers}
            elevatedScopePanels={cityElevatedPanels ?? folderElevatedPanels}
            onBuildingClick={handleBuildingClick}
            animation={{
              startFlat: true,
              autoStartDelay: null,
              staggerDelay: 5,
              tension: 150,
              friction: 16,
            }}
            showControls={true}
          />
        </div>

        {/* Focus directory overlay — pinnable */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${focusPinned ? '#fbbf24' : '#334155'}`,
            borderRadius: 6,
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={sectionLabelStyle}>
              Path{focusPinned ? ' (pinned)' : ''}
            </div>
            {focusDirectory ? (
              // Breadcrumb: each ancestor segment that exists as a district
              // is a button. Clicking moves focus to that segment, even
              // while pinned (bypasses the pin guard intentionally).
              // When a folder is selected via the city, the breadcrumb
              // extends past focus to its full path — segments beyond the
              // focus point are styled differently to make it clear which
              // part of the chain is the focus vs. the selection.
              (() => {
                const focusDepth = focusDirectory.split('/').length;
                const deepest =
                  selectedPanelFolder &&
                  (selectedPanelFolder === focusDirectory ||
                    selectedPanelFolder.startsWith(focusDirectory + '/'))
                    ? selectedPanelFolder
                    : focusDirectory;
                const parts = deepest.split('/');
                const segments: { label: string; path: string; beyondFocus: boolean }[] = [];
                for (let i = 0; i < parts.length; i++) {
                  const path = parts.slice(0, i + 1).join('/');
                  if (ELECTRON_DIRECTORIES.has(path)) {
                    segments.push({ label: parts[i], path, beyondFocus: i + 1 > focusDepth });
                  }
                }
                return (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    {segments.map((seg, i) => {
                      const isFocus = seg.path === focusDirectory;
                      const isSelectedLeaf =
                        seg.path === selectedPanelFolder && seg.beyondFocus;
                      const color = isFocus
                        ? '#fde68a'
                        : seg.beyondFocus
                          ? isSelectedLeaf
                            ? '#a5f3fc'
                            : '#67e8f9'
                          : '#94a3b8';
                      return (
                        <React.Fragment key={seg.path}>
                          {i > 0 && (
                            <span style={{ color: '#475569', fontFamily: 'monospace' }}>
                              /
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setFocusDirectory(seg.path);
                              setSelectedPanelFolder(seg.path);
                              setParentLayersAnchor(seg.path);
                              setParentLayersDismissed(false);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '2px 4px',
                              borderRadius: 3,
                              fontFamily: 'monospace',
                              fontSize: 14,
                              color,
                              fontWeight: isFocus || isSelectedLeaf ? 600 : 400,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationColor: '#475569',
                            }}
                          >
                            {seg.label}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  color: '#64748b',
                  wordBreak: 'break-all',
                }}
              >
                None
              </div>
            )}
          </div>
          {focusDirectory && (
            <button
              onClick={() => setFocusPinned(p => !p)}
              title={
                focusPinned
                  ? 'Unpin — selections will move the focus again'
                  : 'Pin — keep this focus while navigating the trees'
              }
              style={{
                background: focusPinned ? '#fbbf24' : 'transparent',
                color: focusPinned ? '#0f172a' : '#cbd5e1',
                border: `1px solid ${focusPinned ? '#fbbf24' : '#334155'}`,
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {focusPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
          {focusDirectory && (
            <button
              onClick={() => {
                setFocusPinned(false);
                setFocusDirectory(null);
              }}
              title="Clear focus"
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Selected-folder card — driven by clicks on city folder panels.
            Renders below the focus overlay; an "Open" button expands the
            folder in the file tree (which removes the umbrella tile). */}
        {activeTab === 'files' && selectedPanelFolder && (
          <div
            style={{
              position: 'absolute',
              top: 60,
              left: 8,
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#e2e8f0',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 12,
              zIndex: 100,
              maxWidth: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {panelFolderCoverage && (panelFolderCoverage.scopeHits.length > 0 ||
              panelFolderCoverage.areaHits.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {panelFolderCoverage.areaHits.map(area => (
                  <div
                    key={area.name}
                    style={{
                      padding: '6px 8px',
                      background: '#0b1220',
                      border: '1px dashed #334155',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        Area
                      </span>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: AREA_PANEL_COLOR,
                          border: '1px dashed #94a3b8',
                          flexShrink: 0,
                        }}
                      />
                      <code style={{ fontSize: 12, color: '#cbd5e1' }}>{area.name}</code>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                      {area.description}
                    </div>
                  </div>
                ))}
                {panelFolderCoverage.scopeHits.map(({ scope, namespace }) => (
                  <div
                    key={scope.id}
                    style={{
                      padding: '6px 8px',
                      background: '#0b1220',
                      border: '1px solid #1e293b',
                      borderRadius: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: '#a855f7',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        Scope
                      </span>
                      <code style={{ fontSize: 12, color: '#cbd5e1' }}>{scope.id}</code>
                      {namespace && (
                        <>
                          <span style={{ color: '#475569' }}>/</span>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: namespace.color,
                              flexShrink: 0,
                            }}
                          />
                          <code style={{ fontSize: 12, color: '#cbd5e1' }}>{namespace.name}</code>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                      {namespace ? namespace.description : scope.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <div ref={addPickerRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAddPicker(v => !v)}
                  title="Add this folder to a scope or area"
                  style={{
                    background: showAddPicker ? '#1e293b' : 'transparent',
                    color: '#cbd5e1',
                    border: '1px solid #475569',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  + Add
                </button>
                {showAddPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      padding: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      zIndex: 110,
                      minWidth: 120,
                      boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowAddPicker(false);
                        openAddModal(selectedPanelFolder);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#cbd5e1',
                        border: '1px solid #a855f7',
                        borderRadius: 3,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                        textAlign: 'left',
                      }}
                    >
                      Scope
                    </button>
                    <button
                      onClick={() => {
                        setShowAddPicker(false);
                        openAddAreaModal(selectedPanelFolder);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#cbd5e1',
                        border: '1px dashed #94a3b8',
                        borderRadius: 3,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                        textAlign: 'left',
                      }}
                    >
                      Area
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const next = !showPanelFolderContents;
                  setShowPanelFolderContents(next);
                  // Mirror the Open/Close behaviour: showing contents
                  // expands the folder in the tree (so the city's umbrella
                  // tile lifts and child buildings become visible);
                  // hiding collapses it again.
                  const item = asDir(treeModel.getItem(selectedPanelFolder));
                  if (!item) return;
                  if (next) item.expand();
                  else item.collapse();
                }}
                title="Show files inside this folder"
                style={{
                  background: showPanelFolderContents ? '#1e293b' : 'transparent',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {showPanelFolderContents ? 'Hide contents' : 'Show contents'}
              </button>
            </div>
            {showPanelFolderContents && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: '1px solid #1e293b',
                  paddingTop: 8,
                  marginTop: 2,
                  minWidth: 320,
                }}
              >
                {panelFolderContentsPaths.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}
                  >
                    No files in this folder.
                  </div>
                ) : (
                  <div style={{ height: 640, display: 'flex', flexDirection: 'column' }}>
                    <FileTree
                      model={panelFolderContentsTreeModel}
                      style={
                        {
                          flex: 1,
                          minHeight: 0,
                          '--trees-bg-override': 'transparent',
                          '--trees-search-bg-override': 'rgba(0, 0, 0, 0.25)',
                          '--trees-padding-inline-override': '0',
                          '--trees-theme-list-active-selection-bg':
                            'color-mix(in oklab, #3b82f6 28%, transparent)',
                          '--trees-theme-list-hover-bg':
                            'color-mix(in oklab, #3b82f6 14%, transparent)',
                        } as React.CSSProperties
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Parent-layers popup — surfaces ancestor folders whose umbrellas
            are currently hidden (because they're expanded). Triggered by
            Cmd/Ctrl-click on a building. Each entry collapses that
            ancestor on click so its umbrella reappears. */}
        {parentLayersAnchor && !parentLayersDismissed && parentLayers.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 72,
              right: 8,
              padding: '10px 12px',
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#e2e8f0',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 12,
              zIndex: 100,
              maxWidth: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...sectionLabelStyle, flex: 1, minWidth: 0 }}>
                Hidden parent layers
              </div>
              <button
                onClick={() => setParentLayersDismissed(true)}
                title="Dismiss (reappears on next folder interaction)"
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {parentLayers.map(folderPath => {
                const label = folderPath.split('/').pop() ?? folderPath;
                return (
                  <button
                    key={folderPath}
                    onClick={() => collapseFolder(folderPath)}
                    title={`Collapse ${folderPath} — restores its umbrella tile`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      background: '#1e293b',
                      color: '#e2e8f0',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'system-ui, sans-serif',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode switch — swap which feature layer the canvas renders */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            overflow: 'hidden',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            zIndex: 10,
          }}
        >
          {(
            [
              { id: 'files' as const, label: 'Files', accent: '#3b82f6' },
              { id: 'scopes' as const, label: 'Scopes', accent: '#a855f7' },
            ]
          ).map((opt, i) => {
            const active = activeTab === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                style={{
                  padding: '8px 16px',
                  background: active ? opt.accent : 'transparent',
                  color: active ? '#ffffff' : '#cbd5e1',
                  border: 'none',
                  borderLeft: i === 0 ? 'none' : '1px solid #1e293b',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Info overlay — driven by scope tree selection */}
        {activeTab === 'scopes' && scopeInfo && <ScopeInfoOverlay info={scopeInfo} />}
      </div>

      {/* Add-to-scope modal */}
      {showAddModal && scopeModalTargetPath && (
        <AddToScopeModal
          path={toScopePath(scopeModalTargetPath)}
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
          onClose={() => {
            setShowAddModal(false);
            setScopeModalTargetPath(null);
          }}
        />
      )}

      {/* Add-to-area modal */}
      {showAddAreaModal && areaModalTargetPath && (
        <AddToAreaModal
          path={toScopePath(areaModalTargetPath)}
          areas={areas}
          areaName={modalAreaName}
          description={modalAreaDescription}
          onAreaNameChange={setModalAreaName}
          onDescriptionChange={setModalAreaDescription}
          onPickExisting={name => setModalAreaName(name)}
          onSubmit={submitAddToArea}
          onClose={() => {
            setShowAddAreaModal(false);
            setAreaModalTargetPath(null);
          }}
        />
      )}
    </div>
  );
};

export const Default: Story = {
  render: () => <FileCityExplorerTemplate />,
  parameters: {
    docs: {
      description: {
        story:
          'Author scopes, namespaces, and areas over the electron-app city. Click folders to ' +
          'add coverage, switch between Files and Scopes views, and inspect existing coverage.',
      },
    },
  },
};
