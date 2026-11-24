import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Search, Folder, Wifi, Volume2, BatteryCharging } from 'lucide-react';
import { THEME } from '../theme';

export type ActiveApp = 'chrome' | 'vscode' | 'terminal' | 'explorer';

interface WindowsDesktopProps {
  activeApp: ActiveApp;
  zoom?: number;
  /** Normalized 0..1 focal point for Screen Studio smooth camera zoom */
  focusX?: number;
  focusY?: number;
  /** Optional kinetic camera tilt in degrees for dynamic cuts */
  tiltDeg?: number;
  /** Optional impact shake offsets in pixels */
  shakeX?: number;
  shakeY?: number;
  children: React.ReactNode;
  showTaskbar?: boolean;
}

export const WindowsDesktop: React.FC<WindowsDesktopProps> = ({
  activeApp,
  zoom = 1,
  focusX = 0.5,
  focusY = 0.5,
  tiltDeg = 0,
  shakeX = 0,
  shakeY = 0,
  children,
  showTaskbar = true,
}) => {
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;
  const taskbarHeight = isLandscape ? 46 : 54;

  // Screen Studio camera transform keeps focal point centered smoothly without clipping edges
  const effectiveZoom = Math.max(1, zoom);
  const maxShiftX = ((effectiveZoom - 1) / effectiveZoom) * width * 0.5;
  const maxShiftY = ((effectiveZoom - 1) / effectiveZoom) * height * 0.5;
  const rawShiftX = (0.5 - focusX) * width * (effectiveZoom - 1);
  const rawShiftY = (0.5 - focusY) * height * (effectiveZoom - 1);
  const tx = Math.max(-maxShiftX, Math.min(maxShiftX, rawShiftX)) + shakeX;
  const ty = Math.max(-maxShiftY, Math.min(maxShiftY, rawShiftY)) + shakeY;

  const taskbarApps: { id: ActiveApp; label: string; icon?: string; isFolder?: boolean }[] = [
    { id: 'explorer', label: 'File Explorer', isFolder: true },
    { id: 'chrome', label: 'Chrome', icon: 'assets/gemini-icon.svg' },
    { id: 'vscode', label: 'VS Code', icon: 'assets/vscode-icon.svg' },
    { id: 'terminal', label: 'Terminal', icon: 'assets/powershell-icon.svg' },
  ];

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#0A0C10',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Zoomable Real Desktop Canvas */}
      <div
        style={{
          width,
          height,
          position: 'relative',
          transform: `translate(${tx}px, ${ty}px) scale(${effectiveZoom}) rotate(${tiltDeg}deg)`,
          transformOrigin: '50% 50%',
          background:
            'radial-gradient(circle at 20% 20%, #162238 0%, #0D111A 48%, #090B10 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Main App Window Area (fills desktop cleanly like a maximized real app) */}
        <div
          style={{
            flex: 1,
            padding: isLandscape ? '10px 12px 8px' : '12px 10px 10px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {/* Authentic Windows 11 Dark Taskbar */}
        {showTaskbar && (
          <div
            style={{
              height: taskbarHeight,
              backgroundColor: 'rgba(24, 26, 31, 0.96)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isLandscape ? '0 18px' : '0 16px',
              flexShrink: 0,
            }}
          >
            {/* Left Weather / Build Info (Landscape only) */}
            {isLandscape ? (
              <div
                style={{
                  width: 220,
                  fontFamily: THEME.typography.display,
                  fontSize: 12,
                  color: '#9CA3AF',
                  fontWeight: 500,
                }}
              >
                Windows 11 Pro • Dev Workstation
              </div>
            ) : (
              <div style={{ width: 70 }} />
            )}

            {/* Center Pinned App Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isLandscape ? 8 : 10 }}>
              {/* Windows 11 Start Icon */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  padding: 8,
                }}
              >
                <div style={{ backgroundColor: '#60A5FA', borderRadius: 1 }} />
                <div style={{ backgroundColor: '#60A5FA', borderRadius: 1 }} />
                <div style={{ backgroundColor: '#3B82F6', borderRadius: 1 }} />
                <div style={{ backgroundColor: '#3B82F6', borderRadius: 1 }} />
              </div>

              {/* Search Pill (Landscape) */}
              {isLandscape && (
                <div
                  style={{
                    height: 30,
                    width: 170,
                    backgroundColor: '#2B2E36',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    gap: 8,
                    color: '#9CA3AF',
                    fontFamily: THEME.typography.display,
                    fontSize: 12.5,
                    marginRight: 4,
                  }}
                >
                  <Search size={13} />
                  <span>Search</span>
                </div>
              )}

              {/* App Icons */}
              {taskbarApps.map((app) => {
                const isActive = app.id === activeApp;
                return (
                  <div
                    key={app.id}
                    style={{
                      width: 38,
                      height: 36,
                      borderRadius: 6,
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {app.isFolder ? (
                      <Folder size={20} color="#FBBF24" fill="#FBBF24" fillOpacity={0.25} />
                    ) : (
                      <Img
                        src={staticFile(app.icon!)}
                        style={{ width: 22, height: 22, borderRadius: 4 }}
                      />
                    )}
                    {/* Active app indicator pill */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        width: isActive ? 16 : 6,
                        height: 3,
                        borderRadius: 99,
                        backgroundColor: isActive
                          ? app.id === 'terminal'
                            ? THEME.palette.primaryVolt
                            : '#60A5FA'
                          : '#6B7280',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right System Tray */}
            <div
              style={{
                width: isLandscape ? 220 : 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12,
                color: '#D1D5DB',
                fontFamily: THEME.typography.display,
                fontSize: 11.5,
              }}
            >
              {isLandscape && (
                <>
                  <Wifi size={14} />
                  <Volume2 size={14} />
                  <BatteryCharging size={14} />
                </>
              )}
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>3:17 PM</div>
                <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>20-11-2026</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface RealOSCursorProps {
  /** Pixel X in current composition coordinates */
  x: number;
  /** Pixel Y in current composition coordinates */
  y: number;
  isClicking?: boolean;
  clickFrame?: number;
}

/** Authentic macOS/Windows high-DPI desktop pointer (zero sci-fi neon glow) */
export const RealOSCursor: React.FC<RealOSCursorProps> = ({
  x,
  y,
  isClicking = false,
  clickFrame,
}) => {
  const frame = useCurrentFrame();

  const ripple =
    clickFrame !== undefined && frame >= clickFrame && frame < clickFrame + 16
      ? interpolate(frame - clickFrame, [0, 16], [0, 1], { extrapolateRight: 'clamp' })
      : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${isClicking ? 0.88 : 1})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: 990,
      }}
    >
      {ripple !== null && (
        <div
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 14 + ripple * 34,
            height: 14 + ripple * 34,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            transform: 'translate(-50%, -50%)',
            opacity: 1 - ripple,
          }}
        />
      )}
      <svg
        width="26"
        height="32"
        viewBox="0 0 24 30"
        fill="none"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55))' }}
      >
        <path
          d="M2 2L2 23L7.5 18L11.5 26.5L14.8 25L10.8 16.5L18.5 16.5L2 2Z"
          fill="#111318"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface AnchoredCursorProps {
  /** Frame cursor begins gliding toward the button */
  startFrame: number;
  /** Frame cursor arrives at exact button center (0, 0) */
  arriveFrame: number;
  /** Frame the click happens (press + ripple) */
  clickFrame: number;
  /** Frame cursor fades out after clicking */
  endFrame: number;
  /** Starting offset X in px relative to button center */
  fromX?: number;
  /** Starting offset Y in px relative to button center */
  fromY?: number;
  /** Target anchor within the parent button (defaults to exact center 50%, 50%) */
  targetX?: string;
  targetY?: string;
  /** Optional click ripple color */
  rippleColor?: string;
  /** Optional element attached to cursor while gliding (e.g. dragged ZIP chip) */
  dragChip?: React.ReactNode;
}

/**
 * Pixel-accurate cursor anchored directly inside a `position: relative` button/element.
 * Guarantees 100% alignment at every resolution (16:9 & 9:16) and every camera zoom level.
 */
export const AnchoredCursor: React.FC<AnchoredCursorProps> = ({
  startFrame,
  arriveFrame,
  clickFrame,
  endFrame,
  fromX = -160,
  fromY = 110,
  targetX = '50%',
  targetY = '50%',
  rippleColor = 'rgba(255, 255, 255, 0.9)',
  dragChip,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const rawT = interpolate(frame, [startFrame, arriveFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Smooth cubic ease-out (Screen Studio natural pointer glide)
  const eased = 1 - Math.pow(1 - rawT, 3);

  const dx = fromX * (1 - eased);
  const dy = fromY * (1 - eased);

  const fadeIn = interpolate(frame, [startFrame, startFrame + 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [endFrame - 6, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const isClicking = frame >= clickFrame - 2 && frame < clickFrame + 7;
  const ripple =
    frame >= clickFrame && frame < clickFrame + 18
      ? interpolate(frame - clickFrame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })
      : null;

  return (
    <div
      style={{
        position: 'absolute',
        left: targetX,
        top: targetY,
        transform: `translate(${dx}px, ${dy}px) scale(${isClicking ? 0.86 : 1})`,
        transformOrigin: 'top left',
        opacity: fadeIn * fadeOut,
        pointerEvents: 'none',
        zIndex: 995,
      }}
    >
      {ripple !== null && (
        <div
          style={{
            position: 'absolute',
            left: 2,
            top: 2,
            width: 12 + ripple * 40,
            height: 12 + ripple * 40,
            borderRadius: '50%',
            border: `2px solid ${rippleColor}`,
            transform: 'translate(-50%, -50%)',
            opacity: (1 - ripple) * 0.9,
          }}
        />
      )}
      {dragChip && frame < clickFrame && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 12,
            whiteSpace: 'nowrap',
          }}
        >
          {dragChip}
        </div>
      )}
      <svg
        width="26"
        height="32"
        viewBox="0 0 24 30"
        fill="none"
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6))' }}
      >
        <path
          d="M2 2L2 23L7.5 18L11.5 26.5L14.8 25L10.8 16.5L18.5 16.5L2 2Z"
          fill="#111318"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
