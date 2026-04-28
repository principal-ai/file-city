import React from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import type { Scope } from './model';
import { makeSectionLabelStyle } from './styles';

export const AddToScopeModal: React.FC<{
  path: string;
  scopes: readonly Scope[];
  scopeId: string;
  namespaceName: string;
  onScopeIdChange: (value: string) => void;
  onNamespaceNameChange: (value: string) => void;
  onPickExisting: (scopeId: string, namespaceName: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({
  path,
  scopes,
  scopeId,
  namespaceName,
  onScopeIdChange,
  onNamespaceNameChange,
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

  const trimmedScope = scopeId.trim();
  const trimmedNs = namespaceName.trim();
  const canSubmit = trimmedScope.length > 0;

  // Determine what the submit will do, for the action label.
  const targetScope = scopes.find(s => s.id === trimmedScope);
  const targetNs = trimmedNs
    ? targetScope?.namespaces.find(n => n.name === trimmedNs) ?? null
    : null;
  const alreadyClaimed = trimmedNs
    ? targetNs?.paths.includes(path) ?? false
    : targetScope?.paths.includes(path) ?? false;

  let actionLabel = 'Add';
  if (alreadyClaimed) actionLabel = 'Already added';
  else if (!targetScope && !trimmedNs) actionLabel = 'Create scope';
  else if (!targetScope) actionLabel = 'Create scope + namespace';
  else if (!trimmedNs) actionLabel = 'Add to scope';
  else if (!targetNs) actionLabel = 'Create namespace';
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
            <div style={sectionLabelStyle}>Add to scope</div>
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
            <span style={sectionLabelStyle}>Scope</span>
            <input
              type="text"
              value={scopeId}
              list="scope-id-options"
              autoFocus
              placeholder="e.g. principal-view.cli"
              onChange={e => onScopeIdChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !alreadyClaimed) onSubmit();
              }}
              style={inputStyle}
            />
            <datalist id="scope-id-options">
              {scopes.map(s => (
                <option key={s.id} value={s.id} />
              ))}
            </datalist>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabelStyle}>Namespace (optional)</span>
            <input
              type="text"
              value={namespaceName}
              placeholder="leave blank to add to scope itself"
              onChange={e => onNamespaceNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !alreadyClaimed) onSubmit();
              }}
              style={inputStyle}
            />
          </label>

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
                  : theme.colors.primary,
                color: !canSubmit || alreadyClaimed
                  ? theme.colors.muted
                  : theme.colors.textOnPrimary,
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

        <div
          style={{
            padding: '14px 18px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={sectionLabelStyle}>Existing scopes (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[3], marginTop: theme.space[2] }}>
            {scopes.map(scope => (
              <div key={scope.id}>
                <div
                  style={{
                    fontFamily: theme.fonts.monospace,
                    fontSize: theme.fontSizes[0],
                    color: theme.colors.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {scope.id}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.space[1] }}>
                  <button
                    onClick={() => onPickExisting(scope.id, '')}
                    title={
                      scope.paths.includes(path)
                        ? 'Scope already claims this path'
                        : 'Prefill (scope-level)'
                    }
                    style={{
                      fontSize: theme.fontSizes[0],
                      padding: '3px 7px',
                      background: scope.paths.includes(path)
                        ? theme.colors.background
                        : theme.colors.backgroundSecondary,
                      color: scope.paths.includes(path)
                        ? theme.colors.muted
                        : theme.colors.textSecondary,
                      border: `1px dashed ${theme.colors.muted}`,
                      borderRadius: theme.radii[1],
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontStyle: 'italic',
                      opacity: scope.paths.includes(path) ? 0.6 : 1,
                    }}
                  >
                    (scope-level)
                    {scope.paths.includes(path) && (
                      <span style={{ marginLeft: theme.space[1], fontSize: theme.fontSizes[0] }}>✓</span>
                    )}
                  </button>
                  {scope.namespaces.map(ns => {
                    const claims = ns.paths.includes(path);
                    return (
                      <button
                        key={ns.name}
                        onClick={() => onPickExisting(scope.id, ns.name)}
                        title={claims ? 'Already claims this path' : 'Prefill inputs'}
                        style={{
                          fontSize: theme.fontSizes[0],
                          padding: '3px 7px',
                          background: claims
                            ? theme.colors.background
                            : theme.colors.backgroundSecondary,
                          color: claims ? theme.colors.muted : theme.colors.text,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radii[1],
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          opacity: claims ? 0.6 : 1,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: theme.radii[1],
                            background: ns.color,
                            flexShrink: 0,
                          }}
                        />
                        {ns.name}
                        {claims && <span style={{ marginLeft: theme.space[1], fontSize: theme.fontSizes[0] }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
