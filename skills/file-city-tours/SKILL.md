---
name: file-city-tours
description: Create and validate introduction tours for File City visualizations. Use when users want to (1) create onboarding tours for codebases, (2) build guided walkthroughs highlighting architecture, (3) validate existing tour files, (4) fix tour validation errors, or (5) customize tours with highlights, interactive actions, and color modes.
license: MIT
---

# File City Tours

Create guided introduction tours that help users navigate and understand codebases using File City visualizations.

## Quick Start

### Using the CLI (Recommended)

Use `npx` to run `@principal-ai/file-city-cli@latest` without installing globally:

```bash
# Create a new tour from template
npx @principal-ai/file-city-cli@latest init --template onboarding

# Validate a tour file
npx @principal-ai/file-city-cli@latest validate my-tour.tour.json

# Available templates: minimal, onboarding, architecture
```

**Note**: Using `npx` ensures you always run the latest version without needing to install the CLI globally.

### Manual Creation

Use template files from `assets/` directory:
- `minimal-template.json` - Simple single-step tour
- `onboarding-template.json` - Multi-step with highlights
- `architecture-template.json` - Layered architecture showcase

## Tour Structure

Tours are JSON files ending with `.tour.json` placed in repository root.

**Important**: Only create **one tour per repository**. If multiple `.tour.json` files exist, only the first one alphabetically will be loaded.

### Minimal Structure

```json
{
  "id": "tour-id",                    // kebab-case
  "title": "Tour Title",
  "description": "What this covers",
  "version": "1.0.0",                 // semantic versioning
  "steps": [
    {
      "id": "step-1",                 // kebab-case
      "title": "Step Title",
      "description": "Detailed explanation",
      "focusDirectory": "src",        // optional
      "colorMode": "fileTypes"        // optional
    }
  ]
}
```

## Tour Content Strategy

### Focus on Concepts, Not Just Structure

**Tours should teach mental models, not just show directories.**

When creating tours, prioritize explaining:
- **What the code does** - Core functionality and purpose
- **How it works** - Architectural patterns and mechanisms (state management, reconciliation, etc.)
- **Why it's designed this way** - Design decisions and trade-offs
- **How components relate** - Relationships between different parts
- **Where to extend** - How developers can build on top of it

**Concrete descriptions beat abstract labels:**
- ❌ "Core packages with framework functionality"
- ✅ "LexicalEditor.ts manages the editor instance and wires everything together - updates, listeners, commands, and DOM reconciliation"

**Show implementation of concepts:**
- Connect architectural concepts to actual code files
- Use highlights to show which files implement which concepts
- Explain patterns like immutability, double-buffering, command dispatching

**Build understanding progressively:**
- Start with high-level concepts ("What is this?")
- Show the core engine/system ("How does it work?")
- Highlight key abstractions ("What are the building blocks?")
- Demonstrate extensibility ("How can I use/extend it?")
- Point to examples ("Where can I see it in action?")

### Key Features

**Focus & Zoom**
```json
"focusDirectory": "src/components",  // Zoom into specific directory
"focusDirectory": "",                // Repository root (entire codebase)
"focusDirectory": "src"              // Top-level directory
```

**Important**: Steps with `highlightLayers` **must** include `focusDirectory`. Use `""` (empty string) to focus on repository root.

**Highlight Layers**
```json
"highlightLayers": [{
  "id": "core-files",
  "name": "Core Components",
  "color": "#3b82f6",                // hex color
  "items": [
    { "path": "src/index.ts", "type": "file" },
    { "path": "src/components", "type": "directory" }
  ],
  "opacity": 0.7,
  "renderStrategy": "border"
}]
```

**Interactive Actions**
```json
"interactiveActions": [{
  "type": "click-file",              // or hover-directory, toggle-layer, explore
  "description": "Click to view",
  "target": "src/App.tsx"
}]
```

**Color Modes**
Available: `fileTypes` (default), `git`, `pr`, `commit`, `coverage`, `eslint`, `typescript`, `prettier`, `knip`, `alexandria`

## Tour Philosophy: Concepts Over Structure

**IMPORTANT**: Focus tours on **what the code does** and **core concepts**, not just file structure.

### Good Tour Practices ✅
- **Explain architectural concepts** - "This uses an immutable state model for reliable updates"
- **Show relationships between components** - "Editor manages EditorState, which contains the node tree"
- **Describe functionality** - "These nodes are immutable - getWritable() creates clones for editing"
- **Connect files to concepts** - "LexicalEditor.ts manages the editor instance and wires everything together"
- **Build understanding progressively** - Start with core concepts, then show how they're implemented

### What to Avoid ❌
- **Don't just list directories** - "The packages directory contains all modules" (too generic)
- **Don't focus only on structure** - "These are the source files" (doesn't explain what they do)
- **Avoid surface-level descriptions** - "Config files" without explaining their purpose
- **Don't skip the "why"** - Always explain why something exists, not just where it is

### Example Comparison

**Before (Structure-focused):**
```
"The packages directory contains the core functionality.
The lexical package has the main code, and lexical-react has React bindings."
```

**After (Concept-focused):**
```
"Lexical's core: LexicalEditor.ts manages the editor instance,
LexicalEditorState.ts holds immutable content snapshots.
Updates use double-buffering - clone state, mutate, reconcile to DOM."
```

## Common Patterns

### Concept-Driven Onboarding
1. **What is it?** - Explain the core purpose and architecture (e.g., "immutable state editor framework")
2. **Core Engine** - Show the main system files and how they work together (Editor, State, Updates, Reconciler)
3. **Key Abstractions** - Highlight the primary abstractions (Nodes, Commands, Transforms) and their relationships
4. **Extensibility** - Show the plugin/extension system and how features compose
5. **See It Working** - Point to examples/playground showing concepts in action
6. **Next Steps** - Resources and documentation, `focusDirectory: ""` for complete overview

### Architecture Tour
1. **Core Concepts** - Explain the fundamental architectural patterns (state management, reconciliation, etc.)
2. **Component Relationships** - Show how major components interact using multiple highlight layers
3. **Data Flow** - Explain how data moves through the system with visual highlights
4. **Extension Points** - Show where and how developers can extend functionality
5. **Patterns in Practice** - Link to examples demonstrating architectural patterns

### Feature Deep-Dive
1. **Feature Overview** - What does this feature do and why does it exist?
2. **Implementation** - Show the core files implementing the feature
3. **Integration Points** - How does it integrate with the rest of the system?
4. **Usage Examples** - Where is this feature used in practice?

### Recent Changes
Use `"colorMode": "git"` to highlight modified files, but **explain what changed and why**, not just "these files were modified"

## Validation

**Always validate before deploying:**
```bash
npx @principal-ai/file-city-cli@latest validate your-tour.tour.json
```

Common errors and fixes are in `references/troubleshooting.md`.

## Best Practices

### Content Guidelines
1. **Teach concepts, not just structure** - Explain what the code does and how it works, not just where files are
2. **Connect code to concepts** - Highlight files while explaining the concepts they implement
3. **Explain the "why"** - Include architectural reasoning and design decisions
4. **Show relationships** - Use highlight layers to show how components work together
5. **One concept per step** - Don't overwhelm, stay focused on a single idea

### Technical Guidelines
6. **One tour per repository** - Create only a single `.tour.json` file
7. **Target duration: 2 minutes ideal, 3 minutes max** - Keep tours concise and focused:
   - **4-6 steps** for 2-minute tours (ideal)
   - **6-8 steps maximum** for 3-minute tours
   - **20-30 seconds per step** - Include reading + viewing + interaction time
   - **200-250 characters per description** - Max 300 characters
   - **Total text: 800-1,500 chars** for 2 minutes, up to 2,000 chars for 3 minutes
8. **Use relative paths** - No leading `/` or `./`
9. **Test thoroughly** - Walk through the tour in File City and verify timing
10. **Hex colors only** - Format: `#RRGGBB` or `#RGB`
11. **Kebab-case IDs** - Lowercase, hyphens only
12. **Always set focusDirectory with highlightLayers** - Ensures camera focuses on highlighted area:
    - Use `""` for repository root (full codebase view)
    - Use `"src"` to focus on a specific top-level directory
    - Use `"src/components"` to zoom into nested areas
13. **Last step must focus on root** - Set `"focusDirectory": ""` on the final step for complete overview

## Path Rules

**Correct:**
- `src/components`
- `src/App.tsx`
- `package.json`

**Incorrect:**
- `/src/components` (leading slash)
- `./src/components` (dot-slash)
- `src\components` (backslash)

## References

- **Full specification**: `references/tour-format-spec.md` - Complete API reference
- **Examples**: `references/examples.md` - Ready-to-use tour templates
- **Troubleshooting**: `references/troubleshooting.md` - Common issues and solutions

## Workflow

1. **Create** - Use CLI or copy from `assets/` templates
2. **Customize** - Edit tour steps for your codebase
3. **Validate** - Run CLI validation
4. **Test** - Place in repo root, open in File City
5. **Iterate** - Refine based on user feedback

## Templates

Use as starting points (in `assets/` directory):
- **minimal-template.json** - Quick 1-step intro
- **onboarding-template.json** - 3-step developer onboarding
- **architecture-template.json** - Layered architecture showcase

Copy template, customize paths/content for your codebase, then validate.
