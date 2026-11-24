import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Plus, ChevronDown, Minus, Square, X } from 'lucide-react';
import { THEME } from '../theme';

// Exact ANSI palette from bridge.js (LN4 Volt Edition)
const CLI = {
  bg: '#0C0C0C',
  volt: '#D2FF00',
  steel: '#414452',
  slate: '#8E92A4',
  white: '#F0F2F8',
  whiteBold: '#FFFFFF',
  divider: '#2C2F3A',
  cyan: '#50C8FF',
  red: '#EF4444',
};

const DEMO_MCP_URL = ['https', '://', 'bright-spark-42', '.', 'trycloudflare', '.', 'com/mcp'].join('');

const PACKET_TRACKS = [
  '═══▶═════════════════ ( ∞ ) ══════════════════════',
  '══════▶══════════════ ( ∞ ) ══════════════════════',
  '═════════▶═══════════ ( ∞ ) ══════════════════════',
  '════════════▶════════ ( ∞ ) ══════════════════════',
  '═══════════════▶═════ ( ∞ ) ══════════════════════',
  '══════════════════▶══ ( ∞ ) ══════════════════════',
  '═════════════════════ ( ✦ ) ═══▶══════════════════',
  '═════════════════════ ( ∞ ) ══════▶═══════════════',
  '═════════════════════ ( ∞ ) ═════════▶════════════',
  '═════════════════════ ( ∞ ) ════════════▶═════════',
  '═════════════════════ ( ∞ ) ═══════════════▶══════',
  '═════════════════════ ( ∞ ) ══════════════════▶═══',
];

const SPINNERS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const TUNNEL_STAGES = [
  'Mounting Bridge & Local Project Sandbox...',
  'Connecting to Cloudflare Global Anycast Edge...',
  'Allocating Public HTTPS Quantum Tunnel for MCP...',
  'Finalizing Secure WebSocket & SSE Streaming...',
];

export interface BridgeLogLine {
  time: string;
  text: string;
  accent?: 'cyan' | 'volt' | 'slate';
}

interface RealBridgeTerminalProps {
  tabTitle?: string;
  mode: 'shell' | 'tunnel' | 'dashboard';
  /** For shell mode */
  shellContent?: React.ReactNode;
  /** For tunnel mode (0..1) */
  tunnelProgress?: number;
  /** For dashboard mode */
  projectPath?: string;
  mcpUrl?: string;
  showCopiedFlash?: boolean;
  showLiveLogs?: boolean;
  liveLogs?: BridgeLogLine[];
  compact?: boolean;
}

const BridgeAsciiHeader: React.FC<{
  badge: React.ReactNode;
  compact: boolean;
}> = ({ badge, compact }) => {
  const artSize = compact ? 11 : 14.5;
  const barLen = compact ? 66 : 86;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 3 : 5 }}>
      <div style={{ color: CLI.volt, fontWeight: 700, fontSize: artSize, lineHeight: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {'━'.repeat(barLen)}
      </div>

      {/* Exact renderAsciiHeaderToOut() from bridge.js lines 420-427 */}
      <pre
        style={{
          margin: compact ? '2px 0' : '4px 0',
          fontFamily: THEME.typography.mono,
          fontSize: artSize,
          lineHeight: 1.12,
          whiteSpace: 'pre',
          textAlign: 'center',
        }}
      >
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗</span>
          <span>    </span>
          <span style={{ color: CLI.steel }}>╔══════╗</span>
          <span>          </span>
          <span style={{ color: CLI.cyan }}>╔══╗  ╔══╗</span>
        </div>
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝</span>
          <span>    </span>
          <span style={{ color: CLI.steel }}>║ </span>
          <span style={{ color: CLI.white }}>&gt;_ </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>█</span>
          <span style={{ color: CLI.steel }}> ║</span>
          <span>        </span>
          <span style={{ color: CLI.cyan }}>╔═╝  ╚══╝  ╚═╗</span>
        </div>
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  </span>
          <span>  </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>╔╩══════╩═╗</span>
          <span>     </span>
          <span style={{ color: CLI.cyan }}>╔╝   </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>✦</span>
          <span style={{ color: CLI.cyan, fontWeight: 800 }}> LLM</span>
          <span style={{ color: CLI.cyan }}>    ╚╗</span>
        </div>
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  </span>
          <span>  </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>║    ╚════╬═════╬════╝         ║</span>
        </div>
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗</span>
          <span>  </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>╚╗    ╔═══╩═════╩═══╗         ╔╝</span>
        </div>
        <div>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝</span>
          <span>   </span>
          <span style={{ color: CLI.volt, fontWeight: 800 }}>╚════╝             ╚═════════╝</span>
        </div>
      </pre>

      <div style={{ color: CLI.volt, fontWeight: 700, fontSize: artSize, lineHeight: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {'━'.repeat(barLen)}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 6px',
          fontSize: compact ? 13 : 15,
        }}
      >
        <div>{badge}</div>
        <div style={{ color: CLI.slate, fontSize: compact ? 12 : 14 }}>
          v1.0.13 • HIGH-SPEED AI MCP HARNESS
        </div>
      </div>

      <div style={{ color: CLI.divider, fontSize: artSize, lineHeight: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {'─'.repeat(barLen)}
      </div>
    </div>
  );
};

export const RealBridgeTerminal: React.FC<RealBridgeTerminalProps> = ({
  tabTitle = 'Windows PowerShell',
  mode,
  shellContent,
  tunnelProgress = 0.65,
  projectPath = 'C:\\tmp\\interview\\gemini-test-project',
  mcpUrl = DEMO_MCP_URL,
  showCopiedFlash = true,
  showLiveLogs = false,
  liveLogs = [],
  compact = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;
  const isCompact = compact || !isLandscape;

  const pct = Math.min(100, Math.round(tunnelProgress * 100));
  const barLen = isCompact ? 34 : 52;
  const filled = Math.min(barLen, Math.round(tunnelProgress * barLen));
  const spinner = SPINNERS[Math.floor(frame / 2) % SPINNERS.length];
  const track = PACKET_TRACKS[Math.floor(frame / 2) % PACKET_TRACKS.length];
  const stageIdx = Math.min(
    TUNNEL_STAGES.length - 1,
    Math.floor(tunnelProgress * TUNNEL_STAGES.length),
  );

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: CLI.bg,
        borderRadius: 10,
        border: '1px solid #303238',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.78)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Authentic Windows 11 Terminal Tab Strip (#202020) */}
      <div
        style={{
          height: 38,
          backgroundColor: '#202020',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingLeft: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
          <div
            style={{
              height: 31,
              minWidth: 230,
              backgroundColor: CLI.bg,
              borderTopLeftRadius: 7,
              borderTopRightRadius: 7,
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              color: '#F3F4F6',
              fontFamily: THEME.typography.display,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Img
                src={staticFile('assets/powershell-icon.svg')}
                style={{ width: 15, height: 15, borderRadius: 3 }}
              />
              <span>{tabTitle}</span>
            </span>
            <X size={12} color="#9CA3AF" />
          </div>

          <div
            style={{
              height: 30,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#9CA3AF',
            }}
          >
            <Plus size={14} />
            <ChevronDown size={13} />
          </div>
        </div>

        {/* Windows Caption Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', color: '#CCCCCC' }}>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Minus size={14} />
          </div>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Square size={11} />
          </div>
          <div style={{ width: 42, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </div>
        </div>
      </div>

      {/* Terminal Screen Buffer (#0C0C0C) */}
      <div
        style={{
          flex: 1,
          padding: isCompact ? '14px 16px' : '18px 26px',
          fontFamily: THEME.typography.mono,
          color: CLI.white,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: mode === 'shell' ? 'flex-start' : 'space-between',
          gap: isCompact ? 10 : 12,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {mode === 'shell' && shellContent}

        {mode === 'tunnel' && (
          <>
            <BridgeAsciiHeader
              compact={isCompact}
              badge={
                <span
                  style={{
                    backgroundColor: CLI.volt,
                    color: '#000000',
                    fontWeight: 900,
                    padding: '2px 8px',
                  }}
                >
                  {pct >= 100 ? ' TUNNEL ACTIVE ' : ' ESTABLISHING TUNNEL '}
                </span>
              }
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 6px' }}>
              <div
                style={{
                  color: CLI.cyan,
                  fontWeight: 800,
                  fontSize: isCompact ? 13 : 16.5,
                  whiteSpace: 'pre',
                }}
              >
                {pct >= 100
                  ? '  [LOCAL PC] ═════════════════════ ( ✦ ) ══════════════════════ [CLOUD AI] ✦'
                  : `  [LOCAL PC] ${track} [CLOUD AI] ✦`}
              </div>

              <div style={{ color: CLI.divider, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {'─'.repeat(isCompact ? 66 : 86)}
              </div>

              <div style={{ fontSize: isCompact ? 15 : 17.5, fontWeight: 800 }}>
                <span style={{ color: CLI.volt }}>{pct >= 100 ? '✓' : spinner} </span>
                <span style={{ color: CLI.whiteBold }}>
                  {pct >= 100 ? 'CLOUDFLARE TUNNEL CONNECTED' : 'CREATING CLOUDFLARE SECURE TUNNEL'}
                </span>
                <span style={{ color: CLI.volt }}>  {String(pct).padStart(3, ' ')}%</span>
              </div>

              <div style={{ fontSize: isCompact ? 15 : 17.5 }}>
                <span>[</span>
                <span style={{ color: CLI.volt }}>{'█'.repeat(filled)}</span>
                <span style={{ color: CLI.steel }}>{'░'.repeat(barLen - filled)}</span>
                <span>]</span>
              </div>

              <div style={{ fontSize: isCompact ? 13.5 : 16, color: pct >= 100 ? CLI.volt : CLI.slate }}>
                {pct >= 100 ? (
                  <>
                    <span style={{ color: CLI.volt, fontWeight: 800 }}>● MCP URL: </span>
                    <span style={{ color: CLI.cyan, fontWeight: 800 }}>{mcpUrl}</span>
                    <span style={{ color: CLI.slate }}> (Copied to Clipboard!)</span>
                  </>
                ) : (
                  `● ${TUNNEL_STAGES[stageIdx]}`
                )}
              </div>
            </div>

            <div style={{ color: CLI.volt, fontWeight: 700, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {'━'.repeat(isCompact ? 66 : 86)}
            </div>
          </>
        )}

        {mode === 'dashboard' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 8 : 10 }}>
              <BridgeAsciiHeader
                compact={isCompact}
                badge={
                  <span style={{ color: CLI.volt, fontWeight: 900 }}>
                    ● STATUS: ONLINE
                  </span>
                }
              />

              {/* Exact PROJECT / JAILED / MCP URL rows from bridge.js lines 917-924 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 7 : 9, padding: '2px 6px', fontSize: isCompact ? 14 : 16.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ backgroundColor: CLI.volt, color: '#000000', fontWeight: 900, padding: '1px 8px', minWidth: 96 }}>
                    {' PROJECT '}
                  </span>
                  <span style={{ color: CLI.whiteBold, fontWeight: 700 }}>{projectPath}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ backgroundColor: CLI.volt, color: '#000000', fontWeight: 900, padding: '1px 8px', minWidth: 96 }}>
                    {' JAILED  '}
                  </span>
                  <span>
                    <strong style={{ color: CLI.volt }}>STRICTLY ENFORCED</strong>{' '}
                    <span style={{ color: CLI.slate }}>(Zero access outside folder)</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ backgroundColor: CLI.volt, color: '#000000', fontWeight: 900, padding: '1px 8px', minWidth: 96 }}>
                    {' MCP URL '}
                  </span>
                  <span style={{ color: CLI.cyan, fontWeight: 800 }}>{mcpUrl}</span>
                </div>
              </div>

              <div style={{ color: CLI.divider, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {'─'.repeat(isCompact ? 66 : 86)}
              </div>

              {/* Exact flashNotification from bridge.js line 1083 */}
              {showCopiedFlash && (
                <>
                  <div style={{ padding: '0 6px', fontSize: isCompact ? 13.5 : 15.5 }}>
                    <span style={{ color: CLI.volt, fontWeight: 800 }}>● [COPIED] </span>
                    <span style={{ color: CLI.white }}>
                      MCP URL loaded into your clipboard! (Ctrl + V to paste)
                    </span>
                  </div>
                  <div style={{ color: CLI.divider, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {'─'.repeat(isCompact ? 66 : 86)}
                  </div>
                </>
              )}

              {/* Exact KEYBOARD ACTIONS from bridge.js lines 938-941 */}
              <div style={{ padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 5, fontSize: isCompact ? 13 : 15 }}>
                <div style={{ color: CLI.volt, fontWeight: 800 }}>KEYBOARD ACTIONS:</div>
                <div style={{ display: 'flex', gap: isCompact ? 20 : 48 }}>
                  <span>
                    <strong style={{ color: CLI.volt }}>[C]</strong> Copy MCP URL
                  </span>
                  <span>
                    <strong style={{ color: CLI.volt }}>[D]</strong> Browse &amp; Switch Project Folder
                  </span>
                </div>
                <div style={{ display: 'flex', gap: isCompact ? 20 : 48 }}>
                  <span>
                    <strong style={{ color: CLI.volt }}>[L]</strong> Live Activity Logs (
                    <strong style={{ color: showLiveLogs ? CLI.volt : CLI.slate }}>
                      {showLiveLogs ? 'ON' : 'OFF'}
                    </strong>
                    )
                  </span>
                  <span>
                    <strong style={{ color: CLI.volt }}>[Q]</strong> Stop Server &amp; Exit
                  </span>
                </div>
              </div>

              <div style={{ color: CLI.volt, fontWeight: 700, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {'━'.repeat(isCompact ? 66 : 86)}
              </div>
            </div>

            {/* Dynamic Middle Section: Live Logs OR Universal AI MCP Harness */}
            <div style={{ flex: 1, padding: '2px 6px', display: 'flex', flexDirection: 'column', gap: 7, fontSize: isCompact ? 13 : 14.5 }}>
              {showLiveLogs ? (
                <>
                  <div style={{ color: CLI.volt, fontWeight: 800 }}>
                    LIVE HARNESS TRAFFIC &amp; ACTIVITY LOGS:
                  </div>
                  {liveLogs.length === 0 ? (
                    <div style={{ color: CLI.slate }}>
                      (Waiting for AI requests from Gemini, Claude, or ChatGPT...)
                    </div>
                  ) : (
                    liveLogs.map((log, i) => (
                      <div key={i} style={{ lineHeight: 1.45 }}>
                        <span style={{ color: CLI.slate }}>[{log.time}] </span>
                        <span
                          style={{
                            color:
                              log.accent === 'volt'
                                ? CLI.volt
                                : log.accent === 'cyan'
                                  ? CLI.cyan
                                  : CLI.white,
                            fontWeight: log.accent ? 700 : 400,
                          }}
                        >
                          {log.text}
                        </span>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  <div style={{ color: CLI.volt, fontWeight: 800 }}>UNIVERSAL AI MCP HARNESS:</div>
                  <div>
                    <span style={{ color: CLI.steel }}>● </span>
                    <span style={{ color: CLI.whiteBold, fontWeight: 700 }}>
                      Built for every chat-based LLM that provides custom MCP connectors.
                    </span>
                  </div>
                  <div style={{ color: CLI.slate }}>
                    <span style={{ color: CLI.steel }}>● </span>
                    Copy your MCP URL above ([C]) and paste it into your AI model&apos;s custom MCP tools.
                  </div>
                </>
              )}
            </div>

            {/* Pinned Bottom Compatibility Line from bridge.js lines 984-993 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ color: CLI.volt, fontWeight: 700, fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {'━'.repeat(isCompact ? 66 : 86)}
              </div>
              <div style={{ padding: '0 6px', fontSize: isCompact ? 12 : 13.5 }}>
                <span style={{ color: CLI.volt, fontWeight: 800 }}>COMPATIBILITY: </span>
                <span style={{ color: CLI.whiteBold, fontWeight: 700 }}>
                  Supports every chat-based LLM with custom MCP
                </span>{' '}
                <span style={{ color: CLI.slate }}>
                  (Gemini, Claude, ChatGPT, DeepSeek)
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
