export const CommonSorts = {
    // Directory sorts
    directoryAlphabetical: (a, b) => a.name.localeCompare(b.name),
    directoryAlphabeticalReverse: (a, b) => b.name.localeCompare(a.name),
    directorySize: (a, b) => b.fileCount - a.fileCount,
    directorySizeReverse: (a, b) => a.fileCount - b.fileCount,
    // File sorts
    fileAlphabetical: (a, b) => a.name.localeCompare(b.name),
    fileAlphabeticalReverse: (a, b) => b.name.localeCompare(a.name),
    fileSize: (a, b) => b.size - a.size,
    fileSizeReverse: (a, b) => a.size - b.size,
    fileExtension: (a, b) => {
        const extA = a.name.split('.').pop() || '';
        const extB = b.name.split('.').pop() || '';
        return extA.localeCompare(extB) || a.name.localeCompare(b.name);
    },
    fileModificationTime: (a, b) => {
        if (!a.lastModified || !b.lastModified)
            return 0;
        return b.lastModified.getTime() - a.lastModified.getTime();
    },
    fileModificationTimeReverse: (a, b) => {
        if (!a.lastModified || !b.lastModified)
            return 0;
        return a.lastModified.getTime() - b.lastModified.getTime();
    },
};
//# sourceMappingURL=sorts.js.map