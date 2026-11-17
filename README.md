<div align="center">

```
  ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗
  ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝
  ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗  
  ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝  
  ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗
  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝
```

# BRIDGE

### Universal Local-to-Web AI Coding Harness

[![npm version](https://img.shields.io/badge/npm-v1.0.0-D2FF00.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@manimaran-tech/bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](https://github.com/Manimaran-tech/bridge)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

**Securely bridge your local codebases and development environments to Google Gemini, Claude, ChatGPT, and DeepSeek in seconds via the Model Context Protocol (MCP).**

---

</div>

## ⚡ 5-Second Quickstart

You don't even need to clone this repository. Run directly via `npx`:

```bash
npx @manimaran-tech/bridge
```

Or install globally to use the `bridge` command anywhere in any terminal:

```bash
npm install -g @manimaran-tech/bridge
```

Then simply enter any directory and run:

```bash
bridge .
```

---

## 🌟 What is Bridge?

Cloud-based LLMs (like Gemini 1.5/2.0, Claude 3.5 Sonnet, ChatGPT 4o, and DeepSeek) can write code, but they cannot read, edit, or test files on your physical computer without dangerous open ports or tedious copy-pasting.

**Bridge** solves this with a high-performance, strictly-sandboxed local daemon that:
1. **Jails the AI** strictly to the directory you choose (zero parent-directory escapes).
2. **Generates an instant public HTTPS tunnel** via Cloudflare's Anycast edge network.
3. **Auto-copies the MCP endpoint** to your clipboard.
4. **Equips the AI with native tools** to inspect files, edit diffs, execute terminal commands, and run tests.

---

## 🚀 Terminal Experience

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗    ╔══════╗          ╔══╗  ╔══╗  
  ██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝    ║ >_ █ ║        ╔═╝  ╚══╝  ╚═╗
  ██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗    ╔╩══════╩═╗     ╔╝   ✦ LLM    ╚╗
  ██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝    ║    ╚════╬═════╬════╝         ║
  ██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗  ╚╗    ╔═══╩═════╩═══╗         ╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝   ╚════╝             ╚═════════╝ 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ● STATUS: ONLINE
────────────────────────────────────────────────────────────────────────────────
   PROJECT    C:\work\my-app
   JAILED     STRICTLY ENFORCED (Zero access outside folder)
   MCP URL    https://connect-edge-quantum.trycloudflare.com/mcp
────────────────────────────────────────────────────────────────────────────────
   ● [COPIED] MCP URL loaded into your clipboard! (Ctrl + V to paste)
────────────────────────────────────────────────────────────────────────────────
  KEYBOARD ACTIONS:
  [C] Copy MCP URL          [D] Browse & Switch Project Folder
  [L] Live Activity Logs (ON)   [Q] Stop Server & Exit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🤖 Connecting Your AI Model

### 1. Google Gemini & Web Apps
Paste the generated URL (`https://xxxx.trycloudflare.com/mcp`) into any MCP-compatible client, extension, or custom integration.

### 2. Claude Desktop (`claude_desktop_config.json`)
Add Bridge as an SSE or local server:
```json
{
  "mcpServers": {
    "local-bridge": {
      "url": "https://xxxx.trycloudflare.com/mcp"
    }
  }
}
```

### 3. DeepSeek V3 / R1 (Coding Harness)
Bridge includes full native tool parity with the DeepSeek Coding Harness:
* `read` — Read files with exact line numbers and slice windows.
* `write` — Create or overwrite files inside the jail.
* `edit` — Precise drop-in search and replace modifications.
* `str_replace_editor` — Token-conserving multi-line diff replacement.
* `pwsh` / `bash` — Execute sandboxed terminal commands, linters, and tests.
* `jobs` — Background job tracking and execution.
* `plan_mode` — Architectural step-by-step thinking scratchpad.

---

## 🔒 Security & Sandboxing Guarantee

| Attack Vector | Bridge Protection |
| :--- | :--- |
| **Path Traversal (`../../etc/passwd`)** | Evaluates canonical `fs.realpathSync`. Access denied if outside root jail. |
| **Symlink Attacks** | Resolves symlink targets. Blocked if target resolves outside boundary. |
| **Port Exposure** | Local server binds strictly to `127.0.0.1`. Public access is authenticated via temporary edge tunnels. |
| **Unintended Modifications** | Real-time traffic monitoring (`[L]`) prints every file read/write to your console. |

---

## ⌨️ Interactive Controls

| Key | Action |
| :--- | :--- |
| **`[C]`** | Re-copies the live MCP tunnel URL to your OS clipboard. |
| **`[D]`** | Launches the in-terminal Directory Navigator to browse and switch project folders on the fly. |
| **`[L]`** | Toggles real-time streaming traffic and AI tool execution logs. |
| **`[Q]`** | Gracefully releases ports, shuts down tunnels, and exits. |

---

## 🛠️ CLI Options

```bash
# Bridge current directory
bridge .

# Bridge a specific directory
bridge /path/to/project

# Launch directly from Windows batch launcher
bridge.bat
```

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with high-contrast LN4 Volt theme by <a href="https://github.com/Manimaran-tech">Manimaran</a>.</sub>
</div>
