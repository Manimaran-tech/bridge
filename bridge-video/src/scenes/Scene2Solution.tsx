import React from 'react';
import {
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FolderLock, Globe, ShieldCheck } from 'lucide-react';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 2: 285 frames (9.50s) — Clean Editorial Meet Bridge Reveal
export const Scene2Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  // Purposeful studio camera framing: Logo -> Headline -> Architecture Flow -> Full Pullback
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.12, focusX: 0.5, focusY: 0.36, hardCut: true, flashColor: '#D2FF00' },
    { startFrame: 44, zoom: isLandscape ? 1.18 : 1.12, focusX: isLandscape ? 0.58 : 0.5, focusY: 0.42 },
    { startFrame: 112, zoom: isLandscape ? 1.18 : 1.12, focusX: 0.5, focusY: 0.68, hardCut: true, flashColor: '#50C8FF' },
    { startFrame: 204, zoom: 1.0, focusX: 0.5, focusY: 0.5 },
  ]);

  const badgeSpring = spring({ frame, fps, config: { damping: 12, stiffness: 250, mass: 0.55 } });
  const logoSpring = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 11, stiffness: 230, mass: 0.6 },
  });
  const textSpring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { damping: 13, stiffness: 230 },
  });
  const archSpring = spring({
    frame: Math.max(0, frame - 52),
    fps,
    config: { damping: 13, stiffness: 220 },
  });

  const maxShiftX = ((cam.zoom - 1) / cam.zoom) * width * 0.5;
  const maxShiftY = ((cam.zoom - 1) / cam.zoom) * height * 0.5;
  const tx = Math.max(-maxShiftX, Math.min(maxShiftX, (0.5 - cam.focusX) * width * (cam.zoom - 1))) + cam.shakeX;
  const ty = Math.max(-maxShiftY, Math.min(maxShiftY, (0.5 - cam.focusY) * height * (cam.zoom - 1))) + cam.shakeY;

  const pulseOffset = (frame * 7) % 100;
  const activePlatformIdx = frame >= 120 ? Math.floor((frame - 120) / 14) % 4 : -1;

  const platforms = [
    { name: 'Gemini', icon: 'assets/gemini-icon.svg' },
    { name: 'ChatGPT', icon: 'assets/chatgpt-icon.svg' },
    { name: 'Claude', icon: 'assets/claude-icon.svg' },
    { name: 'DeepSeek', icon: 'assets/deepseek-icon.svg' },
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
      <div
        style={{
          width,
          height,
          position: 'relative',
          transform: `translate(${tx}px, ${ty}px) scale(${cam.zoom}) rotate(${cam.tiltDeg}deg)`,
          transformOrigin: '50% 50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isLandscape ? '50px 96px 130px' : '90px 44px 230px',
        }}
      >
        {/* Radial Studio Backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 34%, rgba(210, 255, 0, 0.16) 0%, rgba(80, 200, 255, 0.07) 38%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: isLandscape ? 1420 : 980,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isLandscape ? 28 : 34,
            zIndex: 2,
          }}
        >
          {/* Eyebrow Pill */}
          <div
            style={{
              opacity: badgeSpring,
              transform: `translateY(${(1 - badgeSpring) * 14}px) scale(${0.9 + badgeSpring * 0.1})`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: THEME.typography.mono,
              fontSize: isLandscape ? 15 : 16,
              fontWeight: 800,
              color: THEME.palette.primaryVolt,
              backgroundColor: 'rgba(210, 255, 0, 0.12)',
              border: '1.5px solid rgba(210, 255, 0, 0.5)',
              padding: '7px 20px',
              borderRadius: 999,
              letterSpacing: '0.12em',
              boxShadow: '0 0 24px rgba(210, 255, 0, 0.22)',
            }}
          >
            <ShieldCheck size={17} />
            <span>OPEN-SOURCE LOCAL-TO-WEB AI HARNESS • 24 SANDBOXED TOOLS</span>
          </div>

          {/* Real Bridge Logo + Headline */}
          <div
            style={{
              display: 'flex',
              flexDirection: isLandscape ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isLandscape ? 48 : 28,
              width: '100%',
            }}
          >
            <div
              style={{
                opacity: logoSpring,
                transform: `scale(${0.76 + logoSpring * 0.24})`,
                backgroundColor: '#12151C',
                border: '1.5px solid rgba(210, 255, 0, 0.45)',
                borderRadius: 26,
                padding: isLandscape ? '28px 46px' : '28px 48px',
                boxShadow: '0 22px 60px rgba(0, 0, 0, 0.72), 0 0 36px rgba(210, 255, 0, 0.18)',
                flexShrink: 0,
              }}
            >
              <Img
                src={staticFile('assets/bridge_logo_transparent.png')}
                style={{
                  width: isLandscape ? 420 : 500,
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>

            <div
              style={{
                opacity: textSpring,
                transform: `translateY(${(1 - textSpring) * 20}px)`,
                textAlign: isLandscape ? 'left' : 'center',
              }}
            >
              <div
                style={{
                  fontFamily: THEME.typography.display,
                  fontSize: isLandscape ? 60 : 56,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1.06,
                  letterSpacing: '-0.03em',
                }}
              >
                Your Local Codebase.
                <br />
                <span style={{ color: THEME.palette.primaryVolt }}>Any Web LLM.</span>
              </div>
              <div
                style={{
                  fontFamily: THEME.typography.display,
                  fontSize: isLandscape ? 21 : 22,
                  color: '#9CA3AF',
                  marginTop: 12,
                  lineHeight: 1.45,
                }}
              >
                Read files, apply diffs, inspect git, and run terminal tests directly on disk.
              </div>
            </div>
          </div>

          {/* Clean Architecture Strip with Animated Platform Wave */}
          <div
            style={{
              width: '100%',
              opacity: archSpring,
              transform: `translateY(${(1 - archSpring) * 24}px)`,
              backgroundColor: '#11141B',
              border: '1.5px solid #2D3546',
              borderRadius: 22,
              padding: isLandscape ? '24px 30px' : '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: '0 20px 52px rgba(0, 0, 0, 0.65)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#161A24',
                  border: '1.5px solid rgba(210, 255, 0, 0.35)',
                  borderRadius: 14,
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <FolderLock size={26} color={THEME.palette.primaryVolt} />
                <div>
                  <div style={{ fontFamily: THEME.typography.mono, fontSize: 12, color: THEME.palette.primaryVolt, fontWeight: 800 }}>
                    LOCAL PROJECT JAIL • 24 TOOLS
                  </div>
                  <div style={{ fontFamily: THEME.typography.mono, fontSize: 16, color: '#FFFFFF', fontWeight: 700, marginTop: 2 }}>
                    C:\tmp\interview\gemini-test-project
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: isLandscape ? 220 : 140 }}>
                <Img src={staticFile('assets/cloudflare-icon.svg')} style={{ width: 30, height: 30, borderRadius: 6 }} />
                <div style={{ width: '100%', height: 5, backgroundColor: '#232938', borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${pulseOffset - 35}%`,
                      top: 0,
                      width: '48%',
                      height: '100%',
                      background: `linear-gradient(90deg, transparent, ${THEME.palette.primaryVolt}, #50C8FF, transparent)`,
                    }}
                  />
                </div>
                <span style={{ fontFamily: THEME.typography.mono, fontSize: 11, color: '#50C8FF', fontWeight: 800 }}>
                  CLOUDFLARE HTTPS /MCP
                </span>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: '#161A24',
                  border: '1.5px solid rgba(80, 200, 255, 0.35)',
                  borderRadius: 14,
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 14,
                  textAlign: 'right',
                }}
              >
                <div>
                  <div style={{ fontFamily: THEME.typography.mono, fontSize: 12, color: '#50C8FF', fontWeight: 800 }}>
                    CUSTOM MCP CONNECTOR
                  </div>
                  <div style={{ fontFamily: THEME.typography.mono, fontSize: 16, color: '#FFFFFF', fontWeight: 700, marginTop: 2 }}>
                    Browser Web Chat
                  </div>
                </div>
                <Globe size={26} color="#50C8FF" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {platforms.map((p, i) => {
                const pSpring = spring({
                  frame: Math.max(0, frame - (82 + i * 7)),
                  fps,
                  config: { damping: 13, stiffness: 240 },
                });
                const isLit = activePlatformIdx === i;
                return (
                  <div
                    key={p.name}
                    style={{
                      opacity: pSpring,
                      transform: `translateY(${(1 - pSpring) * 14}px) scale(${isLit ? 1.07 : 1})`,
                      backgroundColor: isLit ? '#161E2B' : '#0E1117',
                      border: `1.5px solid ${isLit ? THEME.palette.primaryVolt : '#242B38'}`,
                      borderRadius: 12,
                      padding: isLandscape ? '12px 16px' : '14px 10px',
                      display: 'flex',
                      flexDirection: isLandscape ? 'row' : 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      boxShadow: isLit ? '0 0 20px rgba(210, 255, 0, 0.25)' : 'none',
                    }}
                  >
                    <Img src={staticFile(p.icon)} style={{ width: 32, height: 32, borderRadius: 7 }} />
                    <span style={{ fontFamily: THEME.typography.display, fontSize: 17, fontWeight: 700, color: '#F3F4F6' }}>
                      {p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <FloatingCalloutVfx
        startFrame={116}
        endFrame={276}
        label="Works With Any Web AI"
        sublabel="Gemini · ChatGPT · Claude · DeepSeek"
        accent="#50C8FF"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="MEET BRIDGE · MCP HARNESS"
        stepAccent="#D2FF00"
      />
    </div>
  );
};
