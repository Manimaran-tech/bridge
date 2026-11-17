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
  process.stdout.write('\x1b[?25l');
  const startTime = Date.now();
  const logoWidth = 68;
  const barLen = 30;

  while (true) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);

    const termCols = process.stdout.columns || 80;
    const termRows = process.stdout.rows || 25;

    const padLeft = ' '.repeat(Math.max(0, Math.floor((termCols - logoWidth) / 2)));
    const topPad = '\n'.repeat(Math.max(0, Math.floor((termRows - 23) / 2)));

    const out = [];
    if (topPad) out.push(topPad);

    // 1. High-density compact suspension bridge wires and towers (68 cols x 16 rows)
    for (const line of BRIDGE_WIRE_ASCII) {
      out.push(padLeft + line);
    }

    // 2. Vertical gap between bridge and text (2 blank lines)
    out.push('');
    out.push('');

    // 3. Wide-tracked title & subtitle centered
    const titleText = `${C.voltBold}B   R   I   D   G   E${C.reset}`;
    const subTitle = `${C.steel}[LOCAL WORKSPACE] ${C.voltBold}──────━──────${C.cyanBold} [CLOUD AI MODEL]${C.reset}`;
    out.push(' '.repeat(Math.max(0, Math.floor((termCols - 21) / 2))) + titleText);
    out.push(' '.repeat(Math.max(0, Math.floor((termCols - 47) / 2))) + subTitle);
    out.push('');

    // 4. Smooth progress bar loading in < 3 seconds
    const pct = Math.min(100, Math.round(progress * 100));
    const filled = Math.min(barLen, Math.round(progress * barLen));
    const empty = barLen - filled;
    const barStr = C.voltBold + '█'.repeat(filled) + C.steel + '░'.repeat(empty) + C.reset;
    const barPad = ' '.repeat(Math.max(0, Math.floor((termCols - (barLen + 8)) / 2)));
    out.push(`${barPad}[${barStr}]  ${C.voltBold}${pct}%${C.reset}`);

    const statusMsg = progress >= 1.0 ? 'BRIDGE READY' : 'INITIALIZING SECURE ANYCAST TUNNEL...';
    const statusPad = ' '.repeat(Math.max(0, Math.floor((termCols - 36) / 2)));
    out.push(`${statusPad}${C.whiteBold}${statusMsg}${C.reset}`);

    process.stdout.write('\x1b[2J\x1b[0f');
    process.stdout.write(out.join('\n'));

    if (progress >= 1.0) {
      break;
    }

    await new Promise(r => setTimeout(r, 40));
  }

  await new Promise(r => setTimeout(r, 120));
  process.stdout.write('\x1b[?25h');
  process.stdout.write('\x1b[2J\x1b[0f');
}

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
