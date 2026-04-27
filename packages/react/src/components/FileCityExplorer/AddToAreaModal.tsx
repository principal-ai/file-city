import React from 'react';
import type { ProjectArea } from './model';
import { AREA_PANEL_COLOR } from './layers';
import { sectionLabelStyle } from './styles';

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
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: 'min(80vh, 700px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f172a',
          color: '#e2e8f0',
          borderRadius: 8,
          border: '1px solid #334155',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div style={sectionLabelStyle}>Add to area</div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#94a3b8',
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
              color: '#64748b',
              fontSize: 20,
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
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
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
              style={{
                padding: '8px 10px',
                background: '#0b1220',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 14,
              }}
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
                style={{
                  padding: '8px 10px',
                  background: '#0b1220',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: '#cbd5e1',
                border: '1px solid #334155',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!canSubmit || alreadyClaimed}
              style={{
                padding: '8px 14px',
                background: !canSubmit || alreadyClaimed ? '#1e293b' : '#94a3b8',
                color: !canSubmit || alreadyClaimed ? '#475569' : '#0f172a',
                border: '1px solid #334155',
                borderRadius: 4,
                cursor: !canSubmit || alreadyClaimed ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {actionLabel}
            </button>
          </div>
        </div>

        <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1 }}>
          <div style={sectionLabelStyle}>Existing areas (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {areas.length === 0 && (
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
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
                    fontSize: 12,
                    padding: '6px 10px',
                    background: claims ? '#0f172a' : '#1e293b',
                    color: claims ? '#475569' : '#e2e8f0',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: claims ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: AREA_PANEL_COLOR,
                      border: '1px dashed #94a3b8',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{area.name}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      color: '#64748b',
                    }}
                  >
                    {area.paths.length} path{area.paths.length === 1 ? '' : 's'}
                  </span>
                  {claims && <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
