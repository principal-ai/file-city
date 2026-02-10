#!/usr/bin/env node

/**
 * File City Tour CLI
 *
 * Command-line tool for creating, validating, and managing introduction tours
 * for File City visualizations.
 */

import { Command } from 'commander';
import { createValidateCommand } from './commands/validate.js';
import { createInitCommand } from './commands/init.js';
import { createStatsCommand } from './commands/stats.js';

const program = new Command();

program
  .name('tour')
  .description('CLI tool for File City introduction tours')
  .version('0.1.0');

// Add commands
program.addCommand(createValidateCommand());
program.addCommand(createInitCommand());
program.addCommand(createStatsCommand());

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
