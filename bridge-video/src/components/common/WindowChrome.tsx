import React from 'react';
import { THEME } from '../../theme';

interface WindowChromeProps {
  title: string;
  icon?: React.ReactNode;
  statusBadge?: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  glow?: boolean;
}

export const WindowChrome: React.FC<WindowChromeProps> = ({
  title,
  icon,
  statusBadge,
  children,
  width = '100%',
  height = 'auto',
  borderColor = THEME.palette.borderMuted,
  glow = false,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: THEME.palette.surfaceCardSemiTransparent,
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        border: `1.5px solid ${borderColor}`,
        boxShadow: glow
          ? `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px ${borderColor}33`
          : '0 20px 50px rgba(0, 0, 0, 0.65)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          height: 48,
          backgroundColor: '#10131B',
          borderBottom: `1px solid ${THEME.palette.borderMuted}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          userSelect: 'none',
        }}
      >
        {/* Window controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#FF5F56',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#FFBD2E',
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#27C93F',
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: THEME.palette.textHeading,
            fontFamily: THEME.typography.mono,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {icon}
          <span>{title}</span>
        </div>

        {/* Status badge or placeholder */}
        {statusBadge ? (
          <div
            style={{
              fontSize: 11,
              fontFamily: THEME.typography.mono,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              backgroundColor: `${THEME.palette.primaryVolt}20`,
              color: THEME.palette.primaryVolt,
              border: `1px solid ${THEME.palette.primaryVolt}44`,
            }}
          >
            {statusBadge}
          </div>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>

      {/* Window Body */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};
