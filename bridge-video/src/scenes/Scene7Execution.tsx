import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { CheckCircle2, FileCode2, Terminal, Loader2, Check } from 'lucide-react';
import { WindowsDesktop } from '../desktop/WindowsDesktop';
import { RealGeminiWeb, GeminiPromptBar } from '../desktop/RealGeminiWeb';
import { RealBridgeTerminal, BridgeLogLine } from '../desktop/RealBridgeTerminal';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 7: 348 frames (11.60s) — Clean Split-Screen Multi-Cam Execution
export const Scene7Execution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  const readDone = frame >= 48;
  const editShown = frame >= 66;
  const editDone = frame >= 142;
  const testShown = frame >= 162;
  const testPassed = frame >= 224;

  // Purposeful split-screen camera cuts between Gemini tool execution and live Bridge terminal logs
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.0, focusX: 0.5, focusY: 0.5, hardCut: true },
    { startFrame: 22, zoom: isLandscape ? 1.24 : 1.16, focusX: isLandscape ? 0.3 : 0.5, focusY: isLandscape ? 0.26 : 0.24 },
    { startFrame: 66, zoom: isLandscape ? 1.28 : 1.18, focusX: isLandscape ? 0.32 : 0.5, focusY: isLandscape ? 0.44 : 0.36 },
    { startFrame: 122, zoom: isLandscape ? 1.26 : 1.16, focusX: isLandscape ? 0.76 : 0.5, focusY: isLandscape ? 0.52 : 0.72, hardCut: true, flashColor: '#50C8FF' },
    { startFrame: 162, zoom: isLandscape ? 1.26 : 1.16, focusX: isLandscape ? 0.32 : 0.5, focusY: isLandscape ? 0.62 : 0.48, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 224, zoom: 1.02, focusX: 0.5, focusY: 0.5, hardCut: true, flashColor: '#34D399' },
  ]);

  const diffSpring = spring({
    frame: Math.max(0, frame - 66),
    fps,
    config: { damping: 13, stiffness: 230 },
  });

  const testSpring = spring({
    frame: Math.max(0, frame - 162),
    fps,
    config: { damping: 13, stiffness: 230 },
  });

  const victorySpring = spring({
    frame: Math.max(0, frame - 224),
    fps,
    config: { damping: 11, stiffness: 250, mass: 0.55 },
  });

  const visibleDiffLines = Math.floor(
    interpolate(frame, [74, 134], [0, 7], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const diffLines = [
    { type: 'ctx', text: "  const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);" },
    { type: 'add', text: "+ const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };" },
    { type: 'add', text: '+ function sortByPriority(todos) {' },
    { type: 'add', text: '+   return [...todos].sort((a, b) =>' },
    { type: 'add', text: '+     PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]' },
    { type: 'add', text: '+   );' },
    { type: 'add', text: '+ }' },
  ];

  const liveLogs: BridgeLogLine[] = [];
  if (frame >= 14) {
    liveLogs.push({
      time: '15:17:01',
      text: '[MCP] tool/call read_file -> todo-logic.js (94 lines, 200 OK)',
      accent: 'cyan',
    });
  }
  if (frame >= 72) {
    liveLogs.push({
      time: '15:17:02',
      text: '[MCP] tool/call edit_file -> todo-logic.js (+6 lines, undo snapshot saved)',
      accent: 'volt',
    });
  }
  if (frame >= 166) {
    liveLogs.push({
      time: '15:17:03',
      text: '[MCP] tool/call execute_command -> node --test (cwd: gemini-test-project)',
      accent: 'cyan',
    });
  }
  if (testPassed) {
    liveLogs.push({
      time: '15:17:03',
      text: '[TEST] PASS tests/todo.test.js — 7/7 passing, 0 failed (42ms, exit 0)',
      accent: 'volt',
    });
  }

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <WindowsDesktop
        activeApp="chrome"
        zoom={cam.zoom}
        focusX={cam.focusX}
        focusY={cam.focusY}
        tiltDeg={cam.tiltDeg}
        shakeX={cam.shakeX}
        shakeY={cam.shakeY}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isLandscape ? 'row' : 'column',
            gap: 10,
            minHeight: 0,
          }}
        >
          {/* LEFT (Landscape) / TOP (Reel): Real Gemini Web Executing Local Bridge Tools */}
          <div style={{ flex: isLandscape ? 1.12 : 1.14, display: 'flex', minWidth: 0, minHeight: 0 }}>
            <RealGeminiWeb
              path="/app"
              activeSidebarItem="chat"
              mcpConnected
              mcpToolCount={24}
              activeModel="Hydrogen"
            >
              <div
                style={{
                  flex: 1,
                  padding: isLandscape ? '16px 22px' : '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Img
                    src={staticFile('assets/gemini-icon.svg')}
                    style={{ width: 26, height: 26, borderRadius: 7, marginTop: 2, flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                    {/* Tool Call 1: read_file */}
                    <div
                      style={{
                        backgroundColor: '#1E1F20',
                        border: readDone ? '1px solid #34A853' : '1px solid #8AB4F8',
                        borderRadius: 12,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: THEME.typography.mono,
                        fontSize: isLandscape ? 12.5 : 13.5,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E3E3E3' }}>
                        {readDone ? (
                          <CheckCircle2 size={15} color="#81C995" />
                        ) : (
                          <Loader2 size={15} color="#8AB4F8" />
                        )}
                        <strong style={{ color: '#A8C7FA' }}>Bridge</strong>
                        <span>read_file(&quot;todo-logic.js&quot;)</span>
                      </span>
                      <span style={{ color: readDone ? '#81C995' : '#9AA0A6', fontSize: 12, fontWeight: 700 }}>
                        {readDone ? '✓ 94 lines' : 'reading...'}
                      </span>
                    </div>

                    {/* Tool Call 2: edit_file Surgical Diff */}
                    {editShown && (
                      <div
                        style={{
                          opacity: diffSpring,
                          transform: `translateY(${(1 - diffSpring) * 14}px) scale(${0.96 + diffSpring * 0.04})`,
                          backgroundColor: '#1E1F20',
                          border: editDone ? '1.5px solid #34A853' : '1.5px solid #D2FF00',
                          borderRadius: 12,
                          overflow: 'hidden',
                          boxShadow: editDone ? '0 0 20px rgba(52, 168, 83, 0.16)' : '0 0 18px rgba(210, 255, 0, 0.14)',
                        }}
                      >
                        <div
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#282A2C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontFamily: THEME.typography.mono,
                            fontSize: isLandscape ? 12.5 : 13.5,
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E3E3E3' }}>
                            <FileCode2 size={15} color={editDone ? '#81C995' : '#D2FF00'} />
                            <strong style={{ color: '#A8C7FA' }}>Bridge</strong>
                            <span>edit_file(&quot;todo-logic.js&quot;)</span>
                          </span>
                          <span style={{ color: editDone ? '#81C995' : '#D2FF00', fontSize: 12, fontWeight: 700 }}>
                            {editDone ? '✓ Saved on disk' : 'patching...'}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: '10px 14px',
                            fontFamily: THEME.typography.mono,
                            fontSize: isLandscape ? 12 : 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {diffLines.slice(0, visibleDiffLines).map((line, i) => (
                            <div
                              key={i}
                              style={{
                                color: line.type === 'add' ? '#81C995' : '#9AA0A6',
                                backgroundColor:
                                  line.type === 'add' ? 'rgba(52, 168, 83, 0.18)' : 'transparent',
                                padding: '1px 6px',
                                borderRadius: 4,
                                whiteSpace: 'pre',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {line.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tool Call 3: execute_command("node --test") */}
                    {testShown && (
                      <div
                        style={{
                          opacity: testSpring,
                          transform: `translateY(${(1 - testSpring) * 14}px)`,
                          backgroundColor: testPassed ? '#13261C' : '#1E1F20',
                          border: testPassed ? '1.5px solid #34A853' : '1px solid #8AB4F8',
                          borderRadius: 12,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontFamily: THEME.typography.mono,
                          fontSize: isLandscape ? 12.5 : 13.5,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E3E3E3' }}>
                          <Terminal size={15} color={testPassed ? '#81C995' : '#8AB4F8'} />
                          <strong style={{ color: '#A8C7FA' }}>Bridge</strong>
                          <span>execute_command(&quot;node --test&quot;)</span>
                        </span>
                        <span style={{ color: testPassed ? '#D2FF00' : '#8AB4F8', fontWeight: 800 }}>
                          {testPassed ? '7 / 7 PASS (42ms)' : 'running...'}
                        </span>
                      </div>
                    )}

                    {/* Gemini Final Confirmation with Victory Pop */}
                    {testPassed && (
                      <div
                        style={{
                          opacity: victorySpring,
                          transform: `scale(${0.88 + victorySpring * 0.12}) translateY(${(1 - victorySpring) * 12}px)`,
                          backgroundColor: '#13261C',
                          border: '2px solid #34A853',
                          borderRadius: 14,
                          padding: '13px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          boxShadow: '0 0 32px rgba(52, 168, 83, 0.35)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              backgroundColor: '#34A853',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 0 18px rgba(52, 168, 83, 0.8)',
                            }}
                          >
                            <Check size={20} strokeWidth={3} />
                          </div>
                          <div>
                            <div style={{ fontFamily: THEME.typography.display, fontSize: isLandscape ? 17 : 19, fontWeight: 700, color: '#FFFFFF' }}>
                              Fixed &amp; verified locally — 7 / 7 tests passing
                            </div>
                            <div style={{ fontFamily: THEME.typography.display, fontSize: 13, color: '#A8DAB5' }}>
                              Patched todo-logic.js directly on disk with zero copy-pasting.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                  <GeminiPromptBar model="Argon" placeholder="Type @ for connectors, skills and more" />
                </div>
              </div>
            </RealGeminiWeb>
          </div>

          {/* RIGHT (Landscape) / BOTTOM (Reel): True bridge.js Terminal with [L] Live Activity Logs */}
          <div
            style={{
              flex: isLandscape ? 0.88 : 0.86,
              display: 'flex',
              minWidth: 0,
              minHeight: 0,
              paddingBottom: isLandscape ? 0 : 140,
            }}
          >
            <RealBridgeTerminal
              tabTitle="Bridge — Live Activity Logs [L]"
              mode="dashboard"
              compact
              showCopiedFlash={false}
              showLiveLogs
              liveLogs={liveLogs}
            />
          </div>
        </div>
      </WindowsDesktop>

      <FloatingCalloutVfx
        startFrame={70}
        endFrame={158}
        label="Surgical Disk Patch"
        sublabel="Auto-saves undo snapshot before every edit"
        accent="#D2FF00"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={224}
        endFrame={342}
        label="7 / 7 Tests Pass · 42ms"
        sublabel="Fixed, saved & verified — zero copy-paste"
        accent="#34D399"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="LIVE EXECUTION · ZERO COPY-PASTE"
        stepAccent="#34D399"
      />
    </div>
  );
};
