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
const { spawn, execSync } = require('child_process');

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

const UI_WIDTH = 80;
const THIN_BAR = '─'.repeat(UI_WIDTH);
const THICK_BAR = '━'.repeat(UI_WIDTH);
const bar = THIN_BAR;
const thickBar = THICK_BAR;

const isLaunchFromBat = process.argv.includes('--launch');
const rawCliArgs = process.argv.slice(2).filter(a => a !== '--launch');
let activeProjectDir = rawCliArgs[0] ? path.resolve(rawCliArgs[0]) : null;
let mcpTunnelUrl = '';
let serverProcess = null;
let tunnelProcess = null;
let showLiveLogs = false;
let flashNotification = '';
let flashTimer = null;
let isNavigatingFolders = false;
let isEstablishingTunnel = false;
const recentLogs = [];

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
  try {
    if (process.platform === 'win32') {
      const proc = spawn('clip');
      proc.stdin.write(text);
      proc.stdin.end();
      return true;
    }
  } catch (e) {}
  return false;
}

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const psCmd = `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
      execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'ignore' });
      execSync(`powershell -NoProfile -Command "Stop-Process -Name 'cloudflared' -Force -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
    }
  } catch (e) {}
}

function switchProjectDirectory(newPath) {
  if (!newPath || !fs.existsSync(newPath)) {
    setFlash(`  ${C.redBold}● [ERROR]${C.reset} ${C.white}Invalid directory path.${C.reset}`);
    return;
  }

  const resolved = fs.realpathSync(path.resolve(newPath));
  activeProjectDir = resolved;

  // Notify running server
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/set-directory',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
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

function renderAsciiHeader(badgeText = '') {
  console.log(`${C.voltBold}${THICK_BAR}${C.reset}`);
  console.log(
    `  ${C.voltBold}██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗${C.reset}` +
    `    ${C.steel}╔══════╗${C.reset}          ${C.cyan}╔══╗  ╔══╗  ${C.reset}`
  );
  console.log(
    `  ${C.voltBold}██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝${C.reset}` +
    `    ${C.steel}║ ${C.white}>_ ${C.voltBold}█${C.steel} ║${C.reset}        ${C.cyan}╔═╝  ╚══╝  ╚═╗${C.reset}`
  );
  console.log(
    `  ${C.voltBold}██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  ${C.reset}` +
    `  ${C.voltBold}╔╩══════╩═╗${C.reset}     ${C.cyan}╔╝   ${C.voltBold}✦${C.cyanBold} LLM${C.cyan}    ╚╗${C.reset}`
  );
  console.log(
    `  ${C.voltBold}██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  ${C.reset}` +
    `  ${C.voltBold}║    ╚════╬═════╬════╝         ║${C.reset}`
  );
  console.log(
    `  ${C.voltBold}██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗${C.reset}` +
    `  ${C.voltBold}╚╗    ╔═══╩═════╩═══╗         ╔╝${C.reset}`
  );
  console.log(
    `  ${C.voltBold}╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝${C.reset}` +
    `   ${C.voltBold}╚════╝             ╚═════════╝ ${C.reset}`
  );
  console.log(`${C.voltBold}${THICK_BAR}${C.reset}`);

  if (badgeText) {
    console.log(`  ${badgeText}`);
    console.log(`${C.darkDivider}${THIN_BAR}${C.reset}`);
  }
}

/**
 * =========================================================================
 *  CENTERED BRIDGE CROSSING ANIMATION (Athletic Sprinter Crossing Bridge)
 *  A high-energy runner sprints across the architectural span in < 2 seconds!
 * =========================================================================
 */
async function playInitialLoadingAnimation(durationMs = 1800) {
  process.stdout.write('\x1b[?25l');
  const startTime = Date.now();
  let frame = 0;

  const bridgeWidth = 66;
  const sprinterSprites = [
    [
      "   __o ✦",
      "  / /\\_ ",
      " _\\__\\/_"
    ],
    [
      "    _o »",
      "   / /\\ ",
      "  < \\  >"
    ],
    [
      "   __o ✦",
      "  / /\\_ ",
      "   /  /\\"
    ],
    [
      "    _o »",
      "   / /\\ ",
      "  / /  \\"
    ]
  ];

  const trails = [" = = >", "  = = ", "= = > ", " = =  "];
  const startX = 6;
  const endX = 52;

  while (true) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);

    const termCols = process.stdout.columns || 80;
    const termRows = process.stdout.rows || 25;

    const padLeft = ' '.repeat(Math.max(0, Math.floor((termCols - bridgeWidth) / 2)));
    const topPad = '\n'.repeat(Math.max(1, Math.floor((termRows - 16) / 2) - 1));

    const runner = sprinterSprites[frame % 4];
    const runnerX = Math.floor(startX + progress * (endX - startX));

    const out = [];
    out.push(topPad);

    // Centered Title
    const title = `${C.voltBold}B  R  I  D  G  E${C.reset}`;
    const titlePad = ' '.repeat(Math.max(0, Math.floor((termCols - 15) / 2)));
    out.push(`${titlePad}${title}\n`);

    // Golden Gate Twin Vertical Steel Towers (Pure rectangular vertical towers - NO triangles, NO trees!)
    out.push(`${padLeft}${C.slate}      [LOCAL PC]                                     [CLOUD AI]      ${C.reset}`);
    out.push(`${padLeft}${C.steel}       ┌─┐                                             ┌─┐       ${C.reset}`);
    out.push(`${padLeft}${C.steel}       │ │ '.                                       .' │ │       ${C.reset}`);
    out.push(`${padLeft}${C.steel}      ┌┴─┴┐  '.                                   .'  ┌┴─┴┐      ${C.reset}`);
    out.push(`${padLeft}${C.steel}      │ █ │    '.                               .'    │ █ │      ${C.reset}`);
    out.push(`${padLeft}${C.steel}      └┬─┬┘      '--.........................--'      └┬─┬┘      ${C.reset}`);

    // 3 lines for runner deck level (vertical tower columns on sides, runner in middle)
    for (let r = 0; r < 3; r++) {
      let lineChars = Array(bridgeWidth).fill(' ');
      lineChars[7] = '│';
      lineChars[9] = '│';
      lineChars[55] = '│';
      lineChars[57] = '│';

      // Trail effect behind runner
      if (r === 1 && runnerX > 14) {
        const trailStr = trails[frame % trails.length];
        for (let t = 0; t < trailStr.length; t++) {
          const pos = runnerX - 6 + t;
          if (pos > 10 && pos < 54) {
            lineChars[pos] = trailStr[t];
          }
        }
      }

      // Place runner sprite
      const spriteLine = runner[r];
      for (let c = 0; c < 8; c++) {
        if (c < spriteLine.length) {
          lineChars[runnerX + c] = spriteLine[c];
        }
      }

      // Colorize
      let formatted = '';
      for (let i = 0; i < lineChars.length; i++) {
        const ch = lineChars[i];
        if (i >= runnerX && i < runnerX + 8 && ch !== ' ') {
          if (ch === '✦' || ch === '»') {
            formatted += C.cyanBold + ch + C.reset;
          } else {
            formatted += C.voltBold + ch + C.reset;
          }
        } else if (i < runnerX && (ch === '=' || ch === '>')) {
          formatted += C.slate + ch + C.reset;
        } else if (ch === '│' || ch === '┌' || ch === '┐' || ch === '└' || ch === '┘' || ch === '┴' || ch === '┬' || ch === '█') {
          formatted += C.steel + ch + C.reset;
        } else {
          formatted += ch;
        }
      }
      out.push(padLeft + formatted);
    }

    // Heavy Highway Deck with steel portal frames at tower bases
    out.push(`${padLeft}${C.whiteBold}═════${C.voltBold}[═══]${C.whiteBold}═════════════════════════════════════════════${C.voltBold}[═══]${C.whiteBold}═════${C.reset}`);

    // Foundation caissons beneath towers
    out.push(`${padLeft}${C.steel}      │   │                                           │   │      ${C.reset}`);
    out.push(`${padLeft}${C.steel}     [█████]                 ~ ~ ~ ~ ~ ~             [█████]     ${C.reset}`);

    // Clean water reflections
    const waves = [
      '≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈',
      ' ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ '
    ];
    out.push(`${padLeft}${C.cyan}${waves[frame % 2]}${C.reset}\n`);

    // Clean status & percentage
    const pct = Math.min(100, Math.round(progress * 100));
    const statusMsg = progress >= 1.0 ? 'BRIDGE CONNECTED!' : 'CROSSING THE BRIDGE...';
    const subText = `${C.whiteBold}${statusMsg}${C.reset}  ${C.voltBold}${pct}%${C.reset}`;
    const subPad = ' '.repeat(Math.max(0, Math.floor((termCols - 28) / 2)));
    out.push(`${subPad}${subText}`);

    // Progress bar
    const barLen = 30;
    const filled = Math.min(barLen, Math.round(progress * barLen));
    const empty = barLen - filled;
    const barStr = C.voltBold + '█'.repeat(filled) + C.steel + '░'.repeat(empty) + C.reset;
    const barPad = ' '.repeat(Math.max(0, Math.floor((termCols - (barLen + 2)) / 2)));
    out.push(`${barPad}[${barStr}]`);

    process.stdout.write('\x1b[2J\x1b[0f');
    process.stdout.write(out.join('\n'));

    if (progress >= 1.0) {
      break;
    }

    frame++;
    await new Promise(r => setTimeout(r, 55));
  }

  await new Promise(r => setTimeout(r, 150));
  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[2J\x1b[0f');
}

/**
 * =========================================================================
 *  QUANTUM TUNNEL CREATION ANIMATION (Replaces Cloudflare tunnel wait time)
 *  Displays full ASCII header, traveling packet beam, and live progress bar
 * =========================================================================
 */
async function playTunnelCreationAnimation(getTunnelUrlFn, minDurationMs = 2500, maxDurationMs = 20000) {
  process.stdout.write('\x1b[?25l');

  const startTime = Date.now();
  let frame = 0;

  const packetTracks = [
    '  [LOCAL PC] ═══▶═════════════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ══════▶══════════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════▶═══════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ════════════▶════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═══════════════▶═════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ══════════════════▶══ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ✦ ) ═══▶══════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ══════▶═══════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ═════════▶════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ════════════▶═════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ═══════════════▶══════ [CLOUD AI] ✦',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ══════════════════▶═══ [CLOUD AI] ✦',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ═══════════════◀══════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ∞ ) ════════════◀═════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════════════════ ( ✦ ) ═══◀══════════════════ [CLOUD AI]',
    '  [LOCAL PC] ══════════════════◀══ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═══════════════◀═════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ════════════◀════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ═════════◀═══════════ ( ∞ ) ══════════════════════ [CLOUD AI]',
    '  [LOCAL PC] ══════◀══════════════ ( ∞ ) ══════════════════════ [CLOUD AI]'
  ];

  const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const stages = [
    'Mounting DeepSeek Harness & Local Project Sandbox...',
    'Connecting to Cloudflare Global Anycast Edge...',
    'Allocating Public HTTPS Quantum Tunnel for MCP...',
    'Finalizing Secure WebSocket & SSE Streaming...'
  ];

  while (true) {
    const elapsed = Date.now() - startTime;
    const url = getTunnelUrlFn();

    // Finish when we have the URL and met minimum duration (or hit max timeout)
    if ((url && elapsed >= minDurationMs) || elapsed >= maxDurationMs) {
      break;
    }

    let progress = Math.min(0.92, (elapsed / (minDurationMs + 800)));
    if (url) progress = 0.98;
    const pct = Math.round(progress * 100);

    const barLen = 46;
    const filled = Math.round(progress * barLen);
    const empty = barLen - filled;
    const bar = C.voltBold + '█'.repeat(filled) + C.steel + '░'.repeat(empty) + C.reset;

    const spinner = spinners[frame % spinners.length];
    const track = packetTracks[frame % packetTracks.length];
    const stageIdx = Math.min(stages.length - 1, Math.floor((frame / 6) % stages.length));
    const stageText = stages[stageIdx];

    process.stdout.write('\x1b[2J\x1b[0f');
    renderAsciiHeader(`${C.bgVolt} ESTABLISHING TUNNEL ${C.reset}`);

    console.log(`  ${C.cyanBold}${track.trim()}${C.reset}`);
    console.log(`${C.darkDivider}${THIN_BAR}${C.reset}`);
    console.log(`  ${C.voltBold}${spinner}${C.reset} ${C.whiteBold}CREATING CLOUDFLARE SECURE TUNNEL${C.reset}  ${C.voltBold}${String(pct).padStart(3, ' ')}%${C.reset}`);
    console.log(`  [${bar}]`);
    console.log(`  ${C.slate}● ${stageText}${C.reset}`);
    console.log(`${C.voltBold}${THICK_BAR}${C.reset}`);

    frame++;
    await new Promise(r => setTimeout(r, 70));
  }

  // Final confirmation frame
  const finalUrl = getTunnelUrlFn() || 'https://trycloudflare.com';
  process.stdout.write('\x1b[2J\x1b[0f');
  renderAsciiHeader(`${C.bgVolt} TUNNEL ACTIVE ${C.reset}`);
  console.log(`  ${C.cyanBold}  [LOCAL PC] ═════════════════════ ( ✦ ) ══════════════════════ [CLOUD AI] ✦${C.reset}`);
  console.log(`${C.darkDivider}${THIN_BAR}${C.reset}`);
  console.log(`  ${C.voltBold}✓${C.reset} ${C.whiteBold}CLOUDFLARE TUNNEL CONNECTED${C.reset}  ${C.voltBold}100%${C.reset}`);
  console.log(`  [${C.voltBold}${'█'.repeat(46)}${C.reset}]`);
  console.log(`  ${C.voltBold}● MCP URL: ${C.cyanBold}${finalUrl}/mcp${C.reset} ${C.slate}(Copied to Clipboard!)${C.reset}`);
  console.log(`${C.voltBold}${THICK_BAR}${C.reset}`);

  await new Promise(r => setTimeout(r, 400));

  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[2J\x1b[0f');
}

/**
 * =========================================================================
 *  IN-CLI INTERACTIVE DIRECTORY NAVIGATOR
 *  Browse, explore, and pick folders purely inside the terminal window!
 * =========================================================================
 */
function selectDirectoryInteractive(startDir) {
  return new Promise((resolve) => {
    isNavigatingFolders = true;
    let currentDir = startDir && fs.existsSync(startDir) ? path.resolve(startDir) : process.cwd();
    let selectedIndex = 0;
    let isTypingPath = false;
    let typedPath = '';
    let errorMessage = '';

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
      process.stdout.write('\x1b[2J\x1b[0f');
      const w = UI_WIDTH;
      const thinBar = '─'.repeat(w);
      const thickBar = '━'.repeat(w);

      // 1. First load Bridge ASCII Logo at top
      renderAsciiHeader(`${C.bgVolt} DIRECTORY NAVIGATOR ${C.reset}`);

      // 2. Down select the project
      console.log(`  ${C.slate}Current Folder:${C.reset} ${C.voltBold}${currentDir}${C.reset}`);
      console.log(`${C.darkDivider}${thinBar}${C.reset}`);

      if (errorMessage) {
        console.log(`  ${C.redBold}● [NOTE] ${errorMessage}${C.reset}`);
        errorMessage = '';
        console.log(`${C.darkDivider}${thinBar}${C.reset}`);
      }

      if (isTypingPath) {
        console.log(`\n  ${C.voltBold}Type or Paste Directory Path:${C.reset}`);
        console.log(`  > ${C.whiteBold}${typedPath}${C.reset}_\n`);
        console.log(`  ${C.slate}[Enter] Confirm  |  [Esc] Back to Directory Browser${C.reset}`);
        console.log(`${C.voltBold}${thickBar}${C.reset}`);
        return;
      }

      // Scrolling window of items
      const maxVisible = 10;
      let startIdx = 0;
      if (selectedIndex >= maxVisible) {
        startIdx = selectedIndex - maxVisible + 1;
      }
      const visibleItems = items.slice(startIdx, startIdx + maxVisible);

      visibleItems.forEach((item, relIdx) => {
        const actualIdx = startIdx + relIdx;
        const isSelected = actualIdx === selectedIndex;
        if (isSelected) {
          console.log(`  ${C.bgVolt} ► ${item.name.padEnd(70)} ${C.reset}`);
        } else {
          const color = item.type === 'select_current' ? C.voltBold : (item.type === 'parent' ? C.slate : C.white);
          console.log(`    ${color}${item.name}${C.reset}`);
        }
      });

      console.log(`${C.darkDivider}${thinBar}${C.reset}`);
      console.log(`  ${C.voltBold}[↑/↓]${C.reset} ${C.white}Navigate${C.reset}   ${C.voltBold}[Enter]${C.reset} ${C.white}Open Folder${C.reset}    ${C.voltBold}[Space]${C.reset} ${C.white}Select This Folder${C.reset}`);
      console.log(`  ${C.voltBold}[T]${C.reset}   ${C.white}Type Path${C.reset}  ${C.voltBold}[Backspace]${C.reset} ${C.white}Up${C.reset}         ${C.voltBold}[Esc]${C.reset} ${C.white}Cancel${C.reset}`);
      console.log(`${C.voltBold}${thickBar}${C.reset}`);
    }

    renderNav();

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

        if (key.name === 'up') {
          if (items.length > 0) {
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            renderNav();
          }
        } else if (key.name === 'down') {
          if (items.length > 0) {
            selectedIndex = (selectedIndex + 1) % items.length;
            renderNav();
          }
        } else if (key.name === 'return') {
          if (items.length === 0) return;
          const item = items[selectedIndex];
          if (!item) return;
          if (item.type === 'select_current') {
            cleanup();
            resolve(item.fullPath);
            return;
          } else if (item.type === 'parent' || item.type === 'dir') {
            currentDir = item.fullPath;
            items = getItems();
            selectedIndex = 0;
            renderNav();
          }
        } else if (key.name === 'space' || key.name === 's') {
          cleanup();
          resolve(currentDir);
          return;
        } else if (key.name === 'backspace' || key.name === 'left') {
          const parentDir = path.dirname(currentDir);
          if (parentDir && parentDir !== currentDir) {
            currentDir = parentDir;
            items = getItems();
            selectedIndex = 0;
            renderNav();
          }
        } else if (key.name === 't') {
          isTypingPath = true;
          typedPath = '';
          renderNav();
        } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
          cleanup();
          resolve(null);
        }
      } catch (e) {
        errorMessage = e.message;
        renderNav();
      }
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onNavKey);
      isNavigatingFolders = false;
    }

    process.stdin.on('keypress', onNavKey);
  });
}

function renderDashboard() {
  if (isNavigatingFolders || isEstablishingTunnel) return;

  // Clear terminal
  process.stdout.write('\x1b[2J\x1b[0f');

  const width = 72;
  const bar = '─'.repeat(width);

  // 1. Full Bridge ASCII Emblem at top
  renderAsciiHeader(`${C.voltBold}● STATUS: ONLINE${C.reset}`);

  // 2. Complete Live Screen Details
  console.log(`  ${C.bgVolt} PROJECT ${C.reset}   ${C.whiteBold}${activeProjectDir || '(None selected)'}${C.reset}`);
  console.log(`  ${C.bgVolt} JAILED ${C.reset}    ${C.voltBold}STRICTLY ENFORCED${C.reset} ${C.slate}(Zero access outside folder)${C.reset}`);
  
  if (mcpTunnelUrl) {
    console.log(`  ${C.bgVolt} MCP URL ${C.reset}   ${C.cyanBold}${mcpTunnelUrl}/mcp${C.reset}`);
  } else {
    console.log(`  ${C.bgVolt} MCP URL ${C.reset}   ${C.slate}Establishing secure tunnel...${C.reset}`);
  }

  console.log(`${C.darkDivider}${bar}${C.reset}`);

  if (flashNotification) {
    console.log(`  ${flashNotification}`);
    console.log(`${C.darkDivider}${bar}${C.reset}`);
  }

  // Keyboard Shortcuts
  console.log(`  ${C.voltBold}KEYBOARD ACTIONS:${C.reset}`);
  console.log(`  ${C.voltBold}[C]${C.reset} ${C.white}Copy MCP URL${C.reset}          ${C.voltBold}[D]${C.reset} ${C.white}Browse & Switch Project Folder${C.reset}`);
  console.log(`  ${C.voltBold}[L]${C.reset} ${C.white}Live Activity Logs (${showLiveLogs ? C.voltBold + 'ON' : C.slate + 'OFF'}${C.white})${C.reset}   ${C.voltBold}[Q]${C.reset} ${C.white}Stop Server & Exit${C.reset}`);

  console.log(`${C.voltBold}${thickBar}${C.reset}`);

  if (showLiveLogs) {
    console.log(`  ${C.voltBold}LIVE HARNESS TRAFFIC & ACTIVITY LOGS:${C.reset}`);
    const logsToShow = recentLogs.slice(-6);
    if (logsToShow.length === 0) {
      console.log(`  ${C.slate}(Waiting for AI requests from Gemini, Claude, or ChatGPT...)${C.reset}`);
    } else {
      logsToShow.forEach(log => console.log(`  ${log}`));
    }
    console.log(`${C.darkDivider}${bar}${C.reset}`);
  } else {
    console.log(`  ${C.slate}Supported:${C.reset} ${C.white}Google Gemini${C.reset} ${C.darkDivider}•${C.reset} ${C.white}Claude Web / Desktop${C.reset} ${C.darkDivider}•${C.reset} ${C.white}ChatGPT Custom Tools${C.reset}`);
  }
}

async function startBridge() {
  // Ensure readline keypress setup
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Step 1: Initial Centered Bridge Crossing Animation (when launching via .bat)
  if (isLaunchFromBat) {
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

  // Step 3: Free Port 3000
  freePort(3000);

  // Step 4: Start MCP Server in background
  serverProcess = spawn('node', [serverScript, activeProjectDir, '--http', '3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  serverProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(l => {
      recentLogs.push(`${C.slate}[${new Date().toLocaleTimeString()}]${C.reset} ${l}`);
      if (recentLogs.length > 50) recentLogs.shift();
    });
    if (showLiveLogs && !isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
  });

  // Step 5: Start Cloudflare Tunnel
  isEstablishingTunnel = true;
  const activeCloudflaredBin = await ensureCloudflaredBinary();
  tunnelProcess = spawn(activeCloudflaredBin, ['tunnel', '--url', 'http://localhost:3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  const extractUrl = (text) => {
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !mcpTunnelUrl) {
      mcpTunnelUrl = match[0];
      const fullUrl = `${mcpTunnelUrl}/mcp`;
      copyToClipboard(fullUrl);
      setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}MCP URL loaded into your clipboard! (Ctrl + V to paste)${C.reset}`);
      if (!isNavigatingFolders && !isEstablishingTunnel) renderDashboard();
    }
  };

  tunnelProcess.stdout.on('data', chunk => extractUrl(chunk.toString()));
  tunnelProcess.stderr.on('data', chunk => extractUrl(chunk.toString()));

  // Step 6: Full Quantum Tunnel Creation Animation (directly replaces the tunnel creation wait time!)
  await playTunnelCreationAnimation(() => mcpTunnelUrl, 2500, 20000);
  isEstablishingTunnel = false;

  // Step 7: Smooth Load of Live Dashboard
  renderDashboard();

  // Step 8: Dashboard Keypress Listener
  process.stdin.on('keypress', async (str, key) => {
    try {
      if (isNavigatingFolders || isEstablishingTunnel || !key) return;

      const keyName = (key.name || str || '').toLowerCase();

      if ((key.ctrl && key.name === 'c') || keyName === 'q') {
        cleanupAndExit();
        return;
      }

      if (keyName === 'c') {
        if (mcpTunnelUrl) {
          copyToClipboard(`${mcpTunnelUrl}/mcp`);
          setFlash(`  ${C.voltBold}● [COPIED]${C.reset} ${C.white}MCP URL copied to clipboard: ${C.cyanBold}${mcpTunnelUrl}/mcp${C.reset}`);
        } else {
          setFlash(`  ${C.slate}● [WAIT]${C.reset} ${C.white}Tunnel is still establishing... please wait.${C.reset}`);
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
      }
    } catch (err) {
      // Prevent any crash from closing the CLI
      setFlash(`  ${C.redBold}● [NOTE]${C.reset} ${C.white}${err.message}${C.reset}`);
    }
  });

  renderDashboard();
}

function cleanupAndExit() {
  process.stdout.write('\n\n' + C.voltBold + 'Stopping Bridge and releasing ports...' + C.reset + '\n');
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
  }
  if (tunnelProcess) {
    try { tunnelProcess.kill(); } catch (e) {}
  }
  freePort(3000);
  console.log(C.voltBold + '● [STOPPED] Bridge stopped cleanly. Goodbye!\n' + C.reset);
  process.exit(0);
}

process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

process.on('uncaughtException', (err) => {
  console.error('\n' + C.redBold + '● [UNCAUGHT ERROR] ' + C.reset + err.message + '\n' + (err.stack || ''));
});

process.on('unhandledRejection', (reason) => {
  console.error('\n' + C.redBold + '● [UNHANDLED REJECTION] ' + C.reset + reason);
});

startBridge();
