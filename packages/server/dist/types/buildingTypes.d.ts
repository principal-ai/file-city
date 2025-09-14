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
export declare const SPECIAL_DIRECTORY_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>>;
/**
 * Default colors for special directories (when no theme is provided)
 */
export declare const SPECIAL_DIRECTORY_COLORS: Record<string, string>;
/**
 * Configuration for special filename patterns
 */
export declare const SPECIAL_FILE_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>>;
/**
 * Default colors for special files (when no theme is provided)
 */
export declare const SPECIAL_FILE_COLORS: Record<string, string>;
/**
 * Extension-based file type information
 */
export declare const EXTENSION_PATTERNS: Record<string, Omit<BuildingTypeInfo, 'id' | 'color'>>;
/**
 * Centralized building type resolver
 */
export declare class BuildingTypeResolver {
    private theme?;
    private customColorFn?;
    private defaultDirectoryColor;
    constructor(theme?: ColorTheme, customColorFn?: ColorFunction, defaultDirectoryColor?: string);
    /**
     * Classify a directory and determine its type information
     */
    classifyDirectory(directory: {
        path: string;
        name: string;
        fileCount?: number;
        totalSize?: number;
    }): BuildingClassificationResult;
    /**
     * Classify a building and determine its type information
     */
    classifyBuilding(building: {
        path: string;
        fileExtension?: string;
        size?: number;
        lastModified?: Date;
    }): BuildingClassificationResult;
    /**
     * Determine the color for a building using the priority system:
     * 1. Custom color function
     * 2. Theme colors
     * 3. Special file default colors
     * 4. Extension default colors (legacy)
     * 5. Default gray
     */
    private determineColor;
    /**
     * Determine the color for a directory using the priority system:
     * 1. Theme colors (if applicable)
     * 2. Special directory default colors
     * 3. Default directory color
     */
    private determineDirectoryColor;
    /**
     * Get legacy extension colors for backward compatibility
     */
    private getLegacyExtensionColor;
    /**
     * Get all possible building types for legend generation
     */
    getAllBuildingTypes(files: Array<{
        path: string;
        fileExtension?: string;
        size?: number;
        lastModified?: Date;
    }>): BuildingTypeInfo[];
    /**
     * Get all possible directory types for legend generation
     */
    getAllDirectoryTypes(directories: Array<{
        path: string;
        name: string;
        fileCount?: number;
        totalSize?: number;
    }>): BuildingTypeInfo[];
    /**
     * Get all types (files + directories) for comprehensive legend
     */
    getAllTypes(files: Array<{
        path: string;
        fileExtension?: string;
        size?: number;
        lastModified?: Date;
    }>, directories: Array<{
        path: string;
        name: string;
        fileCount?: number;
        totalSize?: number;
    }>): BuildingTypeInfo[];
    /**
     * Calculate building type distribution for statistics
     */
    calculateBuildingTypeDistribution(files: Array<{
        path: string;
        fileExtension?: string;
        size?: number;
        lastModified?: Date;
    }>): Record<string, number>;
    /**
     * Calculate directory type distribution for statistics
     */
    calculateDirectoryTypeDistribution(directories: Array<{
        path: string;
        name: string;
        fileCount?: number;
        totalSize?: number;
    }>): Record<string, number>;
    /**
     * Calculate combined type distribution (files + directories)
     */
    calculateCombinedTypeDistribution(files: Array<{
        path: string;
        fileExtension?: string;
        size?: number;
        lastModified?: Date;
    }>, directories: Array<{
        path: string;
        name: string;
        fileCount?: number;
        totalSize?: number;
    }>): Record<string, number>;
    /**
     * Update theme and/or custom color function
     */
    updateColorConfig(theme?: ColorTheme, customColorFn?: ColorFunction): void;
}
//# sourceMappingURL=buildingTypes.d.ts.map