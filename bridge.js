#!/usr/bin/env node

/**
 * =========================================================================
 *  BRIDGE — Universal Local-to-Web AI Coding Harness
 *  LN4 Volt Edition (Fluorescent Volt Green #D2FF00 + Charcoal Grays)
 *  Connects Local Projects to Google Gemini, Claude, ChatGPT & DeepSeek
 * =========================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const {
  ATTACH_APPROVAL_GUARD_MS,
  isApprovalGuardActive,
  evaluateAttachApprovalKey,
  applyAttachPaste,
  shouldEchoSentLine,
  shouldRingApprovalBell
} = require('./secure-folder-mcp/attach-input');

// Lando Norris Signature LN4 Palette (#D2FF00 + Charcoal Grays)
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Volt Green (Lando Norris Signature #D2FF00 - RGB 210, 255, 0)
  volt: '\x1b[38;2;210;255;0m',
  voltBold: '\x1b[1;38;2;210;255;0m',
  bgVolt: '\x1b[48;2;210;255;0m\x1b[38;2;0;0;0m', // High-contrast black on volt green
  bgVoltDark: '\x1b[48;2;28;34;0m',
  
  // Sleek Charcoal & Asphalt Grays
  steel: '\x1b[38;2;65;68;82m',
  slate: '\x1b[38;2;142;146;164m',
  lightSlate: '\x1b[38;2;180;185;200m',
  white: '\x1b[38;2;240;242;248m',
  whiteBold: '\x1b[1;38;2;255;255;255m',
  darkDivider: '\x1b[38;2;44;47;58m',
  
  // Accents
  cyan: '\x1b[38;2;80;200;255m',
  cyanBold: '\x1b[1;38;2;80;200;255m',
  red: '\x1b[38;2;239;68;68m',
  redBold: '\x1b[1;38;2;239;68;68m',

  // Fallback compatibility
  neon: '\x1b[38;2;210;255;0m',
  neonBold: '\x1b[1;38;2;210;255;0m',
  bgNeon: '\x1b[48;2;210;255;0m\x1b[38;2;0;0;0m',
  coral: '\x1b[38;2;210;255;0m',
  coralBold: '\x1b[1;38;2;210;255;0m',
  bgCoral: '\x1b[48;2;210;255;0m\x1b[38;2;0;0;0m',
  bgCyan: '\x1b[48;2;12;35;60m',
  divider: '\x1b[38;2;44;47;58m',
  yellow: '\x1b[38;2;210;255;0m',
  gray: '\x1b[38;2;142;146;164m',
  brightCyan: '\x1b[38;2;80;200;255m',
  brightGreen: '\x1b[38;2;210;255;0m',
  green: '\x1b[38;2;210;255;0m'
};

const scriptDir = __dirname;
const serverScript = path.join(scriptDir, 'secure-folder-mcp', 'server.js');

// Bridge-specific configuration. This intentionally lives under ~/.bridge and
// never reads or writes cloudflared's own ~/.cloudflared files.
const bridgeHomeDir = path.join(os.homedir(), '.bridge');
const bridgeConfigPath = path.join(bridgeHomeDir, 'config.json');

function normalizePublicUrl(value) {
  let url = String(value || '').trim().replace(/\/+$/, '');
  if (!url) return '';
  url = url.replace(/\/mcp$/i, '');
  return url;
}

function isValidPublicUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch (e) {
    return false;
  }
}

function readBridgeConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(bridgeConfigPath, 'utf8'));
    return {
      tunnelToken: typeof parsed.tunnelToken === 'string' ? parsed.tunnelToken.trim() : '',
      publicUrl: normalizePublicUrl(parsed.publicUrl),
      authToken: typeof parsed.authToken === 'string' && /^[a-f0-9]{32,}$/i.test(parsed.authToken) ? parsed.authToken : '',
      approvalMode: ['turbo', 'review', 'default', 'auto'].includes(parsed.approvalMode) ? parsed.approvalMode : 'default'
    };
  } catch (e) {
    return { tunnelToken: '', publicUrl: '', authToken: '', approvalMode: 'default' };
  }
}

function writeBridgeConfig(config) {
  fs.mkdirSync(bridgeHomeDir, { recursive: true, mode: 0o700 });
  // Merge with what is on disk so saving one field never drops another (e.g. the auth token).
  const existing = readBridgeConfig();
  const merged = { ...existing, ...config };
  const payload = JSON.stringify({
    tunnelToken: String(merged.tunnelToken || '').trim(),
    publicUrl: normalizePublicUrl(merged.publicUrl),
    authToken: String(merged.authToken || ''),
    approvalMode: merged.approvalMode || 'default'
  }, null, 2) + '\n';
  fs.writeFileSync(bridgeConfigPath, payload, { mode: 0o600 });
  try { fs.chmodSync(bridgeConfigPath, 0o600); } catch (e) {}
}

function promptLine(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    stdout.write(question);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);

    let value = '';
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      stdin.removeListener('data', onData);
      try { stdin.setRawMode(false); } catch (e) {}
      stdout.write('\n');
      if (err) reject(err);
      else resolve(value.trim());
    };

    const onData = (chunk) => {
      // Strip bracketed-paste markers and any other terminal escape sequences.
      const text = String(chunk).replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
      for (const ch of text) {
        const code = ch.charCodeAt(0);
        if (ch === '\u0003') {
          finish(new Error('Setup cancelled.'));
          return;
        }
        if (ch === '\r' || ch === '\n') {
          finish();
          return;
        }
        if (code === 127 || ch === '\b') {
          if (value.length) value = value.slice(0, -1);
          continue;
        }
        if (code < 32) continue;
        value += ch;
      }
    };

    stdin.on('data', onData);
  });
}

async function runSetup() {
  if (!process.stdin.isTTY) {
    console.error('\n  ' + C.redBold + '● [ERROR]' + C.reset + ' `bridge setup` needs an interactive terminal.\n');
    process.exit(1);
  }

  const existing = readBridgeConfig();

  process.stdout.write(`\n  ${C.voltBold}● BRIDGE SETUP${C.reset}\n`);
  process.stdout.write(`  ${C.slate}Creates a fixed MCP URL using a named Cloudflare tunnel.${C.reset}\n`);
  process.stdout.write(`  ${C.slate}In Cloudflare Zero Trust, add a Public Hostname pointing to ${C.cyanBold}http://localhost:3000${C.reset}${C.slate}.${C.reset}\n`);
  process.stdout.write(`  ${C.slate}Bridge stores this token only in ${bridgeConfigPath}${C.reset}\n\n`);

  const tokenInput = await promptHidden(
    existing.tunnelToken
      ? '  Tunnel token (press Enter to keep the saved token): '
      : '  Tunnel token: '
  );
  const tunnelToken = tokenInput || existing.tunnelToken;

  if (!tunnelToken) {
    process.stdout.write(`\n  ${C.redBold}● [CANCELLED]${C.reset} ${C.white}No token was saved.${C.reset}\n\n`);
    return;
  }

  const urlInput = await promptLine(
    existing.publicUrl
      ? `  Public URL (press Enter to keep ${existing.publicUrl}): `
      : '  Public URL (e.g. https://mcp.example.com): '
  );
  const publicUrl = normalizePublicUrl(urlInput || existing.publicUrl);

  if (!isValidPublicUrl(publicUrl)) {
    process.stdout.write(`\n  ${C.redBold}● [ERROR]${C.reset} ${C.white}Public URL must be a valid https:// URL.${C.reset}\n\n`);
    return;
  }

  writeBridgeConfig({ tunnelToken, publicUrl });

  process.stdout.write(`\n  ${C.voltBold}✓ [SAVED]${C.reset} ${C.white}Bridge will use ${C.cyanBold}${publicUrl}/mcp${C.reset}${C.white}.${C.reset}\n`);
  process.stdout.write(`  ${C.slate}Start it with: ${C.white}bridge .${C.reset}\n\n`);
}

function getCloudflaredDownloadUrl() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') {
    return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  } else if (platform === 'darwin') {
    return arch === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64';
  } else if (platform === 'linux') {
    return arch === 'arm64'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
  }
  return null;
}

function downloadBinaryWithRedirects(url, destPath) {
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download binary: HTTP ${res.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });
        fileStream.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

async function ensureCloudflaredBinary() {
  const exeName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  // 1. Local directory check
  const localPath = path.join(scriptDir, exeName);
  if (fs.existsSync(localPath)) return localPath;

  // 2. System PATH check
  try {
    const cmd = process.platform === 'win32' ? 'where.exe cloudflared' : 'which cloudflared';
    const found = execSync(cmd, { stdio: 'pipe' }).toString().trim().split(/\r?\n/)[0].trim();
    if (found && fs.existsSync(found)) return found;
  } catch (e) {}

  // 3. User cache directory (~/.bridge/bin/)
  const userBridgeDir = path.join(os.homedir(), '.bridge', 'bin');
  const cachedPath = path.join(userBridgeDir, exeName);
  if (fs.existsSync(cachedPath)) return cachedPath;

  // 4. Download on-demand (one-time setup for new machines)
  if (!fs.existsSync(userBridgeDir)) {
    fs.mkdirSync(userBridgeDir, { recursive: true });
  }

  const downloadUrl = getCloudflaredDownloadUrl();
  if (!downloadUrl) {
    throw new Error(`Unsupported platform: ${process.platform} (${process.arch})`);
  }

  process.stdout.write(`\n  ${C.voltBold}● [FIRST RUN]${C.reset} ${C.white}Installing Cloudflare tunnel binary for ${process.platform}-${process.arch}...${C.reset}\n`);
  await downloadBinaryWithRedirects(downloadUrl, cachedPath);
  if (process.platform !== 'win32') {
    fs.chmodSync(cachedPath, 0o755);
  }
  process.stdout.write(`  ${C.voltBold}✓ [READY]${C.reset} ${C.white}Tunnel binary installed successfully!${C.reset}\n\n`);
  return cachedPath;
}

// ---- Adaptive layout helpers ----
// Use the real terminal size (no fake minimums: drawing 80 columns into a 60-column window
// makes every line wrap and the whole frame scroll). Frames are drawn with a 2-column safety
// margin and 1-row bottom barrier so no terminal auto-wraps or scrolls the screen.
const getCols = () => Math.max(20, process.stdout.columns || 100);
const getRows = () => Math.max(8, (process.stdout.rows || 30) - 1);
const getFrameWidth = () => Math.max(19, getCols() - 2);
// Layout tiers: the big ASCII emblem needs room; small windows get a compact brand header.
const isCompact = () => getCols() < 82 || getRows() < 22;

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

// Precise character column width (accounting for CJK, Fullwidth, and wide Emojis)
function charWidth(cp) {
  if (cp === 0 || cp === 0x200B || cp === 0xFEFF) return 0;
  if (cp < 32 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if ((cp >= 0x0300 && cp <= 0x036f) || (cp >= 0x1ab0 && cp <= 0x1aff) ||
      (cp >= 0x1dc0 && cp <= 0x1dff) || (cp >= 0x20d0 && cp <= 0x20ff) ||
      (cp >= 0xfe20 && cp <= 0xfe2f)) return 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x231a && cp <= 0x231b) ||
    (cp >= 0x23e9 && cp <= 0x23ec) ||
    (cp >= 0x23f0 && cp <= 0x23f3) ||
    (cp >= 0x25fd && cp <= 0x25fe) ||
    (cp >= 0x2614 && cp <= 0x2615) ||
    (cp >= 0x2648 && cp <= 0x2653) ||
    (cp >= 0x267f && cp <= 0x267f) ||
    (cp >= 0x2693 && cp <= 0x2693) ||
    (cp >= 0x26a1 && cp <= 0x26a1) ||
    (cp >= 0x26aa && cp <= 0x26ab) ||
    (cp >= 0x26bd && cp <= 0x26be) ||
    (cp >= 0x26c4 && cp <= 0x26c5) ||
    (cp >= 0x26ce && cp <= 0x26cf) ||
    (cp >= 0x26d4 && cp <= 0x26d4) ||
    (cp >= 0x26ea && cp <= 0x26ea) ||
    (cp >= 0x26f2 && cp <= 0x26f3) ||
    (cp >= 0x26f5 && cp <= 0x26f5) ||
    (cp >= 0x26fa && cp <= 0x26fa) ||
    (cp >= 0x26fd && cp <= 0x26fd) ||
    (cp >= 0x2705 && cp <= 0x2705) ||
    (cp >= 0x270a && cp <= 0x270b) ||
    (cp >= 0x2728 && cp <= 0x2728) ||
    (cp >= 0x274c && cp <= 0x274e) ||
    (cp >= 0x2753 && cp <= 0x2755) ||
    (cp >= 0x2757 && cp <= 0x2757) ||
    (cp >= 0x2795 && cp <= 0x2797) ||
    (cp >= 0x27b0 && cp <= 0x27b0) ||
    (cp >= 0x27bf && cp <= 0x27bf) ||
    (cp >= 0x2b1b && cp <= 0x2b1c) ||
    (cp >= 0x2b50 && cp <= 0x2b50) ||
    (cp >= 0x2b55 && cp <= 0x2b55) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f000 && cp <= 0x1faff)
  ) {
    return 2;
  }
  return 1;
}

function visibleWidth(s) {
  const plain = stripAnsi(s);
  let w = 0;
  for (let i = 0; i < plain.length;) {
    const cp = plain.codePointAt(i);
    w += charWidth(cp);
    i += cp > 0xffff ? 2 : 1;
  }
  return w;
}

// Cut a styled line to `width` visible characters without breaking ANSI codes.
function fitLine(line, width) {
  line = String(line);
  if (visibleWidth(line) <= width) return line;
  let out = '';
  let count = 0;
  const re = /\x1b\[[0-9;?]*[A-Za-z]/y;
  for (let i = 0; i < line.length;) {
    re.lastIndex = i;
    const m = re.exec(line);
    if (m) { out += m[0]; i += m[0].length; continue; }
    const cp = line.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    const w = charWidth(cp);
    if (count + w > width - 1) { out += '…'; count++; break; }
    out += ch;
    count += w;
    i += ch.length;
  }
  return out + C.reset;
}

// Shorten the middle of a plain string (good for paths and URLs): "C:\Users\…\project".
function middleEllipsis(text, max) {
  text = String(text);
  if (max <= 1) return text.slice(0, Math.max(0, max));
  if (text.length <= max) return text;
  const keep = max - 1;
  const head = Math.ceil(keep * 0.4);
  return text.slice(0, head) + '…' + text.slice(text.length - (keep - head));
}

// Left text + right text on one line; drops the right part when there is no room.
function spreadLine(left, right, width) {
  const gap = width - visibleWidth(left) - visibleWidth(right);
  if (gap >= 2) return left + ' '.repeat(gap) + right;
  return left;
}

// Lay out "[K] Label" items over as many lines as the width needs.
function flowItems(items, width, indent = '  ', sep = '   ') {
  const lines = [];
  let current = indent;
  for (const item of items) {
    const candidate = current.trim() ? current + sep + item : current + item;
    if (visibleWidth(candidate) > width && current.trim()) {
      lines.push(current);
      current = indent + item;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

const centerPad = (text, width) => ' '.repeat(Math.max(0, Math.floor((width - visibleWidth(text)) / 2)));

// Draw a full frame in place: every line clipped to the window, old content cleared per line,
// exactly `rows` lines (no scroll, no flicker from clearing the whole screen first).
// Size the last frame was painted at. When the window changes size, the terminal reflows
// (re-wraps) whatever is on screen, leaving broken bar fragments that in-place repainting
// cannot reach. So the first frame painted at a new size wipes the whole screen first.
let lastPaintSize = '';
const sizeKey = () => `${getCols()}x${getRows()}`;

function paintFrame(lines) {
  const rows = getRows();
  const width = getFrameWidth();
  const size = sizeKey();
  // Windows Terminal/conpty does not resize the alternate screen after it was entered: drawing a
  // bigger frame into it cuts lines and scrolls the top off. Leaving and re-entering the alternate
  // screen makes a fresh one at the current size.
  const wipe = size !== lastPaintSize ? '\x1b[?1049l\x1b[?1049h\x1b[2J\x1b[3J' : '';
  lastPaintSize = size;
  const visible = lines.slice(0, rows).map(l => fitLine(l, width) + C.reset + '\x1b[K');
  // Re-assert "no auto-wrap" and hidden cursor every frame: some terminals reset modes on resize.
  process.stdout.write('\x1b[?7l\x1b[?25l' + wipe + '\x1b[H' + visible.join('\n') + '\x1b[J');
}

// ---- Resize handling (one place for every screen) ----
// `activeRedraw` repaints whatever screen is showing. Loading animations repaint on their own
// every few ms, so they need nothing; the folder navigator swaps in its own redraw.
let activeRedraw = null;
let resizeTimer = null;
function scheduleResizeRedraw() {
  // Terminals send several sizes while a window is dragged/maximized; draw once it settles.
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    lastPaintSize = ''; // force a full wipe: the terminal has reflowed the old frame
    if (activeRedraw) {
      try { activeRedraw(); } catch (e) {}
    }
  }, 60);
}
process.stdout.on('resize', scheduleResizeRedraw);
// Windows consoles do not always report a resize (e.g. while no key is being read, as during
// the loading screens), so also poll the real size and fire the same path on any change.
let lastSeenSize = '';
setInterval(() => {
  try { if (typeof process.stdout._refreshSize === 'function') process.stdout._refreshSize(); } catch (e) {}
  const size = sizeKey();
  if (size !== lastSeenSize) {
    const first = lastSeenSize === '';
    lastSeenSize = size;
    if (!first) scheduleResizeRedraw();
  }
}, 150).unref();

const UI_WIDTH = 100;
const THIN_BAR = '─'.repeat(UI_WIDTH);
const THICK_BAR = '━'.repeat(UI_WIDTH);
const bar = THIN_BAR;
const thickBar = THICK_BAR;

const isLaunchFromBat = process.argv.includes('--launch');
const rawCliArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const subcommand = rawCliArgs[0] ? rawCliArgs[0].toLowerCase() : '';
const bridgeConfig = readBridgeConfig();
let activeProjectDir = rawCliArgs[0] && subcommand !== 'setup' ? path.resolve(rawCliArgs[0]) : null;
let mcpTunnelUrl = '';
// Version comes from package.json so the UI always shows the installed release.
const CURRENT_VERSION = (() => {
  try { return require('./package.json').version || '0.0.0'; } catch (e) { return '0.0.0'; }
})();
// Numeric semver compare: >0 if a is newer than b. Pre-release tags count as older.
function compareVersions(a, b) {
  const parse = (v) => {
    const [core, pre] = String(v).replace(/^v/, '').split('-');
    return { nums: core.split('.').map(n => parseInt(n, 10) || 0), pre: !!pre };
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (x.nums[i] || 0) - (y.nums[i] || 0);
    if (d) return d;
  }
  return (x.pre === y.pre) ? 0 : (x.pre ? -1 : 1);
}
// The auth token is saved in ~/.bridge/config.json so AI connectors keep working across
// restarts. `bridge rotate-token` replaces it (all connected clients must re-paste the URL).
function loadOrCreateAuthToken() {
  const fromEnv = process.env.BRIDGE_TOKEN || process.env.BRIDGE_AUTH_TOKEN;
  if (fromEnv) return fromEnv;
  if (bridgeConfig.authToken) return bridgeConfig.authToken;
  const fresh = crypto.randomBytes(24).toString('hex');
  try { writeBridgeConfig({ authToken: fresh }); } catch (e) {}
  return fresh;
}
const bridgeAuthToken = subcommand === 'setup' || subcommand === 'rotate-token' ? '' : loadOrCreateAuthToken();
const maskToken = (t) => (t ? `${t.slice(0, 6)}…${t.slice(-4)}` : '');
// Port: named tunnels are configured for localhost:3000 in Cloudflare, quick tunnels can use any free port.
let bridgePort = 3000;
let updateAvailable = null;

function checkForUpdates() {
  try {
    const req = https.get('https://registry.npmjs.org/@markmayandi/bridge/latest', { timeout: 2500 }, (res) => {
      if (res.statusCode === 200) {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.version && compareVersions(data.version, CURRENT_VERSION) > 0) {
              updateAvailable = data.version;
              if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
            }
          } catch (e) {}
        });
      }
    });
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
  } catch (e) {}
}

let serverProcess = null;
let tunnelProcess = null;
let showLiveLogs = false;
let flashNotification = '';
let flashTimer = null;
let isNavigatingFolders = false;
let isEstablishingTunnel = false;
const recentLogs = [];

// Approval requests from the MCP server (deletes, sandbox switches). Answered with Y/N.
const approvalQueue = [];
let confirmingExit = false;
let choosingMode = false;
let overviewView = null; // null | 'menu' | 'review' | 'files' | 'terminals' | 'attach' | 'help'

// =========================================================================
// Overview Panel State & Activity Store
// =========================================================================
const MAX_DIFF_BYTES = 2 * 1024 * 1024;
const PROC_RING_LINES = 200;
const MAX_FINISHED_PROCS = 50;
const FILES_DIR_ENTRY_CAP = 2000;
const FILES_IGNORED_DIRS = new Set(['node_modules', '.git']);
const FILES_SENSITIVE_PATTERNS = [
  /^\.env($|\..+)/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /credentials\.json$/i
];

function isAsciiConsole() {
  if (process.env.TERM === 'dumb') return true;
  if (process.platform === 'win32') {
    const hasModernWin = Boolean(
      process.env.WT_SESSION ||
      process.env.TERM_PROGRAM ||
      process.env.TERM ||
      process.env.ConEmuPID ||
      process.env.ANSICON
    );
    if (!hasModernWin) return true;
  }
  return false;
}

const ASCII_UI = isAsciiConsole();
const ICONS = {
  exists: ASCII_UI ? 'OK' : '✔',
  missing: ASCII_UI ? 'X' : '✘',
  trashed: ASCII_UI ? 'DEL' : '🗑',
  running: ASCII_UI ? '*' : '●',
  stopped: ASCII_UI ? 'x' : '■',
  pointer: ASCII_UI ? '>' : '▸',
  dirOpen: ASCII_UI ? 'v' : '▾',
  dirClosed: ASCII_UI ? '>' : '▸',
  menu: ASCII_UI ? '=' : '≡'
};

// Session changeLog: Map<relPath, { path, op, added, removed, firstBefore, lastAfter, tools[], times[], isDir }>
const changeLog = new Map();
// Process registry: Map<id, { id, command, cwd, background, pid, startTime, endTime, status, code, signal, lines[], partialLine, stdinOpen }>
const procRegistry = new Map();

// Overview UI state (structured so mouse support can be added later)
let overviewMenuIndex = 0;
const OVERVIEW_MENU_ITEMS = [
  { key: 'r', view: 'review', label: 'Review' },
  { key: 'f', view: 'files', label: 'Files' },
  { key: 't', view: 'terminals', label: 'Terminals' },
  { key: 'h', view: 'help', label: 'Help' }
];

// Review view state
let reviewSelectedIndex = 0;
let reviewFocus = 'list'; // 'list' | 'diff'
let reviewDiffScroll = 0;
let reviewConfirmUndo = null; // null | { path }
let reviewInspectExtraPath = null; // optional untouched file opened from Files view
let reviewCachedKey = '';
let reviewCachedDiff = null;

// Files view state
let filesShowAll = false;
let filesSelectedIndex = 0;
const filesExpandedDirs = new Set();
let filesTreeRows = [];
let filesStatCache = new Map(); // relPath -> { exists, size, isDir, mtimeMs }

// Terminals & Attach view state
let terminalsSelectedIndex = 0;
let terminalsConfirmStop = null; // null | { id, command }
const terminalTabs = []; // [{ id, scrollOffset, unreadBelow, inputBuf, inputCursor }]
let activeTabIndex = 0;
let attachConfirmStop = false;
let attachApprovalId = null;
let attachApprovalShownAt = 0;
let attachApprovalGuardTimer = null;

function clearAttachApprovalGuardTimer() {
  if (attachApprovalGuardTimer) {
    clearTimeout(attachApprovalGuardTimer);
    attachApprovalGuardTimer = null;
  }
}

function scheduleAttachApprovalGuardTimer() {
  clearAttachApprovalGuardTimer();
  attachApprovalGuardTimer = setTimeout(() => {
    attachApprovalGuardTimer = null;
    if (!isNavigatingFolders && !isEstablishingTunnel && !isShuttingDown && overviewView === 'attach' && approvalQueue.length > 0) {
      renderDashboard();
    }
  }, ATTACH_APPROVAL_GUARD_MS);
  if (typeof attachApprovalGuardTimer.unref === 'function') attachApprovalGuardTimer.unref();
}

function syncAttachApprovalGuard() {
  if (overviewView === 'attach' && approvalQueue.length > 0) {
    const headId = approvalQueue[0].id;
    if (attachApprovalId !== headId) {
      attachApprovalId = headId;
      attachApprovalShownAt = Date.now();
      scheduleAttachApprovalGuardTimer();
    }
  } else if (approvalQueue.length === 0) {
    attachApprovalId = null;
    attachApprovalShownAt = 0;
    clearAttachApprovalGuardTimer();
  }
}

// Help view state
let helpScroll = 0;

// Throttled re-render for cmd-output (~20 fps / 50 ms)
let outputRenderTimer = null;
function scheduleOutputRender() {
  if (outputRenderTimer) return;
  outputRenderTimer = setTimeout(() => {
    outputRenderTimer = null;
    if (!isNavigatingFolders && !isEstablishingTunnel && !isShuttingDown) {
      renderDashboard();
    }
  }, 50);
}

function isSensitiveName(baseName) {
  return FILES_SENSITIVE_PATTERNS.some(pat => pat.test(baseName));
}

function splitDiffLines(text) {
  if (text === null || text === undefined || text === '') return [];
  const str = String(text);
  const lines = str.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '' && /\r?\n$/.test(str)) lines.pop();
  return lines;
}

function computeLineDiffCounts(before, after) {
  if ((typeof before === 'string' && Buffer.byteLength(before, 'utf8') > MAX_DIFF_BYTES) ||
      (typeof after === 'string' && Buffer.byteLength(after, 'utf8') > MAX_DIFF_BYTES)) {
    return { added: null, removed: null };
  }
  if (before === null || before === undefined) {
    if (after === null || after === undefined) return { added: 0, removed: 0 };
    return { added: splitDiffLines(after).length, removed: 0 };
  }
  if (after === null || after === undefined) {
    return { added: 0, removed: splitDiffLines(before).length };
  }
  const oldLines = splitDiffLines(before);
  const newLines = splitDiffLines(after);
  let prefix = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefix < minLen && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }
  const a = oldLines.slice(prefix, oldLines.length - suffix);
  const b = newLines.slice(prefix, newLines.length - suffix);
  if (a.length === 0) return { added: b.length, removed: 0 };
  if (b.length === 0) return { added: 0, removed: a.length };

  if (a.length * b.length <= 4000000) {
    const shortArr = a.length <= b.length ? a : b;
    const longArr = a.length <= b.length ? b : a;
    const m = shortArr.length;
    let prev = new Uint32Array(m + 1);
    let curr = new Uint32Array(m + 1);
    for (let i = 1; i <= longArr.length; i++) {
      const li = longArr[i - 1];
      curr[0] = 0;
      for (let j = 1; j <= m; j++) {
        if (li === shortArr[j - 1]) curr[j] = prev[j - 1] + 1;
        else curr[j] = prev[j] >= curr[j - 1] ? prev[j] : curr[j - 1];
      }
      const tmp = prev; prev = curr; curr = tmp;
    }
    const lcs = prev[m];
    return { added: b.length - lcs, removed: a.length - lcs };
  }
  const counts = new Map();
  for (const line of a) counts.set(line, (counts.get(line) || 0) + 1);
  let common = 0;
  for (const line of b) {
    const c = counts.get(line) || 0;
    if (c > 0) { common++; counts.set(line, c - 1); }
  }
  return { added: b.length - common, removed: a.length - common };
}

function buildUnifiedDiff(beforeText, afterText) {
  if ((typeof beforeText === 'string' && Buffer.byteLength(beforeText, 'utf8') > MAX_DIFF_BYTES) ||
      (typeof afterText === 'string' && Buffer.byteLength(afterText, 'utf8') > MAX_DIFF_BYTES)) {
    return [{ type: 'meta', text: '~ Diff omitted (file exceeds 2 MB limit).' }];
  }
  const oldLines = beforeText === null || beforeText === undefined ? [] : splitDiffLines(beforeText);
  const newLines = afterText === null || afterText === undefined ? [] : splitDiffLines(afterText);

  if (oldLines.length === 0 && newLines.length === 0) {
    return [{ type: 'meta', text: '(empty file — no differences)' }];
  }
  if (beforeText === null || beforeText === undefined) {
    return newLines.map((text, idx) => ({ type: 'add', oldNum: null, newNum: idx + 1, text }));
  }
  if (afterText === null || afterText === undefined) {
    return oldLines.map((text, idx) => ({ type: 'del', oldNum: idx + 1, newNum: null, text }));
  }

  let prefix = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefix < minLen && oldLines[prefix] === newLines[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }
  const a = oldLines.slice(prefix, oldLines.length - suffix);
  const b = newLines.slice(prefix, newLines.length - suffix);

  const ops = [];
  for (let i = 0; i < prefix; i++) {
    ops.push({ type: 'ctx', oldNum: i + 1, newNum: i + 1, text: oldLines[i] });
  }

  if (a.length === 0 && b.length === 0) {
    return [{ type: 'meta', text: '(no differences vs session baseline)' }];
  }

  if (a.length * b.length <= 2000000) {
    const n = a.length;
    const m = b.length;
    const cols = m + 1;
    const dp = new Uint32Array((n + 1) * cols);
    for (let i = n - 1; i >= 0; i--) {
      const rowOff = i * cols;
      const nextOff = (i + 1) * cols;
      for (let j = m - 1; j >= 0; j--) {
        if (a[i] === b[j]) dp[rowOff + j] = dp[nextOff + j + 1] + 1;
        else dp[rowOff + j] = dp[nextOff + j] >= dp[rowOff + j + 1] ? dp[nextOff + j] : dp[rowOff + j + 1];
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) {
        ops.push({ type: 'ctx', oldNum: prefix + i + 1, newNum: prefix + j + 1, text: a[i] });
        i++; j++;
      } else if (i < n && (j === m || dp[(i + 1) * cols + j] >= dp[i * cols + j + 1])) {
        ops.push({ type: 'del', oldNum: prefix + i + 1, newNum: null, text: a[i] });
        i++;
      } else {
        ops.push({ type: 'add', oldNum: null, newNum: prefix + j + 1, text: b[j] });
        j++;
      }
    }
  } else {
    for (let i = 0; i < a.length; i++) {
      ops.push({ type: 'del', oldNum: prefix + i + 1, newNum: null, text: a[i] });
    }
    for (let j = 0; j < b.length; j++) {
      ops.push({ type: 'add', oldNum: null, newNum: prefix + j + 1, text: b[j] });
    }
  }

  const tailOldStart = oldLines.length - suffix;
  const tailNewStart = newLines.length - suffix;
  for (let k = 0; k < suffix; k++) {
    ops.push({ type: 'ctx', oldNum: tailOldStart + k + 1, newNum: tailNewStart + k + 1, text: oldLines[tailOldStart + k] });
  }

  // Filter to unified hunks with 3 lines of context
  const CONTEXT = 3;
  const keep = new Uint8Array(ops.length);
  let hasChange = false;
  for (let idx = 0; idx < ops.length; idx++) {
    if (ops[idx].type !== 'ctx') {
      hasChange = true;
      const lo = Math.max(0, idx - CONTEXT);
      const hi = Math.min(ops.length - 1, idx + CONTEXT);
      for (let k = lo; k <= hi; k++) keep[k] = 1;
    }
  }
  if (!hasChange) return [{ type: 'meta', text: '(no differences vs session baseline)' }];

  const result = [];
  let inHunk = false;
  for (let idx = 0; idx < ops.length; idx++) {
    if (keep[idx]) {
      if (!inHunk) {
        let hEnd = idx;
        while (hEnd < ops.length && keep[hEnd]) hEnd++;
        const firstOld = ops[idx].oldNum || (ops[idx].newNum || 1);
        const firstNew = ops[idx].newNum || (ops[idx].oldNum || 1);
        let oldCnt = 0;
        let newCnt = 0;
        for (let k = idx; k < hEnd; k++) {
          if (ops[k].type !== 'add') oldCnt++;
          if (ops[k].type !== 'del') newCnt++;
        }
        result.push({ type: 'hunk', text: `@@ -${firstOld},${oldCnt} +${firstNew},${newCnt} @@` });
        inHunk = true;
      }
      result.push(ops[idx]);
    } else {
      inHunk = false;
    }
  }
  return result;
}

// Strip cursor-movement / clear-screen / OSC ANSI codes while preserving SGR colors (\x1b[...m).
function sanitizeTerminalAnsi(text) {
  return String(text)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC
    .replace(/\x1b\[[0-9;?]*([A-Za-z])/g, (m, code) => (code === 'm' ? m : ''))
    .replace(/\x1b[@-Z\\-_]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1a\x1c-\x1f\x7f]/g, '');
}

// Wrap a single SGR-styled line to `width` visible characters, carrying active SGR across wraps.
function wrapAnsiLine(line, width) {
  width = Math.max(4, width);
  const str = String(line);
  if (visibleWidth(str) <= width) return [str];
  const out = [];
  let cur = '';
  let curWidth = 0;
  let activeSgr = '';
  const re = /\x1b\[[0-9;]*m/y;
  for (let i = 0; i < str.length;) {
    re.lastIndex = i;
    const m = re.exec(str);
    if (m) {
      cur += m[0];
      activeSgr = m[0] === '\x1b[0m' || m[0] === '\x1b[m' ? '' : activeSgr + m[0];
      i += m[0].length;
      continue;
    }
    const cp = str.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    if (curWidth >= width) {
      out.push(cur + C.reset);
      cur = activeSgr;
      curWidth = 0;
    }
    cur += ch;
    curWidth++;
    i += ch.length;
  }
  if (cur.length > 0 || out.length === 0) out.push(cur + C.reset);
  return out;
}

// Slice the first `maxWidth` visible characters of an ANSI string (padded with spaces if shorter).
function sliceAnsiPrefix(line, maxWidth) {
  const str = String(line || '');
  let out = '';
  let count = 0;
  const re = /\x1b\[[0-9;?]*[A-Za-z]/y;
  for (let i = 0; i < str.length && count < maxWidth;) {
    re.lastIndex = i;
    const m = re.exec(str);
    if (m) { out += m[0]; i += m[0].length; continue; }
    const cp = str.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    out += ch;
    count++;
    i += ch.length;
  }
  if (count < maxWidth) out += ' '.repeat(maxWidth - count);
  return out + C.reset;
}

function fmtRelativeTime(ts) {
  if (!ts) return '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function fmtElapsed(startMs, endMs) {
  if (!startMs) return '';
  const sec = Math.max(0, Math.floor(((endMs || Date.now()) - startMs) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m${String(sec % 60).padStart(2, '0')}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h${String(min % 60).padStart(2, '0')}m`;
}

function fmtFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let cachedHasVsCode = null;
function hasVsCode() {
  if (cachedHasVsCode !== null) return cachedHasVsCode;
  try {
    const cmd = process.platform === 'win32' ? 'where.exe code' : 'which code';
    execSync(cmd, { stdio: 'ignore', windowsHide: true });
    cachedHasVsCode = true;
  } catch (e) {
    cachedHasVsCode = false;
  }
  return cachedHasVsCode;
}

function openInDefaultEditor(relPath) {
  if (!activeProjectDir || !relPath) return;
  const absPath = path.resolve(activeProjectDir, relPath);
  const rel = path.relative(activeProjectDir, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return;
  if (!fs.existsSync(absPath)) {
    setFlash(`  ${C.redBold}● [NOT FOUND]${C.reset} ${C.white}${relPath} is not on disk.${C.reset}`, 3000);
    return;
  }
  try {
    let child;
    if (hasVsCode()) {
      child = spawn('code', [absPath], { detached: true, stdio: 'ignore', windowsHide: true, shell: process.platform === 'win32' });
    } else if (process.platform === 'win32') {
      child = spawn('cmd', ['/c', 'start', '', absPath], { detached: true, stdio: 'ignore', windowsHide: true });
    } else if (process.platform === 'darwin') {
      child = spawn('open', [absPath], { detached: true, stdio: 'ignore' });
    } else {
      child = spawn('xdg-open', [absPath], { detached: true, stdio: 'ignore' });
    }
    if (child && typeof child.unref === 'function') child.unref();
    if (child) child.on('error', () => {});
    setFlash(`  ${C.voltBold}● [OPENED]${C.reset} ${C.white}${relPath}${C.reset}`, 2500);
  } catch (err) {
    setFlash(`  ${C.redBold}● [OPEN FAILED]${C.reset} ${C.white}${err.message}${C.reset}`, 3500);
  }
}

function resetSessionActivity() {
  changeLog.clear();
  reviewSelectedIndex = 0;
  reviewFocus = 'list';
  reviewDiffScroll = 0;
  reviewConfirmUndo = null;
  reviewInspectExtraPath = null;
  reviewCachedKey = '';
  reviewCachedDiff = null;
  filesSelectedIndex = 0;
  filesExpandedDirs.clear();
  filesTreeRows = [];
  filesStatCache.clear();
}

function appendProcOutputLine(proc, chunk) {
  const clean = sanitizeTerminalAnsi(chunk);
  if (!clean) return;
  const normalized = clean.replace(/\r\n/g, '\n');
  // Split by \n; handle inline \r by keeping text after the last \r on a line
  const parts = normalized.split('\n');
  if (proc.partialLine) {
    parts[0] = proc.partialLine + parts[0];
    proc.partialLine = '';
  }
  if (!normalized.endsWith('\n')) {
    proc.partialLine = parts.pop();
    if (proc.partialLine.includes('\r')) {
      const segs = proc.partialLine.split('\r');
      proc.partialLine = segs[segs.length - 1];
    }
  } else if (parts.length > 0 && parts[parts.length - 1] === '') {
    parts.pop();
  }
  for (let line of parts) {
    if (line.includes('\r')) {
      const segs = line.split('\r');
      line = segs[segs.length - 1];
    }
    proc.lines.push(line);
    if (proc.lines.length > PROC_RING_LINES) proc.lines.shift();
  }
}

function pruneFinishedProcs() {
  const finished = [];
  for (const [id, p] of procRegistry) {
    if (p.status !== 'running') finished.push([id, p.endTime || p.startTime || 0]);
  }
  if (finished.length <= MAX_FINISHED_PROCS) return;
  finished.sort((a, b) => a[1] - b[1]);
  const toDrop = finished.length - MAX_FINISHED_PROCS;
  for (let i = 0; i < toDrop; i++) {
    procRegistry.delete(finished[i][0]);
  }
}

function getOrderedProcesses() {
  const running = [];
  const finished = [];
  for (const p of procRegistry.values()) {
    if (p.status === 'running') running.push(p);
    else finished.push(p);
  }
  running.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
  finished.sort((a, b) => (b.endTime || b.startTime || 0) - (a.endTime || a.startTime || 0));
  return [...running, ...finished];
}

function getSessionStats() {
  let totalAdded = 0;
  let totalRemoved = 0;
  let hasApprox = false;
  let newCount = 0;
  let modCount = 0;
  let delCount = 0;
  for (const entry of changeLog.values()) {
    if (entry.added === null || entry.removed === null) {
      hasApprox = true;
    } else {
      totalAdded += entry.added || 0;
      totalRemoved += entry.removed || 0;
    }
    if (entry.op === 'create') newCount++;
    else if (entry.op === 'delete') delCount++;
    else modCount++;
  }
  let runningCount = 0;
  let finishedCount = 0;
  for (const p of procRegistry.values()) {
    if (p.status === 'running') runningCount++;
    else finishedCount++;
  }
  return { totalAdded, totalRemoved, hasApprox, newCount, modCount, delCount, fileCount: changeLog.size, runningCount, finishedCount };
}

function refreshFilesStat(relPaths) {
  if (!activeProjectDir) return;
  const targets = relPaths || Array.from(changeLog.keys());
  for (const rel of targets) {
    const abs = path.resolve(activeProjectDir, rel);
    const relCheck = path.relative(activeProjectDir, abs);
    if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) continue;
    try {
      const st = fs.statSync(abs);
      filesStatCache.set(rel, { exists: true, size: st.size, isDir: st.isDirectory(), mtimeMs: st.mtimeMs });
    } catch (e) {
      filesStatCache.set(rel, { exists: false, size: null, isDir: false, mtimeMs: null });
    }
  }
}

function handleActivityEvent(evt) {
  if (!evt || !evt.kind) return;
  if (evt.kind === 'project-changed') {
    if (evt.root) activeProjectDir = String(evt.root);
    resetSessionActivity();
    if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    return;
  }
  if (evt.kind === 'file-change') {
    const relPath = String(evt.path || '').replace(/\\/g, '/');
    if (!relPath) return;
    const now = evt.ts || Date.now();
    let entry = changeLog.get(relPath);
    if (!entry) {
      entry = {
        path: relPath,
        op: evt.op || 'modify',
        added: evt.added !== undefined ? evt.added : 0,
        removed: evt.removed !== undefined ? evt.removed : 0,
        firstBefore: evt.op === 'create' ? null : (evt.before !== undefined ? evt.before : null),
        lastAfter: evt.after !== undefined ? evt.after : null,
        tools: evt.tool ? [evt.tool] : [],
        times: [now],
        isDir: Boolean(evt.isDir)
      };
      changeLog.set(relPath, entry);
    } else {
      entry.lastAfter = evt.after !== undefined ? evt.after : entry.lastAfter;
      entry.isDir = Boolean(evt.isDir);
      if (evt.tool && !entry.tools.includes(evt.tool)) entry.tools.push(evt.tool);
      entry.times.push(now);
      if (evt.op === 'delete') entry.op = 'delete';
      else if (evt.op === 'revert') entry.op = 'revert';
      else if (entry.op !== 'create') entry.op = evt.op || 'modify';
      if (evt.added === null || evt.removed === null) {
        entry.added = null;
        entry.removed = null;
      } else {
        const totals = computeLineDiffCounts(entry.firstBefore, entry.lastAfter);
        entry.added = totals.added;
        entry.removed = totals.removed;
      }
    }
    reviewCachedKey = '';
    refreshFilesStat([relPath]);
    if (overviewView && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    return;
  }
  if (evt.kind === 'cmd-start') {
    const id = String(evt.id);
    procRegistry.set(id, {
      id,
      command: String(evt.command || ''),
      cwd: String(evt.cwd || activeProjectDir || ''),
      background: Boolean(evt.background),
      pid: evt.pid || null,
      startTime: evt.ts || Date.now(),
      endTime: null,
      status: 'running',
      code: null,
      signal: null,
      lines: [],
      partialLine: '',
      stdinOpen: true
    });
    if (overviewView && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    return;
  }
  if (evt.kind === 'cmd-output') {
    const id = String(evt.id);
    const proc = procRegistry.get(id);
    if (!proc) return;
    appendProcOutputLine(proc, evt.chunk || '');
    for (const tab of terminalTabs) {
      if (tab.id === id && tab.scrollOffset > 0) tab.unreadBelow = true;
    }
    if (overviewView === 'attach' || overviewView === 'terminals' || overviewView === 'menu') {
      scheduleOutputRender();
    }
    return;
  }
  if (evt.kind === 'cmd-stdin-closed') {
    const id = String(evt.id);
    const proc = procRegistry.get(id);
    if (!proc) return;
    proc.stdinOpen = false;
    if (overviewView && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    return;
  }
  if (evt.kind === 'cmd-exit') {
    const id = String(evt.id);
    const proc = procRegistry.get(id);
    if (!proc) return;
    if (proc.partialLine) {
      proc.lines.push(proc.partialLine);
      if (proc.lines.length > PROC_RING_LINES) proc.lines.shift();
      proc.partialLine = '';
    }
    proc.status = evt.status || 'exited';
    proc.code = evt.code !== undefined ? evt.code : null;
    proc.signal = evt.signal !== undefined ? evt.signal : null;
    proc.endTime = evt.ts || Date.now();
    proc.stdinOpen = false;
    pruneFinishedProcs();
    if (overviewView && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
  }
}

function applyServerSnapshot(msg) {
  if (!msg) return;
  if (msg.root && activeProjectDir && path.resolve(msg.root) !== path.resolve(activeProjectDir)) {
    activeProjectDir = String(msg.root);
    resetSessionActivity();
  }
  if (Array.isArray(msg.files)) {
    for (const f of msg.files) {
      if (!f || !f.path) continue;
      changeLog.set(f.path, {
        path: f.path,
        op: f.op || 'modify',
        added: f.added !== undefined ? f.added : 0,
        removed: f.removed !== undefined ? f.removed : 0,
        firstBefore: f.firstBefore !== undefined ? f.firstBefore : null,
        lastAfter: f.lastAfter !== undefined ? f.lastAfter : null,
        tools: Array.isArray(f.tools) ? f.tools.slice() : [],
        times: Array.isArray(f.times) ? f.times.slice() : [],
        isDir: Boolean(f.isDir)
      });
    }
    refreshFilesStat();
  }
  if (Array.isArray(msg.commands)) {
    for (const c of msg.commands) {
      if (!c || !c.id) continue;
      procRegistry.set(c.id, {
        id: c.id,
        command: String(c.command || ''),
        cwd: String(c.cwd || ''),
        background: Boolean(c.background),
        pid: c.pid || null,
        startTime: c.startTime || Date.now(),
        endTime: c.endTime || null,
        status: c.status || 'running',
        code: c.code !== undefined ? c.code : null,
        signal: c.signal !== undefined ? c.signal : null,
        lines: Array.isArray(c.lines) ? c.lines.slice(-PROC_RING_LINES).map(sanitizeTerminalAnsi) : [],
        partialLine: '',
        stdinOpen: Boolean(c.stdinOpen)
      });
    }
    pruneFinishedProcs();
  }
  if (overviewView && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
}

function sendServerIpc(payload) {
  try {
    if (serverProcess && serverProcess.connected && typeof serverProcess.send === 'function') {
      serverProcess.send(payload);
      return true;
    }
  } catch (e) {}
  return false;
}

// Approval modes (how often the AI must ask before acting). Harmful commands are blocked in all of them.
const APPROVAL_MODES = [
  { id: 'turbo', key: '1', name: 'TURBO', short: 'never asks', desc: 'Never asks. Writes, commands and deletes run immediately (harmful commands still blocked).' },
  { id: 'review', key: '2', name: 'REVIEW', short: 'asks every change', desc: 'Asks before every change: each write, edit, command, job and delete.' },
  { id: 'default', key: '3', name: 'DEFAULT', short: 'asks for deletes', desc: 'Asks for deletes, destructive git, secret files and new project folders.' },
  { id: 'auto', key: '4', name: 'AUTO', short: 'asks if not undoable', desc: 'Bridge decides by risk: asks only for actions it cannot undo.' }
];
const modeFromFlag = (process.argv.find(a => a.startsWith('--mode=')) || '').split('=')[1];
let approvalMode = APPROVAL_MODES.some(m => m.id === modeFromFlag) ? modeFromFlag : (bridgeConfig.approvalMode || 'default');
const modeInfo = (id) => APPROVAL_MODES.find(m => m.id === id) || APPROVAL_MODES[2];

function setApprovalMode(id) {
  if (!APPROVAL_MODES.some(m => m.id === id)) return;
  approvalMode = id;
  try { writeBridgeConfig({ approvalMode: id }); } catch (e) {}
  try { if (serverProcess && serverProcess.connected) serverProcess.send({ type: 'set-approval-mode', mode: id }); } catch (e) {}
  const m = modeInfo(id);
  const color = id === 'turbo' ? C.redBold : C.voltBold;
  setFlash(`  ${color}● [MODE: ${m.name}]${C.reset} ${C.white}${m.desc}${C.reset}`, 6000);
}
let isShuttingDown = false;
let tunnelAlive = false;

// ---- MCP server supervisor: restart on crash with backoff, show real status ----
let serverStatus = 'starting'; // starting | online | restarting | failed
let serverStartedAt = 0;
let serverRestarts = 0;
let serverRestartTimer = null;

function pushLog(line) {
  recentLogs.push(`${C.slate}[${new Date().toLocaleTimeString()}]${C.reset} ${line}`);
  if (recentLogs.length > 200) recentLogs.shift();
}

function startServerProcess() {
  serverStatus = serverRestarts > 0 ? 'restarting' : 'starting';
  serverStartedAt = Date.now();
  const child = spawn(process.execPath, [serverScript, activeProjectDir, '--http', String(bridgePort), '--token', bridgeAuthToken, '--approval-mode', approvalMode], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], // ipc channel carries delete/approval prompts
    windowsHide: true
  });
  serverProcess = child;
  child.on('message', handleServerMessage);

  child.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(l => l.trim());
    let justOnline = false;
    lines.forEach(l => {
      if (/listening on/i.test(l)) {
        if (serverStatus !== 'online') justOnline = true;
        serverStatus = 'online';
      }
      pushLog(l);
    });
    if (justOnline) sendServerIpc({ type: 'snapshot-request' });
    if (showLiveLogs || /listening on/i.test(chunk.toString())) renderDashboard();
  });
  child.stdout.on('data', () => {});

  child.on('exit', (code, signal) => {
    if (isShuttingDown || serverProcess !== child) return;
    // Pending approvals belonged to the dead process; drop them.
    approvalQueue.length = 0;
    // Reset the backoff if the server had been healthy for a minute.
    if (Date.now() - serverStartedAt > 60000) serverRestarts = 0;
    serverRestarts++;
    if (serverRestarts > 6) {
      serverStatus = 'failed';
      pushLog(`MCP server keeps crashing (exit ${code ?? signal}). Restart Bridge; check the logs above.`);
      setFlash(`  ${C.redBold}● [SERVER DOWN]${C.reset} ${C.white}MCP server crashed repeatedly. Press [L] for logs, restart Bridge.${C.reset}`, 15000);
      return;
    }
    const delay = Math.min(10000, 500 * 2 ** (serverRestarts - 1));
    serverStatus = 'restarting';
    pushLog(`MCP server exited (${code ?? signal}); restarting in ${Math.round(delay / 100) / 10}s...`);
    setFlash(`  ${C.redBold}● [SERVER RESTARTING]${C.reset} ${C.white}MCP server stopped unexpectedly. Restarting...${C.reset}`, Math.max(3000, delay));
    serverRestartTimer = setTimeout(() => {
      freePort(bridgePort);
      startServerProcess();
      renderDashboard();
    }, delay);
  });

  child.on('error', (err) => {
    pushLog(`Could not start MCP server: ${err.message}`);
  });
}

function answerApproval(approved) {
  const req = approvalQueue.shift();
  if (!req) return;
  syncAttachApprovalGuard();
  try { serverProcess.send({ type: 'approval-response', id: req.id, approved }); } catch (e) {}
  const verdict = approved ? `${C.voltBold}● [APPROVED]` : `${C.redBold}● [DENIED]`;
  recentLogs.push(`${C.slate}[${new Date().toLocaleTimeString()}]${C.reset} ${approved ? 'APPROVED' : 'DENIED'}: ${req.action} ${req.detail}`);
  if (recentLogs.length > 50) recentLogs.shift();
  setFlash(`  ${verdict}${C.reset} ${C.white}${req.action}: ${req.detail.slice(0, 120)}${C.reset}`, 4000);
}

function handleServerMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'approval-request') {
    approvalQueue.push({
      id: msg.id,
      action: String(msg.action || 'Action'),
      detail: String(msg.detail || ''),
      reason: String(msg.reason || ''),
      receivedAt: Date.now()
    });
    syncAttachApprovalGuard();
    if (shouldRingApprovalBell(overviewView)) {
      process.stdout.write('\x07'); // terminal bell in full-screen Overview views
    }
    if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
  } else if (msg.type === 'approval-mode' && msg.mode) {
    approvalMode = msg.mode;
  } else if (msg.type === 'project-changed' && msg.path) {
    activeProjectDir = String(msg.path);
    resetSessionActivity();
    setFlash(`  ${C.voltBold}● [SWITCHED]${C.reset} ${C.white}AI switched project folder to: ${C.voltBold}${activeProjectDir}${C.reset}`, 5000);
  } else if (msg.type === 'approval-cancel') {
    const idx = approvalQueue.findIndex(r => r.id === msg.id);
    if (idx !== -1) {
      const [req] = approvalQueue.splice(idx, 1);
      syncAttachApprovalGuard();
      setFlash(`  ${C.redBold}● [TIMED OUT]${C.reset} ${C.white}No answer, denied: ${req.detail.slice(0, 120)}${C.reset}`, 4000);
    }
  } else if (msg.type === 'activity') {
    handleActivityEvent(msg);
  } else if (msg.type === 'snapshot') {
    applyServerSnapshot(msg);
  } else if (msg.type === 'revert-result') {
    reviewCachedKey = '';
    if (msg.ok) {
      setFlash(`  ${C.voltBold}● [REVERTED]${C.reset} ${C.white}${msg.path} restored (${msg.remaining} snapshots left).${C.reset}`, 3500);
    } else {
      setFlash(`  ${C.redBold}● [REVERT FAILED]${C.reset} ${C.white}${msg.error || 'Could not revert file.'}${C.reset}`, 4500);
    }
  }
}

function setFlash(msg, durationMs = 3000) {
  flashNotification = msg;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashNotification = '';
    if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
  }, durationMs);
  if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
}

function copyToClipboard(text) {
  const candidates = process.platform === 'win32' ? [['clip', []]]
    : process.platform === 'darwin' ? [['pbcopy', []]]
    : [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];
  for (const [bin, binArgs] of candidates) {
    try {
      execSync(`${bin} ${binArgs.join(' ')}`, { input: text, stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true });
      return true;
    } catch (e) {}
  }
  return false;
}

// Returns the processes listening on a local port: PID, command line, and parent PID + command
// line (the parent tells a running Bridge's server apart from one left behind by a crash).
function getPortOwners(port) {
  try {
    if (process.platform === 'win32') {
      const ps = `$s = [char]31; Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_); $pp = if ($p) { Get-CimInstance Win32_Process -Filter ('ProcessId=' + $p.ParentProcessId) }; '' + $_ + $s + $p.ParentProcessId + $s + $p.CommandLine + $s + $pp.CommandLine }`;
      const out = execSync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).toString();
      return out.split(/\r?\n/).filter(Boolean).map(l => {
        const [pid, ppid, cmd, parentCmd] = l.split('\x1f');
        return { pid: Number(pid), ppid: Number(ppid) || 0, cmd: cmd || '', parentCmd: parentCmd || '' };
      }).filter(o => o.pid > 0);
    }
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return [...new Set(out.split(/\s+/).filter(Boolean))].map(pid => {
      let cmd = '', ppid = 0, parentCmd = '';
      try { cmd = execSync(`ps -o args= -p ${pid}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
      try { ppid = Number(execSync(`ps -o ppid= -p ${pid}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) || 0; } catch (e) {}
      if (ppid > 1) {
        try { parentCmd = execSync(`ps -o args= -p ${ppid}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
      }
      return { pid: Number(pid), ppid, cmd, parentCmd };
    });
  } catch (e) {
    return [];
  }
}

const isBridgeServerCmd = (cmd) => /secure-folder-mcp[\\/]+server\.js/i.test(cmd || '');

// A Bridge server whose Bridge is still running belongs to another open Bridge window:
// it must never be stopped. Only a server whose Bridge is gone (crash, closed window) is stale.
function hasLiveBridgeParent(owner) {
  if (!owner.ppid || owner.ppid <= 1) return false;
  try {
    process.kill(owner.ppid, 0); // existence check only, sends nothing
  } catch (e) {
    if (e.code !== 'EPERM') return false; // parent is gone
  }
  // Parent PID is alive. If we know its command line and it is not Bridge, the PID was reused.
  if (owner.parentCmd && !/bridge(\.js)?\b/i.test(owner.parentCmd)) return false;
  return true;
}

// Free a port only if it is held by a stale Bridge server. Never stop the user's own apps
// (port 3000 is the default for React/Next/Express dev servers) or another running Bridge.
// Returns { free, otherBridge } where otherBridge is the PID of a running Bridge holding the port.
function freePort(port) {
  const owners = getPortOwners(port);
  let blocked = false;
  let otherBridge = null;
  for (const o of owners) {
    if (isBridgeServerCmd(o.cmd) && !hasLiveBridgeParent(o)) {
      try { process.kill(o.pid); } catch (e) {}
    } else {
      blocked = true;
      if (isBridgeServerCmd(o.cmd)) otherBridge = o.ppid;
    }
  }
  return { free: !blocked, otherBridge };
}

// Set when port 3000 is held by another Bridge that is still running (used in the error message).
let otherBridgeOnDefaultPort = null;

// Fast check (a few ms): try to bind the port ourselves on every address a listener could hold.
// The PowerShell owner lookup takes ~1s per call, so it only runs when a port is really taken.
function canBind(port, host) {
  return new Promise((resolve) => {
    const srv = require('net').createServer();
    srv.once('error', (err) => resolve(err.code === 'EADDRNOTAVAIL' || err.code === 'EAFNOSUPPORT'));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}
async function isPortFree(port) {
  for (const host of ['127.0.0.1', '0.0.0.0', '::']) {
    if (!(await canBind(port, host))) return false;
  }
  return true;
}

async function choosePort(useNamedTunnel) {
  if (await isPortFree(3000)) return 3000;
  const result = freePort(3000);
  otherBridgeOnDefaultPort = result.otherBridge;
  if (result.free) {
    // A stale server was stopped: give the OS a moment to release the port.
    for (let i = 0; i < 20 && !(await isPortFree(3000)); i++) await new Promise(r => setTimeout(r, 100));
    return 3000;
  }
  if (useNamedTunnel) return null; // the named tunnel's ingress points at localhost:3000
  for (let p = 3001; p <= 3020; p++) {
    if (await isPortFree(p)) return p;
  }
  return null;
}

function switchProjectDirectory(newPath) {
  if (!newPath || !fs.existsSync(newPath)) {
    setFlash(`  ${C.redBold}● [ERROR]${C.reset} ${C.white}Invalid directory path.${C.reset}`);
    return;
  }

  const resolved = fs.realpathSync(path.resolve(newPath));
  activeProjectDir = resolved;
  resetSessionActivity();

  // Notify running server
  const req = http.request({
    hostname: '127.0.0.1',
    port: bridgePort,
    path: '/api/set-directory',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bridgeAuthToken}`
    }
  }, (res) => {
    let data = '';
    res.on('data', c => { data += c; });
    res.on('end', () => {
      setFlash(`  ${C.voltBold}● [SWITCHED]${C.reset} ${C.white}Sandboxed project switched to: ${C.voltBold}${path.basename(resolved)}${C.reset}`);
    });
  });

  req.on('error', () => {
    setFlash(`  ${C.voltBold}● [SWITCHED]${C.reset} ${C.white}Project folder switched: ${C.voltBold}${path.basename(resolved)}${C.reset}`);
  });

  req.write(JSON.stringify({ path: resolved }));
  req.end();
}

// Pixel Spirit Art: Matches Bridge theme (Volt Green #D2FF00, Black eyes, two blue/cyan tentacles)
// All 6 legs distinct & separated by space (none attached), zero white dots, static art.
const SPIRIT_ART_LINES = [
  `   ${C.voltBold}▄██████▄${C.reset}   `,
  `  ${C.voltBold}██\x1b[38;2;0;0;0m█${C.voltBold}████\x1b[38;2;0;0;0m█${C.voltBold}██${C.reset}  `,
  `${C.cyanBold}█▀${C.reset} ${C.voltBold}▀██████▀${C.reset} ${C.cyanBold}▀█${C.reset}`,
  `${C.cyanBold}▀▀${C.voltBold}██████████${C.cyanBold}▀▀${C.reset}`,
  `${C.voltBold}▄▀ █ █  █ █ ▀▄${C.reset}`,
  `${C.voltBold}▀▀ ▀ █  █ ▀ ▀▀${C.reset}`
];

const BRIDGE_ASCII_LOGO = [
  `${C.voltBold}██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗${C.reset}`,
  `${C.voltBold}██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝${C.reset}`,
  `${C.voltBold}██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  ${C.reset}`,
  `${C.voltBold}██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  ${C.reset}`,
  `${C.voltBold}██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗${C.reset}`,
  `${C.voltBold}╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝${C.reset}`
];

function renderAsciiHeaderToOut(out, badgeText = '') {
  const barWidth = getFrameWidth();
  const thickBar = '━'.repeat(barWidth);
  const thinBar = '─'.repeat(barWidth);

  // Small window: one-line brand header instead of the 6-line emblem.
  if (isCompact()) {
    out.push(`${C.voltBold}${thickBar}${C.reset}`);
    const brand = `  ${C.voltBold}B R I D G E${C.reset}${badgeText ? '  ' + badgeText : ''}`;
    out.push(spreadLine(brand, `${C.steel}v${CURRENT_VERSION}${C.reset}`, barWidth));
    out.push(`${C.darkDivider}${thinBar}${C.reset}`);
    return;
  }

  const bridgeWidth = 44;
  const spiritWidth = 14;
  const bridgeTargetCol = Math.floor((barWidth - bridgeWidth) / 2);
  const spiritCol = 2;
  const gap = Math.max(1, bridgeTargetCol - (spiritCol + spiritWidth));

  out.push(`${C.voltBold}${thickBar}${C.reset}`);

  for (let i = 0; i < 6; i++) {
    const sp = SPIRIT_ART_LINES[i];
    const br = BRIDGE_ASCII_LOGO[i];
    out.push(' '.repeat(spiritCol) + sp + ' '.repeat(gap) + br);
  }

  out.push(`${C.voltBold}${thickBar}${C.reset}`);

  if (badgeText) {
    const rightInfo = `${C.steel}v${CURRENT_VERSION} • HIGH-SPEED AI MCP HARNESS${C.reset}`;
    out.push(spreadLine(`  ${badgeText}`, rightInfo, barWidth));
    out.push(`${C.darkDivider}${thinBar}${C.reset}`);
  }
}

function renderAsciiHeader(badgeText = '') {
  const out = [];
  renderAsciiHeaderToOut(out, badgeText);
  console.log(out.map(l => fitLine(l, getFrameWidth())).join('\n'));
}

/**
 * =========================================================================
 *  CENTERED BRIDGE WIREFRAME ANIMATION (Detailed Suspension Cables & Towers)
 *  High-resolution catenary wires, faceted titanium towers & loading bar < 3s!
 * =========================================================================
 */
const BRIDGE_WIRE_ASCII = [
  "                       \u001b[38;2;99;111;143m▄\u001b[0m\u001b[38;2;78;90;90m\u001b[48;2;80;102;82m▀\u001b[0m                   \u001b[38;2;53;97;119m\u001b[48;2;28;99;112m▀\u001b[0m\u001b[38;2;66;91;109m\u001b[48;2;92;112;135m▀\u001b[0m                      ",
  "                     \u001b[38;2;93;105;127m▄\u001b[0m\u001b[38;2;102;116;136m\u001b[48;2;120;139;159m▀\u001b[0m\u001b[38;2;105;121;149m\u001b[48;2;69;84;108m▀\u001b[0m\u001b[38;2;51;81;32m\u001b[48;2;47;80;17m▀\u001b[0m                   \u001b[38;2;0;90;102m\u001b[48;2;1;107;119m▀\u001b[0m\u001b[38;2;81;106;126m\u001b[48;2;38;63;77m▀\u001b[0m\u001b[38;2;109;123;150m\u001b[48;2;119;135;159m▀\u001b[0m\u001b[38;2;97;115;141m▄\u001b[0m                    ",
  "                     \u001b[38;2;102;118;139m\u001b[48;2;97;114;135m▀\u001b[0m\u001b[38;2;122;141;162m\u001b[48;2;93;112;129m▀\u001b[0m\u001b[38;2;33;49;72m\u001b[48;2;18;32;59m▀\u001b[0m\u001b[38;2;65;101;26m\u001b[48;2;87;124;31m▀\u001b[0m                   \u001b[38;2;8;138;151m\u001b[48;2;9;161;173m▀\u001b[0m\u001b[38;2;21;48;61m\u001b[48;2;21;46;60m▀\u001b[0m\u001b[38;2;95;109;129m\u001b[48;2;61;76;93m▀\u001b[0m\u001b[38;2;104;122;146m\u001b[48;2;92;111;136m▀\u001b[0m\u001b[38;2;56;81;117m▄\u001b[0m                   ",
  "                     \u001b[38;2;89;106;128m\u001b[48;2;79;97;120m▀\u001b[0m\u001b[38;2;66;85;98m\u001b[48;2;61;78;91m▀\u001b[0m\u001b[38;2;16;28;62m\u001b[48;2;23;35;67m▀\u001b[0m\u001b[38;2;110;147;35m\u001b[48;2;94;131;37m▀\u001b[0m\u001b[38;2;174;238;0m\u001b[48;2;156;221;0m▀\u001b[0m                 \u001b[38;2;0;210;223m▄\u001b[0m\u001b[38;2;6;180;190m\u001b[48;2;8;169;181m▀\u001b[0m\u001b[38;2;27;42;57m\u001b[48;2;33;40;57m▀\u001b[0m\u001b[38;2;41;58;73m\u001b[48;2;41;58;72m▀\u001b[0m\u001b[38;2;82;102;125m\u001b[48;2;77;97;119m▀\u001b[0m\u001b[38;2;63;92;124m\u001b[48;2;64;91;120m▀\u001b[0m                   ",
  "                    \u001b[38;2;78;94;102m\u001b[48;2;102;135;60m▀\u001b[0m\u001b[38;2;78;97;116m\u001b[48;2;80;100;112m▀\u001b[0m\u001b[38;2;52;67;80m\u001b[48;2;43;55;70m▀\u001b[0m\u001b[38;2;36;49;72m\u001b[48;2;42;57;76m▀\u001b[0m\u001b[38;2;61;94;40m\u001b[48;2;54;76;51m▀\u001b[0m\u001b[38;2;132;202;0m\u001b[48;2;119;190;0m▀\u001b[0m\u001b[38;2;149;205;5m▄\u001b[0m               \u001b[38;2;5;195;206m▄\u001b[0m\u001b[38;2;0;198;210m\u001b[48;2;0;180;192m▀\u001b[0m\u001b[38;2;8;124;142m\u001b[48;2;12;92;111m▀\u001b[0m\u001b[38;2;38;52;69m\u001b[48;2;42;68;85m▀\u001b[0m\u001b[38;2;38;53;67m\u001b[48;2;37;49;62m▀\u001b[0m\u001b[38;2;70;87;108m\u001b[48;2;63;72;91m▀\u001b[0m\u001b[38;2;60;95;120m\u001b[48;2;48;122;142m▀\u001b[0m                   ",
  "                   \u001b[38;2;181;234;0m▄\u001b[0m\u001b[38;2;125;162;48m\u001b[48;2;139;175;51m▀\u001b[0m\u001b[38;2;68;84;108m\u001b[48;2;51;64;103m▀\u001b[0m\u001b[38;2;37;49;58m\u001b[48;2;34;45;48m▀\u001b[0m\u001b[38;2;40;55;78m\u001b[48;2;29;41;77m▀\u001b[0m\u001b[38;2;74;99;47m\u001b[48;2;113;146;39m▀\u001b[0m\u001b[38;2;64;152;0m\u001b[48;2;171;227;0m▀\u001b[0m\u001b[38;2;138;202;3m\u001b[48;2;100;176;2m▀\u001b[0m\u001b[38;2;153;212;3m▄\u001b[0m             \u001b[38;2;0;203;215m▄\u001b[0m\u001b[38;2;1;194;205m\u001b[48;2;1;174;188m▀\u001b[0m\u001b[38;2;0;145;163m\u001b[48;2;0;113;141m▀\u001b[0m\u001b[38;2;16;113;130m\u001b[48;2;9;187;197m▀\u001b[0m\u001b[38;2;44;71;90m\u001b[48;2;43;55;71m▀\u001b[0m\u001b[38;2;33;47;58m\u001b[48;2;29;44;55m▀\u001b[0m\u001b[38;2;57;56;74m\u001b[48;2;49;49;65m▀\u001b[0m\u001b[38;2;49;133;152m\u001b[48;2;54;124;143m▀\u001b[0m\u001b[38;2;0;212;224m\u001b[48;2;1;216;227m▀\u001b[0m                  ",
  "                  \u001b[38;2;167;207;3m▄\u001b[0m\u001b[38;2;170;222;0m\u001b[48;2;148;202;0m▀\u001b[0m\u001b[38;2;100;134;63m\u001b[48;2;53;76;85m▀\u001b[0m\u001b[38;2;52;61;95m\u001b[48;2;56;67;86m▀\u001b[0m\u001b[38;2;26;35;40m\u001b[48;2;20;28;35m▀\u001b[0m\u001b[38;2;34;45;75m\u001b[48;2;40;52;71m▀\u001b[0m\u001b[38;2;78;109;36m\u001b[48;2;49;75;41m▀\u001b[0m\u001b[38;2;175;231;0m\u001b[48;2;118;187;0m▀\u001b[0m\u001b[38;2;19;81;9m\u001b[48;2;178;228;5m▀\u001b[0m\u001b[38;2;138;204;4m\u001b[48;2;39;113;2m▀\u001b[0m\u001b[38;2;150;204;3m\u001b[48;2;147;215;3m▀\u001b[0m           \u001b[38;2;1;201;210m▄\u001b[0m\u001b[38;2;1;194;204m\u001b[48;2;1;132;148m▀\u001b[0m\u001b[38;2;3;78;103m\u001b[48;2;2;204;214m▀\u001b[0m\u001b[38;2;0;224;233m\u001b[48;2;0;185;198m▀\u001b[0m\u001b[38;2;8;157;173m\u001b[48;2;10;86;107m▀\u001b[0m\u001b[38;2;41;48;64m\u001b[48;2;38;61;76m▀\u001b[0m\u001b[38;2;27;40;51m\u001b[48;2;25;35;45m▀\u001b[0m\u001b[38;2;39;47;62m\u001b[48;2;32;42;55m▀\u001b[0m\u001b[38;2;57;79;101m\u001b[48;2;58;64;86m▀\u001b[0m\u001b[38;2;5;190;203m\u001b[48;2;10;145;162m▀\u001b[0m\u001b[38;2;0;217;227m▄\u001b[0m                 ",
  "                 \u001b[38;2;170;211;4m▄\u001b[0m\u001b[38;2;166;215;2m\u001b[48;2;150;205;0m▀\u001b[0m\u001b[38;2;104;160;8m\u001b[48;2;38;77;42m▀\u001b[0m\u001b[38;2;56;71;98m\u001b[48;2;69;88;90m▀\u001b[0m\u001b[38;2;48;61;76m\u001b[48;2;37;48;67m▀\u001b[0m\u001b[38;2;17;25;32m\u001b[48;2;15;23;30m▀\u001b[0m\u001b[38;2;35;46;66m\u001b[48;2;32;42;61m▀\u001b[0m\u001b[38;2;66;90;37m\u001b[48;2;59;86;33m▀\u001b[0m \u001b[38;2;135;199;4m▀\u001b[0m\u001b[38;2;171;220;3m\u001b[48;2;143;207;3m▀\u001b[0m\u001b[38;2;69;143;3m\u001b[48;2;159;216;3m▀\u001b[0m\u001b[38;2;144;219;5m\u001b[48;2;75;157;3m▀\u001b[0m\u001b[38;2;126;217;12m▄\u001b[0m       \u001b[38;2;6;203;206m▄\u001b[0m\u001b[38;2;1;206;213m\u001b[48;2;2;153;162m▀\u001b[0m\u001b[38;2;1;151;162m\u001b[48;2;0;182;192m▀\u001b[0m\u001b[38;2;0;183;193m\u001b[48;2;1;204;214m▀\u001b[0m\u001b[38;2;1;201;214m\u001b[48;2;0;88;108m▀\u001b[0m \u001b[38;2;10;116;136m\u001b[48;2;9;110;129m▀\u001b[0m\u001b[38;2;34;55;71m\u001b[48;2;31;50;64m▀\u001b[0m\u001b[38;2;23;31;43m\u001b[48;2;21;29;41m▀\u001b[0m\u001b[38;2;26;35;46m\u001b[48;2;21;29;39m▀\u001b[0m\u001b[38;2;56;75;96m\u001b[48;2;54;74;94m▀\u001b[0m\u001b[38;2;30;70;93m\u001b[48;2;43;72;96m▀\u001b[0m\u001b[38;2;0;208;221m\u001b[48;2;0;182;202m▀\u001b[0m\u001b[38;2;6;186;199m\u001b[48;2;1;204;217m▀\u001b[0m                ",
  "                \u001b[38;2;172;215;2m▄\u001b[0m\u001b[38;2;162;211;4m\u001b[48;2;110;168;3m▀\u001b[0m\u001b[38;2;78;148;0m\u001b[48;2;180;229;0m▀\u001b[0m\u001b[38;2;148;184;25m\u001b[48;2;123;161;36m▀\u001b[0m\u001b[38;2;60;77;89m\u001b[48;2;42;55;90m▀\u001b[0m\u001b[38;2;33;43;58m\u001b[48;2;31;41;50m▀\u001b[0m\u001b[38;2;15;23;30m\u001b[48;2;14;23;29m▀\u001b[0m\u001b[38;2;28;38;56m\u001b[48;2;25;35;52m▀\u001b[0m\u001b[38;2;57;85;32m\u001b[48;2;56;82;29m▀\u001b[0m   \u001b[38;2;137;205;3m▀\u001b[0m\u001b[38;2;151;219;2m\u001b[48;2;107;182;2m▀\u001b[0m\u001b[38;2;81;162;9m\u001b[48;2;129;210;5m▀\u001b[0m\u001b[38;2;96;206;40m\u001b[48;2;88;180;22m▀\u001b[0m\u001b[38;2;91;219;71m\u001b[48;2;70;187;60m▀\u001b[0m\u001b[38;2;61;194;88m▄\u001b[0m\u001b[38;2;56;192;124m▄\u001b[0m\u001b[38;2;43;199;174m▄\u001b[0m\u001b[38;2;23;183;167m▄\u001b[0m\u001b[38;2;19;190;186m\u001b[48;2;6;168;168m▀\u001b[0m\u001b[38;2;5;156;162m\u001b[48;2;1;191;197m▀\u001b[0m\u001b[38;2;1;191;200m\u001b[48;2;1;170;180m▀\u001b[0m\u001b[38;2;1;194;205m▀\u001b[0m\u001b[38;2;0;79;100m▀\u001b[0m  \u001b[38;2;8;106;126m\u001b[48;2;6;104;124m▀\u001b[0m\u001b[38;2;27;47;59m\u001b[48;2;24;42;54m▀\u001b[0m\u001b[38;2;20;29;40m\u001b[48;2;20;29;39m▀\u001b[0m\u001b[38;2;17;27;37m\u001b[48;2;14;23;32m▀\u001b[0m\u001b[38;2;51;51;70m\u001b[48;2;47;54;72m▀\u001b[0m\u001b[38;2;32;135;151m\u001b[48;2;37;89;107m▀\u001b[0m\u001b[38;2;0;183;210m\u001b[48;2;2;210;220m▀\u001b[0m\u001b[38;2;1;189;204m\u001b[48;2;0;120;150m▀\u001b[0m\u001b[38;2;0;201;215m\u001b[48;2;1;204;218m▀\u001b[0m               ",
  "              \u001b[38;2;180;209;5m▄\u001b[0m\u001b[38;2;176;211;3m\u001b[48;2;156;198;4m▀\u001b[0m\u001b[38;2;142;191;4m\u001b[48;2;119;161;2m▀\u001b[0m\u001b[38;2;141;180;5m\u001b[48;2;165;204;4m▀\u001b[0m\u001b[38;2;162;213;0m▀\u001b[0m\u001b[38;2;30;54;74m\u001b[48;2;45;56;84m▀\u001b[0m\u001b[38;2;55;69;87m\u001b[48;2;51;67;81m▀\u001b[0m\u001b[38;2;24;34;44m\u001b[48;2;20;30;40m▀\u001b[0m\u001b[38;2;14;23;30m\u001b[48;2;15;24;31m▀\u001b[0m\u001b[38;2;22;32;48m\u001b[48;2;20;29;45m▀\u001b[0m\u001b[38;2;53;80;28m\u001b[48;2;50;77;27m▀\u001b[0m   \u001b[38;2;146;207;4m▄\u001b[0m\u001b[38;2;138;215;21m▄\u001b[0m\u001b[38;2;5;65;0m\u001b[48;2;121;211;37m▀\u001b[0m\u001b[38;2;86;172;19m\u001b[48;2;90;185;53m▀\u001b[0m\u001b[38;2;80;176;53m\u001b[48;2;77;180;67m▀\u001b[0m\u001b[38;2;74;218;110m\u001b[48;2;49;143;71m▀\u001b[0m\u001b[38;2;55;213;140m\u001b[48;2;4;62;25m▀\u001b[0m\u001b[38;2;40;210;170m\u001b[48;2;11;99;67m▀\u001b[0m\u001b[38;2;18;183;169m\u001b[48;2;21;157;144m▀\u001b[0m\u001b[38;2;3;160;161m\u001b[48;2;10;170;168m▀\u001b[0m\u001b[38;2;0;76;85m\u001b[48;2;3;196;201m▀\u001b[0m\u001b[38;2;4;207;214m▄\u001b[0m\u001b[38;2;0;204;213m▄\u001b[0m   \u001b[38;2;6;107;126m\u001b[48;2;6;97;119m▀\u001b[0m\u001b[38;2;21;38;50m\u001b[48;2;18;36;48m▀\u001b[0m\u001b[38;2;18;27;38m\u001b[48;2;17;26;37m▀\u001b[0m\u001b[38;2;12;20;29m\u001b[48;2;11;20;29m▀\u001b[0m\u001b[38;2;43;60;75m\u001b[48;2;39;51;67m▀\u001b[0m\u001b[38;2;45;44;63m\u001b[48;2;42;61;80m▀\u001b[0m\u001b[38;2;5;154;174m▀\u001b[0m\u001b[38;2;0;205;219m\u001b[48;2;0;190;206m▀\u001b[0m\u001b[38;2;2;152;176m\u001b[48;2;1;186;203m▀\u001b[0m\u001b[38;2;1;207;218m\u001b[48;2;0;172;193m▀\u001b[0m\u001b[38;2;1;203;216m▄\u001b[0m             ",
  "            \u001b[38;2;176;206;3m▄\u001b[0m\u001b[38;2;178;208;3m\u001b[48;2;154;193;3m▀\u001b[0m\u001b[38;2;160;198;3m\u001b[48;2;132;168;3m▀\u001b[0m\u001b[38;2;122;166;2m\u001b[48;2;158;193;4m▀\u001b[0m\u001b[38;2;169;204;2m\u001b[48;2;122;164;4m▀\u001b[0m\u001b[38;2;68;112;0m\u001b[48;2;169;219;0m▀\u001b[0m\u001b[38;2;148;202;11m▄\u001b[0m\u001b[38;2;49;64;72m\u001b[48;2;53;68;67m▀\u001b[0m\u001b[38;2;45;59;77m\u001b[48;2;40;52;72m▀\u001b[0m\u001b[38;2;18;28;37m\u001b[48;2;17;27;35m▀\u001b[0m\u001b[38;2;16;27;32m\u001b[48;2;17;28;34m▀\u001b[0m\u001b[38;2;12;20;44m\u001b[48;2;10;18;44m▀\u001b[0m\u001b[38;2;76;101;25m\u001b[48;2;79;106;26m▀\u001b[0m\u001b[38;2;168;216;1m\u001b[48;2;154;218;1m▀\u001b[0m\u001b[38;2;140;194;3m\u001b[48;2;141;210;3m▀\u001b[0m\u001b[38;2;129;190;3m\u001b[48;2;138;212;2m▀\u001b[0m\u001b[38;2;115;182;5m\u001b[48;2;128;210;3m▀\u001b[0m\u001b[38;2;99;178;12m\u001b[48;2;117;209;8m▀\u001b[0m\u001b[38;2;83;171;21m\u001b[48;2;107;218;25m▀\u001b[0m\u001b[38;2;69;171;39m\u001b[48;2;90;216;50m▀\u001b[0m\u001b[38;2;47;169;63m\u001b[48;2;68;217;81m▀\u001b[0m\u001b[38;2;39;191;98m\u001b[48;2;46;209;104m▀\u001b[0m\u001b[38;2;30;227;156m\u001b[48;2;25;205;135m▀\u001b[0m\u001b[38;2;10;212;175m\u001b[48;2;11;206;168m▀\u001b[0m\u001b[38;2;0;180;167m\u001b[48;2;2;213;198m▀\u001b[0m\u001b[38;2;1;165;168m\u001b[48;2;1;216;219m▀\u001b[0m\u001b[38;2;2;159;165m\u001b[48;2;0;214;221m▀\u001b[0m\u001b[38;2;2;162;172m\u001b[48;2;1;208;215m▀\u001b[0m\u001b[38;2;2;171;184m\u001b[48;2;1;200;209m▀\u001b[0m\u001b[38;2;1;176;190m\u001b[48;2;1;204;215m▀\u001b[0m\u001b[38;2;1;181;195m\u001b[48;2;1;202;215m▀\u001b[0m\u001b[38;2;1;204;215m\u001b[48;2;1;205;221m▀\u001b[0m\u001b[38;2;4;148;163m\u001b[48;2;5;153;170m▀\u001b[0m\u001b[38;2;17;25;36m\u001b[48;2;19;25;36m▀\u001b[0m\u001b[38;2;16;28;38m\u001b[48;2;17;29;39m▀\u001b[0m\u001b[38;2;11;20;29m\u001b[48;2;12;22;31m▀\u001b[0m\u001b[38;2;35;48;62m\u001b[48;2;32;47;61m▀\u001b[0m\u001b[38;2;45;61;79m\u001b[48;2;44;48;64m▀\u001b[0m\u001b[38;2;44;62;83m\u001b[48;2;20;134;148m▀\u001b[0m\u001b[38;2;0;221;230m▄\u001b[0m\u001b[38;2;2;183;198m\u001b[48;2;5;171;185m▀\u001b[0m\u001b[38;2;1;175;196m\u001b[48;2;2;181;199m▀\u001b[0m\u001b[38;2;1;178;198m\u001b[48;2;0;172;191m▀\u001b[0m\u001b[38;2;1;202;215m\u001b[48;2;1;175;194m▀\u001b[0m\u001b[38;2;2;199;214m▄\u001b[0m           ",
  "         \u001b[38;2;129;192;0m▄\u001b[0m\u001b[38;2;143;196;2m▄\u001b[0m\u001b[38;2;172;209;2m\u001b[48;2;147;194;3m▀\u001b[0m\u001b[38;2;145;184;3m\u001b[48;2;114;158;3m▀\u001b[0m\u001b[38;2;132;167;2m\u001b[48;2;118;160;2m▀\u001b[0m\u001b[38;2;158;189;7m\u001b[48;2;107;148;1m▀\u001b[0m\u001b[38;2;130;179;4m\u001b[48;2;116;163;1m▀\u001b[0m\u001b[38;2;140;192;2m\u001b[48;2;119;165;3m▀\u001b[0m\u001b[38;2;155;218;0m\u001b[48;2;127;174;0m▀\u001b[0m\u001b[38;2;124;178;16m\u001b[48;2;74;102;42m▀\u001b[0m\u001b[38;2;41;52;70m\u001b[48;2;42;53;72m▀\u001b[0m\u001b[38;2;40;52;66m\u001b[48;2;35;47;61m▀\u001b[0m\u001b[38;2;15;26;35m\u001b[48;2;15;26;35m▀\u001b[0m\u001b[38;2;19;30;37m\u001b[48;2;19;31;39m▀\u001b[0m\u001b[38;2;13;22;46m\u001b[48;2;23;33;49m▀\u001b[0m\u001b[38;2;74;101;27m\u001b[48;2;43;72;34m▀\u001b[0m\u001b[38;2;156;211;0m▀\u001b[0m\u001b[38;2;133;195;3m▀\u001b[0m\u001b[38;2;121;185;2m▀\u001b[0m\u001b[38;2;99;166;3m▀\u001b[0m\u001b[38;2;62;140;5m▀\u001b[0m          \u001b[38;2;0;136;159m▀\u001b[0m\u001b[38;2;0;160;177m▀\u001b[0m\u001b[38;2;2;175;190m▀\u001b[0m\u001b[38;2;0;195;208m▀\u001b[0m\u001b[38;2;6;145;161m\u001b[48;2;10;78;98m▀\u001b[0m\u001b[38;2;22;31;42m\u001b[48;2;25;45;56m▀\u001b[0m\u001b[38;2;18;30;40m\u001b[48;2;20;31;41m▀\u001b[0m\u001b[38;2;13;24;33m\u001b[48;2;16;27;37m▀\u001b[0m\u001b[38;2;28;43;56m\u001b[48;2;26;39;51m▀\u001b[0m\u001b[38;2;43;45;61m\u001b[48;2;42;52;69m▀\u001b[0m\u001b[38;2;25;107;123m\u001b[48;2;32;68;86m▀\u001b[0m\u001b[38;2;1;205;224m\u001b[48;2;0;175;189m▀\u001b[0m\u001b[38;2;3;189;204m\u001b[48;2;1;165;183m▀\u001b[0m\u001b[38;2;1;157;175m\u001b[48;2;2;164;180m▀\u001b[0m\u001b[38;2;3;181;196m\u001b[48;2;2;149;170m▀\u001b[0m\u001b[38;2;1;169;186m\u001b[48;2;2;162;182m▀\u001b[0m\u001b[38;2;1;172;192m\u001b[48;2;2;149;173m▀\u001b[0m\u001b[38;2;1;196;212m\u001b[48;2;2;179;200m▀\u001b[0m\u001b[38;2;2;195;210m▄\u001b[0m\u001b[38;2;0;210;220m▄\u001b[0m        ",
  "    \u001b[38;2;34;113;22m▄\u001b[0m\u001b[38;2;46;123;33m▄\u001b[0m\u001b[38;2;55;134;38m▄\u001b[0m\u001b[38;2;79;161;27m\u001b[48;2;64;140;32m▀\u001b[0m\u001b[38;2;88;156;15m\u001b[48;2;57;115;21m▀\u001b[0m\u001b[38;2;103;160;5m▀\u001b[0m\u001b[38;2;90;143;2m▀\u001b[0m\u001b[38;2;79;122;1m▀\u001b[0m\u001b[38;2;92;132;0m▀\u001b[0m     \u001b[38;2;26;34;69m\u001b[48;2;36;47;59m▀\u001b[0m\u001b[38;2;44;56;72m\u001b[48;2;42;54;69m▀\u001b[0m\u001b[38;2;34;48;61m\u001b[48;2;29;39;53m▀\u001b[0m\u001b[38;2;16;27;36m\u001b[48;2;20;31;41m▀\u001b[0m\u001b[38;2;21;33;42m\u001b[48;2;23;35;43m▀\u001b[0m\u001b[38;2;24;35;52m\u001b[48;2;28;39;56m▀\u001b[0m\u001b[38;2;44;75;36m\u001b[48;2;42;73;38m▀\u001b[0m                   \u001b[38;2;11;92;111m\u001b[48;2;13;86;107m▀\u001b[0m\u001b[38;2;27;46;58m\u001b[48;2;30;48;62m▀\u001b[0m\u001b[38;2;23;34;44m\u001b[48;2;25;38;47m▀\u001b[0m\u001b[38;2;18;30;40m\u001b[48;2;23;35;44m▀\u001b[0m\u001b[38;2;26;38;50m\u001b[48;2;25;34;47m▀\u001b[0m\u001b[38;2;42;56;73m\u001b[48;2;37;48;63m▀\u001b[0m\u001b[38;2;33;43;61m\u001b[48;2;35;49;65m▀\u001b[0m\u001b[38;2;25;55;75m▄\u001b[0m   \u001b[38;2;0;131;154m▀\u001b[0m\u001b[38;2;2;141;161m▀\u001b[0m\u001b[38;2;1;125;147m▀\u001b[0m\u001b[38;2;2;141;163m▀\u001b[0m\u001b[38;2;2;159;176m\u001b[48;2;0;63;86m▀\u001b[0m\u001b[38;2;5;163;179m\u001b[48;2;5;124;144m▀\u001b[0m\u001b[38;2;34;171;191m\u001b[48;2;25;138;157m▀\u001b[0m\u001b[38;2;25;127;147m▄\u001b[0m\u001b[38;2;6;117;137m▄\u001b[0m    ",
  " \u001b[38;2;4;30;0m▄\u001b[0m\u001b[38;2;12;60;4m\u001b[48;2;5;45;0m▀\u001b[0m\u001b[38;2;19;75;7m▀\u001b[0m\u001b[38;2;24;85;17m▀\u001b[0m\u001b[38;2;34;93;25m▀\u001b[0m            \u001b[38;2;34;45;61m\u001b[48;2;33;44;59m▀\u001b[0m\u001b[38;2;35;47;60m\u001b[48;2;21;28;38m▀\u001b[0m\u001b[38;2;5;6;12m\u001b[48;2;0;2;5m▀\u001b[0m\u001b[38;2;22;31;42m\u001b[48;2;10;14;21m▀\u001b[0m\u001b[38;2;25;38;48m\u001b[48;2;29;40;52m▀\u001b[0m\u001b[38;2;30;40;59m\u001b[48;2;33;43;62m▀\u001b[0m\u001b[38;2;38;73;42m\u001b[48;2;40;75;44m▀\u001b[0m                   \u001b[38;2;14;85;106m\u001b[48;2;15;80;102m▀\u001b[0m\u001b[38;2;33;51;66m\u001b[48;2;35;52;69m▀\u001b[0m\u001b[38;2;27;39;50m\u001b[48;2;32;45;58m▀\u001b[0m\u001b[38;2;28;40;52m\u001b[48;2;18;26;36m▀\u001b[0m\u001b[38;2;7;9;17m\u001b[48;2;0;2;6m▀\u001b[0m\u001b[38;2;19;25;35m\u001b[48;2;7;12;18m▀\u001b[0m\u001b[38;2;39;52;69m\u001b[48;2;33;46;61m▀\u001b[0m\u001b[38;2;24;37;55m\u001b[48;2;25;38;53m▀\u001b[0m          \u001b[38;2;5;79;102m▀\u001b[0m\u001b[38;2;2;89;109m▀\u001b[0m\u001b[38;2;2;81;102m▀\u001b[0m\u001b[38;2;0;72;91m\u001b[48;2;0;58;74m▀\u001b[0m\u001b[38;2;0;44;62m▄\u001b[0m\u001b[38;2;0;17;40m▄\u001b[0m",
  "                 \u001b[38;2;19;34;44m\u001b[48;2;26;38;49m▀\u001b[0m\u001b[38;2;30;40;53m\u001b[48;2;22;30;41m▀\u001b[0m\u001b[38;2;8;13;19m\u001b[48;2;5;10;16m▀\u001b[0m\u001b[38;2;5;10;15m\u001b[48;2;8;15;22m▀\u001b[0m\u001b[38;2;3;7;11m\u001b[48;2;8;15;21m▀\u001b[0m\u001b[38;2;19;27;36m\u001b[48;2;5;11;15m▀\u001b[0m\u001b[38;2;38;49;68m\u001b[48;2;33;42;59m▀\u001b[0m\u001b[38;2;37;73;44m\u001b[48;2;38;75;50m▀\u001b[0m                   \u001b[38;2;16;77;97m\u001b[48;2;20;77;97m▀\u001b[0m\u001b[38;2;40;57;74m\u001b[48;2;43;60;78m▀\u001b[0m\u001b[38;2;30;40;54m\u001b[48;2;12;18;26m▀\u001b[0m\u001b[38;2;4;9;14m\u001b[48;2;5;10;16m▀\u001b[0m\u001b[38;2;6;11;17m\u001b[48;2;9;16;22m▀\u001b[0m\u001b[38;2;3;7;12m\u001b[48;2;6;13;18m▀\u001b[0m\u001b[38;2;22;32;43m\u001b[48;2;12;19;27m▀\u001b[0m\u001b[38;2;27;40;54m\u001b[48;2;23;34;47m▀\u001b[0m                ",
  "                 \u001b[38;2;22;32;42m\u001b[48;2;12;21;30m▀\u001b[0m\u001b[38;2;13;21;29m\u001b[48;2;10;19;27m▀\u001b[0m\u001b[38;2;8;16;23m\u001b[48;2;12;22;30m▀\u001b[0m\u001b[38;2;12;21;28m\u001b[48;2;14;23;32m▀\u001b[0m\u001b[38;2;12;21;28m\u001b[48;2;13;23;31m▀\u001b[0m\u001b[38;2;7;15;20m\u001b[48;2;12;21;28m▀\u001b[0m\u001b[38;2;15;19;32m\u001b[48;2;7;11;21m▀\u001b[0m\u001b[38;2;36;72;52m\u001b[48;2;17;42;28m▀\u001b[0m                   \u001b[38;2;25;83;105m\u001b[48;2;15;57;73m▀\u001b[0m\u001b[38;2;27;41;54m\u001b[48;2;9;18;26m▀\u001b[0m\u001b[38;2;5;10;15m\u001b[48;2;9;16;23m▀\u001b[0m\u001b[38;2;11;19;26m\u001b[48;2;12;21;29m▀\u001b[0m\u001b[38;2;11;20;27m\u001b[48;2;13;23;31m▀\u001b[0m\u001b[38;2;11;20;27m\u001b[48;2;13;22;30m▀\u001b[0m\u001b[38;2;9;16;22m\u001b[48;2;10;18;25m▀\u001b[0m\u001b[38;2;17;25;35m\u001b[48;2;10;18;26m▀\u001b[0m                "
];

async function playInitialLoadingAnimation(durationMs = 2200) {
  // Enter alternate buffer, disable auto-wrap, and hide cursor - NO frames ever enter scrollback!
  process.stdout.write('\x1b[?1049h\x1b[?7l\x1b[?25l\x1b[2J\x1b[H');
  const startTime = Date.now();
  const logoWidth = 68;

  while (true) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);

    const cols = getFrameWidth();
    const rows = getRows();
    const thickBar = '━'.repeat(cols);
    const thinBar = '─'.repeat(cols);
    // The bridge artwork is 68x16; only draw it when it fits with the text around it.
    const showArt = cols >= logoWidth + 2 && rows >= BRIDGE_WIRE_ASCII.length + 12;

    const out = [];
    out.push(`${C.voltBold}${thickBar}${C.reset}`);
    const topHeader = `  ${C.voltBold}${cols >= 60 ? 'BRIDGE // UNIVERSAL LOCAL-TO-WEB AI HARNESS' : 'BRIDGE'}${C.reset}`;
    out.push(spreadLine(topHeader, `${C.steel}v${CURRENT_VERSION}  ${C.reset}`, cols));
    out.push(`${C.darkDivider}${thinBar}${C.reset}`);

    const body = [];
    if (showArt) {
      const padLeft = ' '.repeat(Math.max(0, Math.floor((cols - logoWidth) / 2)));
      for (const line of BRIDGE_WIRE_ASCII) body.push(padLeft + line);
      body.push('');
    }
    const titleText = `${C.voltBold}${cols >= 30 ? 'B   R   I   D   G   E' : 'BRIDGE'}${C.reset}`;
    body.push(centerPad(titleText, cols) + titleText);

    const leftEndpoint = cols >= 60 ? '[LOCAL WORKSPACE]' : '[LOCAL]';
    const rightEndpoint = cols >= 60 ? '[CLOUD AI MODEL]' : '[CLOUD AI]';
    const trackWidth = Math.min(cols - 4, Math.max(20, Math.floor(cols * 0.6)));
    const dashCount = Math.max(1, Math.floor((trackWidth - leftEndpoint.length - rightEndpoint.length - 3) / 2));
    const subTitle = `${C.steel}${leftEndpoint} ${C.voltBold}${'─'.repeat(dashCount)}━${'─'.repeat(dashCount)}${C.cyanBold} ${rightEndpoint}${C.reset}`;
    body.push(centerPad(subTitle, cols) + subTitle);
    body.push('');

    const barLen = Math.max(8, Math.min(76, Math.floor(cols * 0.58), cols - 10));
    const pct = Math.min(100, Math.round(progress * 100));
    const filled = Math.min(barLen, Math.round(progress * barLen));
    const barLine = `[${C.voltBold}${'█'.repeat(filled)}${C.steel}${'░'.repeat(barLen - filled)}${C.reset}]  ${C.voltBold}${pct}%${C.reset}`;
    body.push(centerPad(barLine, cols) + barLine);

    const statusMsg = progress >= 1.0 ? 'BRIDGE READY' : 'STARTING BRIDGE...';
    body.push(centerPad(statusMsg, cols) + `${C.whiteBold}${statusMsg}${C.reset}`);

    // Center the body vertically between the header and the pinned bottom bar.
    const free = rows - out.length - 1 - body.length;
    const topMargin = Math.max(0, Math.floor(free / 2));
    for (let i = 0; i < topMargin; i++) out.push('');
    out.push(...body);
    while (out.length < rows - 1) out.push('');
    out.push(`${C.voltBold}${thickBar}${C.reset}`);

    paintFrame(out);

    if (progress >= 1.0) break;
    await new Promise(r => setTimeout(r, 35));
  }

  await new Promise(r => setTimeout(r, 120));
}

async function playTunnelCreationAnimation(getTunnelUrlFn, minDurationMs = 2500, maxDurationMs = 20000) {
  process.stdout.write('\x1b[?1049h\x1b[?7l\x1b[?25l\x1b[2J\x1b[H');

  const startTime = Date.now();
  let frame = 0;

  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const stages = [
    'Mounting Bridge & local project sandbox...',
    'Connecting to Cloudflare edge...',
    'Allocating public HTTPS tunnel for MCP...',
    'Finalizing SSE streaming...'
  ];

  const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
  // Comet trails fade from the bright head into the dim wire.
  const OUT_TRAIL = [C.voltBold, rgb(170, 210, 0), rgb(120, 150, 0), rgb(75, 92, 10)];
  const BACK_TRAIL = [C.cyanBold, rgb(60, 160, 210), rgb(40, 110, 150), rgb(30, 70, 95)];

  // One lane of the link as colored cells. Lit wire up to `lit` cells, dim dashes after it,
  // comets riding on top: outbound (left → right) or return (right → left).
  function buildLane(len, lit, step, dir, comets, done) {
    const cells = [];
    for (let i = 0; i < len; i++) {
      const isLit = done || (dir > 0 ? i < lit : i >= len - lit);
      cells.push(isLit
        ? { ch: '━', col: done ? (dir > 0 ? C.volt : C.cyan) : rgb(45, 60, 70) }
        : { ch: i % 2 ? ' ' : '╌', col: C.darkDivider });
    }
    if (comets) {
      const trail = dir > 0 ? OUT_TRAIL : BACK_TRAIL;
      const count = Math.max(1, Math.floor(len / 26));
      const span = len + trail.length;
      for (let k = 0; k < count; k++) {
        const p = (step + Math.floor((k * span) / count)) % span;
        for (let t = 0; t < trail.length; t++) {
          const pos = dir > 0 ? p - t : len - 1 - (p - t);
          if (pos < 0 || pos >= len) continue;
          cells[pos] = { ch: t === 0 ? (dir > 0 ? '▶' : '◀') : '━', col: trail[t] };
        }
      }
    }
    return cells;
  }

  const paintCells = (cells) => cells.map(c => c.col + c.ch).join('') + C.reset;

  // Link diagram scaled to the window:
  //   ╭──────────╮          CLOUDFLARE EDGE          ╭──────────╮
  //   │ LOCAL PC ├─ ━━▶ ╌ ╌ ╌ ╌ ╌ ◆ ╌ ╌ ╌ ╌ ━━▶ ╌ ─┤ CLOUD AI │
  //   │  :3000   ├─ ╌ ╌ ◀━━ ╌ ╌ ╌ ◆ ╌ ╌ ◀━━ ╌ ╌ ╌ ─┤ MCP / SSE│
  //   ╰──────────╯                                   ╰──────────╯
  // Small windows get a single-lane version.
  function buildLinkBlock(width, step, pct, done) {
    const lit = (len) => Math.round((pct / 100) * len);
    const pulse = Math.floor(step / 4) % 2 === 0;
    const node = done ? `${C.voltBold}◆` : (pulse ? `${C.voltBold}◆` : `${C.cyan}◇`);
    const replies = done || pct >= 35; // replies start once the edge has answered

    if (width < 52) {
      const left = `${C.voltBold}PC${C.reset} `;
      const right = ` ${done ? C.cyanBold : C.slate}AI${C.reset}`;
      const len = Math.max(6, width - 6);
      const half = Math.floor(len / 2);
      const lane = buildLane(len, lit(len), step, 1, !done, done);
      lane[half] = { ch: node.replace(/\x1b\[[0-9;]*m/g, ''), col: node.match(/^(\x1b\[[0-9;]*m)/)[1] };
      return [`  ${left}${paintCells(lane)}${right}`];
    }

    const boxW = 12;
    const len = Math.max(10, width - 2 - boxW * 2);
    const half = Math.floor(len / 2);
    const port = String(bridgePort ? `:${bridgePort}` : 'local');
    const localCol = C.voltBold;
    const cloudCol = done ? C.cyanBold : (pulse ? C.slate : C.steel);
    const center = (s, w) => { const l = Math.floor((w - s.length) / 2); return ' '.repeat(Math.max(0, l)) + s + ' '.repeat(Math.max(0, w - s.length - l)); };

    const lane1 = buildLane(len, lit(len), step, 1, !done, done);
    const lane2 = buildLane(len, replies ? lit(len) : 0, step + 7, -1, !done && replies, done);
    const nodeCell = { ch: node.replace(/\x1b\[[0-9;]*m/g, ''), col: node.match(/^(\x1b\[[0-9;]*m)/)[1] };
    lane1[half] = nodeCell;
    lane2[half] = nodeCell;
    lane1[0] = lane2[0] = { ch: '─', col: localCol };
    lane1[len - 1] = lane2[len - 1] = { ch: '─', col: cloudCol };

    const edgeLabel = done ? 'SECURE TUNNEL LIVE' : 'CLOUDFLARE EDGE';
    const labelCol = done ? C.voltBold : C.slate;
    return [
      `  ${localCol}╭${'─'.repeat(boxW - 2)}╮${C.reset}${labelCol}${center(edgeLabel, len)}${C.reset}${cloudCol}╭${'─'.repeat(boxW - 2)}╮${C.reset}`,
      `  ${localCol}│${C.whiteBold}${center('LOCAL PC', boxW - 2)}${localCol}├${C.reset}${paintCells(lane1)}${cloudCol}┤${C.whiteBold}${center('CLOUD AI', boxW - 2)}${cloudCol}│${C.reset}`,
      `  ${localCol}│${C.slate}${center(port, boxW - 2)}${localCol}├${C.reset}${paintCells(lane2)}${cloudCol}┤${C.slate}${center('MCP / SSE', boxW - 2)}${cloudCol}│${C.reset}`,
      `  ${localCol}╰${'─'.repeat(boxW - 2)}╯${C.reset}${' '.repeat(len)}${cloudCol}╰${'─'.repeat(boxW - 2)}╯${C.reset}`
    ];
  }

  // Stage checklist: done stages ticked, the current one spins, later ones wait.
  function buildStageLines(pct, done, spinner) {
    const current = done ? stages.length : Math.min(stages.length - 1, Math.floor((pct / 100) * stages.length));
    return stages.map((s, i) => {
      if (i < current) return `  ${C.voltBold}✓${C.reset} ${C.slate}${s}${C.reset}`;
      if (i === current) return `  ${C.cyanBold}${spinner}${C.reset} ${C.whiteBold}${s}${C.reset}`;
      return `  ${C.steel}○ ${s}${C.reset}`;
    });
  }

  function drawFrame(badge, statusLine, pct, url) {
    const cols = getFrameWidth();
    const rows = getRows();
    const thickBar = '━'.repeat(cols);
    const thinBar = '─'.repeat(cols);
    const done = pct >= 100;
    const barLen = Math.max(8, Math.min(76, Math.floor(cols * 0.58), cols - 6));
    const filled = Math.round((pct / 100) * barLen);

    const out = [];
    renderAsciiHeaderToOut(out, badge, Math.floor(frame / 6));
    const link = buildLinkBlock(cols - 2, frame, pct, done);
    const stageLines = buildStageLines(pct, done, spinners[frame % spinners.length]);
    // Room left = window - header - link - divider - status - bar - url/stages - bottom bar.
    const room = rows - out.length - link.length - (link.length > 1 ? 2 : 0) - 5;
    if (link.length > 1) out.push('');
    out.push(...link);
    if (link.length > 1) out.push('');
    out.push(`${C.darkDivider}${thinBar}${C.reset}`);
    out.push(statusLine);
    out.push(`  [${C.voltBold}${'█'.repeat(filled)}${C.steel}${'░'.repeat(barLen - filled)}${C.reset}]`);
    if (url) {
      out.push(`  ${C.voltBold}● MCP URL: ${C.cyanBold}${middleEllipsis(url, Math.max(10, cols - 14))}${C.reset}`);
    } else if (room >= stageLines.length + 1) {
      out.push('');
      out.push(...stageLines);
    } else {
      const cur = Math.min(stages.length - 1, Math.floor((pct / 100) * stages.length));
      out.push(`  ${C.slate}● ${stages[cur]}${C.reset}`);
    }
    while (out.length < rows - 1) out.push('');
    out.push(`${C.voltBold}${thickBar}${C.reset}`);
    paintFrame(out);
  }

  while (true) {
    const elapsed = Date.now() - startTime;
    const url = getTunnelUrlFn();
    if ((url && elapsed >= minDurationMs) || elapsed >= maxDurationMs) break;

    let progress = Math.min(0.92, (elapsed / (minDurationMs + 800)));
    if (url) progress = 0.98;
    const pct = Math.round(progress * 100);
    const spinner = spinners[frame % spinners.length];
    drawFrame(`${C.bgVolt} ESTABLISHING TUNNEL ${C.reset}`,
      `  ${C.voltBold}${spinner}${C.reset} ${C.whiteBold}CREATING CLOUDFLARE TUNNEL${C.reset}  ${C.voltBold}${String(pct).padStart(3, ' ')}%${C.reset}`, pct, null);
    frame++;
    await new Promise(r => setTimeout(r, 60));
  }

  // Final frame: only claim success when a URL really exists.
  const finalUrl = getTunnelUrlFn();
  if (finalUrl) {
    drawFrame(`${C.bgVolt} TUNNEL ACTIVE ${C.reset}`,
      `  ${C.voltBold}✓${C.reset} ${C.whiteBold}CLOUDFLARE TUNNEL CONNECTED${C.reset}  ${C.voltBold}100%${C.reset}`, 100, `${finalUrl}/mcp`);
  } else {
    drawFrame(`${C.redBold} TUNNEL PENDING ${C.reset}`,
      `  ${C.redBold}!${C.reset} ${C.whiteBold}Tunnel not ready yet — it keeps trying in the background.${C.reset}`, 92, null);
  }
  await new Promise(r => setTimeout(r, finalUrl ? 400 : 1500));
}

function selectDirectoryInteractive(startDir) {
  return new Promise((resolve) => {
    isNavigatingFolders = true;
    let currentDir = startDir && fs.existsSync(startDir) ? path.resolve(startDir) : process.cwd();
    let selectedIndex = 0;
    let isTypingPath = false;
    let typedPath = '';
    let errorMessage = '';

    // Switch to Alternate Screen Buffer, disable line wrap & hide cursor (locks viewport, ZERO scrollback!)
    process.stdout.write('\x1b[?1049h\x1b[?7l\x1b[?25l\x1b[2J\x1b[H');

    function getItems() {
      const items = [
        { type: 'select_current', name: `[USE CURRENT FOLDER: ${path.basename(currentDir) || currentDir}]`, fullPath: currentDir }
      ];

      const parentDir = path.dirname(currentDir);
      if (parentDir && parentDir !== currentDir) {
        items.push({ type: 'parent', name: '.. (Parent Directory)', fullPath: parentDir });
      }

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        const dirs = entries
          .filter(e => {
            try {
              return e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules';
            } catch (err) {
              return false;
            }
          })
          .map(e => ({ type: 'dir', name: `${e.name}/`, fullPath: path.join(currentDir, e.name) }))
          .sort((a, b) => a.name.localeCompare(b.name));

        items.push(...dirs);
      } catch (err) {
        errorMessage = 'Access denied or unable to read directory.';
      }

      return items;
    }

    let items = getItems();

    function renderNav() {
      const rows = getRows();
      const barWidth = getFrameWidth();
      const thickBar = '━'.repeat(barWidth);
      const thinBar = '─'.repeat(barWidth);

      const out = [];
      renderAsciiHeaderToOut(out, `${C.bgVolt} DIRECTORY NAVIGATOR ${C.reset}`);

      // Current folder (middle-shortened to fit) with the item counter on the right.
      const counter = `${C.steel}[${items.length} items]${C.reset}`;
      const label = barWidth >= 50 ? 'Current Folder: ' : '';
      const room = Math.max(8, barWidth - 2 - label.length - (barWidth >= 40 ? visibleWidth(counter) + 2 : 0));
      const folderLeft = `  ${C.slate}${label}${C.reset}${C.voltBold}${middleEllipsis(currentDir, room)}${C.reset}`;
      out.push(barWidth >= 40 ? spreadLine(folderLeft, counter, barWidth) : folderLeft);
      out.push(`${C.darkDivider}${thinBar}${C.reset}`);

      if (errorMessage) {
        out.push(`  ${C.redBold}● [NOTE] ${errorMessage}${C.reset}`);
        errorMessage = '';
        out.push(`${C.darkDivider}${thinBar}${C.reset}`);
      }

      if (isTypingPath) {
        out.push('');
        out.push(`  ${C.voltBold}Type or Paste Directory Path:${C.reset}`);
        // Show the end of a long typed path so the cursor stays visible.
        const maxTyped = Math.max(5, barWidth - 6);
        const shown = typedPath.length > maxTyped ? '…' + typedPath.slice(-(maxTyped - 1)) : typedPath;
        out.push(`  > ${C.whiteBold}${shown}${C.reset}_`);
        out.push('');
        out.push(...flowItems([`${C.voltBold}[Enter]${C.reset} Confirm`, `${C.voltBold}[Esc]${C.reset} Back`], barWidth));
        while (out.length < rows - 1) out.push('');
        out.push(`${C.voltBold}${thickBar}${C.reset}`);
      } else {
        const helpItems = [
          `${C.voltBold}[↑/↓]${C.reset} ${C.white}Navigate${C.reset}`,
          `${C.voltBold}[Enter]${C.reset} ${C.white}Open${C.reset}`,
          `${C.voltBold}[Space]${C.reset} ${C.white}Select${C.reset}`,
          `${C.voltBold}[T]${C.reset} ${C.white}Type Path${C.reset}`,
          `${C.voltBold}[Backspace]${C.reset} ${C.white}Up${C.reset}`,
          `${C.voltBold}[Esc]${C.reset} ${C.white}Cancel${C.reset}`,
          `${C.voltBold}[${selectedIndex + 1}/${items.length}]${C.reset}`
        ];
        const helpLines = flowItems(helpItems, barWidth);
        // Rows left for the list = window - header/folder - divider - help - bottom bar.
        const maxVisible = Math.max(1, rows - out.length - helpLines.length - 2);
        let startIdx = 0;
        if (selectedIndex >= maxVisible) startIdx = selectedIndex - maxVisible + 1;
        const visibleItems = items.slice(startIdx, startIdx + maxVisible);
        const itemWidth = Math.max(4, barWidth - 7);

        visibleItems.forEach((item, relIdx) => {
          const actualIdx = startIdx + relIdx;
          const name = middleEllipsis(item.name, itemWidth);
          if (actualIdx === selectedIndex) {
            out.push(`  ${C.bgVolt} ► ${name.padEnd(itemWidth)}${C.reset}`);
          } else {
            const color = item.type === 'select_current' ? C.voltBold : (item.type === 'parent' ? C.steel : C.white);
            out.push(`     ${color}${name}${C.reset}`);
          }
        });
        for (let i = visibleItems.length; i < maxVisible; i++) out.push('');

        out.push(`${C.darkDivider}${thinBar}${C.reset}`);
        out.push(...helpLines);
        out.push(`${C.voltBold}${thickBar}${C.reset}`);
      }

      paintFrame(out);
    }

    renderNav();

    const previousRedraw = activeRedraw;
    activeRedraw = renderNav;

    function onNavKey(str, key) {
      try {
        if (!key) return;

        if (isTypingPath) {
          if (key.name === 'return') {
            isTypingPath = false;
            if (typedPath && fs.existsSync(typedPath) && fs.statSync(typedPath).isDirectory()) {
              cleanup();
              resolve(fs.realpathSync(path.resolve(typedPath)));
              return;
            } else {
              errorMessage = `Directory "${typedPath}" does not exist.`;
              typedPath = '';
              renderNav();
              return;
            }
          } else if (key.name === 'escape') {
            isTypingPath = false;
            typedPath = '';
            renderNav();
            return;
          } else if (key.name === 'backspace') {
            typedPath = typedPath.slice(0, -1);
            renderNav();
            return;
          } else if (str && !key.ctrl && !key.meta) {
            typedPath += str;
            renderNav();
            return;
          }
          return;
        }

        // Navigation Mode
        if (key.name === 'up') {
          selectedIndex = Math.max(0, selectedIndex - 1);
          renderNav();
        } else if (key.name === 'down') {
          selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
          renderNav();
        } else if (key.name === 't') {
          isTypingPath = true;
          typedPath = '';
          renderNav();
        } else if (key.name === 'backspace') {
          const parentDir = path.dirname(currentDir);
          if (parentDir && parentDir !== currentDir) {
            currentDir = parentDir;
            items = getItems();
            selectedIndex = 0;
            renderNav();
          }
        } else if (key.name === 'space') {
          const sel = items[selectedIndex];
          if (sel) {
            cleanup();
            resolve(sel.fullPath);
          }
        } else if (key.name === 'return') {
          const sel = items[selectedIndex];
          if (!sel) return;

          if (sel.type === 'select_current') {
            cleanup();
            resolve(sel.fullPath);
          } else if (sel.type === 'parent' || sel.type === 'dir') {
            currentDir = sel.fullPath;
            items = getItems();
            selectedIndex = 0;
            renderNav();
          }
        } else if (key.ctrl && key.name === 'c') {
          cleanup();
          cleanupAndExit();
          return;
        } else if (key.name === 'escape') {
          cleanup();
          resolve(currentDir);
        }
      } catch (err) {
        errorMessage = 'Navigation error: ' + err.message;
        renderNav();
      }
    }

    function cleanup() {
      activeRedraw = previousRedraw;
      process.stdin.removeListener('keypress', onNavKey);
      isNavigatingFolders = false;
      lastPaintSize = ''; // next screen starts from a clean slate
      process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
    }

    process.stdin.on('keypress', onNavKey);
  });
}

// Wrap plain text into lines of at most `width` characters (breaks long words too).
function wrapPlain(text, width, maxLines) {
  const lines = [];
  let rest = String(text);
  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= width) { lines.push(rest); rest = ''; break; }
    let cut = rest.lastIndexOf(' ', width);
    if (cut < width * 0.5) cut = width;
    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^ /, '');
  }
  if (rest.length > 0 && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.slice(0, Math.max(0, width - 1)) + '…';
  }
  return lines;
}

// =========================================================================
// Overview Panel Renderers (Menu, Review, Files, Terminals, Attach, Help)
// =========================================================================

function buildApprovalBannerLines(barWidth, divider) {
  if (approvalQueue.length === 0) return [];
  const req = approvalQueue[0];
  const more = approvalQueue.length > 1 ? ` ${C.slate}(+${approvalQueue.length - 1} waiting)${C.reset}` : '';
  const out = [];
  out.push(`  ${C.redBold}● PERMISSION NEEDED${C.reset} ${C.whiteBold}${req.action}${C.reset}${more}`);
  wrapPlain(req.detail, Math.max(6, barWidth - 4), 4).forEach(l => out.push(`    ${C.cyanBold}${l}${C.reset}`));
  if (req.reason) wrapPlain(`Reason: it ${req.reason}`, Math.max(6, barWidth - 4), 2).forEach(l => out.push(`    ${C.slate}${l}${C.reset}`));
  const left = Math.max(0, 90 - Math.floor((Date.now() - req.receivedAt) / 1000));
  const guardHint = overviewView === 'attach' && isApprovalGuardActive(attachApprovalShownAt)
    ? `    ${C.volt}(typing paused — wait, then press Y/N)${C.reset}`
    : '';
  out.push(`    ${C.voltBold}[Y]${C.reset} ${C.white}Allow${C.reset}    ${C.redBold}[N]${C.reset} ${C.white}Deny${C.reset}    ${C.slate}(auto-deny in ${left}s)${C.reset}${guardHint}`);
  out.push(divider);
  return out;
}

function buildOverviewMenuBox(boxWidth) {
  const stats = getSessionStats();
  const inner = Math.max(16, boxWidth - 2);
  const diffMeta = stats.hasApprox
    ? `${C.volt}~${C.reset}`
    : (stats.fileCount > 0
      ? `${C.volt}+${stats.totalAdded}${C.reset}  ${C.red}−${stats.totalRemoved}${C.reset}`
      : `${C.slate}0 changes${C.reset}`);
  const filesParts = [];
  if (stats.newCount > 0) filesParts.push(`${stats.newCount} new`);
  if (stats.modCount > 0) filesParts.push(`${stats.modCount} mod`);
  if (stats.delCount > 0) filesParts.push(`${stats.delCount} del`);
  const filesMeta = filesParts.length > 0
    ? `${C.lightSlate}${filesParts.join(' · ')}${C.reset}`
    : `${C.slate}0 touched${C.reset}`;
  const termsMeta = stats.runningCount > 0
    ? `${C.voltBold}${stats.runningCount} running${C.reset}`
    : (stats.finishedCount > 0 ? `${C.slate}${stats.finishedCount} done${C.reset}` : `${C.slate}idle${C.reset}`);

  const metaByView = {
    review: diffMeta,
    files: filesMeta,
    terminals: termsMeta,
    help: ''
  };

  const titlePrefix = '─ Overview ';
  const titleSuffix = ASCII_UI ? ' : ' : ' ⋮ ';
  const fillCount = Math.max(1, inner - titlePrefix.length - titleSuffix.length);
  const topBorder = `${C.voltBold}┌${titlePrefix}${'─'.repeat(fillCount)}${titleSuffix}┐${C.reset}`;
  const bottomBorder = `${C.voltBold}└${'─'.repeat(inner)}┘${C.reset}`;

  const rows = [topBorder];
  OVERVIEW_MENU_ITEMS.forEach((item, idx) => {
    const selected = idx === overviewMenuIndex;
    const ptr = selected ? `${C.voltBold}${ICONS.pointer}${C.reset}` : ' ';
    const keyTag = `[${item.key.toUpperCase()}]`;
    const left = selected
      ? ` ${ptr} ${C.voltBold}${keyTag} ${item.label}${C.reset}`
      : ` ${ptr} ${C.voltBold}${keyTag}${C.reset} ${C.white}${item.label}${C.reset}`;
    const right = metaByView[item.view] ? `${metaByView[item.view]} ` : '';
    const leftW = visibleWidth(left);
    const rightW = visibleWidth(right);
    let content;
    if (leftW + rightW + 1 <= inner) {
      content = left + ' '.repeat(inner - leftW - rightW) + right;
    } else {
      const clipped = fitLine(left, inner);
      content = clipped + ' '.repeat(Math.max(0, inner - visibleWidth(clipped)));
    }
    rows.push(`${C.voltBold}│${C.reset}${content}${C.voltBold}│${C.reset}`);
  });
  rows.push(bottomBorder);
  return rows;
}

function overlayOverviewMenu(baseLines, barWidth, rows) {
  const narrow = getCols() < 60;
  const boxWidth = narrow ? Math.max(20, barWidth) : Math.min(37, Math.max(33, barWidth - 2));
  const menuLines = buildOverviewMenuBox(boxWidth);
  const out = baseLines.slice();
  while (out.length < rows) out.push('');

  // Keep approval banner above the menu if one is active; otherwise place right at top.
  const startRow = approvalQueue.length > 0 ? Math.min(out.length - menuLines.length, 6) : (narrow ? 0 : 1);
  const topRow = Math.max(0, startRow);

  if (narrow) {
    for (let i = 0; i < menuLines.length && topRow + i < rows; i++) {
      out[topRow + i] = menuLines[i];
    }
    menuBoxHit = { top: topRow + 1, left: 1, right: boxWidth, height: menuLines.length };
    return out;
  }

  const colStart = Math.max(0, barWidth - boxWidth);
  menuBoxHit = { top: topRow + 1, left: colStart + 1, right: colStart + boxWidth, height: menuLines.length };
  for (let i = 0; i < menuLines.length && topRow + i < rows; i++) {
    const r = topRow + i;
    const leftPart = sliceAnsiPrefix(out[r], colStart);
    out[r] = leftPart + menuLines[i];
  }
  return out;
}

function getReviewEntries() {
  const entries = Array.from(changeLog.values());
  if (reviewInspectExtraPath && !changeLog.has(reviewInspectExtraPath)) {
    entries.unshift({
      path: reviewInspectExtraPath,
      op: 'view',
      added: 0,
      removed: 0,
      firstBefore: null,
      lastAfter: null,
      tools: [],
      times: [],
      isDir: false,
      untrackedView: true
    });
  }
  return entries;
}

function readDiskTextSafe(relPath) {
  if (!activeProjectDir || !relPath) return { exists: false, text: null, oversized: false, isDir: false };
  const abs = path.resolve(activeProjectDir, relPath);
  const rel = path.relative(activeProjectDir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return { exists: false, text: null, oversized: false, isDir: false };
  try {
    const st = fs.statSync(abs);
    if (st.isDirectory()) return { exists: true, text: null, oversized: false, isDir: true };
    if (st.size > MAX_DIFF_BYTES) return { exists: true, text: null, oversized: true, isDir: false };
    return { exists: true, text: fs.readFileSync(abs, 'utf8'), oversized: false, isDir: false };
  } catch (e) {
    return { exists: false, text: null, oversized: false, isDir: false };
  }
}

function getReviewDiffData(entry) {
  if (!entry) return { lines: [{ type: 'meta', text: 'No files changed in this session yet.' }], editedOutside: false };
  const disk = readDiskTextSafe(entry.path);
  const editedOutside = Boolean(
    !entry.untrackedView &&
    entry.op !== 'delete' &&
    disk.exists &&
    !disk.oversized &&
    !disk.isDir &&
    entry.lastAfter !== null &&
    disk.text !== entry.lastAfter
  );
  const cacheKey = `${entry.path}|${entry.times.length}|${entry.op}|${disk.exists}|${disk.oversized}|${disk.text ? disk.text.length : -1}|${editedOutside}`;
  if (reviewCachedKey === cacheKey && reviewCachedDiff) {
    return { lines: reviewCachedDiff, editedOutside };
  }

  let lines;
  if (entry.isDir || disk.isDir) {
    lines = [{ type: 'meta', text: entry.op === 'delete' ? '(deleted folder — kept in Bridge trash)' : '(directory)' }];
  } else if (disk.oversized || entry.added === null) {
    lines = [{ type: 'meta', text: '~ Diff omitted (file exceeds 2 MB limit).' }];
  } else if (entry.untrackedView) {
    if (!disk.exists) {
      lines = [{ type: 'meta', text: '(file not found on disk)' }];
    } else {
      lines = splitDiffLines(disk.text).map((text, idx) => ({ type: 'ctx', oldNum: idx + 1, newNum: idx + 1, text }));
    }
  } else if (entry.op === 'delete' && !disk.exists) {
    lines = entry.firstBefore !== null
      ? buildUnifiedDiff(entry.firstBefore, null)
      : [{ type: 'meta', text: '(deleted — copy kept in Bridge trash)' }];
  } else {
    const afterText = disk.exists ? disk.text : entry.lastAfter;
    lines = buildUnifiedDiff(entry.firstBefore, afterText);
  }
  reviewCachedKey = cacheKey;
  reviewCachedDiff = lines;
  return { lines, editedOutside };
}

function renderReviewView(rows, barWidth) {
  const thinBar = '─'.repeat(barWidth);
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;
  const stats = getSessionStats();
  const entries = getReviewEntries();
  if (reviewSelectedIndex >= entries.length) reviewSelectedIndex = Math.max(0, entries.length - 1);

  const out = [];
  out.push(...buildApprovalBannerLines(barWidth, divider));

  const totals = stats.hasApprox
    ? `${C.volt}~${C.reset}`
    : `${C.volt}+${stats.totalAdded}${C.reset} ${C.red}−${stats.totalRemoved}${C.reset}`;
  const leftHdr = ` ${C.voltBold}REVIEW${C.reset}  ${totals}  ${C.slate}· ${stats.fileCount} file${stats.fileCount === 1 ? '' : 's'}${C.reset}`;
  const rightHdr = `${C.slate}[Esc] back${C.reset} `;
  out.push(spreadLine(leftHdr, rightHdr, barWidth));
  out.push(divider);

  if (reviewConfirmUndo) {
    out.push(`  ${C.redBold}● UNDO LAST AI CHANGE?${C.reset} ${C.white}${middleEllipsis(reviewConfirmUndo.path, Math.max(10, barWidth - 36))}${C.reset}  ${C.voltBold}[Y]${C.reset} Yes  ${C.redBold}[N]${C.reset} No`);
    out.push(divider);
  } else if (flashNotification) {
    out.push(`  ${String(flashNotification).replace(/^\s+/, '')}`);
    out.push(divider);
  }

  const footerItems = [
    `${C.voltBold}[↑/↓]${C.reset} ${reviewFocus === 'list' ? 'file' : 'scroll'}`,
    `${C.voltBold}[Enter/→]${C.reset} diff`,
    `${C.voltBold}[←]${C.reset} list`,
    `${C.voltBold}[PgUp/Dn g/G]${C.reset} jump`,
    `${C.voltBold}[U]${C.reset} undo`,
    `${C.voltBold}[O]${C.reset} open`,
    `${C.voltBold}[Esc]${C.reset} back`
  ];
  const footerLines = flowItems(footerItems, barWidth, ' ', ' · ');
  const avail = Math.max(3, rows - out.length - footerLines.length - 1);

  if (entries.length === 0) {
    out.push('');
    out.push(`  ${C.slate}No files have been created, edited, or deleted by the AI in this session.${C.reset}`);
    while (out.length < rows - footerLines.length - 1) out.push('');
    out.push(divider);
    out.push(...footerLines);
    paintFrame(out);
    return;
  }

  const listHeight = Math.max(2, Math.min(entries.length, Math.max(3, Math.floor(avail * 0.35))));
  const diffHeight = Math.max(1, avail - listHeight - 1);

  let listStart = 0;
  if (reviewSelectedIndex >= listHeight) listStart = reviewSelectedIndex - listHeight + 1;
  const visibleEntries = entries.slice(listStart, listStart + listHeight);

  visibleEntries.forEach((entry, idx) => {
    const absIdx = listStart + idx;
    const sel = absIdx === reviewSelectedIndex;
    const ptr = sel ? `${reviewFocus === 'list' ? C.voltBold : C.cyanBold}${ICONS.pointer}${C.reset}` : ' ';
    const badge = entry.op === 'create' ? `${C.voltBold}A${C.reset}`
      : entry.op === 'delete' ? `${C.redBold}D${C.reset}`
      : entry.op === 'revert' ? `${C.cyanBold}R${C.reset}`
      : entry.untrackedView ? `${C.slate}V${C.reset}`
      : `${C.volt}M${C.reset}`;

    const disk = readDiskTextSafe(entry.path);
    const editedOutside = Boolean(!entry.untrackedView && entry.op !== 'delete' && disk.exists && !disk.oversized && !disk.isDir && entry.lastAfter !== null && disk.text !== entry.lastAfter);
    const tag = entry.op === 'delete'
      ? ` ${C.slate}(in Bridge trash)${C.reset}`
      : editedOutside ? ` ${C.cyan}(edited outside)${C.reset}`
      : entry.untrackedView ? ` ${C.slate}(read-only view)${C.reset}`
      : '';

    let counts = '';
    if (!entry.untrackedView) {
      if (entry.added === null || entry.removed === null) {
        counts = `${C.volt}~${C.reset}`;
      } else {
        const aStr = entry.added > 0 ? `${C.volt}+${entry.added}${C.reset}` : '';
        const rStr = (entry.removed > 0 || entry.op === 'delete') ? `${C.red}−${entry.removed || 0}${C.reset}` : '';
        counts = [aStr, rStr].filter(Boolean).join('  ');
      }
    }
    const rightMeta = `${counts}${tag}`;
    const maxPathW = Math.max(8, barWidth - visibleWidth(rightMeta) - 9);
    const pText = middleEllipsis(entry.path, maxPathW);
    const nameStyled = sel ? `${C.whiteBold}${pText}${C.reset}` : `${C.white}${pText}${C.reset}`;
    const leftPart = ` ${ptr} ${badge} ${nameStyled}`;
    out.push(spreadLine(leftPart, rightMeta + ' ', barWidth));
  });
  for (let i = visibleEntries.length; i < listHeight; i++) out.push('');

  const selectedEntry = entries[reviewSelectedIndex];
  const { lines: diffLines, editedOutside } = getReviewDiffData(selectedEntry);
  const focusTag = reviewFocus === 'diff' ? `${C.voltBold}[DIFF FOCUS]${C.reset}` : `${C.slate}[LIST FOCUS]${C.reset}`;
  const diffLabel = ` ${focusTag} ${C.whiteBold}${middleEllipsis(selectedEntry.path, Math.max(8, barWidth - 36))}${C.reset}${editedOutside ? ` ${C.cyan}(edited outside)${C.reset}` : ''}`;
  const scrollPct = diffLines.length <= diffHeight ? '' : `${C.slate}${Math.min(diffLines.length, reviewDiffScroll + 1)}/${diffLines.length}${C.reset} `;
  out.push(spreadLine(diffLabel, scrollPct, barWidth));

  const maxScroll = Math.max(0, diffLines.length - diffHeight);
  if (reviewDiffScroll > maxScroll) reviewDiffScroll = maxScroll;
  const shownDiff = diffLines.slice(reviewDiffScroll, reviewDiffScroll + diffHeight);

  for (const dl of shownDiff) {
    if (dl.type === 'meta') {
      out.push(`  ${C.slate}${dl.text}${C.reset}`);
    } else if (dl.type === 'hunk') {
      out.push(`  ${C.cyan}${dl.text}${C.reset}`);
    } else {
      const lineNum = String(dl.newNum || dl.oldNum || '').padStart(4, ' ');
      const sep = `${C.steel}│${C.reset}`;
      if (dl.type === 'add') {
        out.push(` ${C.slate}${lineNum}${C.reset} ${sep} ${C.volt}+ ${dl.text}${C.reset}`);
      } else if (dl.type === 'del') {
        out.push(` ${C.slate}${lineNum}${C.reset} ${sep} ${C.red}- ${dl.text}${C.reset}`);
      } else {
        out.push(` ${C.slate}${lineNum}${C.reset} ${sep} ${C.slate}  ${dl.text}${C.reset}`);
      }
    }
  }
  for (let i = shownDiff.length; i < diffHeight; i++) out.push('');

  out.push(divider);
  out.push(...footerLines);
  paintFrame(out);
}

function buildFilesTreeRows() {
  if (!activeProjectDir) return [];
  const rows = [];

  if (!filesShowAll) {
    // Build tree strictly from AI-touched paths
    const rootNode = { name: '', relPath: '', isDir: true, children: new Map() };
    for (const entry of changeLog.values()) {
      const parts = entry.path.split('/').filter(Boolean);
      let node = rootNode;
      let acc = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        acc = acc ? `${acc}/${part}` : part;
        const isLast = i === parts.length - 1;
        if (!node.children.has(part)) {
          node.children.set(part, {
            name: part,
            relPath: acc,
            isDir: isLast ? Boolean(entry.isDir) : true,
            entry: isLast ? entry : null,
            children: new Map()
          });
        } else if (isLast) {
          node.children.get(part).entry = entry;
        }
        node = node.children.get(part);
      }
    }

    function walkTouched(node, depth) {
      const kids = Array.from(node.children.values()).sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const kid of kids) {
        if (kid.isDir && kid.children.size > 0) {
          // Collapse is tracked via filesExpandedDirs; default expanded in touched mode unless collapsed
          const collapsed = filesExpandedDirs.has('COLLAPSED:' + kid.relPath);
          rows.push({ type: 'dir', name: kid.name, relPath: kid.relPath, depth, expanded: !collapsed, entry: kid.entry || null });
          if (!collapsed) walkTouched(kid, depth + 1);
        } else {
          rows.push({ type: kid.isDir ? 'dir' : 'file', name: kid.name, relPath: kid.relPath, depth, expanded: false, entry: kid.entry });
        }
      }
    }
    walkTouched(rootNode, 0);
    return rows;
  }

  // All-files mode: lazy tree walk capped at 2,000 entries per directory, respecting sandbox rules
  function isSafeInsideRoot(absPath) {
    try {
      const real = fs.realpathSync(absPath);
      const rel = path.relative(activeProjectDir, real);
      return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
    } catch (e) {
      return false;
    }
  }

  function walkDir(absDir, relPrefix, depth) {
    let dirents;
    try {
      dirents = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    const dirs = [];
    const files = [];
    let count = 0;
    const seen = new Set();

    for (const d of dirents) {
      if (count >= FILES_DIR_ENTRY_CAP) break;
      if (d.isDirectory() && FILES_IGNORED_DIRS.has(d.name)) continue;
      if (isSensitiveName(d.name)) continue;
      if (d.isSymbolicLink()) continue;
      const full = path.join(absDir, d.name);
      if (d.isDirectory()) {
        if (!isSafeInsideRoot(full)) continue;
        dirs.push(d.name);
      } else if (d.isFile()) {
        files.push(d.name);
      }
      seen.add(d.name);
      count++;
    }

    // Also include touched files directly inside this folder that are missing/deleted
    for (const entry of changeLog.values()) {
      const parent = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '';
      const base = entry.path.includes('/') ? entry.path.slice(entry.path.lastIndexOf('/') + 1) : entry.path;
      if (parent === relPrefix && !seen.has(base)) {
        files.push(base);
        seen.add(base);
      }
    }

    dirs.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));

    for (const name of dirs) {
      const relPath = relPrefix ? `${relPrefix}/${name}` : name;
      const expanded = filesExpandedDirs.has(relPath);
      rows.push({ type: 'dir', name, relPath, depth, expanded, entry: changeLog.get(relPath) || null });
      if (expanded) walkDir(path.join(absDir, name), relPath, depth + 1);
    }
    for (const name of files) {
      const relPath = relPrefix ? `${relPrefix}/${name}` : name;
      rows.push({ type: 'file', name, relPath, depth, expanded: false, entry: changeLog.get(relPath) || null });
    }
    if (count >= FILES_DIR_ENTRY_CAP) {
      rows.push({ type: 'note', name: `(capped at ${FILES_DIR_ENTRY_CAP} entries)`, relPath: relPrefix + '/__cap__', depth, expanded: false, entry: null });
    }
  }

  walkDir(activeProjectDir, '', 0);
  return rows;
}

function renderFilesView(rows, barWidth) {
  const thinBar = '─'.repeat(barWidth);
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;
  filesTreeRows = buildFilesTreeRows();
  if (filesSelectedIndex >= filesTreeRows.length) filesSelectedIndex = Math.max(0, filesTreeRows.length - 1);

  const out = [];
  out.push(...buildApprovalBannerLines(barWidth, divider));

  const toggleTxt = `[A] all files: ${filesShowAll ? C.voltBold + 'ON' : C.slate + 'OFF'}${C.reset}`;
  const rightHdr = `${toggleTxt}   ${C.slate}[Esc] back${C.reset} `;
  const rootRoom = Math.max(8, barWidth - visibleWidth(rightHdr) - 16);
  const leftHdr = ` ${C.voltBold}FILES${C.reset}  ${C.slate}root:${C.reset} ${C.white}${middleEllipsis(activeProjectDir || '', rootRoom)}${C.reset}`;
  out.push(spreadLine(leftHdr, rightHdr, barWidth));
  out.push(divider);

  if (flashNotification) {
    out.push(`  ${String(flashNotification).replace(/^\s+/, '')}`);
    out.push(divider);
  }

  const footerItems = [
    `${C.voltBold}[↑/↓]${C.reset} move`,
    `${C.voltBold}[→/←]${C.reset} expand/collapse`,
    `${C.voltBold}[Enter]${C.reset} diff`,
    `${C.voltBold}[A]${C.reset} all files`,
    `${C.voltBold}[O]${C.reset} open`,
    `${C.voltBold}[Esc]${C.reset} back`
  ];
  const footerLines = flowItems(footerItems, barWidth, ' ', ' · ');
  const listHeight = Math.max(2, rows - out.length - footerLines.length - 1);

  if (filesTreeRows.length === 0) {
    out.push('');
    out.push(`  ${C.slate}${filesShowAll ? 'Project folder is empty.' : 'No files touched by the AI yet. Press [A] to browse all project files.'}${C.reset}`);
    while (out.length < rows - footerLines.length - 1) out.push('');
    out.push(divider);
    out.push(...footerLines);
    paintFrame(out);
    return;
  }

  let startIdx = 0;
  if (filesSelectedIndex >= listHeight) startIdx = filesSelectedIndex - listHeight + 1;
  const visible = filesTreeRows.slice(startIdx, startIdx + listHeight);

  visible.forEach((row, idx) => {
    const absIdx = startIdx + idx;
    const sel = absIdx === filesSelectedIndex;
    const indent = '  '.repeat(row.depth);
    const ptr = sel ? `${C.voltBold}${ICONS.pointer}${C.reset}` : ' ';

    if (row.type === 'note') {
      out.push(` ${ptr} ${indent}${C.slate}${row.name}${C.reset}`);
      return;
    }

    if (row.type === 'dir') {
      const arrow = row.expanded ? ICONS.dirOpen : ICONS.dirClosed;
      const label = `${sel ? C.voltBold : C.cyanBold}${arrow} ${row.name}/${C.reset}`;
      out.push(` ${ptr} ${indent}${label}`);
      return;
    }

    // Verify status with fs.statSync cache (refresh lazily if missing from cache)
    let st = filesStatCache.get(row.relPath);
    if (!st) {
      refreshFilesStat([row.relPath]);
      st = filesStatCache.get(row.relPath) || { exists: false, size: null };
    }
    const entry = row.entry;
    let icon;
    let statusDesc = '';
    let sizeStr = st.exists && st.size !== null ? fmtFileSize(st.size) : '';
    const lastTs = entry && entry.times.length ? entry.times[entry.times.length - 1] : null;
    const agoStr = lastTs ? fmtRelativeTime(lastTs) : '';

    if (entry && entry.op === 'delete' && !st.exists) {
      icon = `${C.red}${ICONS.trashed}${C.reset}`;
      statusDesc = `${C.slate}deleted (in trash)${C.reset}`;
    } else if (!st.exists) {
      icon = `${C.redBold}${ICONS.missing}${C.reset}`;
      const verb = entry && entry.op === 'create' ? 'claimed created' : 'touched';
      statusDesc = `${C.redBold}${verb} — NOT ON DISK${C.reset}`;
    } else {
      icon = `${C.voltBold}${ICONS.exists}${C.reset}`;
      if (entry) {
        const opWord = entry.op === 'create' ? 'created' : entry.op === 'revert' ? 'reverted' : 'modified';
        statusDesc = `${C.slate}${opWord}${agoStr ? '  ' + agoStr : ''}${C.reset}`;
      }
    }

    const right = [statusDesc, sizeStr ? `${C.lightSlate}${sizeStr}${C.reset}` : ''].filter(Boolean).join('   ') + ' ';
    const maxNameW = Math.max(8, barWidth - visibleWidth(right) - indent.length - 8);
    const displayName = middleEllipsis(row.name, maxNameW);
    const left = ` ${ptr} ${indent}${icon} ${sel ? C.whiteBold : C.white}${displayName}${C.reset}`;
    out.push(spreadLine(left, right, barWidth));
  });

  for (let i = visible.length; i < listHeight; i++) out.push('');
  out.push(divider);
  out.push(...footerLines);
  paintFrame(out);
}

function renderTerminalsView(rows, barWidth) {
  const thinBar = '─'.repeat(barWidth);
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;
  const procs = getOrderedProcesses();
  const stats = getSessionStats();
  if (terminalsSelectedIndex >= procs.length) terminalsSelectedIndex = Math.max(0, procs.length - 1);

  const out = [];
  out.push(...buildApprovalBannerLines(barWidth, divider));

  const leftHdr = ` ${C.voltBold}TERMINALS${C.reset}  ${stats.runningCount > 0 ? C.voltBold : C.slate}${stats.runningCount} running${C.reset} ${C.slate}· ${stats.finishedCount} finished${C.reset}`;
  const rightHdr = `${C.slate}[Esc] back${C.reset} `;
  out.push(spreadLine(leftHdr, rightHdr, barWidth));
  out.push(divider);

  if (terminalsConfirmStop) {
    out.push(`  ${C.redBold}● STOP PROCESS ${terminalsConfirmStop.id}?${C.reset} ${C.white}${middleEllipsis(terminalsConfirmStop.command, Math.max(10, barWidth - 40))}${C.reset}  ${C.redBold}[Y]${C.reset} Stop  ${C.voltBold}[N]${C.reset} Cancel`);
    out.push(divider);
  } else if (flashNotification) {
    out.push(`  ${String(flashNotification).replace(/^\s+/, '')}`);
    out.push(divider);
  }

  const footerItems = [
    `${C.voltBold}[↑/↓]${C.reset} select`,
    `${C.voltBold}[Enter]${C.reset} attach`,
    `${C.voltBold}[X]${C.reset} stop`,
    `${C.voltBold}[C]${C.reset} clear finished`,
    `${C.voltBold}[Esc]${C.reset} back`
  ];
  const footerLines = flowItems(footerItems, barWidth, ' ', ' · ');
  const listHeight = Math.max(2, rows - out.length - footerLines.length - 1);

  if (procs.length === 0) {
    out.push('');
    out.push(`  ${C.slate}No commands or background jobs recorded yet in this session.${C.reset}`);
    while (out.length < rows - footerLines.length - 1) out.push('');
    out.push(divider);
    out.push(...footerLines);
    paintFrame(out);
    return;
  }

  let startIdx = 0;
  if (terminalsSelectedIndex >= listHeight) startIdx = terminalsSelectedIndex - listHeight + 1;
  const visible = procs.slice(startIdx, startIdx + listHeight);

  visible.forEach((p, idx) => {
    const absIdx = startIdx + idx;
    const sel = absIdx === terminalsSelectedIndex;
    const ptr = sel ? `${C.voltBold}${ICONS.pointer}${C.reset}` : ' ';
    let icon;
    let statusText;
    if (p.status === 'running') {
      icon = `${C.voltBold}${ICONS.running}${C.reset}`;
      statusText = `${C.volt}running${C.reset}`;
    } else if (p.status === 'stopped') {
      icon = `${C.slate}${ICONS.stopped}${C.reset}`;
      statusText = `${C.slate}stopped${C.reset}`;
    } else if (p.code === 0) {
      icon = `${C.voltBold}${ICONS.exists}${C.reset}`;
      statusText = `${C.slate}exit 0${C.reset}`;
    } else {
      icon = `${C.redBold}${ICONS.missing}${C.reset}`;
      statusText = `${C.red}${p.status === 'timeout' ? 'timeout' : `exit ${p.code ?? 1}`}${C.reset}`;
    }

    const dur = p.status === 'stopped' ? '' : fmtElapsed(p.startTime, p.endTime);
    const pidText = p.status === 'running' && p.pid ? `pid ${p.pid}` : '';
    const tabbed = terminalTabs.some(t => t.id === p.id) ? `${C.cyan}[tab]${C.reset} ` : '';
    const rightParts = [tabbed + statusText, dur ? `${C.lightSlate}${dur.padStart(6)}${C.reset}` : '', pidText ? `${C.slate}${pidText}${C.reset}` : ''].filter(Boolean);
    const right = rightParts.join('  ') + ' ';
    const idCol = p.id.padEnd(7);
    const cmdRoom = Math.max(8, barWidth - visibleWidth(right) - idCol.length - 8);
    const cmdShort = middleEllipsis(p.command.replace(/\s+/g, ' '), cmdRoom);
    const left = ` ${ptr} ${icon} ${C.cyan}${idCol}${C.reset} ${sel ? C.whiteBold : C.white}${cmdShort}${C.reset}`;
    out.push(spreadLine(left, right, barWidth));
  });

  for (let i = visible.length; i < listHeight; i++) out.push('');
  out.push(divider);
  out.push(...footerLines);
  paintFrame(out);
}

function getTabIcon(proc) {
  if (!proc) return `${C.slate}?${C.reset}`;
  if (proc.status === 'running') return `${C.voltBold}${ICONS.running}${C.reset}`;
  if (proc.status === 'stopped') return `${C.slate}${ICONS.stopped}${C.reset}`;
  if (proc.code === 0) return `${C.voltBold}${ICONS.exists}${C.reset}`;
  return `${C.redBold}${ICONS.missing}${C.reset}`;
}

function buildChromeTabBar(barWidth) {
  const activeTab = terminalTabs[activeTabIndex];
  const activeProc = activeTab ? procRegistry.get(activeTab.id) : null;
  const stopBtn = activeProc && activeProc.status === 'running'
    ? `${C.redBold}[${ICONS.stopped} Stop]${C.reset}`
    : `${C.slate}[${activeProc ? activeProc.status : 'closed'}]${C.reset}`;
  const stopW = visibleWidth(stopBtn) + 2;
  const maxTabsArea = Math.max(12, barWidth - stopW - 1);

  // Build tab descriptors and choose a slice around activeTabIndex that fits
  const maxLabelLen = Math.max(6, Math.min(20, Math.floor(maxTabsArea / Math.max(1, terminalTabs.length)) - 6));
  const rendered = terminalTabs.map((tab, idx) => {
    const proc = procRegistry.get(tab.id);
    const rawCmd = proc ? proc.command.replace(/\s+/g, ' ').trim() : tab.id;
    const label = rawCmd.length > maxLabelLen ? rawCmd.slice(0, maxLabelLen - 1) + '…' : rawCmd;
    const isActive = idx === activeTabIndex;
    const icon = getTabIcon(proc);
    const iconW = visibleWidth(icon);
    const innerW = 1 + iconW + 1 + label.length + 1; // " ● label "
    const top = isActive
      ? `${C.voltBold}┌${C.reset} ${icon} ${C.voltBold}${label}${C.reset} ${C.voltBold}┐${C.reset}`
      : `${C.steel}┌${C.reset} ${icon} ${C.slate}${label}${C.reset} ${C.steel}┐${C.reset}`;
    const bottom = isActive
      ? `${C.voltBold}┘${' '.repeat(innerW)}└${C.reset}`
      : `${C.darkDivider}${'─'.repeat(innerW + 2)}${C.reset}`;
    return { top, bottom, width: innerW + 2, isActive };
  });

  // Fit window of tabs containing activeTabIndex
  let start = 0;
  let end = rendered.length;
  let totalW = rendered.reduce((s, t) => s + t.width, 0);
  while (totalW > maxTabsArea && end - start > 1) {
    if (activeTabIndex - start > end - 1 - activeTabIndex) {
      totalW -= rendered[start].width;
      start++;
    } else {
      end--;
      totalW -= rendered[end].width;
    }
  }
  const shown = rendered.slice(start, end);
  let topLine = ' ' + shown.map(t => t.top).join('');
  let bottomLine = `${C.darkDivider}─${C.reset}` + shown.map(t => t.bottom).join('');
  const usedW = 1 + shown.reduce((s, t) => s + t.width, 0);
  const padGap = Math.max(1, barWidth - usedW - visibleWidth(stopBtn) - 1);
  topLine = topLine + ' '.repeat(padGap) + stopBtn;
  const remBottom = Math.max(0, barWidth - usedW);
  bottomLine = bottomLine + `${C.darkDivider}${'─'.repeat(remBottom)}${C.reset}`;
  return [topLine, bottomLine];
}

function renderAttachView(rows, barWidth) {
  const thinBar = '─'.repeat(barWidth);
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;

  if (terminalTabs.length === 0) {
    overviewView = 'terminals';
    renderTerminalsView(rows, barWidth);
    return;
  }
  if (activeTabIndex >= terminalTabs.length) activeTabIndex = terminalTabs.length - 1;
  if (activeTabIndex < 0) activeTabIndex = 0;

  const tab = terminalTabs[activeTabIndex];
  const proc = procRegistry.get(tab.id);

  const out = [];
  // Approval prompts always interrupt above the tab bar
  out.push(...buildApprovalBannerLines(barWidth, divider));

  if (attachConfirmStop && proc) {
    out.push(`  ${C.redBold}● STOP ${proc.id}?${C.reset} ${C.white}${middleEllipsis(proc.command, Math.max(10, barWidth - 36))}${C.reset}  ${C.redBold}[Y]${C.reset} Stop  ${C.voltBold}[N]${C.reset} Cancel`);
    out.push(divider);
  }

  out.push(...buildChromeTabBar(barWidth));

  const canInput = Boolean(proc && proc.status === 'running' && proc.stdinOpen);
  const hintParts = [];
  if (!canInput) {
    hintParts.push(`${C.slate}(read-only: process stdin closed)${C.reset}`);
  }
  if (tab.scrollOffset > 0 && tab.unreadBelow) {
    hintParts.push(`${C.voltBold}↓ new output${C.reset}`);
  } else if (tab.scrollOffset > 0) {
    hintParts.push(`${C.cyan}↑ scrolled (${tab.scrollOffset} lines)${C.reset}`);
  }

  const footerStr = ` ${C.slate}Ctrl+←/→ switch tab · Ctrl+W close tab · Ctrl+X stop · Ctrl+D EOF · Ctrl+] detach · Ctrl+T list${C.reset}`;
  const hintLineCount = hintParts.length > 0 ? 1 : 0;
  const promptLineCount = canInput ? 1 : 0;
  const outputHeight = Math.max(2, rows - out.length - 2 - hintLineCount - promptLineCount);

  const rawLines = proc ? (proc.partialLine ? [...proc.lines, proc.partialLine] : proc.lines) : ['(process closed)'];
  const wrapped = [];
  const contentWidth = Math.max(8, barWidth - 2);
  for (const l of rawLines) {
    const pieces = wrapAnsiLine(l, contentWidth);
    for (const piece of pieces) wrapped.push(piece);
  }

  const maxScroll = Math.max(0, wrapped.length - outputHeight);
  if (tab.scrollOffset > maxScroll) tab.scrollOffset = maxScroll;
  if (tab.scrollOffset <= 0) {
    tab.scrollOffset = 0;
    tab.unreadBelow = false;
  }

  const endIdx = wrapped.length - tab.scrollOffset;
  const startIdx = Math.max(0, endIdx - outputHeight);
  const visibleOut = wrapped.slice(startIdx, endIdx);

  if (visibleOut.length === 0) {
    out.push(`  ${C.slate}(waiting for output...)${C.reset}`);
    for (let i = 1; i < outputHeight; i++) out.push('');
  } else {
    for (const line of visibleOut) out.push(` ${line}${C.reset}`);
    for (let i = visibleOut.length; i < outputHeight; i++) out.push('');
  }

  if (hintLineCount) {
    out.push(` ${hintParts.join('   ')}`);
  }
  if (promptLineCount) {
    const buf = tab.inputBuf || '';
    const cur = Math.max(0, Math.min(buf.length, tab.inputCursor || 0));
    const promptPrefix = ASCII_UI ? '> ' : '› ';
    const cursorGlyph = ASCII_UI ? '_' : '▌';
    const maxTextW = Math.max(4, barWidth - 4);
    let viewStart = 0;
    if (buf.length + 1 > maxTextW) {
      viewStart = Math.max(0, Math.min(cur - maxTextW + 2, buf.length - maxTextW + 1));
    }
    const viewEnd = Math.min(buf.length, viewStart + maxTextW - 1);
    const visBefore = buf.slice(viewStart, cur);
    const visAfter = buf.slice(cur, viewEnd);
    const paused = approvalQueue.length > 0;
    const textColor = paused ? C.slate : C.white;
    const accentColor = paused ? C.slate : C.voltBold;
    out.push(` ${accentColor}${promptPrefix}${C.reset}${textColor}${visBefore}${accentColor}${cursorGlyph}${C.reset}${textColor}${visAfter}${C.reset}`);
  }
  out.push(divider);
  out.push(footerStr);
  paintFrame(out);
}

function buildHelpLines(barWidth) {
  const lines = [];
  const section = (title) => {
    lines.push('');
    lines.push(` ${C.voltBold}${title}${C.reset}`);
  };
  const item = (k, desc) => {
    const keyCol = `${C.voltBold}${k.padEnd(18)}${C.reset}`;
    const wrapped = wrapPlain(desc, Math.max(12, barWidth - 22), 3);
    lines.push(`  ${keyCol} ${C.white}${wrapped[0] || ''}${C.reset}`);
    for (let i = 1; i < wrapped.length; i++) {
      lines.push(`  ${' '.repeat(18)} ${C.white}${wrapped[i]}${C.reset}`);
    }
  };

  lines.push(` ${C.voltBold}BRIDGE v${CURRENT_VERSION}${C.reset}  ${C.slate}· Server: ${serverStatus.toUpperCase()} (127.0.0.1:${bridgePort})${C.reset}`);
  lines.push(` ${C.slate}Project: ${middleEllipsis(activeProjectDir || '(none)', Math.max(12, barWidth - 12))}${C.reset}`);

  section('MAIN DASHBOARD SHORTCUTS');
  item('[C]', 'Copy authenticated MCP URL to clipboard.');
  item('[T]', 'Copy Bearer auth token to clipboard.');
  item('[D]', 'Switch sandboxed project folder.');
  item('[L]', 'Toggle live traffic & tool logs.');
  item('[M]', 'Change approval mode (1–4).');
  item('[S]', `Open / close ${ICONS.menu} Overview panel.`);
  item('[Y] / [N]', 'Approve or deny a pending permission prompt (works in any view).');
  item('[Q] / Ctrl+C', 'Close active Overview view, or prompt to stop Bridge.');

  section('OVERVIEW MENU');
  item('↑ / ↓, Enter', 'Navigate and open Review, Files, Terminals, or Help.');
  item('[R] [F] [T] [H]', 'Jump directly to Review, Files, Terminals, or Help (only active in Overview).');
  item('[Esc] / [S]', 'Close the Overview menu.');

  section('[R] REVIEW VIEW');
  item('↑ / ↓', 'Select file in list, or scroll unified diff when diff pane is focused.');
  item('Enter / →, ←', 'Focus diff pane / return focus to file list.');
  item('PgUp/PgDn, g/G', 'Page or jump to top/bottom of diff.');
  item('[U]', 'Undo last AI change on selected file (asks Y/N, uses revert snapshot).');
  item('[O]', 'Open selected file in default editor (VS Code or OS default).');
  item('[Esc]', 'Back to Overview menu.');

  section('[F] FILES VIEW');
  item('↑ / ↓, → / ←', 'Navigate tree and expand/collapse folders.');
  item('Enter', 'Open selected file in Review diff (or toggle folder).');
  item('[A]', 'Toggle between AI-touched files and all project files.');
  item('[O]', 'Open selected file in default editor.');
  item('[Esc]', 'Back to Overview menu.');

  section('[T] TERMINALS LIST');
  item('↑ / ↓, Enter', 'Select a command/job and attach full-screen in a tab.');
  item('[X]', 'Stop a running process tree (asks Y/N).');
  item('[C]', 'Clear finished processes from the list.');
  item('[Esc]', 'Back to Overview menu.');

  section('TERMINAL ATTACH VIEW (CHROME-STYLE TABS)');
  item('Ctrl+← / Ctrl+→', 'Switch between open terminal tabs.');
  item('Ctrl+W', 'Close the current tab.');
  item('Ctrl+X', 'Stop the attached running process (asks Y/N).');
  item('Ctrl+D', 'Flush any buffered text, then send EOF to close process stdin (switches tab to read-only).');
  item('Ctrl+]', 'Detach back to Terminals list (tabs stay open).');
  item('Ctrl+T', 'Jump to Terminals list.');
  item('Shift+↑/↓, PgUp/Dn', 'Scroll terminal output history (200-line ring buffer).');
  item('Line editing', 'Type or paste in the bottom prompt line: Enter sends line, Backspace deletes, ←/→ moves cursor, Ctrl+U clears line, Esc forwards immediately (pipe-based, not a full PTY — vim/htop may render imperfectly).');
  item('Approval guard', 'When an approval banner arrives while attached, input pauses and Y/N/Esc require a short (750 ms) pause in typing.');

  section('ICONS & COLORS');
  item(`${ICONS.running} (volt)`, 'Process is currently running.');
  item(`${ICONS.exists} (volt)`, 'File exists on disk, or process exited with code 0.');
  item(`${ICONS.missing} (red)`, 'File missing from disk, or process exited non-zero / error.');
  item(`${ICONS.stopped} (slate)`, 'Process was stopped by user or tool.');
  item(`${ICONS.trashed} (red)`, 'File was deleted (copy kept in Bridge trash).');
  item('+N / −M / ~', 'Lines added (green), removed (red), or diff skipped (> 2 MB).');

  section('APPROVAL MODES');
  for (const m of APPROVAL_MODES) {
    const tag = m.id === approvalMode ? ` (current)` : '';
    item(`[${m.key}] ${m.name}`, `${m.desc}${tag}`);
  }

  section('SAFETY & LOGS');
  item('Sandbox', 'All file tools are strictly jailed to the active project root; sensitive files (.env, keys, credentials) are protected.');
  item('Command policy', 'Harmful system commands are always blocked in every approval mode.');
  item('Trash & Undo', 'Deletes move to ~/.bridge/trash. [U] restores revert snapshots (capped at MAX_SNAPSHOTS=20 per file, MAX_SNAPSHOT_BYTES=64 MB total).');
  item('Logs', path.join(bridgeHomeDir, 'logs', 'server_requests.log'));
  item('Report a bug', 'https://github.com/Manimaran-tech/bridge/issues');
  lines.push('');
  return lines;
}

function renderHelpView(rows, barWidth) {
  const thinBar = '─'.repeat(barWidth);
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;
  const out = [];
  out.push(...buildApprovalBannerLines(barWidth, divider));
  out.push(spreadLine(` ${C.voltBold}HELP${C.reset}  ${C.slate}Bridge v${CURRENT_VERSION} · Shortcuts, Safety & Reference${C.reset}`, `${C.slate}[Esc] back${C.reset} `, barWidth));
  out.push(divider);

  const footer = ` ${C.voltBold}[↑/↓ PgUp/PgDn]${C.reset} scroll · ${C.voltBold}[g/G]${C.reset} top/bottom · ${C.voltBold}[Esc]${C.reset} back`;
  const bodyHeight = Math.max(2, rows - out.length - 2);
  const allLines = buildHelpLines(barWidth);
  const maxScroll = Math.max(0, allLines.length - bodyHeight);
  if (helpScroll > maxScroll) helpScroll = maxScroll;
  if (helpScroll < 0) helpScroll = 0;

  const visible = allLines.slice(helpScroll, helpScroll + bodyHeight);
  out.push(...visible);
  for (let i = visible.length; i < bodyHeight; i++) out.push('');
  out.push(divider);
  out.push(spreadLine(footer, `${C.slate}${Math.min(allLines.length, helpScroll + 1)}/${allLines.length}${C.reset} `, barWidth));
  paintFrame(out);
}

function renderDashboard() {
  if (isNavigatingFolders || isEstablishingTunnel || isShuttingDown) return;

  const rows = getRows();
  const barWidth = getFrameWidth();

  // Full-screen Overview subviews (when not confirming exit or choosing mode)
  if (!confirmingExit && !choosingMode && overviewView && overviewView !== 'menu') {
    if (overviewView === 'review') return renderReviewView(rows, barWidth);
    if (overviewView === 'files') return renderFilesView(rows, barWidth);
    if (overviewView === 'terminals') return renderTerminalsView(rows, barWidth);
    if (overviewView === 'attach') return renderAttachView(rows, barWidth);
    if (overviewView === 'help') return renderHelpView(rows, barWidth);
  }

  const thickBar = '━'.repeat(barWidth);
  const thinBar = '─'.repeat(barWidth);
  const wide = barWidth >= 70;
  const divider = `${C.darkDivider}${thinBar}${C.reset}`;

  // Label column: highlighted badges on wide windows, plain short labels on narrow ones.
  const label = (text) => wide
    ? `  ${C.bgVolt} ${text.padEnd(7)} ${C.reset}  `
    : `  ${C.voltBold}${text.slice(0, 7).padEnd(7)}${C.reset} `;
  const labelWidth = visibleWidth(label('PROJECT'));
  const valueWidth = Math.max(6, barWidth - labelWidth);

  // ---- Status badge reflects the real state of the server and tunnel ----
  let badge;
  if (serverStatus === 'failed') badge = `${C.redBold}● STATUS: SERVER DOWN${C.reset}`;
  else if (serverStatus === 'restarting') badge = `${C.redBold}● STATUS: RESTARTING${C.reset}`;
  else if (serverStatus !== 'online' || !mcpTunnelUrl || !tunnelAlive) badge = `${C.slate}● STATUS: CONNECTING${C.reset}`;
  else badge = `${C.voltBold}● STATUS: ONLINE${C.reset}`;

  const header = [];
  renderAsciiHeaderToOut(header, badge);

  // ---- Critical prompts: always shown right under the header, never clipped ----
  const critical = [];
  if (choosingMode) {
    critical.push(`  ${C.voltBold}● APPROVAL MODE${C.reset} ${C.white}${wide ? 'How often should the AI ask before acting?' : 'Choose:'}${C.reset}`);
    if (rows < 16) {
      // Short window: options flow on one or two lines.
      const opts = APPROVAL_MODES.map(m => `${C.voltBold}[${m.key}]${C.reset} ${m.id === approvalMode ? C.whiteBold + '►' : ''}${m.id === 'turbo' ? C.redBold : C.voltBold}${m.name}${C.reset}`);
      critical.push(...flowItems(opts, barWidth, '  ', '  '));
    } else for (const m of APPROVAL_MODES) {
      const current = m.id === approvalMode;
      const marker = current ? `${C.voltBold}►${C.reset}` : ' ';
      const nameColor = m.id === 'turbo' ? C.redBold : C.voltBold;
      const text = wide ? m.desc : m.short;
      critical.push(`  ${marker} ${C.voltBold}[${m.key}]${C.reset} ${nameColor}${m.name.padEnd(7)}${C.reset} ${C.slate}${text}${current ? ' (current)' : ''}${C.reset}`);
    }
    critical.push(`    ${C.slate}[Esc] Cancel${C.reset}`);
    critical.push(divider);
  } else if (confirmingExit) {
    critical.push(`  ${C.redBold}● STOP BRIDGE?${C.reset} ${C.white}${wide ? 'This closes the MCP server and the tunnel. Connected AI chats lose access.' : 'Closes server + tunnel.'}${C.reset}`);
    critical.push(`    ${C.redBold}[Y]${C.reset} ${C.white}Yes, stop${C.reset}    ${C.voltBold}[N]${C.reset} ${C.white}No, keep running${C.reset}`);
    critical.push(divider);
  } else if (approvalQueue.length > 0) {
    const req = approvalQueue[0];
    const more = approvalQueue.length > 1 ? ` ${C.slate}(+${approvalQueue.length - 1} waiting)${C.reset}` : '';
    critical.push(`  ${C.redBold}● PERMISSION NEEDED${C.reset} ${C.whiteBold}${req.action}${C.reset}${more}`);
    // Show the whole command (wrapped), so the user can judge exactly what will run.
    wrapPlain(req.detail, Math.max(6, barWidth - 4), 6).forEach(l => critical.push(`    ${C.cyanBold}${l}${C.reset}`));
    if (req.reason) wrapPlain(`Reason: it ${req.reason}`, Math.max(6, barWidth - 4), 2).forEach(l => critical.push(`    ${C.slate}${l}${C.reset}`));
    const left = Math.max(0, 90 - Math.floor((Date.now() - req.receivedAt) / 1000));
    critical.push(`    ${C.voltBold}[Y]${C.reset} ${C.white}Allow${C.reset}    ${C.redBold}[N]${C.reset} ${C.white}Deny${C.reset}    ${C.slate}(auto-deny in ${left}s)${C.reset}`);
    critical.push(divider);
  }

  // ---- Status lines (listed by priority; low-priority lines drop first on short windows) ----
  const info = [];
  const project = activeProjectDir ? middleEllipsis(activeProjectDir, valueWidth) : '(None selected)';
  info.push({ p: 1, line: `${label('PROJECT')}${C.whiteBold}${project}${C.reset}` });
  if (mcpTunnelUrl) {
    const shown = `${mcpTunnelUrl}/mcp?token=${maskToken(bridgeAuthToken)}`;
    info.push({ p: 1, line: `${label('MCP URL')}${C.cyanBold}${middleEllipsis(shown, valueWidth)}${C.reset}` });
  } else {
    info.push({ p: 1, line: `${label('MCP URL')}${C.slate}Establishing secure tunnel...${C.reset}` });
  }
  const serverText = serverStatus === 'online' ? `${C.voltBold}RUNNING${C.reset} ${C.slate}on 127.0.0.1:${bridgePort}${C.reset}`
    : serverStatus === 'failed' ? `${C.redBold}DOWN${C.reset} ${C.slate}(press [L] for logs)${C.reset}`
    : `${C.slate}${serverStatus.toUpperCase()}...${C.reset}`;
  info.push({ p: 2, line: `${label('SERVER')}${serverText}` });
  const mode = modeInfo(approvalMode);
  info.push({ p: 1, line: `${label('MODE')}${mode.id === 'turbo' ? C.redBold : C.voltBold}${mode.name}${C.reset} ${C.slate}(${wide ? mode.desc : mode.short} • [M] change)${C.reset}` });
  info.push({ p: 3, line: `${label('SAFETY')}${C.voltBold}SANDBOXED${C.reset} ${C.slate}${wide ? '(files jailed to project • harmful commands always blocked)' : '(harmful cmds blocked)'}${C.reset}` });
  info.push({ p: 4, line: `${label('AUTH')}${C.voltBold}BEARER TOKEN${C.reset} ${C.slate}${wide ? '(saved; [T] copy • \`bridge rotate-token\` to replace)' : '([T] copy)'}${C.reset}` });
  if (updateAvailable) {
    info.push({ p: 5, line: `${label('UPDATE')}${C.voltBold}v${updateAvailable} available${C.reset} ${C.white}npm i -g @markmayandi/bridge@latest${C.reset}` });
  }

  // Flash messages wrap (up to 3 lines) instead of being cut, so a URL shown for manual copy stays whole.
  let flash = [];
  if (flashNotification) {
    const flashText = `  ${String(flashNotification).replace(/^\s+/, '')}`;
    flash = visibleWidth(flashText) <= barWidth
      ? [flashText]
      : wrapPlain(stripAnsi(flashText).trim(), Math.max(6, barWidth - 2), 3).map(l => `  ${C.white}${l}${C.reset}`);
    flash.push(divider);
  }

  const keyItems = [
    `${C.voltBold}[C]${C.reset} ${C.white}Copy MCP URL${C.reset}`,
    `${C.voltBold}[T]${C.reset} ${C.white}Copy Token${C.reset}`,
    `${C.voltBold}[D]${C.reset} ${C.white}Switch Folder${C.reset}`,
    `${C.voltBold}[L]${C.reset} ${C.white}Logs ${showLiveLogs ? C.voltBold + 'ON' : C.slate + 'OFF'}${C.reset}`,
    `${C.voltBold}[M]${C.reset} ${C.white}Mode ${modeInfo(approvalMode).name}${C.reset}`,
    `${C.voltBold}[S]${C.reset} ${C.white}Overview${C.reset}`,
    `${C.voltBold}[Q]${C.reset} ${C.white}Exit${C.reset}`
  ];
  const keySep = barWidth >= 130 ? '    ' : (barWidth >= 118 ? '   ' : '  ');
  const keys = flowItems(keyItems, barWidth, '  ', keySep);

  const compatRaw = barWidth >= 135
    ? `  ${C.voltBold}COMPATIBILITY:${C.reset} ${C.whiteBold}Supports every chat-based LLM that provides custom MCP connectors${C.reset} ${C.slate}(Gemini, Claude, ChatGPT, DeepSeek, etc.)${C.reset}`
    : barWidth >= 95
      ? `  ${C.voltBold}COMPATIBILITY:${C.reset} ${C.whiteBold}Every chat-based LLM with custom MCP${C.reset} ${C.slate}• Gemini • Claude • ChatGPT • DeepSeek${C.reset}`
      : `  ${C.voltBold}WORKS WITH:${C.reset} ${C.whiteBold}any chat LLM with custom MCP${C.reset}`;
  const compat = fitLine(compatRaw, barWidth);

  // ---- Fit everything to the window height ----
  // Fixed parts: header + critical + info + divider + flash + keys + bar, plus optional footer (bar + compat).
  let footer = [`${C.voltBold}${thickBar}${C.reset}`, compat];
  let infoLines = info.slice();
  let infoDivider = [divider];
  let keyBar = [`${C.voltBold}${thickBar}${C.reset}`];
  const used = () => header.length + critical.length + infoLines.length + infoDivider.length + flash.length + keys.length + keyBar.length + footer.length;
  // Drop the least important parts first; the prompt and the key help always survive.
  if (used() > rows) footer = [];
  while (used() > rows && infoLines.length > 1) {
    const worst = infoLines.reduce((acc, it, i) => (it.p >= infoLines[acc].p ? i : acc), 0);
    infoLines.splice(worst, 1);
  }
  if (used() > rows && flash.length) flash = [];
  if (used() > rows) keyBar = [];
  if (used() > rows && header.length > 3) {
    header.splice(0, header.length,
      `${C.voltBold}${thickBar}${C.reset}`,
      spreadLine(`  ${C.voltBold}B R I D G E${C.reset}  ${badge}`, `${C.steel}v${CURRENT_VERSION}${C.reset}`, barWidth),
      divider
    );
  }
  if (used() > rows && (critical.length || confirmingExit || choosingMode)) { infoLines = []; infoDivider = []; }
  if (used() > rows && critical.length) {
    // One-line key help so the prompt's own keys stay visible.
    keys.splice(0, keys.length, `  ${C.voltBold}[Q]${C.reset} Exit`);
  }
  if (used() > rows && critical.length) critical.pop(); // trailing divider
  // Tiny window with a command prompt: shorten the wrapped command, keep the title and the [Y]/[N] line.
  // (The mode picker's option lines are never removed.)
  while (used() > rows && !choosingMode && critical.length > 2) critical.splice(critical.length - 2, 1);

  const out = [...header, ...critical, ...infoLines.map(i => i.line), ...infoDivider, ...flash, ...keys, ...keyBar];
  const middle = Math.max(0, rows - out.length - footer.length);

  if (middle > 0) {
    if (showLiveLogs) {
      out.push(`  ${C.voltBold}LIVE HARNESS TRAFFIC & ACTIVITY LOGS:${C.reset}`);
      const slots = middle - 1;
      const logsToShow = slots > 0 ? recentLogs.slice(-slots) : [];
      if (slots > 0 && logsToShow.length === 0) out.push(`  ${C.slate}(Waiting for AI requests...)${C.reset}`);
      logsToShow.forEach(log => out.push(`  ${log}`));
    } else if (middle >= 3) {
      out.push(`  ${C.voltBold}UNIVERSAL AI MCP HARNESS:${C.reset}`);
      out.push(`  ${C.steel}●${C.reset} ${C.whiteBold}${wide ? 'Built for every chat-based LLM that provides custom MCP connectors.' : 'For any chat LLM with custom MCP.'}${C.reset}`);
      out.push(`  ${C.steel}●${C.reset} ${C.slate}${wide ? "Copy your MCP URL ([C]) and paste it into your AI model's custom MCP tools." : 'Copy URL with [C], paste in your AI.'}${C.reset}`);
    }
    while (out.length < rows - footer.length) out.push('');
  }
  out.push(...footer);

  // Clickable Overview button in the top-right corner (row 2 of the screen, under the top bar).
  menuButtonHit = null;
  menuBoxHit = null;
  if (out.length > 1) {
    const btn = `${C.bgVolt} ${ICONS.menu} ${C.reset}`;
    const btnW = 3;
    const col = Math.max(0, barWidth - btnW);
    out[1] = sliceAnsiPrefix(out[1], Math.max(0, col - 1)) + ' ' + btn;
    // Screen coordinates are 1-based; allow one extra column on each side for easy clicking.
    menuButtonHit = { row: 2, from: col, to: col + btnW + 1 };
  }

  if (!confirmingExit && !choosingMode && overviewView === 'menu') {
    paintFrame(overlayOverviewMenu(out, barWidth, rows));
    return;
  }

  paintFrame(out);
}

// Mouse click reporting (button press/release, SGR format). Turned on once the dashboard is up.
const MOUSE_ON = '\x1b[?1000h\x1b[?1006h';
const MOUSE_OFF = '\x1b[?1000l\x1b[?1006l';
let mouseEnabled = false;
process.on('exit', () => { if (mouseEnabled) { try { process.stdout.write(MOUSE_OFF); } catch (e) {} } });

// Where the clickable parts of the dashboard were last drawn (1-based screen cells).
let menuButtonHit = null;
let menuBoxHit = null;

// Keep the approval countdown live while a prompt is open or running processes are shown.
setInterval(() => {
  if (isNavigatingFolders || isEstablishingTunnel || isShuttingDown) return;
  if (approvalQueue.length > 0 || overviewView === 'terminals' || overviewView === 'files') {
    renderDashboard();
  }
}, 1000).unref();

async function startBridge() {
  // Check for updates in background (non-blocking)
  checkForUpdates();

  // Enter Alternate Screen Buffer, disable line wrap & hide cursor (locks viewport, zero scrollback!)
  process.stdout.write('\x1b[?1049h\x1b[?7l\x1b[?25l\x1b[2J\x1b[H');

  // Ensure readline keypress setup
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Step 1: Initial Centered Bridge Crossing Animation (Enabled by default on CLI and bat launch!)
  const skipAnimation = process.argv.includes('--no-animation') || process.argv.includes('--fast');
  if (!skipAnimation) {
    await playInitialLoadingAnimation(1800);
  }

  // Step 2: In-CLI Directory Navigator (if no folder was passed)
  if (!activeProjectDir || !fs.existsSync(activeProjectDir)) {
    const picked = await selectDirectoryInteractive(process.cwd());
    if (picked && fs.existsSync(picked)) {
      activeProjectDir = fs.realpathSync(path.resolve(picked));
    } else {
      activeProjectDir = fs.realpathSync(process.cwd());
      setFlash(`  ${C.voltBold}● [DEFAULT]${C.reset} ${C.white}Using current folder. Press ${C.voltBold}[D]${C.white} anytime to browse.${C.reset}`, 5000);
    }
  }

  // Step 3: Pick the port (only a stale Bridge server is ever stopped to free it)
  const useNamedTunnel = Boolean(bridgeConfig.tunnelToken);
  // Paint a frame right away so the screen is never blank while the port and tunnel are set up.
  {
    const out = [];
    renderAsciiHeaderToOut(out, `${C.bgVolt} STARTING BRIDGE ${C.reset}`);
    out.push(`  ${C.voltBold}●${C.reset} ${C.white}Preparing local server for ${C.voltBold}${path.basename(activeProjectDir) || activeProjectDir}${C.white}...${C.reset}`);
    while (out.length < getRows() - 1) out.push('');
    out.push(`${C.voltBold}${'━'.repeat(getFrameWidth())}${C.reset}`);
    paintFrame(out);
  }
  const port = await choosePort(useNamedTunnel);
  if (!port) {
    process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?7h\x1b[?1049l\x1b[?25h');
    if (useNamedTunnel && otherBridgeOnDefaultPort) {
      console.error('\n' + C.redBold + '● [ALREADY RUNNING] ' + C.reset + `Another Bridge (PID ${otherBridgeOnDefaultPort}) is using port 3000.`);
      console.error(C.slate + 'Your named tunnel always points to localhost:3000, so only one Bridge can run with it.\nClose the other Bridge window (or press [Q] in it), then start Bridge again.' + C.reset + '\n');
      process.exit(1);
    }
    const owners = getPortOwners(3000).map(o => `PID ${o.pid}: ${o.cmd || '(unknown)'}`).join('\n    ');
    console.error('\n' + C.redBold + '● [PORT BUSY] ' + C.reset + 'Port 3000 is used by another program, and Bridge will not stop it:');
    console.error('    ' + owners);
    console.error(C.slate + (useNamedTunnel
      ? 'Your named tunnel points to localhost:3000. Stop that program, then start Bridge again.'
      : 'No free port found between 3000 and 3020.') + C.reset + '\n');
    process.exit(1);
  }
  bridgePort = port;

  // Step 4: Start MCP Server in background (supervised: restarted automatically if it crashes)
  startServerProcess();

  // Step 5: Start Cloudflare Tunnel (token mode uses a fixed public URL)
  isEstablishingTunnel = true;
  const activeCloudflaredBin = await ensureCloudflaredBinary();

  // Do not let an unrelated TUNNEL_TOKEN from the machine leak into Bridge's
  // tunnel. Bridge uses only the token saved by `bridge setup`.
  const tunnelEnv = { ...process.env };
  delete tunnelEnv.TUNNEL_TOKEN;
  delete tunnelEnv.TUNNEL_TOKEN_FILE;

  if (useNamedTunnel) {
    tunnelEnv.TUNNEL_TOKEN = bridgeConfig.tunnelToken;
    mcpTunnelUrl = bridgeConfig.publicUrl;
    tunnelProcess = spawn(activeCloudflaredBin, ['tunnel', '--no-autoupdate', 'run'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: tunnelEnv
    });
    copyToClipboard(`${mcpTunnelUrl}/mcp?token=${bridgeAuthToken}`);
    setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}Authenticated fixed MCP URL loaded into your clipboard! (Ctrl + V to paste)${C.reset}`);
  } else {
    tunnelProcess = spawn(activeCloudflaredBin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${bridgePort}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: tunnelEnv
    });
  }

  tunnelAlive = true;

  const extractUrl = (text) => {
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !mcpTunnelUrl) {
      mcpTunnelUrl = match[0];
      const fullUrl = `${mcpTunnelUrl}/mcp?token=${bridgeAuthToken}`;
      copyToClipboard(fullUrl);
      setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}Authenticated MCP URL loaded into your clipboard! (Ctrl + V to paste)${C.reset}`);
      if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    }
  };

  const appendTunnelLog = (text) => {
    text.split('\n').filter(l => l.trim()).forEach(l => {
      recentLogs.push(`${C.slate}[${new Date().toLocaleTimeString()}] cloudflared ${l}${C.reset}`);
      if (recentLogs.length > 50) recentLogs.shift();
    });
    if (showLiveLogs && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
  };

  if (useNamedTunnel) {
    tunnelProcess.stderr.on('data', chunk => appendTunnelLog(chunk.toString()));
  } else {
    tunnelProcess.stdout.on('data', chunk => extractUrl(chunk.toString()));
    tunnelProcess.stderr.on('data', chunk => extractUrl(chunk.toString()));
  }

  tunnelProcess.on('error', (err) => {
    setFlash(`  ${C.redBold}● [TUNNEL]${C.reset} ${C.white}Could not start cloudflared: ${err.message}${C.reset}`, 8000);
  });

  tunnelProcess.on('exit', (code, signal) => {
    tunnelAlive = false;
    if (isShuttingDown) return;
    if (code !== 0 && !isNavigatingFolders) {
      setFlash(`  ${C.redBold}● [TUNNEL]${C.reset} ${C.white}cloudflared exited (${code ?? signal}). Check the token and public hostname.${C.reset}`, 8000);
    } else {
      renderDashboard();
    }
  });

  // Step 6: Full Quantum Tunnel Creation Animation (directly replaces the tunnel creation wait time!)
  await playTunnelCreationAnimation(() => mcpTunnelUrl, 2500, 20000);
  isEstablishingTunnel = false;

  // Step 7: Smooth Load of Live Dashboard
  renderDashboard();

  // Window resize: the shared resize handler repaints the dashboard (wiping reflowed leftovers).
  activeRedraw = renderDashboard;

  function openOverviewSubView(view) {
    reviewConfirmUndo = null;
    terminalsConfirmStop = null;
    attachConfirmStop = false;
    if (view === 'files') {
      filesStatCache.clear();
      refreshFilesStat();
    } else if (view === 'review') {
      reviewCachedKey = '';
      reviewFocus = 'list';
      reviewDiffScroll = 0;
    } else if (view === 'help') {
      helpScroll = 0;
    }
    overviewView = view;
    renderDashboard();
  }

  // ---- Mouse clicks (top-right Overview button and the Overview menu) ----
  // Readline would split a mouse report into stray keys ("M" would open the mode picker), so
  // mouse reports are cut out of the input before readline sees it.
  function onMouseDown(button, x, y) {
    if (button !== 0) return; // left button only
    if (isNavigatingFolders || isEstablishingTunnel || isShuttingDown || confirmingExit || choosingMode) return;
    const onButton = menuButtonHit && y === menuButtonHit.row && x >= menuButtonHit.from && x <= menuButtonHit.to;
    if (overviewView === 'menu') {
      const box = menuBoxHit;
      if (box && x >= box.left && x <= box.right && y >= box.top && y < box.top + box.height) {
        const idx = y - box.top - 1; // first line is the border
        if (idx >= 0 && idx < OVERVIEW_MENU_ITEMS.length) {
          overviewMenuIndex = idx;
          openOverviewSubView(OVERVIEW_MENU_ITEMS[idx].view);
        } else if (idx === -1) {
          overviewView = null; // click on the menu title closes it
          renderDashboard();
        }
        return;
      }
      overviewView = null; // click anywhere else closes the menu
      renderDashboard();
      return;
    }
    if (!overviewView && onButton) {
      overviewView = 'menu';
      overviewMenuIndex = 0;
      renderDashboard();
    }
  }

  const MOUSE_REPORT = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
  const originalStdinEmit = process.stdin.emit;
  process.stdin.emit = function (event, chunk, ...rest) {
    if (event === 'data' && chunk) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      if (text.includes('\x1b[<')) {
        const remaining = text.replace(MOUSE_REPORT, (m, b, x, y, kind) => {
          if (kind === 'M') {
            try { onMouseDown(Number(b), Number(x), Number(y)); } catch (e) {}
          }
          return '';
        });
        if (!remaining) return true;
        chunk = Buffer.isBuffer(chunk) ? Buffer.from(remaining, 'utf8') : remaining;
      }
    }
    return originalStdinEmit.call(this, event, chunk, ...rest);
  };
  mouseEnabled = true;
  process.stdout.write(MOUSE_ON);

  function attachProcessToTab(procId) {
    if (!procId) return;
    let idx = terminalTabs.findIndex(t => t.id === procId);
    if (idx === -1) {
      terminalTabs.push({ id: procId, scrollOffset: 0, unreadBelow: false, inputBuf: '', inputCursor: 0 });
      idx = terminalTabs.length - 1;
    }
    activeTabIndex = idx;
    attachConfirmStop = false;
    overviewView = 'attach';
    syncAttachApprovalGuard();
    renderDashboard();
  }

  let nextRevertReqId = 1;

  // Step 8: Dashboard Keypress Listener
  process.stdin.on('keypress', async (str, key) => {
    try {
      if (isNavigatingFolders || isEstablishingTunnel || !key) return;

      const keyName = (key.name || str || '').toLowerCase();

      // Exit confirmation: Q (or Ctrl+C) asks first; Y stops the server, N/Esc cancels.
      // A second Ctrl+C while asking exits immediately (emergency stop).
      if (confirmingExit) {
        if (keyName === 'y' || (key.ctrl && key.name === 'c')) {
          cleanupAndExit();
        } else if (keyName === 'n' || key.name === 'escape' || keyName === 'q') {
          confirmingExit = false;
          setFlash(`  ${C.voltBold}● [CANCELLED]${C.reset} ${C.white}Bridge keeps running.${C.reset}`, 2500);
        }
        return;
      }

      // Mode picker: 1-4 choose, Esc/M cancels.
      if (choosingMode) {
        const picked = APPROVAL_MODES.find(m => m.key === keyName || m.key === str);
        if (picked) {
          choosingMode = false;
          setApprovalMode(picked.id);
        } else if (key.name === 'escape' || keyName === 'm') {
          choosingMode = false;
          renderDashboard();
        } else if ((key.ctrl && key.name === 'c') || keyName === 'q') {
          choosingMode = false;
          confirmingExit = true;
          renderDashboard();
        }
        return;
      }

      // Approval prompts always win on top of every view (including Attach).
      if (approvalQueue.length > 0) {
        if (overviewView === 'attach') {
          syncAttachApprovalGuard();
          // Guard against accidental approval while typing in an attached terminal:
          // require a 750 ms pause with no keypresses before accepting Y/N or Esc (= deny).
          const decision = evaluateAttachApprovalKey({
            lastActivityAt: attachApprovalShownAt,
            now: Date.now(),
            key,
            keyName
          });
          attachApprovalShownAt = decision.nextLastActivityAt;
          if (decision.guardActive) {
            scheduleAttachApprovalGuardTimer();
            return;
          }
          if (decision.action === 'approve') {
            answerApproval(true);
          } else if (decision.action === 'deny') {
            answerApproval(false);
          }
          return;
        }
        if (!key.ctrl && !key.meta && (keyName === 'y' || keyName === 'n')) {
          answerApproval(keyName === 'y');
          return;
        }
      }

      // ---- Overview Panel State Machine ----
      if (overviewView) {
        // Ctrl+C closes any Overview view first; a second press goes to normal exit confirmation.
        if (key.ctrl && key.name === 'c') {
          overviewView = null;
          reviewConfirmUndo = null;
          terminalsConfirmStop = null;
          attachConfirmStop = false;
          renderDashboard();
          return;
        }

        // Attach view: intercept Ctrl-chords and scrollback; forward everything else to process stdin.
        if (overviewView === 'attach') {
          const activeTab = terminalTabs[activeTabIndex];
          const activeProc = activeTab ? procRegistry.get(activeTab.id) : null;

          if (attachConfirmStop) {
            if (keyName === 'y') {
              attachConfirmStop = false;
              if (activeProc && activeProc.status === 'running') {
                sendServerIpc({ type: 'job-stop', id: activeProc.id });
              }
              renderDashboard();
            } else if (keyName === 'n' || key.name === 'escape') {
              attachConfirmStop = false;
              renderDashboard();
            }
            return;
          }

          const seq = key.sequence || str || '';
          const isCtrlLeft = (key.ctrl && key.name === 'left') || seq === '\x1b[1;5D' || seq === '\x1b[5D';
          const isCtrlRight = (key.ctrl && key.name === 'right') || seq === '\x1b[1;5C' || seq === '\x1b[5C';
          const isCtrlBracket = seq === '\x1d' || str === '\x1d' || (key.ctrl && key.name === ']');

          if (isCtrlLeft) {
            if (terminalTabs.length > 1) {
              activeTabIndex = (activeTabIndex - 1 + terminalTabs.length) % terminalTabs.length;
              renderDashboard();
            }
            return;
          }
          if (isCtrlRight) {
            if (terminalTabs.length > 1) {
              activeTabIndex = (activeTabIndex + 1) % terminalTabs.length;
              renderDashboard();
            }
            return;
          }
          if (key.ctrl && keyName === 'w') {
            if (terminalTabs.length > 0) {
              terminalTabs.splice(activeTabIndex, 1);
              if (activeTabIndex >= terminalTabs.length) activeTabIndex = Math.max(0, terminalTabs.length - 1);
            }
            if (terminalTabs.length === 0) overviewView = 'terminals';
            renderDashboard();
            return;
          }
          if (key.ctrl && keyName === 'x') {
            if (activeProc && activeProc.status === 'running') {
              attachConfirmStop = true;
              renderDashboard();
            }
            return;
          }
          if (isCtrlBracket || (key.ctrl && keyName === 't')) {
            overviewView = 'terminals';
            renderDashboard();
            return;
          }

          // Scrollback: Shift+Up/Down or PgUp/PgDn
          const pageStep = Math.max(1, getRows() - 6);
          if ((key.shift && key.name === 'up') || seq === '\x1b[1;2A') {
            if (activeTab) { activeTab.scrollOffset += 1; renderDashboard(); }
            return;
          }
          if ((key.shift && key.name === 'down') || seq === '\x1b[1;2B') {
            if (activeTab) {
              activeTab.scrollOffset = Math.max(0, activeTab.scrollOffset - 1);
              if (activeTab.scrollOffset === 0) activeTab.unreadBelow = false;
              renderDashboard();
            }
            return;
          }
          if (key.name === 'pageup') {
            if (activeTab) { activeTab.scrollOffset += pageStep; renderDashboard(); }
            return;
          }
          if (key.name === 'pagedown') {
            if (activeTab) {
              activeTab.scrollOffset = Math.max(0, activeTab.scrollOffset - pageStep);
              if (activeTab.scrollOffset === 0) activeTab.unreadBelow = false;
              renderDashboard();
            }
            return;
          }

          // Local line editing & stdin control when process stdin is open
          if (activeTab && activeProc && activeProc.status === 'running' && activeProc.stdinOpen) {
            if (typeof activeTab.inputBuf !== 'string') activeTab.inputBuf = '';
            if (typeof activeTab.inputCursor !== 'number') activeTab.inputCursor = activeTab.inputBuf.length;
            const buf = activeTab.inputBuf;
            const cur = Math.max(0, Math.min(buf.length, activeTab.inputCursor));
            const submitAttachLine = (lineText) => {
              const eol = process.platform === 'win32' ? '\r\n' : '\n';
              sendServerIpc({ type: 'job-input', id: activeProc.id, data: lineText + eol });
              if (shouldEchoSentLine(lineText, Boolean(activeProc.partialLine))) {
                const echoPrefix = activeProc.partialLine ? '' : (ASCII_UI ? '> ' : '› ');
                appendProcOutputLine(activeProc, `${C.slate}${echoPrefix}${lineText}${C.reset}\n`);
              }
              activeTab.scrollOffset = 0;
              activeTab.unreadBelow = false;
            };

            // Multi-character paste: split on newlines, submit each completed line, preserve tabs
            if (!key.ctrl && !key.meta && typeof str === 'string' && str.length > 1) {
              const pasted = applyAttachPaste(buf, cur, str);
              for (const lineToSend of pasted.linesToSend) {
                submitAttachLine(lineToSend);
              }
              activeTab.inputBuf = pasted.buf;
              activeTab.inputCursor = pasted.cursor;
              renderDashboard();
              return;
            }
            // Ctrl+D: flush any pending buffer without newline, echo dimmed, then send EOF
            if ((key.ctrl && keyName === 'd') || seq === '\x04' || str === '\x04') {
              if (buf.length > 0) {
                sendServerIpc({ type: 'job-input', id: activeProc.id, data: buf });
                const echoPrefix = activeProc.partialLine ? '' : (ASCII_UI ? '> ' : '› ');
                appendProcOutputLine(activeProc, `${C.slate}${echoPrefix}${buf}${C.reset}\n`);
                activeTab.inputBuf = '';
                activeTab.inputCursor = 0;
                activeTab.scrollOffset = 0;
                activeTab.unreadBelow = false;
              }
              sendServerIpc({ type: 'job-eof', id: activeProc.id });
              renderDashboard();
              return;
            }
            // Esc: forward immediately (no buffering) for tools that need it
            if (key.name === 'escape' || seq === '\x1b') {
              sendServerIpc({ type: 'job-input', id: activeProc.id, data: '\x1b' });
              return;
            }
            // Enter: send buffer + newline, clear buffer, and echo sent line dimmed (skip empty echo when no partialLine)
            if (key.name === 'return' || key.name === 'enter' || str === '\r' || str === '\n') {
              activeTab.inputBuf = '';
              activeTab.inputCursor = 0;
              submitAttachLine(buf);
              renderDashboard();
              return;
            }
            // Ctrl+U: clear input line
            if ((key.ctrl && keyName === 'u') || seq === '\x15' || str === '\x15') {
              if (buf.length > 0) {
                activeTab.inputBuf = '';
                activeTab.inputCursor = 0;
                renderDashboard();
              }
              return;
            }
            // Backspace: delete character before cursor locally
            if (key.name === 'backspace' || str === '\x7f' || str === '\b') {
              if (cur > 0) {
                activeTab.inputBuf = buf.slice(0, cur - 1) + buf.slice(cur);
                activeTab.inputCursor = cur - 1;
                renderDashboard();
              }
              return;
            }
            // Delete: delete character at cursor locally
            if (key.name === 'delete') {
              if (cur < buf.length) {
                activeTab.inputBuf = buf.slice(0, cur) + buf.slice(cur + 1);
                renderDashboard();
              }
              return;
            }
            // Left / Right / Home / End: move cursor within buffer
            if (!key.ctrl && !key.meta && key.name === 'left') {
              if (cur > 0) {
                activeTab.inputCursor = cur - 1;
                renderDashboard();
              }
              return;
            }
            if (!key.ctrl && !key.meta && key.name === 'right') {
              if (cur < buf.length) {
                activeTab.inputCursor = cur + 1;
                renderDashboard();
              }
              return;
            }
            if (!key.ctrl && !key.meta && key.name === 'home') {
              if (cur !== 0) {
                activeTab.inputCursor = 0;
                renderDashboard();
              }
              return;
            }
            if (!key.ctrl && !key.meta && key.name === 'end') {
              if (cur !== buf.length) {
                activeTab.inputCursor = buf.length;
                renderDashboard();
              }
              return;
            }
            // Printable keys: insert into buffer at cursor
            if (!key.ctrl && !key.meta && typeof str === 'string' && str.length > 0 && !/[\x00-\x1f\x7f]/.test(str)) {
              activeTab.inputBuf = buf.slice(0, cur) + str + buf.slice(cur);
              activeTab.inputCursor = cur + str.length;
              renderDashboard();
              return;
            }
          }
          return;
        }

        // [Q] while any non-attach overview view is open closes the view first.
        if (keyName === 'q' && !key.ctrl && !key.meta) {
          overviewView = null;
          reviewConfirmUndo = null;
          terminalsConfirmStop = null;
          renderDashboard();
          return;
        }

        // Overview dropdown menu
        if (overviewView === 'menu') {
          if (key.name === 'escape' || keyName === 's') {
            overviewView = null;
            renderDashboard();
          } else if (key.name === 'up') {
            overviewMenuIndex = (overviewMenuIndex - 1 + OVERVIEW_MENU_ITEMS.length) % OVERVIEW_MENU_ITEMS.length;
            renderDashboard();
          } else if (key.name === 'down') {
            overviewMenuIndex = (overviewMenuIndex + 1) % OVERVIEW_MENU_ITEMS.length;
            renderDashboard();
          } else if (key.name === 'return') {
            openOverviewSubView(OVERVIEW_MENU_ITEMS[overviewMenuIndex].view);
          } else if (keyName === 'r') {
            overviewMenuIndex = 0;
            openOverviewSubView('review');
          } else if (keyName === 'f') {
            overviewMenuIndex = 1;
            openOverviewSubView('files');
          } else if (keyName === 't') {
            overviewMenuIndex = 2;
            openOverviewSubView('terminals');
          } else if (keyName === 'h') {
            overviewMenuIndex = 3;
            openOverviewSubView('help');
          }
          return;
        }

        // [R] Review view
        if (overviewView === 'review') {
          const entries = getReviewEntries();
          const selected = entries[reviewSelectedIndex];

          if (reviewConfirmUndo) {
            if (keyName === 'y') {
              const targetPath = reviewConfirmUndo.path;
              reviewConfirmUndo = null;
              sendServerIpc({ type: 'revert-request', path: targetPath, requestId: nextRevertReqId++ });
              renderDashboard();
            } else if (keyName === 'n' || key.name === 'escape') {
              reviewConfirmUndo = null;
              renderDashboard();
            }
            return;
          }

          const pageStep = Math.max(1, Math.floor(getRows() * 0.5));
          if (key.name === 'escape') {
            reviewInspectExtraPath = null;
            overviewView = 'menu';
            renderDashboard();
          } else if (key.name === 'up') {
            if (reviewFocus === 'diff') {
              reviewDiffScroll = Math.max(0, reviewDiffScroll - 1);
            } else if (entries.length > 0) {
              reviewSelectedIndex = Math.max(0, reviewSelectedIndex - 1);
              reviewDiffScroll = 0;
            }
            renderDashboard();
          } else if (key.name === 'down') {
            if (reviewFocus === 'diff') {
              reviewDiffScroll += 1;
            } else if (entries.length > 0) {
              reviewSelectedIndex = Math.min(entries.length - 1, reviewSelectedIndex + 1);
              reviewDiffScroll = 0;
            }
            renderDashboard();
          } else if (key.name === 'return' || key.name === 'right') {
            reviewFocus = 'diff';
            renderDashboard();
          } else if (key.name === 'left') {
            reviewFocus = 'list';
            renderDashboard();
          } else if (key.name === 'pageup') {
            reviewDiffScroll = Math.max(0, reviewDiffScroll - pageStep);
            renderDashboard();
          } else if (key.name === 'pagedown') {
            reviewDiffScroll += pageStep;
            renderDashboard();
          } else if (str === 'G' || (key.shift && keyName === 'g')) {
            reviewDiffScroll = 9999999;
            renderDashboard();
          } else if (keyName === 'g') {
            reviewDiffScroll = 0;
            renderDashboard();
          } else if (keyName === 'u') {
            if (selected && !selected.untrackedView) {
              reviewConfirmUndo = { path: selected.path };
              renderDashboard();
            }
          } else if (keyName === 'o') {
            if (selected) openInDefaultEditor(selected.path);
          } else if (keyName === 'f') {
            overviewMenuIndex = 1;
            openOverviewSubView('files');
          } else if (keyName === 't') {
            overviewMenuIndex = 2;
            openOverviewSubView('terminals');
          } else if (keyName === 'h') {
            overviewMenuIndex = 3;
            openOverviewSubView('help');
          }
          return;
        }

        // [F] Files view
        if (overviewView === 'files') {
          const row = filesTreeRows[filesSelectedIndex];
          if (key.name === 'escape') {
            overviewView = 'menu';
            renderDashboard();
          } else if (key.name === 'up') {
            filesSelectedIndex = Math.max(0, filesSelectedIndex - 1);
            renderDashboard();
          } else if (key.name === 'down') {
            filesSelectedIndex = Math.min(Math.max(0, filesTreeRows.length - 1), filesSelectedIndex + 1);
            renderDashboard();
          } else if (key.name === 'right') {
            if (row && row.type === 'dir') {
              if (!filesShowAll) filesExpandedDirs.delete('COLLAPSED:' + row.relPath);
              else filesExpandedDirs.add(row.relPath);
              renderDashboard();
            }
          } else if (key.name === 'left') {
            if (row && row.type === 'dir' && row.expanded) {
              if (!filesShowAll) filesExpandedDirs.add('COLLAPSED:' + row.relPath);
              else filesExpandedDirs.delete(row.relPath);
              renderDashboard();
            } else if (row && row.depth > 0) {
              // Move selection up to parent directory
              for (let i = filesSelectedIndex - 1; i >= 0; i--) {
                if (filesTreeRows[i].type === 'dir' && filesTreeRows[i].depth < row.depth) {
                  filesSelectedIndex = i;
                  break;
                }
              }
              renderDashboard();
            }
          } else if (key.name === 'return') {
            if (row && row.type === 'dir') {
              if (!filesShowAll) {
                const ck = 'COLLAPSED:' + row.relPath;
                if (filesExpandedDirs.has(ck)) filesExpandedDirs.delete(ck);
                else filesExpandedDirs.add(ck);
              } else {
                if (filesExpandedDirs.has(row.relPath)) filesExpandedDirs.delete(row.relPath);
                else filesExpandedDirs.add(row.relPath);
              }
              renderDashboard();
            } else if (row && row.type === 'file') {
              reviewInspectExtraPath = changeLog.has(row.relPath) ? null : row.relPath;
              const entries = getReviewEntries();
              const idx = entries.findIndex(e => e.path === row.relPath);
              reviewSelectedIndex = idx >= 0 ? idx : 0;
              reviewCachedKey = '';
              reviewFocus = 'diff';
              reviewDiffScroll = 0;
              overviewView = 'review';
              renderDashboard();
            }
          } else if (keyName === 'a') {
            filesShowAll = !filesShowAll;
            filesSelectedIndex = 0;
            filesStatCache.clear();
            refreshFilesStat();
            renderDashboard();
          } else if (keyName === 'o') {
            if (row && row.type === 'file') openInDefaultEditor(row.relPath);
          } else if (keyName === 'r') {
            overviewMenuIndex = 0;
            openOverviewSubView('review');
          } else if (keyName === 't') {
            overviewMenuIndex = 2;
            openOverviewSubView('terminals');
          } else if (keyName === 'h') {
            overviewMenuIndex = 3;
            openOverviewSubView('help');
          }
          return;
        }

        // [T] Terminals list view
        if (overviewView === 'terminals') {
          const procs = getOrderedProcesses();
          const selected = procs[terminalsSelectedIndex];

          if (terminalsConfirmStop) {
            if (keyName === 'y') {
              const id = terminalsConfirmStop.id;
              terminalsConfirmStop = null;
              sendServerIpc({ type: 'job-stop', id });
              renderDashboard();
            } else if (keyName === 'n' || key.name === 'escape') {
              terminalsConfirmStop = null;
              renderDashboard();
            }
            return;
          }

          if (key.name === 'escape') {
            overviewView = 'menu';
            renderDashboard();
          } else if (key.name === 'up') {
            terminalsSelectedIndex = Math.max(0, terminalsSelectedIndex - 1);
            renderDashboard();
          } else if (key.name === 'down') {
            terminalsSelectedIndex = Math.min(Math.max(0, procs.length - 1), terminalsSelectedIndex + 1);
            renderDashboard();
          } else if (key.name === 'return') {
            if (selected) attachProcessToTab(selected.id);
          } else if (keyName === 'x') {
            if (selected && selected.status === 'running') {
              terminalsConfirmStop = { id: selected.id, command: selected.command };
              renderDashboard();
            }
          } else if (keyName === 'c') {
            for (const [id, p] of Array.from(procRegistry.entries())) {
              if (p.status !== 'running') {
                procRegistry.delete(id);
                const tIdx = terminalTabs.findIndex(t => t.id === id);
                if (tIdx !== -1) terminalTabs.splice(tIdx, 1);
              }
            }
            if (activeTabIndex >= terminalTabs.length) activeTabIndex = Math.max(0, terminalTabs.length - 1);
            terminalsSelectedIndex = 0;
            renderDashboard();
          } else if (keyName === 'r') {
            overviewMenuIndex = 0;
            openOverviewSubView('review');
          } else if (keyName === 'f') {
            overviewMenuIndex = 1;
            openOverviewSubView('files');
          } else if (keyName === 'h') {
            overviewMenuIndex = 3;
            openOverviewSubView('help');
          }
          return;
        }

        // [H] Help view
        if (overviewView === 'help') {
          const pageStep = Math.max(1, getRows() - 6);
          if (key.name === 'escape') {
            overviewView = 'menu';
            renderDashboard();
          } else if (key.name === 'up') {
            helpScroll = Math.max(0, helpScroll - 1);
            renderDashboard();
          } else if (key.name === 'down') {
            helpScroll += 1;
            renderDashboard();
          } else if (key.name === 'pageup') {
            helpScroll = Math.max(0, helpScroll - pageStep);
            renderDashboard();
          } else if (key.name === 'pagedown') {
            helpScroll += pageStep;
            renderDashboard();
          } else if (str === 'G' || (key.shift && keyName === 'g')) {
            helpScroll = 9999999;
            renderDashboard();
          } else if (keyName === 'g') {
            helpScroll = 0;
            renderDashboard();
          } else if (keyName === 'r') {
            overviewMenuIndex = 0;
            openOverviewSubView('review');
          } else if (keyName === 'f') {
            overviewMenuIndex = 1;
            openOverviewSubView('files');
          } else if (keyName === 't') {
            overviewMenuIndex = 2;
            openOverviewSubView('terminals');
          }
          return;
        }
      }

      if ((key.ctrl && key.name === 'c') || keyName === 'q') {
        confirmingExit = true;
        renderDashboard();
        return;
      }

      if (keyName === 'c') {
        if (mcpTunnelUrl) {
          const fullUrl = `${mcpTunnelUrl}/mcp?token=${bridgeAuthToken}`;
          if (copyToClipboard(fullUrl)) {
            setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}Authenticated MCP URL copied to clipboard (token ${maskToken(bridgeAuthToken)}).${C.reset}`);
          } else {
            // No clipboard tool available: show the full URL once so it can be copied by hand.
            setFlash(`  ${C.redBold}● [NO CLIPBOARD]${C.reset} ${C.white}Copy manually: ${C.cyanBold}${fullUrl}${C.reset}`, 15000);
          }
        } else {
          setFlash(`  ${C.slate}● [WAIT]${C.reset} ${C.white}Tunnel is still establishing... please wait.${C.reset}`);
        }
      } else if (keyName === 't') {
        if (copyToClipboard(bridgeAuthToken)) {
          setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}Bearer auth token copied to clipboard (${maskToken(bridgeAuthToken)}).${C.reset}`);
        } else {
          setFlash(`  ${C.redBold}● [NO CLIPBOARD]${C.reset} ${C.white}Token: ${bridgeAuthToken}${C.reset}`, 15000);
        }
      } else if (keyName === 'd') {
        // Launch In-CLI Directory Navigator
        const picked = await selectDirectoryInteractive(activeProjectDir);
        if (picked) {
          switchProjectDirectory(picked);
        }
        renderDashboard();
      } else if (keyName === 'l') {
        showLiveLogs = !showLiveLogs;
        renderDashboard();
      } else if (keyName === 'm') {
        choosingMode = true;
        renderDashboard();
      } else if (keyName === 's') {
        overviewView = 'menu';
        overviewMenuIndex = 0;
        renderDashboard();
      }
    } catch (err) {
      // Prevent any crash from closing the CLI
      setFlash(`  ${C.redBold}● [NOTE]${C.reset} ${C.white}${err.message}${C.reset}`);
    }
  });

  renderDashboard();
}

// Kill a child and everything it started (the server's background jobs, cloudflared children).
function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  } catch (e) {
    try { child.kill(); } catch (err) {}
  }
}

function cleanupAndExit() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?7h\x1b[?1049l\x1b[?25h');
  process.stdout.write('\n\n' + C.voltBold + 'Stopping Bridge and releasing ports...' + C.reset + '\n');
  if (serverProcess) {
    // Ask the server to stop its background jobs, then make sure the whole tree is gone.
    try { serverProcess.send({ type: 'shutdown' }); } catch (e) {}
    killTree(serverProcess);
  }
  killTree(tunnelProcess);
  console.log(C.voltBold + '● [STOPPED] Bridge stopped cleanly. Goodbye!\n' + C.reset);
  process.exit(0);
}

process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

process.on('uncaughtException', (err) => {
  process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?7h\x1b[?1049l\x1b[?25h');
  console.error('\n' + C.redBold + '● [UNCAUGHT ERROR] ' + C.reset + err.message + '\n' + (err.stack || ''));
});

process.on('unhandledRejection', (reason) => {
  process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[?7h\x1b[?1049l\x1b[?25h');
  console.error('\n' + C.redBold + '● [UNHANDLED REJECTION] ' + C.reset + reason);
});

if (subcommand === 'rotate-token') {
  const fresh = crypto.randomBytes(24).toString('hex');
  writeBridgeConfig({ authToken: fresh });
  console.log('\n' + C.voltBold + '● [ROTATED] ' + C.reset + 'New Bridge auth token saved. Restart Bridge and paste the new MCP URL ([C]) into every AI connector.\n');
  process.exit(0);
} else if (subcommand === 'setup') {
  runSetup().catch((err) => {
    console.error('\n' + C.redBold + '● [SETUP ERROR] ' + C.reset + err.message);
    process.exit(1);
  });
} else if (bridgeConfig.tunnelToken && !isValidPublicUrl(bridgeConfig.publicUrl)) {
  console.error('\n' + C.redBold + '● [CONFIG ERROR] ' + C.reset + 'A tunnel token is saved but the public URL is missing or invalid.');
  console.error(C.slate + 'Run `bridge setup` to add the fixed https:// URL.' + C.reset + '\n');
  process.exit(1);
} else {
  startBridge();
}
