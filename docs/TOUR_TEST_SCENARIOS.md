# Tour Test Scenarios

This document defines test scenarios for validating tour animation behavior when transitioning between different combinations of `focusDirectory` and `highlightLayers`.

## Feature Combinations Matrix

| # | Scenario | focusDirectory | focusColor | highlightLayers | Expected Behavior |
|---|----------|----------------|------------|-----------------|-------------------|
| 1 | Baseline | `null` | `null` | `[]` | Full city view, all buildings normal height/color |
| 2 | Focus only | `"src"` | `"#3b82f6"` | `[]` | Camera zooms to src, src highlighted blue, non-src collapse to 5% |
| 3 | Highlight only | `null` | `null` | `[layer1]` | Full city view, highlighted buildings colored, others dimmed |
| 4 | Focus + Highlight (same) | `"src"` | `null` | `[{path: "src"}]` | Camera zooms to src, src buildings highlighted, others collapse |
| 5 | Focus + Highlight (subset) | `"src"` | `null` | `[{path: "src/components"}]` | Camera zooms to src, only components highlighted, rest of src normal, others collapse |
| 6 | Multiple highlights (same focus) | `"src"` | `null` | `[layer1, layer2]` | Camera zooms to src, two colors visible, others collapse |
| 7 | Multiple highlights (no focus) | `null` | `null` | `[layer1, layer2]` | Full city, two highlight colors, non-highlighted dimmed |

### focusColor Prop

When `focusDirectory` and `focusColor` are both set, the component automatically creates a highlight layer for the focused directory:

```typescript
<FileCity3D
  focusDirectory="src/components"
  focusColor="#3b82f6"  // Auto-highlights the focused directory
  highlightLayers={[]}  // No manual layers needed
/>
```

This is equivalent to manually creating a highlight layer:

```typescript
<FileCity3D
  focusDirectory="src/components"
  highlightLayers={[{
    id: '__focus-directory__',
    name: 'Focus',
    enabled: true,
    color: '#3b82f6',
    priority: 100,
    items: [{ path: 'src/components', type: 'directory' }],
  }]}
/>
```

## Transition Scenarios

These test the animation behavior when moving between states:

### T1: Add Focus Directory
- **From**: Scenario 1 (baseline)
- **To**: Scenario 2 (focus only)
- **Expected Animation**:
  1. Non-focused buildings lerp collapse (height → 5%)
  2. Non-focused buildings desaturate to gray
  3. Camera animates to focus on target directory

### T2: Remove Focus Directory
- **From**: Scenario 2 (focus only)
- **To**: Scenario 1 (baseline)
- **Expected Animation**:
  1. Camera zooms out to full view
  2. Collapsed buildings lerp expand (height → 100%)
  3. Buildings restore original colors

### T3: Switch Focus Directory
- **From**: Scenario 2 (`focusDirectory: "src"`)
- **To**: Scenario 2 (`focusDirectory: "tests"`)
- **Expected Animation** (three-phase):
  1. Camera zooms out
  2. Old focus expands, new focus area collapses others
  3. Camera zooms into new focus

### T4: Add Highlight Layer
- **From**: Scenario 1 (baseline)
- **To**: Scenario 3 (highlight only)
- **Expected Animation**:
  1. Highlighted buildings get layer color
  2. Non-highlighted buildings dim (opacity reduction)

### T5: Remove Highlight Layer
- **From**: Scenario 3 (highlight only)
- **To**: Scenario 1 (baseline)
- **Expected Animation**:
  1. All buildings restore original file-type colors
  2. Dimmed buildings restore full opacity

### T6: Switch Highlight Layers (same focus)
- **From**: Scenario 4 (`highlightLayers: [layerA]`)
- **To**: Scenario 4 (`highlightLayers: [layerB]`)
- **Expected Animation**:
  1. Camera stays in same position
  2. Old highlighted buildings lose color
  3. New highlighted buildings gain color
  4. Collapse state unchanged

### T7: Add Focus to Existing Highlight
- **From**: Scenario 3 (highlight only)
- **To**: Scenario 4 (focus + highlight)
- **Expected Animation**:
  1. Non-focused buildings collapse
  2. Camera zooms to focus area
  3. Highlight colors maintained

### T8: Remove Focus, Keep Highlight
- **From**: Scenario 4 (focus + highlight)
- **To**: Scenario 3 (highlight only)
- **Expected Animation**:
  1. Camera zooms out
  2. Collapsed buildings expand
  3. Highlight colors maintained

### T9: Add Multiple Highlights
- **From**: Scenario 4 (single highlight)
- **To**: Scenario 6 (multiple highlights)
- **Expected Animation**:
  1. New layer buildings gain second color
  2. Camera position unchanged
  3. Existing highlights maintained

### T10: Clear All (highlight + focus → baseline)
- **From**: Scenario 4 or 6
- **To**: Scenario 1 (baseline)
- **Expected Animation**:
  1. Camera zooms out
  2. All buildings expand
  3. All buildings restore original colors

## Edge Cases

### E1: Empty Highlight Layer
- `highlightLayers: [{ id: "empty", items: [] }]`
- **Expected**: Behaves like no highlight layer

### E2: Invalid Focus Directory
- `focusDirectory: "nonexistent/path"`
- **Expected**: No buildings match, all collapse (or graceful fallback)

### E3: Overlapping Highlights
- Two layers both include `src/index.ts`
- **Expected**: Higher priority layer color wins

### E4: Focus Directory Inside Highlight
- `focusDirectory: "src/components"` with `highlightLayers: [{path: "src"}]`
- **Expected**: Components visible and highlighted, rest of src collapsed but dimmed

### E5: Rapid Transitions
- Multiple state changes in quick succession
- **Expected**: Animations interrupt smoothly, final state correct

## Storybook Test Story

Use the `TourScenarioTester` story to manually test each scenario:

```bash
npm run storybook
# Navigate to: Components / FileCity3D / TourScenarioTester
```

The story provides:
- Dropdown to select any scenario
- Current state display (focusDirectory, highlightLayers)
- Animation timing controls
- Console logging of state transitions

## Animation Timing Reference

From `FileCity3D.tsx`:

| Animation | Duration | Easing |
|-----------|----------|--------|
| Building collapse/expand | ~12 frames at 0.08 lerp | Linear interpolation |
| Camera movement | Spring-based | tension: 60, friction: 20 |
| Color transition | Immediate with collapse | Linear with multiplier |
| Directory switch (full) | ~1100ms total | Sequenced timeouts |

### Collapse Speed Calculation
```typescript
const collapseSpeed = 0.08;  // Per-frame lerp factor
// ~12 frames to reach 95% of target (0.92^12 ≈ 0.05)
// At 60fps = ~200ms for collapse animation
```

### Three-Phase Directory Transition
```typescript
// Phase 1: Camera zooms out (0ms)
// Phase 2: Buildings collapse/expand (500ms)
// Phase 3: Camera zooms to new focus (1100ms)
```

## Validation Checklist

For each scenario transition, verify:

- [ ] Camera position is correct
- [ ] Building heights are correct (collapsed vs expanded)
- [ ] Building colors are correct (highlighted vs dimmed vs original)
- [ ] Animation is smooth (no jumps or stuttering)
- [ ] Final state matches expected state
- [ ] No console errors

## Related Files

- `packages/react/src/components/FileCity3D.tsx` - Animation implementation
- `packages/react/src/stories/FileCity3D.stories.tsx` - Storybook stories
- `skills/file-city-tours/SKILL.md` - Tour creation guide
