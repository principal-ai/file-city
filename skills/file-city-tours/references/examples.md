# File City Tour Examples

Complete, ready-to-use tour examples for different use cases.

## Tour Philosophy: Teach Concepts, Not Just Structure

**Good tours explain what code does and how it works. Bad tours just list directories.**

### Before (Structure-focused) ❌
```
"The packages directory contains all the framework modules.
There are many packages here for different features."
```
*Problem: Doesn't explain what the code does or how it works*

### After (Concept-focused) ✅
```
"Lexical's core: LexicalEditor.ts manages the editor instance,
LexicalEditorState.ts holds immutable content snapshots.
Updates use double-buffering - clone state, mutate, reconcile to DOM."
```
*Success: Explains architectural concepts and connects them to actual files*

### Key Principles
1. **Explain functionality** - What does this code do?
2. **Show architecture** - How does it work? (immutability, reconciliation, commands)
3. **Connect files to concepts** - Which files implement which patterns?
4. **Build understanding** - Progress from high-level concepts to implementation details
5. **Show relationships** - How do components work together?

All examples below follow this concept-focused approach.

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

## Concept-Focused Onboarding Tour

Tour that teaches core concepts and how the system works (recommended approach):

```json
{
  "id": "understanding-lexical",
  "title": "Understanding Lexical",
  "description": "Learn how Lexical's architecture works - from Editor & EditorState to Nodes, Commands, and Plugins",
  "version": "1.0.0",
  "audience": "New Developers",
  "prerequisites": ["Basic understanding of JavaScript and text editors"],
  "steps": [
    {
      "id": "what-is-lexical",
      "title": "What is Lexical?",
      "description": "Lexical is an extensible text editor framework with immutable state, reliability, and accessibility built-in. It uses an immutable EditorState containing a node tree (content) and selection. Updates use double-buffering: clone state, mutate, reconcile to DOM.",
      "estimatedTime": 30,
      "focusDirectory": "",
      "colorMode": "fileTypes"
    },
    {
      "id": "editor-and-state",
      "title": "Editor & EditorState Core",
      "description": "The heart of Lexical: LexicalEditor.ts manages the editor instance, LexicalEditorState.ts holds immutable content snapshots. LexicalUpdates.ts batches mutations, LexicalReconciler.ts syncs to DOM. This architecture enables time-travel, undo/redo, and reliable updates.",
      "estimatedTime": 30,
      "focusDirectory": "packages/lexical/src",
      "colorMode": "fileTypes",
      "highlightLayers": [
        {
          "id": "core-system",
          "name": "Core Editor System",
          "color": "#3b82f6",
          "items": [
            { "path": "packages/lexical/src/LexicalEditor.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalEditorState.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalUpdates.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalReconciler.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "interactiveActions": [
        {
          "type": "click-file",
          "description": "View the Editor implementation",
          "target": "packages/lexical/src/LexicalEditor.ts"
        }
      ]
    },
    {
      "id": "node-system",
      "title": "The Node System",
      "description": "Content is represented as LexicalNodes. Base types: TextNode (text content), ElementNode (containers like paragraphs), DecoratorNode (custom React components). All nodes are immutable - getWritable() creates clones. Extend these in packages like lexical-list and lexical-table.",
      "estimatedTime": 30,
      "focusDirectory": "packages/lexical/src",
      "colorMode": "fileTypes",
      "highlightLayers": [
        {
          "id": "base-nodes",
          "name": "Base Node Types",
          "color": "#10b981",
          "items": [
            { "path": "packages/lexical/src/LexicalNode.ts", "type": "file" },
            { "path": "packages/lexical/src/nodes", "type": "directory" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        },
        {
          "id": "extended-nodes",
          "name": "Extended Nodes",
          "color": "#f59e0b",
          "items": [
            { "path": "packages/lexical-list", "type": "directory" },
            { "path": "packages/lexical-table", "type": "directory" }
          ],
          "opacity": 0.7,
          "renderStrategy": "border"
        }
      ]
    },
    {
      "id": "react-plugins",
      "title": "React Plugins Ecosystem",
      "description": "lexical-react provides LexicalComposer (editor context) and plugins as React components. Plugins hook into editor lifecycle: HistoryPlugin (undo/redo), RichTextPlugin (formatting), ListPlugin (lists). Compose features declaratively.",
      "estimatedTime": 30,
      "focusDirectory": "",
      "colorMode": "fileTypes",
      "highlightLayers": [
        {
          "id": "composer-core",
          "name": "Composer Core",
          "color": "#ec4899",
          "items": [
            { "path": "packages/lexical-react/src/LexicalComposer.tsx", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ]
    }
  ],
  "metadata": {
    "author": "Your Team",
    "createdAt": "2026-02-10",
    "tags": ["onboarding", "concepts", "architecture"]
  }
}
```

## Structure-Focused Tour (Avoid This Approach)

This example shows what NOT to do - focusing only on directories without explaining concepts:

```json
{
  "id": "codebase-structure",
  "title": "Codebase Structure Tour",
  "description": "Learn the structure and organization of this codebase",
  "version": "1.0.0",
  "steps": [
    {
      "id": "overview",
      "title": "Project Overview",
      "description": "Welcome! This tour guides you through the main directories. We'll explore the folder structure and see where different files are located.",
      "focusDirectory": "",
      "colorMode": "fileTypes"
    },
    {
      "id": "packages-dir",
      "title": "Packages Directory",
      "description": "The packages directory contains all the framework modules. There are many packages here for different features.",
      "focusDirectory": "packages",
      "colorMode": "fileTypes"
    },
    {
      "id": "examples-dir",
      "title": "Examples Directory",
      "description": "The examples directory has sample code. You can look at these to see how to use the framework.",
      "focusDirectory": "examples",
      "colorMode": "fileTypes"
    }
  ]
}
```

**Why this is bad:**
- Doesn't explain what the code does or how it works
- Just points to directories without context
- No architectural concepts or patterns explained
- Doesn't build understanding of the system
- Users finish without learning the mental model

## Architecture Tour

Tour explaining core architectural patterns and how they're implemented:

```json
{
  "id": "lexical-architecture",
  "title": "Lexical's Architecture Deep Dive",
  "description": "Understand the architectural patterns that make Lexical reliable: immutable state, double-buffering updates, node reconciliation, and the command pattern",
  "version": "1.0.0",
  "audience": "Engineers & Architects",
  "coverImage": "docs/assets/architecture-hero.png",
  "steps": [
    {
      "id": "immutable-state-model",
      "title": "Immutable State Model",
      "description": "EditorState is immutable - it's never modified directly. Every update clones the state, applies changes, then replaces it atomically. This enables time-travel debugging, undo/redo, and prevents race conditions. LexicalEditorState.ts implements this.",
      "estimatedTime": 30,
      "focusDirectory": "packages/lexical/src",
      "coverImage": "docs/assets/immutable-state-diagram.png",
      "highlightLayers": [
        {
          "id": "state-management",
          "name": "State Management",
          "color": "#3b82f6",
          "items": [
            { "path": "packages/lexical/src/LexicalEditorState.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalNode.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "colorMode": "fileTypes",
      "interactiveActions": [
        {
          "type": "click-file",
          "description": "View immutable state implementation",
          "target": "packages/lexical/src/LexicalEditorState.ts"
        }
      ]
    },
    {
      "id": "double-buffering",
      "title": "Double-Buffering Updates",
      "description": "Updates work like double-buffering in graphics. LexicalUpdates.ts clones EditorState, batches all mutations, runs transforms, then LexicalReconciler.ts diffs and applies minimal DOM changes. This ensures consistency and performance.",
      "estimatedTime": 30,
      "focusDirectory": "packages/lexical/src",
      "coverImage": "docs/assets/update-flow.png",
      "highlightLayers": [
        {
          "id": "update-pipeline",
          "name": "Update Pipeline",
          "color": "#10b981",
          "items": [
            { "path": "packages/lexical/src/LexicalUpdates.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalReconciler.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalNormalization.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "colorMode": "fileTypes"
    },
    {
      "id": "command-pattern",
      "title": "Command Pattern for Extensibility",
      "description": "Commands enable decoupled communication. Plugins dispatch commands, handlers respond by priority until one stops propagation. LexicalCommands.ts defines the pattern. This allows plugins to extend behavior without tight coupling.",
      "estimatedTime": 30,
      "focusDirectory": "packages/lexical/src",
      "highlightLayers": [
        {
          "id": "command-system",
          "name": "Command System",
          "color": "#f59e0b",
          "items": [
            { "path": "packages/lexical/src/LexicalCommands.ts", "type": "file" },
            { "path": "packages/lexical/src/LexicalEditor.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "colorMode": "fileTypes",
      "resources": [
        {
          "title": "Command Pattern Explained",
          "url": "https://refactoring.guru/design-patterns/command",
          "type": "documentation"
        }
      ]
    },
    {
      "id": "plugin-composition",
      "title": "Plugin Composition",
      "description": "lexical-react turns architectural concepts into composable React components. LexicalComposer provides editor context, plugins hook into lifecycle. Each plugin is independent but composed together: HistoryPlugin, RichTextPlugin, ListPlugin, etc.",
      "estimatedTime": 30,
      "focusDirectory": "",
      "highlightLayers": [
        {
          "id": "react-architecture",
          "name": "React Architecture",
          "color": "#ec4899",
          "items": [
            { "path": "packages/lexical-react/src/LexicalComposer.tsx", "type": "file" },
            { "path": "packages/lexical-react/src/LexicalHistoryPlugin.ts", "type": "file" },
            { "path": "packages/lexical-react/src/LexicalRichTextPlugin.tsx", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "colorMode": "fileTypes"
    }
  ],
  "metadata": {
    "author": "Architecture Team",
    "createdAt": "2026-02-10",
    "tags": ["architecture", "patterns", "deep-dive"]
  }
}
```

## Git-Focused Tour (Explain What Changed)

Tour explaining recent architectural changes, not just listing files:

```json
{
  "id": "state-management-refactor",
  "title": "State Management Refactor Tour",
  "description": "We refactored to use immutable state for better reliability. This tour explains the new architecture and which components changed.",
  "version": "1.0.0",
  "steps": [
    {
      "id": "new-state-model",
      "title": "New Immutable State Model",
      "description": "Refactored EditorState to be immutable. Now updates clone the state, apply changes, then replace atomically. This prevents race conditions and enables time-travel debugging. Changed files: EditorState.ts, Editor.ts, Updates.ts.",
      "estimatedTime": 30,
      "colorMode": "git",
      "focusDirectory": "src/core",
      "highlightLayers": [
        {
          "id": "refactored-core",
          "name": "Refactored Core",
          "color": "#3b82f6",
          "items": [
            { "path": "src/core/EditorState.ts", "type": "file" },
            { "path": "src/core/Editor.ts", "type": "file" },
            { "path": "src/core/Updates.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ]
    },
    {
      "id": "plugin-updates",
      "title": "Plugin Updates",
      "description": "Updated plugins to work with immutable state. HistoryPlugin now uses state snapshots for undo/redo. ListPlugin clones nodes before mutations. Migration guide: use getWritable() to modify nodes.",
      "estimatedTime": 30,
      "colorMode": "git",
      "focusDirectory": "src/plugins",
      "highlightLayers": [
        {
          "id": "updated-plugins",
          "name": "Updated Plugins",
          "color": "#10b981",
          "items": [
            { "path": "src/plugins/HistoryPlugin.ts", "type": "file" },
            { "path": "src/plugins/ListPlugin.ts", "type": "file" }
          ],
          "opacity": 0.8,
          "renderStrategy": "border"
        }
      ],
      "resources": [
        {
          "title": "Migration Guide",
          "url": "https://docs.example.com/migration-immutable-state",
          "type": "documentation"
        }
      ]
    }
  ]
}
```

**Why this is better:**
- Explains WHAT changed architecturally (immutable state model)
- Explains WHY it changed (prevent race conditions, enable time-travel)
- Shows HOW to adapt (use getWritable() pattern)
- Connects changes to concepts, not just file names
