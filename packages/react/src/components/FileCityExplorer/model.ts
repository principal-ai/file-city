/**
 * Scope / namespace / area model for the explorer.
 *
 * `Event` and `Namespace` are derived from the upstream
 * `EventNamespaceNode['namespace']` shape in `@principal-ai/principal-view-core`.
 * `Namespace` adds a UI-required `color` (palette pick).
 *
 * `Scope` stays local: it flattens namespaces inline (`scope.namespaces[]`),
 * which the upstream canvas-node split (`OtelScopeNode` + per-scope
 * `*.events.canvas`) doesn't model. Treat as an explorer view-model.
 *
 * `ProjectArea` is re-exported directly from upstream.
 */

import type { EventNamespaceNode } from '@principal-ai/principal-view-core';
export type { ProjectArea } from '@principal-ai/principal-view-core';

export type Event = EventNamespaceNode['namespace']['events'][number];

export type Namespace = EventNamespaceNode['namespace'] & {
  /** UI palette pick — not part of the upstream canvas-node shape. */
  color: string;
  /** Required here even though upstream allows `paths?` — explorer always sets it. */
  paths: string[];
};

export interface Scope {
  /** Maps to `OtelScopeNode.otel.scope` upstream. */
  id: string;
  name: string;
  description: string;
  /** Scope-level paths — corresponds to optional `OtelScopeNode.paths` upstream. */
  paths: string[];
  namespaces: Namespace[];
}
