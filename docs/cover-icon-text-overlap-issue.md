# Cover Rendering Issues

**Date:** 2026-02-03
**Component:** `drawLayeredBuildings.ts` - `renderCoverStrategy` and `drawLayeredBuildings` functions
**Severity:** High - File covers not working, directory covers have overlap issues

## Issue 1: File Covers Not Rendering

**Severity:** High - Feature completely broken

### Problem Description

File covers with `renderStrategy: "cover"` do not render at all. The cover is not visible on file buildings.

### Current Behavior

When applying a cover to a file:
```typescript
{
  path: "src/components/TourPlayer.tsx",
  type: "file",
  renderStrategy: "cover",
  coverOptions: {
    text: "Tour",
    icon: "🎯",
    backgroundColor: "#8b5cf6"
  }
}
```

**Expected:** File building shows purple cover with emoji and text
**Actual:** No cover appears, file renders normally

### Root Cause

In `drawLayeredBuildings` function (line ~865-868), covers are filtered out for buildings:

```typescript
const layerMatches = index.getItemsForPath(building.path).filter(
  match => match.item.type === 'file',
); // Only apply file-specific highlights to buildings
```

The filter checks `match.item.type === 'file'` which is correct, BUT the `applyLayerRendering` function is never called for buildings with `renderStrategy: "cover"`.

Looking at the code around line 920-950, layer rendering is applied:
```typescript
for (const match of layerMatches) {
  applyLayerRendering(ctx, bounds, match.layer, match.item, scale, borderRadius);
}
```

However, covers might not be rendering because buildings are drawn AFTER the layer rendering, potentially covering up the cover overlay.

### Proposed Solution

**Option 1:** Render covers AFTER base building rendering
- Move cover rendering to happen after the building's base color is drawn
- Similar to how districts handle covers (after district rendering)

**Option 2:** Add special handling for cover strategy in buildings
- Check for cover strategy before standard building rendering
- Skip standard rendering if cover is present
- Render cover directly

**Option 3:** Handle covers similar to district abstraction
- Buildings with covers should be handled specially
- Potentially create a "building-abstraction" concept

### Related Code
- File: `packages/react/src/render/client/drawLayeredBuildings.ts`
- Function: `drawLayeredBuildings` (lines ~820-950)
- Lines: ~865-868 (layer filtering), ~920-950 (layer application)

---

## Issue 2: Directory Cover Icon and Text Overlap

**Severity:** Medium - Visual quality issue

### Problem Description

When a directory cover has both an icon/emoji and text, they can overlap on large directories, making both hard to read.

## Current Behavior

The rendering logic in `src/render/client/drawLayeredBuildings.ts` (lines 405-502) positions icons and text as follows:

**Icon/Image positioning (when text is present):**
```typescript
const imageY = coverOptions.text
  ? bounds.y + bounds.height * 0.25  // Icon at 25% from top
  : bounds.y + bounds.height / 2 - imageSize / 2;
```

**Emoji positioning (when text is present):**
```typescript
const iconY = coverOptions.text
  ? bounds.y + bounds.height * 0.35  // Emoji at 35% from top
  : bounds.y + bounds.height * 0.5;
```

**Text positioning:**
```typescript
const textY = coverOptions.icon
  ? bounds.y + bounds.height * 0.65  // Text at 65% from top
  : bounds.y + bounds.height * 0.5;
```

**Icon size auto-calculation:**
```typescript
// For Lucide icons/images
const imageSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.4; // 40% of bounds

// For emoji icons
const iconSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.3; // 30% of bounds
```

## Issue

For large directories (e.g., 200x200 pixels):
- Icon: 80 pixels (40% of 200px)
- Icon positioned at: 50px from top (25%)
- Icon bottom edge: 130px from top
- Text positioned at: 130px from top (65%)
- **Result: Icon and text overlap**

The positioning percentages (25% → 65% = 40% gap) don't account for the icon's actual size (40% of bounds), causing overlap.

## Expected Behavior

Icons and text should have clear visual separation with no overlap, regardless of bounds size.

## Reproduction

1. Create a cover with both `lucideIcon` and `text`:
```typescript
{
  coverOptions: {
    lucideIcon: "Package",
    text: "Components",
    backgroundColor: "#3b82f6"
  }
}
```

2. Apply to a large directory (>150px in any dimension)
3. Observe: Icon and text overlap

## Proposed Solutions

### Option 1: Dynamic Positioning Based on Icon Size
Calculate text position based on actual icon size:
```typescript
const iconBottom = imageY + imageSize;
const textY = Math.max(
  iconBottom + 10, // 10px gap
  bounds.y + bounds.height * 0.65 // Fallback position
);
```

### Option 2: Adjust Positioning Percentages
Increase the gap between icon and text:
```typescript
const imageY = coverOptions.text
  ? bounds.y + bounds.height * 0.2  // Icon at 20% (was 25%)
  : bounds.y + bounds.height / 2 - imageSize / 2;

const textY = coverOptions.icon
  ? bounds.y + bounds.height * 0.75  // Text at 75% (was 65%)
  : bounds.y + bounds.height * 0.5;
```

### Option 3: Reduce Auto-Calculated Icon Size
Make icons smaller by default:
```typescript
const imageSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.3; // 30% (was 40%)
const iconSize = coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.25; // 25% (was 30%)
```

### Option 4: Add Icon Size Constraints
Cap maximum icon size:
```typescript
const imageSize = Math.min(
  coverOptions.iconSize || Math.min(bounds.width, bounds.height) * 0.4,
  100 // Max 100px
);
```

## Workaround (Current)

Users can explicitly set smaller `iconSize` values:
```typescript
{
  coverOptions: {
    lucideIcon: "Package",
    iconSize: 40, // Pixels - prevents auto-calculation
    text: "Components",
    textSize: 24
  }
}
```

Or use separate covers for icon-only and text-only:
- One cover with only icon (no text)
- Another cover with only text (no icon)

## Related Code

- File: `packages/react/src/render/client/drawLayeredBuildings.ts`
- Function: `renderCoverStrategy` (lines ~365-505)
- Lines: 408-439 (icon positioning), 443-502 (text positioning)

## Impact

- Visual quality issue affecting readability of covers
- Workarounds available but not intuitive
- Affects both tour system and manual cover configurations
