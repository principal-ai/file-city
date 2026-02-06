/**
 * Tour Validation Utilities
 *
 * Validates introduction tour JSON files according to the specification.
 * Adapted from industry-themed-file-city-panels/src/utils/tourParser.ts
 */

import type { IntroductionTour, IntroductionTourStep } from './types.js';

/**
 * Validation error for tour parsing
 */
export class TourValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'TourValidationError';
  }
}

/**
 * Result of tour parsing/validation
 */
export interface TourParseResult {
  success: boolean;
  tour?: IntroductionTour;
  errors?: TourValidationError[];
}

/**
 * Validates a color hex code
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validates a semantic version string
 */
function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Validates a relative path (no leading slash)
 */
function isValidRelativePath(path: string): boolean {
  return !path.startsWith('/');
}

/**
 * Validates a kebab-case identifier
 */
function isValidKebabCase(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id);
}

/**
 * Validates tour step
 */
function validateStep(step: IntroductionTourStep, index: number): TourValidationError[] {
  const errors: TourValidationError[] = [];

  // Required fields
  if (!step.id || typeof step.id !== 'string') {
    errors.push(new TourValidationError(`Step ${index}: Missing or invalid 'id'`, 'id', step.id));
  } else if (!isValidKebabCase(step.id)) {
    errors.push(
      new TourValidationError(
        `Step ${index}: 'id' must be kebab-case (lowercase, numbers, hyphens only)`,
        'id',
        step.id
      )
    );
  }

  if (!step.title || typeof step.title !== 'string') {
    errors.push(new TourValidationError(`Step ${index}: Missing or invalid 'title'`, 'title', step.title));
  }

  if (!step.description || typeof step.description !== 'string') {
    errors.push(
      new TourValidationError(`Step ${index}: Missing or invalid 'description'`, 'description', step.description)
    );
  }

  // Optional field validation
  if (step.estimatedTime !== undefined && (typeof step.estimatedTime !== 'number' || step.estimatedTime < 1)) {
    errors.push(
      new TourValidationError(
        `Step ${index}: 'estimatedTime' must be a positive number`,
        'estimatedTime',
        step.estimatedTime
      )
    );
  }

  if (step.focusDirectory !== undefined) {
    if (typeof step.focusDirectory !== 'string') {
      errors.push(
        new TourValidationError(
          `Step ${index}: 'focusDirectory' must be a string`,
          'focusDirectory',
          step.focusDirectory
        )
      );
    } else if (!isValidRelativePath(step.focusDirectory)) {
      errors.push(
        new TourValidationError(
          `Step ${index}: 'focusDirectory' must be a relative path (no leading slash)`,
          'focusDirectory',
          step.focusDirectory
        )
      );
    }
  }

  if (step.autoAdvance && step.autoAdvanceDelay !== undefined) {
    if (typeof step.autoAdvanceDelay !== 'number' || step.autoAdvanceDelay < 1000) {
      errors.push(
        new TourValidationError(
          `Step ${index}: 'autoAdvanceDelay' must be at least 1000ms when auto-advance is enabled`,
          'autoAdvanceDelay',
          step.autoAdvanceDelay
        )
      );
    }
  }

  // Validate that steps with highlight layers have focusDirectory
  if (step.highlightLayers && step.highlightLayers.length > 0 && step.focusDirectory === undefined) {
    errors.push(
      new TourValidationError(
        `Step ${index}: Steps with 'highlightLayers' must specify 'focusDirectory' to ensure the camera focuses on the highlighted area. Use "" (empty string) to focus on repository root, or specify a directory path like "src"`,
        'focusDirectory',
        undefined
      )
    );
  }

  // Validate highlight layers
  if (step.highlightLayers) {
    step.highlightLayers.forEach((layer, layerIndex) => {
      if (!layer.id || !isValidKebabCase(layer.id)) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Layer ${layerIndex}: Invalid layer 'id' (must be kebab-case)`,
            `highlightLayers[${layerIndex}].id`,
            layer.id
          )
        );
      }

      if (!layer.color || !isValidHexColor(layer.color)) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Layer ${layerIndex}: Invalid hex color`,
            `highlightLayers[${layerIndex}].color`,
            layer.color
          )
        );
      }

      if (layer.opacity !== undefined && (layer.opacity < 0 || layer.opacity > 1)) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Layer ${layerIndex}: 'opacity' must be between 0 and 1`,
            `highlightLayers[${layerIndex}].opacity`,
            layer.opacity
          )
        );
      }

      if (layer.borderWidth !== undefined && layer.borderWidth < 0) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Layer ${layerIndex}: 'borderWidth' must be positive`,
            `highlightLayers[${layerIndex}].borderWidth`,
            layer.borderWidth
          )
        );
      }

      if (!layer.items || layer.items.length === 0) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Layer ${layerIndex}: 'items' array must not be empty`,
            `highlightLayers[${layerIndex}].items`,
            layer.items
          )
        );
      } else {
        layer.items.forEach((item, itemIndex) => {
          if (!item.path || !isValidRelativePath(item.path)) {
            errors.push(
              new TourValidationError(
                `Step ${index}, Layer ${layerIndex}, Item ${itemIndex}: Invalid relative path`,
                `highlightLayers[${layerIndex}].items[${itemIndex}].path`,
                item.path
              )
            );
          }
          if (!item.type || (item.type !== 'file' && item.type !== 'directory')) {
            errors.push(
              new TourValidationError(
                `Step ${index}, Layer ${layerIndex}, Item ${itemIndex}: 'type' must be 'file' or 'directory'`,
                `highlightLayers[${layerIndex}].items[${itemIndex}].type`,
                item.type
              )
            );
          }
        });
      }
    });
  }

  // Validate highlight files
  if (step.highlightFiles) {
    step.highlightFiles.forEach((filePath, fileIndex) => {
      if (!isValidRelativePath(filePath)) {
        errors.push(
          new TourValidationError(
            `Step ${index}, highlightFiles[${fileIndex}]: Must be a relative path (no leading slash)`,
            `highlightFiles[${fileIndex}]`,
            filePath
          )
        );
      }
    });
  }

  // Validate interactive actions
  if (step.interactiveActions) {
    step.interactiveActions.forEach((action, actionIndex) => {
      const needsTarget = ['click-file', 'hover-directory', 'toggle-layer'].includes(action.type);
      if (needsTarget && !action.target) {
        errors.push(
          new TourValidationError(
            `Step ${index}, Action ${actionIndex}: '${action.type}' requires a 'target'`,
            `interactiveActions[${actionIndex}].target`,
            action.target
          )
        );
      }
    });
  }

  return errors;
}

/**
 * Validates a complete tour
 */
function validateTour(tour: IntroductionTour): TourValidationError[] {
  const errors: TourValidationError[] = [];

  // Validate required top-level fields
  if (!tour.id || typeof tour.id !== 'string') {
    errors.push(new TourValidationError("Missing or invalid 'id'", 'id', tour.id));
  } else if (!isValidKebabCase(tour.id)) {
    errors.push(
      new TourValidationError("Tour 'id' must be kebab-case (lowercase, numbers, hyphens only)", 'id', tour.id)
    );
  }

  if (!tour.title || typeof tour.title !== 'string') {
    errors.push(new TourValidationError("Missing or invalid 'title'", 'title', tour.title));
  }

  if (!tour.description || typeof tour.description !== 'string') {
    errors.push(new TourValidationError("Missing or invalid 'description'", 'description', tour.description));
  }

  if (!tour.version || !isValidVersion(tour.version)) {
    errors.push(
      new TourValidationError(
        "Invalid 'version' - must be semantic version (e.g., '1.0.0')",
        'version',
        tour.version
      )
    );
  }

  if (!tour.steps || !Array.isArray(tour.steps) || tour.steps.length === 0) {
    errors.push(new TourValidationError("'steps' array must contain at least one step", 'steps', tour.steps));
  } else {
    // Validate each step
    tour.steps.forEach((step, index) => {
      const stepErrors = validateStep(step, index);
      errors.push(...stepErrors);
    });

    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    tour.steps.forEach((step, index) => {
      if (stepIds.has(step.id)) {
        errors.push(new TourValidationError(`Duplicate step ID '${step.id}' at index ${index}`, 'steps', step.id));
      }
      stepIds.add(step.id);
    });

    // Validate that the last step focuses on repository root
    const lastStep = tour.steps[tour.steps.length - 1];
    if (lastStep.focusDirectory !== '') {
      errors.push(
        new TourValidationError(
          `The last step must set 'focusDirectory' to "" (empty string) to focus on repository root, providing a complete overview at tour end`,
          `steps[${tour.steps.length - 1}].focusDirectory`,
          lastStep.focusDirectory
        )
      );
    }
  }

  // Validate optional audience (any string is valid)
  if (tour.audience !== undefined && typeof tour.audience !== 'string') {
    errors.push(
      new TourValidationError(
        `Invalid 'audience' - must be a string`,
        'audience',
        tour.audience
      )
    );
  }

  return errors;
}

/**
 * Parses and validates a tour JSON string
 */
export function parseTour(jsonString: string): TourParseResult {
  try {
    const parsed = JSON.parse(jsonString);

    // Basic type check
    if (typeof parsed !== 'object' || parsed === null) {
      return {
        success: false,
        errors: [new TourValidationError('Tour JSON must be an object')],
      };
    }

    // Validate the tour structure
    const errors = validateTour(parsed as IntroductionTour);

    if (errors.length > 0) {
      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      tour: parsed as IntroductionTour,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        new TourValidationError(
          `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
        ),
      ],
    };
  }
}

/**
 * Parses tour JSON with a simplified API that throws on error
 */
export function parseTourOrThrow(jsonString: string): IntroductionTour {
  const result = parseTour(jsonString);

  if (!result.success || !result.tour) {
    const errorMessages = result.errors?.map((e) => e.message).join('\n') || 'Unknown error';
    throw new TourValidationError(`Tour validation failed:\n${errorMessages}`);
  }

  return result.tour;
}
