/**
 * Tour Discovery Utilities
 *
 * Finds and loads tour files from file trees.
 * Uses the FileTree system from @principal-ai/repository-abstraction
 */

import type { FileTree } from '@principal-ai/repository-abstraction';
import { parseTour, type TourParseResult, TourValidationError } from './validation.js';

/**
 * Finds *.tour.json file path in a file tree
 * Returns the file path if found, null otherwise
 * If multiple tour files exist, returns the first one found (alphabetically)
 */
export function findTourFilePathInFileTree(fileTree: FileTree): string | null {
  // Look for files ending with .tour.json at the root level
  const tourFiles = fileTree.allFiles.filter((file) => {
    const path = file.path;
    return path.endsWith('.tour.json') && !path.includes('/');
  });

  // Sort alphabetically and take the first one
  tourFiles.sort((a, b) => a.path.localeCompare(b.path));
  const tourFile = tourFiles[0];

  return tourFile ? tourFile.path : null;
}

/**
 * Finds all *.tour.json files in a file tree (including subdirectories)
 * Returns array of file paths
 */
export function findAllTourFilesInFileTree(fileTree: FileTree): string[] {
  return fileTree.allFiles
    .filter((file) => file.path.endsWith('.tour.json'))
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Convenience function to find and parse *.tour.json from a file tree with async file reading
 */
export async function loadTourFromFileTree(
  fileTree: FileTree,
  readFile: (path: string) => Promise<string>
): Promise<TourParseResult> {
  const tourFilePath = findTourFilePathInFileTree(fileTree);

  if (!tourFilePath) {
    return {
      success: false,
      errors: [new TourValidationError('No *.tour.json file found in repository root')],
    };
  }

  try {
    const tourContent = await readFile(tourFilePath);
    return parseTour(tourContent);
  } catch (error) {
    return {
      success: false,
      errors: [
        new TourValidationError(
          `Failed to read tour file: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
      ],
    };
  }
}

/**
 * Load all tours from a file tree
 */
export async function loadAllToursFromFileTree(
  fileTree: FileTree,
  readFile: (path: string) => Promise<string>
): Promise<Array<{ path: string; result: TourParseResult }>> {
  const tourPaths = findAllTourFilesInFileTree(fileTree);

  const results = await Promise.all(
    tourPaths.map(async (path) => {
      try {
        const content = await readFile(path);
        const result = parseTour(content);
        return { path, result };
      } catch (error) {
        return {
          path,
          result: {
            success: false,
            errors: [
              new TourValidationError(
                `Failed to read tour file: ${error instanceof Error ? error.message : 'Unknown error'}`
              ),
            ],
          } as TourParseResult,
        };
      }
    })
  );

  return results;
}
