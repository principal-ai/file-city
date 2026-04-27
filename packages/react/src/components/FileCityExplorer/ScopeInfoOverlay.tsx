import React from 'react';
import type { Event, Namespace, Scope } from './model';
import { overlayStyle, sectionLabelStyle } from './styles';

const SEVERITY_BG: Record<NonNullable<Event['severity']>, string> = {
  ERROR: '#7f1d1d',
  WARN: '#78350f',
  INFO: '#1e3a8a',
};
const DEFAULT_SEVERITY_BG = '#1e293b';

export const ScopeInfoOverlay: React.FC<{
  info: { scope: Scope; ns: Namespace | null; ev: Event | null };
}> = ({ info }) => {
  const { scope, ns, ev } = info;

  // Event leaf selected — show event detail.
  if (ns && ev) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Event</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>
            {ev.name}
          </div>
          {ev.severity && (
            <div
              style={{
                display: 'inline-block',
                fontSize: 12,
                marginTop: 8,
                padding: '2px 6px',
                borderRadius: 3,
                background: SEVERITY_BG[ev.severity] ?? DEFAULT_SEVERITY_BG,
                color: '#fde68a',
              }}
            >
              {ev.severity}
            </div>
          )}
          {ev.description && (
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>
              {ev.description}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Owning namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: 3, background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 14, fontStyle: 'italic' }}>
            Files-per-event mapping not wired yet — for now the event highlights its parent
            namespace&apos;s paths.
          </div>
        </div>
      </div>
    );
  }

  // Namespace selected — show namespace detail.
  if (ns) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ width: 12, height: 12, borderRadius: 3, background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
            {ns.description}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            in <span style={{ fontFamily: 'monospace' }}>{scope.id}</span>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Claimed paths ({ns.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {ns.paths.map(p => (
              <code
                key={p}
                style={{
                  fontSize: 12,
                  color: '#cbd5e1',
                  background: '#0b1220',
                  padding: '4px 6px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                }}
              >
                {p}
              </code>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Events ({ns.events.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {ns.events.map(e => (
              <div
                key={e.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  background: '#0b1220',
                  borderRadius: 4,
                }}
              >
                {e.severity && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: '1px 4px',
                      borderRadius: 2,
                      background: SEVERITY_BG[e.severity] ?? DEFAULT_SEVERITY_BG,
                      color: '#fde68a',
                      flexShrink: 0,
                    }}
                  >
                    {e.severity}
                  </span>
                )}
                <code style={{ fontSize: 12, color: '#cbd5e1' }}>
                  {e.name}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Scope selected — show scope summary.
  const totalEvents = scope.namespaces.reduce((n, x) => n + x.events.length, 0);
  return (
    <div style={overlayStyle}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
        <div style={sectionLabelStyle}>Scope</div>
        <div style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 6 }}>{scope.id}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
          {scope.description}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#64748b' }}>
          <div>
            <div>{scope.paths.length}</div>
            <div style={sectionLabelStyle}>scope paths</div>
          </div>
          <div>
            <div>{scope.namespaces.length}</div>
            <div style={sectionLabelStyle}>namespaces</div>
          </div>
          <div>
            <div>{totalEvents}</div>
            <div style={sectionLabelStyle}>events</div>
          </div>
        </div>
      </div>
      {scope.paths.length > 0 && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={sectionLabelStyle}>Scope-level paths ({scope.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {scope.paths.map(p => (
              <code
                key={p}
                style={{
                  fontSize: 12,
                  color: '#cbd5e1',
                  background: '#0b1220',
                  padding: '4px 6px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                }}
              >
                {p}
              </code>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={sectionLabelStyle}>Namespaces</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {scope.namespaces.map(n => (
            <div
              key={n.name}
              style={{ padding: 8, background: '#0b1220', borderRadius: 6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: n.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.name}</span>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                  {n.events.length} event{n.events.length === 1 ? '' : 's'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  fontFamily: 'monospace',
                  marginTop: 4,
                  wordBreak: 'break-all',
                }}
              >
                {n.paths.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
