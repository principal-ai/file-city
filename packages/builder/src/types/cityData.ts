// Core types for code city visualization

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CityBuilding {
  path: string;
  position: Position3D;
  dimensions: [number, number, number]; // [width, height, depth]
  color?: string; // Optional - for backward compatibility, prefer themes
  type: 'file';
  fileExtension?: string;
  size?: number; // File size in bytes
  lineCount?: number; // Number of lines (for code files)
  lastModified?: Date;
}

export interface CityDistrict {
  path: string;
  worldBounds: Bounds2D;
  fileCount: number;
  type: 'directory';
  children?: CityDistrict[];
  label?: {
    text: string;
    bounds: Bounds2D;
    position: 'top' | 'bottom';
  };
}

export interface CityData {
  buildings: CityBuilding[];
  districts: CityDistrict[];
  bounds: Bounds2D;
  metadata: {
    totalFiles: number;
    totalDirectories: number;
    analyzedAt: Date;
    rootPath: string;
    layoutConfig?: {
      paddingTop: number;
      paddingBottom: number;
      paddingLeft: number;
      paddingRight: number;
      paddingInner: number;
      paddingOuter: number;
    };
  };
}

// Render modes for selective directory rendering
export type DirectoryRenderMode =
  | 'all' // Render all directories (default)
  | 'filter' // Only render specified directories
  | 'focus' // Render all but emphasize specified directories
  | 'drilldown'; // Render only the specified directory as root

export interface SelectiveRenderOptions {
  mode: DirectoryRenderMode;
  directories?: Set<string>; // Directories to filter/focus on
  rootDirectory?: string; // For drilldown mode - directory to treat as root
  showParentContext?: boolean; // Whether to show parent directories in drilldown mode
}

// ArchitectureMapProps and related React component interfaces removed
// These belong in the React package, not in the builder

// MapInteractionState and MapDisplayOptions removed - these are React-specific

// PR and commit visualization types
export interface FileChange {
  path: string;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  linesAdded: number;
  linesDeleted: number;
  oldPath?: string; // For renamed files
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  timestamp: Date;
  changedFiles: FileChange[];
}

export interface PRVisualizationData {
  prNumber: number;
  title: string;
  author: string;
  commits: Commit[];
  totalChangedFiles: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
}

// PRVisualizationProps removed - this extends ArchitectureMapProps which is React-specific
