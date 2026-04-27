import type { Scope } from './model';

export interface ScopeTreeSelection {
  scopeId: string;
  namespaceName?: string;
  eventName?: string;
}

/**
 * Sentinel leaves used when a scope has no namespaces or a namespace has no
 * events — the trees library infers directories from paths, so empty branches
 * need a placeholder leaf to render.
 */
export const EMPTY_NS_SENTINEL = '(no namespaces)';
export const EMPTY_EVENTS_SENTINEL = '(no events)';

/**
 * Build canonical paths for the scope tree: `<scope.id>/<namespace.name>/<event.name>`.
 * Scopes are top-level directories, namespaces children, events leaves.
 * Empty scopes/namespaces emit a sentinel leaf so they still appear.
 */
export function buildScopeTreePaths(scopes: readonly Scope[]): string[] {
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

export function parseScopeTreePath(path: string): ScopeTreeSelection {
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
