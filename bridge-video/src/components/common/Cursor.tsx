import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';

interface CursorProps {
  x: number;
  y: number;
  isClicking?: boolean;
  clickFrame?: number;
  label?: string;
}

export const Cursor: React.FC<CursorProps> = ({
  x,
  y,
  isClicking = false,
  clickFrame,
  label,
}) => {
  const frame = useCurrentFrame();

  const clickScale = isClicking ? 0.85 : 1;

  const rippleProgress =
    clickFrame !== undefined && frame >= clickFrame
      ? interpolate(frame - clickFrame, [0, 15], [0, 1], {
          extrapolateRight: 'clamp',
        })
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-2px, -2px) scale(${clickScale})`,
        pointerEvents: 'none',
        zIndex: 999,
        transition: 'transform 0.05s ease-out',
      }}
    >
      {/* Click Ripple Wave */}
      {clickFrame !== undefined && frame >= clickFrame && frame < clickFrame + 18 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 40 * (1 + rippleProgress),
            height: 40 * (1 + rippleProgress),
            borderRadius: '50%',
            border: `2px solid ${THEME.palette.primaryVolt}`,
            transform: 'translate(-50%, -50%)',
            opacity: 1 - rippleProgress,
          }}
        />
      )}

      {/* Modern Neon Cursor Arrow */}
      <svg
        width="28"
        height="32"
        viewBox="0 0 24 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: `drop-shadow(0 4px 10px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 8px ${THEME.palette.primaryVolt}88)`,
        }}
      >
        <path
          d="M2 2L10 24L14 15L22 13L2 2Z"
          fill="#FFFFFF"
          stroke={THEME.palette.primaryVolt}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Optional Drag / Action label */}
      {label && (
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 14,
            backgroundColor: THEME.palette.surfaceElevated,
            color: THEME.palette.primaryVolt,
            border: `1px solid ${THEME.palette.primaryVolt}`,
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 12,
            fontFamily: THEME.typography.mono,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.6)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
