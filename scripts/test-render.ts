#!/usr/bin/env bun
/**
 * Test script for generating File City images from local git repositories.
 *
 * Usage:
 *   bun scripts/test-render.ts [repo-path] [output-path]
 *
 * Examples:
 *   bun scripts/test-render.ts                          # Uses current directory, outputs to city.png
 *   bun scripts/test-render.ts /path/to/repo            # Scans repo, outputs to city.png
 *   bun scripts/test-render.ts /path/to/repo output.png # Scans repo, outputs to output.png
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import {
  CodeCityBuilderWithGrid,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import {
  createDrawContext,
  clearCanvas,
  drawDistricts,
  drawBuildings,
  RenderMode,
} from '@principal-ai/file-city-server';
import type { FileInfo } from '@principal-ai/repository-abstraction';

// Configuration
const WIDTH = 1920;
const HEIGHT = 1080;
const BACKGROUND_COLOR = '#1a1a2e';

// Patterns to ignore when scanning
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist\//,
  /build\//,
  /\.next/,
  /coverage/,
  /\.turbo/,
  /\.cache/,
];

/**
 * Recursively scan a directory and collect file info
 */
function scanDirectory(dirPath: string, basePath: string = dirPath): FileInfo[] {
  const files: FileInfo[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    // Skip ignored patterns
    if (IGNORE_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...scanDirectory(fullPath, basePath));
    } else if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      const extension = path.extname(entry.name);

      files.push({
        name: entry.name,
        path: relativePath,
        relativePath: relativePath,
        size: stats.size,
        extension: extension,
        lastModified: stats.mtime,
        isDirectory: false,
      });
    }
  }

  return files;
}

/**
 * Main function to generate city image
 */
async function generateCityImage(repoPath: string, outputPath: string): Promise<void> {
  console.log(`\nScanning repository: ${repoPath}`);

  // 1. Scan the directory
  const files = scanDirectory(repoPath);
  console.log(`Found ${files.length} files`);

  if (files.length === 0) {
    console.error('No files found in repository');
    process.exit(1);
  }

  // 2. Build file system tree
  console.log('Building file system tree...');
  const fileTree = buildFileSystemTreeFromFileInfoList(files, 'local-scan');

  // 3. Build city layout
  console.log('Building city layout...');
  const builder = new CodeCityBuilderWithGrid();
  const cityData = builder.buildCityFromFileSystem(fileTree, '', {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 2,
  });

  console.log(`City has ${cityData.buildings.length} buildings and ${cityData.districts.length} districts`);

  // 4. Create canvas and render
  console.log('Rendering to canvas...');
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Clear background
  clearCanvas(ctx, WIDTH, HEIGHT, BACKGROUND_COLOR);

  // Create draw context with scaling
  const drawContext = createDrawContext(ctx, WIDTH, HEIGHT, cityData, 40);

  // Draw districts first (background)
  drawDistricts(
    RenderMode.HIGHLIGHT,
    ctx,
    cityData.districts,
    drawContext.worldToCanvas,
    drawContext.scale,
  );

  // Draw buildings on top
  drawBuildings(
    'highlight',
    ctx,
    cityData.buildings,
    drawContext.worldToCanvas,
    drawContext.scale,
    undefined, // highlightedPaths
    undefined, // selectedPaths
    undefined, // focusDirectory
    undefined, // hoveredBuilding
    undefined, // theme
    undefined, // customColorFn
    true, // showFileNames
    true, // fullSize
  );

  // 5. Save to file
  console.log(`Saving to ${outputPath}...`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`\nDone! Image saved to: ${outputPath}`);
  console.log(`Image size: ${WIDTH}x${HEIGHT}`);
}

// CLI entry point
const args = process.argv.slice(2);
const repoPath = args[0] || process.cwd();
const outputPath = args[1] || 'city.png';

// Resolve paths
const resolvedRepoPath = path.resolve(repoPath);
const resolvedOutputPath = path.resolve(outputPath);

// Validate repo path exists
if (!fs.existsSync(resolvedRepoPath)) {
  console.error(`Error: Repository path does not exist: ${resolvedRepoPath}`);
  process.exit(1);
}

if (!fs.statSync(resolvedRepoPath).isDirectory()) {
  console.error(`Error: Repository path is not a directory: ${resolvedRepoPath}`);
  process.exit(1);
}

// Run
generateCityImage(resolvedRepoPath, resolvedOutputPath).catch(error => {
  console.error('Error generating city image:', error);
  process.exit(1);
});
