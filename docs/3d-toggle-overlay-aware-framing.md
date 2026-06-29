# 3D Toggle With Overlay-Aware Framing

**Date:** 2026-05-06
**Component:** `FileCity3D` (`@principal-ai/file-city-react`)
**Status:** Proposal — not yet implemented
**Filed from:** `industry-themed-file-city-panels` /
  `FileCityTrailExplorerPanel`

## Background

`FileCityTrailExplorerPanel` overlays the city with side panels (markdown
explainer on the left, snippet pane on the right) and a sequence-diagram
drawer on the bottom. To keep the city readable underneath, the panel
runs a "framing" effect that picks a target + height that fits the city
into the canvas sub-rect not covered by overlays, then issues:

```ts
setCameraFlatView(targetX, targetZ, height, { duration: 400 });
```

This works well in **flat (top-down) mode** — see
`industry-themed-file-city-panels/src/panels/FileCityTrailExplorerPanel/FileCityTrailExplorerPanel.tsx:292`
and the math in `cameraFraming.ts`.

We then added a **3D toggle button** in the panel header so users can
switch between the flat structural view and the grown 3D view. The
intent: building heights (driven by line counts) become readable; the
overlays stay where they are; the city stays where it was.

## What goes wrong

When the toggle flips `isGrown` from `false` to `true`:

1. `FileCity3D`'s internal grow animation runs.
2. As part of that animation, the camera is repositioned to the
   library's default 3D perspective — straight-on, centered on the
   geometric center of the city, ignoring our overlay insets.
3. Our framing effect is keyed on
   `[cityData, containerSize, showSnippetPane, hasOverlayMarkdown,
    markdownOverlayWidth]` and so doesn't re-fire on toggle. Even if we
   added `isGrown` to the deps, `setCameraFlatView` is the only framing
   primitive available — it's a top-down command that wouldn't make
   sense for the 3D view.

Result: the camera "recenters" on toggle, the city slides under our
markdown overlay / snippet pane, and the panel loses its layout.

## What we'd like to support

Any **one** of these unblocks the panel — listed in order of
preference.

### Option A — `setCamera3DView(x, z, options)` (preferred)

A 3D analogue of `setCameraFlatView`. Same idea — caller passes the
world-space target and a desired framing — but the camera is positioned
at the configured tilt/azimuth instead of straight overhead.

```ts
export interface Camera3DViewOptions extends RotateOptions {
  /** Distance from target along the camera's forward axis. */
  distance?: number;
  /** Tilt in degrees (0 = top-down, 90 = level). Defaults to library 3D default. */
  tilt?: number;
  /** Azimuth in degrees (0 = south, 90 = west, ...). Defaults to current. */
  angle?: number;
}

export declare function setCamera3DView(
  x: number,
  z: number,
  options?: Camera3DViewOptions,
): void;
```

The host computes `(x, z, distance)` the same way it computes
`(x, z, height)` for the flat case — using the canvas sub-rect implied
by overlay insets — and the library handles tilt/azimuth.

### Option B — `isGrown` change without camera reset

Keep `isGrown` purely a geometry concern. Add a flag (or just stop
resetting the camera as part of the grow animation):

```ts
<FileCity3D
  isGrown={show3D}
  preserveCameraOnGrow  // new
/>
```

With this, the panel can run its existing flat-framing math and decide
separately whether to tilt the camera (e.g. with `tiltCameraTo('high')`)
when entering 3D. Less expressive than Option A but doesn't require any
new framing helper.

### Option C — `onGrowComplete` callback

If the camera reset is hard to remove, at minimum let the host know
when the grow animation has settled so it can issue corrective camera
commands without racing the animation:

```ts
<FileCity3D
  isGrown={show3D}
  onGrowComplete={(isGrown) => { /* re-run framing */ }}
/>
```

Today `onGrowChange` fires when the prop change is observed, not when
the animation has finished — so any framing the host issues immediately
gets overwritten.

## Out of scope

- The trail panel does not need control over the grow animation timing
  / staggering — `AnimationConfig` is already sufficient.
- The flat-mode framing already works; we don't want changes there.

## Until this lands

The panel's 3D button is disabled. The city renders flat, with real
heights baked into the building geometry but not visualized through
elevation. See `FileCityTrailExplorerPanel.tsx` — the header still owns
the `show3D` state machine so the feature can be turned back on with a
single line once the library supports one of the options above.
