# @principal-ai/file-city-cli

Command-line tool for creating, validating, and managing introduction tours for File City visualizations.

## Installation

```bash
npm install -g @principal-ai/file-city-cli
```

Or use with `npx`:

```bash
npx @principal-ai/file-city-cli <command>
```

## Commands

### `tour validate <file>`

Validate a tour JSON file against the specification.

```bash
tour validate my-tour.tour.json
```

**Options:**
- `-j, --json` - Output results as JSON (for CI/CD integration)
- `-s, --strict` - Enable strict validation including file system checks

**Examples:**

```bash
# Validate a tour file
tour validate getting-started.tour.json

# Output as JSON for CI/CD
tour validate getting-started.tour.json --json

# Strict validation (checks if referenced files exist)
tour validate getting-started.tour.json --strict
```

### `tour init`

Initialize a new tour file from a template.

```bash
tour init
```

**Options:**
- `-t, --template <type>` - Template type: `minimal`, `onboarding`, or `architecture` (default: `minimal`)
- `-o, --output <file>` - Output filename (default: generated from tour ID)

**Examples:**

```bash
# Create a minimal tour
tour init

# Create an onboarding tour
tour init --template onboarding

# Create with custom output filename
tour init --template architecture --output my-custom-tour.tour.json
```

## Tour File Format

Tour files are JSON files that follow the `*.tour.json` naming convention. They define guided tours through codebases using the File City visualization.

### Minimal Example

```json
{
  "id": "quick-start",
  "title": "Quick Start Guide",
  "description": "Get started with the codebase in 5 minutes",
  "version": "1.0.0",
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

### Required Fields

- `id` - Unique identifier (kebab-case)
- `title` - Human-readable title
- `description` - Brief overview
- `version` - Semantic version (e.g., "1.0.0")
- `steps` - Array of tour steps (at least 1)

### Step Configuration

Each step can include:
- `id` - Unique step identifier
- `title` - Step title
- `description` - Detailed explanation
- `estimatedTime` - Time in seconds
- `focusDirectory` - Directory to zoom into
- `colorMode` - Visualization mode (fileTypes, git, coverage, etc.)
- `highlightLayers` - Custom highlight overlays
- `highlightFiles` - Specific files to highlight
- `interactiveActions` - User actions to try
- `resources` - Related links and documentation

## Validation Rules

The CLI validates:
- ✅ Semantic versioning format
- ✅ Unique IDs (tour and steps)
- ✅ Valid file paths (relative, no leading slash)
- ✅ Valid hex colors
- ✅ Numeric constraints (opacity 0-1, positive values)
- ✅ Required fields presence
- ✅ Cross-references (layer IDs in actions)

## Output Formats

### Human-Readable (default)

```
✓ Tour "my-tour.tour.json" is valid!

  Tour ID: my-tour
  Title: My Amazing Tour
  Version: 1.0.0
  Steps: 5
```

### JSON (for CI/CD)

```json
{
  "file": "my-tour.tour.json",
  "valid": true,
  "tour": {
    "id": "my-tour",
    "title": "My Amazing Tour",
    "version": "1.0.0",
    "stepCount": 5
  }
}
```

## Usage in CI/CD

Add validation to your CI pipeline:

```yaml
# .github/workflows/validate-tours.yml
name: Validate Tours
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npx @principal-ai/file-city-cli validate *.tour.json --json
```

## Integration with File City

Place your validated `*.tour.json` file in your repository root. The File City visualization will automatically detect and load it, providing a "Tour" button in the UI.

## Templates

### Minimal
Simple single-step tour for quick starts.

### Onboarding
Multi-step tour with highlights and resources for new developers.

### Architecture
Comprehensive tour showcasing layered architecture and design patterns.

## Documentation

For complete specification and best practices, see:
- [Tour Format Specification](https://github.com/principal-ai/file-city/blob/main/docs/INTRODUCTION_TOUR_FORMAT.md)
- [Examples](https://github.com/principal-ai/file-city/tree/main/examples)

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run locally
node dist/index.js --help
```

## License

MIT
