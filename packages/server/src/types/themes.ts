export interface ColorTheme {
  name: string;
  colors: {
    [fileExtension: string]: string;
  };
  default: string;
}

export const THEMES: Record<string, ColorTheme> = {
  default: {
    name: 'Default',
    colors: {
      '.ts': '#2563eb', // TypeScript - blue
      '.tsx': '#06b6d4', // React TypeScript - cyan
      '.js': '#eab308', // JavaScript - yellow
      '.jsx': '#10b981', // React JavaScript - green
      '.md': '#22c55e', // Markdown - green
      '.json': '#f59e0b', // JSON - amber
      '.css': '#ec4899', // CSS - pink
      '.scss': '#8b5cf6', // SCSS - purple
      '.html': '#ef4444', // HTML - red
      '.py': '#3b82f6', // Python - blue
      '.java': '#dc2626', // Java - red
      '.cpp': '#059669', // C++ - emerald
      '.c': '#374151', // C - gray
      '.go': '#0ea5e9', // Go - sky
      '.rs': '#b45309', // Rust - orange
      '.php': '#7c3aed', // PHP - violet
      '.rb': '#dc2626', // Ruby - red
      '.swift': '#f97316', // Swift - orange
      '.kt': '#8b5cf6', // Kotlin - purple
    },
    default: '#6b7280', // Default - gray
  },
  dark: {
    name: 'Dark',
    colors: {
      '.ts': '#1e40af', // Darker blue
      '.tsx': '#0891b2', // Darker cyan
      '.js': '#ca8a04', // Darker yellow
      '.jsx': '#059669', // Darker green
      '.md': '#16a34a', // Darker green
      '.json': '#d97706', // Darker amber
      '.css': '#be185d', // Darker pink
      '.scss': '#7c3aed', // Darker purple
      '.html': '#dc2626', // Darker red
      '.py': '#1d4ed8', // Darker blue
      '.java': '#b91c1c', // Darker red
      '.cpp': '#047857', // Darker emerald
      '.c': '#1f2937', // Darker gray
      '.go': '#0284c7', // Darker sky
      '.rs': '#9a3412', // Darker orange
      '.php': '#6d28d9', // Darker violet
      '.rb': '#b91c1c', // Darker red
      '.swift': '#ea580c', // Darker orange
      '.kt': '#7c3aed', // Darker purple
    },
    default: '#4b5563', // Darker gray
  },
  accessibility: {
    name: 'High Contrast',
    colors: {
      '.ts': '#0000ff', // Pure blue
      '.tsx': '#008080', // Teal
      '.js': '#ffa500', // Orange
      '.jsx': '#008000', // Green
      '.md': '#32cd32', // Lime green
      '.json': '#ff8c00', // Dark orange
      '.css': '#ff1493', // Deep pink
      '.scss': '#9932cc', // Dark orchid
      '.html': '#ff0000', // Red
      '.py': '#4169e1', // Royal blue
      '.java': '#dc143c', // Crimson
      '.cpp': '#228b22', // Forest green
      '.c': '#2f4f4f', // Dark slate gray
      '.go': '#00bfff', // Deep sky blue
      '.rs': '#ff4500', // Orange red
      '.php': '#8a2be2', // Blue violet
      '.rb': '#b22222', // Fire brick
      '.swift': '#ff6347', // Tomato
      '.kt': '#9370db', // Medium purple
    },
    default: '#000000', // Black
  },
  monokai: {
    name: 'Monokai',
    colors: {
      '.ts': '#66d9ef', // Light blue
      '.tsx': '#66d9ef', // Light blue
      '.js': '#e6db74', // Yellow
      '.jsx': '#a6e22e', // Green
      '.md': '#a6e22e', // Green
      '.json': '#e6db74', // Yellow
      '.css': '#f92672', // Pink
      '.scss': '#ae81ff', // Purple
      '.html': '#f92672', // Pink
      '.py': '#66d9ef', // Light blue
      '.java': '#f92672', // Pink
      '.cpp': '#a6e22e', // Green
      '.c': '#75715e', // Gray
      '.go': '#66d9ef', // Light blue
      '.rs': '#fd971f', // Orange
      '.php': '#ae81ff', // Purple
      '.rb': '#f92672', // Pink
      '.swift': '#fd971f', // Orange
      '.kt': '#ae81ff', // Purple
    },
    default: '#75715e', // Gray
  },
  github: {
    name: 'GitHub',
    colors: {
      '.ts': '#2b7489', // TypeScript blue
      '.tsx': '#2b7489', // TypeScript blue
      '.js': '#f1e05a', // JavaScript yellow
      '.jsx': '#f1e05a', // JavaScript yellow
      '.md': '#083fa1', // Markdown blue
      '.json': '#c0c0c0', // JSON gray
      '.css': '#563d7c', // CSS purple
      '.scss': '#c6538c', // SCSS pink
      '.html': '#e34c26', // HTML orange
      '.py': '#3572a5', // Python blue
      '.java': '#b07219', // Java brown
      '.cpp': '#f34b7d', // C++ pink
      '.c': '#555555', // C gray
      '.go': '#00add8', // Go cyan
      '.rs': '#dea584', // Rust tan
      '.php': '#4f5d95', // PHP blue
      '.rb': '#701516', // Ruby red
      '.swift': '#ffac45', // Swift orange
      '.kt': '#f18e33', // Kotlin orange
    },
    default: '#586069', // Default gray
  },
  pastel: {
    name: 'Pastel',
    colors: {
      '.ts': '#a8cceb', // Pastel blue
      '.tsx': '#b3e5fc', // Pastel cyan
      '.js': '#fff9c4', // Pastel yellow
      '.jsx': '#c8e6c9', // Pastel green
      '.md': '#dcedc8', // Pastel light green
      '.json': '#ffe0b2', // Pastel orange
      '.css': '#f8bbd0', // Pastel pink
      '.scss': '#e1bee7', // Pastel purple
      '.html': '#ffccbc', // Pastel red
      '.py': '#bbdefb', // Pastel light blue
      '.java': '#ffcdd2', // Pastel light red
      '.cpp': '#b2dfdb', // Pastel teal
      '.c': '#cfd8dc', // Pastel gray
      '.go': '#b2ebf2', // Pastel cyan
      '.rs': '#ffccbc', // Pastel orange
      '.php': '#d1c4e9', // Pastel violet
      '.rb': '#f8bbd0', // Pastel pink
      '.swift': '#ffe0b2', // Pastel amber
      '.kt': '#ce93d8', // Pastel purple
    },
    default: '#b0bec5', // Pastel blue gray
  },
};

export type ColorFunction = (building: {
  fileExtension?: string;
  size?: number;
  lastModified?: Date;
  path: string;
}) => string | null;

/**
 * Get building color based on theme and optional custom function
 */
export function getBuildingColor(
  building: {
    fileExtension?: string;
    size?: number;
    lastModified?: Date;
    path: string;
  },
  theme: ColorTheme,
  customColorFn?: ColorFunction,
): string {
  // Custom color function takes precedence
  if (customColorFn) {
    console.log('customColorFn', customColorFn);
    const customColor = customColorFn(building);
    if (customColor) return customColor;
  }

  // Theme-based color
  const extension = building.fileExtension || '';
  // Ensure extension has a dot prefix for theme lookup
  const extensionWithDot = extension.startsWith('.') ? extension : `.${extension}`;
  return theme.colors[extensionWithDot] || theme.default;
}
