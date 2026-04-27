import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSelection,
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
import { createFileColorHighlightLayers } from '../utils/fileColorHighlightLayers';
import { buildFolderElevatedPanels, buildFolderIndex } from '../utils/folderElevatedPanels';

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

/**
 * MockArea mirrors `ProjectArea` from `@principal-ai/principal-view-core`'s
 * auxiliary manifest: a named, described region of the repo that is *not*
 * covered by an OTEL scope (docs, infra, build config, etc.). Areas live in
 * a parallel layer to scopes and never overlap them.
 */
interface MockArea {
  name: string;
  description: string;
  /** Repo-relative paths claimed by the area. */
  paths: string[];
}

const AREAS_STORAGE_KEY = 'file-city.scope-overlay.areas';

const DEFAULT_AREAS: MockArea[] = [
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

function loadAreasFromStorage(): MockArea[] {
  if (typeof window === 'undefined') return DEFAULT_AREAS;
  try {
    const raw = window.localStorage.getItem(AREAS_STORAGE_KEY);
    if (!raw) return DEFAULT_AREAS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockArea[]) : DEFAULT_AREAS;
  } catch {
    return DEFAULT_AREAS;
  }
}

function saveAreasToStorage(areas: readonly MockArea[]): void {
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
// Area tree paths
// ---------------------------------------------------------------------------

interface AreaTreeSelection {
  areaName: string;
  /** Selected sub-path leaf (repo-relative), if any. */
  pathSelected?: string;
}

const EMPTY_AREA_PATHS_SENTINEL = '(no paths)';

/**
 * Areas tree paths: `<area.name>/<repo-path>`. Each area is a top-level
 * directory whose leaves are the paths it claims. Empty areas emit a sentinel
 * so they still appear.
 *
 * Repo paths use '/' internally — we encode them as a single leaf segment by
 * replacing '/' with a non-printable separator on the way in and decoding on
 * the way out. This avoids creating spurious sub-directories in the tree.
 */
const AREA_PATH_SEP = '␟'; // visible "␟" if ever leaked, but practically unused

function encodeAreaPath(p: string): string {
  return p.split('/').join(AREA_PATH_SEP);
}

function decodeAreaPath(p: string): string {
  return p.split(AREA_PATH_SEP).join('/');
}

function buildAreaTreePaths(areas: readonly MockArea[]): string[] {
  const out: string[] = [];
  for (const area of areas) {
    if (area.paths.length === 0) {
      out.push(`${area.name}/${EMPTY_AREA_PATHS_SENTINEL}`);
      continue;
    }
    for (const p of area.paths) {
      out.push(`${area.name}/${encodeAreaPath(p)}`);
    }
  }
  return out;
}

function parseAreaTreePath(path: string): AreaTreeSelection {
  const slash = path.indexOf('/');
  if (slash < 0) return { areaName: path };
  const areaName = path.slice(0, slash);
  const rest = path.slice(slash + 1);
  if (!rest || rest === EMPTY_AREA_PATHS_SENTINEL) return { areaName };
  return { areaName, pathSelected: decodeAreaPath(rest) };
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
// Area info overlay
// ---------------------------------------------------------------------------

const AREA_PANEL_COLOR = '#64748b';

const AreaInfoOverlay: React.FC<{
  info: { area: MockArea; pathSelected: string | null };
}> = ({ info }) => {
  const { area, pathSelected } = info;
  return (
    <div style={overlayStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={sectionLabelStyle}>Area</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: AREA_PANEL_COLOR,
              border: '1px dashed #94a3b8',
              flexShrink: 0,
            }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{area.name}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
          {area.description}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
          Non-instrumented region — not covered by any OTEL scope.
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={sectionLabelStyle}>Claimed paths ({area.paths.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {area.paths.map(p => {
            const isSelected = p === pathSelected;
            return (
              <code
                key={p}
                style={{
                  fontSize: 11,
                  color: isSelected ? '#fde68a' : '#cbd5e1',
                  background: isSelected ? '#1e293b' : '#0b1220',
                  padding: '4px 6px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                  border: isSelected ? '1px solid #fbbf24' : '1px solid transparent',
                }}
              >
                {p}
              </code>
            );
          })}
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
// Add-to-area modal
// ---------------------------------------------------------------------------

const AddToAreaModal: React.FC<{
  path: string;
  areas: readonly MockArea[];
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
                fontSize: 13,
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
                  fontSize: 13,
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
                background: !canSubmit || alreadyClaimed ? '#1e293b' : '#94a3b8',
                color: !canSubmit || alreadyClaimed ? '#475569' : '#0f172a',
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

        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          <div style={sectionLabelStyle}>Existing areas (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {areas.length === 0 && (
              <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
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
                      fontSize: 10,
                      color: '#64748b',
                    }}
                  >
                    {area.paths.length} path{area.paths.length === 1 ? '' : 's'}
                  </span>
                  {claims && <span style={{ marginLeft: 4, fontSize: 9 }}>✓</span>}
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

const SingleScopeTemplate: React.FC<{ showLeftPanel?: boolean }> = ({
  showLeftPanel = true,
}) => {
  const [scopes, setScopes] = React.useState<MockScope[]>(loadScopesFromStorage);
  const [areas, setAreas] = React.useState<MockArea[]>(loadAreasFromStorage);

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
  const [areaSelection, setAreaSelection] = React.useState<AreaTreeSelection | null>(null);
  const [auditMode, setAuditMode] = React.useState<AuditMode>('off');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [scopeModalTargetPath, setScopeModalTargetPath] = React.useState<string | null>(null);
  const [modalScopeId, setModalScopeId] = React.useState('');
  const [modalNamespaceName, setModalNamespaceName] = React.useState('');
  const [showAddAreaModal, setShowAddAreaModal] = React.useState(false);
  const [areaModalTargetPath, setAreaModalTargetPath] = React.useState<string | null>(null);
  const [modalAreaName, setModalAreaName] = React.useState('');
  const [modalAreaDescription, setModalAreaDescription] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'files' | 'scopes' | 'areas'>('files');

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

  // City data narrowed by audit mode — render only the matching buildings so
  // the 3D view mirrors the (already-filtered) file tree. Districts are kept
  // intact for spatial context; empty ones simply have no buildings inside.
  const auditedCityData = React.useMemo<CityData>(() => {
    if (auditMode === 'off') return electronAppCityData as CityData;
    const buildings = auditMode === 'uncovered' ? uncoveredFiles : coveredFiles;
    return { ...(electronAppCityData as CityData), buildings };
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

  // ---- Areas tree --------------------------------------------------------
  const areaTreePaths = React.useMemo(() => buildAreaTreePaths(areas), [areas]);
  const initialAreaTreePaths = React.useRef(areaTreePaths);
  const initialExpandedAreaNames = React.useRef(areas.map(a => a.name));
  const { model: areaTreeModel } = useFileTree({
    paths: initialAreaTreePaths.current,
    search: true,
    initialExpandedPaths: initialExpandedAreaNames.current,
    onSelectionChange: paths => {
      const selected = paths[0];
      if (!selected) {
        setAreaSelection(null);
        return;
      }
      const parsed = parseAreaTreePath(selected);
      setAreaSelection(parsed);

      // Selecting an area path leaf focuses the city on it; selecting a bare
      // area clears focus.
      if (parsed.pathSelected) {
        setFocusDirectoryIfUnpinned(toCityPath(parsed.pathSelected));
      } else {
        setFocusDirectoryIfUnpinned(null);
      }
    },
  });

  const isFirstAreaTreeSync = React.useRef(true);
  React.useEffect(() => {
    if (isFirstAreaTreeSync.current) {
      isFirstAreaTreeSync.current = false;
      return;
    }
    areaTreeModel.resetPaths(areaTreePaths);
  }, [areaTreeModel, areaTreePaths]);

  // Resolve the current area tree selection into the underlying objects.
  const areaInfo = React.useMemo(() => {
    if (!areaSelection) return null;
    const area = areas.find(a => a.name === areaSelection.areaName);
    if (!area) return null;
    return { area, pathSelected: areaSelection.pathSelected ?? null };
  }, [areaSelection, areas]);

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

  // Elevated panels for the Areas layer — one muted tile per claimed path.
  // Areas have no sub-structure (paths are leaves directly under the area),
  // so expansion in the sidebar doesn't change the panel set; clicking a
  // panel toggles the area node's expansion to mirror the scopes UX.
  const areasElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'areas') return undefined;
    const panels: ElevatedScopePanel[] = [];

    for (const area of areas) {
      const onClick = () => asDir(areaTreeModel.getItem(area.name))?.toggle();
      for (const ap of area.paths) {
        const district = ELECTRON_DISTRICTS_BY_PATH.get(toCityPath(ap));
        if (!district) continue;
        panels.push({
          id: `area::${area.name}::${ap}`,
          color: AREA_PANEL_COLOR,
          height: 4,
          thickness: 2,
          bounds: district.worldBounds,
          label: area.name,
          onClick,
        });
      }
    }

    return panels.length > 0 ? panels : undefined;
  }, [activeTab, areas, areaTreeModel]);

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

  // Elevated folder panels — driven by the file tree's expansion state.
  // Hidden during audit modes so the filtered buildings aren't obscured by
  // umbrella tiles for folders that may now be empty or partially shown.
  const folderElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'files') return undefined;
    if (auditMode !== 'off') return undefined;
    const panels = buildFolderElevatedPanels({
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
    auditMode,
    selectedPanelFolder,
    treeModel,
    folderTreeExpansion,
    setFocusDirectoryIfUnpinned,
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

  // Coverage lookup for the city-panel-clicked folder. Returns scope hits
  // (with the most specific covering namespace, if any) and area hits.
  const panelFolderCoverage = React.useMemo(() => {
    if (!selectedPanelFolder) return null;
    const sp = toScopePath(selectedPanelFolder);
    const covers = (claim: string) => sp === claim || sp.startsWith(claim + '/');

    const scopeHits: { scope: MockScope; namespace: MockNamespace | null }[] = [];
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
      {/* Left pane — tabbed: file tree | scopes tree */}
      {showLeftPanel && (
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
              { id: 'areas' as const, label: 'Areas', accent: '#94a3b8' },
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
                        onClick={() => selectedFilePath && openAddModal(selectedFilePath, scope.id)}
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
                      onClick={() => selectedFilePath && openAddModal(selectedFilePath)}
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
        ) : activeTab === 'scopes' ? (
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
              Project areas
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
                Non-instrumented regions of the repo (docs, tooling). Sourced from the
                auxiliary manifest in principal-view-core.
              </div>
            </div>
            <FileTree
              model={areaTreeModel}
              style={
                {
                  flex: 1,
                  minHeight: 0,
                  '--trees-theme-list-active-selection-bg':
                    'color-mix(in oklab, #94a3b8 28%, transparent)',
                  '--trees-theme-list-hover-bg':
                    'color-mix(in oklab, #94a3b8 14%, transparent)',
                } as React.CSSProperties
              }
            />
          </>
        )}
      </div>
      )}

      {/* Right pane — city + scope panel */}
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
            cityData={auditedCityData}
            height="100%"
            width="100%"
            heightScaling="linear"
            linearScale={0.5}
            focusDirectory={focusDirectory}
            highlightLayers={cityHighlightLayers}
            elevatedScopePanels={
              cityElevatedPanels ?? areasElevatedPanels ?? folderElevatedPanels
            }
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
            fontSize: 12,
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
                              fontSize: 12,
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
                  fontSize: 12,
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
                          fontSize: 9,
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
                      <code style={{ fontSize: 11, color: '#cbd5e1' }}>{area.name}</code>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
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
                          fontSize: 9,
                          color: '#a855f7',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          fontWeight: 600,
                        }}
                      >
                        Scope
                      </span>
                      <code style={{ fontSize: 11, color: '#cbd5e1' }}>{scope.id}</code>
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
                          <code style={{ fontSize: 11, color: '#cbd5e1' }}>{namespace.name}</code>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
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
                <div style={{ ...sectionLabelStyle, marginBottom: 4 }}>
                  Contents ({panelFolderContentsPaths.length}{' '}
                  {panelFolderContentsPaths.length === 1 ? 'file' : 'files'})
                </div>
                {panelFolderContentsPaths.length === 0 ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#64748b',
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}
                  >
                    No files in this folder.
                  </div>
                ) : (
                  <div style={{ height: 320, display: 'flex', flexDirection: 'column' }}>
                    <FileTree
                      model={panelFolderContentsTreeModel}
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

        {/* Info overlay — driven by scope or area tree selection */}
        {activeTab === 'scopes' && scopeInfo && <ScopeInfoOverlay info={scopeInfo} />}
        {activeTab === 'areas' && areaInfo && <AreaInfoOverlay info={areaInfo} />}
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

export const SingleScopeNoPanel: Story = {
  render: () => <SingleScopeTemplate showLeftPanel={false} />,
  parameters: {
    docs: {
      description: {
        story:
          'Same as SingleScope but with the left tabbed panel (file tree / scopes / areas) hidden, ' +
          'leaving only the 3D city and its in-canvas overlays.',
      },
    },
  },
};
