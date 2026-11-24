import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ShieldAlert, ShieldCheck, Check, Terminal } from 'lucide-react';
import { WindowsDesktop, AnchoredCursor } from '../desktop/WindowsDesktop';
import { RealGeminiWeb, GeminiPromptBar } from '../desktop/RealGeminiWeb';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

// Scene 6: 309 frames (10.30s) — High-Retention @Bridge Mention + Permission Approval Cuts
export const Scene6MentionPermission: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  const showModelMenu = frame >= 2 && frame < 20;
  const activeModel = frame >= 16 ? 'Argon' : 'Neon';

  const showPopover = frame >= 20 && frame < 48;
  const mentionSelected = frame >= 48;

  const commandText = 'fix priority sorting in todo-logic.js and run node --test';
  const typedLen = Math.floor(
    interpolate(frame, [50, 106], [0, commandText.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const sent = frame >= 114;
  const showPermission = frame >= 130;
  const allowHovered = frame >= 228 && frame < 242;
  const allowed = frame >= 242;

  const popoverSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 18, stiffness: 260, mass: 0.55 },
  });

  const permSpring = spring({
    frame: Math.max(0, frame - 130),
    fps,
    config: { damping: 18, stiffness: 230, mass: 0.6 },
  });

  // Smooth Screen Studio camera choreography: Prompt -> @Bridge -> Sent Thread -> Permission Card -> Allow Click -> Pullback
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: isLandscape ? 1.16 : 1.1, focusX: 0.5, focusY: 0.52, hardCut: true },
    { startFrame: 20, zoom: isLandscape ? 1.26 : 1.16, focusX: isLandscape ? 0.48 : 0.48, focusY: 0.46 },
    { startFrame: 52, zoom: isLandscape ? 1.18 : 1.1, focusX: 0.52, focusY: 0.54 },
    { startFrame: 114, zoom: isLandscape ? 1.06 : 1.04, focusX: 0.52, focusY: 0.46, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 188, zoom: isLandscape ? 1.28 : 1.18, focusX: isLandscape ? 0.58 : 0.56, focusY: isLandscape ? 0.56 : 0.48 },
    { startFrame: 242, zoom: 1.04, focusX: 0.52, focusY: 0.48, flashColor: '#34D399' },
  ]);

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
        <RealGeminiWeb
          path="/app"
          activeSidebarItem={sent ? 'chat' : 'new'}
          mcpConnected
          mcpToolCount={24}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: sent ? 'space-between' : 'center',
              alignItems: 'center',
              maxWidth: isLandscape ? 820 : 940,
              width: '100%',
              margin: '0 auto',
              padding: isLandscape ? '22px 28px 34px' : '26px 24px 190px',
              position: 'relative',
            }}
          >
            {!sent ? (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 26,
                  marginBottom: isLandscape ? 50 : 90,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontFamily: THEME.typography.display,
                    fontSize: isLandscape ? 38 : 44,
                    fontWeight: 400,
                    color: '#F1F3F4',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Where should we start?
                </div>

                {/* @Bridge Mention Autocomplete Popover */}
                {showPopover && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 16,
                      bottom: 'calc(100% - 76px)',
                      width: 440,
                      opacity: popoverSpring,
                      transform: `translateY(${(1 - popoverSpring) * 14}px) scale(${0.92 + popoverSpring * 0.08})`,
                      backgroundColor: '#1E2025',
                      border: '1.5px solid #D2FF00',
                      borderRadius: 16,
                      padding: 8,
                      boxShadow: '0 18px 44px rgba(0, 0, 0, 0.85), 0 0 24px rgba(210, 255, 0, 0.2)',
                      zIndex: 860,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: THEME.typography.display,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#9AA0A6',
                        padding: '4px 10px 6px',
                      }}
                    >
                      Connectors
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#2A2D36',
                        borderRadius: 11,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Img
                          src={staticFile('assets/bridge_icon.jpg')}
                          style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontFamily: THEME.typography.mono, fontSize: 14.5, fontWeight: 700, color: '#FFFFFF' }}>
                            @Bridge
                          </div>
                          <div style={{ fontFamily: THEME.typography.display, fontSize: 12, color: '#C4C7C5' }}>
                            24 sandboxed local tools • gemini-test-project
                          </div>
                        </div>
                      </div>
                      <span style={{ fontFamily: THEME.typography.mono, fontSize: 11, color: '#D2FF00', fontWeight: 800 }}>
                        Tab / Enter
                      </span>
                    </div>
                  </div>
                )}

                <GeminiPromptBar
                  model={activeModel}
                  showModelMenu={showModelMenu}
                  showModeToggle
                  activeMode="Task"
                  canSend={mentionSelected}
                  value={
                    frame < 20 ? undefined : !mentionSelected ? (
                      <span style={{ fontFamily: THEME.typography.mono, color: '#A8C7FA', fontWeight: 700 }}>
                        @Bri
                        <span style={{ display: 'inline-block', width: 2, height: 18, backgroundColor: '#A8C7FA', marginLeft: 2, verticalAlign: 'middle' }} />
                      </span>
                    ) : (
                      <>
                        <span
                          style={{
                            backgroundColor: '#004A77',
                            color: '#C2E7FF',
                            fontFamily: THEME.typography.mono,
                            fontWeight: 700,
                            fontSize: 14.5,
                            padding: '3px 9px',
                            borderRadius: 7,
                          }}
                        >
                          @Bridge
                        </span>
                        <span>{commandText.slice(0, typedLen)}</span>
                        <span style={{ display: 'inline-block', width: 2, height: 18, backgroundColor: '#A8C7FA', verticalAlign: 'middle' }} />
                      </>
                    )
                  }
                />
              </div>
            ) : (
              /* Sent Thread + Permission Dialog */
              <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '88%' }}>
                  <div
                    style={{
                      backgroundColor: '#1E2025',
                      border: '1px solid #2B2E35',
                      borderRadius: '20px 4px 20px 20px',
                      padding: '14px 20px',
                      fontFamily: THEME.typography.display,
                      fontSize: isLandscape ? 16.5 : 19,
                      color: '#E3E3E3',
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: '#004A77',
                        color: '#C2E7FF',
                        fontFamily: THEME.typography.mono,
                        fontWeight: 700,
                        fontSize: isLandscape ? 14.5 : 16.5,
                        padding: '3px 9px',
                        borderRadius: 7,
                        marginRight: 8,
                      }}
                    >
                      @Bridge
                    </span>
                    fix priority sorting in{' '}
                    <span style={{ fontFamily: THEME.typography.mono, color: '#A8C7FA' }}>todo-logic.js</span> and
                    run <span style={{ fontFamily: THEME.typography.mono, color: '#81C995' }}>node --test</span>
                  </div>
                </div>

                {showPermission && (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <Img
                      src={staticFile('assets/gemini-icon.svg')}
                      style={{ width: 26, height: 26, borderRadius: 7, marginTop: 4, flexShrink: 0 }}
                    />
                    <div
                      style={{
                        flex: 1,
                        opacity: permSpring,
                        transform: `translateY(${(1 - permSpring) * 18}px) scale(${0.94 + permSpring * 0.06})`,
                        backgroundColor: '#181A1F',
                        border: allowed ? '2px solid #34A853' : '1.5px solid #FDD663',
                        borderRadius: 18,
                        overflow: 'visible',
                        boxShadow: allowed
                          ? '0 14px 36px rgba(0, 0, 0, 0.55), 0 0 28px rgba(52, 168, 83, 0.24)'
                          : '0 14px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(253, 214, 99, 0.14)',
                      }}
                    >
                      <div
                        style={{
                          padding: '15px 20px',
                          backgroundColor: '#202229',
                          borderTopLeftRadius: 16,
                          borderTopRightRadius: 16,
                          borderBottom: '1px solid #2C2F38',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          {allowed ? (
                            <ShieldCheck size={20} color="#81C995" />
                          ) : (
                            <ShieldAlert size={20} color="#FDD663" />
                          )}
                          <div>
                            <div style={{ fontFamily: THEME.typography.display, fontSize: 16.5, fontWeight: 600, color: '#FFFFFF' }}>
                              {allowed
                                ? 'Permission granted for Bridge'
                                : 'Allow Bridge to use local tools?'}
                            </div>
                            <div style={{ fontFamily: THEME.typography.display, fontSize: 13, color: '#9AA0A6' }}>
                              {allowed
                                ? 'Executing inside C:\\tmp\\interview\\gemini-test-project'
                                : 'Review tool call arguments before modifying files on disk'}
                            </div>
                          </div>
                        </div>

                        <Img
                          src={staticFile('assets/bridge_icon.jpg')}
                          style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }}
                        />
                      </div>

                      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: THEME.typography.mono, fontSize: 13.5, color: '#C4C7C5' }}>
                          <Terminal size={15} color="#8AB4F8" />
                          <span>
                            Model: <strong style={{ color: '#FFFFFF' }}>Argon</strong> • Calls:{' '}
                            <span style={{ color: '#A8C7FA' }}>read_file</span>,{' '}
                            <span style={{ color: '#A8C7FA' }}>edit_file</span>,{' '}
                            <span style={{ color: '#81C995' }}>execute_command</span>
                          </span>
                        </div>

                        <div
                          style={{
                            backgroundColor: '#0E0F12',
                            border: '1px solid #282B33',
                            borderRadius: 10,
                            padding: '12px 16px',
                            fontFamily: THEME.typography.mono,
                            fontSize: isLandscape ? 13.5 : 14.5,
                            lineHeight: 1.6,
                            color: '#E3E3E3',
                          }}
                        >
                          <div>
                            <span style={{ color: '#9AA0A6' }}>folder_jail: </span>
                            &quot;C:\\tmp\\interview\\gemini-test-project&quot;
                          </div>
                          <div>
                            <span style={{ color: '#9AA0A6' }}>file_path: </span>
                            <span style={{ color: '#A8C7FA' }}>&quot;todo-logic.js&quot;</span>
                          </div>
                          <div>
                            <span style={{ color: '#9AA0A6' }}>command: </span>
                            <span style={{ color: '#81C995' }}>&quot;node --test&quot;</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 4 }}>
                          <div
                            style={{
                              padding: '9px 18px',
                              borderRadius: 999,
                              border: '1px solid #4A4E58',
                              color: '#E3E3E3',
                              fontFamily: THEME.typography.display,
                              fontSize: 14,
                              fontWeight: 500,
                              opacity: allowed ? 0.35 : 1,
                            }}
                          >
                            Deny
                          </div>

                          <div
                            style={{
                              position: 'relative',
                              padding: '9px 22px',
                              borderRadius: 999,
                              backgroundColor: allowed ? '#34A853' : allowHovered ? '#BDD6FF' : '#A8C7FA',
                              color: allowed ? '#FFFFFF' : '#062E6F',
                              fontFamily: THEME.typography.display,
                              fontSize: 14.5,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: allowed
                                ? '0 0 22px rgba(52, 168, 83, 0.5)'
                                : allowHovered
                                  ? '0 0 0 3px rgba(168, 199, 250, 0.35)'
                                  : 'none',
                              transform: `scale(${frame >= 240 && frame < 248 ? 0.95 : 1})`,
                            }}
                          >
                            {allowed && <Check size={15} strokeWidth={2.8} />}
                            <span>{allowed ? 'Allowed' : 'Allow once'}</span>
                            <AnchoredCursor
                              startFrame={192}
                              arriveFrame={234}
                              clickFrame={242}
                              endFrame={268}
                              fromX={-170}
                              fromY={110}
                              rippleColor="#34D399"
                            />
                          </div>

                          <div
                            style={{
                              padding: '9px 18px',
                              borderRadius: 999,
                              backgroundColor: '#25272E',
                              border: '1px solid #353842',
                              color: '#C2E7FF',
                              fontFamily: THEME.typography.display,
                              fontSize: 14,
                              fontWeight: 500,
                              opacity: allowed ? 0.45 : 1,
                            }}
                          >
                            Always allow
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </RealGeminiWeb>
      </WindowsDesktop>

      <FloatingCalloutVfx
        startFrame={132}
        endFrame={240}
        label="Human-in-the-Loop Safety"
        sublabel="Approve every file edit & command before it runs"
        accent="#FDD663"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={244}
        endFrame={305}
        label="Permission Granted"
        sublabel="Sandboxed to gemini-test-project only"
        accent="#34D399"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="STEP 04 · @BRIDGE & APPROVE"
        stepAccent="#FDD663"
      />
    </div>
  );
};
