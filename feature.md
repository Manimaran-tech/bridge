# Feature: Overview Panel (`[S]` ≡) — Review, Files, Terminals, Help

Status: proposed · Target: Bridge v1.2.0 · Files: `bridge.js`, `secure-folder-mcp/server.js`

## 1. Why

Bridge lets a cloud LLM (Claude Web, ChatGPT, Gemini, DeepSeek) edit files and run
commands on the user's machine through MCP. Today the user only sees a scrolling
log (`[L]`). They cannot easily answer:

- What code did the AI actually change? (diff, +added / −removed)
- Did the files it claims to have created really exist on disk?
- Which commands/scripts did it run, which are still running, and how do I stop one?

Desktop agents (Claude Code desktop "Overview" menu, Antigravity agent manager)
answer these with a side panel. This feature adds the same thing to Bridge's TUI.

## 2. Entry point

- New key on the main dashboard: **`[S]` ≡ Overview**. Add it to `keyItems` in
  `renderDashboard()` (`bridge.js`) between `[M]` and `[Q]`:
  `[S] ≡ Overview`
- `[S]` opens a dropdown menu drawn at the top-right of the dashboard (like the
  reference screenshot):

```
                                   ┌─ Overview ─────────────────── ⋮ ┐
                                   │ ▸ [R] Review      +152  −14     │
                                   │   [F] Files       3 new · 5 mod │
                                   │   [T] Terminals   2 running     │
                                   │   [H] Help                      │
                                   └─────────────────────────────────┘
```

- Counts update live while the menu is open.
- Navigation inside the menu: `↑/↓` move, `Enter` opens, letter key opens directly,
  `Esc` or `[S]` closes.
- On narrow terminals (< 60 cols) the menu becomes full-width at the top.

### Key scoping (important)

`[T]` and `[D]` are already used on the main dashboard (`[T]` = copy token).
The letters `R / F / T / H` are **only active while the Overview menu or one of its
views is open**. On the main dashboard `[T]` keeps copying the token. Implement this
with a view-state machine, not by changing existing bindings:

```
dashboard ──S──▶ overviewMenu ──R──▶ reviewView
                      │       ──F──▶ filesView
                      │       ──T──▶ terminalsView ──Enter──▶ terminalAttach
                      │       ──H──▶ helpView
                      └──Esc──▶ dashboard
any view ──Esc──▶ overviewMenu (terminalAttach: see §6)
```

Add `let overviewView = null; // null | 'menu' | 'review' | 'files' | 'terminals' | 'attach' | 'help'`
next to `choosingMode` / `confirmingExit`, and handle it at the top of the
dashboard `keypress` listener (same pattern as `choosingMode`). Approval prompts
(`approvalQueue`) must still win: if an approval arrives while a view is open, show
the approval banner on top and keep `Y/N` working.

## 3. Data source: server → bridge IPC events

`server.js` runs as a child of `bridge.js` with an `ipc` channel (see
`startServerProcess()`), already used for approvals. Add one event type,
`activity`, sent with `process.send` only when `process.send` exists (stdio /
Docker runs have no IPC — must not crash).

```js
// server.js
function emitActivity(evt) {
  if (typeof process.send !== 'function') return;
  try { process.send({ type: 'activity', ts: Date.now(), ...evt }); } catch (e) {}
}
```

Events:

| `kind` | When | Fields |
|---|---|---|
| `file-change` | after every successful write/edit/str_replace/write_files/revert/delete | `op: 'create'\|'modify'\|'delete'\|'revert'`, `path` (relative to root), `added`, `removed`, `tool` |
| `cmd-start` | `execute_command`, `bash`, `pwsh`, `manage_background_job start` | `id`, `command`, `cwd`, `background: bool`, `pid` |
| `cmd-output` | stdout/stderr chunk | `id`, `stream: 'out'\|'err'`, `chunk` (≤ 8 KB, already-decoded string) |
| `cmd-exit` | process exit / error / stopped | `id`, `code`, `signal`, `status` |
| `project-changed` | root folder switched | `root` |

Commands from bridge → server (over the same IPC):

| `type` | Effect |
|---|---|
| `job-stop` `{id}` | `killProcessTree` on that process; emit `cmd-exit` with `status:'stopped'` |
| `job-input` `{id, data}` | write `data` to the process stdin (only if stdin is a pipe and still open) |
| `snapshot-request` | server replies `{type:'snapshot', files:[...], commands:[...]}` so the panel can rebuild after bridge reconnects |

Rules:
- Foreground commands (`execute_command`, `bash`, `pwsh`) must also get a stable
  `id` and stream output, so they appear in Terminals while they run.
- Background jobs keep their existing numeric job id; use `job-<n>` for jobs and
  `cmd-<n>` for foreground commands.
- Spawned processes must use `stdio: ['pipe','pipe','pipe']` so `job-input` works.
  Do not change any safety check: `enforceCommandPolicy`, `gate`, approval modes,
  and sandbox rules stay exactly as they are. Input typed by the user into an
  attached terminal is the **user's** input, not the LLM's, so it is not gated.
- Line counts (`added`/`removed`) come from a simple line diff between the
  pre-write snapshot (`saveSnapshot` already stores it) and the new content. For
  new files `removed = 0`. Cap diff work at 2 MB per file; above that send
  `added: null` and show `~` in the UI.

## 4. `[R]` Review — code changed by the LLM

Bridge keeps, per session (since Bridge start or last folder switch), a
`changeLog: Map<path, {op, added, removed, firstBefore, lastAfter, tools[], times[]}>`.
`firstBefore` = content before the AI first touched the file in this session
(null for creates), `lastAfter` = current content (read lazily from disk).

Layout:

```
 REVIEW  +152 −14  · 6 files                                       [Esc] back
 ─────────────────────────────────────────────────────────────────────────────
 ▸ M src/app.js                 +40  −8
   A src/utils/date.js          +72
   M README.md                  +12  −6
   D old/legacy.js                   −0  (in Bridge trash)
 ─────────────────────────────────────────────────────────────────────────────
  12 │   const x = 1;
  13 │ - const y = 2;
  13 │ + const y = computeY();
```

- Left list `↑/↓`; `Enter` or `→` focuses the diff pane; `←` back to list.
- Diff pane: unified diff of `firstBefore` vs current disk content, green `+`,
  red `-`, slate context, line numbers, `PgUp/PgDn`, `g/G` top/bottom.
- `[U]` undo the selected file's last AI change (reuses `revert_file` logic via a
  new IPC `revert-request {path}`); asks `Y/N` first.
- `[O]` open file in the OS default editor (`code`, else `start`/`open`/`xdg-open`).
- If disk content differs from `lastAfter` (user edited it after the AI), show a
  `(edited outside)` tag.
- Totals in header and in the Overview menu = sum over the session.

## 5. `[F]` Files — confirm files exist

Tree of the project root, filtered by default to files the AI touched, with a
toggle for the whole tree.

```
 FILES  root: C:\code\my-app     [A] all files: OFF   [Esc] back
 ─────────────────────────────────────────────────────────────
 ▾ src/
   ▸ ✔ app.js            modified  2m ago   4.1 KB
     ✔ utils/date.js     created   1m ago   1.9 KB
 ✘ dist/bundle.js        claimed created — NOT ON DISK
   🗑 old/legacy.js       deleted (in trash)
```

- Status is verified with `fs.statSync` when the view opens and on every
  `file-change` event — this is the "did it really create the file" check.
  `✔` exists, `✘` missing, `🗑` deleted/trashed. Use plain ASCII fallbacks
  (`OK`, `X`, `DEL`) when `process.env.TERM === 'dumb'` or on legacy Windows
  console without UTF-8.
- `↑/↓` move, `→` expand dir / `←` collapse, `Enter` on a file opens it in the
  Review diff, `[A]` toggles all files vs touched only, `[O]` open in editor.
- Respect the server's sandbox rules: never list outside root; skip
  `node_modules`, `.git`, and sensitive names (`isSensitiveName`) in "all" mode.
- Tree walk is lazy (expand on demand) and capped at 2,000 entries per directory.

## 6. `[T]` Terminals — running scripts, take over, tabs

### List view

```
 TERMINALS  2 running · 3 finished                         [Esc] back
 ──────────────────────────────────────────────────────────────────
 ▸ ● job-1   npm run dev                 running   4m12s   pid 8812
   ● cmd-7   pytest -q                   running     18s   pid 9120
   ✔ cmd-6   npm install                 exit 0      41s
   ✘ cmd-5   node build.js               exit 1       3s
   ■ job-0   python server.py            stopped
```

- `↑/↓` select, `Enter` attach (take over), `[X]` stop (asks `Y/N`, sends
  `job-stop`), `[C]` clear finished from list.
- Keep the last 200 lines of output per process in Bridge memory (ring buffer),
  plus up to 50 finished processes.

### Attach view ("take over the terminal") with Chrome-style tabs

Pressing `Enter` on a process attaches it full-screen: its output fills the
screen and live-streams. Attaching another process adds a tab instead of
replacing — tabs behave like Chrome tabs.

```
 ┌ ● npm run dev ┐┌ pytest -q ┐┌ ✘ node build.js ┐                     [■ Stop]
 ┘               └────────────────────────────────────────────────────────────
  VITE v5.0  ready in 312 ms
  ➜  Local:   http://localhost:5173/
  ...
 ──────────────────────────────────────────────────────────────────────────────
  Ctrl+←/→ switch tab · Ctrl+W close tab · Ctrl+X stop · Ctrl+] detach · Ctrl+T list
```

- Active tab highlighted (volt), finished tab shows `✔`/`✘`, running shows `●`.
- Tabs persist while Bridge runs; reopening `[T]` → `Enter` on an already-tabbed
  process focuses its tab instead of duplicating.
- **Take over semantics:** while attached, normal keystrokes are forwarded to the
  process stdin (`job-input`), so interactive scripts (prompts, `y/n`, REPLs) work.
  Only the `Ctrl`-chords listed above are intercepted by Bridge. Enter sends `\r\n`
  on Windows, `\n` elsewhere. If the process has no open stdin, show
  `(read-only: process stdin closed)` and do not forward.
- `Ctrl+]` detaches (back to Terminals list, tabs kept). `Esc` is forwarded to the
  process while attached (so vim-like tools work); use `Ctrl+]` to leave.
- `Ctrl+X` = Stop button: confirm `Y/N`, then `job-stop`.
- Output rendering: strip cursor-movement/clear-screen ANSI sequences, keep SGR
  colors; wrap long lines; scroll back with `Shift+↑/↓` / `PgUp/PgDn`; new output
  snaps to bottom unless the user scrolled up (show `↓ new output` hint).
- Approval prompts still interrupt: show the approval banner above the tab bar and
  temporarily capture `Y/N` (not forwarded) until answered.

## 7. `[H]` Help

Static scrollable page listing:

- All shortcuts: main dashboard (`C T D L M S Q`), Overview menu, Review, Files,
  Terminals, Attach (Ctrl-chords).
- Meaning of icons/colors (`●` running, `✔`, `✘`, `■`, `🗑`, `+/-`).
- Approval modes summary (reuse `APPROVAL_MODES` text, do not duplicate strings).
- Safety notes: files are jailed to the project root; harmful commands are always
  blocked; deletes go to Bridge trash; `[U]` uses revert snapshots (limited by
  `MAX_SNAPSHOTS` / `MAX_SNAPSHOT_BYTES`).
- Where logs live and how to report a bug (link to GitHub issues).
- Bridge version + server status.

## 8. Rendering rules

- Reuse existing helpers: `paintFrame`, `fitLine`, `visibleWidth`, `stripAnsi`,
  `middleEllipsis`, `flowItems`, colors in `C`. No new npm dependencies (Bridge
  ships with zero runtime deps — keep it that way).
- Every view must fit the window at any size ≥ 40×12; re-render on `resize`.
- Throttle re-renders from `cmd-output` to at most ~20 fps (50 ms debounce).
- Existing behaviour must not change when the panel is closed: same dashboard,
  same keys, same flash messages, same exit confirmation.
- `Ctrl+C` / `[Q]` while any overview view is open → close the view first; a
  second press goes to the normal exit confirmation. Running processes are killed
  on exit as today (`stopAllJobs`).

## 9. Out of scope

- Mouse/click support (keyboard only for v1; design the state so mouse can be
  added later).
- Real PTY emulation (no `node-pty`); pipe-based take-over only. Full-screen TUIs
  like `vim`/`htop` will render imperfectly — document this in Help.
- Persisting history across Bridge restarts.
- Web UI version of the panel.

## 10. Acceptance criteria

1. `[S]` opens the Overview menu with live `+/-` totals, file counts, running count.
2. After the LLM writes 2 files and edits 1, Review lists all 3 with correct
   `+/-` counts and a correct unified diff.
3. Files view shows `✔` for files that exist; manually deleting one from disk
   flips it to `✘` on next refresh.
4. A background job started by the LLM appears in Terminals within 1 s, streams
   output, and `[X]` stops it (process tree killed, status `stopped`).
5. Attaching two processes shows two tabs; `Ctrl+←/→` switches; typing into an
   interactive script (e.g. `node -e "require('readline').createInterface({input:process.stdin}).question('name? ', a=>{console.log('hi '+a);process.exit()})"`) works.
6. `[H]` lists every shortcut in this document.
7. On main dashboard `[T]` still copies the token; `[C] [D] [L] [M] [Q]` unchanged.
8. Approval requests during any view still appear and `Y/N` still answers them.
9. Server runs with no IPC (stdio mode, Docker) without errors.
10. Existing tests pass: `npm test`, `npm run test:host-binding`,
    `npm run test:docker`. Add `secure-folder-mcp/test_activity.js` (node:test)
    covering activity events: file-change counts, cmd-start/exit, job-stop,
    job-input, and no-IPC safety.
11. README (English + `README_zh.md`) gets a short "Overview panel" section.
