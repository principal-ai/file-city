import {
  CityData,
  CodeCityBuilderWithGrid,
  FileTree,
  filterFileSystemTreeForProject,
  TreemapOptions,
} from '@principal-ai/file-city-builder';

export interface PackageSourceInput {
  /** Human label for the package (shown on the city label). */
  label: string;
  /** Repo-relative root path of the package (e.g. 'packages/builder'). */
  rootPath: string;
}

export interface PackageCitySource {
  label: string;
  /** World-space center of this package's city on the grid. */
  offset: { x: number; z: number };
  cityData: CityData;
}

export interface BuildPackageSourcesResult {
  /** The unified single city (render this "before" the transition). */
  beforeCity: CityData;
  /** Per-package cities positioned on a grid. */
  afterSources: PackageCitySource[];
}

export interface BuildPackageSourcesOptions {
  /** Root path passed to the city builder. Default: ''. */
  rootPath?: string;
  /** Gap between package cells in world units. Default: 40. */
  cellPadding?: number;
  /** Number of grid columns. Default: ceil(sqrt(packageCount)). */
  layoutColumns?: number;
  /** Options forwarded to CodeCityBuilderWithGrid.buildCityFromFileSystem. */
  treemapOptions?: TreemapOptions;
}

/**
 * Build the "before" (unified single city) and "after" (per-package grid of
 * cities) states for a package-separation animation.
 *
 * The unified city is built from the whole tree. Each package's city is built
 * from the subtree filtered to that package's root path — building paths are
 * preserved, so diffMultiSourceCity can match them by path.
 *
 * Packages are laid out on a uniform grid (each cell sized to the largest
 * package footprint + padding), and each package's `positionOffset` is the
 * center of its cell.
 */
export function buildPackageSources(
  fileTree: FileTree,
  packages: PackageSourceInput[],
  options: BuildPackageSourcesOptions = {},
): BuildPackageSourcesResult {
  const {
    rootPath = '',
    cellPadding = 40,
    layoutColumns,
    treemapOptions,
  } = options;

  const builder = new CodeCityBuilderWithGrid();

  const beforeCity = builder.buildCityFromFileSystem(fileTree, rootPath, treemapOptions);

  const packageCities: Array<{ label: string; cityData: CityData }> = [];
  for (const pkg of packages) {
    try {
      const subtree = filterFileSystemTreeForProject(fileTree, pkg.rootPath);
      const cityData = builder.buildCityFromFileSystem(subtree, rootPath, treemapOptions);
      if (cityData.buildings.length > 0) {
        packageCities.push({ label: pkg.label, cityData });
      }
    } catch {
      // Package path doesn't exist in this tree — skip it.
    }
  }

  if (packageCities.length === 0) {
    throw new Error('buildPackageSources: no packages matched the given file tree');
  }

  // Uniform grid: each cell is the largest package footprint + padding.
  let maxW = 0;
  let maxD = 0;
  for (const p of packageCities) {
    const b = p.cityData.bounds;
    maxW = Math.max(maxW, b.maxX - b.minX);
    maxD = Math.max(maxD, b.maxZ - b.minZ);
  }
  // A city's label chip is screen-space, so the world room it needs scales with
  // the framing zoom (which scales with the footprint). Enforce a
  // footprint-relative minimum gap so a tight `cellPadding` can't make one
  // city's label overlap the city behind it.
  const cellW = maxW + Math.max(cellPadding, Math.max(16, maxW * 0.12));
  const cellD = maxD + Math.max(cellPadding, Math.max(16, maxD * 0.12));

  const cols = layoutColumns ?? Math.ceil(Math.sqrt(packageCities.length));
  const rows = Math.ceil(packageCities.length / cols);

  // Center the grid on the origin so the camera frames everything.
  const originX = -(cols * cellW) / 2 + cellW / 2;
  const originZ = -(rows * cellD) / 2 + cellD / 2;

  const afterSources: PackageCitySource[] = packageCities.map((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      label: p.label,
      offset: { x: originX + col * cellW, z: originZ + row * cellD },
      cityData: p.cityData,
    };
  });

  return { beforeCity, afterSources };
}