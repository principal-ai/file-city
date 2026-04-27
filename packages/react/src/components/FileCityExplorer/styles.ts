import type React from 'react';

/** Reused across overlays, modals, and the selected-folder card. */
export const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

/** Frame style for the right-side info overlay. */
export const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 360,
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  background: 'rgba(15, 23, 42, 0.72)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  zIndex: 100,
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};
