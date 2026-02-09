/**
 * Introduction Tour Types
 *
 * Defines a guided tour through a codebase using the File City visualization.
 * Each step can focus on specific directories, highlight files, and provide
 * educational context to help new developers understand the codebase structure.
 */

import type { LayerItem } from '../layers/types.js';

/**
 * Color modes available for visualization
 */
export type ColorMode =
  | 'fileTypes'
  | 'git'
  | 'pr'
  | 'commit'
  | 'coverage'
  | 'eslint'
  | 'typescript'
  | 'prettier'
  | 'knip'
  | 'alexandria';

/**
 * Interactive action types
 */
export type InteractiveActionType = 'click-file' | 'hover-directory' | 'toggle-layer' | 'explore';

/**
 * Resource types for additional context
 */
export type TourResourceType = 'documentation' | 'video' | 'article' | 'code';

/**
 * Interactive action for user engagement
 */
export interface InteractiveAction {
  /** Action type */
  type: InteractiveActionType;
  /** Action description */
  description: string;
  /** Target path or identifier */
  target?: string;
  /** Whether this action is required to proceed */
  required?: boolean;
}

/**
 * Resource link for additional context
 */
export interface TourResource {
  /** Resource title */
  title: string;
  /** URL or file path */
  url: string;
  /** Resource type */
  type: TourResourceType;
}

/**
 * Configuration for a highlight layer in a tour step
 * Uses LayerItem from the layers module for full compatibility
 */
export interface HighlightLayerConfig {
  /** Layer identifier */
  id: string;
  /** Display name */
  name: string;
  /** Color for the highlight (hex) */
  color: string;
  /** Files/directories to include in this layer */
  items: LayerItem[];
  /** Opacity (0-1) */
  opacity?: number;
  /** Border width in pixels */
  borderWidth?: number;
  /** Render strategy */
  renderStrategy?: 'fill' | 'border' | 'cover';
}

/**
 * A single step in the introduction tour
 */
export interface IntroductionTourStep {
  /** Unique identifier for this step */
  id: string;
  /** Step title shown to the user */
  title: string;
  /** Detailed description of what this step shows */
  description: string;
  /** Optional estimated time to read/understand this step (in seconds) */
  estimatedTime?: number;
  /** Directory to focus on (will zoom and highlight this directory) */
  focusDirectory?: string;
  /** Cover image URL or path relative to repo root (e.g., 'assets/architecture.png'). Displayed as overlay on File City during this step. Useful for showing diagrams, architecture visuals, or explanatory images. Supports static images (jpg, png, svg) and animated (gif, webp). */
  coverImage?: string;
  /** Highlight layers to show during this step */
  highlightLayers?: HighlightLayerConfig[];
  /** Specific files to highlight or point out */
  highlightFiles?: string[];
  /** Color mode to use for this step */
  colorMode?: ColorMode;
  /** Interactive actions the user should take */
  interactiveActions?: InteractiveAction[];
  /** Links to related documentation or resources */
  resources?: TourResource[];
  /** Whether to automatically advance to the next step */
  autoAdvance?: boolean;
  /** Duration before auto-advancing (in ms) */
  autoAdvanceDelay?: number;
}

/**
 * Tour metadata
 */
export interface TourMetadata {
  /** Author name */
  author?: string;
  /** Creation date (ISO string) */
  createdAt?: string;
  /** Last update date (ISO string) */
  updatedAt?: string;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Complete introduction tour configuration
 */
export interface IntroductionTour {
  /** Tour unique identifier (kebab-case recommended) */
  id: string;
  /** Tour title */
  title: string;
  /** Tour description/overview */
  description: string;
  /** Tour version (semantic versioning) */
  version: string;
  /** Target audience (e.g., "beginner", "New Users & AI Assistants") */
  audience?: string;
  /** Prerequisites or required knowledge */
  prerequisites?: string[];
  /** Cover image URL or path relative to repo root (e.g., 'assets/tour-cover.gif'). Displayed as overlay on File City during welcome screen. Supports static images (jpg, png, svg) and animated (gif, webp). */
  coverImage?: string;
  /** Ordered list of steps */
  steps: IntroductionTourStep[];
  /** Tour metadata */
  metadata?: TourMetadata;
}
