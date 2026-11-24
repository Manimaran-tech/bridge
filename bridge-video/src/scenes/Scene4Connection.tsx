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
import { Cursor } from '../components/common/Cursor';
import { THEME } from '../theme';

const GEMINI_ADDR = ['gemini', 'google', 'com'].join('.') + '/app';
const DEMO_MCP_URL = ['https', '://', 'bright-spark-42', '.', 'trycloudflare', '.', 'com/mcp'].join('');
const PLACEHOLDER_MCP_URL = ['Paste ', 'https', '://...', 'trycloudflare', '.', 'com/mcp'].join('');

// Scene 4: 408 frames (13.60s)
// 0..118: Paste MCP URL into Gemini Connectors Modal & click Connect
// 118..408: Live Split Demo — Top: Gemini Web Chat calling @Bridge read_file & edit_file on gemini-test-project
//           Bottom: Real Bridge CLI Live Traffic Logs streaming every tool call
export const Scene4Connection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: MCP Connector Modal (0..118)
  const isModalPhase = frame < 118;
  const pasted = frame >= 36;
  const connectClicked = frame >= 76;

  const cursorX = interpolate(frame, [45, 72], [520, 745], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorY = interpolate(frame, [45, 72], [860, 1005], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase 2: Live Gemini Chat + Bridge Logs (118..408)
  const localFrame = Math.max(0, frame - 118);
  const promptText = '@Bridge add sortByPriority() to todo-logic.js and run node --test';
  const typedLen = Math.floor(
    interpolate(localFrame, [6, 54], [0, promptText.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const sent = localFrame >= 62;
  const readDone = localFrame >= 102;
  const editShown = localFrame >= 122;
  const editDone = localFrame >= 188;
  const testEditDone = localFrame >= 224;

  const diffSpring = spring({
    frame: Math.max(0, localFrame - 122),
    fps,
    config: { damping: 16, stiffness: 150 },
  });

  const logs = [
    {
      at: 66,
      ts: '12:04:10',
      method: 'tools/call',
      tool: 'read_file',
      detail: 'todo-logic.js (94 lines)',
      status: '200 OK',
    },
    {
      at: 126,
      ts: '12:04:11',
      method: 'tools/call',
      tool: 'edit_file',
      detail: 'todo-logic.js (+11 -1 lines)',
      status: 'SAVED',
    },
    {
      at: 194,
      ts: '12:04:12',
      method: 'tools/call',
      tool: 'edit_file',
      detail: 'tests/todo.test.js (+8 lines)',
      status: 'SAVED',
    },
    {
      at: 235,
      ts: '12:04:13',
      method: 'tools/call',
      tool: 'execute_command',
      detail: 'node --test',
      status: 'RUNNING',
    },
  ];

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#0A0B0E',
        position: 'relative',
        overflow: 'hidden',
        padding: '104px 36px 255px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <GridBackground glowColor="#50C8FF" intensity={0.85} />

      {/* Top Step Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
        <div
          style={{
            fontFamily: THEME.typography.mono,
            fontSize: 16,
            fontWeight: 800,
            color: '#50C8FF',
            backgroundColor: 'rgba(80, 200, 255, 0.14)',
            border: '1px solid rgba(80, 200, 255, 0.45)',
            padding: '7px 16px',
            borderRadius: 999,
            letterSpacing: '0.1em',
          }}
        >
          STEP 2 • LIVE DEMO ON GEMINI-TEST-PROJECT
        </div>
        <div
          style={{
            fontFamily: THEME.typography.mono,
            fontSize: 14,
            fontWeight: 800,
            color: THEME.palette.primaryVolt,
          }}
        >
          ● BRIDGE MCP ACTIVE
        </div>
      </div>

      {/* TOP / MAIN WINDOW: AUTHENTIC GEMINI WEB INTERFACE */}
      <div
        style={{
          flex: isModalPhase ? 1 : 1.55,
          backgroundColor: '#131314',
          borderRadius: 22,
          border: '1.5px solid #2C303A',
          boxShadow: '0 24px 60px rgba(0,0,0,0.78)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Chrome + Gemini Header */}
        <div
          style={{
            height: 44,
            backgroundColor: '#1B1C1F',
            borderBottom: '1px solid #2A2B2F',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#FF5F56' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#27C93F' }} />
            </div>
            <span style={{ fontFamily: THEME.typography.mono, fontSize: 13, color: '#9CA3AF', marginLeft: 8 }}>
              🔒 {GEMINI_ADDR}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(210, 255, 0, 0.14)',
              border: '1px solid rgba(210, 255, 0, 0.45)',
              borderRadius: 999,
              padding: '3px 12px',
              fontFamily: THEME.typography.mono,
              fontSize: 12,
              fontWeight: 800,
              color: THEME.palette.primaryVolt,
            }}
          >
            <span>●</span>
            <span>@Bridge Connected</span>
          </div>
        </div>

        {/* PHASE 1: MCP CONNECTOR MODAL */}
        {isModalPhase ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 36,
              background: 'radial-gradient(circle at 50% 35%, rgba(80, 200, 255, 0.08), transparent 65%)',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 820,
                backgroundColor: '#1E1F22',
                border: connectClicked
                  ? `2px solid ${THEME.palette.primaryVolt}`
                  : '1.5px solid #3C4049',
                borderRadius: 24,
                padding: '34px 36px',
                boxShadow: connectClicked
                  ? '0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(210, 255, 0, 0.22)'
                  : '0 24px 60px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: '#101318',
                      border: `1.5px solid ${THEME.palette.primaryVolt}66`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                    }}
                  >
                    <Img
                      src={staticFile('assets/bridge_icon.jpg')}
                      style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: THEME.typography.display, fontSize: 26, fontWeight: 800, color: '#FFFFFF' }}>
                      Connect Custom MCP Server
                    </div>
                    <div style={{ fontFamily: THEME.typography.display, fontSize: 16, color: '#9CA3AF' }}>
                      Paste your Bridge live endpoint once — works across sessions
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: THEME.typography.mono, fontSize: 13, color: '#9CA3AF', fontWeight: 700 }}>
                  SERVER NAME
                </label>
                <div
                  style={{
                    backgroundColor: '#131417',
                    border: '1px solid #353842',
                    borderRadius: 12,
                    padding: '14px 18px',
                    fontFamily: THEME.typography.mono,
                    fontSize: 19,
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  Bridge
                </div>
              </div>

              {/* MCP URL Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontFamily: THEME.typography.mono, fontSize: 13, color: '#9CA3AF', fontWeight: 700 }}>
                    MCP ENDPOINT URL
                  </label>
                  {pasted && (
                    <span
                      style={{
                        fontFamily: THEME.typography.mono,
                        fontSize: 12,
                        fontWeight: 800,
                        color: THEME.palette.primaryVolt,
                        backgroundColor: 'rgba(210, 255, 0, 0.14)',
                        padding: '3px 10px',
                        borderRadius: 6,
                      }}
                    >
                      CTRL + V PASTED
                    </span>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: '#131417',
                    border: pasted ? '1.5px solid #50C8FF' : '1px solid #353842',
                    borderRadius: 12,
                    padding: '16px 18px',
                    fontFamily: THEME.typography.mono,
                    fontSize: 18,
                    color: pasted ? '#50C8FF' : '#64748B',
                    fontWeight: 700,
                  }}
                >
                  {pasted ? DEMO_MCP_URL : PLACEHOLDER_MCP_URL}
                </div>
              </div>

              {/* Action Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <div style={{ fontFamily: THEME.typography.mono, fontSize: 14, color: connectClicked ? '#34D399' : '#94A3B8', fontWeight: 700 }}>
                  {connectClicked
                    ? '✓ Connected! 8 local tools active (read, edit, execute_command...)'
                    : 'Jailed to C:\\tmp\\interview\\gemini-test-project'}
                </div>
                <div
                  style={{
                    padding: '14px 32px',
                    borderRadius: 14,
                    backgroundColor: connectClicked ? '#10B981' : THEME.palette.primaryVolt,
                    color: '#090B0E',
                    fontFamily: THEME.typography.display,
                    fontSize: 18,
                    fontWeight: 900,
                    boxShadow: connectClicked
                      ? '0 0 28px rgba(16, 185, 129, 0.5)'
                      : '0 0 28px rgba(210, 255, 0, 0.45)',
                  }}
                >
                  {connectClicked ? '✓ Connected' : 'Connect'}
                </div>
              </div>
            </div>

            <Cursor
              x={cursorX}
              y={cursorY}
              isClicking={frame >= 74 && frame < 84}
              clickFrame={76}
              label={connectClicked ? 'Connected!' : 'Connect MCP'}
            />
          </div>
        ) : (
          /* PHASE 2: REAL GEMINI CHAT CALLING BRIDGE TOOLS ON todo-logic.js */
          <div
            style={{
              flex: 1,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* User Prompt Bubble */}
              {sent && (
                <div style={{ alignSelf: 'flex-end', maxWidth: '90%' }}>
                  <div
                    style={{
                      backgroundColor: '#282A2E',
                      border: '1px solid #3C4048',
                      borderRadius: '20px 4px 20px 20px',
                      padding: '14px 20px',
                      fontFamily: THEME.typography.display,
                      fontSize: 19,
                      color: '#FFFFFF',
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>@Bridge</span>{' '}
                    add <span style={{ fontFamily: THEME.typography.mono, color: '#93C5FD' }}>sortByPriority()</span> to{' '}
                    <span style={{ fontFamily: THEME.typography.mono, color: '#93C5FD' }}>todo-logic.js</span> and run{' '}
                    <span style={{ fontFamily: THEME.typography.mono, color: '#34D399' }}>node --test</span>
                  </div>
                </div>
              )}

              {/* Gemini AI Tool Execution Stream */}
              {sent && (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4285F4, #9B72CB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 18,
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  >
                    ✦
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Tool Call 1: read_file */}
                    <div
                      style={{
                        backgroundColor: '#1B1E24',
                        border: '1px solid #303645',
                        borderRadius: 12,
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: THEME.typography.mono,
                        fontSize: 14.5,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: readDone ? '#10B981' : '#FBBF24', fontWeight: 900 }}>
                          {readDone ? '✓' : '◌'}
                        </span>
                        <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>Bridge</span>
                        <span style={{ color: '#94A3B8' }}>·</span>
                        <span style={{ color: '#E2E8F0' }}>read_file(&quot;todo-logic.js&quot;)</span>
                      </div>
                      <span style={{ color: '#64748B', fontSize: 13 }}>
                        {readDone ? '94 lines read' : 'reading...'}
                      </span>
                    </div>

                    {/* Tool Call 2: Surgical edit_file with real unified diff */}
                    {editShown && (
                      <div
                        style={{
                          opacity: diffSpring,
                          transform: `translateY(${(1 - diffSpring) * 14}px)`,
                          backgroundColor: '#181B22',
                          border: editDone
                            ? '1.5px solid rgba(16, 185, 129, 0.55)'
                            : '1.5px solid rgba(210, 255, 0, 0.45)',
                          borderRadius: 14,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#212530',
                            padding: '10px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontFamily: THEME.typography.mono,
                            fontSize: 14,
                            borderBottom: '1px solid #2F3545',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: editDone ? '#10B981' : THEME.palette.primaryVolt, fontWeight: 900 }}>
                              {editDone ? '✓' : '⚡'}
                            </span>
                            <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>Bridge</span>
                            <span style={{ color: '#E2E8F0' }}>edit_file(&quot;todo-logic.js&quot;)</span>
                          </div>
                          <span style={{ color: '#34D399', fontWeight: 800 }}>
                            {editDone ? 'APPLIED TO DISK' : 'PATCHING...'}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: '12px 16px',
                            fontFamily: THEME.typography.mono,
                            fontSize: 14,
                            lineHeight: 1.55,
                          }}
                        >
                          <div style={{ color: '#94A3B8' }}>
                            {'  '}const VALID_PRIORITIES = new Set([&apos;low&apos;, &apos;medium&apos;, &apos;high&apos;]);
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            + const PRIORITY_RANK = {'{ high: 0, medium: 1, low: 2 }'};
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            + function sortByPriority(todos) {'{'}
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            +   return [...todos].sort((a, b) =&gt;
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            +     PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            +   );
                          </div>
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', color: '#6EE7B7', padding: '1px 6px', borderRadius: 4 }}>
                            + {'}'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tool Call 3: Updated unit tests */}
                    {testEditDone && (
                      <div
                        style={{
                          backgroundColor: '#1B1E24',
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          borderRadius: 12,
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: THEME.typography.mono,
                          fontSize: 14.5,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: '#10B981', fontWeight: 900 }}>✓</span>
                          <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>Bridge</span>
                          <span style={{ color: '#E2E8F0' }}>edit_file(&quot;tests/todo.test.js&quot;)</span>
                        </div>
                        <span style={{ color: '#34D399', fontWeight: 700 }}>+1 test added</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Composer before prompt is sent */}
            {!sent && (
              <div
                style={{
                  backgroundColor: '#1E1F20',
                  border: `1.5px solid ${THEME.palette.primaryVolt}88`,
                  borderRadius: 22,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ fontFamily: THEME.typography.display, fontSize: 19, color: '#FFFFFF' }}>
                  {promptText.slice(0, typedLen)}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2.5,
                      height: 20,
                      backgroundColor: THEME.palette.primaryVolt,
                      marginLeft: 3,
                      verticalAlign: 'middle',
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: THEME.palette.primaryVolt,
                    color: '#090B0E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ↑
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM LIVE TERMINAL: BRIDGE LIVE HARNESS TRAFFIC (visible during Phase 2) */}
      {!isModalPhase && (
        <div
          style={{
            flex: 0.72,
            backgroundColor: '#0C0E12',
            borderRadius: 20,
            border: `1.5px solid ${THEME.palette.primaryVolt}66`,
            boxShadow: '0 18px 44px rgba(0, 0, 0, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 40,
              backgroundColor: '#151922',
              borderBottom: '1px solid #252B39',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: THEME.typography.mono,
              fontSize: 13,
            }}
          >
            <span style={{ color: THEME.palette.primaryVolt, fontWeight: 800 }}>
              ● LIVE HARNESS TRAFFIC — C:\tmp\interview\gemini-test-project
            </span>
            <span style={{ color: '#34D399', fontWeight: 700 }}>ZERO COPY-PASTE</span>
          </div>

          <div
            style={{
              flex: 1,
              padding: '14px 18px',
              fontFamily: THEME.typography.mono,
              fontSize: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {logs.filter((l) => localFrame >= l.at).length === 0 ? (
              <div style={{ color: '#64748B' }}>
                [12:04:09] Tunnel healthy — waiting for Gemini MCP request...
              </div>
            ) : (
              logs
                .filter((l) => localFrame >= l.at)
                .map((log, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderLeft: `3px solid ${THEME.palette.primaryVolt}`,
                      padding: '6px 12px',
                      borderRadius: '0 8px 8px 0',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B' }}>[{log.ts}] </span>
                      <span style={{ color: '#50C8FF', fontWeight: 700 }}>{log.tool}</span>{' '}
                      <span style={{ color: '#E2E8F0' }}>{log.detail}</span>
                    </div>
                    <span
                      style={{
                        color: log.status === 'RUNNING' ? '#FBBF24' : '#34D399',
                        fontWeight: 800,
                        fontSize: 12.5,
                      }}
                    >
                      {log.status}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
