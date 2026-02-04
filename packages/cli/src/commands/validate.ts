/**
 * Validate command - validates tour JSON files
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { resolve, basename } from 'path';
import { parseTour } from '@principal-ai/file-city-builder';
import { formatValidationErrors, formatSuccess, formatJson, print, printError } from '../utils/output.js';

interface ValidateOptions {
  json?: boolean;
  strict?: boolean;
}

async function validateTourFile(filePath: string, options: ValidateOptions): Promise<void> {
  try {
    // Read the file
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    const fileName = basename(absolutePath);

    // Parse and validate
    const result = parseTour(content);

    if (options.json) {
      // JSON output for CI/CD
      print(
        formatJson({
          file: fileName,
          valid: result.success,
          errors: result.errors?.map((e) => ({
            message: e.message,
            field: e.field,
            value: e.value,
          })),
          tour: result.tour
            ? {
                id: result.tour.id,
                title: result.tour.title,
                version: result.tour.version,
                stepCount: result.tour.steps.length,
              }
            : undefined,
        })
      );
    } else {
      // Human-readable output
      if (result.success && result.tour) {
        print(formatSuccess(`Tour "${fileName}" is valid!`));
        print(`  Tour ID: ${result.tour.id}`);
        print(`  Title: ${result.tour.title}`);
        print(`  Version: ${result.tour.version}`);
        print(`  Steps: ${result.tour.steps.length}`);
        if (result.tour.audience) {
          print(`  Audience: ${result.tour.audience}`);
        }
      } else if (result.errors) {
        printError(formatValidationErrors(result.errors));
        process.exit(1);
      }
    }
  } catch (error) {
    if (options.json) {
      print(
        formatJson({
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    } else {
      printError(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
    process.exit(1);
  }
}

export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate a tour JSON file')
    .argument('<file>', 'Path to the tour file (*.tour.json)')
    .option('-j, --json', 'Output results as JSON')
    .option('-s, --strict', 'Enable strict validation (includes file system checks)')
    .action(async (file: string, options: ValidateOptions) => {
      await validateTourFile(file, options);
    });

  return command;
}
