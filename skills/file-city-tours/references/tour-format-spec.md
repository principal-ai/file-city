# Introduction Tour Format Specification

This document defines the JSON format for creating guided tours through codebases using the File City visualization.

## Overview

Introduction tours are JSON files that guide users through a codebase step-by-step, highlighting key areas, explaining architecture, and providing interactive learning experiences.

## File Format

Tours are defined as JSON files that match the `IntroductionTour` interface.

### Basic Structure

```json
{
  "id": "unique-tour-id",
  "title": "Tour Title",
  "description": "Overview of what this tour covers",
  "version": "1.0.0",
  "audience": "beginner",
  "prerequisites": ["Required knowledge"],
  "steps": [/* Array of tour steps */],
  "metadata": {/* Optional metadata */}
}
```

## Top-Level Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier for the tour (kebab-case recommended) |
| `title` | `string` | Human-readable tour title |
| `description` | `string` | Brief overview of what the tour covers |
| `version` | `string` | Semantic version (e.g., "1.0.0") |
| `steps` | `IntroductionTourStep[]` | Array of tour steps (at least 1 required) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `audience` | `string` | Target audience (e.g., "beginner", "New Users & AI Assistants") |
| `prerequisites` | `string[]` | List of required knowledge or setup |
| `metadata` | `object` | Additional tour metadata |

### Metadata Object

```json
{
  "metadata": {
    "author": "Author Name",
    "createdAt": "2026-02-03",
    "updatedAt": "2026-02-03",
    "tags": ["onboarding", "architecture", "tutorial"]
  }
}
```

## Tour Steps

Each step represents one stage of the guided tour.

### Required Step Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique step identifier (e.g., "step-1-overview") |
| `title` | `string` | Step title shown to user |
| `description` | `string` | Detailed explanation of this step |

### Optional Step Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `estimatedTime` | `number` | Estimated time in seconds | - |
| `focusDirectory` | `string` | Directory path to zoom/focus on | - |
| `colorMode` | `ColorMode` | Visualization mode to use | `"fileTypes"` |
| `highlightLayers` | `HighlightLayerConfig[]` | Custom highlight layers | `[]` |
| `highlightFiles` | `string[]` | Specific files to highlight | `[]` |
| `interactiveActions` | `InteractiveAction[]` | User actions to try | `[]` |
| `resources` | `TourResource[]` | Related links/docs | `[]` |
| `autoAdvance` | `boolean` | Auto-advance to next step | `false` |
| `autoAdvanceDelay` | `number` | Delay before auto-advance (ms) | `3000` |

### Color Modes

Available values for `colorMode`:
- `"fileTypes"` - Color by file extension
- `"git"` - Show git status (modified, staged, untracked)
- `"pr"` - Show pull request changes
- `"commit"` - Show commit changes
- `"coverage"` - Test coverage visualization
- `"eslint"` - ESLint quality
- `"typescript"` - TypeScript quality
- `"prettier"` - Code formatting quality
- `"knip"` - Dead code detection
- `"alexandria"` - Documentation coverage

## Highlight Layers

Highlight layers draw attention to specific files or directories with colored overlays.

```json
{
  "id": "layer-id",
  "name": "Layer Name",
  "color": "#3b82f6",
  "items": [
    { "path": "src/components", "type": "directory" },
    { "path": "src/index.ts", "type": "file" }
  ],
  "opacity": 0.7,
  "borderWidth": 3,
  "renderStrategy": "border"
}
```

### HighlightLayerConfig Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `id` | `string` | Layer identifier | **required** |
| `name` | `string` | Display name | **required** |
| `color` | `string` | Hex color code | **required** |
| `items` | `Array<{path, type}>` | Files/dirs to highlight | **required** |
| `opacity` | `number` | Opacity (0-1) | `1.0` |
| `borderWidth` | `number` | Border width in pixels | `2` |
| `renderStrategy` | `"fill" \| "border"` | How to render | `"fill"` |

### Item Types

Each item in the `items` array must specify:
- `path` - Relative path from repository root
- `type` - Either `"file"` or `"directory"`

## Interactive Actions

Interactive actions suggest tasks for the user to perform.

```json
{
  "type": "click-file",
  "description": "Click on App.tsx to see the main component",
  "target": "src/App.tsx",
  "required": false
}
```

### InteractiveAction Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `type` | `ActionType` | Type of action | **required** |
| `description` | `string` | Action description | **required** |
| `target` | `string` | Target path/identifier | - |
| `required` | `boolean` | Must complete to proceed | `false` |

### Action Types

- `"click-file"` - Click on a specific file
- `"hover-directory"` - Hover over a directory
- `"toggle-layer"` - Toggle a highlight layer
- `"explore"` - Free exploration

## Resources

Resources provide links to additional documentation or context.

```json
{
  "title": "Component Documentation",
  "url": "https://docs.example.com/components",
  "type": "documentation"
}
```

### TourResource Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Resource title |
| `url` | `string` | URL or file path |
| `type` | `"documentation" \| "video" \| "article" \| "code"` | Resource type |

## Validation Rules

### Tour-Level Validation

1. ✅ `id` must be unique within the codebase
2. ✅ `version` must follow semantic versioning (X.Y.Z)
3. ✅ `steps` array must contain at least 1 step
4. ✅ All step IDs must be unique within the tour

### Step-Level Validation

1. ✅ `estimatedTime` must be positive if specified
2. ✅ `focusDirectory` must be a valid directory path
3. ✅ `colorMode` must be a supported color mode
4. ✅ `autoAdvanceDelay` must be >= 1000 (1 second) if auto-advance enabled
5. ✅ Paths in `highlightFiles` must be valid file paths
6. ✅ Paths in `focusDirectory` must not start with `/` (relative paths only)

### Highlight Layer Validation

1. ✅ `color` must be a valid hex color (#RRGGBB or #RGB)
2. ✅ `opacity` must be between 0 and 1
3. ✅ `borderWidth` must be positive
4. ✅ `items` array must not be empty
5. ✅ Each item path must be a valid repository path

### Interactive Action Validation

1. ✅ `target` is required for `click-file`, `hover-directory`, and `toggle-layer` actions
2. ✅ `target` should reference an existing file/directory path
3. ✅ `target` for `toggle-layer` should reference a layer ID in `highlightLayers`

## Best Practices

### Tour Design

1. **Start broad, then narrow** - Begin with overview, then focus on specific areas
2. **Limit steps** - 5-10 steps is ideal for most tours
3. **Estimate time accurately** - Test the tour and update `estimatedTime` values
4. **Use progressive disclosure** - Don't overwhelm with too much information at once

### Step Design

1. **One concept per step** - Each step should teach one main idea
2. **Use visual hierarchy** - Combine `focusDirectory` with `highlightLayers` for clarity
3. **Make it interactive** - Include at least one `interactiveAction` per step
4. **Provide resources** - Link to relevant documentation

### Highlight Layers

1. **Limit colors** - Use 2-4 distinct colors maximum per step
2. **Contrast matters** - Choose colors that stand out against the default theme
3. **Border for groups** - Use `renderStrategy: "border"` for directories
4. **Fill for emphasis** - Use `renderStrategy: "fill"` for key files
5. **Adjust opacity** - Lower opacity (0.5-0.7) for large areas

### File Paths

1. **Use relative paths** - All paths relative to repository root
2. **Use forward slashes** - Even on Windows: `src/components/Button.tsx`
3. **No leading slash** - ❌ `/src/App.tsx` ✅ `src/App.tsx`
4. **Case sensitive** - Match exact file/directory casing

## Example Tour

See [examples/introduction-example.tour.json](../examples/introduction-example.tour.json) for a complete example.

### Minimal Example

```json
{
  "id": "quick-start",
  "title": "Quick Start Guide",
  "description": "Get started with the codebase in 5 minutes",
  "version": "1.0.0",
  "steps": [
    {
      "id": "step-1",
      "title": "Welcome!",
      "description": "This is a simple introduction to the project structure.",
      "estimatedTime": 30,
      "focusDirectory": "src",
      "colorMode": "fileTypes"
    }
  ]
}
```

## JSON Schema

A JSON schema is available for validation tools:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IntroductionTour",
  "type": "object",
  "required": ["id", "title", "description", "version", "steps"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string", "minLength": 1 },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "audience": { "type": "string" },
    "prerequisites": { "type": "array", "items": { "type": "string" } },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/step" }
    },
    "metadata": { "$ref": "#/definitions/metadata" }
  }
}
```

See [tour-schema.json](./tour-schema.json) for the complete schema definition.

## CLI Tool Requirements

A CLI tool for generating and validating tours should support:

### Commands

1. **`tour validate <file>`** - Validate tour JSON against schema and rules
2. **`tour create`** - Interactive tour creation wizard
3. **`tour init`** - Initialize a new tour with template
4. **`tour test <file>`** - Test tour in a File City instance
5. **`tour lint <file>`** - Check for best practices violations

### Validation

- JSON schema validation
- Path existence validation (files/directories exist in repo)
- Color code validation (valid hex colors)
- Unique ID validation (tour and step IDs)
- Cross-reference validation (layer IDs match in actions)

### Generation

- Interactive prompts for tour metadata
- Step-by-step wizard for creating steps
- Auto-discovery of important directories
- Suggested highlights based on git history
- Template selection (onboarding, feature tour, architecture overview)

### Output

- Formatted JSON with proper indentation
- Validation error messages with line numbers
- Suggestions for improvements
- Preview mode showing what tour will look like

## Automatic Tour Detection

CodeCityPanel automatically detects and loads tours from your repository:

1. **Place `*.tour.json` in repository root** - The file must end with `.tour.json` (e.g., `getting-started.tour.json`, `architecture.tour.json`)
2. **File is auto-detected** - When the file tree loads, CodeCityPanel scans for files matching `*.tour.json`
3. **Validation happens automatically** - The tour is parsed and validated on load
4. **Tour button appears** - If a valid tour is found, a "Tour" button appears in the header
5. **Click to start** - Users can click the button to begin the guided tour

If multiple `.tour.json` files exist, the first one alphabetically will be loaded.

### Implementation Details

The tour detection uses these utilities from `src/utils/tourParser.ts`:

```typescript
import { loadTourFromFileTree } from '../utils/tourParser';

// Automatically called when fileTree updates
const tourResult = loadTourFromFileTree(fileTreeSlice.data);

if (tourResult.success && tourResult.tour) {
  // Tour is valid and ready to display
  setTourData(tourResult.tour);
}
```

### Validation Errors

If a `.tour.json` file exists but has validation errors, they will be logged to the console:

```
[Tour] Tour validation failed: Invalid 'version' - must be semantic version (e.g., '1.0.0')
```

To see these errors, open your browser's developer console.

### Testing Your Tour

1. Add your `*.tour.json` file to your repository root (e.g., `my-tour.tour.json`)
2. Open the repository in File City
3. Check the console for validation errors
4. If valid, click the "Tour" button in the header
5. Navigate through your tour steps

## Related Documentation

- [TourPlayer Integration Guide](./STORYPLAYER_INTEGRATION.md)
- [Context Panel Guide](./CONTEXT_PANEL_GUIDE.md)
- [Type Definitions](../src/types/IntroductionTour.ts)
- [Tour Parser Utilities](../src/utils/tourParser.ts)

## Version History

- **1.0.0** (2026-02-03) - Initial format specification with automatic detection
