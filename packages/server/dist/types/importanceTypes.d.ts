export interface ImportanceConfig {
    patterns?: {
        files?: ImportancePattern[];
        directories?: ImportancePattern[];
    };
    explicit?: {
        files?: ImportanceEntry[];
        directories?: ImportanceEntry[];
    };
    levels?: ImportanceLevel[];
    visualSettings?: {
        showStars?: boolean;
        starColor?: string;
        starSize?: number;
        enableGlow?: boolean;
    };
}
export interface ImportancePattern {
    pattern: string;
    importance: number;
    label?: string;
    description?: string;
    documentationPath?: string;
}
export interface ImportanceEntry {
    path: string;
    importance: number;
    label?: string;
    description?: string;
    documentationPath?: string;
}
export interface ImportanceLevel {
    value: number;
    name: string;
    color?: string;
    icon?: string;
    starCount?: number;
}
export interface ImportanceResult {
    importance: number;
    label?: string;
    description?: string;
    documentationPath?: string;
    source: 'pattern' | 'explicit';
}
export declare const DEFAULT_IMPORTANCE_LEVELS: ImportanceLevel[];
export declare const DEFAULT_VISUAL_SETTINGS: {
    showStars: boolean;
    starColor: string;
    starSize: number;
    enableGlow: boolean;
};
//# sourceMappingURL=importanceTypes.d.ts.map