# File City Tour Examples

Complete, ready-to-use tour examples for different use cases.

## Minimal Tour

Perfect for quick starts and simple introductions:

```json
{
  "id": "quick-start",
  "title": "Quick Start Guide",
  "description": "Get started with the codebase in 5 minutes",
  "version": "1.0.0",
  "audience": "New Users & AI Assistants",
  "steps": [
    {
      "id": "step-1-welcome",
      "title": "Welcome!",
      "description": "This is a simple introduction to the project structure.",
      "estimatedTime": 30,
      "focusDirectory": "src",
      "colorMode": "fileTypes"
    }
  ]
}
```

## Onboarding Tour

Multi-step tour with highlights for new developers:

```json
{
  "id": "codebase-onboarding",
  "title": "Codebase Onboarding Tour",
  "description": "Learn the structure and key components of this codebase",
  "version": "1.0.0",
  "audience": "New Developers",
  "prerequisites": ["Basic understanding of the technology stack"],
  "steps": [
    {
      "id": "step-1-overview",
      "title": "Project Overview",
      "description": "Welcome to the codebase! This tour will guide you through the main areas.",
      "estimatedTime": 60,
      "colorMode": "fileTypes"
    },
    {
      "id": "step-2-core",
      "title": "Core Components",
      "description": "These are the main building blocks of the application.",
      "estimatedTime": 120,
      "focusDirectory": "src",
      "highlightLayers": [
        {
          "id": "core-layer",
          "name": "Core Files",
          "color": "#3b82f6",
          "items": [
            { "path": "src/index.ts", "type": "file" },
            { "path": "src/components", "type": "directory" }
          ],
          "opacity": 0.7,
          "borderWidth": 2
        }
      ],
      "colorMode": "fileTypes",
      "interactiveActions": [
        {
          "type": "click-file",
          "description": "Click on index.ts to see the entry point",
          "target": "src/index.ts"
        }
      ]
    },
    {
      "id": "step-3-configuration",
      "title": "Configuration",
      "description": "Configuration files that control the application behavior.",
      "estimatedTime": 60,
      "highlightFiles": ["package.json", "tsconfig.json"],
      "colorMode": "fileTypes",
      "resources": [
        {
          "title": "TypeScript Configuration",
          "url": "https://www.typescriptlang.org/tsconfig",
          "type": "documentation"
        }
      ]
    }
  ],
  "metadata": {
    "author": "Your Name",
    "createdAt": "2026-02-04",
    "tags": ["onboarding", "tutorial"]
  }
}
```

## Architecture Tour

Comprehensive tour showcasing layered architecture:

```json
{
  "id": "architecture-overview",
  "title": "Architecture Overview",
  "description": "Understand the architectural decisions and patterns in this codebase",
  "version": "1.0.0",
  "audience": "Engineers & Architects",
  "steps": [
    {
      "id": "step-1-layered-architecture",
      "title": "Layered Architecture",
      "description": "The application follows a layered architecture pattern with clear separation of concerns.",
      "estimatedTime": 120,
      "highlightLayers": [
        {
          "id": "presentation-layer",
          "name": "Presentation Layer",
          "color": "#10b981",
          "items": [
            { "path": "src/components", "type": "directory" },
            { "path": "src/pages", "type": "directory" }
          ],
          "opacity": 0.6,
          "renderStrategy": "border"
        },
        {
          "id": "business-layer",
          "name": "Business Logic",
          "color": "#f59e0b",
          "items": [
            { "path": "src/services", "type": "directory" },
            { "path": "src/utils", "type": "directory" }
          ],
          "opacity": 0.6,
          "renderStrategy": "border"
        },
        {
          "id": "data-layer",
          "name": "Data Layer",
          "color": "#ef4444",
          "items": [
            { "path": "src/models", "type": "directory" },
            { "path": "src/database", "type": "directory" }
          ],
          "opacity": 0.6,
          "renderStrategy": "border"
        }
      ],
      "colorMode": "fileTypes"
    },
    {
      "id": "step-2-data-flow",
      "title": "Data Flow",
      "description": "See how data flows from the UI through business logic to the database.",
      "estimatedTime": 180,
      "focusDirectory": "src",
      "resources": [
        {
          "title": "Design Patterns Documentation",
          "url": "https://refactoring.guru/design-patterns",
          "type": "documentation"
        }
      ],
      "colorMode": "fileTypes"
    }
  ],
  "metadata": {
    "author": "Architecture Team",
    "createdAt": "2026-02-04",
    "tags": ["architecture", "patterns", "advanced"]
  }
}
```

## Git-Focused Tour

Tour highlighting recent changes:

```json
{
  "id": "recent-changes",
  "title": "Recent Changes Tour",
  "description": "Explore the latest changes to the codebase",
  "version": "1.0.0",
  "steps": [
    {
      "id": "step-1-modified",
      "title": "Modified Files",
      "description": "These files have been recently modified.",
      "estimatedTime": 60,
      "colorMode": "git",
      "highlightFiles": ["src/App.tsx", "src/utils/helper.ts"]
    }
  ]
}
```
