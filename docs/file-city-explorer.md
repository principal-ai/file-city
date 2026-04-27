# FileCityExplorer — extraction notes

This document captures **how the FileCityExplorer story works today** and **what
would need to happen to lift it into a real component**, with an eye on the fact
that this thing is unlikely to stay in `@file-city/react` long-term — it will
probably move into the principal-view app or into a new package once the
scope/namespace/area model is wired up to real `*.events.canvas` data.

The goal of this doc is to make that future move cheap. It is *not* a plan to
ship; review and tell me what to change before any code moves.

Source today: two stories side-by-side under `packages/react/src/stories/`:
- `FileCityExplorer.stories.tsx` — original prototype-as-story (**frozen,
  scheduled for deletion** — see "Pending cleanup" below).
- `FileCityExplorerComponent.stories.tsx` — exercises the extracted component
  at `packages/react/src/components/FileCityExplorer/`.

---

## 0. Pending cleanup

- [ ] **Delete `packages/react/src/stories/FileCityExplorer.stories.tsx`**
      once the extracted `<FileCityExplorer>` (in
      `packages/react/src/components/FileCityExplorer/`) is confirmed
      behaviourally equivalent in side-by-side Storybook comparison.
      Until then it stays in place as the reference, marked frozen via a
      banner comment and via its `Deprecated/` Storybook category. **Do not
      modify it** — make changes to the extracted component instead.

---

## 1. What it is, from the user's point of view

A full-screen experimental UI for browsing the electron-app city while
authoring **scopes**, **namespaces**, and **areas** over the directory tree.
The whole screen is the 3D canvas (`FileCity3D`) with floating overlays on
top:

```
┌──────────────────────────────────────────────────────────────────┐
│  Path  electron-app › src › renderer        [Pin] [Clear]        │ ← focus bar
├──────────────────────────────────────────────────────────────────┤   (top: 8,
│ ┌──────────────────────────┐              ┌───────────────────┐  │    full width)
│ │ Selected folder          │              │ Parent layers     │  │
│ │   src/renderer           │              │   ▸ src           │  │ ← top-right
│ │   [+ Add ▾]  [Show…]     │              │   ▸ src/renderer  │  │   popup
│ │   Coverage: 2 scopes     │              └───────────────────┘  │   (top: 72)
│ │   ┌────────────────┐     │                                     │
│ │   │ inline file    │     │                                     │
│ │   │ tree (opt.)    │     │                                     │
│ │   └────────────────┘     │                                     │
│ └──────────────────────────┘ ← top-left card (top: 60)           │
│         OR ScopeInfoOverlay on Scopes tab                        │
│                                                                  │
│                       FileCity3D canvas                          │
│                       (top: 56, bottom: 0)                       │
│                                                                  │
│                       ┌────────────────┐                         │
│                       │ Files │ Scopes │ ← mode switch           │
│                       └────────────────┘   (bottom: 16, centre)  │
└──────────────────────────────────────────────────────────────────┘
  AddToScopeModal / AddToAreaModal render as centred `position: fixed`
  overlays above everything (only one open at a time).
```

- **Top focus/breadcrumb bar** (always visible) with Pin / Clear buttons.
- **Selected-folder card** (top-left, when a folder is clicked in the city) —
  coverage info, `+ Add` menu (Scope / Area), and a "Show contents" toggle
  that reveals an inline mini file tree rooted at that folder.
- **Parent-layers popup** (top-right, when applicable) — buttons that collapse
  expanded ancestor folders so their umbrella tiles reappear.
- **Scope info overlay** (top-left, Scopes tab only) — `ScopeInfoOverlay`
  rendered when something is selected in the scope tree.
- **`Files | Scopes` mode switch** at the bottom centre — swaps which set of
  highlight layers + elevated panels the city renders. **It does not swap
  sidebars** (there are no sidebars).
- **Add-to-scope / Add-to-area modals** when triggered from the `+ Add` menu.

There is **no sidebar tree UI**. The `useFileTree` instances (`treeModel`,
`scopeTreeModel`) exist only as headless state-holders — see "Tree models"
below. The only `<FileTree>` that ever renders is the inline contents view
inside the selected-folder card.

Persistence is `localStorage` under two keys
(`file-city.scope-overlay.scopes` and `…areas`), seeded with `DEFAULT_AREAS`
on first load.

The conceptual model the UI is prototyping is documented in
`docs/scope-namespace-overlay.md`. Read that first if the words "scope" and
"namespace" don't already mean something specific to you.

---

## 2. Internal structure

The story file is one big template component plus supporting pieces. Sections,
in file order:

| Lines | Block | Purpose |
| --- | --- | --- |
| 1–32 | imports + `asDir` helper | `FileTreeItemHandle` narrowing for `expand/collapse/toggle`. |
| 50–57 | `meta` / `Story` types | Storybook scaffolding. |
| 60–164 | Mock data types + storage | `MockEvent`, `MockNamespace`, `MockScope`, `MockArea`, plus `loadScopesFromStorage` / `saveScopesToStorage` / `loadAreasFromStorage` / `saveAreasToStorage`. |
| 166–189 | City-derived constants | `ELECTRON_PATHS`, `ELECTRON_DIRECTORIES`, `ELECTRON_DISTRICTS_BY_PATH`, `ELECTRON_FOLDER_INDEX`. Computed once at module load from `electron-app-city-data.json`. |
| 191–244 | Scope-tree path encoding | `buildScopeTreePaths` flattens scopes into `<scopeId>/<ns>/<event>` paths for `useFileTree`; `parseScopeTreePath` reverses it. Sentinel leaves keep empty branches visible. |
| 246–494 | `ScopeInfoOverlay` | Right-side info card, three render modes (event / namespace / scope). |
| 496–807 | `AddToScopeModal` | Modal: pick existing scope+namespace or create new. |
| 808–1077 | `AddToAreaModal` | Modal: pick or create an area. |
| 1083–1162 | Cross-cutting helpers | `toScopePath` / `toCityPath` (strip/restore `electron-app/` prefix), `pickNamespaceColor`, `buildLayersForScope`. |
| 1163–2522 | `FileCityExplorerTemplate` | The big component. State, effects, derived memos, render. |
| 2524–2535 | `Default` export | One-liner story rendering the template. |

### State held by `FileCityExplorerTemplate`

There are ~20 `useState`s. They cluster into a handful of concerns:

1. **Authored model** — `scopes`, `areas`. Persisted to `localStorage` via
   effects (1167–1172).
2. **Camera focus** — `focusDirectory`, `focusPinned`. Refs (`focusPinnedRef`,
   `focusDirectoryRef`) plus a wrapped setter `setFocusDirectoryIfUnpinned`
   so handlers can't accidentally move the camera while the user has pinned
   it.
3. **Folder selection** — `selectedPanelFolder`, `showPanelFolderContents`.
   Drives the "selected folder" card and an optional in-card mini file tree.
4. **+Add menu / modals** — `showAddPicker`, `addPickerRef`, `showAddModal`,
   `scopeModalTargetPath`, `modalScopeId`, `modalNamespaceName`,
   `showAddAreaModal`, `areaModalTargetPath`, `modalAreaName`,
   `modalAreaDescription`.
5. **Parent-layers panel** — `parentLayersAnchor`, `parentLayersDismissed`.
6. **Mode** — `activeTab` (`'files' | 'scopes'`).
7. **Scope tree selection** — `scopeSelection`.

### Tree models

Three independent `useFileTree` instances. **Two of them are headless** — the
component creates them for their state machine (selection, expansion) but
never renders a `<FileTree>` for them. The user manipulates them indirectly,
through clicks on the 3D city.

- `treeModel` — the main file tree (`ELECTRON_PATHS`). Headless. Its
  *expansion* state drives folder umbrella tiles in the Files tab; clicks on
  those tiles call `treeModel.expand/collapse/toggle` via the
  `buildFolderElevatedPanels` callbacks, and the `panelFolderContentsTreeModel`
  mirror also writes back into it. Its `onSelectionChange` (camera-focus on
  the closest ancestor district) is wired up but appears to be **inert in
  practice** since nothing renders this tree to click — selection only fires
  via the contents-tree mini view, whose model is a different instance.
- `scopeTreeModel` — the scope tree (paths from `buildScopeTreePaths`).
  Headless. Its expansion state drives scope/namespace umbrella tiles in the
  Scopes tab; clicking a tile calls `asDir(scopeTreeModel.getItem(id)).toggle()`.
  `onSelectionChange` is wired but, like `treeModel`, only fires from
  whichever `<FileTree>` would render it — and none does today.
- `panelFolderContentsTreeModel` — the *only* tree that renders. Shown as a
  `<FileTree>` inline in the selected-folder card when "Show contents" is
  on, rooted at `selectedPanelFolder`. `resetPaths` is called when the
  selection changes. Expansions inside this view are mirrored back into
  `treeModel` (so umbrellas in the city lift in sync).

`useFileTreeSelector` is used to derive expanded-set views from each tree:

- `treeExpansion` (scope tree) → `{ expandedScopes, expandedNamespaces }`.
  Drives which umbrella tiles render in the city (Scopes tab).
- `folderTreeExpansion` (file tree) → `{ expanded }`. Drives folder umbrella
  tiles (Files tab).
- `contentsFolderExpansion` (panel sub-tree) → mirrored back into `treeModel`
  via diff against a `prevContentsExpansionRef`, so expanding folders inside
  the floating contents view also collapses umbrellas in the city.

### Derived data

All `useMemo`. Each one is independently understandable:

- `scopeTreePaths` + an effect that calls `scopeTreeModel.resetPaths` (with
  a `pendingExpand` queue so newly-created scopes/namespaces auto-open after
  the next tree reset).
- `scopeInfo` — resolves the current `scopeSelection` into actual objects.
- `cityHighlightLayers` — `buildLayersForScope` on Scopes tab; none on
  Files tab.
- `cityElevatedPanels` (Scopes tab only) — umbrella tiles per scope/namespace
  path, hidden when the corresponding tree node is expanded; clicking a tile
  toggles the matching tree node.
- `folderElevatedPanels` (Files tab only) — same idea but driven by the file
  tree's expansion state, via the shared `buildFolderElevatedPanels` util.
  Adds a yellow-ring "selection indicator" panel under
  `selectedPanelFolder`.
- `parentLayers` — the chain of expanded ancestors of `parentLayersAnchor`,
  used to render the "click to collapse" buttons in the top-right panel.
- `panelFolderCoverage` — for the selected-folder card, looks up which scopes
  / namespaces / areas already cover that folder.

### Behaviours worth calling out

- **Pin guard**: every place that *would* move the camera goes through
  `setFocusDirectoryIfUnpinned`. The breadcrumb buttons deliberately bypass
  the guard (clicking a crumb always moves the camera).
- **Iterative zoom-out**: double-clicking the focused folder pops the focus
  up to its parent, clamped at `electron-app`.
- **Pending-expand queue**: when the user creates a new scope/namespace the
  tree's path list changes; we queue the new branches in `pendingExpand` and
  call `expand()` on them in the post-`resetPaths` effect so they open
  automatically.
- **Contents-tree mirror**: a single effect diffs current vs. previous mirrored
  expansion sets so collapses propagate without stomping folders the user
  expanded directly via city umbrellas.
- **Click-outside dismissal** for `+ Add` is at `document` level so clicks
  on the canvas dismiss it too.

### `FileCity3D` contract

The seam between the canvas and the overlay layer is narrow. Everything
`FileCity3D` knows about the explorer goes through props; everything the
explorer learns about user input on the canvas comes back through callbacks.
Worth making explicit because every overlay obeys this discipline:

**Props down (only surface area into the canvas):**

| Prop | What the explorer drives it with |
| --- | --- |
| `cityData` | Fixed (`electronAppCityData` today). |
| `focusDirectory` | Camera target — the **only** camera control. |
| `highlightLayers` | `buildLayersForScope(scopeInfo.scope)` on Scopes tab; `undefined` on Files. |
| `elevatedScopePanels` | `cityElevatedPanels` (Scopes) ?? `folderElevatedPanels` (Files). |
| `onBuildingClick` | Single handler for building hits. |
| `animation`, `showControls`, `heightScaling`, `linearScale` | Static. |

**Callbacks up:**

- `onBuildingClick(building, event)` — Cmd/Ctrl-click opens the parent-layers
  popup at that building's path; plain click is currently unhandled.
- Per-panel `onClick` attached to each `ElevatedScopePanel` — fires for
  umbrella-tile hits and toggles the matching tree node (folder tree on
  Files tab, scope tree on Scopes tab).

There is no ref into the canvas, no event bus, no shared mutable state.

**DOM stacking:**

The canvas wrapper is `position: absolute; top: 56` (below the focus bar).
All overlays are absolutely-positioned siblings rendered *after* `<FileCity3D>`
in JSX, so they win the z-order without explicit `z-index` (the focus bar
itself uses `zIndex: 100` for headroom under the modals). Pointer events fall
through to the canvas wherever an overlay isn't drawn — most of the screen
is clickable city even with several overlays open.

**Camera discipline:**

`focusDirectory` is set exclusively through `setFocusDirectoryIfUnpinned`,
except for the breadcrumb buttons (which intentionally bypass pinning). This
is what makes it safe to wire any overlay click to a focus change without
each handler having to think about whether the camera is pinned.

---

## 3. Dependencies (what would have to go with it)

### From this package

- `FileCity3D`, `CityData`, `CityDistrict`, `ElevatedScopePanel`,
  `HighlightLayer` (`packages/react/src/components/FileCity3D`).
- `createFileColorHighlightLayers`
  (`packages/react/src/utils/fileColorHighlightLayers`).
- `buildFolderElevatedPanels`, `buildFolderIndex`
  (`packages/react/src/utils/folderElevatedPanels`).
- The electron-app fixture: `assets/electron-app-city-data.json`.

### External

- `react`.
- `@pierre/trees/react`: `FileTree`, `useFileTree`, `useFileTreeSelector`,
  `UseFileTreeResult`.
- `@pierre/trees`: `FileTreeDirectoryHandle`, `FileTreeItemHandle`.
- `@principal-ai/principal-view-core` (≥ 0.28.5): `EventNamespaceNode`,
  `ProjectArea` (type-only). See §4 for what's derived from upstream and
  what stays local.

Storybook is *not* a runtime dep of the component itself — only `Meta` /
`StoryObj` types, which stay in the story file.

### Internal helpers worth promoting to siblings (not props)

These are pure, stateless, and would naturally travel with the component:

- `asDir` (handle narrowing — could even live in `@pierre/trees` upstream)
- `buildScopeTreePaths`, `parseScopeTreePath`
- `pickNamespaceColor`, `NAMESPACE_PALETTE`
- `buildLayersForScope`
- `toScopePath` / `toCityPath`

`AddToScopeModal`, `AddToAreaModal`, `ScopeInfoOverlay` are component-private
today and should move with the component.

---

## 4. Types: local vs upstream

The explorer's four model types are now a mix of upstream-derived and
local. `@principal-ai/principal-view-core` is a `devDependency` of
`@principal-ai/file-city-react`, used type-only in the story.

| Local name | Source | Upstream equivalent |
| --- | --- | --- |
| `Event` | derived: `EventNamespaceNode['namespace']['events'][number]` | inline event in `EventNamespaceNode.namespace.events[]` |
| `Namespace` | derived + extended: `EventNamespaceNode['namespace'] & { color: string; paths: string[] }` | `EventNamespaceNode.namespace` (`packages/core/src/events/EventsCanvasValidator.ts`) |
| `Scope` | local view-model | `OtelScopeNode` (`packages/core/src/types/canvas.ts`) — see notes |
| `ProjectArea` | imported directly | `ProjectArea` (`packages/core/src/types/auxiliary.ts`, exported from package entry as of 0.28.5) |

### Events (upstream-derived)

```ts
type Event = EventNamespaceNode['namespace']['events'][number];
// = { name: string;
//     severity?: 'INFO' | 'WARN' | 'ERROR';
//     description?: string;
//     attributes?: Record<string, { type, required?, description? }> }
```

Field changes the swap forced through the explorer:
- `event.action` → `event.name` (upstream stores the full event name, not
  a namespace-relative action portion).
- Severity casing `'info' | 'warn' | 'error'` → `'INFO' | 'WARN' | 'ERROR'`
  (and now optional — the renderer guards against `undefined`).
- `description` is now optional too — guarded similarly.
- `ScopeTreeSelection.eventAction` renamed to `eventName` to match.

### Namespaces (upstream-derived + extended)

```ts
type Namespace = EventNamespaceNode['namespace'] & {
  color: string;       // UI palette pick — not part of upstream
  paths: string[];     // narrowed from upstream's optional `paths?`
};
```

The intersection narrows `paths` to required (the explorer always sets
it) and adds the UI-required `color`. Upstream's canvas-node geometry
(`x`, `y`, `width`, `height` on `EventNamespaceNode`) is not pulled
in — we only consume the `.namespace` content sub-shape.

### Scopes (local view-model)

```ts
interface Scope {
  id: string;          // ≈ OtelScopeNode.otel.scope
  name: string;
  description: string;
  paths: string[];     // ≈ OtelScopeNode.paths (required here, optional upstream)
  namespaces: Namespace[];
}
```

Why local: upstream `OtelScopeNode` is a canvas-node shape (geometry,
label, fill/stroke, shape). Worse, namespaces are *not* nested under it
upstream — they live in a separate `*.events.canvas` file per scope, with
no parent pointer. The explorer's flat `scope.namespaces[]` is genuinely
a view-model that doesn't exist upstream. Provide
`toCanvasNodes()` / `fromCanvasNodes()` adapters when real `.scopes.canvas`
+ `.events.canvas` persistence lands.

### Areas (upstream)

```ts
import type { ProjectArea } from '@principal-ai/principal-view-core';
// = { name: string; paths: string[]; description: string }
```

Used directly as of `principal-view-core` 0.28.5, which added the
`ProjectArea` re-export from the package entry.

### Other related upstream types (not used)

- `ScopeDefinition` (`types/library.ts`) — *deprecated*, kept for backward
  compat. Don't build on this.
- `NormalizedScope` (`scopes/utils.ts`) — UI-friendly projection (name,
  color, icon, description, external). Closest cousin to a "view-model"
  upstream, but doesn't carry `paths` or namespaces.
- `Scope` (`types/registered-trace.ts`) — runtime OTLP scope (name,
  version, attributes). Unrelated to the authoring concern despite the
  name. Take care if importing from upstream — the local `Scope` and the
  upstream `Scope` collide by name.

---

## 5. Proposed extraction

```
packages/react/src/components/FileCityExplorer/
├── FileCityExplorer.tsx        # the template, renamed
├── AddToScopeModal.tsx
├── AddToAreaModal.tsx
├── ScopeInfoOverlay.tsx
├── model.ts                    # Scope, Namespace, Event, Area types + helpers
├── scopeTreePaths.ts           # build/parse + sentinels
├── layers.ts                   # buildLayersForScope, NAMESPACE_PALETTE, pickNamespaceColor
├── pathConversion.ts           # toScopePath / toCityPath (parameterised on root)
└── index.ts
```

The story shrinks to roughly:

```tsx
import { FileCityExplorer } from '../components/FileCityExplorer';
import electronAppCityData from '../../../../assets/electron-app-city-data.json';

export const Default: Story = {
  render: () => (
    <FileCityExplorer
      cityData={electronAppCityData as CityData}
      packageRoot="electron-app/"
      persistKey="file-city.scope-overlay"
    />
  ),
};
```

### Proposed props (concrete model variant)

This is the cheapest version — keeps the local `Scope`/`Namespace`/`Area`
shape (see §4) and lets the host opt into persistence. It's what I'd ship
first because it doesn't lock us into a public API we'll have to redesign
once real canvas data lands.

| Prop | Type | Notes |
| --- | --- | --- |
| `cityData` | `CityData` | Replaces hard-coded `electronAppCityData`. |
| `packageRoot` | `string` (default `''`) | Replaces hard-coded `'electron-app/'` in `toScopePath`/`toCityPath`. |
| `initialScopes` | `Scope[]` | Optional. |
| `initialAreas` | `Area[]` | Optional; defaults to `[]` (the current `DEFAULT_AREAS` becomes a *story* fixture, not a component default). |
| `persistKey` | `string \| null` (default `null`) | When set, the component round-trips `scopes`/`areas` through `localStorage.${persistKey}.scopes` and `…areas`. When null, state is purely in-memory. |
| `initialFocusDirectory` | `string \| null` (default the city root) | Replaces hard-coded `'electron-app'`. |

Audit mode (the `'off' | 'uncovered' | 'covered'` toggle and its derived
data) was removed in the cleanup pass before extraction. Re-adding it later,
either as internal UI or as a prop, is a small change.

### Alternative: callback-based, opaque model

If we expect this component to outlive the current `Scope`/`Namespace`/`Area`
shape (e.g. once the principal-view canvas data lands and the model gets
reshaped), the public API becomes:

| Prop | Type |
| --- | --- |
| `scopes` / `onScopesChange` | controlled |
| `areas` / `onAreasChange` | controlled |
| `cityData`, `packageRoot`, … | as above |

Tradeoff: every host has to wire up persistence and seeding. For the move
out of this package, this is probably the right shape — but it doesn't have
to be how it lands *initially*. We can ship the concrete-model version, then
flip to controlled props in one follow-up commit when we know what the host
actually wants.

---

## 6. Dead / inert code

- ~~`auditMode` and its derivations~~ — removed.
- The `onSelectionChange` callbacks on `treeModel` and `scopeTreeModel` never
  fire today because nothing renders those trees to click. We can either
  delete them, or keep them as a hook for if/when a tree sidebar comes back.
  My vote is **keep** — the cost is two unused callbacks, and the camera-focus
  logic inside them is the right behaviour if a sidebar reappears.
- `EMPTY_NS_SENTINEL` / `EMPTY_EVENTS_SENTINEL` are still useful — keep.
- `DEFAULT_AREAS` is a story fixture; it should not move into the component.

---

## 7. Things I'd explicitly **not** change in the move

- The internal state model. There are 20+ `useState`s but the boundaries are
  clean (per "State" table above). Refactoring into a reducer would be a
  separate PR and shouldn't gate the extraction.
- Inline styles. The whole story is inline-styled; converting to CSS modules
  or a styled wrapper is a separate decision.
- The "two trees + one mirrored sub-tree" architecture. It works, the comments
  explain why each piece exists, and untangling it is its own project.

---

## 8. Review checklist

Things I'd like a yes/no on before touching code:

- [ ] Component lives at `packages/react/src/components/FileCityExplorer/`
      (not exported from the package's public entry — story-only consumer
      for now).
- [ ] Props shape: concrete `Scope`/`Area` model with `persistKey` opt-in
      (section 5), **not** controlled callbacks yet.
- [x] Audit mode: drop the dead wiring. *(done)*
- [ ] `packageRoot` becomes a required prop (rather than defaulting to the
      electron-app value).
- [ ] Helpers listed in section 3 move as siblings, not separate exports
      from the package root.
- [ ] No behavioural changes during the extraction; first commit is purely
      a move + props introduction.
