import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { THEME } from '../../theme';

interface GridBackgroundProps {
  glowColor?: string;
  intensity?: number;
  showScanlines?: boolean;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  glowColor = THEME.palette.primaryVolt,
  intensity = 1,
  showScanlines = true,
}) => {
  const frame = useCurrentFrame();

  const pulse = interpolate(
    Math.sin(frame / 20),
    [-1, 1],
    [0.15 * intensity, 0.3 * intensity]
  );

  const gridOffset = (frame * 0.5) % 40;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: THEME.palette.bgCanvas,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Dynamic Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          width: 800,
          height: 800,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: pulse,
          filter: 'blur(90px)',
        }}
      />

      {/* Cyber Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: `0px ${gridOffset}px`,
          opacity: 0.8,
        }}
      />

      {/* Vignette Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 35%, rgba(11, 12, 14, 0.85) 90%, #0B0C0E 100%)',
        }}
      />

      {/* Scanline overlay */}
      {showScanlines && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.25) 3px, rgba(0, 0, 0, 0.25) 6px)',
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
};
