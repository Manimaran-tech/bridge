import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../../theme';

export interface CameraShot {
  startFrame: number;
  zoom: number;
  focusX: number;
  focusY: number;
  /** True for instant motivated hard-cuts (app switch, modal open); false for silky Screen Studio glide */
  hardCut?: boolean;
  /** Subtle flash color on major motivated cuts (kept understated & filmic) */
  flashColor?: string;
  /** Subtle chromatic split reserved strictly for real crash/error moments */
  rgbSplit?: boolean;
  /** Brief damped camera shake reserved for crash/impact moments */
  shake?: number;
}

/**
 * Studio-grade Screen Studio camera controller.
 * - Motivated app/view switches use crisp `hardCut: true`
 * - Same-screen focal shifts glide smoothly via critically-damped spring (zero wobble, zero cheesy tilt)
 * - Subtle organic micro-push keeps every shot alive and cinematic
 */
export function useDynamicCutCamera(shots: CameraShot[]) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let activeIdx = 0;
  for (let i = 0; i < shots.length; i++) {
    if (frame >= shots[i].startFrame) {
      activeIdx = i;
    }
  }

  const shot = shots[activeIdx];
  const prevShot = activeIdx > 0 ? shots[activeIdx - 1] : shot;
  const localFrame = Math.max(0, frame - shot.startFrame);

  // Critically damped spring: fast, decisive, zero bouncy/jittery overshoot
  const moveSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 22, stiffness: 200, mass: 0.8 },
  });

  const isInstant = activeIdx === 0 || Boolean(shot.hardCut);
  const baseZoom = isInstant
    ? shot.zoom
    : interpolate(moveSpring, [0, 1], [prevShot.zoom, shot.zoom]);
  const focusX = isInstant
    ? shot.focusX
    : interpolate(moveSpring, [0, 1], [prevShot.focusX, shot.focusX]);
  const focusY = isInstant
    ? shot.focusY
    : interpolate(moveSpring, [0, 1], [prevShot.focusY, shot.focusY]);

  // Subtle organic push-in so frames breathe without feeling dizzy
  const microPush = Math.min(0.02, localFrame * 0.00045);
  const zoom = baseZoom + microPush;

  // Brief damped shake ONLY when explicitly configured (crash / slam beats)
  const shakeDecay =
    shot.shake && localFrame < 10
      ? Math.sin(localFrame * 3.0) * shot.shake * (1 - localFrame / 10)
      : 0;

  // Understated 4-frame filmic exposure pulse on major cuts
  const flashOpacity =
    shot.flashColor && localFrame < 5
      ? interpolate(localFrame, [0, 5], [0.14, 0], { extrapolateRight: 'clamp' })
      : 0;

  const rgbSplitAmount =
    shot.rgbSplit && localFrame < 6
      ? interpolate(localFrame, [0, 6], [6, 0], { extrapolateRight: 'clamp' })
      : 0;

  return {
    zoom,
    focusX,
    focusY,
    tiltDeg: 0,
    shakeX: shakeDecay,
    shakeY: shakeDecay * 0.45,
    flashColor: shot.flashColor,
    flashOpacity,
    rgbSplitAmount,
    activeIdx,
    localFrame,
  };
}

interface CutVfxLayerProps {
  flashColor?: string;
  flashOpacity?: number;
  rgbSplitAmount?: number;
  stepTag?: string;
  stepAccent?: string;
}

/**
 * Refined editorial overlay: subtle studio vignette, understated frosted step pill,
 * and minimal exposure/chromatic accents strictly on motivated beats.
 */
export const CutVfxLayer: React.FC<CutVfxLayerProps> = ({
  flashColor,
  flashOpacity = 0,
  rgbSplitAmount = 0,
  stepTag,
  stepAccent = THEME.palette.primaryVolt,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  const tagSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 220, mass: 0.7 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 960,
        overflow: 'hidden',
      }}
    >
      {/* Subtle studio edge vignette for cinematic depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 64%, rgba(0, 0, 0, 0.36) 100%)',
        }}
      />

      {/* Understated filmic flash on hard cuts */}
      {flashColor && flashOpacity > 0.005 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 50%, ${flashColor}, transparent 75%)`,
            opacity: flashOpacity,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Subtle chromatic edge burst on crash errors only */}
      {rgbSplitAmount > 0.2 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset ${rgbSplitAmount}px 0 0 rgba(255, 68, 68, 0.28), inset ${-rgbSplitAmount}px 0 0 rgba(80, 200, 255, 0.28)`,
          }}
        />
      )}

      {/* Minimal frosted-glass HUD Step Pill (top-left) */}
      {stepTag && (
        <div
          style={{
            position: 'absolute',
            top: isLandscape ? 20 : 32,
            left: isLandscape ? 22 : 22,
            transform: `translateY(${(1 - tagSpring) * -10}px)`,
            opacity: tagSpring,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            backgroundColor: 'rgba(13, 15, 20, 0.78)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 999,
            padding: isLandscape ? '6px 14px' : '8px 16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: stepAccent,
              boxShadow: `0 0 8px ${stepAccent}AA`,
            }}
          />
          <span
            style={{
              fontFamily: THEME.typography.mono,
              fontSize: isLandscape ? 12.5 : 14.5,
              fontWeight: 700,
              color: '#F3F4F6',
              letterSpacing: '0.09em',
            }}
          >
            {stepTag}
          </span>
        </div>
      )}
    </div>
  );
};

interface FloatingCalloutVfxProps {
  startFrame: number;
  endFrame: number;
  label: string;
  sublabel?: string;
  accent?: string;
  top?: string;
  right?: string;
  left?: string;
  bottom?: string;
}

/**
 * Clean editorial key-takeaway card (Apple/Linear style):
 * frosted dark glass, crisp 3px left accent bar, smooth slide-in — never blocks UI.
 */
export const FloatingCalloutVfx: React.FC<FloatingCalloutVfxProps> = ({
  startFrame,
  endFrame,
  label,
  sublabel,
  accent = THEME.palette.primaryVolt,
  top,
  right,
  left,
  bottom,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  if (frame < startFrame || frame > endFrame) return null;

  const enter = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 20, stiffness: 240, mass: 0.65 },
  });
  const exit =
    frame > endFrame - 8
      ? interpolate(frame, [endFrame - 8, endFrame], [1, 0], { extrapolateRight: 'clamp' })
      : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        left,
        bottom,
        zIndex: 965,
        pointerEvents: 'none',
        opacity: enter * exit,
        transform: `translateX(${(1 - enter) * 18}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(13, 15, 20, 0.86)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderLeft: `3.5px solid ${accent}`,
          borderRadius: 12,
          padding: isLandscape ? '10px 16px' : '11px 18px',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: THEME.typography.display,
            fontSize: isLandscape ? 14.5 : 16.5,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              fontFamily: THEME.typography.display,
              fontSize: isLandscape ? 12.5 : 14,
              fontWeight: 500,
              color: '#9CA3AF',
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
