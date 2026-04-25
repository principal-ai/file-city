# Scope / Namespace Overlay on File City

## Overview

The [principal-view-core-library](https://github.com/) defines a structured model for OpenTelemetry instrumentation: **scopes** that own **event namespaces**, where each namespace can declare the **file paths** it covers. This model is a natural fit for layering over a File City — scopes become toggleable "lenses" on the same city geometry, and namespaces become tinted regions within each lens.

This doc captures the data model, how it maps onto the existing `HighlightLayer` system, the gaps that need closing, and a set of Storybook experiments to drive the UX.

## The Source Data Model

From `packages/core/src/events/` in `principal-view-core-library`:

### Scope
Top-level OTel instrumentation scope (e.g. `principal-view.cli`). Declared in `architecture.scopes.canvas`. `ScopeEventsValidator` enforces a 1:1 file convention:

```
scope "principal-view.cli"  →  principal-view-cli.events.canvas
```

### Event Namespace
A node with `type: "event-namespace"` inside a scope's events canvas. From `EventsCanvasValidator.ts`:

```typescript
interface EventNamespaceNode {
  id: string;
  type: 'event-namespace';
  namespace: {
    name: string;          // e.g. "filetree", "workflow"
    description: string;
    paths?: string[];      // repo-relative; opt-in enforcement
    events: Array<{ name, severity, description, attributes }>;
  };
  // ...standard canvas node fields (x, y, width, height, color)
}
```

Event names follow `{namespace}.{action}` (e.g. `filetree.built`). The validator enforces that every event lives in the matching namespace node.

### Path Resolution
Implemented in `NamespacePathIndex.ts` + `path-helpers.ts`:

- **Repo-relative, normalized.** Strip `./`, trailing `/`, collapse `//`.
- **Coverage.** A declared path covers a file if equal or an ancestor folder.
- **Longest-prefix wins** within a scope. So `workflow` covers `src/workflow`, and `workflow.scenarios` cleanly steals `src/workflow/scenarios` from its parent.
- **Cross-namespace overlap inside a scope is a validation error**, *unless* it's a clean parent/child partition.
- **Resolution is scoped.** The same file can legitimately belong to different namespaces under different scopes.

The killer property: **within a scope, namespaces partition the file tree.** A file belongs to at most one namespace per scope. Across scopes, different colorings of the same geometry.

## Mapping onto File City

The existing layer system in `packages/builder/src/layers/types.ts` already covers most of what's needed:

```typescript
interface HighlightLayer {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  priority: number;
  items: LayerItem[];          // { path, type: 'file' | 'directory', renderStrategy }
}
```

Resolution at `FileCity3D.tsx:266` (`getLayerMatchesForPath`) already does prefix coverage for buildings: `path.startsWith(item.path + '/')`. Render strategies already include `border | fill | glow | pattern | cover | icon`. Districts already accept a `highlightColor` and tint border + floor fill.

### Recommended mapping

| Source concept | File City concept |
|---|---|
| Scope | LayerGroup (toggle unit, mutually exclusive UX) |
| Namespace | HighlightLayer (one stable color per namespace) |
| `namespace.paths[]` | `LayerItem[]` (`type: 'directory'` for folder paths, `'file'` for file paths) |
| Events on a namespace | Beacon overlay anchored to the namespace's matched district centroid (NOT a layer item — it's namespace-level metadata, not per-file styling) |

The "namespace = layer" mapping gives each namespace a stable identity, color, and toggle. The "scope = layer group" mapping gives the radio-toggle UX between scopes and lets uncovered buildings show as visible negative space within the active scope.

## Gaps to Close

Three real gaps between what File City does today and what the overlay needs:

### 1. Resolution isn't longest-prefix

Today resolution is `priority`-based with overlaps allowed (`getLayerMatchesForPath` in `FileCity3D.tsx:266`). The principal-view model is a *partition* — within a scope, longest path wins.

**Workable two ways:**
- **Build-time hack:** derive `priority` from path depth (more `/`s → higher priority). No core changes. Fine for v1.
- **Runtime fix:** add a per-layer-group resolution mode (`'partition'` vs `'overlay'`). Cleaner long-term.

### 2. District matching is exact-equality, not coverage

At `FileCity3D.tsx:2412`:
```typescript
if (item.type === 'directory' && item.path === district.path) { ... }
```

Buildings handle prefix coverage correctly; districts don't. So a namespace claiming `packages/cli/src` tints that one district but no sub-districts. Fix is local to that file: switch to prefix coverage, pick the most specific (longest-prefix) district per layer.

### 3. No notion of a layer group

Layers are flat today. Scope = "set of namespace layers that get toggled together." Easiest add: a `LayerGroup { id, name, layerIds[] }` shape held alongside layers, with the legend/toggle UI flipping `.enabled` on the contained layers. No renderer changes.

## Builder Sketch

Parallel to the existing `createFileHighlightLayers`:

```typescript
// packages/builder/src/layers/createNamespaceLayers.ts
export interface ScopeOverlay {
  scope: string;                      // "principal-view.cli"
  group: LayerGroup;                  // toggle unit
  layers: HighlightLayer[];           // one per namespace
  beacons: NamespaceBeacon[];         // event metadata, separate render path
}

export interface NamespaceBeacon {
  namespace: string;
  anchorPath: string;                 // longest declared path → district centroid
  events: Array<{ name; severity; description }>;
}

export function createScopeOverlay(input: {
  scope: string;
  eventsCanvas: ExtendedCanvas;       // parsed *.events.canvas
  colorPalette?: string[];
}): ScopeOverlay
```

Color assignment: prefer `node.color` from the events canvas if present (authors already chose colors there), fall back to a deterministic palette indexed by namespace name.

## Storybook Experiment Plan

The UX questions that stories should help answer:

### Story 1 — `ScopeOverlay/SingleScope`
**Question:** what does one scope's coloring look like over a real repo?
- Load `principal-view-core-library` as the city.
- Apply the `principal-view.cli` overlay (built from its `events.canvas`).
- Toggle namespaces on/off via the legend.
- **Watch:** uncovered files (negative space). Are gaps obvious? Misleading?

### Story 2 — `ScopeOverlay/PartitionVsOverlay`
**Question:** does longest-prefix partitioning actually look different from priority-based overlap?
- Same data, side-by-side comparison: priority-as-depth hack vs. flat priority.
- **Watch:** parent/child namespace pairs (`workflow` + `workflow.scenarios`). Does the child correctly steal its subtree?

### Story 3 — `ScopeOverlay/DistrictCoverage`
**Question:** what's the right behavior when a namespace path covers a folder containing sub-districts?
- Compare three options: tint only the exact-match district, tint every covered district, tint only the deepest covered district per layer.
- **Watch:** visual noise vs. legibility on deep trees.

### Story 4 — `ScopeOverlay/MultiScope`
**Question:** how do we present multiple scopes? Radio-toggle, stacked with transparency, or split-screen?
- Three variants of the same city with two scopes, one variant per UX option.
- **Watch:** can the user tell which scope they're looking at? Does stacking communicate anything useful or just muddy?

### Story 5 — `ScopeOverlay/NamespaceBeacons`
**Question:** how should event metadata surface?
- Floating labels above district centroids? Hover-only popovers? Always-on icons sized by event count?
- **Watch:** legibility at city scale vs. discoverability.

### Story 6 — `ScopeOverlay/UncoveredFiles`
**Question:** how do we treat files no namespace claims (the "uninstrumented" gap)?
- Variants: dim them, hide them, mark with a hatch pattern, leave them at default styling.
- **Watch:** does "uninstrumented" read as a meaningful signal or as broken rendering?

## Open Questions

- **Where does the events-canvas parser live?** The principal-view-core-library exports the validators but the canvas itself is just JSON — File City could read it directly, or we could add a thin adapter package. Coupling vs. duplication tradeoff.
- **Live data vs. static.** This doc only covers static overlay (paths from canvas). A future layer could light up districts based on actual emitted spans from execution traces — but that needs the executions pipeline plugged in.
- **Editor flow.** If we expose this in the file-city UI, do we want users to be able to author/edit `paths[]` from inside the visualization, or is this strictly read-only?
