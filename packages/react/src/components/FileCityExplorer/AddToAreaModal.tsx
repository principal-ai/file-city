import React from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import type { ProjectArea } from './model';
import { AREA_PANEL_COLOR } from './layers';
import { makeSectionLabelStyle } from './styles';

export const AddToAreaModal: React.FC<{
  path: string;
  areas: readonly ProjectArea[];
  areaName: string;
  description: string;
  onAreaNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPickExisting: (areaName: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({
  path,
  areas,
  areaName,
  description,
  onAreaNameChange,
  onDescriptionChange,
  onPickExisting,
  onSubmit,
  onClose,
}) => {
  const { theme } = useTheme();
  const sectionLabelStyle = makeSectionLabelStyle(theme);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedName = areaName.trim();
  const canSubmit = trimmedName.length > 0;
  const targetArea = areas.find(a => a.name === trimmedName);
  const alreadyClaimed = targetArea?.paths.includes(path) ?? false;

  let actionLabel = 'Add';
  if (alreadyClaimed) actionLabel = 'Already added';
  else if (!targetArea) actionLabel = 'Create area';
  else actionLabel = 'Add path';

  const sectionDivider = `1px solid ${theme.colors.backgroundSecondary}`;
  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    background: theme.colors.backgroundDark ?? theme.colors.background,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii[2],
    fontFamily: theme.fonts.monospace,
    fontSize: theme.fontSizes[1],
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: theme.fonts.body,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: 'min(80vh, 700px)',
          display: 'flex',
          flexDirection: 'column',
          background: theme.colors.background,
          color: theme.colors.text,
          borderRadius: theme.radii[4],
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows[4],
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: sectionDivider,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: theme.space[3],
          }}
        >
          <div>
            <div style={sectionLabelStyle}>Add to area</div>
            <div
              style={{
                fontFamily: theme.fonts.monospace,
                fontSize: theme.fontSizes[0],
                color: theme.colors.textMuted,
                marginTop: 6,
                wordBreak: 'break-all',
              }}
            >
              {path}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.textTertiary,
              fontSize: theme.fontSizes[3],
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderBottom: sectionDivider,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.space[3],
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabelStyle}>Area</span>
            <input
              type="text"
              value={areaName}
              list="area-name-options"
              autoFocus
              placeholder="e.g. Documentation"
              onChange={e => onAreaNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !alreadyClaimed) onSubmit();
              }}
              style={inputStyle}
            />
            <datalist id="area-name-options">
              {areas.map(a => (
                <option key={a.name} value={a.name} />
              ))}
            </datalist>
          </label>

          {!targetArea && trimmedName.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={sectionLabelStyle}>Description (optional)</span>
              <input
                type="text"
                value={description}
                placeholder="Why this area exists, what it covers"
                onChange={e => onDescriptionChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && canSubmit) onSubmit();
                }}
                style={{ ...inputStyle, fontFamily: theme.fonts.body }}
              />
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.space[2] }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: theme.colors.textSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii[2],
                cursor: 'pointer',
                fontSize: theme.fontSizes[1],
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || alreadyClaimed}
              style={{
                padding: '8px 14px',
                background: !canSubmit || alreadyClaimed
                  ? theme.colors.backgroundSecondary
                  : theme.colors.textMuted,
                color: !canSubmit || alreadyClaimed
                  ? theme.colors.muted
                  : theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii[2],
                cursor: !canSubmit || alreadyClaimed ? 'not-allowed' : 'pointer',
                fontSize: theme.fontSizes[1],
                fontWeight: theme.fontWeights.medium,
              }}
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          <div style={sectionLabelStyle}>Existing areas (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: theme.space[2] }}>
            {areas.length === 0 && (
              <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textTertiary, fontStyle: 'italic' }}>
                No areas yet. Type a name above to create the first one.
              </div>
            )}
            {areas.map(area => {
              const claims = area.paths.includes(path);
              return (
                <button
                  key={area.name}
                  onClick={() => onPickExisting(area.name)}
                  title={claims ? 'Area already claims this path' : 'Prefill the area name'}
                  style={{
                    fontSize: theme.fontSizes[0],
                    padding: '6px 10px',
                    background: claims ? theme.colors.background : theme.colors.backgroundSecondary,
                    color: claims ? theme.colors.muted : theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radii[2],
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.space[2],
                    opacity: claims ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: theme.radii[1],
                      background: AREA_PANEL_COLOR,
                      border: `1px dashed ${theme.colors.textMuted}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: theme.fonts.monospace }}>{area.name}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: theme.fontSizes[0],
                      color: theme.colors.textTertiary,
                    }}
                  >
                    {area.paths.length} path{area.paths.length === 1 ? '' : 's'}
                  </span>
                  {claims && <span style={{ marginLeft: theme.space[1], fontSize: theme.fontSizes[0] }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
