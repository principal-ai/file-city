export function getFilesFromGitHubTree(tree) {
    return tree.tree.map(item => ({
        name: item.path.split('/').pop(),
        path: item.path,
        relativePath: item.path,
        size: item.size || 0,
        extension: item.path.includes('.') ? '.' + item.path.split('.').pop() : '',
        lastModified: new Date(),
        isDirectory: item.type === 'tree',
    }));
}
export function buildFileSystemTreeFromFileInfoList(treeFiles, sha) {
    // Build directory structure
    const root = {
        name: 'root',
        path: '',
        relativePath: '',
        type: 'directory',
        children: [],
        fileCount: treeFiles.length,
        totalSize: treeFiles.reduce((sum, file) => sum + (file.size || 0), 0),
        depth: 0,
    };
    // Group files by directory
    const directories = new Map();
    directories.set('', root);
    treeFiles.forEach(file => {
        const pathParts = file.path.split('/');
        const fileName = pathParts.pop();
        // Create directory structure
        let currentPath = '';
        let currentDir = root;
        pathParts.forEach((dirName, index) => {
            currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
            if (!directories.has(currentPath)) {
                const newDir = {
                    name: dirName,
                    path: currentPath,
                    relativePath: currentPath,
                    type: 'directory',
                    children: [],
                    fileCount: 0,
                    totalSize: 0,
                    depth: index + 1,
                };
                directories.set(currentPath, newDir);
                currentDir.children.push(newDir);
            }
            currentDir = directories.get(currentPath);
        });
        // Add file to its directory
        const fileNode = {
            name: fileName,
            path: file.path,
            relativePath: file.path,
            type: 'file',
            size: file.size || 0,
            extension: fileName.includes('.') ? '.' + fileName.split('.').pop() : '',
            lastModified: new Date(), // GitHub API doesn't provide this in tree
        };
        currentDir.children.push(fileNode);
    });
    // Calculate file counts and sizes for directories
    const calculateStats = (dir) => {
        let fileCount = 0;
        let totalSize = 0;
        dir.children.forEach((child) => {
            if (child.type === 'file') {
                fileCount++;
                totalSize += child.size;
            }
            else {
                calculateStats(child);
                fileCount += child.fileCount;
                totalSize += child.totalSize;
            }
        });
        dir.fileCount = fileCount;
        dir.totalSize = totalSize;
    };
    calculateStats(root);
    // Generate legend data
    return {
        sha,
        root,
        stats: {
            totalFiles: treeFiles.length,
            totalDirectories: directories.size - 1, // Exclude root
            totalSize: root.totalSize,
            maxDepth: Math.max(...treeFiles.map(f => f.path.split('/').length)),
            buildingTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
            directoryTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
            combinedTypeDistribution: {}, // Let CodeCityBuilder handle the analysis
        },
        allFiles: treeFiles.map(f => ({
            name: f.path.split('/').pop(),
            path: f.path,
            relativePath: f.path,
            size: f.size || 0,
            extension: f.path.includes('.') ? '.' + f.path.split('.').pop() : '',
            lastModified: new Date(),
            isDirectory: false,
        })),
        allDirectories: Array.from(directories.values()).filter(d => d.path !== ''),
    };
}
export function filterFileSystemTreeForProject(fileSystemTree, projectPath) {
    console.log(`[Project Filter] Filtering for project path: "${projectPath}"`);
    // Handle root project case
    if (projectPath === '') {
        // For root project, exclude files that are in subdirectories with package.json files
        // This is more complex and might need the search index profile to know which subdirs to exclude
        // For now, we'll just return the original tree
        console.log('[Project Filter] Root project - returning full tree');
        return fileSystemTree;
    }
    // Filter allFiles to only include files within the project directory
    const projectPrefix = projectPath + '/';
    const filteredFiles = fileSystemTree.allFiles.filter((file) => {
        const isInProject = file.relativePath.startsWith(projectPrefix);
        return isInProject;
    });
    console.log(`[Project Filter] Filtered ${fileSystemTree.allFiles.length} files to ${filteredFiles.length} files for project "${projectPath}"`);
    if (filteredFiles.length === 0) {
        throw new Error(`No files found for project path "${projectPath}"`);
    }
    // Rebuild the directory structure for the filtered files
    const filteredTree = buildFileSystemTreeFromFileInfoList(filteredFiles, fileSystemTree.sha);
    return filteredTree;
}
//# sourceMappingURL=FileTreeBuilder.js.map