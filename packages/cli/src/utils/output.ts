/**
 * Output formatting utilities for CLI
 */

import chalk from 'chalk';
import type { TourValidationError } from '@principal-ai/file-city-builder';

/**
 * Format validation errors for human-readable output
 */
export function formatValidationErrors(errors: TourValidationError[]): string {
  const lines: string[] = [];

  lines.push(chalk.red.bold(`\n✗ Validation failed with ${errors.length} error(s):\n`));

  errors.forEach((error, index) => {
    lines.push(chalk.red(`  ${index + 1}. ${error.message}`));
    if (error.field) {
      lines.push(chalk.gray(`     Field: ${error.field}`));
    }
    if (error.value !== undefined) {
      lines.push(chalk.gray(`     Value: ${JSON.stringify(error.value)}`));
    }
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green.bold(`\n✓ ${message}\n`);
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return chalk.blue(`ℹ ${message}`);
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow(`⚠ ${message}`);
}

/**
 * Format section header
 */
export function formatHeader(text: string): string {
  return chalk.bold.cyan(`\n${text}\n${'='.repeat(text.length)}\n`);
}

/**
 * Format JSON output
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Print to console with color
 */
export function print(message: string): void {
  console.log(message);
}

/**
 * Print error to stderr
 */
export function printError(message: string): void {
  console.error(message);
}
