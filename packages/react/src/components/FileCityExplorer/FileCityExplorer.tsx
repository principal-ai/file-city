import React from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import {
  FileTree,
  useFileTree,
  useFileTreeSelector,
  type UseFileTreeResult,
} from '@pierre/trees/react';
import type { FileTreeDirectoryHandle, FileTreeItemHandle } from '@pierre/trees';

import {
  FileCity3D,
  type CityData,
  type CityDistrict,
  type ElevatedScopePanel,
} from '../FileCity3D';
import { buildFolderElevatedPanels, buildFolderIndex } from '../../utils/folderElevatedPanels';

import { AddToAreaModal } from './AddToAreaModal';
import { AddToScopeModal } from './AddToScopeModal';
import { ScopeInfoOverlay } from './ScopeInfoOverlay';
import { AREA_PANEL_COLOR, buildLayersForScope, pickNamespaceColor } from './layers';
import type { Namespace, ProjectArea, Scope } from './model';
import { createPathConverters } from './pathConversion';
import {
  buildScopeTreePaths,
  parseScopeTreePath,
  type ScopeTreeSelection,
} from './scopeTreePaths';
import { makeSectionLabelStyle, withAlpha } from './styles';

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

export interface FileCityExplorerProps {
  /** City data to render in the 3D canvas. */
  cityData: CityData;
  /**
   * Prefix that scopes/namespace paths are stripped of when read out of
   * `cityData` (e.g. `'electron-app/'`). Pass `''` if the city data is already
   * rooted at the project root.
   */
  packageRoot: string;
  /** Initial scopes (used when no persisted state is found). */
  initialScopes?: Scope[];
  /** Initial areas (used when no persisted state is found). */
  initialAreas?: ProjectArea[];
  /**
   * When set, scopes/areas round-trip through `localStorage` under
   * `${persistKey}.scopes` and `${persistKey}.areas`. When omitted, state is
   * purely in-memory.
   */
  persistKey?: string | null;
  /**
   * Initial focused directory (city path). Defaults to the city root derived
   * from `packageRoot` (with trailing slash stripped).
   */
  initialFocusDirectory?: string | null;
}

export const FileCityExplorer: React.FC<FileCityExplorerProps> = ({
  cityData,
  packageRoot,
  initialScopes,
  initialAreas,
  persistKey,
  initialFocusDirectory,
}) => {
  const { theme } = useTheme();
  const sectionLabelStyle = makeSectionLabelStyle(theme);

  // City root without trailing slash — used as the iterative-zoom-out clamp
  // and the default initial focus.
  const packageRootClamp = React.useMemo(
    () => (packageRoot.endsWith('/') ? packageRoot.slice(0, -1) : packageRoot),
    [packageRoot],
  );

  const { toScopePath, toCityPath } = React.useMemo(
    () => createPathConverters(packageRoot),
    [packageRoot],
  );

  // City-derived lookups — recomputed only if `cityData` changes.
  const cityPaths = React.useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const b of cityData.buildings) set.add(b.path);
    return Array.from(set).sort();
  }, [cityData]);

  const cityDirectories = React.useMemo<Set<string>>(
    () => new Set(cityData.districts.map(d => d.path)),
    [cityData],
  );

  const districtsByPath = React.useMemo<Map<string, CityDistrict>>(
    () => new Map(cityData.districts.map(d => [d.path, d])),
    [cityData],
  );

  const folderIndex = React.useMemo(() => buildFolderIndex(cityData), [cityData]);

  // Storage keys derived from persistKey (if set).
  const scopesKey = persistKey ? `${persistKey}.scopes` : null;
  const areasKey = persistKey ? `${persistKey}.areas` : null;

  const [scopes, setScopes] = React.useState<Scope[]>(() => {
    if (scopesKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(scopesKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed as Scope[];
        }
      } catch {
        // fall through
      }
    }
    return initialScopes ?? [];
  });

  const [areas, setAreas] = React.useState<ProjectArea[]>(() => {
    if (areasKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(areasKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed as ProjectArea[];
        }
      } catch {
        // fall through
      }
    }
    return initialAreas ?? [];
  });

  React.useEffect(() => {
    if (!scopesKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(scopesKey, JSON.stringify(scopes));
    } catch {
      // ignore quota / serialization errors
    }
  }, [scopes, scopesKey]);

  React.useEffect(() => {
    if (!areasKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(areasKey, JSON.stringify(areas));
    } catch {
      // ignore quota / serialization errors
    }
  }, [areas, areasKey]);

  const [focusDirectory, setFocusDirectory] = React.useState<string | null>(
    initialFocusDirectory !== undefined ? initialFocusDirectory : packageRootClamp,
  );
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
    return cityPaths.filter(p => p.startsWith(prefix))
      .map(p => p.slice(prefix.length))
      .sort();
  }, [selectedPanelFolder, showPanelFolderContents, cityPaths]);

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

  const initialCityPaths = React.useRef(cityPaths);
  const { model: treeModel } = useFileTree({
    paths: initialCityPaths.current,
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
      if (cityDirectories.has(selected)) {
        setFocusDirectoryIfUnpinned(selected);
        setParentLayersAnchor(selected);
        setParentLayersDismissed(false);
        return;
      }
      const parts = selected.split('/');
      while (parts.length > 1) {
        parts.pop();
        const candidate = parts.join('/');
        if (cityDirectories.has(candidate)) {
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
      return scopeInfo ? buildLayersForScope(scopeInfo.scope, toCityPath) : undefined;
    }
    return undefined;
  }, [activeTab, scopeInfo, toCityPath]);

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
          const district = districtsByPath.get(toCityPath(sp));
          if (!district) continue;
          panels.push({
            id: `${scope.id}::scope::${sp}`,
            color: theme.colors.textTertiary,
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
          const district = districtsByPath.get(toCityPath(np));
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
  }, [activeTab, scopes, scopeTreeModel, treeExpansion, districtsByPath, toCityPath, theme]);

  // Track which folders are expanded in the file tree. The file-tree tab's
  // elevated panels mirror this: a collapsed folder shows one umbrella tile
  // covering every descendant district; expanding the folder reveals its
  // sub-folder tiles (or the buildings themselves at the leaves).
  const folderTreeExpansion = useFileTreeSelector(
    treeModel,
    React.useCallback((model: FileTreeModel) => {
      const expanded = new Set<string>();
      for (const dir of cityDirectories) {
        const item = asDir(model.getItem(dir));
        if (item && item.isExpanded()) expanded.add(dir);
      }
      return { expanded };
    }, [cityDirectories]),
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
        for (const dir of cityDirectories) {
          if (!dir.startsWith(prefix)) continue;
          const stripped = dir.slice(prefix.length);
          const item = asDir(model.getItem(stripped));
          if (item && item.isExpanded()) expanded.add(dir);
        }
        return { expanded };
      },
      [selectedPanelFolder, cityDirectories],
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
  }, [areas, toCityPath]);

  const folderElevatedPanels = React.useMemo<ElevatedScopePanel[] | undefined>(() => {
    if (activeTab !== 'files') return undefined;
    const rawPanels = buildFolderElevatedPanels({
      cityData,
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
          next = slash > 0 ? folderPath.slice(0, slash) : packageRootClamp;
          nextSelected = next;
        }
        setSelectedPanelFolder(nextSelected);
        setFocusDirectoryIfUnpinned(next);
        setParentLayersAnchor(nextSelected);
        setParentLayersDismissed(false);
      },
      index: folderIndex,
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
          color: theme.colors.warning,
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
    cityData,
    selectedPanelFolder,
    treeModel,
    folderTreeExpansion,
    setFocusDirectoryIfUnpinned,
    areaNameByCityPath,
    folderIndex,
    packageRootClamp,
    theme,
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
  }, [selectedPanelFolder, scopes, areas, toScopePath]);

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
  }, [scopeModalTargetPath, modalScopeId, modalNamespaceName, toScopePath]);

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
  }, [areaModalTargetPath, modalAreaName, modalAreaDescription, toScopePath]);

  return (
    <div style={{ height: '100vh', display: 'flex', background: theme.colors.background }}>
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
            cityData={cityData}
            height="100%"
            width="100%"
            heightScaling="linear"
            linearScale={0.5}
            backgroundColor={theme.colors.background}
            textColor={theme.colors.textMuted}
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
            top: theme.space[2],
            left: theme.space[2],
            right: theme.space[2],
            padding: '8px 12px',
            background: withAlpha(theme.colors.background, 72),
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${focusPinned ? theme.colors.warning : theme.colors.border}`,
            borderRadius: theme.radii[3],
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
            fontSize: theme.fontSizes[1],
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
                  if (cityDirectories.has(path)) {
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
                      const color = isFocus || seg.beyondFocus
                        ? theme.colors.text
                        : theme.colors.textMuted;
                      return (
                        <React.Fragment key={seg.path}>
                          {i > 0 && (
                            <span style={{ color: theme.colors.text, fontFamily: theme.fonts.monospace }}>
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
                              borderRadius: theme.radii[1],
                              fontFamily: theme.fonts.monospace,
                              fontSize: theme.fontSizes[1],
                              color,
                              fontWeight: isFocus || isSelectedLeaf
                                ? theme.fontWeights.semibold
                                : theme.fontWeights.body,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationColor: theme.colors.muted,
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
                  fontFamily: theme.fonts.monospace,
                  fontSize: theme.fontSizes[1],
                  color: theme.colors.textTertiary,
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
                background: focusPinned ? theme.colors.warning : 'transparent',
                color: focusPinned ? theme.colors.background : theme.colors.textSecondary,
                border: `1px solid ${focusPinned ? theme.colors.warning : theme.colors.border}`,
                borderRadius: theme.radii[2],
                padding: '4px 8px',
                fontSize: theme.fontSizes[0],
                cursor: 'pointer',
                fontWeight: theme.fontWeights.medium,
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
                color: theme.colors.textMuted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii[2],
                padding: '4px 8px',
                fontSize: theme.fontSizes[0],
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
              left: theme.space[2],
              padding: '8px 12px',
              background: withAlpha(theme.colors.background, 72),
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii[3],
              color: theme.colors.text,
              fontFamily: theme.fonts.body,
              fontSize: theme.fontSizes[0],
              zIndex: 100,
              maxWidth: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.space[2],
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
                      background: theme.colors.backgroundDark ?? theme.colors.background,
                      border: `1px dashed ${theme.colors.border}`,
                      borderRadius: theme.radii[2],
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.space[1],
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: theme.fontSizes[0],
                          color: theme.colors.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          fontWeight: theme.fontWeights.semibold,
                        }}
                      >
                        Area
                      </span>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: theme.radii[1],
                          background: AREA_PANEL_COLOR,
                          border: `1px dashed ${theme.colors.textMuted}`,
                          flexShrink: 0,
                        }}
                      />
                      <code style={{ fontSize: theme.fontSizes[0], color: theme.colors.textSecondary }}>{area.name}</code>
                    </div>
                    <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textMuted, lineHeight: 1.4 }}>
                      {area.description}
                    </div>
                  </div>
                ))}
                {panelFolderCoverage.scopeHits.map(({ scope, namespace }) => (
                  <div
                    key={scope.id}
                    style={{
                      padding: '6px 8px',
                      background: theme.colors.backgroundDark ?? theme.colors.background,
                      border: `1px solid ${theme.colors.backgroundSecondary}`,
                      borderRadius: theme.radii[2],
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.space[1],
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: theme.fontSizes[0],
                          color: theme.colors.accent,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          fontWeight: theme.fontWeights.semibold,
                        }}
                      >
                        Scope
                      </span>
                      <code style={{ fontSize: theme.fontSizes[0], color: theme.colors.textSecondary }}>{scope.id}</code>
                      {namespace && (
                        <>
                          <span style={{ color: theme.colors.muted }}>/</span>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: theme.radii[1],
                              background: namespace.color,
                              flexShrink: 0,
                            }}
                          />
                          <code style={{ fontSize: theme.fontSizes[0], color: theme.colors.textSecondary }}>{namespace.name}</code>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textMuted, lineHeight: 1.4 }}>
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
                    background: showAddPicker ? theme.colors.backgroundSecondary : 'transparent',
                    color: theme.colors.textSecondary,
                    border: `1px solid ${theme.colors.muted}`,
                    borderRadius: theme.radii[2],
                    padding: '4px 10px',
                    fontSize: theme.fontSizes[0],
                    cursor: 'pointer',
                    fontWeight: theme.fontWeights.medium,
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
                      background: withAlpha(theme.colors.background, 95),
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii[2],
                      padding: theme.space[1],
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      zIndex: 110,
                      minWidth: 120,
                      boxShadow: theme.shadows[3],
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowAddPicker(false);
                        openAddModal(selectedPanelFolder);
                      }}
                      style={{
                        background: 'transparent',
                        color: theme.colors.textSecondary,
                        border: `1px solid ${theme.colors.accent}`,
                        borderRadius: theme.radii[1],
                        padding: '4px 10px',
                        fontSize: theme.fontSizes[0],
                        cursor: 'pointer',
                        fontWeight: theme.fontWeights.medium,
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
                        color: theme.colors.textSecondary,
                        border: `1px dashed ${theme.colors.textMuted}`,
                        borderRadius: theme.radii[1],
                        padding: '4px 10px',
                        fontSize: theme.fontSizes[0],
                        cursor: 'pointer',
                        fontWeight: theme.fontWeights.medium,
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
                  background: showPanelFolderContents ? theme.colors.backgroundSecondary : 'transparent',
                  color: theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii[2],
                  padding: '4px 10px',
                  fontSize: theme.fontSizes[0],
                  cursor: 'pointer',
                  fontWeight: theme.fontWeights.medium,
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
                  borderTop: `1px solid ${theme.colors.backgroundSecondary}`,
                  paddingTop: theme.space[2],
                  marginTop: 2,
                  minWidth: 320,
                }}
              >
                {panelFolderContentsPaths.length === 0 ? (
                  <div
                    style={{
                      fontSize: theme.fontSizes[0],
                      color: theme.colors.textTertiary,
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
                          '--trees-theme-list-active-selection-bg': withAlpha(theme.colors.primary, 28),
                          '--trees-theme-list-hover-bg': withAlpha(theme.colors.primary, 14),
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
              right: theme.space[2],
              padding: '10px 12px',
              background: withAlpha(theme.colors.background, 72),
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii[3],
              color: theme.colors.text,
              fontFamily: theme.fonts.body,
              fontSize: theme.fontSizes[0],
              zIndex: 100,
              maxWidth: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.space[2],
              boxShadow: theme.shadows[3],
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
                  color: theme.colors.textMuted,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii[2],
                  padding: '4px 8px',
                  fontSize: theme.fontSizes[0],
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[1] }}>
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
                      gap: theme.space[2],
                      padding: '6px 8px',
                      background: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii[2],
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: theme.fonts.body,
                      fontSize: theme.fontSizes[0],
                    }}
                  >
                    <span style={{ fontFamily: theme.fonts.monospace, fontWeight: theme.fontWeights.medium }}>{label}</span>
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
            bottom: theme.space[3],
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            background: withAlpha(theme.colors.background, 92),
            border: `1px solid ${theme.colors.backgroundSecondary}`,
            borderRadius: theme.radii[3],
            overflow: 'hidden',
            fontFamily: theme.fonts.body,
            fontSize: theme.fontSizes[0],
            boxShadow: theme.shadows[2],
            zIndex: 10,
          }}
        >
          {(
            [
              { id: 'files' as const, label: 'Files', accent: theme.colors.primary },
              { id: 'scopes' as const, label: 'Scopes', accent: theme.colors.accent },
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
                  color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary,
                  border: 'none',
                  borderLeft: i === 0 ? 'none' : `1px solid ${theme.colors.backgroundSecondary}`,
                  cursor: 'pointer',
                  fontWeight: active ? theme.fontWeights.semibold : theme.fontWeights.body,
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
