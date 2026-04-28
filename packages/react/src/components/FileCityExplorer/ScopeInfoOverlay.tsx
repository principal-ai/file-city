import React from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import type { Event, Namespace, Scope } from './model';
import { makeOverlayStyle, makeSectionLabelStyle } from './styles';

export const ScopeInfoOverlay: React.FC<{
  info: { scope: Scope; ns: Namespace | null; ev: Event | null };
}> = ({ info }) => {
  const { theme } = useTheme();
  const overlayStyle = makeOverlayStyle(theme);
  const sectionLabelStyle = makeSectionLabelStyle(theme);

  const severityBg: Record<NonNullable<Event['severity']>, string> = {
    ERROR: theme.colors.error,
    WARN: theme.colors.warning,
    INFO: theme.colors.info,
  };
  const defaultSeverityBg = theme.colors.backgroundSecondary;

  const sectionDivider = `1px solid ${theme.colors.backgroundSecondary}`;
  const codeChipStyle: React.CSSProperties = {
    fontSize: theme.fontSizes[0],
    color: theme.colors.textSecondary,
    background: theme.colors.backgroundDark ?? theme.colors.background,
    padding: '4px 6px',
    borderRadius: theme.radii[2],
    wordBreak: 'break-all',
  };

  const { scope, ns, ev } = info;

  // Event leaf selected — show event detail.
  if (ns && ev) {
    return (
      <div style={overlayStyle}>
        <div style={{ padding: '14px 16px', borderBottom: sectionDivider }}>
          <div style={sectionLabelStyle}>Event</div>
          <div style={{ fontFamily: theme.fonts.monospace, fontSize: theme.fontSizes[1], marginTop: 6 }}>
            {ev.name}
          </div>
          {ev.severity && (
            <div
              style={{
                display: 'inline-block',
                fontSize: theme.fontSizes[0],
                marginTop: theme.space[2],
                padding: '2px 6px',
                borderRadius: theme.radii[1],
                background: severityBg[ev.severity] ?? defaultSeverityBg,
                color: theme.colors.highlight,
              }}
            >
              {ev.severity}
            </div>
          )}
          {ev.description && (
            <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textSecondary, marginTop: 10, lineHeight: 1.5 }}>
              {ev.description}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Owning namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: theme.space[2] }}>
            <span
              style={{ width: 12, height: 12, borderRadius: theme.radii[1], background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: theme.fonts.monospace, fontSize: theme.fontSizes[1] }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textTertiary, marginTop: 14, fontStyle: 'italic' }}>
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
        <div style={{ padding: '14px 16px', borderBottom: sectionDivider }}>
          <div style={sectionLabelStyle}>Namespace</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: theme.space[2] }}>
            <span
              style={{ width: 12, height: 12, borderRadius: theme.radii[1], background: ns.color, flexShrink: 0 }}
            />
            <span style={{ fontFamily: theme.fonts.monospace, fontSize: theme.fontSizes[1] }}>{ns.name}</span>
          </div>
          <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textMuted, marginTop: theme.space[2], lineHeight: 1.5 }}>
            {ns.description}
          </div>
          <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textTertiary, marginTop: theme.space[2] }}>
            in <span style={{ fontFamily: theme.fonts.monospace }}>{scope.id}</span>
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderBottom: sectionDivider }}>
          <div style={sectionLabelStyle}>Claimed paths ({ns.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[1], marginTop: 6 }}>
            {ns.paths.map(p => (
              <code key={p} style={codeChipStyle}>
                {p}
              </code>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={sectionLabelStyle}>Events ({ns.events.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[1], marginTop: 6 }}>
            {ns.events.map(e => (
              <div
                key={e.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  background: theme.colors.backgroundDark ?? theme.colors.background,
                  borderRadius: theme.radii[2],
                }}
              >
                {e.severity && (
                  <span
                    style={{
                      fontSize: theme.fontSizes[0],
                      padding: '1px 4px',
                      borderRadius: theme.radii[1],
                      background: severityBg[e.severity] ?? defaultSeverityBg,
                      color: theme.colors.highlight,
                      flexShrink: 0,
                    }}
                  >
                    {e.severity}
                  </span>
                )}
                <code style={{ fontSize: theme.fontSizes[0], color: theme.colors.textSecondary }}>
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
      <div style={{ padding: '14px 16px', borderBottom: sectionDivider }}>
        <div style={sectionLabelStyle}>Scope</div>
        <div style={{ fontFamily: theme.fonts.monospace, fontSize: theme.fontSizes[1], marginTop: 6 }}>{scope.id}</div>
        <div style={{ fontSize: theme.fontSizes[0], color: theme.colors.textMuted, marginTop: theme.space[2], lineHeight: 1.5 }}>
          {scope.description}
        </div>
        <div style={{ display: 'flex', gap: theme.space[3], marginTop: 12, fontSize: theme.fontSizes[0], color: theme.colors.textTertiary }}>
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
        <div style={{ padding: '14px 16px', borderBottom: sectionDivider }}>
          <div style={sectionLabelStyle}>Scope-level paths ({scope.paths.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[1], marginTop: 6 }}>
            {scope.paths.map(p => (
              <code key={p} style={codeChipStyle}>
                {p}
              </code>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={sectionLabelStyle}>Namespaces</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space[2], marginTop: theme.space[2] }}>
          {scope.namespaces.map(n => (
            <div
              key={n.name}
              style={{
                padding: theme.space[2],
                background: theme.colors.backgroundDark ?? theme.colors.background,
                borderRadius: theme.radii[3],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.space[2] }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: theme.radii[1],
                    background: n.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: theme.fonts.monospace, fontSize: theme.fontSizes[0] }}>{n.name}</span>
                <span style={{ fontSize: theme.fontSizes[0], color: theme.colors.textTertiary, marginLeft: 'auto' }}>
                  {n.events.length} event{n.events.length === 1 ? '' : 's'}
                </span>
              </div>
              <div
                style={{
                  fontSize: theme.fontSizes[0],
                  color: theme.colors.textTertiary,
                  fontFamily: theme.fonts.monospace,
                  marginTop: theme.space[1],
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
