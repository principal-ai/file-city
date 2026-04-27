import React from 'react';
import type { Scope } from './model';
import { sectionLabelStyle } from './styles';

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
            <div style={sectionLabelStyle}>Add to scope</div>
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
          </label>

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
                background: !canSubmit || alreadyClaimed ? '#1e293b' : '#3b82f6',
                color: !canSubmit || alreadyClaimed ? '#475569' : '#ffffff',
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

        <div
          style={{
            padding: '14px 18px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={sectionLabelStyle}>Existing scopes (click to prefill)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {scopes.map(scope => (
              <div key={scope.id}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#cbd5e1',
                    marginBottom: 6,
                  }}
                >
                  {scope.id}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <button
                    onClick={() => onPickExisting(scope.id, '')}
                    title={
                      scope.paths.includes(path)
                        ? 'Scope already claims this path'
                        : 'Prefill (scope-level)'
                    }
                    style={{
                      fontSize: 12,
                      padding: '3px 7px',
                      background: scope.paths.includes(path) ? '#0f172a' : '#1e293b',
                      color: scope.paths.includes(path) ? '#475569' : '#cbd5e1',
                      border: '1px dashed #475569',
                      borderRadius: 3,
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
                      <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>
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
                          fontSize: 12,
                          padding: '3px 7px',
                          background: claims ? '#0f172a' : '#1e293b',
                          color: claims ? '#475569' : '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: 3,
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
                            borderRadius: 2,
                            background: ns.color,
                            flexShrink: 0,
                          }}
                        />
                        {ns.name}
                        {claims && <span style={{ marginLeft: 4, fontSize: 12 }}>✓</span>}
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
