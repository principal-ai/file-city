# File City Tour Examples

Complete, ready-to-use tour examples for different use cases.

## Cover Images

Tours support optional cover images that display as overlays on the File City visualization:
- **Tour-level**: `coverImage` on the root displays during the welcome screen
- **Step-level**: `coverImage` on steps displays during that specific step
- **Paths**: Use relative paths from repository root (e.g., `docs/assets/diagram.png`)
- **Formats**: Supports static (jpg, png, svg) and animated (gif, webp) images

**Best Practices**:
- Keep descriptions 200-300 characters for readability
- Use cover images to show architecture diagrams, data flows, or visual guides
- Place images in a dedicated assets directory (e.g., `docs/assets/`)
- Name images descriptively (e.g., `layered-architecture.png` not `image1.png`)

## Minimal Tour

Perfect for quick starts and simple introductions:

```json
{
  "id": "quick-start",
  "title": "Quick Start Guide",
  "description": "Get started with the codebase in 5 minutes. Learn the basic structure and key directories to begin contributing effectively.",
  "version": "1.0.0",
  "audience": "New Users & AI Assistants",
  "steps": [
    {
      "id": "step-1-welcome",
      "title": "Welcome!",
      "description": "Welcome to the project! The src directory contains all source code. Explore the file structure to understand how components are organized.",
      "estimatedTime": 30,
      "focusDirectory": "src",
      "colorMode": "fileTypes"
    }
  ]
}
```

## Onboarding Tour

Multi-step tour with highlights and cover images for new developers:

```json
{
  "id": "codebase-onboarding",
  "title": "Codebase Onboarding Tour",
  "description": "Learn the structure and key components of this codebase. This interactive tour highlights important files and explains architectural decisions.",
  "version": "1.0.0",
  "audience": "New Developers",
  "prerequisites": ["Basic understanding of the technology stack"],
  "coverImage": "docs/assets/welcome-cover.png",
  "steps": [
    {
      "id": "step-1-overview",
      "title": "Project Overview",
      "description": "Welcome! This tour guides you through the main areas. We'll explore the codebase structure, key directories, and how different parts work together to deliver functionality.",
      "estimatedTime": 60,
      "coverImage": "docs/assets/overview-diagram.png",
      "colorMode": "fileTypes"
    },
    {
      "id": "step-2-core",
      "title": "Core Components",
      "description": "These highlighted files are the main building blocks. The index.ts entry point and components directory form the foundation of the application architecture.",
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
      "description": "Configuration files control application behavior. Package.json manages dependencies while tsconfig.json configures TypeScript compilation and type checking.",
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

Comprehensive tour showcasing layered architecture with visual diagrams:

```json
{
  "id": "architecture-overview",
  "title": "Architecture Overview",
  "description": "Understand the architectural decisions and patterns in this codebase. Explore how layers interact and why we chose this structure for maintainability.",
  "version": "1.0.0",
  "audience": "Engineers & Architects",
  "coverImage": "docs/assets/architecture-hero.png",
  "steps": [
    {
      "id": "step-1-layered-architecture",
      "title": "Layered Architecture",
      "description": "Our layered architecture enforces separation of concerns. Presentation handles UI, business manages logic, and data controls persistence. Each layer has clear responsibilities.",
      "estimatedTime": 120,
      "coverImage": "docs/assets/layered-diagram.png",
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
      "description": "Data flows from UI through business logic to database. User actions trigger service calls, which process data and update models. This ensures consistency and testability.",
      "estimatedTime": 180,
      "coverImage": "docs/assets/data-flow.png",
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
  "description": "Explore the latest changes to the codebase. See what's been modified, added, or removed in recent commits to understand current development focus.",
  "version": "1.0.0",
  "steps": [
    {
      "id": "step-1-modified",
      "title": "Modified Files",
      "description": "These files were recently modified. Review changes in App.tsx and helper.ts to understand the latest improvements and bug fixes applied to the codebase.",
      "estimatedTime": 60,
      "colorMode": "git",
      "highlightFiles": ["src/App.tsx", "src/utils/helper.ts"]
    }
  ]
}
```
