import {
  CityData,
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import { FileInfo } from '@principal-ai/repository-abstraction';

// Sample file structure representing a typical project
const sampleFileStructure: Array<{ path: string; size: number }> = [
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

// Convert file structure to FileInfo objects
function createFileInfoList(files: Array<{ path: string; size: number }>): FileInfo[] {
  return files.map(file => ({
    name: file.path.split('/').pop() || file.path,
    path: file.path,
    relativePath: file.path,
    size: file.size,
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
const smallFileStructure: Array<{ path: string; size: number }> = [
  { path: 'src/index.ts', size: 1500 },
  { path: 'src/App.tsx', size: 3200 },
  { path: 'src/utils/helpers.ts', size: 800 },
  { path: 'package.json', size: 1200 },
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
