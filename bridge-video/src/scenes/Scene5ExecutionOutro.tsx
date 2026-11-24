import React from 'react';
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from 'remotion';
import { GridBackground } from '../components/common/GridBackground';
import { WindowChrome } from '../components/common/WindowChrome';
import { Badge } from '../components/common/Badge';
import { THEME } from '../theme';

export const Scene5ExecutionOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ACT 5-1: Dual Pane Streaming (0 - 210 relative)
  const logStep = Math.min(
    5,
    Math.floor(
      interpolate(frame, [15, 170], [0, 5], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    )
  );

  const logs = [
    { type: 'REQ', text: '--> tools/call: read_file({"path": "server.js"})', color: THEME.palette.secondaryCyan },
    { type: 'RES', text: '<-- tools/call: 1,544 lines loaded (24KB)', color: THEME.palette.textBody },
    { type: 'REQ', text: '--> tools/call: edit_file({"path": "server.js", "patch": "jwt.verify"})', color: THEME.palette.primaryVolt },
    { type: 'RES', text: '<-- tools/call: atomic patch applied cleanly with backup', color: THEME.palette.successGreen },
    { type: 'REQ', text: '--> tools/call: pwsh({"command": "npm test"})', color: THEME.palette.secondaryCyan },
    { type: 'RES', text: '<-- stdout: running test suite across 14 test cases...', color: THEME.palette.textBody },
  ];

  // ACT 5-2: Test Victory Checkmark (210 - 360 relative)
  const victorySpring = spring({
    frame: Math.max(0, frame - 210),
    fps,
    config: { damping: 10, mass: 0.6, stiffness: 200 },
    from: 0.2,
    to: 1.0,
  });

  const celebrationRing = interpolate(frame, [210, 260], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ACT 5-3: Viral CTA Outro Card (360 - 600 relative)
  const outroSpring = spring({
    frame: Math.max(0, frame - 360),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 160 },
    from: 0.5,
    to: 1.0,
  });

  const outroPulse = interpolate(Math.sin(frame / 8), [-1, 1], [0.8, 1.2]);

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: THEME.palette.bgCanvas,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <GridBackground
        glowColor={frame < 360 ? THEME.palette.successGreen : THEME.palette.primaryVolt}
        intensity={1.3}
      />

      {/* ACT 5-1: Real-Time Dual-Pane Execution (Frames 0 - 210) */}
      {frame < 220 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '80px 48px',
            gap: 32,
            opacity: interpolate(frame, [200, 220], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {/* Top Title */}
          <div style={{ textAlign: 'center' }}>
            <Badge label="REAL-TIME MCP TUNNEL EXECUTION" variant="volt" fontSize={15} />
            <h2
              style={{
                fontFamily: THEME.typography.display,
                fontSize: 50,
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '14px 0 0 0',
                letterSpacing: '-0.03em',
              }}
            >
              Hands-Free Local Coding
            </h2>
          </div>

          {/* Top Pane: Web AI Reasoning & Tool Calling */}
          <div style={{ width: '100%', height: 420 }}>
            <WindowChrome
              title="Claude / ChatGPT Web AI — Active Run"
              borderColor={THEME.palette.secondaryCyan}
              statusBadge="CALLING TOOLS"
              glow
            >
              <div
                style={{
                  padding: 24,
                  backgroundColor: '#0E121B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: THEME.palette.primaryVolt,
                      boxShadow: `0 0 10px ${THEME.palette.primaryVolt}`,
                    }}
                  />
                  <span
                    style={{
                      color: THEME.palette.primaryVolt,
                      fontFamily: THEME.typography.mono,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    Bridge MCP Gateway executing live commands
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#161C2A',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ color: THEME.palette.textBody, fontSize: 16 }}>
                    Analyzing token validation logic in <code style={{ color: THEME.palette.primaryVolt }}>server.js</code>...
                  </div>
                  {frame >= 70 && (
                    <div style={{ color: THEME.palette.successGreen, fontSize: 16, fontWeight: 600 }}>
                      ✓ Applied atomic code patch replacing jwt.decode with jwt.verify
                    </div>
                  )}
                  {frame >= 140 && (
                    <div style={{ color: THEME.palette.secondaryCyan, fontSize: 16, fontWeight: 600 }}>
                      ⚡ Executing powershell test suite locally...
                    </div>
                  )}
                </div>
              </div>
            </WindowChrome>
          </div>

          {/* Bottom Pane: Bridge Daemon Terminal Streaming Traffic */}
          <div style={{ width: '100%', height: 680 }}>
            <WindowChrome
              title="Bridge Terminal — Live JSON-RPC Traffic [L]"
              borderColor={THEME.palette.primaryVolt}
              statusBadge="STREAMING"
              glow
            >
              <div
                style={{
                  padding: '24px 20px',
                  backgroundColor: '#090B0E',
                  fontFamily: THEME.typography.mono,
                  fontSize: 16,
                  lineHeight: 1.6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  height: '100%',
                }}
              >
                {/* Traffic lines */}
                {logs.slice(0, logStep + 1).map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: log.color,
                      wordBreak: 'break-all',
                      padding: '4px 8px',
                      backgroundColor: idx % 2 === 0 ? '#111520' : 'transparent',
                      borderRadius: 6,
                    }}
                  >
                    {log.text}
                  </div>
                ))}

                {/* Code Diff Box at frame 90+ */}
                {frame >= 90 && (
                  <div
                    style={{
                      marginTop: 10,
                      backgroundColor: '#111622',
                      border: '1px solid #1F2738',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 15,
                    }}
                  >
                    <div style={{ color: THEME.palette.textMuted, fontSize: 12, marginBottom: 6 }}>
                      DIFF PATCH: server.js
                    </div>
                    <div style={{ color: THEME.palette.errorRed }}>
                      - const decoded = jwt.decode(token);
                    </div>
                    <div style={{ color: THEME.palette.successGreen, fontWeight: 700 }}>
                      + const verified = jwt.verify(token, process.env.JWT_SECRET);
                    </div>
                  </div>
                )}
              </div>
            </WindowChrome>
          </div>
        </div>
      )}

      {/* ACT 5-2: Test Victory Explosion (Frames 210 - 360) */}
      {frame >= 210 && frame < 370 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px 48px',
            opacity: interpolate(frame, [350, 370], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `scale(${victorySpring})`,
          }}
        >
          {/* Neon Celebration Shockwave Ring */}
          <div
            style={{
              position: 'absolute',
              width: 800 * celebrationRing,
              height: 800 * celebrationRing,
              borderRadius: '50%',
              border: `4px solid ${THEME.palette.successGreen}`,
              boxShadow: `0 0 60px ${THEME.palette.successGreen}`,
              opacity: 1 - celebrationRing,
              pointerEvents: 'none',
            }}
          />

          {/* Huge Victory Checkmark */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              backgroundColor: THEME.palette.successGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              color: '#000000',
              fontWeight: 900,
              boxShadow: `0 0 60px ${THEME.palette.successGlow}`,
              marginBottom: 36,
            }}
          >
            ✓
          </div>

          <Badge label="EXECUTION VERIFIED" variant="success" fontSize={18} />

          <h1
            style={{
              fontFamily: THEME.typography.display,
              fontSize: 72,
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '20px 0 10px 0',
              textAlign: 'center',
              letterSpacing: '-0.03em',
            }}
          >
            14 Tests Passed!
          </h1>

          <div
            style={{
              fontFamily: THEME.typography.mono,
              fontSize: 26,
              color: THEME.palette.primaryVolt,
              fontWeight: 700,
              marginBottom: 40,
            }}
          >
            0 Errors • 320ms Execution Time
          </div>

          {/* Result Card */}
          <div
            style={{
              width: '100%',
              maxWidth: 860,
              backgroundColor: '#0F1814',
              border: `2px solid ${THEME.palette.successGreen}`,
              borderRadius: 20,
              padding: '28px 36px',
              fontFamily: THEME.typography.mono,
              fontSize: 20,
              color: '#FFFFFF',
              boxShadow: `0 10px 40px ${THEME.palette.successGlow}`,
            }}
          >
            <div style={{ color: THEME.palette.successGreen, fontWeight: 800, marginBottom: 8 }}>
              ✔ PASS tests/auth.test.ts (14 tests)
            </div>
            <div style={{ color: THEME.palette.textBody, fontSize: 16 }}>
              All authentication and token validation tests passed on your local machine.
            </div>
          </div>
        </div>
      )}

      {/* ACT 5-3: Viral CTA Outro Card (Frames 360 - 600) */}
      {frame >= 360 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px 48px',
            transform: `scale(${outroSpring})`,
          }}
        >
          {/* Glowing Bridge Brand Emblem */}
          <div
            style={{
              width: 240,
              height: 240,
              position: 'relative',
              marginBottom: 32,
              filter: `drop-shadow(0 0 50px ${THEME.palette.primaryVoltGlowStrong})`,
              transform: `scale(${outroPulse})`,
            }}
          >
            <Img
              src={staticFile('assets/bridge-icon.svg')}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <h1
            style={{
              fontFamily: THEME.typography.display,
              fontSize: 76,
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 12px 0',
              letterSpacing: '-0.04em',
              textShadow: `0 0 40px ${THEME.palette.primaryVoltGlow}`,
              textAlign: 'center',
            }}
          >
            BRIDGE YOUR CODE
          </h1>

          <p
            style={{
              fontFamily: THEME.typography.display,
              fontSize: 26,
              color: THEME.palette.textBody,
              margin: '0 0 48px 0',
              textAlign: 'center',
              maxWidth: 760,
              lineHeight: 1.4,
            }}
          >
            Stop copy-pasting. Connect Claude, ChatGPT, and Gemini directly to your local workspace.
          </p>

          {/* Giant Copy-Ready Terminal Pill */}
          <div
            style={{
              width: '100%',
              maxWidth: 880,
              backgroundColor: '#12171F',
              border: `2px solid ${THEME.palette.primaryVolt}`,
              borderRadius: 24,
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: THEME.shadows.voltNeon,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ color: THEME.palette.primaryVolt, fontSize: 26, fontWeight: 900 }}>$</span>
              <span
                style={{
                  fontFamily: THEME.typography.mono,
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '0.02em',
                }}
              >
                npx @markmayandi/bridge
              </span>
            </div>

            <div
              style={{
                backgroundColor: THEME.palette.primaryVolt,
                color: '#000000',
                fontFamily: THEME.typography.mono,
                fontWeight: 900,
                fontSize: 16,
                padding: '10px 20px',
                borderRadius: 10,
              }}
            >
              RUN NOW
            </div>
          </div>

          {/* GitHub Star Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              backgroundColor: '#161B26',
              border: '1px solid #283248',
              borderRadius: 999,
              padding: '14px 32px',
            }}
          >
            <span style={{ fontSize: 24 }}>⭐</span>
            <span
              style={{
                fontFamily: THEME.typography.mono,
                fontSize: 20,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              github.com/Manimaran-tech/bridge
            </span>
          </div>

          {/* Author Tag */}
          <div
            style={{
              marginTop: 40,
              fontFamily: THEME.typography.mono,
              fontSize: 15,
              color: THEME.palette.textSteel,
              letterSpacing: '0.1em',
            }}
          >
            CREATED BY MANIMARAN • 100% OPEN SOURCE
          </div>
        </div>
      )}
    </div>
  );
};
