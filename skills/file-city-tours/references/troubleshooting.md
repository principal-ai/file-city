# Troubleshooting Guide

Common issues when creating and using File City tours.

## Tour Not Showing Up

**Problem**: Tour file exists but doesn't appear in File City

**Solutions**:
1. **Check filename**: Must end with `.tour.json` (e.g., `getting-started.tour.json`)
2. **Check location**: Must be in repository root, not in subdirectories
3. **Check JSON syntax**: Run validation to ensure valid JSON
4. **Multiple tours**: Only the first alphabetically is loaded

**Validation**:
```bash
npx @principal-ai/file-city-cli@latest validate your-tour.tour.json
```

## Validation Errors

### "Invalid 'version' - must be semantic version"

**Problem**: Version field doesn't match X.Y.Z format

**Solution**: Use semantic versioning
```json
"version": "1.0.0"  // ✓ Correct
"version": "1.0"     // ✗ Wrong
"version": "v1.0.0"  // ✗ Wrong
```

### "Tour 'id' must be kebab-case"

**Problem**: ID contains invalid characters

**Solution**: Use lowercase, numbers, and hyphens only
```json
"id": "my-tour"         // ✓ Correct
"id": "my_tour"         // ✗ Wrong (underscore)
"id": "My-Tour"         // ✗ Wrong (uppercase)
"id": "my tour"         // ✗ Wrong (space)
```

### "'focusDirectory' must be a relative path (no leading slash)"

**Problem**: Path starts with `/`

**Solution**: Use relative paths from repository root
```json
"focusDirectory": "src/components"   // ✓ Correct
"focusDirectory": "/src/components"  // ✗ Wrong
"focusDirectory": "./src/components" // ✗ Wrong
```

### "Invalid hex color"

**Problem**: Color doesn't match hex format

**Solution**: Use 6-digit or 3-digit hex colors
```json
"color": "#3b82f6"  // ✓ Correct (6-digit)
"color": "#fff"     // ✓ Correct (3-digit)
"color": "blue"     // ✗ Wrong (name)
"color": "#3b82f"   // ✗ Wrong (5 digits)
```

### "'opacity' must be between 0 and 1"

**Problem**: Opacity value out of range

**Solution**: Use decimal between 0 (transparent) and 1 (opaque)
```json
"opacity": 0.7   // ✓ Correct
"opacity": 70    // ✗ Wrong (not percentage)
"opacity": 1.5   // ✗ Wrong (too high)
```

## Path Issues

### Files/directories not highlighting

**Problem**: Paths in tour don't match actual files

**Checklist**:
1. ✅ Paths are relative to repository root
2. ✅ No leading slash (/)
3. ✅ No leading dot-slash (./)
4. ✅ Correct case (file systems are case-sensitive)
5. ✅ Forward slashes (/) not backslashes (\\)

**Example**:
```json
{
  "items": [
    { "path": "src/App.tsx", "type": "file" },        // ✓ Correct
    { "path": "/src/App.tsx", "type": "file" },       // ✗ Wrong
    { "path": "./src/App.tsx", "type": "file" },      // ✗ Wrong
    { "path": "src\\App.tsx", "type": "file" }        // ✗ Wrong (Windows)
  ]
}
```

## Step Issues

### Duplicate step ID error

**Problem**: Multiple steps have the same `id`

**Solution**: Each step needs a unique ID
```json
{
  "steps": [
    { "id": "step-1", ... },  // ✓ Unique
    { "id": "step-2", ... },  // ✓ Unique
    { "id": "step-1", ... }   // ✗ Duplicate
  ]
}
```

### Auto-advance not working

**Problem**: Step doesn't advance automatically

**Solution**: Set both `autoAdvance` and `autoAdvanceDelay`
```json
{
  "autoAdvance": true,
  "autoAdvanceDelay": 3000  // Must be >= 1000ms
}
```

## Interactive Actions

### "Action requires a 'target'"

**Problem**: Action type needs a target but none provided

**Solution**: Add target for these action types:
- `click-file` → file path
- `hover-directory` → directory path
- `toggle-layer` → layer ID

```json
{
  "type": "click-file",
  "description": "Click on the main file",
  "target": "src/index.ts"  // Required
}
```

## CLI Installation Issues

### "tour: command not found"

**Problem**: CLI not installed globally

**Solutions**:
```bash
# Option 1: Install globally
npm install -g @principal-ai/file-city-cli

# Option 2: Use npx
npx @principal-ai/file-city-cli@latest validate my-tour.tour.json

# Option 3: Use local install
npm install --save-dev @principal-ai/file-city-cli
npx tour validate my-tour.tour.json
```

## Best Practices

### Keep tours focused
- 5-10 steps is ideal
- Each step should teach one concept
- Don't overload with too much information

### Use appropriate color modes
- `fileTypes` - Default, shows file extensions
- `git` - Show modified files
- `coverage` - Test coverage visualization
- `typescript` - Type safety issues

### Test your tour
1. Create the tour file
2. Validate with CLI: `npx @principal-ai/file-city-cli@latest validate`
3. Place in repository root
4. Open in File City
5. Walk through each step
6. Verify highlights and actions work

### Progressive disclosure
- Start with overview (step 1)
- Focus on specific areas (steps 2-N)
- End with next steps or resources
