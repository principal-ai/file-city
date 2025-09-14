import { minimatch } from 'minimatch';

import {
  ImportanceConfig,
  ImportanceResult,
  ImportanceLevel,
  DEFAULT_IMPORTANCE_LEVELS,
} from '../types/importanceTypes';

/**
 * Calculate the importance of a file or directory based on the configuration
 */
export function calculateImportance(
  path: string,
  type: 'file' | 'directory',
  config?: ImportanceConfig,
): ImportanceResult | null {
  if (!config) return null;

  // Check explicit entries first (they take precedence)
  if (config.explicit) {
    const entries = type === 'file' ? config.explicit.files : config.explicit.directories;
    if (entries) {
      const exactMatch = entries.find(entry => entry.path === path);
      if (exactMatch) {
        return {
          importance: exactMatch.importance,
          label: exactMatch.label,
          description: exactMatch.description,
          documentationPath: exactMatch.documentationPath,
          source: 'explicit',
        };
      }
    }
  }

  // Check patterns
  if (config.patterns) {
    const patterns = type === 'file' ? config.patterns.files : config.patterns.directories;
    if (patterns) {
      // Find the highest importance match
      let bestMatch: ImportanceResult | null = null;

      for (const pattern of patterns) {
        if (minimatch(path, pattern.pattern)) {
          if (!bestMatch || pattern.importance > bestMatch.importance) {
            bestMatch = {
              importance: pattern.importance,
              label: pattern.label,
              description: pattern.description,
              documentationPath: pattern.documentationPath,
              source: 'pattern',
            };
          }
        }
      }

      if (bestMatch) return bestMatch;
    }
  }

  return null;
}

/**
 * Get the importance level details for a given importance value
 */
export function getImportanceLevel(importance: number, config?: ImportanceConfig): ImportanceLevel {
  const levels = config?.levels || DEFAULT_IMPORTANCE_LEVELS;

  // Find the matching level or the closest one below
  let matchedLevel = levels[levels.length - 1]; // Default to lowest

  for (const level of levels) {
    if (importance >= level.value) {
      matchedLevel = level;
      break;
    }
  }

  return matchedLevel;
}

/**
 * Check if a file or directory should show importance indicators
 */
export function shouldShowImportance(importance: number, config?: ImportanceConfig): boolean {
  if (!config?.visualSettings?.showStars) return false;

  // Only show stars for importance >= 5 by default
  return importance >= 5;
}

/**
 * Get star count for an importance level
 */
export function getStarCount(importance: number, config?: ImportanceConfig): number {
  const level = getImportanceLevel(importance, config);
  return level.starCount || 0;
}

/**
 * Create a path matcher function for efficient bulk matching
 */
export function createImportanceMatcher(config?: ImportanceConfig) {
  if (!config) return () => null;

  return (path: string, type: 'file' | 'directory'): ImportanceResult | null => {
    return calculateImportance(path, type, config);
  };
}
