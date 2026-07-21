'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Educational morph: teach one folder first, then scale up to a full repo.
 *
 * 0. folder-closed — a single directory, collapsed
 * 1. folder-tree   — that directory opens into a classic list
 * 2. folder-map    — that folder packs into equal file tiles
 * 3. repo-closed   — zoom out: the whole project tree, collapsed
 * 4. repo-tree     — the full project tree expanded
 * 5. repo-map      — full File City architecture map
 *
 * Sizing matches File City: each file is one equal tile; directories claim
 * area only through the files they contain.
 */

export type ExplainerStage = 'folder-closed' | 'folder-tree' | 'folder-map' | 'repo-closed' | 'repo-tree' | 'repo-map';

export interface TreeMapExplainerProps {
  /** Canvas width in px */
  width?: number;
  /** Canvas height in px (animation surface only; caption sits below) */
  height?: number;
  /** Controlled stage; when set, autoPlay does not advance */
  stage?: ExplainerStage;
  /** Called when the stage changes (auto or manual) */
  onStageChange?: (stage: ExplainerStage) => void;
  /** Auto-advance through stages */
  autoPlay?: boolean;
  /** ms spent on each stage before advancing */
  stageDuration?: number;
  /** Loop after the last stage */
  loop?: boolean;
  /** Show step caption under the canvas */
  showCaption?: boolean;
  /** Show step dots / manual controls */
  showControls?: boolean;
  /** Dark or light surface */
  theme?: 'dark' | 'light';
  className?: string;
  style?: React.CSSProperties;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DemoNode {
  id: string;
  name: string;
  kind: 'dir' | 'file';
  color: string;
  parentId?: string;
  depth: number;
  /** Descendant file count for dirs; always 1 for files */
  fileCount: number;
  /** Visible during the single-folder lesson */
  inFolderLesson: boolean;
}

const STAGES: ExplainerStage[] = ['folder-closed', 'folder-tree', 'folder-map', 'repo-closed', 'repo-tree', 'repo-map'];

const STAGE_META: Record<
  ExplainerStage,
  { label: string; title: string; body: string }
> = {
  'folder-closed': {
    label: '1 · One folder',
    title: 'Start with one folder',
    body: 'This is a directory — a folder in your project. Inside it are files. Let\'s open it up.',
  },
  'folder-tree': {
    label: '2 · Open folder',
    title: 'A folder is a list of files',
    body: 'Files nested under a name. We\'ll turn this one folder into a map next.',
  },
  'folder-map': {
    label: '3 · Folder map',
    title: 'That folder becomes a map',
    body: 'Each file is one equal tile. The folder is a district whose size is "how many files live here" — not bytes or lines.',
  },
  'repo-closed': {
    label: '4 · Whole repo',
    title: 'A repo is many folders',
    body: 'Let\'s expand it — nested folders hold the whole project.',
  },
  'repo-tree': {
    label: '5 · Project tree',
    title: 'Every file in its place',
    body: 'Same structure, nested. utils still holds two files; src holds three; the project root holds everything.',
  },
  'repo-map': {
    label: '6 · City map',
    title: 'The whole repo as a map',
    body: 'Apply the same rule everywhere: one tile per file, districts sized by content. That\'s the File City architecture map.',
  },
};

/**
 * Toy tree — learn on `utils/`, then reveal the rest.
 *
 *   my-app/          (5 files)
 *     src/           (3)
 *       App.tsx      (1)
 *       utils/       (2)  ← folder lesson focus
 *         api.ts     (1)
 *         helpers.ts (1)
 *     package.json   (1)
 *     README.md      (1)
 */
const DEMO_NODES: DemoNode[] = [
  {
    id: 'root',
    name: 'my-app',
    kind: 'dir',
    color: '#64748b',
    depth: 0,
    fileCount: 5,
    inFolderLesson: false,
  },
  {
    id: 'src',
    name: 'src',
    kind: 'dir',
    color: '#64748b',
    parentId: 'root',
    depth: 1,
    fileCount: 3,
    inFolderLesson: false,
  },
  {
    id: 'app',
    name: 'App.tsx',
    kind: 'file',
    color: '#38bdf8',
    parentId: 'src',
    depth: 2,
    fileCount: 1,
    inFolderLesson: false,
  },
  {
    id: 'utils',
    name: 'folder',
    kind: 'dir',
    color: '#64748b',
    parentId: 'src',
    depth: 2,
    fileCount: 2,
    inFolderLesson: true,
  },
  {
    id: 'api',
    name: 'file a',
    kind: 'file',
    color: '#22d3ee',
    parentId: 'utils',
    depth: 3,
    fileCount: 1,
    inFolderLesson: true,
  },
  {
    id: 'helpers',
    name: 'file b',
    kind: 'file',
    color: '#2dd4bf',
    parentId: 'utils',
    depth: 3,
    fileCount: 1,
    inFolderLesson: true,
  },
  {
    id: 'pkg',
    name: 'package.json',
    kind: 'file',
    color: '#fbbf24',
    parentId: 'root',
    depth: 1,
    fileCount: 1,
    inFolderLesson: false,
  },
  {
    id: 'readme',
    name: 'README.md',
    kind: 'file',
    color: '#a78bfa',
    parentId: 'root',
    depth: 1,
    fileCount: 1,
    inFolderLesson: false,
  },
];

const TOTAL_FILES = 5;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isFolderStage(stage: ExplainerStage): boolean {
  return stage === 'folder-closed' || stage === 'folder-tree' || stage === 'folder-map';
}

function isMapStage(stage: ExplainerStage): boolean {
  return stage === 'folder-map' || stage === 'repo-map';
}

function isTreeStage(stage: ExplainerStage): boolean {
  return stage === 'folder-closed' || stage === 'folder-tree' || stage === 'repo-closed' || stage === 'repo-tree';
}

/** Off-canvas parking for nodes not yet in the story (keeps morph origins sane). */
function parkRect(width: number, height: number, seed: number): Rect {
  return {
    x: width * 0.5 - 20 + (seed % 3) * 8,
    y: height + 24 + seed * 4,
    w: 40,
    h: 28,
  };
}

function buildLayouts(width: number, height: number): Record<ExplainerStage, Record<string, Rect>> {
  const pad = Math.max(12, Math.round(Math.min(width, height) * 0.04));
  const contentW = width - pad * 2;
  const contentH = height - pad * 2;
  const gap = 4;

  // ── Shared tree geometry ─────────────────────────────────────────
  const rowH = clamp(Math.floor(contentH / 9), 28, 40);
  const indent = clamp(Math.floor(width * 0.055), 18, 28);
  const treeRowW = Math.min(contentW - indent * 0.5, width * 0.72);
  const treeX = (depth: number) => pad + depth * indent;

  // ── 0. folder-closed: just the utils folder, at the folder-tree position ──
  const folderRows = 3;
  const folderTreeH = rowH * folderRows + gap * (folderRows - 1);
  const folderTreeStartY = pad + Math.max(0, (contentH - folderTreeH) / 2);
  const folderClosed: Record<string, Rect> = {
    utils: {
      x: treeX(0) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY,  // same Y as folder-tree — no vertical jump
      w: treeRowW,
      h: rowH,
    },
    // Children start collapsed at the same Y as utils, expanding down
    api: {
      x: treeX(1) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY,
      w: treeRowW - indent,
      h: rowH,
    },
    helpers: {
      x: treeX(1) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY,
      w: treeRowW - indent,
      h: rowH,
    },
    root: parkRect(width, height, 0),
    src: parkRect(width, height, 1),
    app: parkRect(width, height, 2),
    pkg: parkRect(width, height, 3),
    readme: parkRect(width, height, 4),
  };

  // ── 1. folder-tree: only utils + 2 files, centered ───────────────
  // Same folderTreeStartY declared above in folder-closed
  // Use depth 0/1 visually even though utils is depth 2 in the real tree
  const folderTree: Record<string, Rect> = {
    utils: {
      x: treeX(0) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY,
      w: treeRowW,
      h: rowH,
    },
    api: {
      x: treeX(1) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY + (rowH + gap),
      w: treeRowW - indent,
      h: rowH,
    },
    helpers: {
      x: treeX(1) + Math.max(0, (contentW - treeRowW) / 2),
      y: folderTreeStartY + 2 * (rowH + gap),
      w: treeRowW - indent,
      h: rowH,
    },
    root: parkRect(width, height, 0),
    src: parkRect(width, height, 1),
    app: parkRect(width, height, 2),
    pkg: parkRect(width, height, 3),
    readme: parkRect(width, height, 4),
  };

  // ── 2. folder-map: one district, two equal file tiles ────────────
  const mapMaxW = Math.min(contentW, Math.round(width * 0.72));
  const mapMaxH = Math.min(contentH, Math.round(height * 0.62));
  const mapW = mapMaxW;
  const mapH = mapMaxH;
  const mapX = pad + Math.max(0, (contentW - mapW) / 2);
  const mapY = pad + Math.max(0, (contentH - mapH) / 2);
  const innerGap = Math.max(4, Math.round(Math.min(mapW, mapH) * 0.03));
  const labelStrip = clamp(Math.round(mapH * 0.14), 22, 32);

  const utilsDistrict: Rect = { x: mapX, y: mapY, w: mapW, h: mapH };
  const tileArea: Rect = {
    x: mapX + innerGap,
    y: mapY + labelStrip + innerGap,
    w: mapW - innerGap * 2,
    h: mapH - labelStrip - innerGap * 2,
  };
  const tileW = Math.round((tileArea.w - innerGap) / 2);

  const folderMap: Record<string, Rect> = {
    utils: utilsDistrict,
    api: {
      x: tileArea.x,
      y: tileArea.y,
      w: tileW,
      h: tileArea.h,
    },
    helpers: {
      x: tileArea.x + tileW + innerGap,
      y: tileArea.y,
      w: tileArea.w - tileW - innerGap,
      h: tileArea.h,
    },
    // Park others near the future repo layout so they can rise in next stage
    root: parkRect(width, height, 0),
    src: parkRect(width, height, 1),
    app: parkRect(width, height, 2),
    pkg: parkRect(width, height, 3),
    readme: parkRect(width, height, 4),
  };

  // ── 3. repo-tree: full indented list ─────────────────────────────
  const repoTreeH = rowH * 8 + gap * 7;
  const repoTreeStartY = pad + Math.max(0, (contentH - repoTreeH) / 2);
  const treeY = (index: number) => repoTreeStartY + index * (rowH + gap);

  const repoTree: Record<string, Rect> = {
    root: { x: treeX(0), y: treeY(0), w: treeRowW, h: rowH },
    src: { x: treeX(1), y: treeY(1), w: treeRowW - indent, h: rowH },
    app: { x: treeX(2), y: treeY(2), w: treeRowW - indent * 2, h: rowH },
    utils: { x: treeX(2), y: treeY(3), w: treeRowW - indent * 2, h: rowH },
    api: { x: treeX(3), y: treeY(4), w: treeRowW - indent * 3, h: rowH },
    helpers: { x: treeX(3), y: treeY(5), w: treeRowW - indent * 3, h: rowH },
    pkg: { x: treeX(1), y: treeY(6), w: treeRowW - indent, h: rowH },
    readme: { x: treeX(1), y: treeY(7), w: treeRowW - indent, h: rowH },
  };

  // ── 3. repo-closed: root with children collapsed inside it ──────────
  const repoTreeCollapsed: Record<string, Rect> = {
    root: { x: treeX(0), y: repoTreeStartY, w: treeRowW, h: rowH },
    src: { x: treeX(1), y: repoTreeStartY, w: treeRowW - indent, h: rowH },
    app: { x: treeX(2), y: repoTreeStartY, w: treeRowW - indent * 2, h: rowH },
    utils: { x: treeX(2), y: repoTreeStartY, w: treeRowW - indent * 2, h: rowH },
    api: { x: treeX(3), y: repoTreeStartY, w: treeRowW - indent * 3, h: rowH },
    helpers: { x: treeX(3), y: repoTreeStartY, w: treeRowW - indent * 3, h: rowH },
    pkg: { x: treeX(1), y: repoTreeStartY, w: treeRowW - indent, h: rowH },
    readme: { x: treeX(1), y: repoTreeStartY, w: treeRowW - indent, h: rowH },
  };

  // ── 4. repo-map: nested equal-tile treemap (city polish applied in render)
  const outer: Rect = { x: pad, y: pad, w: contentW, h: contentH };
  const packGap = Math.max(3, Math.round(Math.min(contentW, contentH) * 0.012));

  // src 3/5 | right 2/5
  const leftW = Math.round((contentW - packGap) * (3 / TOTAL_FILES));
  const rightW = contentW - leftW - packGap;
  const srcRect: Rect = { x: outer.x, y: outer.y, w: leftW, h: contentH };
  const rightX = outer.x + leftW + packGap;
  const halfRight = Math.round((contentH - packGap) / 2);
  const readmeRect: Rect = { x: rightX, y: outer.y, w: rightW, h: halfRight };
  const pkgRect: Rect = {
    x: rightX,
    y: outer.y + halfRight + packGap,
    w: rightW,
    h: contentH - halfRight - packGap,
  };

  const srcPad = packGap;
  const srcLabel = 26;
  const srcInner: Rect = {
    x: srcRect.x + srcPad,
    y: srcRect.y + srcPad + srcLabel,
    w: srcRect.w - srcPad * 2,
    h: srcRect.h - srcPad * 2 - srcLabel,
  };
  // App 1/3 | utils 2/3 of src
  const appW = Math.round((srcInner.w - packGap) * (1 / 3));
  const utilsW = srcInner.w - appW - packGap;
  const appRect: Rect = { x: srcInner.x, y: srcInner.y, w: appW, h: srcInner.h };
  const utilsRect: Rect = {
    x: srcInner.x + appW + packGap,
    y: srcInner.y,
    w: utilsW,
    h: srcInner.h,
  };

  const utilsPad = Math.max(2, packGap - 1);
  const utilsLabel = 26;
  const utilsInner: Rect = {
    x: utilsRect.x + utilsPad,
    y: utilsRect.y + utilsPad + utilsLabel,
    w: utilsRect.w - utilsPad * 2,
    h: utilsRect.h - utilsPad * 2 - utilsLabel,
  };
  const sideBySide = utilsInner.w >= utilsInner.h * 0.85;
  let apiRect: Rect;
  let helpersRect: Rect;
  if (sideBySide) {
    const halfW = Math.round((utilsInner.w - packGap) / 2);
    apiRect = { x: utilsInner.x, y: utilsInner.y, w: halfW, h: utilsInner.h };
    helpersRect = {
      x: utilsInner.x + halfW + packGap,
      y: utilsInner.y,
      w: utilsInner.w - halfW - packGap,
      h: utilsInner.h,
    };
  } else {
    const halfH = Math.round((utilsInner.h - packGap) / 2);
    apiRect = { x: utilsInner.x, y: utilsInner.y, w: utilsInner.w, h: halfH };
    helpersRect = {
      x: utilsInner.x,
      y: utilsInner.y + halfH + packGap,
      w: utilsInner.w,
      h: utilsInner.h - halfH - packGap,
    };
  }

  // City inset on file tiles
  const cityInset = Math.max(2, Math.round(packGap * 0.6));
  const inset = (r: Rect, amount: number): Rect => ({
    x: r.x + amount,
    y: r.y + amount,
    w: Math.max(4, r.w - amount * 2),
    h: Math.max(4, r.h - amount * 2),
  });

  const repoMap: Record<string, Rect> = {
    root: { ...outer },
    src: srcRect,
    app: inset(appRect, cityInset),
    utils: utilsRect,
    api: inset(apiRect, cityInset),
    helpers: inset(helpersRect, cityInset),
    pkg: inset(pkgRect, cityInset),
    readme: inset(readmeRect, cityInset),
  };

  return {
    'folder-closed': folderClosed,
    'folder-tree': folderTree,
    'folder-map': folderMap,
    'repo-closed': repoTreeCollapsed,
    'repo-tree': repoTree,
    'repo-map': repoMap,
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function nodeVisible(node: DemoNode, stage: ExplainerStage): boolean {
  if (stage === 'folder-closed') return node.id === 'utils';
  if (isFolderStage(stage)) return node.inFolderLesson;
  if (stage === 'repo-closed') return node.id === 'root';  // only root visible, rest expands in repo-tree
  return true;
}

export function TreeMapExplainer({
  width = 480,
  height = 360,
  stage: controlledStage,
  onStageChange,
  autoPlay = true,
  stageDuration = 2400,
  loop = true,
  showCaption = true,
  showControls = true,
  theme = 'dark',
  className,
  style,
}: TreeMapExplainerProps) {
  const isControlled = controlledStage !== undefined;
  const [internalStage, setInternalStage] = useState<ExplainerStage>('folder-closed');
  const [paused, setPaused] = useState(false);
  const stage = controlledStage ?? internalStage;
  const reducedMotion = usePrefersReducedMotion();

  // Caption crossfade: hold previous copy, fade out, swap, fade in
  const [captionStage, setCaptionStage] = useState(stage);
  const [captionOpacity, setCaptionOpacity] = useState(1);

  const layouts = useMemo(() => buildLayouts(width, height), [width, height]);

  // Crossfade: when moving from a map stage to a tree stage, fade out then snap to new layout
  const [crossfading, setCrossfading] = useState(false);
  const prevStageRef = useRef(stage);
  // During crossfade, keep rendering the old layout so nodes don't jump while invisible
  const displayStage = crossfading ? prevStageRef.current : stage;
  const layout = layouts[displayStage];
  // UseLayoutEffect to set crossfading before browser paints (avoids one-frame flash)
  useLayoutEffect(() => {
    const prev = prevStageRef.current;
    if (prev === 'folder-map' && stage === 'repo-closed' && !reducedMotion) {
      setCrossfading(true);
      const t = window.setTimeout(() => {
        prevStageRef.current = stage;
        setCrossfading(false);
      }, 250);
      return () => window.clearTimeout(t);
    }
    prevStageRef.current = stage;
  }, [stage, reducedMotion]);

  const setStage = useCallback(
    (next: ExplainerStage) => {
      if (!isControlled) setInternalStage(next);
      onStageChange?.(next);
    },
    [isControlled, onStageChange],
  );

  useEffect(() => {
    if (!autoPlay || paused || isControlled) return;
    const ms = reducedMotion ? stageDuration * 1.4 : stageDuration;
    const timer = window.setTimeout(() => {
      const idx = STAGES.indexOf(stage);
      const nextIdx = idx + 1;
      if (nextIdx >= STAGES.length) {
        if (loop) setStage(STAGES[0]);
      } else {
        setStage(STAGES[nextIdx]);
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [autoPlay, paused, isControlled, stage, stageDuration, loop, setStage, reducedMotion]);

  useEffect(() => {
    if (stage === captionStage) return;
    if (reducedMotion) {
      setCaptionStage(stage);
      setCaptionOpacity(1);
      return;
    }
    setCaptionOpacity(0);
    const t = window.setTimeout(() => {
      setCaptionStage(stage);
      setCaptionOpacity(1);
    }, 180);
    return () => window.clearTimeout(t);
  }, [stage, captionStage, reducedMotion]);

  const isDark = theme === 'dark';
  const surface = isDark ? '#0f1419' : '#f8fafc';
  const surfaceAlt = isDark ? '#1a2332' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(15, 23, 42, 0.12)';
  const mapLike = isMapStage(stage);
  const treeLike = isTreeStage(stage);
  const folderLesson = isFolderStage(stage);

  const dirFill = treeLike
    ? isDark
      ? 'rgba(100, 116, 139, 0.35)'
      : 'rgba(100, 116, 139, 0.18)'
    : isDark
      ? 'rgba(30, 41, 59, 0.9)'
      : 'rgba(226, 232, 240, 0.95)';
  const dirStroke = isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.5)';

  const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
  const transitionMs = reducedMotion ? 0 : mapLike ? 750 : 600;
  // Shared motion for tiles AND floating labels so text tracks the morph.
  const moveTransition = reducedMotion
    ? 'none'
    : [
        `left ${transitionMs}ms ${ease}`,
        `top ${transitionMs}ms ${ease}`,
        `width ${transitionMs}ms ${ease}`,
        `height ${transitionMs}ms ${ease}`,
        `transform ${transitionMs}ms ${ease}`,
      ].join(', ');
  const tileTransition = reducedMotion
    ? 'none'
    : [
        moveTransition,
        'background-color 400ms ease',
        'border-radius 400ms ease',
        'box-shadow 400ms ease',
        'border-color 400ms ease',
        'opacity 450ms ease',
      ].join(', ');
  const labelTransition = reducedMotion
    ? 'none'
    : [
        moveTransition,
        `font-size ${transitionMs}ms ${ease}`,
        `max-width ${transitionMs}ms ${ease}`,
        'color 400ms ease',
        'opacity 450ms ease',
        'text-shadow 400ms ease',
      ].join(', ');
  const badgeTransition = reducedMotion
    ? 'none'
    : [
        moveTransition,
        'opacity 450ms ease',
        'background-color 400ms ease',
        'color 400ms ease',
        `font-size ${transitionMs}ms ${ease}`,
        'padding 400ms ease',
      ].join(', ');

  const meta = STAGE_META[stage];
  const captionMeta = STAGE_META[captionStage];

  const paintOrder = useMemo(() => {
    const dirs = DEMO_NODES.filter(n => n.kind === 'dir').sort((a, b) => a.depth - b.depth);
    const files = DEMO_NODES.filter(n => n.kind === 'file');
    return [...dirs, ...files];
  }, []);

  // Stable label inset from the tile's top-left so text rides the same path as the box.
  const labelInsetX = treeLike ? 10 : stage === 'folder-map' ? 12 : 8;
  const labelInsetY = stage === 'folder-map' ? 10 : 6;
  // Tree rows vertically center labels; map stages pin top-left.
  const treeLabelNudgeY = treeLike;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 12,
        maxWidth: width,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ...style,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: text, marginBottom: 4 }}>
        Understanding a Repo Treemap
      </div>
      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 2px',
          }}
      >
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {STAGES.map(s => {
            const active = s === stage;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStage(s);
                  setPaused(true);
                }}
                title={STAGE_META[s].title}
                aria-label={`Go to stage: ${STAGE_META[s].title}`}
                aria-current={active ? 'step' : undefined}
                style={{
                  flex: 1,
                  height: 6,
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  padding: 0,
                  background: active ? (isDark ? '#38bdf8' : '#0284c7') : surfaceAlt,
                  opacity: active ? 1 : 0.85,
                  transition: 'background 200ms ease, transform 150ms ease',
                  transform: active ? 'scaleY(1.35)' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
      )}
      <div style={{ opacity: captionOpacity, transition: reducedMotion ? 'none' : 'opacity 180ms ease', marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: textMuted,
            marginBottom: 4,
          }}
        >
          {captionMeta.label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: text }}>
          {captionMeta.title}
        </div>
      </div>
      <div
        role="img"
        aria-label={`Treemap explainer: ${meta.title}. ${meta.body}`}
        style={{
          position: 'relative',
          width,
          height,
          borderRadius: 12,
          background: surface,
          border: `1px solid ${border}`,
          overflow: 'hidden',
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
            : 'inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {/* Soft focus ring during single-folder lesson */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            opacity: folderLesson && stage === 'folder-map' ? 1 : 0,
            background: isDark
              ? 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.35) 100%)'
              : 'radial-gradient(ellipse at center, transparent 40%, rgba(15,23,42,0.08) 100%)',
            pointerEvents: 'none',
            transition: 'opacity 400ms ease',
          }}
        />

        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            opacity: stage === 'repo-map' ? 0.12 : 0,
            backgroundImage: `
              linear-gradient(${isDark ? '#64748b' : '#94a3b8'} 1px, transparent 1px),
              linear-gradient(90deg, ${isDark ? '#64748b' : '#94a3b8'} 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
            transition: 'opacity 400ms ease',
          }}
        />

        {/* ── Tile surfaces (no text — labels are a separate tracking layer) ── */}
        {paintOrder.map(node => {
          const rect = layout[node.id];
          if (!rect) return null;

          const visible = nodeVisible(node, stage);
          const isDir = node.kind === 'dir';
          const isRoot = node.id === 'root';
          const isFocusFolder = node.id === 'utils';

          const radius = treeLike
            ? 8
            : stage === 'folder-map'
              ? isDir
                ? 12
                : 8
              : stage === 'repo-map'
                ? isDir
                  ? 10
                  : 6
                : 6;

          const bg = isDir ? dirFill : node.color;

          const boxShadow =
            mapLike && !isDir
              ? isDark
                ? '0 2px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)'
                : '0 2px 8px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.5)'
              : mapLike && isDir && stage === 'folder-map'
                ? isDark
                  ? '0 8px 28px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(148,163,184,0.25)'
                  : '0 8px 24px rgba(15,23,42,0.1), inset 0 0 0 1px rgba(100,116,139,0.2)'
                : mapLike && isDir
                  ? isDark
                    ? 'inset 0 0 0 1px rgba(148,163,184,0.2)'
                    : 'inset 0 0 0 1px rgba(100,116,139,0.2)'
                  : 'none';

          let opacity = visible ? 1 : 0;
          if (crossfading) opacity = 0;
          if (visible && isRoot && stage === 'repo-map') opacity = 0.5;

          const emphasizeUtils =
            isFocusFolder && stage === 'repo-map'
              ? isDark
                ? 'rgba(56, 189, 248, 0.55)'
                : 'rgba(2, 132, 199, 0.45)'
              : null;

          return (
            <div
              key={`tile-${node.id}`}
              style={{
                position: 'absolute',
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                borderRadius: radius,
                background: bg,
                border: `1px solid ${
                  emphasizeUtils
                    ? emphasizeUtils
                    : isDir
                      ? dirStroke
                      : mapLike
                        ? 'rgba(15,23,42,0.15)'
                        : `${node.color}88`
                }`,
                boxShadow,
                opacity,
                transition: crossfading ? 'opacity 200ms ease' : tileTransition,
                boxSizing: 'border-box',
                zIndex: isDir ? node.depth + 1 : 10 + node.depth,
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* ── Floating labels: same rect motion as tiles, fixed anchor, no flex reflow ── */}
        {paintOrder.map(node => {
          const rect = layout[node.id];
          if (!rect) return null;

          const visible = nodeVisible(node, stage);
          const isDir = node.kind === 'dir';
          const isRoot = node.id === 'root';

          // Hide root label on full map (frame only)
          const labelActive = visible && !(isRoot && stage === 'repo-map');

          const fontSize = clamp(
            mapLike
              ? Math.min(
                  14,
                  Math.max(10, Math.min(rect.w, rect.h) * (stage === 'folder-map' ? 0.11 : 0.18)),
                )
              : 12,
            10,
            15,
          );

          const labelColor = isDir ? textMuted : '#0f172a';

          // Vertically center label in tree rows; pin near top-left on maps.
          const ly = treeLabelNudgeY
            ? rect.y + Math.max(4, (rect.h - fontSize * 1.2) / 2)
            : rect.y + labelInsetY;
          const lx = rect.x + labelInsetX;

          // Tree glyphs reserve width so the name doesn't jump when they fade.
          const glyphW = 16;
          const glyphOpacity = treeLike && labelActive && !crossfading ? 0.85 : 0;
          const nameOffsetX = treeLike ? glyphW : 0;

          const maxLabelW = Math.max(0, rect.w - labelInsetX * 2 - nameOffsetX);

          // Small tiles: fade label rather than unmount (keeps continuity)
          const fits = rect.w > 24 && rect.h > 14;
          const nameOpacity = labelActive && fits && !crossfading ? 1 : 0;

          const showDirCount =
            labelActive && isDir && (treeLike || mapLike) && rect.w > 72 && rect.h > 18;
          const countOpacity = showDirCount && !crossfading ? (mapLike ? 1 : 0.85) : 0;

          const showEqualHint =
            labelActive && !isDir && stage === 'folder-map' && rect.w > 64 && rect.h > 56;
          const equalOpacity = showEqualHint && !crossfading ? 1 : 0;

          // Count badge sits on the right of the tile (tree) or after the name
          const countLeft = mapLike
            ? rect.x + rect.w - labelInsetX - 64
            : rect.x + rect.w - 10 - 56;
          const countTop = ly;

          // "1 tile" sits under the file name in folder-map
          const equalLeft = rect.x + labelInsetX;
          const equalTop = ly + fontSize + 10;

          return (
            <React.Fragment key={`label-${node.id}`}>
              {/* Tree glyph — width reserved, fades out on map stages */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: lx,
                  top: ly,
                  width: glyphW,
                  fontSize: 11,
                  lineHeight: 1.2,
                  color: isDir ? textMuted : node.color,
                  opacity: glyphOpacity,
                  transition: crossfading ? 'opacity 200ms ease' : labelTransition,
                  zIndex: 40 + node.depth,
                  pointerEvents: 'none',
                  fontWeight: 600,
                }}
              >
                {isDir ? (stage === 'folder-closed' ? '▸' : '▾') : '•'}
              </span>

              {/* Name — always present, rides left/top with the tile */}
              <span
                style={{
                  position: 'absolute',
                  left: lx + nameOffsetX,
                  top: ly,
                  maxWidth: maxLabelW,
                  fontSize,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: mapLike ? '0.01em' : 0,
                  color: labelColor,
                  opacity: nameOpacity,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow: mapLike && !isDir ? '0 1px 0 rgba(255,255,255,0.25)' : 'none',
                  transition: crossfading ? 'opacity 200ms ease' : labelTransition,
                  zIndex: 41 + node.depth,
                  pointerEvents: 'none',
                }}
              >
                {node.name}
              </span>

              {/* File-count badge (dirs) */}
              <span
                style={{
                  position: 'absolute',
                  left: Math.max(lx, countLeft),
                  top: countTop,
                  fontSize: stage === 'folder-map' ? 11 : 10,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: mapLike
                    ? isDark
                      ? '#e2e8f0'
                      : '#334155'
                    : textMuted,
                  background: mapLike
                    ? isDark
                      ? 'rgba(15,23,42,0.55)'
                      : 'rgba(255,255,255,0.75)'
                    : 'transparent',
                  borderRadius: 999,
                  padding: mapLike ? '2px 8px' : '0',
                  whiteSpace: 'nowrap',
                  opacity: countOpacity,
                  transition: crossfading ? 'opacity 200ms ease' : badgeTransition,
                  zIndex: 42 + node.depth,
                  pointerEvents: 'none',
                }}
              >
                {node.fileCount} {node.fileCount === 1 ? 'file' : 'files'}
              </span>

              {/* Equal-tile hint (files, folder-map only) */}
              <span
                style={{
                  position: 'absolute',
                  left: equalLeft,
                  top: equalTop,
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#0f172a',
                  background: 'rgba(255,255,255,0.88)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                  opacity: equalOpacity,
                  transition: crossfading ? 'opacity 200ms ease' : badgeTransition,
                  zIndex: 42 + node.depth,
                  pointerEvents: 'none',
                }}
              >
                1 tile
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {showCaption && (
        <div
          style={{
            padding: '0 2px',
            opacity: captionOpacity,
            transition: reducedMotion ? 'none' : 'opacity 180ms ease',
            minHeight: 72,
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.45, color: textMuted }}>
            {captionMeta.body}
          </div>
        </div>
      )}

    </div>
  );
}

export default TreeMapExplainer;
