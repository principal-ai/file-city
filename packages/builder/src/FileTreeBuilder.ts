import {
  FileInfo,
  DirectoryInfo,
  FileTree as FileSystemTree,
  FileTreeNode,
} from '@principal-ai/repository-abstraction';

// GitHub API response types
interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

// Internal directory node type for building the tree structure
interface DirectoryNode {
  name: string;
  path: string;
  relativePath: string;
  type: 'directory';
  children: Array<DirectoryNode | FileNodeInternal>;
  fileCount: number;
  totalSize: number;
  depth: number;
}

// Internal file node type for building the tree structure
interface FileNodeInternal {
  name: string;
  path: string;
  relativePath: string;
  type: 'file';
  size: number;
  extension: string;
  lastModified: Date;
}

export function getFilesFromGitHubTree(tree: GitHubTreeResponse): FileInfo[] {
  return tree.tree.map(item => ({
    name: item.path.split('/').pop() || item.path,
    path: item.path,
    relativePath: item.path,
    size: item.size || 0,
    extension: item.path.includes('.') ? '.' + item.path.split('.').pop() : '',
    lastModified: new Date(),
    isDirectory: item.type === 'tree',
  }));
}

export function buildFileSystemTreeFromFileInfoList(
  treeFiles: FileInfo[],
  sha: string,
): FileSystemTree {
  // Build directory structure
  const root: DirectoryNode = {
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
  const directories = new Map<string, DirectoryNode>();
  directories.set('', root);

  treeFiles.forEach(file => {
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop() || file.path;

    // Create directory structure
    let currentPath = '';
    let currentDir = root;

    pathParts.forEach((dirName, index) => {
      currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

      if (!directories.has(currentPath)) {
        const newDir: DirectoryNode = {
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

      const nextDir = directories.get(currentPath);
      if (!nextDir) {
        throw new Error(`Directory not found: ${currentPath}`);
      }
      currentDir = nextDir;
    });

    // Add file to its directory
    const fileNode: FileNodeInternal = {
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
  const calculateStats = (dir: DirectoryNode): void => {
    let fileCount = 0;
    let totalSize = 0;

    dir.children.forEach((child: DirectoryNode | FileNodeInternal) => {
      if (child.type === 'file') {
        fileCount++;
        totalSize += child.size;
      } else {
        calculateStats(child);
        fileCount += child.fileCount;
        totalSize += child.totalSize;
      }
    });

    dir.fileCount = fileCount;
    dir.totalSize = totalSize;
  };

  calculateStats(root);

  // Convert internal types to DirectoryInfo/FileInfo
  const convertToFileTreeNode = (node: DirectoryNode | FileNodeInternal): FileTreeNode => {
    if (node.type === 'file') {
      const fileNode: FileInfo = {
        name: node.name,
        path: node.path,
        relativePath: node.relativePath,
        size: node.size,
        extension: node.extension,
        lastModified: node.lastModified,
        isDirectory: false,
      };
      return fileNode;
    } else {
      const dirNode: DirectoryInfo = {
        name: node.name,
        path: node.path,
        relativePath: node.relativePath,
        children: node.children.map(convertToFileTreeNode),
        fileCount: node.fileCount,
        totalSize: node.totalSize,
        depth: node.depth,
      };
      return dirNode;
    }
  };

  const rootAsDirectoryInfo = convertToFileTreeNode(root) as DirectoryInfo;
  const allDirectoriesConverted: DirectoryInfo[] = Array.from(directories.values())
    .filter(d => d.path !== '')
    .map(d => convertToFileTreeNode(d) as DirectoryInfo);

  // Generate legend data

  return {
    sha,
    root: rootAsDirectoryInfo,
    stats: {
      totalFiles: treeFiles.length,
      totalDirectories: directories.size - 1, // Exclude root
      totalSize: root.totalSize,
      maxDepth: Math.max(...treeFiles.map(f => f.path.split('/').length)),
       // Let CodeCityBuilder handle the analysis
       // Let CodeCityBuilder handle the analysis
       // Let CodeCityBuilder handle the analysis
    },
    allFiles: treeFiles.map(f => ({
      name: f.path.split('/').pop() || f.path,
      path: f.path,
      relativePath: f.path,
      size: f.size || 0,
      extension: f.path.includes('.') ? '.' + f.path.split('.').pop() : '',
      lastModified: new Date(),
      isDirectory: false,
    })),
    allDirectories: allDirectoriesConverted,
    metadata: {
      id: 'file-tree',
      timestamp: new Date(),
      sourceType: 'github-tree',
      sourceInfo: {},
    },
  };
}

export function filterFileSystemTreeForProject(
  fileSystemTree: FileSystemTree,
  projectPath: string,
): FileSystemTree {
  // Handle root project case
  if (projectPath === '') {
    // For root project, exclude files that are in subdirectories with package.json files
    // This is more complex and might need the search index profile to know which subdirs to exclude
    // For now, we'll just return the original tree
    return fileSystemTree;
  }

  // Filter allFiles to only include files within the project directory
  const projectPrefix = projectPath + '/';
  const filteredFiles = fileSystemTree.allFiles.filter((file: FileInfo) => {
    const isInProject = file.relativePath.startsWith(projectPrefix);
    return isInProject;
  });

  if (filteredFiles.length === 0) {
    throw new Error(`No files found for project path "${projectPath}"`);
  }

  // Rebuild the directory structure for the filtered files
  const filteredTree = buildFileSystemTreeFromFileInfoList(filteredFiles, fileSystemTree.sha);

  return filteredTree;
}
