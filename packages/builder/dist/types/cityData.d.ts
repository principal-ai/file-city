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
    dimensions: [number, number, number];
    color?: string;
    type: 'file';
    fileExtension?: string;
    size?: number;
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
export type DirectoryRenderMode = 'all' | 'filter' | 'focus' | 'drilldown';
export interface SelectiveRenderOptions {
    mode: DirectoryRenderMode;
    directories?: Set<string>;
    rootDirectory?: string;
    showParentContext?: boolean;
}
export interface FileChange {
    path: string;
    changeType: 'added' | 'modified' | 'deleted' | 'renamed';
    linesAdded: number;
    linesDeleted: number;
    oldPath?: string;
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
//# sourceMappingURL=cityData.d.ts.map