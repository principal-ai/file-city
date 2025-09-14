export interface ImportanceConfig {
  // Pattern-based configuration using glob patterns
  patterns?: {
    files?: ImportancePattern[];
    directories?: ImportancePattern[];
  };

  // Explicit path configuration for specific files/directories
  explicit?: {
    files?: ImportanceEntry[];
    directories?: ImportanceEntry[];
  };

  // Define importance levels and their visual properties
  levels?: ImportanceLevel[];

  // Global visual settings
  visualSettings?: {
    showStars?: boolean; // Show star indicators (default: true)
    starColor?: string; // Star color (default: '#FFD700')
    starSize?: number; // Star size multiplier (default: 1)
    enableGlow?: boolean; // Enable glow effect (default: true)
  };
}

export interface ImportancePattern {
  pattern: string; // Glob pattern (e.g., "*.config.*", "**/*.test.*")
  importance: number; // Importance level 1-10
  label?: string; // Display label (e.g., "Configuration Files")
  description?: string; // Detailed description
  documentationPath?: string; // Path to documentation (relative or URL)
}

export interface ImportanceEntry {
  path: string; // Exact file/directory path (e.g., "src/index.ts")
  importance: number; // Importance level 1-10
  label?: string; // Display label
  description?: string; // Detailed description
  documentationPath?: string; // Path to documentation (relative or URL)
}

export interface ImportanceLevel {
  value: number; // Level value (1-10)
  name: string; // Level name (e.g., "Critical", "High")
  color?: string; // Optional color override
  icon?: string; // Optional custom icon/emoji
  starCount?: number; // Number of stars to display (1-3)
}

// Helper type for importance calculation results
export interface ImportanceResult {
  importance: number;
  label?: string;
  description?: string;
  documentationPath?: string;
  source: 'pattern' | 'explicit';
}

// Default importance levels
export const DEFAULT_IMPORTANCE_LEVELS: ImportanceLevel[] = [
  {
    value: 10,
    name: 'Critical',
    color: '#ff0000',
    starCount: 3,
  },
  {
    value: 8,
    name: 'High',
    color: '#ff8800',
    starCount: 2,
  },
  {
    value: 5,
    name: 'Medium',
    color: '#ffcc00',
    starCount: 1,
  },
  {
    value: 3,
    name: 'Low',
    color: '#88ff00',
    starCount: 0,
  },
];

// Default visual settings
export const DEFAULT_VISUAL_SETTINGS = {
  showStars: true,
  starColor: '#FFD700',
  starSize: 1,
  enableGlow: true,
};
