import { DirectoryInfo, FileInfo } from '@principal-ai/repository-abstraction';
export type DirectorySortFunction = (a: DirectoryInfo, b: DirectoryInfo) => number;
export type FileSortFunction = (a: FileInfo, b: FileInfo) => number;
export declare const CommonSorts: {
    directoryAlphabetical: (a: DirectoryInfo, b: DirectoryInfo) => number;
    directoryAlphabeticalReverse: (a: DirectoryInfo, b: DirectoryInfo) => number;
    directorySize: (a: DirectoryInfo, b: DirectoryInfo) => number;
    directorySizeReverse: (a: DirectoryInfo, b: DirectoryInfo) => number;
    fileAlphabetical: (a: FileInfo, b: FileInfo) => number;
    fileAlphabeticalReverse: (a: FileInfo, b: FileInfo) => number;
    fileSize: (a: FileInfo, b: FileInfo) => number;
    fileSizeReverse: (a: FileInfo, b: FileInfo) => number;
    fileExtension: (a: FileInfo, b: FileInfo) => number;
    fileModificationTime: (a: FileInfo, b: FileInfo) => number;
    fileModificationTimeReverse: (a: FileInfo, b: FileInfo) => number;
};
//# sourceMappingURL=sorts.d.ts.map