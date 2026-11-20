<div align="center">

<img src="./images/bridge_logo.png" alt="Bridge Logo" width="520" />

# Bridge

**Universal Local-to-Web AI Coding Harness**

[![npm version](https://img.shields.io/badge/npm-v1.0.10-D2FF00.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@markmayandi/bridge)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg?style=flat-square)](https://github.com/Manimaran-tech/bridge)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

<p align="center">
  <b>English</b> | <a href="./README_zh.md">简体中文</a>
</p>

<p align="center">
  Securely connect your local codebases and development environments to Claude Web, ChatGPT, Gemini, and DeepSeek in seconds via the Model Context Protocol (MCP).
</p>

---

</div>

## Quickstart

### 1. Instant Execution (Zero Install)

Run directly using `npx`:

```bash
npx @markmayandi/bridge
```

### 2. Global Installation

Install globally to access the `bridge` command anywhere:

```bash
npm install -g @markmayandi/bridge
```

Then navigate to any folder and start:

```bash
bridge .
```

### 3. Clone and Run from Source

To inspect the source, customize, or contribute:

```bash
git clone https://github.com/Manimaran-tech/bridge.git
cd bridge
node bridge.js
```

Or pass a specific project directory directly:

```bash
node bridge.js /path/to/project
```

---

## Universal MCP Connection

Bridge automatically creates an Anycast HTTPS tunnel and copies the live endpoint to your clipboard:

```text
https://xxxx.trycloudflare.com/mcp
```

### Optional: Fixed MCP URL

By default Bridge uses an ephemeral quick tunnel. If you want a stable URL, create a named Cloudflare tunnel and give Bridge its token:

1. In **Cloudflare Zero Trust → Networks → Tunnels**, create a named tunnel and copy its token.
2. Add a **Public Hostname** for that tunnel pointing to `http://localhost:3000`.
3. Run the one-time setup and paste the token plus your public URL:

```bash
bridge setup
# With npx: npx @markmayandi/bridge setup
# Tunnel token: (hidden)
# Public URL: https://mcp.example.com
```

4. Start Bridge normally:

```bash
bridge .
# With npx: npx @markmayandi/bridge .
```

The fixed URL is then `https://mcp.example.com/mcp`, even though the token is stored only for Bridge, in `~/.bridge/config.json` (mode `0600`). Bridge does not read or modify cloudflared's own `~/.cloudflared` configuration. Without a saved token, Bridge keeps using the zero-setup quick tunnel. To return to quick tunnels later, delete `~/.bridge/config.json`.

### Connecting to Any AI Client

Modern web AI clients (Claude Web, ChatGPT Web, Gemini, and MCP extensions) connect directly using the single `/mcp` URL. 

1. Copy your live MCP URL from Bridge (automatically placed in your clipboard on startup).
2. Paste the URL directly into your AI client's MCP or custom tool integration.
3. Your AI model now has real-time, sandboxed read, write, edit, and terminal test execution capabilities on your local project.

No legacy JSON configuration files or manual port forwarding required.

---

## What Bridge Does

Cloud-based AI models cannot safely access files on your physical machine without open ports or copy-pasting code snippets. Bridge solves this with a high-performance local daemon:

* **Strict Directory Jail:** AI operations are strictly restricted to the specified project folder with zero parent-directory traversal.
* **Native Tool Suite:** Exposes native coding tools (`read`, `write`, `edit`, `str_replace_editor`, `pwsh`, `bash`, `jobs`, `plan_mode`).
* **Zero-Setup Anycast Tunnel:** Public HTTPS tunneling powered by Cloudflare with automatic SSL and clipboard sync. Run `bridge setup` once if you prefer a fixed named-tunnel URL.
* **Terminal Dashboard:** Monospaced LN4 Volt interface with live traffic streaming and real-time directory switching.

---

## Security Model

| Security Vector | Implementation |
| :--- | :--- |
| **Authentication & Authorization** | All HTTP and SSE endpoints enforce Bearer authentication (`Authorization: Bearer <token>` or `?token=<token>`). Unauthenticated requests are rejected with `401 Unauthorized`. |
| **Path Traversal Protection** | Evaluates canonical `fs.realpathSync`. Access outside the targeted root jail is immediately blocked. |
| **Symlink Boundary Checks** | Validates symlink resolution. Denies read/write operations targeting locations outside the project folder. |
| **Local Port Isolation** | Local server binds strictly to `127.0.0.1`. Remote traffic routes through secure single-session Anycast tunnels. |
| **Execution Policy & Disablement** | Shell tools (`pwsh`, `bash`, `execute_command`) are protected by safety policies, restricted to root directory, and can be disabled completely with `--disable-shell`. |
| **Live Traffic Audit** | Press `[L]` at any time to stream every incoming JSON-RPC request and tool call in real time. |

---

## Keyboard Controls

| Key | Action |
| :--- | :--- |
| `[C]` | Re-copies the authenticated MCP URL to your clipboard. |
| `[T]` | Copies the Bearer authentication token to your clipboard. |
| `[D]` | Opens the In-Terminal Directory Navigator to switch project folders without restarting. |
| `[L]` | Toggles real-time streaming traffic and tool execution logs. |
| `[Q]` | Gracefully closes the tunnel, releases ports, and exits. |

---

## Acknowledgements & Credits

Bridge builds upon foundational open-source architecture and local daemon patterns inspired by the [DeepSeek](https://github.com/deepseek-ai) harness community. We extend our sincere gratitude to the open-source AI developer ecosystem for advancing local tooling.

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">
  <sub>Maintained by <a href="https://github.com/Manimaran-tech">Manimaran</a></sub>
</div>
