import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../../theme';

interface KineticTextProps {
  lines: string[];
  color?: string;
  glowColor?: string;
  fontSize?: number;
  delay?: number;
  stagger?: number;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: string;
  fontFamily?: string;
}

export const KineticText: React.FC<KineticTextProps> = ({
  lines,
  color = THEME.palette.textHeading,
  glowColor,
  fontSize = 64,
  delay = 0,
  stagger = 8,
  align = 'center',
  letterSpacing = '-0.02em',
  fontFamily = THEME.typography.display,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
      }}
    >
      {lines.map((line, index) => {
        const lineDelay = delay + index * stagger;
        const lineFrame = Math.max(0, frame - lineDelay);

        const scale = spring({
          frame: lineFrame,
          fps,
          config: {
            damping: 12,
            mass: 0.6,
            stiffness: 180,
          },
          from: 2.2,
          to: 1.0,
        });

        const opacity = interpolate(lineFrame, [0, 4], [0, 1], {
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={index}
            style={{
              fontFamily,
              fontSize,
              fontWeight: 900,
              color,
              lineHeight: 1.05,
              textAlign: align,
              letterSpacing,
              textTransform: 'uppercase',
              opacity,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              textShadow: glowColor
                ? `0 0 30px ${glowColor}, 0 4px 20px rgba(0, 0, 0, 0.9)`
                : '0 8px 30px rgba(0, 0, 0, 0.8)',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};
