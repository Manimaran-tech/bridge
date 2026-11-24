# Bridge Remotion Video Specification & Storyboard

This directory contains the complete creative direction, scene breakdown, storyboard, SVG assets, and mockup data for the **Bridge** 90-second Remotion promotional video (2700 frames @ 30fps, 1080x1920 9:16 vertical reel).

---

## 📁 Directory Structure

```text
video-spec/
├── storyboard.json                 # Complete Remotion specification (timing, frame ranges, audio/SFX cues, visual layouts)
├── mockup-data.json                # Realistic code snippets, terminal lines, JSON-RPC traffic, chat dialogues, diffs
├── README.md                       # Comprehensive creative and technical guide
└── assets/
    ├── bridge-logo.svg             # Main wide Bridge brand logo with suspension bridge wireframe & typography
    ├── bridge-icon.svg             # Square 512x512 app & brand icon with glowing bridge emblem
    ├── architecture-diagram.svg    # System architecture diagram (Local Workspace <-> Cloudflare <-> Web AI)
    ├── mcp-modal.svg               # Web AI Custom MCP Server configuration modal mockup
    ├── permission-dialog.svg       # Security permission authorization dialog with glowing [Allow] button
    ├── ui-icons.svg                # Common vector symbols (clipboard, check, error, shield, lightning, terminal, star)
    ├── claude-icon.svg             # Anthropic Claude icon
    ├── chatgpt-icon.svg            # OpenAI ChatGPT icon
    ├── gemini-icon.svg             # Google Gemini sparkle icon
    ├── deepseek-icon.svg           # DeepSeek harness icon
    └── cloudflare-icon.svg         # Cloudflare cloud and tunnel icon
```

---

## ⏱️ Video Timing Breakdown (90s / 2700 Frames @ 30 FPS)

| Scene | Time Range | Frame Range | Duration | Title & Theme |
| :--- | :--- | :--- | :--- | :--- |
| **Scene 1** | `00:00 - 00:20` | `0 - 600` | 600 frames (20s) | **Hook & The Copy-Paste Hell**: File upload to web AI, hallucinated code, copy-paste loop, terminal crash, kinetic text slam ("STOP COPY-PASTING CODE!"). |
| **Scene 2** | `00:20 - 00:35` | `600 - 1050` | 450 frames (15s) | **The Solution — Meet Bridge**: Bass drop transition into LN4 Volt (#D2FF00), 3D suspension wireframe reveal, architecture flow, install command (`npm i -g @markmayandi/bridge`). |
| **Scene 3** | `00:35 - 00:50` | `1050 - 1500` | 450 frames (15s) | **Terminal Magic & Instant Tunnel**: Running `bridge .`, ASCII wireframe animation, Cloudflare Anycast HTTPS tunnel allocation, auto-clipboard copy notification, interactive keyboard controls (`[C]`, `[D]`, `[L]`, `[Q]`). |
| **Scene 4** | `00:50 - 01:10` | `1500 - 2100` | 600 frames (20s) | **Web Chat Connection & Permission Prompt**: Opening Web AI Custom MCP modal, pasting URL, instant green connection, `@bridge` chat invocation, enterprise permission prompt, clicking `[Allow for Session]`. |
| **Scene 5** | `01:10 - 01:30` | `2100 - 2700` | 600 frames (20s) | **Live Execution, Test Victory & Viral CTA**: Live dual-pane execution, terminal JSON-RPC traffic streaming, local file diff patching, all 14 tests passing (`✔ 14 passing [320ms]`), viral CTA cards (`npx @markmayandi/bridge` & GitHub star). |

---

## 🎨 Design System & LN4 Volt Aesthetics

- **Primary Accent**: Fluorescent Volt Green `#D2FF00` (RGB: 210, 255, 0)
- **Secondary Accent**: Electric Cyan `#50C8FF` (Cloudflare tunnel & Web AI)
- **Background**: Deep Charcoal Obsidian `#0B0C0E`
- **Card Surfaces**: Sleek Graphite `#141720` / `#1C202C`
- **Error**: High-Contrast Red `#EF4444`
- **Success**: Emerald Green `#10B981`
- **Typography**: 
  - Monospace: `JetBrains Mono, Fira Code, Consolas, monospace`
  - Display: `Inter, -apple-system, sans-serif` (weight 700 to 900)

---

## 🚀 How Builder (@builder) Should Consume These Files

1. Use `video-spec/storyboard.json` as the single source of truth for scene lengths, sequence frames, typography spring constants, and audio cue timing.
2. Import SVGs from `video-spec/assets/` into Remotion components or render them via SVG tags / image sources.
3. Import `video-spec/mockup-data.json` for all terminal text lines, code blocks, JSON-RPC streaming records, and dialog strings.
