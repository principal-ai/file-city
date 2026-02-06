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

## Common Patterns

### Onboarding Flow
1. **Overview** - Full codebase view with `fileTypes` mode
2. **Core Areas** - Focus on key directories with highlights
3. **Configuration** - Highlight config files
4. **Next Steps** - Resources and documentation links, `focusDirectory: ""` to show full codebase

### Architecture Tour
1. **Layered View** - Use multiple highlight layers with different colors
2. **Data Flow** - Show connections between layers
3. **Patterns** - Link to design pattern documentation

### Recent Changes
Use `"colorMode": "git"` to highlight modified files

## Validation

**Always validate before deploying:**
```bash
npx @principal-ai/file-city-cli@latest validate your-tour.tour.json
```

Common errors and fixes are in `references/troubleshooting.md`.

## Best Practices

1. **Keep focused** - 5-10 steps ideal
2. **One concept per step** - Don't overwhelm
3. **Use relative paths** - No leading `/` or `./`
4. **Test thoroughly** - Walk through the tour in File City
5. **Hex colors only** - Format: `#RRGGBB` or `#RGB`
6. **Kebab-case IDs** - Lowercase, hyphens only
7. **Always set focusDirectory with highlightLayers** - Ensures camera focuses on highlighted area:
   - Use `""` for repository root (full codebase view)
   - Use `"src"` to focus on a specific top-level directory
   - Use `"src/components"` to zoom into nested areas
8. **Last step must focus on root** - Set `"focusDirectory": ""` on the final step for complete overview

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
