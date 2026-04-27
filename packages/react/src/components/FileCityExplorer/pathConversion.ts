/**
 * Path converters for the explorer.
 *
 * City data is rooted at `packageRoot` (e.g. `electron-app/`). Scope/namespace
 * paths are authored relative to the package root (matching how principal-view
 * canvases are stored). These converters round-trip between the two
 * representations.
 *
 * `packageRoot` should include a trailing slash. Pass `''` if the city data
 * is already rooted at the project root.
 */

export interface PathConverters {
  /** City path → scope/namespace path (strip the package-root prefix). */
  toScopePath: (cityPath: string) => string;
  /** Scope/namespace path → city path (re-add the package-root prefix). */
  toCityPath: (scopePath: string) => string;
}

export function createPathConverters(packageRoot: string): PathConverters {
  return {
    toScopePath(cityPath: string): string {
      let p = cityPath.endsWith('/') ? cityPath.slice(0, -1) : cityPath;
      if (packageRoot && p.startsWith(packageRoot)) p = p.slice(packageRoot.length);
      return p;
    },
    toCityPath(scopePath: string): string {
      if (!packageRoot) return scopePath;
      return scopePath.startsWith(packageRoot) ? scopePath : packageRoot + scopePath;
    },
  };
}
