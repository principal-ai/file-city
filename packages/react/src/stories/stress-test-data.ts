import {
  CityData,
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';

interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  size: number;
  extension: string;
  lastModified: Date;
  isDirectory: boolean;
}

// Common file extensions for realistic distribution
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.test.ts', '.spec.tsx'];

// Top-level source directories
const TOP_LEVEL_DIRS = ['src', 'lib', 'packages', 'modules'];

// Second-level directories (domain areas)
const DOMAIN_DIRS = ['components', 'utils', 'services', 'hooks', 'types', 'helpers', 'core', 'api', 'features', 'pages'];

// Third-level directories (categories within domains)
const CATEGORY_DIRS = ['ui', 'forms', 'layout', 'navigation', 'data', 'auth', 'common', 'shared', 'internal', 'public'];

// Fourth-level directories (specific feature areas)
const FEATURE_DIRS = ['Button', 'Modal', 'Table', 'Card', 'Input', 'Select', 'Dialog', 'Menu', 'Tabs', 'List', 'Grid', 'Panel'];

// Fifth-level directories (variants/subfeatures)
const VARIANT_DIRS = ['variants', 'styles', 'hooks', 'utils', 'types', 'tests', '__tests__', 'stories', 'docs'];

// File name prefixes for realistic naming
const FILE_PREFIXES = ['index', 'main', 'handler', 'controller', 'service', 'helper', 'util', 'config', 'constants', 'types'];

/**
 * Seeded random number generator for consistent results
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Generate a large number of file paths with realistic nested directory structures
 */
export function generateLargeFilePaths(fileCount: number): string[] {
  const files: string[] = [];
  const random = seededRandom(42); // Consistent seed for reproducible results

  for (let i = 0; i < fileCount; i++) {
    const extension = FILE_EXTENSIONS[i % FILE_EXTENSIONS.length];

    // Determine nesting depth (0-5 levels) with weighted distribution
    // More files at medium depths (2-3), fewer at extremes
    const depthRoll = random();
    let depth: number;
    if (depthRoll < 0.1) depth = 1;       // 10% at depth 1
    else if (depthRoll < 0.25) depth = 2; // 15% at depth 2
    else if (depthRoll < 0.50) depth = 3; // 25% at depth 3
    else if (depthRoll < 0.75) depth = 4; // 25% at depth 4
    else if (depthRoll < 0.90) depth = 5; // 15% at depth 5
    else depth = 6;                        // 10% at depth 6

    const pathParts: string[] = [];

    // Level 1: Top-level directory
    // Weight 'src' heavily so it contains ~50% of files (for stress testing large subdirectory zoom)
    const topLevelRoll = random();
    if (topLevelRoll < 0.5) {
      pathParts.push('src'); // 50% of files in src
    } else if (topLevelRoll < 0.7) {
      pathParts.push('lib'); // 20% in lib
    } else if (topLevelRoll < 0.85) {
      pathParts.push('packages'); // 15% in packages
    } else {
      pathParts.push('modules'); // 15% in modules
    }

    // Level 2: Domain directory
    if (depth >= 2) {
      pathParts.push(DOMAIN_DIRS[Math.floor(random() * DOMAIN_DIRS.length)]);
    }

    // Level 3: Category directory
    if (depth >= 3) {
      pathParts.push(CATEGORY_DIRS[Math.floor(random() * CATEGORY_DIRS.length)]);
    }

    // Level 4: Feature directory
    if (depth >= 4) {
      pathParts.push(FEATURE_DIRS[Math.floor(random() * FEATURE_DIRS.length)]);
    }

    // Level 5: Variant directory
    if (depth >= 5) {
      pathParts.push(VARIANT_DIRS[Math.floor(random() * VARIANT_DIRS.length)]);
    }

    // Level 6: Additional nesting for very deep files
    if (depth >= 6) {
      pathParts.push(`nested${Math.floor(random() * 5)}`);
    }

    // Generate filename
    const prefix = FILE_PREFIXES[Math.floor(random() * FILE_PREFIXES.length)];
    const suffix = Math.floor(i / 10); // Group files by suffix number
    const fileName = `${prefix}${suffix}${extension}`;

    pathParts.push(fileName);
    files.push(pathParts.join('/'));
  }

  return files;
}

/**
 * Convert file paths to FileInfo objects
 */
function createFileInfoList(paths: string[]): FileInfo[] {
  return paths.map(path => ({
    name: path.split('/').pop() || path,
    path: path,
    relativePath: path,
    size: 500 + Math.floor(Math.random() * 5000), // 500-5500 bytes
    extension: path.includes('.') ? '.' + (path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
}

// Cache for stress test data to avoid regenerating
const stressTestCache = new Map<number, CityData>();

/**
 * Create CityData with a large number of files for stress testing subdirectory zoom
 *
 * @param fileCount - Number of files to generate (default: 8000)
 * @param useCache - Whether to cache results (default: true)
 */
export function createStressTestCityData(fileCount: number = 8000, useCache: boolean = true): CityData {
  if (useCache && stressTestCache.has(fileCount)) {
    return stressTestCache.get(fileCount)!;
  }

  const filePaths = generateLargeFilePaths(fileCount);
  const fileInfos = createFileInfoList(filePaths);
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos as any, `stress-test-${fileCount}`);

  const builder = new CodeCityBuilderWithGrid();
  const cityData = builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });

  if (useCache) {
    stressTestCache.set(fileCount, cityData);
  }

  return cityData;
}

/**
 * Clear the stress test cache (useful for testing memory)
 */
export function clearStressTestCache(): void {
  stressTestCache.clear();
}
