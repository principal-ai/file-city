/**
 * Init command - creates a new tour file with template
 */

import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { IntroductionTour } from '@principal-ai/file-city-builder';
import { formatSuccess, formatInfo, print, printError } from '../utils/output.js';

interface InitOptions {
  template?: 'minimal' | 'onboarding' | 'architecture';
  output?: string;
}

function getMinimalTemplate(): IntroductionTour {
  return {
    id: 'quick-start',
    title: 'Quick Start Guide',
    description: 'Get started with the codebase in 5 minutes',
    version: '1.0.0',
    audience: 'New Users & AI Assistants',
    steps: [
      {
        id: 'step-1-welcome',
        title: 'Welcome!',
        description: 'This is a simple introduction to the project structure.',
        estimatedTime: 30,
        focusDirectory: 'src',
        colorMode: 'fileTypes',
      },
    ],
  };
}

function getOnboardingTemplate(): IntroductionTour {
  return {
    id: 'codebase-onboarding',
    title: 'Codebase Onboarding Tour',
    description: 'Learn the structure and key components of this codebase',
    version: '1.0.0',
    audience: 'New Developers',
    prerequisites: ['Basic understanding of the technology stack'],
    steps: [
      {
        id: 'step-1-overview',
        title: 'Project Overview',
        description: 'Welcome to the codebase! This tour will guide you through the main areas.',
        estimatedTime: 60,
        colorMode: 'fileTypes',
      },
      {
        id: 'step-2-core',
        title: 'Core Components',
        description: 'These are the main building blocks of the application.',
        estimatedTime: 120,
        focusDirectory: 'src',
        highlightLayers: [
          {
            id: 'core-layer',
            name: 'Core Files',
            color: '#3b82f6',
            items: [
              { path: 'src/index.ts', type: 'file' },
              { path: 'src/components', type: 'directory' },
            ],
            opacity: 0.7,
            borderWidth: 2,
          },
        ],
        colorMode: 'fileTypes',
      },
      {
        id: 'step-3-configuration',
        title: 'Configuration',
        description: 'Configuration files that control the application behavior.',
        estimatedTime: 60,
        highlightFiles: ['package.json', 'tsconfig.json'],
        colorMode: 'fileTypes',
      },
    ],
    metadata: {
      author: 'Your Name',
      createdAt: new Date().toISOString(),
      tags: ['onboarding', 'tutorial'],
    },
  };
}

function getArchitectureTemplate(): IntroductionTour {
  return {
    id: 'architecture-overview',
    title: 'Architecture Overview',
    description: 'Understand the architectural decisions and patterns in this codebase',
    version: '1.0.0',
    audience: 'Engineers & Architects',
    steps: [
      {
        id: 'step-1-layered-architecture',
        title: 'Layered Architecture',
        description: 'The application follows a layered architecture pattern.',
        estimatedTime: 120,
        highlightLayers: [
          {
            id: 'presentation-layer',
            name: 'Presentation Layer',
            color: '#10b981',
            items: [{ path: 'src/components', type: 'directory' }],
            opacity: 0.6,
          },
          {
            id: 'business-layer',
            name: 'Business Logic',
            color: '#f59e0b',
            items: [{ path: 'src/services', type: 'directory' }],
            opacity: 0.6,
          },
          {
            id: 'data-layer',
            name: 'Data Layer',
            color: '#ef4444',
            items: [{ path: 'src/models', type: 'directory' }],
            opacity: 0.6,
          },
        ],
        colorMode: 'fileTypes',
      },
      {
        id: 'step-2-patterns',
        title: 'Design Patterns',
        description: 'Key design patterns used throughout the codebase.',
        estimatedTime: 180,
        resources: [
          {
            title: 'Design Patterns Documentation',
            url: 'https://refactoring.guru/design-patterns',
            type: 'documentation',
          },
        ],
        colorMode: 'fileTypes',
      },
    ],
    metadata: {
      author: 'Architecture Team',
      createdAt: new Date().toISOString(),
      tags: ['architecture', 'patterns', 'advanced'],
    },
  };
}

function getTemplate(templateType: string): IntroductionTour {
  switch (templateType) {
    case 'onboarding':
      return getOnboardingTemplate();
    case 'architecture':
      return getArchitectureTemplate();
    case 'minimal':
    default:
      return getMinimalTemplate();
  }
}

async function initTour(options: InitOptions): Promise<void> {
  try {
    const template = options.template || 'minimal';
    const tour = getTemplate(template);

    // Determine output filename
    const outputFile = options.output || `${tour.id}.tour.json`;
    const absolutePath = resolve(outputFile);

    // Write the tour file
    const content = JSON.stringify(tour, null, 2);
    await writeFile(absolutePath, content, 'utf-8');

    print(formatSuccess(`Tour file created: ${outputFile}`));
    print(formatInfo(`Template: ${template}`));
    print(formatInfo(`Tour ID: ${tour.id}`));
    print(formatInfo(`Steps: ${tour.steps.length}`));
    print('\nNext steps:');
    print('  1. Edit the tour file to customize it for your codebase');
    print('  2. Validate the tour: tour validate ' + outputFile);
    print('  3. Place the tour file in your repository root\n');
  } catch (error) {
    printError(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.exit(1);
  }
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new tour file from a template')
    .option('-t, --template <type>', 'Template type (minimal, onboarding, architecture)', 'minimal')
    .option('-o, --output <file>', 'Output filename')
    .action(async (options: InitOptions) => {
      await initTour(options);
    });

  return command;
}
