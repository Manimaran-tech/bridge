# Bridge — Remotion Promotional Video Reel

An ultra-modern 90-second (2700 frames @ 30fps, 1080x1920 9:16 vertical reel) product promo video for **Bridge** (`@markmayandi/bridge`) built with Remotion, React 18, and TypeScript.

---

## 🎨 Theme & Aesthetic
- **Color Palette**: High-energy LN4 Volt (`#D2FF00`), Electric Cyan (`#50C8FF`), Deep Obsidian Canvas (`#0B0C0E`), and Slate Card Surfaces (`#141720`).
- **Pacing**: High-retention tech reel with kinetic spring typography, dynamic camera whip cuts, realistic ChatWeb UI mockups (Claude / ChatGPT style), animated terminal ASCII wireframe boot, Cloudflare Anycast tunnel pulses, enterprise security permission authorization dialog, and real-time dual-pane JSON-RPC execution.

---

## ⏱️ Scene Breakdown (90s / 2700 Frames)
1. **Scene 1: Hook & The Copy-Paste Hell** (Frames 0 - 600 / 00:00 - 00:20)
   - File drag from IDE into Web AI chat prompt
   - Half-baked hallucinated code snippet generation and "Copy Code" button click
   - Terminal crash with screen shake (`TypeError: db.users.findOne is not a function`)
   - Kinetic text slam: **"STOP COPY-PASTING CODE."**
2. **Scene 2: The Solution — Meet Bridge** (Frames 600 - 1050 / 00:20 - 00:35)
   - Bass drop transition into LN4 Volt
   - Suspension bridge emblem illumination and brand reveal
   - System architecture flow: Local Files ◄═══ Secure Anycast MCP ═══► Web AI Models (Claude, ChatGPT, Gemini, DeepSeek)
   - Zero-dependency install: `npm i -g @markmayandi/bridge` / `npx @markmayandi/bridge`
3. **Scene 3: Terminal Magic & Instant Tunnel** (Frames 1050 - 1500 / 00:35 - 00:50)
   - Typing `bridge .` in terminal
   - ASCII suspension bridge wireframe boot & charging progress bar (0% to 100%)
   - Instant Cloudflare Anycast HTTPS tunnel allocation: `https://quantum-edge-842.trycloudflare.com/mcp`
   - Floating clipboard notification toast: `✓ [COPIED] MCP URL loaded into your clipboard!`
   - Interactive hotkey dashboard: `[C]` Copy, `[D]` Switch Folder, `[L]` Live Logs, `[Q]` Stop, with Strict Folder Jail badge
4. **Scene 4: Web Chat Connection & Permission Prompt** (Frames 1500 - 2100 / 00:50 - 01:10)
   - Custom MCP server configuration modal in Web AI
   - URL paste & instant green status dot: `● ACTIVE (7 Native Tools Ready)`
   - Chat prompt with neon `@bridge` invocation: `fix the auth token validation bug in server.js and run the test suite`
   - Enterprise security permission prompt with glowing LN4 Volt `[Allow for Session]` button and click
5. **Scene 5: Live Execution, Test Victory & Viral CTA** (Frames 2100 - 2700 / 01:10 - 01:30)
   - Real-time dual-pane execution: Web AI tool calls on top, terminal streaming live JSON-RPC traffic on bottom
   - Atomic code diff patch in volt green
   - Test victory checkmark explosion: `✔ 14 passing (0 failing) [320ms]`
   - Epic outro CTA with 3D glowing Bridge emblem, `npx @markmayandi/bridge`, and GitHub star badge

---

## 🚀 Commands
- **Interactive Preview**: `npm start` or `npx remotion preview src/index.ts`
- **Render Full Video**: `npm run build` (renders `out/video.mp4`)
- **Render Still Frame**: `npx remotion still src/index.ts BridgeVideo out/still.jpeg --frame=<frame_number>`
- **Type Check**: `npx tsc --noEmit`
