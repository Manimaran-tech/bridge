import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { GridBackground } from '../components/common/GridBackground';
import { THEME } from '../theme';

const DEMO_MCP_URL = ['https', '://', 'bright-spark-42', '.', 'trycloudflare', '.', 'com/mcp'].join('');

// Scene 3: 290 frames (9.67s)
// Realistic Windows Terminal running `npx @markmayandi/bridge ./gemini-test-project`
// Renders the exact LN4 Volt Bridge CLI Dashboard from bridge.js
export const Scene3Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const command = 'npx @markmayandi/bridge ./gemini-test-project';
  const typedCount = Math.floor(
    interpolate(frame, [10, 68], [0, command.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const entered = frame >= 76;
  const tunnelReady = frame >= 122;
  const copiedFlash = frame >= 146;

  const dashboardSpring = spring({
    frame: Math.max(0, frame - 82),
    fps,
    config: { damping: 16, stiffness: 150 },
  });

  const tunnelProgress = interpolate(frame, [82, 122], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeSpring = spring({
    frame: Math.max(0, frame - 155),
    fps,
    config: { damping: 14, stiffness: 170 },
  });

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#080A0D',
        position: 'relative',
        overflow: 'hidden',
        padding: '104px 36px 260px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <GridBackground glowColor={THEME.palette.primaryVolt} intensity={0.9} />

      {/* Top Step Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <div
          style={{
            fontFamily: THEME.typography.mono,
            fontSize: 16,
            fontWeight: 800,
            color: THEME.palette.primaryVolt,
            backgroundColor: 'rgba(210, 255, 0, 0.14)',
            border: '1px solid rgba(210, 255, 0, 0.45)',
            padding: '7px 16px',
            borderRadius: 999,
            letterSpacing: '0.1em',
          }}
        >
          STEP 1 • ONE COMMAND
        </div>
        <div style={{ fontFamily: THEME.typography.mono, fontSize: 15, color: '#94A3B8' }}>
          ZERO CONFIG • ZERO INSTALL
        </div>
      </div>

      {/* Authentic Windows Terminal Window */}
      <div
        style={{
          flex: 1,
          backgroundColor: '#0C0E12',
          borderRadius: 20,
          border: tunnelReady
            ? `1.5px solid ${THEME.palette.primaryVolt}88`
            : '1.5px solid #2A3040',
          boxShadow: tunnelReady
            ? '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 36px rgba(210, 255, 0, 0.14)'
            : '0 24px 64px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Windows Terminal Tab Header */}
        <div
          style={{
            height: 48,
            backgroundColor: '#161922',
            borderBottom: '1px solid #262C3A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                backgroundColor: '#0C0E12',
                border: '1px solid #2A3040',
                borderRadius: 8,
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: THEME.typography.mono,
                fontSize: 13.5,
                color: '#E2E8F0',
                fontWeight: 700,
              }}
            >
              <span style={{ color: '#38BDF8' }}>&gt;_</span>
              <span>PowerShell — bridge</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27C93F' }} />
          </div>
        </div>

        {/* Terminal Body */}
        <div
          style={{
            flex: 1,
            padding: '24px 26px',
            fontFamily: THEME.typography.mono,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Command Prompt Line */}
          <div style={{ fontSize: 20, lineHeight: 1.5, color: '#F8FAFC' }}>
            <span style={{ color: '#60A5FA', fontWeight: 700 }}>PS C:\tmp\interview&gt; </span>
            <span style={{ color: THEME.palette.primaryVolt, fontWeight: 700 }}>
              {command.slice(0, typedCount)}
            </span>
            {!entered && (
              <span
                style={{
                  display: 'inline-block',
                  width: 11,
                  height: 22,
                  backgroundColor: THEME.palette.primaryVolt,
                  marginLeft: 3,
                  verticalAlign: 'middle',
                  opacity: Math.floor(frame / 10) % 2 === 0 ? 1 : 0,
                }}
              />
            )}
          </div>

          {/* Bridge CLI Live Dashboard (matching bridge.js output) */}
          {entered && (
            <div
              style={{
                opacity: dashboardSpring,
                transform: `translateY(${(1 - dashboardSpring) * 16}px)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Thick Volt Top Bar */}
              <div style={{ height: 3, backgroundColor: THEME.palette.primaryVolt, width: '100%' }} />

              {/* Header with Real Bridge Logo + Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Img
                    src={staticFile('assets/bridge_logo_transparent.png')}
                    style={{ height: 42, width: 'auto' }}
                  />
                  <span style={{ fontSize: 15, color: '#94A3B8', fontWeight: 700 }}>
                    // UNIVERSAL LOCAL-TO-WEB AI HARNESS
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: tunnelReady ? THEME.palette.primaryVolt : '#FBBF24',
                  }}
                >
                  {tunnelReady ? '● STATUS: ONLINE' : '◌ STARTING TUNNEL...'}
                </div>
              </div>

              {/* Bridge Wireframe ASCII Art */}
              <pre
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.25,
                  color: THEME.palette.primaryVolt,
                  textShadow: '0 0 12px rgba(210, 255, 0, 0.35)',
                  opacity: 0.9,
                }}
              >
{`           /\\                                     /\\
          /||\\  . . . . . . . . . . . . . . . .  /||\\
      . '/ || \\' .                           . '/ || \\' .
   . '  /  ||  \\  ' .                     . '  /  ||  \\  ' .
 =======|==||==|===============================|==||==|=======
        |  ||  |       ANYCAST MCP TUNNEL      |  ||  |`}
              </pre>

              {/* Tunnel Initialization Progress Bar (frames 82..122) */}
              {!tunnelReady && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 14, color: '#94A3B8' }}>
                    INITIALIZING SECURE CLOUDFLARE ANYCAST TUNNEL... {Math.round(tunnelProgress)}%
                  </div>
                  <div style={{ width: '100%', height: 10, backgroundColor: '#1E2430', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${tunnelProgress}%`,
                        height: '100%',
                        backgroundColor: THEME.palette.primaryVolt,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Exact bridge.js Info Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 17 }}>
                  <span
                    style={{
                      backgroundColor: THEME.palette.primaryVolt,
                      color: '#090B0E',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: 4,
                      minWidth: 112,
                      textAlign: 'center',
                    }}
                  >
                    PROJECT
                  </span>
                  <span style={{ color: '#FFFFFF', fontWeight: 700 }}>
                    C:\tmp\interview\gemini-test-project
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 17 }}>
                  <span
                    style={{
                      backgroundColor: THEME.palette.primaryVolt,
                      color: '#090B0E',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: 4,
                      minWidth: 112,
                      textAlign: 'center',
                    }}
                  >
                    JAILED
                  </span>
                  <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>
                    STRICTLY ENFORCED
                  </span>
                  <span style={{ color: '#64748B', fontSize: 14 }}>
                    (Zero access outside folder)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 17 }}>
                  <span
                    style={{
                      backgroundColor: THEME.palette.primaryVolt,
                      color: '#090B0E',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: 4,
                      minWidth: 112,
                      textAlign: 'center',
                    }}
                  >
                    MCP URL
                  </span>
                  {tunnelReady ? (
                    <span
                      style={{
                        color: '#50C8FF',
                        fontWeight: 800,
                        textShadow: '0 0 14px rgba(80, 200, 255, 0.45)',
                      }}
                    >
                      {DEMO_MCP_URL}
                    </span>
                  ) : (
                    <span style={{ color: '#64748B' }}>Establishing secure tunnel...</span>
                  )}
                </div>
              </div>

              {/* Auto-Copied Flash Notification */}
              {copiedFlash && (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.16)',
                    border: '1.5px solid #10B981',
                    borderRadius: 12,
                    padding: '12px 18px',
                    color: '#34D399',
                    fontSize: 16.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>✓ LIVE MCP URL AUTOMATICALLY COPIED TO CLIPBOARD</span>
                  <span style={{ color: '#A7F3D0', fontSize: 13 }}>READY TO PASTE</span>
                </div>
              )}

              <div style={{ height: 1, backgroundColor: '#252C3A' }} />

              {/* Real bridge.js Keyboard Shortcuts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
                <div style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>
                  KEYBOARD ACTIONS:
                </div>
                <div style={{ display: 'flex', gap: 28, color: '#E2E8F0' }}>
                  <span>
                    <strong style={{ color: THEME.palette.primaryVolt }}>[C]</strong> Copy MCP URL
                  </span>
                  <span>
                    <strong style={{ color: THEME.palette.primaryVolt }}>[D]</strong> Switch Project Folder
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 28, color: '#E2E8F0' }}>
                  <span>
                    <strong style={{ color: THEME.palette.primaryVolt }}>[L]</strong> Live Activity Logs (
                    <strong style={{ color: THEME.palette.primaryVolt }}>ON</strong>)
                  </span>
                  <span>
                    <strong style={{ color: THEME.palette.primaryVolt }}>[Q]</strong> Stop &amp; Exit
                  </span>
                </div>
              </div>

              <div style={{ height: 3, backgroundColor: THEME.palette.primaryVolt, width: '100%' }} />

              {/* Waiting for AI Logs */}
              <div style={{ fontSize: 14.5, color: '#94A3B8' }}>
                <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>
                  LIVE HARNESS TRAFFIC:
                </span>{' '}
                Listening on 127.0.0.1 • Ready for Gemini, ChatGPT, Claude...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 2 Feature Callout Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
          opacity: badgeSpring,
          transform: `translateY(${(1 - badgeSpring) * 18}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: '#121620',
            border: '1.5px solid rgba(210, 255, 0, 0.35)',
            borderRadius: 16,
            padding: '16px 20px',
          }}
        >
          <div style={{ fontFamily: THEME.typography.mono, fontSize: 13, color: THEME.palette.primaryVolt, fontWeight: 800 }}>
            🔒 STRICT FOLDER JAIL
          </div>
          <div style={{ fontFamily: THEME.typography.display, fontSize: 18, color: '#E2E8F0', fontWeight: 600, marginTop: 4 }}>
            Only sees gemini-test-project
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#121620',
            border: '1.5px solid rgba(80, 200, 255, 0.35)',
            borderRadius: 16,
            padding: '16px 20px',
          }}
        >
          <div style={{ fontFamily: THEME.typography.mono, fontSize: 13, color: '#50C8FF', fontWeight: 800 }}>
            ⚡ CLOUDFLARE ANYCAST
          </div>
          <div style={{ fontFamily: THEME.typography.display, fontSize: 18, color: '#E2E8F0', fontWeight: 600, marginTop: 4 }}>
            No port forwarding or JSON
          </div>
        </div>
      </div>
    </div>
  );
};
