import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Plus, Plug, Check, CheckCircle2, X } from 'lucide-react';
import { WindowsDesktop, AnchoredCursor } from '../desktop/WindowsDesktop';
import { RealGeminiWeb } from '../desktop/RealGeminiWeb';
import { THEME } from '../theme';
import {
  useDynamicCutCamera,
  CutVfxLayer,
  FloatingCalloutVfx,
} from '../components/common/RetentionVFX';

const DEMO_MCP_URL = ['https', '://', 'bright-spark-42', '.', 'trycloudflare', '.', 'com/mcp'].join('');
const PLACEHOLDER_URL = ['https', '://', 'your-tunnel', '.', 'trycloudflare', '.', 'com/mcp'].join('');

const ALL_24_TOOLS = [
  'read_file',
  'read_files',
  'write_file',
  'write_files',
  'edit_file',
  'str_replace_editor',
  'revert_file',
  'execute_command',
  'bash',
  'pwsh',
  'jobs',
  'manage_background_job',
  'list_directory',
  'search_files',
  'get_file_info',
  'git_diff',
  'git_status',
  'inspect_dependencies',
  'plan_mode',
  'manage_plan',
  'select_project_folder',
  'get_current_project',
  'fetch_web_documentation',
  'bridge_instructions',
];

// Scene 5: 323 frames (10.77s) — High-Retention Gemini Connectors -> Custom MCP -> 24 Tools Wave VFX
export const Scene5ConnectMcp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isLandscape = width > height;

  const isMenuPhase = frame < 76;
  const connectBtnHovered = frame >= 48 && frame < 76;
  const connectBtnClicked = frame >= 62;

  const modalSpring = spring({
    frame: Math.max(0, frame - 76),
    fps,
    config: { damping: 18, stiffness: 240, mass: 0.6 },
  });

  const nameText = 'Bridge';
  const nameTyped = Math.floor(
    interpolate(frame, [96, 128], [0, nameText.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const urlPasted = frame >= 152;
  const modalConnectHovered = frame >= 194 && frame < 208;
  const modalConnectClicked = frame >= 206 && frame < 214;
  const connected = frame >= 208;

  const toolsSpring = spring({
    frame: Math.max(0, frame - 210),
    fps,
    config: { damping: 18, stiffness: 220 },
  });

  // Smooth Screen Studio camera choreography tied directly to each UI action
  const cam = useDynamicCutCamera([
    { startFrame: 0, zoom: 1.0, focusX: 0.5, focusY: 0.35, hardCut: true },
    { startFrame: 26, zoom: isLandscape ? 1.26 : 1.16, focusX: isLandscape ? 0.72 : 0.74, focusY: 0.2 },
    { startFrame: 76, zoom: isLandscape ? 1.18 : 1.12, focusX: isLandscape ? 0.55 : 0.5, focusY: 0.48, hardCut: true, flashColor: '#FFFFFF' },
    { startFrame: 146, zoom: isLandscape ? 1.28 : 1.18, focusX: isLandscape ? 0.55 : 0.5, focusY: 0.54 },
    { startFrame: 188, zoom: isLandscape ? 1.24 : 1.16, focusX: isLandscape ? 0.62 : 0.66, focusY: 0.6 },
    { startFrame: 208, zoom: 1.02, focusX: 0.5, focusY: 0.46, hardCut: true, flashColor: '#34D399' },
    { startFrame: 256, zoom: isLandscape ? 1.18 : 1.1, focusX: 0.54, focusY: 0.52 },
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
          path="/app/settings/connectors"
          activeSidebarItem="connectors"
          mcpConnected={connected}
          mcpToolCount={24}
          activeModel="Neon"
        >
          {/* Connectors Page Background */}
          <div
            style={{
              flex: 1,
              maxWidth: isLandscape ? 1040 : 960,
              width: '100%',
              margin: '0 auto',
              padding: isLandscape ? '28px 36px 90px' : '28px 24px 200px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              opacity: isMenuPhase || connected ? 1 : 0.24,
            }}
          >
            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: THEME.typography.display, fontSize: isLandscape ? 28 : 30, fontWeight: 500, color: '#E3E3E3' }}>
                  Connectors &amp; MCP servers
                </div>
                <div style={{ fontFamily: THEME.typography.display, fontSize: 15, color: '#9AA0A6', marginTop: 4 }}>
                  Connect external Model Context Protocol servers to extend Gemini with local tools
                </div>
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: connectBtnClicked ? '#8AB4F8' : connectBtnHovered ? '#BDD6FF' : '#A8C7FA',
                  color: '#062E6F',
                  borderRadius: 999,
                  padding: '10px 20px',
                  fontFamily: THEME.typography.display,
                  fontSize: 14.5,
                  fontWeight: 700,
                  boxShadow: connectBtnHovered || connectBtnClicked ? '0 0 0 3px rgba(168, 199, 250, 0.32), 0 8px 20px rgba(138, 180, 248, 0.35)' : 'none',
                  transform: `scale(${connectBtnClicked ? 0.95 : 1})`,
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Connect MCP</span>
                {isMenuPhase && (
                  <AnchoredCursor
                    startFrame={16}
                    arriveFrame={56}
                    clickFrame={62}
                    endFrame={75}
                    fromX={-240}
                    fromY={170}
                    rippleColor="#A8C7FA"
                  />
                )}
              </div>
            </div>

            {/* Connected Bridge Card with ALL 24 TOOLS + Staggered Pop-In Wave VFX */}
            {connected ? (
              <div
                style={{
                  opacity: toolsSpring,
                  transform: `translateY(${(1 - toolsSpring) * 18}px) scale(${0.95 + toolsSpring * 0.05})`,
                  backgroundColor: '#1E1F20',
                  border: '1.5px solid #34A853',
                  borderRadius: 16,
                  padding: isLandscape ? '20px 24px' : '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 0 36px rgba(52, 168, 83, 0.18)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Img
                      src={staticFile('assets/bridge_icon.jpg')}
                      style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: THEME.typography.display, fontSize: 19, fontWeight: 600, color: '#FFFFFF' }}>
                          Bridge
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontFamily: THEME.typography.display,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#81C995',
                            backgroundColor: 'rgba(129, 201, 149, 0.16)',
                            padding: '3px 10px',
                            borderRadius: 999,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Connected • 24 tools active
                        </span>
                      </div>
                      <div style={{ fontFamily: THEME.typography.mono, fontSize: 12.5, color: '#9AA0A6', marginTop: 3 }}>
                        {DEMO_MCP_URL}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: THEME.typography.mono,
                      fontSize: 12.5,
                      color: '#D2FF00',
                      fontWeight: 800,
                      backgroundColor: 'rgba(210, 255, 0, 0.12)',
                      border: '1px solid rgba(210, 255, 0, 0.4)',
                      padding: '6px 12px',
                      borderRadius: 8,
                    }}
                  >
                    24 / 24 enabled
                  </div>
                </div>

                {/* Real 24 Tools Grid with Per-Tool Staggered Pop + Sweep Wave */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isLandscape ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
                    gap: 8,
                  }}
                >
                  {ALL_24_TOOLS.map((tool, i) => {
                    const tSpring = spring({
                      frame: Math.max(0, frame - (214 + i * 2)),
                      fps,
                      config: { damping: 14, stiffness: 260, mass: 0.45 },
                    });
                    const wavePos = Math.floor((frame - 256) / 2);
                    const isWaveLit = frame >= 256 && Math.abs(wavePos - i) <= 1;
                    return (
                      <div
                        key={tool}
                        style={{
                          opacity: tSpring,
                          transform: `scale(${isWaveLit ? 1.06 : 0.88 + tSpring * 0.12})`,
                          backgroundColor: isWaveLit ? '#1C261F' : '#131314',
                          border: `1px solid ${isWaveLit ? '#D2FF00' : '#303134'}`,
                          borderRadius: 8,
                          padding: '7px 8px',
                          fontFamily: THEME.typography.mono,
                          fontSize: isLandscape ? 11.5 : 12.5,
                          color: isWaveLit ? '#FFFFFF' : '#E3E3E3',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          overflow: 'hidden',
                          boxShadow: isWaveLit ? '0 0 12px rgba(210, 255, 0, 0.28)' : 'none',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isWaveLit ? '#D2FF00' : '#34A853', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Existing Built-in Connectors List before connecting */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { name: 'Google Workspace', desc: 'Gmail, Drive, and Docs', status: 'Connected' },
                  { name: 'GitHub', desc: 'Read repositories and pull requests', status: 'Available' },
                  { name: 'Custom MCP Server', desc: 'Connect a local project harness over HTTPS (/mcp)', status: 'Not connected' },
                ].map((item) => (
                  <div
                    key={item.name}
                    style={{
                      backgroundColor: '#1E1F20',
                      border: '1px solid #303134',
                      borderRadius: 14,
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: '#282A2C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#C4C7C5',
                        }}
                      >
                        <Plug size={18} />
                      </div>
                      <div>
                        <div style={{ fontFamily: THEME.typography.display, fontSize: 16.5, fontWeight: 500, color: '#E3E3E3' }}>
                          {item.name}
                        </div>
                        <div style={{ fontFamily: THEME.typography.display, fontSize: 13.5, color: '#9AA0A6', marginTop: 2 }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontFamily: THEME.typography.display, fontSize: 13, color: item.status === 'Connected' ? '#81C995' : '#9AA0A6' }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Authentic Google Material Dark Modal: "Add custom MCP server" (76..208) */}
          {!isMenuPhase && !connected && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 28,
                zIndex: 820,
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: isLandscape ? 640 : 780,
                  transform: `scale(${0.9 + modalSpring * 0.1})`,
                  opacity: modalSpring,
                  backgroundColor: '#1E1F20',
                  border: '1.5px solid #4A505C',
                  borderRadius: 24,
                  padding: '28px 30px',
                  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.88)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: THEME.typography.display, fontSize: 22, fontWeight: 500, color: '#E3E3E3' }}>
                    Connect custom MCP server
                  </div>
                  <X size={20} color="#9AA0A6" />
                </div>

                {/* Field 1: Server Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <label style={{ fontFamily: THEME.typography.display, fontSize: 13.5, color: '#C4C7C5', fontWeight: 500 }}>
                    Name
                  </label>
                  <div
                    style={{
                      backgroundColor: '#131314',
                      border: nameTyped > 0 && !urlPasted ? '1.5px solid #8AB4F8' : '1px solid #3C4043',
                      borderRadius: 10,
                      padding: '13px 16px',
                      fontFamily: THEME.typography.display,
                      fontSize: 16.5,
                      color: '#FFFFFF',
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span>{nameText.slice(0, nameTyped)}</span>
                    {frame >= 96 && frame < 138 && (
                      <span style={{ display: 'inline-block', width: 2, height: 19, backgroundColor: '#8AB4F8', marginLeft: 2 }} />
                    )}
                  </div>
                </div>

                {/* Field 2: MCP URL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontFamily: THEME.typography.display, fontSize: 13.5, color: '#C4C7C5', fontWeight: 500 }}>
                      MCP server URL
                    </label>
                    {urlPasted && (
                      <span style={{ fontFamily: THEME.typography.mono, fontSize: 12, fontWeight: 700, color: '#D2FF00' }}>
                        ✓ Ctrl + V pasted
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      backgroundColor: '#131314',
                      border: urlPasted ? '1.5px solid #D2FF00' : '1px solid #3C4043',
                      borderRadius: 10,
                      padding: '13px 16px',
                      fontFamily: THEME.typography.mono,
                      fontSize: 14.5,
                      color: urlPasted ? '#E3E3E3' : '#757575',
                      boxShadow: urlPasted ? '0 0 18px rgba(210, 255, 0, 0.16)' : 'none',
                    }}
                  >
                    {urlPasted ? DEMO_MCP_URL : PLACEHOLDER_URL}
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
                  <div
                    style={{
                      padding: '10px 20px',
                      borderRadius: 999,
                      color: '#A8C7FA',
                      fontFamily: THEME.typography.display,
                      fontSize: 14.5,
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      padding: '10px 24px',
                      borderRadius: 999,
                      backgroundColor: modalConnectClicked ? '#8AB4F8' : modalConnectHovered ? '#BDD6FF' : '#A8C7FA',
                      color: '#062E6F',
                      fontFamily: THEME.typography.display,
                      fontSize: 14.5,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: modalConnectHovered || modalConnectClicked ? '0 0 0 3px rgba(168, 199, 250, 0.35)' : 'none',
                      transform: `scale(${modalConnectClicked ? 0.95 : 1})`,
                    }}
                  >
                    <Check size={15} strokeWidth={2.5} />
                    <span>Connect</span>
                    <AnchoredCursor
                      startFrame={166}
                      arriveFrame={202}
                      clickFrame={208}
                      endFrame={216}
                      fromX={-170}
                      fromY={-85}
                      rippleColor="#A8C7FA"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </RealGeminiWeb>
      </WindowsDesktop>

      <FloatingCalloutVfx
        startFrame={152}
        endFrame={206}
        label="Ctrl + V to Connect"
        sublabel="Instant HTTPS MCP handshake"
        accent="#50C8FF"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <FloatingCalloutVfx
        startFrame={212}
        endFrame={318}
        label="24 Local Tools Online"
        sublabel="Files, diffs, git, bash & tests ready"
        accent="#34D399"
        top={isLandscape ? '20px' : '32px'}
        right="22px"
      />
      <CutVfxLayer
        flashColor={cam.flashColor}
        flashOpacity={cam.flashOpacity}
        rgbSplitAmount={cam.rgbSplitAmount}
        stepTag="STEP 03 · CONNECT MCP"
        stepAccent="#50C8FF"
      />
    </div>
  );
};
