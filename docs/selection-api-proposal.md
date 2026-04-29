# Selection API Proposal

**Date:** 2026-04-28
**Component:** `FileCity3D` (`@principal-ai/file-city-react`)
**Status:** Proposal — not yet implemented

## Background

`FileCity3D` currently exposes a controlled selection prop for files only:

```ts
// FileCity3D.d.ts:229
selectedBuilding?: CityBuilding | null;
```

When set, the city visually emphasizes the selected building:
- Scales the building 1.08× (`FileCity3D.js:616`)
- Brightens its color by 1.4× (`FileCity3D.js:631-633`)
- Renders the `InfoPanel`

There is no equivalent for directories. Hosts that want to indicate
"this folder is selected" have to compose a ring out of existing
primitives, which leads to fragile workarounds.

## The host-side workaround (today)

The dev-workspace consumer (`electron-app`'s `FileCityExplorer`) shows a
selection ring around a folder using two mechanisms in tandem, because
neither one alone covers both collapse states:

1. **Expanded folder** — a `HighlightLayer` with
   `renderStrategy: 'border'` and a single directory item. The border is
   painted on the ground canvas. Works when the folder's umbrella tile
   is absent (folder is expanded, children visible).

2. **Collapsed folder** — a slightly-inflated `ElevatedScopePanel`
   inserted *underneath* the folder's umbrella so an accent rim peeks
   out at the edges. Required because the umbrella slab occludes the
   ground-painted highlight border in flat (2D) mode.

See `electron-app/src/renderer/dev-workspace/file-city-panel/FileCityExplorer/FileCityExplorer.tsx`
(`folderElevatedPanels` memo + `cityHighlightLayers` memo).

This works but has real downsides:

- Two code paths for one user-visible concept.
- Magic `inflate = 4` constant chosen to match umbrella visuals.
- Host has to know the umbrella's id format (`folder::<path>`) and
  splice into the elevated-panels list at the right index.
- Doesn't carry through to 3D mode (umbrella ring is 2D-only).
- Any consumer who wants the same visual has to re-implement it.

## Proposal

Add a first-class selection prop to `FileCity3D`. Two reasonable shapes:

### Option A — Unified `selectedPath`

```ts
selectedPath?: string | null;
selectionStyle?: {
  color?: string;       // default: theme accent
  borderWidth?: number; // default: 2
};
```

The city resolves the path against `cityData.buildings` and
`cityData.districts` itself. For a building it does what
`selectedBuilding` does today (scale + brighten + InfoPanel). For a
directory it renders a ring that is visible whether the folder is
collapsed (umbrella present) or expanded (children visible), in both
2D and 3D modes.

- *Pro:* one concept, one prop. Matches how hosts already think about
  selection (a path string). The city owns the visual contract — when
  modes flip, isolation kicks in, etc., selection visuals follow
  without each consumer reinventing them.
- *Con:* deprecates `selectedBuilding` (or coexists with it). Slightly
  bigger surface than option B.

### Option B — Parallel `selectedDirectory`

```ts
selectedDirectory?: string | null;
selectedDirectoryColor?: string;
```

Mirrors `selectedBuilding` but for directories. `selectedBuilding`
stays as-is.

- *Pro:* smallest possible change; trivial to add without touching
  existing behavior.
- *Con:* leaves selection split across two props that don't compose
  (host still has to decide which to populate). Doesn't generalize if
  we ever want multi-select or selection of a scope/area path.

## Recommendation

**Option A.** Selection is fundamentally about a path; whether that
path resolves to a file or a directory is the city's concern, not the
host's. Migration story is straightforward — `selectedBuilding`
remains supported for one release, with `selectedPath` taking
precedence when both are set, then `selectedBuilding` is removed in a
follow-up.

## Implementation sketch (Option A)

1. Add `selectedPath` and `selectionStyle` to `FileCity3DProps`.
2. Inside `CityScene`, resolve the path:
   - If it matches a building, derive `selectedIndex` (existing path).
   - If it matches a district, render a selection ring at the district's
     `worldBounds` that is *not* an `ElevatedScopePanel` (so it isn't
     occluded by an umbrella). A thin, slightly-inflated outline rendered
     above the umbrella's `topY` would make it visible in both states.
3. In 3D mode, lift the ring off the ground plane and render it as an
   outline around the district's footprint (or a halo at the base of the
   tallest building inside it — design call).
4. Document that `selectedBuilding` is deprecated; both props are
   honoured during the transition with `selectedPath` winning.

## Host-side cleanup once shipped

In `FileCityExplorer.tsx`:

- Remove the inflate-ring branch in the `folderElevatedPanels` memo.
- Remove the `'folder-selection'` highlight layer in
  `cityHighlightLayers`.
- Wire `selectedPath` directly:
  ```ts
  const selectedPath = activeTab === 'files'
    ? selectedPanelFolder
    : /* selected file path, when we add file selection */ null;
  ```

This collapses two host-side workarounds into one prop and lets us
support file selection (currently unimplemented in the host) by just
flipping the source on the same prop.
