import { DirectoryInfo, FileInfo } from '@principal-ai/repository-abstraction';

export type DirectorySortFunction = (a: DirectoryInfo, b: DirectoryInfo) => number;
export type FileSortFunction = (a: FileInfo, b: FileInfo) => number;

export const CommonSorts = {
  // Directory sorts
  directoryAlphabetical: (a: DirectoryInfo, b: DirectoryInfo) => a.name.localeCompare(b.name),

  directoryAlphabeticalReverse: (a: DirectoryInfo, b: DirectoryInfo) =>
    b.name.localeCompare(a.name),

  directorySize: (a: DirectoryInfo, b: DirectoryInfo) => b.fileCount - a.fileCount,

  directorySizeReverse: (a: DirectoryInfo, b: DirectoryInfo) => a.fileCount - b.fileCount,

  // File sorts
  fileAlphabetical: (a: FileInfo, b: FileInfo) => a.name.localeCompare(b.name),

  fileAlphabeticalReverse: (a: FileInfo, b: FileInfo) => b.name.localeCompare(a.name),

  fileSize: (a: FileInfo, b: FileInfo) => b.size - a.size,

  fileSizeReverse: (a: FileInfo, b: FileInfo) => a.size - b.size,

  fileExtension: (a: FileInfo, b: FileInfo) => {
    const extA = a.name.split('.').pop() || '';
    const extB = b.name.split('.').pop() || '';
    return extA.localeCompare(extB) || a.name.localeCompare(b.name);
  },

  fileModificationTime: (a: FileInfo, b: FileInfo) => {
    if (!a.lastModified || !b.lastModified) return 0;
    return b.lastModified.getTime() - a.lastModified.getTime();
  },

  fileModificationTimeReverse: (a: FileInfo, b: FileInfo) => {
    if (!a.lastModified || !b.lastModified) return 0;
    return a.lastModified.getTime() - b.lastModified.getTime();
  },
};
