import React from 'react';
import { THEME } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'volt' | 'cyan' | 'error' | 'success' | 'muted';
  icon?: React.ReactNode;
  fontSize?: number;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'volt',
  icon,
  fontSize = 13,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'volt':
        return {
          bg: `${THEME.palette.primaryVolt}18`,
          border: `${THEME.palette.primaryVolt}66`,
          text: THEME.palette.primaryVolt,
          glow: THEME.shadows.voltNeon,
        };
      case 'cyan':
        return {
          bg: `${THEME.palette.secondaryCyan}18`,
          border: `${THEME.palette.secondaryCyan}66`,
          text: THEME.palette.secondaryCyan,
          glow: THEME.shadows.cyanNeon,
        };
      case 'error':
        return {
          bg: `${THEME.palette.errorRed}20`,
          border: `${THEME.palette.errorRed}77`,
          text: THEME.palette.errorRed,
          glow: `0 0 20px ${THEME.palette.errorGlow}`,
        };
      case 'success':
        return {
          bg: `${THEME.palette.successGreen}20`,
          border: `${THEME.palette.successGreen}77`,
          text: THEME.palette.successGreen,
          glow: `0 0 20px ${THEME.palette.successGlow}`,
        };
      case 'muted':
      default:
        return {
          bg: '#181C26',
          border: THEME.palette.borderMuted,
          text: THEME.palette.textMuted,
          glow: 'none',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 9999,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize,
        fontFamily: THEME.typography.mono,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};
