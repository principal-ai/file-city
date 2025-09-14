import { FileInfo, FileTree as FileSystemTree } from '@principal-ai/repository-abstraction';
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
export declare function getFilesFromGitHubTree(tree: GitHubTreeResponse): FileInfo[];
export declare function buildFileSystemTreeFromFileInfoList(treeFiles: FileInfo[], sha: string): FileSystemTree;
export declare function filterFileSystemTreeForProject(fileSystemTree: FileSystemTree, projectPath: string): FileSystemTree;
export {};
//# sourceMappingURL=FileTreeBuilder.d.ts.map