import type { CityData } from '@principal-ai/file-city-builder';
import type { ElevatedScopePanel } from '../components/FileCity3D';

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

/**
 * Stable color for a folder path, picked from a small palette via a string
 * hash. Two folders at the same depth get visibly different colors; the
 * same folder always gets the same color across renders.
 */
export function hashFolderColor(path: string): string {
  let h = 0;
  for (let i = 0; i < path.length; i++) {
    h = (h * 31 + path.charCodeAt(i)) | 0;
  }
  return FOLDER_PALETTE[Math.abs(h) % FOLDER_PALETTE.length];
}

interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface FolderIndex {
  /** Parent directory → list of immediate child directories. Top-level folders live under '' (empty string). */
  children: Map<string, string[]>;
  /** Folder path → world bounds spanning every descendant district. */
  bounds: Map<string, Bounds>;
  /** Folder path → number of descendant files. */
  fileCounts: Map<string, number>;
}

/**
 * Precompute the data structures `buildFolderElevatedPanels` needs from a
 * `CityData`. Cache this when the city data is stable to avoid redoing the
 * O(districts × depth) walk on every render.
 */
export function buildFolderIndex(cityData: CityData): FolderIndex {
  const children = new Map<string, string[]>();
  const directorySet = new Set<string>();
  for (const d of cityData.districts) directorySet.add(d.path);
  const dirs = Array.from(directorySet).sort();
  for (const dir of dirs) {
    const slash = dir.lastIndexOf('/');
    const parent = slash >= 0 ? dir.slice(0, slash) : '';
    const arr = children.get(parent);
    if (arr) arr.push(dir);
    else children.set(parent, [dir]);
  }

  const bounds = new Map<string, Bounds>();
  for (const district of cityData.districts) {
    const b = district.worldBounds;
    let path = district.path;
    while (path) {
      const cur = bounds.get(path);
      if (!cur) {
        bounds.set(path, { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ });
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

  const fileCounts = new Map<string, number>();
  for (const b of cityData.buildings) {
    let path = b.path;
    const slash = path.lastIndexOf('/');
    path = slash >= 0 ? path.slice(0, slash) : '';
    while (path) {
      fileCounts.set(path, (fileCounts.get(path) ?? 0) + 1);
      const s = path.lastIndexOf('/');
      if (s < 0) break;
      path = path.slice(0, s);
    }
  }

  return { children, bounds, fileCounts };
}

export interface BuildFolderElevatedPanelsOptions {
  cityData: CityData;
  /**
   * Set of folder paths that are currently expanded in the file tree. A folder
   * not in this set is treated as collapsed.
   */
  expandedFolders: ReadonlySet<string>;
  /** Toggle handler invoked when an umbrella tile is clicked. */
  onToggleFolder?: (folderPath: string) => void;
  /**
   * Scale label font size by descendant file count. Default true. When false,
   * the renderer's auto-sized label is used (size derived from tile footprint).
   */
  scaleLabelByFileCount?: boolean;
  /**
   * Pre-built index from `buildFolderIndex(cityData)`. Pass when you cache the
   * city's index across renders to avoid recomputing it.
   */
  index?: FolderIndex;
}

/**
 * Walks the folder hierarchy from the top-level folders of a `CityData`. For
 * each folder:
 *   - if expanded → recurse into child folders
 *   - if collapsed → emit one elevated panel covering the union of every
 *     descendant district's world bounds, colored via `hashFolderColor`.
 *
 * Mirror of the scope-tree expansion behavior, applied to file-tree folders.
 */
export function buildFolderElevatedPanels(
  options: BuildFolderElevatedPanelsOptions,
): ElevatedScopePanel[] {
  const {
    cityData,
    expandedFolders,
    onToggleFolder,
    scaleLabelByFileCount = true,
  } = options;
  const index = options.index ?? buildFolderIndex(cityData);

  const panels: ElevatedScopePanel[] = [];

  const walk = (folderPath: string): void => {
    if (expandedFolders.has(folderPath)) {
      const kids = index.children.get(folderPath) ?? [];
      for (const child of kids) walk(child);
      return;
    }
    const bounds = index.bounds.get(folderPath);
    if (!bounds) return;
    const label = folderPath.split('/').pop() ?? folderPath;
    const fileCount = index.fileCounts.get(folderPath) ?? 0;
    const labelSize = scaleLabelByFileCount
      ? Math.max(12, Math.min(240, 8 + Math.sqrt(fileCount) * 5))
      : undefined;
    panels.push({
      id: `folder::${folderPath}`,
      color: hashFolderColor(folderPath),
      height: 4,
      thickness: 2,
      bounds,
      label,
      labelSize,
      onClick: onToggleFolder ? () => onToggleFolder(folderPath) : undefined,
    });
  };

  for (const top of index.children.get('') ?? []) walk(top);
  return panels;
}
