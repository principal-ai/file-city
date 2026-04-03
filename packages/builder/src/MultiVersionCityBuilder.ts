import {
  FileTree as FileSystemTree,
  DirectoryInfo,
  FileInfo,
} from '@principal-ai/repository-abstraction';
import { CodebaseView } from './types/codebaseView.js';

import { CityData } from './types/cityData.js';
import { CodeCityBuilderWithGrid } from './CodeCityBuilderWithGrid.js';

export interface MultiVersionOptions {
  gridLayout?: CodebaseView;
}

export interface MultiVersionResult {
  unionCity: CityData;
  presenceByVersion: Map<string, Set<string>>;
}

/**
 * Multi-version city builder that preserves all city data including grid labels.
 * This builder creates a single union city from multiple file trees and provides
 * filtered views for each version while maintaining all visual metadata.
 */
export class MultiVersionCityBuilder {
  /**
   * Build a multi-version city that preserves all metadata including grid labels
   */
  static build(
    versionTrees: Map<string, FileSystemTree>,
    options: MultiVersionOptions = {},
  ): MultiVersionResult {
    // Step 1: Merge all trees into a union tree
    const unionTree = this.mergeTreesByPath(versionTrees);

    // Step 2: Build the union city with all features preserved
    const builder = new CodeCityBuilderWithGrid();
    const unionCity = builder.buildCityFromFileSystem(unionTree, '', {
      gridLayout: options.gridLayout,
    });

    // Step 3: Build presence sets for filtering
    const presenceByVersion = this.buildPresenceSets(versionTrees);

    return { unionCity, presenceByVersion };
  }

  /**
   * Get a filtered view of the city for a specific version
   */
  static getVersionView(
    unionCity: CityData,
    presentFiles: Set<string>,
    options: { filterPrefix?: string } = {},
  ): CityData {
    // Filter buildings to only those present in this version
    const visibleBuildings = unionCity.buildings.filter(b => {
      if (options.filterPrefix && !b.path.startsWith(options.filterPrefix)) return false;
      return presentFiles.has(b.path);
    });

    // Calculate which districts have visible files
    const districtsWithFiles = new Set<string>();
    for (const building of visibleBuildings) {
      // Find the district this building belongs to
      const districtPath = unionCity.districts.reduce(
        (best, d) =>
          building.path.startsWith(d.path) && d.path.length > best.length ? d.path : best,
        '',
      );
      districtsWithFiles.add(districtPath);
    }

    // Filter districts to only those with files (but preserve ALL district properties including labels)
    const visibleDistricts = unionCity.districts
      .filter(d => {
        if (options.filterPrefix && !d.path.startsWith(options.filterPrefix)) return false;
        // Always keep grid cell districts (they have labels)
        if (d.path.startsWith('grid-cell-')) return true;
        return districtsWithFiles.has(d.path) || d.path === '';
      })
      .map(d => ({
        ...d, // Preserve all properties including label
        fileCount: visibleBuildings.filter(
          b =>
            b.path.startsWith(d.path) &&
            !unionCity.districts.some(
              other =>
                other.path !== d.path &&
                other.path.startsWith(d.path) &&
                b.path.startsWith(other.path),
            ),
        ).length,
      }));

    // Return a new city data with filtered elements but all metadata preserved
    return {
      buildings: visibleBuildings,
      districts: visibleDistricts,
      bounds: unionCity.bounds,
      metadata: {
        ...unionCity.metadata,
        totalFiles: visibleBuildings.length,
        totalDirectories: visibleDistricts.length,
      },
    };
  }

  private static normalizeRootPath(path: string): string {
    return path.startsWith('/') ? path.substring(1) : path;
  }

  private static mergeTreesByPath(versionTrees: Map<string, FileSystemTree>): FileSystemTree {
    const first = Array.from(versionTrees.values())[0];
    if (!first) throw new Error('mergeTreesByPath: no trees provided');

    const computedRootName = 'root';

    type Node = {
      name: string;
      isDir: boolean;
      children: Map<string, Node>;
      files: Map<string, FileInfo>;
    };

    const rootNode: Node = {
      name: computedRootName,
      isDir: true,
      children: new Map(),
      files: new Map(),
    };

    const addTree = (tree: FileSystemTree) => {
      for (const f of tree.allFiles) {
        const rel = f.relativePath || this.normalizeRootPath(f.path);
        const parts = rel.split('/').filter((p: string) => p !== '');

        if (parts.length === 0) continue;

        let node = rootNode;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          let child = node.children.get(p);
          if (!child) {
            child = { name: p, isDir: true, children: new Map(), files: new Map() };
            node.children.set(p, child);
          }
          node = child;
        }
        const fname = parts[parts.length - 1];
        if (!node.files.has(fname)) {
          node.files.set(fname, {
            ...f,
            name: fname,
            relativePath: rel,
          });
        }
      }
    };

    versionTrees.forEach(addTree);

    const toDirectoryInfo = (node: Node, parentPath: string): DirectoryInfo => {
      const isRoot = node === rootNode;
      const fullPath = isRoot ? '' : parentPath === '' ? node.name : `${parentPath}/${node.name}`;
      const relPath = isRoot ? '' : parentPath === '' ? node.name : `${parentPath}/${node.name}`;

      const children: (DirectoryInfo | FileInfo)[] = [];
      for (const [, childNode] of node.children) {
        children.push(toDirectoryInfo(childNode, fullPath));
      }
      for (const [, file] of node.files) {
        const fileFullPath = fullPath === '' ? file.name : `${fullPath}/${file.name}`;
        const fileRelPath = relPath === '' ? file.name : `${relPath}/${file.name}`;
        const completeFile: FileInfo = {
          ...file,
          path: fileFullPath,
          relativePath: fileRelPath,
        };
        children.push(completeFile);
      }
      const dirInfo: DirectoryInfo = {
        path: fullPath,
        name: node.name,
        children,
        fileCount: children.filter(c => !('children' in c)).length,
        totalSize: 0,
        depth: fullPath.split('/').length - 1,
        relativePath: relPath,
      };
      return dirInfo;
    };

    let root: DirectoryInfo = toDirectoryInfo(rootNode, '');
    // Override some root properties
    root = {
      ...root,
      path: '.',
      name: 'root',
      relativePath: '',
    };

    const allFiles: FileInfo[] = [];
    const allDirectories: DirectoryInfo[] = [];
    const collect = (dir: DirectoryInfo) => {
      allDirectories.push(dir);
      for (const child of dir.children) {
        if ((child as DirectoryInfo).children) collect(child as DirectoryInfo);
        else allFiles.push(child as FileInfo);
      }
    };
    collect(root);

    const unionTree: FileSystemTree = {
      sha: 'union',
      root,
      allFiles,
      allDirectories,
      stats: {
        totalFiles: allFiles.length,
        totalDirectories: allDirectories.length,
        totalSize: 0,
        maxDepth: 0,
      },
      metadata: {
        id: 'union-tree',
        timestamp: new Date(),
        sourceType: 'multi-version',
        sourceInfo: {},
      },
    };
    return unionTree;
  }

  private static buildPresenceSets(
    versionTrees: Map<string, FileSystemTree>,
  ): Map<string, Set<string>> {
    const presenceByVersion = new Map<string, Set<string>>();

    for (const [id, tree] of versionTrees.entries()) {
      const set = new Set<string>();
      for (const f of tree.allFiles) {
        const filePath = f.relativePath || f.path;
        set.add(filePath);
      }
      presenceByVersion.set(id, set);
    }

    return presenceByVersion;
  }
}
