import React from 'react';
import {
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Terminal, ShieldCheck, ArrowRight } from 'lucide-react';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
} from '../components/common/RetentionVFX';

const REPO_LABEL = ['github', 'com'].join('.') + '/Manimaran-tech/bridge';

// Scene 8: 256 frames (8.53s) — Clean Editorial Launch CTA Outro
export const Scene8Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  // Smooth studio framing: Logo -> npx CTA -> Full Hero Pullback
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.1, focusX: 0.5, focusY: 0.36, hardCut: true, flashColor: '#D2FF00' },
    { startFrame: 44, zoom: isLandscape ? 1.16 : 1.12, focusX: 0.5, focusY: 0.62 },
    { startFrame: 132, zoom: 1.0, focusX: 0.5, focusY: 0.5 },
  ]);

  const logoSpring = spring({ frame, fps, config: { damping: 11, stiffness: 230, mass: 0.6 } });
  const textSpring = spring({
    frame: Math.max(0, frame - 14),
    fps,
    config: { damping: 13, stiffness: 220 },
  });
  const cmdSpring = spring({
    frame: Math.max(0, frame - 36),
    fps,
    config: { damping: 12, stiffness: 220 },
  });
  const footerSpring = spring({
    frame: Math.max(0, frame - 56),
    fps,
    config: { damping: 14, stiffness: 220 },
  });

  const maxShiftX = ((cam.zoom - 1) / cam.zoom) * width * 0.5;
  const maxShiftY = ((cam.zoom - 1) / cam.zoom) * height * 0.5;
  const tx = Math.max(-maxShiftX, Math.min(maxShiftX, (0.5 - cam.focusX) * width * (cam.zoom - 1))) + cam.shakeX;
  const ty = Math.max(-maxShiftY, Math.min(maxShiftY, (0.5 - cam.focusY) * height * (cam.zoom - 1))) + cam.shakeY;

  const shimmerX = ((frame * 9) % 160) - 30;
  const activeIconIdx = Math.floor(frame / 14) % 5;

  const icons = [
    'assets/gemini-icon.svg',
    'assets/chatgpt-icon.svg',
    'assets/claude-icon.svg',
    'assets/deepseek-icon.svg',
    'assets/cloudflare-icon.svg',
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
          padding: isLandscape ? '56px 110px 130px' : '90px 44px 230px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 38%, rgba(210, 255, 0, 0.18) 0%, rgba(80, 200, 255, 0.07) 42%, transparent 72%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: '100%',
            maxWidth: isLandscape ? 1200 : 940,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isLandscape ? 26 : 32,
            zIndex: 2,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              opacity: logoSpring,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: THEME.typography.mono,
              fontSize: 15,
              fontWeight: 800,
              color: THEME.palette.primaryVolt,
              backgroundColor: 'rgba(210, 255, 0, 0.12)',
              border: '1.5px solid rgba(210, 255, 0, 0.5)',
              padding: '7px 20px',
              borderRadius: 999,
              letterSpacing: '0.14em',
              boxShadow: '0 0 24px rgba(210, 255, 0, 0.24)',
            }}
          >
            <ShieldCheck size={17} />
            <span>FREE • 24 SANDBOXED TOOLS • MIT OPEN SOURCE</span>
          </div>

          <div
            style={{
              opacity: logoSpring,
              transform: `scale(${0.78 + logoSpring * 0.22})`,
              backgroundColor: '#12151C',
              border: '1.5px solid rgba(210, 255, 0, 0.45)',
              borderRadius: 26,
              padding: isLandscape ? '24px 48px' : '28px 48px',
              boxShadow: '0 22px 60px rgba(0, 0, 0, 0.75), 0 0 38px rgba(210, 255, 0, 0.16)',
            }}
          >
            <Img
              src={staticFile('assets/bridge_logo_transparent.png')}
              style={{ width: isLandscape ? 430 : 480, height: 'auto', display: 'block' }}
            />
          </div>

          <div
            style={{
              opacity: textSpring,
              transform: `translateY(${(1 - textSpring) * 20}px)`,
            }}
          >
            <div
              style={{
                fontFamily: THEME.typography.display,
                fontSize: isLandscape ? 68 : 66,
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.04,
                letterSpacing: '-0.035em',
              }}
            >
              BRIDGE YOUR <span style={{ color: THEME.palette.primaryVolt }}>CODE.</span>
            </div>
            <div
              style={{
                fontFamily: THEME.typography.display,
                fontSize: isLandscape ? 22 : 23,
                color: '#9CA3AF',
                marginTop: 10,
              }}
            >
              Stop copy-pasting in 2026. Connect any web LLM directly to your local folder.
            </div>
          </div>

          {/* Primary npx Command CTA with Animated Shimmer Sweep */}
          <div
            style={{
              width: '100%',
              maxWidth: isLandscape ? 820 : 900,
              opacity: cmdSpring,
              transform: `translateY(${(1 - cmdSpring) * 22}px) scale(${0.92 + cmdSpring * 0.08})`,
              backgroundColor: '#11151E',
              border: `2px solid ${THEME.palette.primaryVolt}`,
              borderRadius: 20,
              padding: isLandscape ? '20px 26px' : '22px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow:
                '0 18px 48px rgba(0, 0, 0, 0.78), 0 0 32px rgba(210, 255, 0, 0.22)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer light sweep */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${shimmerX}%`,
                width: '24%',
                background:
                  'linear-gradient(90deg, transparent, rgba(210, 255, 0, 0.16), transparent)',
                transform: 'skewX(-20deg)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
              <Terminal size={26} color={THEME.palette.primaryVolt} />
              <span
                style={{
                  fontFamily: THEME.typography.mono,
                  fontSize: isLandscape ? 28 : 27,
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}
              >
                npx @markmayandi/bridge
              </span>
            </div>
            <div
              style={{
                backgroundColor: THEME.palette.primaryVolt,
                color: '#090B0E',
                fontFamily: THEME.typography.mono,
                fontWeight: 900,
                fontSize: 15,
                padding: '10px 18px',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                transform: `scale(${1 + Math.sin(frame * 0.22) * 0.045})`,
                zIndex: 1,
              }}
            >
              <span>TRY NOW</span>
              <ArrowRight size={17} strokeWidth={3} />
            </div>
          </div>

          {/* GitHub + Ecosystem Strip with Animated Icon Wave */}
          <div
            style={{
              opacity: footerSpring,
              transform: `translateY(${(1 - footerSpring) * 16}px)`,
              display: 'flex',
              flexDirection: isLandscape ? 'row' : 'column',
              alignItems: 'center',
              gap: isLandscape ? 28 : 20,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#151923',
                border: '1.5px solid #354056',
                borderRadius: 999,
                padding: '12px 26px',
              }}
            >
              <Img src={staticFile('assets/github-icon.svg')} style={{ width: 24, height: 24 }} />
              <span style={{ fontFamily: THEME.typography.mono, fontSize: 19, fontWeight: 700, color: '#FFFFFF' }}>
                {REPO_LABEL}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {icons.map((ic, idx) => {
                const isLit = activeIconIdx === idx;
                return (
                  <div
                    key={ic}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      backgroundColor: isLit ? '#1A2030' : '#121620',
                      border: `1.5px solid ${isLit ? THEME.palette.primaryVolt : '#262E3F'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 7,
                      transform: `scale(${isLit ? 1.14 : 1})`,
                      boxShadow: isLit ? '0 0 18px rgba(210, 255, 0, 0.35)' : 'none',
                    }}
                  >
                    <Img src={staticFile(ic)} style={{ width: '100%', height: '100%', borderRadius: 5 }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="TRY IT FREE TODAY"
        stepAccent="#D2FF00"
      />
    </div>
  );
};
