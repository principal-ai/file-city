import { ImportanceConfig, ImportanceResult, ImportanceLevel } from '../types/importanceTypes';
/**
 * Calculate the importance of a file or directory based on the configuration
 */
export declare function calculateImportance(path: string, type: 'file' | 'directory', config?: ImportanceConfig): ImportanceResult | null;
/**
 * Get the importance level details for a given importance value
 */
export declare function getImportanceLevel(importance: number, config?: ImportanceConfig): ImportanceLevel;
/**
 * Check if a file or directory should show importance indicators
 */
export declare function shouldShowImportance(importance: number, config?: ImportanceConfig): boolean;
/**
 * Get star count for an importance level
 */
export declare function getStarCount(importance: number, config?: ImportanceConfig): number;
/**
 * Create a path matcher function for efficient bulk matching
 */
export declare function createImportanceMatcher(config?: ImportanceConfig): (path: string, type: "file" | "directory") => ImportanceResult | null;
//# sourceMappingURL=importanceUtils.d.ts.map