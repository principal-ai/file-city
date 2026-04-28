import type React from 'react';
import type { Theme } from '@principal-ade/industry-theme';

/** Translucent overlay using the theme's background colour. */
export const withAlpha = (color: string, percent: number): string =>
  `color-mix(in oklab, ${color} ${percent}%, transparent)`;

/** Reused across overlays, modals, and the selected-folder card. */
export const makeSectionLabelStyle = (theme: Theme): React.CSSProperties => ({
  fontSize: theme.fontSizes[0],
  color: theme.colors.textTertiary,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

/** Frame style for the right-side info overlay. */
export const makeOverlayStyle = (theme: Theme): React.CSSProperties => ({
  position: 'absolute',
  top: 16,
  left: 16,
  width: 360,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  background: withAlpha(theme.colors.background, 72),
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radii[4],
  color: theme.colors.text,
  fontFamily: theme.fonts.body,
  fontSize: theme.fontSizes[1],
  zIndex: 100,
  boxShadow: theme.shadows[3],
});
