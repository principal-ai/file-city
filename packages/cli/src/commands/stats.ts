/**
 * Stats command - displays tour statistics and timing analysis
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { resolve, basename } from 'path';
import { parseTour } from '@principal-ai/file-city-builder';
import type { IntroductionTour } from '@principal-ai/file-city-builder';
import { formatJson, print, printError } from '../utils/output.js';
import chalk from 'chalk';

interface StatsOptions {
  json?: boolean;
}

interface StepStats {
  id: string;
  title: string;
  estimatedTime?: number;
  characterCount: number;
  hasTime: boolean;
}

interface TourStats {
  stepCount: number;
  totalTime: number;
  hasAllTimes: boolean;
  totalCharacters: number;
  steps: StepStats[];
  recommendations: string[];
}

/**
 * Estimate time for a step based on character count
 * Based on guideline: 200-250 chars should take ~20-30 seconds
 * Formula: ~10 chars per second reading + viewing + interaction
 */
function estimateStepTime(charCount: number): number {
  // Rough estimate: 10 chars per second includes reading + interaction + viewing
  const estimatedSeconds = charCount / 10;
  // Round to nearest 5 seconds for cleaner display
  return Math.round(estimatedSeconds / 5) * 5;
}

/**
 * Analyze tour and generate statistics
 */
function analyzeTour(tour: IntroductionTour): TourStats {
  const steps: StepStats[] = tour.steps.map((step) => {
    const charCount = step.description.length;
    const hasTime = step.estimatedTime !== undefined;
    const estimatedTime = hasTime ? step.estimatedTime : estimateStepTime(charCount);

    return {
      id: step.id,
      title: step.title,
      estimatedTime,
      characterCount: charCount,
      hasTime,
    };
  });

  const totalCharacters = steps.reduce((sum, step) => sum + step.characterCount, 0);
  const totalTime = steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
  const hasAllTimes = steps.every((step) => step.hasTime);
  const stepCount = steps.length;

  // Generate recommendations
  const recommendations: string[] = [];

  // Check for steps exceeding character limit
  const longSteps = steps.filter((step) => step.characterCount > 300);
  longSteps.forEach((step) => {
    const excess = step.characterCount - 300;
    recommendations.push(`Reduce "${step.title}" by ${excess} character${excess > 1 ? 's' : ''}`);
  });

  // Check step count
  if (stepCount > 8) {
    recommendations.push(`Reduce step count from ${stepCount} to 6-8 steps (consolidate related concepts)`);
  } else if (stepCount > 6) {
    recommendations.push(`Consider reducing from ${stepCount} to 4-6 steps for ideal 2-minute duration`);
  }

  // Check total duration
  if (totalTime > 180) {
    const excess = Math.round((totalTime - 180) / 60);
    recommendations.push(`Reduce total duration by ~${excess}m to meet 3-minute maximum`);
  } else if (totalTime > 120) {
    const excess = Math.round((totalTime - 120) / 60);
    recommendations.push(`Consider reducing duration by ~${excess}m to meet 2-minute ideal`);
  }

  // Check total characters
  if (totalCharacters > 2000) {
    const excess = totalCharacters - 2000;
    recommendations.push(`Reduce total text by ${excess} characters to meet 2,000 char limit`);
  } else if (totalCharacters > 1500) {
    const excess = totalCharacters - 1500;
    recommendations.push(`Consider reducing text by ${excess} characters to meet ideal range`);
  }

  // Suggest adding estimatedTime if missing
  if (!hasAllTimes) {
    recommendations.push('Add `estimatedTime` field to all steps for accurate tracking');
  }

  return {
    stepCount,
    totalTime,
    hasAllTimes,
    totalCharacters,
    steps,
    recommendations,
  };
}

/**
 * Format time in minutes and seconds
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Get status indicator based on thresholds
 */
function getStatusIndicator(
  value: number,
  idealMax: number,
  acceptableMax: number
): { symbol: string; status: 'ideal' | 'acceptable' | 'over' } {
  if (value <= idealMax) {
    return { symbol: chalk.green('✓'), status: 'ideal' };
  } else if (value <= acceptableMax) {
    return { symbol: chalk.yellow('⚠'), status: 'acceptable' };
  } else {
    return { symbol: chalk.red('✗'), status: 'over' };
  }
}

/**
 * Format human-readable output
 */
function formatStatsOutput(tour: IntroductionTour, stats: TourStats): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan(`Tour Statistics: "${tour.title}"`));
  lines.push(chalk.cyan('━'.repeat(60)));
  lines.push('');

  // Overview
  lines.push(chalk.bold('Steps:              ') + `${stats.stepCount} step${stats.stepCount !== 1 ? 's' : ''}`);

  const timeStr = stats.hasAllTimes
    ? formatTime(stats.totalTime)
    : `${formatTime(stats.totalTime)} (estimated)`;
  lines.push(chalk.bold('Total duration:     ') + timeStr);
  lines.push(chalk.bold('Total description:  ') + `${stats.totalCharacters} characters`);
  lines.push('');

  // Guidelines comparison
  lines.push(chalk.bold('Target Guidelines:'));

  // Steps check (ideal: 4-6, acceptable: 6-8, over: >8)
  const stepsStatus = getStatusIndicator(stats.stepCount, 6, 8);
  const stepsRange = stats.stepCount <= 6 ? '4-6 ideal range' : '6-8 acceptable range';
  lines.push(`  ${stepsStatus.symbol} Steps: ${stats.stepCount} (${
    stepsStatus.status === 'over'
      ? `exceeds 8 step maximum`
      : stepsStatus.status === 'acceptable'
      ? `within ${stepsRange}, exceeds 4-6 ideal`
      : `within ${stepsRange}`
  })`);

  // Duration check (ideal: ≤120s, acceptable: ≤180s, over: >180s)
  const durationStatus = getStatusIndicator(stats.totalTime, 120, 180);
  lines.push(`  ${durationStatus.symbol} Duration: ${formatTime(stats.totalTime)} (${
    durationStatus.status === 'over'
      ? 'exceeds 3min max'
      : durationStatus.status === 'acceptable'
      ? 'exceeds 2min ideal, within 3min max'
      : 'within 2min ideal'
  })`);

  // Characters check (ideal: 800-1500, acceptable: 1500-2000, over: >2000)
  const charsStatus = getStatusIndicator(stats.totalCharacters, 1500, 2000);
  lines.push(`  ${charsStatus.symbol} Characters: ${stats.totalCharacters} (${
    charsStatus.status === 'over'
      ? 'exceeds 2,000 char limit'
      : charsStatus.status === 'acceptable'
      ? 'exceeds 1,500 ideal, within 2,000 max'
      : stats.totalCharacters >= 800
      ? 'within 800-1,500 ideal range'
      : 'below 800 char minimum'
  })`);
  lines.push('');

  // Per-step breakdown
  lines.push(chalk.bold('Per-Step Breakdown:'));
  stats.steps.forEach((step, index) => {
    const estimatedTime = step.estimatedTime ?? 0;
    const timeStr = step.hasTime ? formatTime(estimatedTime) : formatTime(estimatedTime) + ' est';
    const charStatus = step.characterCount > 300
      ? chalk.red('✗ Exceeds 300 char limit')
      : step.characterCount >= 280
      ? chalk.yellow('⚠ Approaching limit')
      : chalk.green('✓');

    lines.push(`  ${(index + 1).toString().padStart(2)}. ${step.title.padEnd(30)} (${timeStr.padEnd(7)}, ${step.characterCount} chars) ${charStatus}`);
  });
  lines.push('');

  // Missing estimatedTime warning
  if (!stats.hasAllTimes) {
    lines.push(chalk.yellow('⚠ Missing `estimatedTime` field on some steps (values estimated)'));
    lines.push('');
  }

  // Recommendations
  if (stats.recommendations.length > 0) {
    lines.push(chalk.bold('Recommendations:'));
    stats.recommendations.forEach((rec) => {
      lines.push(`  • ${rec}`);
    });
    lines.push('');
  } else {
    lines.push(chalk.green.bold('✓ Tour meets all guidelines!'));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Analyze tour file and display statistics
 */
async function analyzeTourFile(filePath: string, options: StatsOptions): Promise<void> {
  try {
    // Read and parse the file
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    const fileName = basename(absolutePath);

    const result = parseTour(content);

    if (!result.success || !result.tour) {
      printError('\nError: Cannot analyze tour - validation failed. Run validate command first.\n');
      process.exit(1);
    }

    const stats = analyzeTour(result.tour);

    if (options.json) {
      // JSON output for CI/CD
      print(
        formatJson({
          file: fileName,
          tour: {
            id: result.tour.id,
            title: result.tour.title,
            version: result.tour.version,
          },
          stats: {
            stepCount: stats.stepCount,
            totalTime: stats.totalTime,
            totalCharacters: stats.totalCharacters,
            hasAllTimes: stats.hasAllTimes,
            steps: stats.steps,
            recommendations: stats.recommendations,
          },
          meetsGuidelines: stats.recommendations.length === 0,
        })
      );
    } else {
      // Human-readable output
      print(formatStatsOutput(result.tour, stats));
    }
  } catch (error) {
    if (options.json) {
      print(
        formatJson({
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    } else {
      printError(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
    process.exit(1);
  }
}

export function createStatsCommand(): Command {
  const command = new Command('stats');

  command
    .description('Display tour statistics and timing analysis')
    .argument('<file>', 'Path to the tour file (*.tour.json)')
    .option('-j, --json', 'Output results as JSON')
    .action(async (file: string, options: StatsOptions) => {
      await analyzeTourFile(file, options);
    });

  return command;
}
