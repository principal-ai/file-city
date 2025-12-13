import { CityData, CityBuilding, CityDistrict } from '@principal-ai/code-city-builder';

// Helper function to create sample city data for stories
export function createSampleCityData(): CityData {
  const buildings: CityBuilding[] = [];
  const districts: CityDistrict[] = [];

  // Define file structure
  const fileStructure = [
    // Source files
    { path: 'src/index.ts', size: 1500 },
    { path: 'src/App.tsx', size: 3200 },
    { path: 'src/components/Header.tsx', size: 1800 },
    { path: 'src/components/Footer.tsx', size: 1200 },
    { path: 'src/components/Sidebar.tsx', size: 2100 },
    { path: 'src/components/Card.tsx', size: 900 },
    { path: 'src/components/Button.tsx', size: 600 },
    { path: 'src/utils/helpers.ts', size: 2500 },
    { path: 'src/utils/api.ts', size: 3100 },
    { path: 'src/utils/validators.ts', size: 1400 },
    { path: 'src/hooks/useAuth.ts', size: 800 },
    { path: 'src/hooks/useData.ts', size: 1100 },
    { path: 'src/styles/main.css', size: 4500 },
    { path: 'src/styles/components.css', size: 2800 },

    // Test files
    { path: 'tests/unit/app.test.ts', size: 2200 },
    { path: 'tests/unit/header.test.ts', size: 1600 },
    { path: 'tests/unit/footer.test.tsx', size: 1400 },
    { path: 'tests/integration/api.test.ts', size: 3400 },
    { path: '__tests__/components.test.tsx', size: 2900 },
    { path: '__tests__/utils.test.ts', size: 1900 },

    // Config files
    { path: 'package.json', size: 1200 },
    { path: 'tsconfig.json', size: 800 },
    { path: 'webpack.config.js', size: 2100 },
    { path: '.eslintrc.js', size: 600 },
    { path: '.prettierrc', size: 200 },
    { path: 'README.md', size: 3500 },

    // Documentation
    { path: 'docs/README.md', size: 4200 },
    { path: 'docs/API.md', size: 5100 },
    { path: 'docs/CONTRIBUTING.md', size: 2300 },

    // Build files
    { path: 'dist/bundle.js', size: 45000 },
    { path: 'dist/index.html', size: 800 },
    { path: 'dist/styles.css', size: 12000 },

    // Node modules (sample)
    { path: 'node_modules/react/index.js', size: 8000 },
    { path: 'node_modules/react/package.json', size: 1500 },
    { path: 'node_modules/typescript/lib/typescript.js', size: 65000 },
    { path: 'node_modules/@types/react/index.d.ts', size: 3200 },

    // Deprecated files
    { path: 'src/deprecated/OldComponent.tsx', size: 2400 },
    { path: 'src/deprecated/LegacyAPI.ts', size: 3100 },
  ];

  // Create a simple grid layout
  let currentX = 0;
  let currentZ = 0;
  const spacing = 2;
  const maxPerRow = 10;
  let itemsInRow = 0;

  // Group files by directory
  const filesByDir = new Map<string, typeof fileStructure>();
  fileStructure.forEach(file => {
    const dir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '';
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    const dirFiles = filesByDir.get(dir);
    if (dirFiles) {
      dirFiles.push(file);
    }
  });

  // Track district bounds
  const districtBounds = new Map<
    string,
    { minX: number; maxX: number; minZ: number; maxZ: number }
  >();

  // Process each directory group
  const sortedDirs = Array.from(filesByDir.keys()).sort();
  let districtStartX = 0;

  sortedDirs.forEach(dir => {
    const files = filesByDir.get(dir);
    if (!files) return;
    const districtMinX = currentX;
    const districtMinZ = currentZ;

    files.forEach(file => {
      const extension = file.path.includes('.') ? '.' + (file.path.split('.').pop() || '') : '';

      // Calculate building dimensions based on file size
      const height = Math.log(file.size + 1) * 2;
      const width = Math.sqrt(file.size) / 10;
      const depth = width;

      buildings.push({
        path: file.path,
        position: {
          x: currentX + width / 2,
          y: height / 2,
          z: currentZ + depth / 2,
        },
        dimensions: [width, height, depth],
        type: 'file',
        fileExtension: extension,
        size: file.size,
        lastModified: new Date(),
      });

      // Update position for next building
      currentX += width + spacing;
      itemsInRow++;

      if (itemsInRow >= maxPerRow) {
        currentX = districtStartX;
        currentZ += depth + spacing;
        itemsInRow = 0;
      }
    });

    // Create district bounds
    if (dir) {
      const districtMaxX = currentX > districtMinX ? currentX : districtMinX + 10;
      const districtMaxZ = currentZ > districtMinZ ? currentZ + 5 : districtMinZ + 10;

      districtBounds.set(dir, {
        minX: districtMinX - 1,
        maxX: districtMaxX + 1,
        minZ: districtMinZ - 1,
        maxZ: districtMaxZ + 1,
      });

      // Move to next district area
      currentX = districtMaxX + spacing * 3;
      if (currentX > 100) {
        currentX = 0;
        currentZ = districtMaxZ + spacing * 3;
      }
      districtStartX = currentX;
      itemsInRow = 0;
    }
  });

  // Create districts from bounds
  const allPaths = new Set(districtBounds.keys());
  const processedPaths = new Set<string>();

  // Helper to create all parent paths
  const getParentPaths = (path: string): string[] => {
    const parts = path.split('/');
    const parents: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      parents.push(parts.slice(0, i).join('/'));
    }
    return parents;
  };

  // Add all parent paths to the set
  allPaths.forEach(path => {
    getParentPaths(path).forEach(parent => allPaths.add(parent));
  });

  // Create districts for all paths
  allPaths.forEach(path => {
    if (processedPaths.has(path)) return;

    // Find all children of this path
    const children = Array.from(districtBounds.keys()).filter(
      p => p.startsWith(path + '/') && !p.slice(path.length + 1).includes('/'),
    );

    let bounds;
    if (districtBounds.has(path)) {
      const pathBounds = districtBounds.get(path);
      if (!pathBounds) return;
      bounds = pathBounds;
    } else if (children.length > 0) {
      // Calculate bounds from children
      const childBounds = children
        .map(c => districtBounds.get(c))
        .filter((b): b is NonNullable<typeof b> => b !== undefined);
      if (childBounds.length === 0) return;
      bounds = {
        minX: Math.min(...childBounds.map(c => c.minX)),
        maxX: Math.max(...childBounds.map(c => c.maxX)),
        minZ: Math.min(...childBounds.map(c => c.minZ)),
        maxZ: Math.max(...childBounds.map(c => c.maxZ)),
      };
    } else {
      return; // Skip if no bounds
    }

    const fileCount = buildings.filter(
      b => b.path === path || b.path.startsWith(path + '/'),
    ).length;

    districts.push({
      path,
      worldBounds: bounds,
      fileCount,
      type: 'directory',
    });

    processedPaths.add(path);
  });

  // Calculate overall bounds
  const allX = buildings.map(b => b.position.x);
  const allZ = buildings.map(b => b.position.z);
  const bounds = {
    minX: Math.min(...allX) - 5,
    maxX: Math.max(...allX) + 5,
    minZ: Math.min(...allZ) - 5,
    maxZ: Math.max(...allZ) + 5,
  };

  return {
    buildings,
    districts,
    bounds,
    metadata: {
      totalFiles: buildings.length,
      totalDirectories: districts.length,
      analyzedAt: new Date(),
      rootPath: '/',
      layoutConfig: {
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 2,
        paddingRight: 2,
        paddingInner: 1,
        paddingOuter: 3,
      },
    },
  };
}

// Create a smaller sample for performance testing
export function createSmallSampleCityData(): CityData {
  const buildings: CityBuilding[] = [
    {
      path: 'index.ts',
      position: { x: 5, y: 3, z: 5 },
      dimensions: [4, 6, 4],
      type: 'file',
      fileExtension: '.ts',
      size: 1500,
      lastModified: new Date(),
    },
    {
      path: 'App.tsx',
      position: { x: 12, y: 4, z: 5 },
      dimensions: [5, 8, 5],
      type: 'file',
      fileExtension: '.tsx',
      size: 3200,
      lastModified: new Date(),
    },
    {
      path: 'utils/helpers.ts',
      position: { x: 5, y: 2.5, z: 15 },
      dimensions: [3, 5, 3],
      type: 'file',
      fileExtension: '.ts',
      size: 800,
      lastModified: new Date(),
    },
  ];

  const districts: CityDistrict[] = [
    {
      path: 'utils',
      worldBounds: { minX: 2, maxX: 10, minZ: 12, maxZ: 20 },
      fileCount: 1,
      type: 'directory',
    },
  ];

  return {
    buildings,
    districts,
    bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 25 },
    metadata: {
      totalFiles: buildings.length,
      totalDirectories: districts.length,
      analyzedAt: new Date(),
      rootPath: '/',
    },
  };
}
