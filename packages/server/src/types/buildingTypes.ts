/**
 * Centralized building type system for Code City
 *
 * This system handles:
 * - File type classification (extensions + special filenames)
 * - Color determination (themes + custom functions + special cases)
 * - Legend generation
 * - Consistent building type distribution
 */

import { ColorTheme, ColorFunction } from './themes';
import { defaultFileColorConfig } from '@principal-ai/file-city-builder';

export interface BuildingTypeInfo {
  /** The identifier for this building type (e.g., '.ts', 'package.json') */
  id: string;
  /** Human-readable name (e.g., 'TypeScript', 'Package Config') */
  displayName: string;
  /** The color for this building type */
  color: string;
  /** Whether this is a special filename (vs extension-based) */
  isSpecialFile: boolean;
  /** Priority for color determination (higher = more specific) */
  priority: number;
}

export interface BuildingClassificationResult {
  buildingType: BuildingTypeInfo;
  /** The matched pattern (filename or extension) */
  matchedPattern: string;
}

/**
 * Configuration for special directory patterns
 */
export const SPECIAL_DIRECTORY_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>> = {
  '.github': {
    displayName: 'GitHub Config',
    isSpecialFile: false,
    priority: 100,
  },
  node_modules: {
    displayName: 'Dependencies',
    isSpecialFile: false,
    priority: 95,
  },
  '.vscode': {
    displayName: 'VS Code Config',
    isSpecialFile: false,
    priority: 95,
  },
  '.idea': {
    displayName: 'IntelliJ Config',
    isSpecialFile: false,
    priority: 95,
  },
  src: {
    displayName: 'Source Code',
    isSpecialFile: false,
    priority: 90,
  },
  /*
  'lib': {
    displayName: 'Library Code',
    isSpecialFile: false,
    priority: 90
  },
  */
  dist: {
    displayName: 'Build Output',
    isSpecialFile: false,
    priority: 85,
  },
  build: {
    displayName: 'Build Output',
    isSpecialFile: false,
    priority: 85,
  },
  public: {
    displayName: 'Public Assets',
    isSpecialFile: false,
    priority: 80,
  },
  assets: {
    displayName: 'Static Assets',
    isSpecialFile: false,
    priority: 80,
  },
  utils: {
    displayName: 'Utilities',
    isSpecialFile: false,
    priority: 75,
  },
  tests: {
    displayName: 'Test Files',
    isSpecialFile: false,
    priority: 70,
  },
  test: {
    displayName: 'Test Files',
    isSpecialFile: false,
    priority: 70,
  },
  __tests__: {
    displayName: 'Test Files',
    isSpecialFile: false,
    priority: 70,
  },
  docs: {
    displayName: 'Documentation',
    isSpecialFile: false,
    priority: 65,
  },
  documentation: {
    displayName: 'Documentation',
    isSpecialFile: false,
    priority: 65,
  },
  examples: {
    displayName: 'Examples',
    isSpecialFile: false,
    priority: 60,
  },
  scripts: {
    displayName: 'Scripts',
    isSpecialFile: false,
    priority: 60,
  },
};

/**
 * Default colors for special directories (when no theme is provided)
 */
export const SPECIAL_DIRECTORY_COLORS: Record<string, string> = {
  '.github': '#24292e',
  node_modules: '#8b4513',
  '.vscode': '#007acc',
  '.idea': '#000000',
  src: '#4CAF50',
  lib: '#2196F3',
  dist: '#FF9800',
  build: '#FF9800',
  public: '#9C27B0',
  assets: '#9C27B0',
  utils: '#607D8B',
  tests: '#F44336',
  test: '#F44336',
  __tests__: '#F44336',
  docs: '#3F51B5',
  documentation: '#3F51B5',
  examples: '#795548',
  scripts: '#FFEB3B',
};

/**
 * Configuration for special filename patterns
 */
export const SPECIAL_FILE_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>> = {
  'index.ts': {
    displayName: 'Index',
    isSpecialFile: true,
    priority: 100,
  },
  'package.json': {
    displayName: 'Package Config',
    isSpecialFile: true,
    priority: 100,
  },
  'package-lock.json': {
    displayName: 'Package Lock',
    isSpecialFile: true,
    priority: 100,
  },
  'yarn.lock': {
    displayName: 'Yarn Lock',
    isSpecialFile: true,
    priority: 100,
  },
  'pnpm-lock.yaml': {
    displayName: 'PNPM Lock',
    isSpecialFile: true,
    priority: 100,
  },
  'bun.lockb': {
    displayName: 'Bun Lock',
    isSpecialFile: true,
    priority: 100,
  },
  'poetry.lock': {
    displayName: 'Poetry Lock',
    isSpecialFile: true,
    priority: 100,
  },
  'requirements.txt': {
    displayName: 'Python Requirements',
    isSpecialFile: true,
    priority: 100,
  },
  'setup.py': {
    displayName: 'Python Setup',
    isSpecialFile: true,
    priority: 100,
  },
  Dockerfile: {
    displayName: 'Docker Config',
    isSpecialFile: true,
    priority: 100,
  },
  'docker-compose.yml': {
    displayName: 'Docker Compose',
    isSpecialFile: true,
    priority: 100,
  },
  'docker-compose.yaml': {
    displayName: 'Docker Compose',
    isSpecialFile: true,
    priority: 100,
  },
  '.gitignore': {
    displayName: 'Git Ignore',
    isSpecialFile: true,
    priority: 90,
  },
  '.env': {
    displayName: 'Environment Config',
    isSpecialFile: true,
    priority: 90,
  },
  '.env.local': {
    displayName: 'Local Environment',
    isSpecialFile: true,
    priority: 90,
  },
  'README.md': {
    displayName: 'Project README',
    isSpecialFile: true,
    priority: 80,
  },
  LICENSE: {
    displayName: 'License',
    isSpecialFile: true,
    priority: 80,
  },
  'LICENSE.md': {
    displayName: 'License',
    isSpecialFile: true,
    priority: 80,
  },
  'tsconfig.json': {
    displayName: 'TypeScript Config',
    isSpecialFile: true,
    priority: 95,
  },
  'webpack.config.js': {
    displayName: 'Webpack Config',
    isSpecialFile: true,
    priority: 95,
  },
  'vite.config.js': {
    displayName: 'Vite Config',
    isSpecialFile: true,
    priority: 95,
  },
  'vite.config.ts': {
    displayName: 'Vite Config',
    isSpecialFile: true,
    priority: 95,
  },
};

/**
 * Default colors for special files (when no theme is provided)
 */
export const SPECIAL_FILE_COLORS: Record<string, string> = {
  'index.ts': '#81851F',
  'package.json': '#cb3837',
  'package-lock.json': '#cb3837',
  'yarn.lock': '#2c8ebb',
  'pnpm-lock.yaml': '#f69220',
  'bun.lockb': '#000000',
  'poetry.lock': '#3b82c4',
  'requirements.txt': '#39FF14',
  'setup.py': '#306998',
  Dockerfile: '#0db7ed',
  'docker-compose.yml': '#0db7ed',
  'docker-compose.yaml': '#0db7ed',
  '.gitignore': '#f05133', // Git - red-orange
  '.env': '#fbc02d',
  '.env.local': '#fbc02d',
  'README.md': '#22c55e',
  LICENSE: '#586069',
  'LICENSE.md': '#586069',
  'tsconfig.json': '#007acc',
  'webpack.config.js': '#8dd6f9',
  'vite.config.js': '#646cff',
  'vite.config.ts': '#646cff',
};

/**
 * Extension-based file type information
 */
export const EXTENSION_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>> = {
  '.js': { displayName: 'JavaScript', isSpecialFile: false, priority: 50 },
  '.ts': { displayName: 'TypeScript', isSpecialFile: false, priority: 50 },
  '.tsx': { displayName: 'TypeScript React', isSpecialFile: false, priority: 50 },
  '.jsx': { displayName: 'React', isSpecialFile: false, priority: 50 },
  '.html': { displayName: 'HTML', isSpecialFile: false, priority: 50 },
  '.css': { displayName: 'CSS', isSpecialFile: false, priority: 50 },
  '.scss': { displayName: 'SCSS', isSpecialFile: false, priority: 50 },
  '.sass': { displayName: 'Sass', isSpecialFile: false, priority: 50 },
  '.less': { displayName: 'Less', isSpecialFile: false, priority: 50 },
  '.json': { displayName: 'JSON', isSpecialFile: false, priority: 50 },
  '.md': { displayName: 'Markdown', isSpecialFile: false, priority: 50 },
  '.py': { displayName: 'Python', isSpecialFile: false, priority: 50 },
  '.java': { displayName: 'Java', isSpecialFile: false, priority: 50 },
  '.cpp': { displayName: 'C++', isSpecialFile: false, priority: 50 },
  '.c': { displayName: 'C', isSpecialFile: false, priority: 50 },
  '.go': { displayName: 'Go', isSpecialFile: false, priority: 50 },
  '.rs': { displayName: 'Rust', isSpecialFile: false, priority: 50 },
  '.php': { displayName: 'PHP', isSpecialFile: false, priority: 50 },
  '.rb': { displayName: 'Ruby', isSpecialFile: false, priority: 50 },
  '.swift': { displayName: 'Swift', isSpecialFile: false, priority: 50 },
  '.kt': { displayName: 'Kotlin', isSpecialFile: false, priority: 50 },
  '.dart': { displayName: 'Dart', isSpecialFile: false, priority: 50 },
  '.vue': { displayName: 'Vue', isSpecialFile: false, priority: 50 },
  '.yml': { displayName: 'YAML', isSpecialFile: false, priority: 50 },
  '.yaml': { displayName: 'YAML', isSpecialFile: false, priority: 50 },
  '.xml': { displayName: 'XML', isSpecialFile: false, priority: 50 },
  '.sql': { displayName: 'SQL', isSpecialFile: false, priority: 50 },
  '.sh': { displayName: 'Shell Script', isSpecialFile: false, priority: 50 },
  '.dockerfile': { displayName: 'Docker', isSpecialFile: false, priority: 50 },
  '.env': { displayName: 'Environment', isSpecialFile: false, priority: 50 },
  '.lock': { displayName: 'Lock File', isSpecialFile: false, priority: 50 },
  '.log': { displayName: 'Log File', isSpecialFile: false, priority: 50 },
  '.txt': { displayName: 'Text File', isSpecialFile: false, priority: 50 },
  '.pdf': { displayName: 'PDF', isSpecialFile: false, priority: 50 },
  '.png': { displayName: 'PNG Image', isSpecialFile: false, priority: 50 },
  '.jpg': { displayName: 'JPEG Image', isSpecialFile: false, priority: 50 },
  '.jpeg': { displayName: 'JPEG Image', isSpecialFile: false, priority: 50 },
  '.gif': { displayName: 'GIF Image', isSpecialFile: false, priority: 50 },
  '.svg': { displayName: 'SVG Image', isSpecialFile: false, priority: 50 },
  '.ico': { displayName: 'Icon', isSpecialFile: false, priority: 50 },
  '.svelte': { displayName: 'Svelte', isSpecialFile: false, priority: 50 },
};

/**
 * Centralized building type resolver
 */
export class BuildingTypeResolver {
  private theme?: ColorTheme;
  private customColorFn?: ColorFunction;
  private defaultDirectoryColor: string;

  constructor(
    theme?: ColorTheme,
    customColorFn?: ColorFunction,
    defaultDirectoryColor: string = '#64b5f6',
  ) {
    this.theme = theme;
    this.customColorFn = customColorFn;
    this.defaultDirectoryColor = defaultDirectoryColor;
  }

  /**
   * Classify a directory and determine its type information
   */
  classifyDirectory(directory: {
    path: string;
    name: string;
    fileCount?: number;
    totalSize?: number;
  }): BuildingClassificationResult {
    // Defensive check for undefined/null path or name
    if (
      !directory.path ||
      typeof directory.path !== 'string' ||
      !directory.name ||
      typeof directory.name !== 'string'
    ) {
      throw new Error(
        `BuildingTypeResolver.classifyDirectory: Invalid path or name provided. Path: ${typeof directory.path} (${
          directory.path
        }), Name: ${typeof directory.name} (${directory.name})`,
      );
    }

    const directoryName = directory.name;

    // Check for special directory patterns first (higher priority)
    if (SPECIAL_DIRECTORY_PATTERNS[directoryName]) {
      const pattern = SPECIAL_DIRECTORY_PATTERNS[directoryName];
      const color = this.determineDirectoryColor(directory, directoryName, true);
      return {
        buildingType: {
          id: `dir:${directoryName}`, // Prefix with 'dir:' to distinguish from files
          color,
          ...pattern,
        },
        matchedPattern: directoryName,
      };
    }

    // Check for case-insensitive special directories
    const lowerDirectoryName = directoryName.toLowerCase();
    for (const [specialDir, pattern] of Object.entries(SPECIAL_DIRECTORY_PATTERNS)) {
      if (specialDir.toLowerCase() === lowerDirectoryName) {
        const color = this.determineDirectoryColor(directory, specialDir, true);

        return {
          buildingType: {
            id: `dir:${specialDir}`,
            color,
            ...pattern,
          },
          matchedPattern: specialDir,
        };
      }
    }

    // Default directory type
    const color = this.determineDirectoryColor(directory, '', false);
    return {
      buildingType: {
        id: 'dir:generic',
        displayName: 'Directory',
        color,
        isSpecialFile: false,
        priority: 10,
      },
      matchedPattern: 'generic',
    };
  }

  /**
   * Classify a building and determine its type information
   */
  classifyBuilding(building: {
    path: string;
    fileExtension?: string;
    size?: number;
    lastModified?: Date;
  }): BuildingClassificationResult {
    // Defensive check for undefined/null path
    if (!building.path || typeof building.path !== 'string') {
      throw new Error(
        `BuildingTypeResolver.classifyBuilding: Invalid path provided. Expected string, got: ${typeof building.path} (${
          building.path
        })`,
      );
    }

    const filename = building.path.split('/').pop() || '';

    // Check for special filename patterns first (higher priority)
    if (SPECIAL_FILE_PATTERNS[filename]) {
      const pattern = SPECIAL_FILE_PATTERNS[filename];
      const color = this.determineColor(building, filename, true);

      return {
        buildingType: {
          id: filename,
          color,
          ...pattern,
        },
        matchedPattern: filename,
      };
    }

    // Check for case-insensitive special files
    const lowerFilename = filename.toLowerCase();
    for (const [specialFile, pattern] of Object.entries(SPECIAL_FILE_PATTERNS)) {
      if (specialFile.toLowerCase() === lowerFilename) {
        const color = this.determineColor(building, specialFile, true);

        return {
          buildingType: {
            id: specialFile,
            color,
            ...pattern,
          },
          matchedPattern: specialFile,
        };
      }
    }

    // Fall back to extension-based classification
    const extension = building.fileExtension || '';
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;

    if (EXTENSION_PATTERNS[normalizedExt]) {
      const pattern = EXTENSION_PATTERNS[normalizedExt];
      const color = this.determineColor(building, normalizedExt, false);

      return {
        buildingType: {
          id: normalizedExt,
          color,
          ...pattern,
        },
        matchedPattern: normalizedExt,
      };
    }

    // Default for unknown files
    const color = this.determineColor(building, '', false);
    return {
      buildingType: {
        id: 'unknown',
        displayName: 'Unknown File',
        color,
        isSpecialFile: false,
        priority: 0,
      },
      matchedPattern: 'unknown',
    };
  }

  /**
   * Determine the color for a building using the priority system:
   * 1. Custom color function
   * 2. Theme colors
   * 3. Files.json configuration (from builder package)
   * 4. Special file default colors (fallback)
   * 5. Default gray
   */
  private determineColor(
    building: {
      path: string;
      fileExtension?: string;
      size?: number;
      lastModified?: Date;
    },
    pattern: string,
    isSpecialFile: boolean,
  ): string {
    // 1. Custom color function takes precedence
    if (this.customColorFn) {
      const customColor = this.customColorFn(building);
      if (customColor) return customColor;
    }

    // 2. Theme-based color
    if (this.theme) {
      if (isSpecialFile) {
        // For special files, try to find a theme color based on extension if available
        const extension = building.fileExtension || '';
        const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
        if (this.theme.colors[normalizedExt]) {
          return this.theme.colors[normalizedExt];
        }
      } else {
        // For extensions, use theme directly
        if (this.theme.colors[pattern]) {
          return this.theme.colors[pattern];
        }
      }

      // Fall back to theme default
      return this.theme.default;
    }

    // 3. Files.json configuration (shared with React package)
    const fileColorConfig = defaultFileColorConfig as {
      suffixConfigs?: Record<string, { primary?: { color?: string } }>;
    };
    if (fileColorConfig?.suffixConfigs) {
      // Check for special file or extension in files.json
      const config = fileColorConfig.suffixConfigs[pattern];
      if (config?.primary?.color) {
        return config.primary.color;
      }
    }

    // 4. Special file default colors (fallback for files not in files.json)
    if (isSpecialFile && SPECIAL_FILE_COLORS[pattern]) {
      return SPECIAL_FILE_COLORS[pattern];
    }

    // 5. Use default config from files.json if available
    if (fileColorConfig?.defaultConfig?.primary?.color) {
      return fileColorConfig.defaultConfig.primary.color;
    }

    // 6. Final fallback - gray
    return '#666666';
  }

  /**
   * Determine the color for a directory using the priority system:
   * 1. Theme colors (if applicable)
   * 2. Special directory default colors
   * 3. Default directory color
   */
  private determineDirectoryColor(
    _directory: {
      path: string;
      name: string;
      fileCount?: number;
      totalSize?: number;
    },
    pattern: string,
    isSpecialDirectory: boolean,
  ): string {
    // TODO: Add theme support for directories in the future
    // For now, themes don't typically define directory colors

    // Special directory default colors
    if (isSpecialDirectory && SPECIAL_DIRECTORY_COLORS[pattern]) {
      return SPECIAL_DIRECTORY_COLORS[pattern];
    }

    // Default directory color (configurable)
    return this.defaultDirectoryColor;
  }


  /**
   * Get all possible building types for legend generation
   */
  getAllBuildingTypes(
    files: Array<{ path: string; fileExtension?: string; size?: number; lastModified?: Date }>,
  ): BuildingTypeInfo[] {
    const typesMap = new Map<string, BuildingTypeInfo>();

    // Classify all files and collect unique types
    files.forEach(file => {
      const result = this.classifyBuilding(file);
      typesMap.set(result.buildingType.id, result.buildingType);
    });

    // Sort by priority (descending) then by display name
    return Array.from(typesMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Get all possible directory types for legend generation
   */
  getAllDirectoryTypes(
    directories: Array<{ path: string; name: string; fileCount?: number; totalSize?: number }>,
  ): BuildingTypeInfo[] {
    const typesMap = new Map<string, BuildingTypeInfo>();

    // Classify all directories and collect unique types
    directories.forEach(directory => {
      const result = this.classifyDirectory(directory);
      typesMap.set(result.buildingType.id, result.buildingType);
    });

    // Sort by priority (descending) then by display name
    return Array.from(typesMap.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Get all types (files + directories) for comprehensive legend
   */
  getAllTypes(
    files: Array<{ path: string; fileExtension?: string; size?: number; lastModified?: Date }>,
    directories: Array<{ path: string; name: string; fileCount?: number; totalSize?: number }>,
  ): BuildingTypeInfo[] {
    const buildingTypes = this.getAllBuildingTypes(files);
    const directoryTypes = this.getAllDirectoryTypes(directories);

    // Combine and sort by priority
    const allTypes = [...buildingTypes, ...directoryTypes];
    return allTypes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Calculate building type distribution for statistics
   */
  calculateBuildingTypeDistribution(
    files: Array<{ path: string; fileExtension?: string; size?: number; lastModified?: Date }>,
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    files.forEach(file => {
      const result = this.classifyBuilding(file);
      const typeId = result.buildingType.id;
      distribution[typeId] = (distribution[typeId] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate directory type distribution for statistics
   */
  calculateDirectoryTypeDistribution(
    directories: Array<{ path: string; name: string; fileCount?: number; totalSize?: number }>,
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    directories.forEach(directory => {
      const result = this.classifyDirectory(directory);
      const typeId = result.buildingType.id;
      distribution[typeId] = (distribution[typeId] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate combined type distribution (files + directories)
   */
  calculateCombinedTypeDistribution(
    files: Array<{ path: string; fileExtension?: string; size?: number; lastModified?: Date }>,
    directories: Array<{ path: string; name: string; fileCount?: number; totalSize?: number }>,
  ): Record<string, number> {
    const buildingDist = this.calculateBuildingTypeDistribution(files);
    const directoryDist = this.calculateDirectoryTypeDistribution(directories);

    // Merge both distributions
    const combined = { ...buildingDist };
    Object.entries(directoryDist).forEach(([typeId, count]) => {
      combined[typeId] = (combined[typeId] || 0) + count;
    });

    return combined;
  }

  /**
   * Update theme and/or custom color function
   */
  updateColorConfig(theme?: ColorTheme, customColorFn?: ColorFunction): void {
    this.theme = theme;
    this.customColorFn = customColorFn;
  }
}
