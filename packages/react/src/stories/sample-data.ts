import {
  CityData,
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import { FileInfo } from '@principal-ai/repository-abstraction';

// Sample file structure representing a typical project
// lineCount is estimated as size / 35 (avg ~35 bytes per line)
const sampleFileStructure: Array<{ path: string; size: number; lineCount: number }> = [
  // Source files
  { path: 'src/index.ts', size: 1500, lineCount: 45 },
  { path: 'src/App.tsx', size: 3200, lineCount: 95 },
  { path: 'src/components/Header.tsx', size: 1800, lineCount: 55 },
  { path: 'src/components/Footer.tsx', size: 1200, lineCount: 35 },
  { path: 'src/components/Sidebar.tsx', size: 2100, lineCount: 65 },
  { path: 'src/components/Card.tsx', size: 900, lineCount: 28 },
  { path: 'src/components/Button.tsx', size: 600, lineCount: 20 },
  { path: 'src/utils/helpers.ts', size: 2500, lineCount: 75 },
  { path: 'src/utils/api.ts', size: 3100, lineCount: 92 },
  { path: 'src/utils/validators.ts', size: 1400, lineCount: 42 },
  { path: 'src/hooks/useAuth.ts', size: 800, lineCount: 25 },
  { path: 'src/hooks/useData.ts', size: 1100, lineCount: 34 },
  { path: 'src/styles/main.css', size: 4500, lineCount: 180 },
  { path: 'src/styles/components.css', size: 2800, lineCount: 112 },

  // Test files
  { path: 'tests/unit/app.test.ts', size: 2200, lineCount: 68 },
  { path: 'tests/unit/header.test.ts', size: 1600, lineCount: 50 },
  { path: 'tests/unit/footer.test.tsx', size: 1400, lineCount: 44 },
  { path: 'tests/integration/api.test.ts', size: 3400, lineCount: 105 },
  { path: '__tests__/components.test.tsx', size: 2900, lineCount: 90 },
  { path: '__tests__/utils.test.ts', size: 1900, lineCount: 58 },

  // Config files
  { path: 'package.json', size: 1200, lineCount: 45 },
  { path: 'tsconfig.json', size: 800, lineCount: 30 },
  { path: 'webpack.config.js', size: 2100, lineCount: 65 },
  { path: '.eslintrc.js', size: 600, lineCount: 22 },
  { path: '.prettierrc', size: 200, lineCount: 8 },
  { path: 'README.md', size: 3500, lineCount: 120 },

  // Documentation
  { path: 'docs/README.md', size: 4200, lineCount: 140 },
  { path: 'docs/API.md', size: 5100, lineCount: 170 },
  { path: 'docs/CONTRIBUTING.md', size: 2300, lineCount: 80 },

  // Build files
  { path: 'dist/bundle.js', size: 45000, lineCount: 1500 },
  { path: 'dist/index.html', size: 800, lineCount: 30 },
  { path: 'dist/styles.css', size: 12000, lineCount: 480 },

  // Node modules (sample)
  { path: 'node_modules/react/index.js', size: 8000, lineCount: 250 },
  { path: 'node_modules/react/package.json', size: 1500, lineCount: 55 },
  { path: 'node_modules/typescript/lib/typescript.js', size: 65000, lineCount: 2200 },
  { path: 'node_modules/@types/react/index.d.ts', size: 3200, lineCount: 100 },

  // Deprecated files
  { path: 'src/deprecated/OldComponent.tsx', size: 2400, lineCount: 72 },
  { path: 'src/deprecated/LegacyAPI.ts', size: 3100, lineCount: 95 },
];

// Convert file structure to FileInfo objects
function createFileInfoList(files: Array<{ path: string; size: number; lineCount: number }>): FileInfo[] {
  return files.map(file => ({
    name: file.path.split('/').pop() || file.path,
    path: file.path,
    relativePath: file.path,
    size: file.size,
    lineCount: file.lineCount,
    extension: file.path.includes('.') ? '.' + (file.path.split('.').pop() || '') : '',
    lastModified: new Date(),
    isDirectory: false,
  }));
}

// Cache the city data to avoid rebuilding on every render
let cachedCityData: CityData | null = null;

// Helper function to create sample city data for stories using the real treemap builder
export function createSampleCityData(): CityData {
  if (cachedCityData) {
    return cachedCityData;
  }

  const fileInfos = createFileInfoList(sampleFileStructure);
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos, 'sample-project');
  const builder = new CodeCityBuilderWithGrid();

  cachedCityData = builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });

  return cachedCityData;
}

// Smaller sample file structure
const smallFileStructure: Array<{ path: string; size: number; lineCount: number }> = [
  { path: 'src/index.ts', size: 1500, lineCount: 45 },
  { path: 'src/App.tsx', size: 3200, lineCount: 95 },
  { path: 'src/utils/helpers.ts', size: 800, lineCount: 25 },
  { path: 'package.json', size: 1200, lineCount: 45 },
];

let cachedSmallCityData: CityData | null = null;

// Create a smaller sample for performance testing
export function createSmallSampleCityData(): CityData {
  if (cachedSmallCityData) {
    return cachedSmallCityData;
  }

  const fileInfos = createFileInfoList(smallFileStructure);
  const fileTree = buildFileSystemTreeFromFileInfoList(fileInfos, 'small-sample');
  const builder = new CodeCityBuilderWithGrid();

  cachedSmallCityData = builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
    paddingInner: 1,
    paddingOuter: 3,
  });

  return cachedSmallCityData;
}
