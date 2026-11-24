'use strict';

// Context compaction for chat-based LLMs that drive Bridge.
//
// Bridge cannot see or shrink the chat history of a cloud LLM, but it does see every
// tool call and result that flows into that chat. This module:
//   1. Meters the tool traffic (arguments + results) as an estimate of how much of the
//      model's context Bridge has filled.
//   2. When the meter crosses a threshold, returns a short notice that the server appends
//      to the tool result, asking the model to call `compact_context`.
//   3. `compact` stores a checkpoint: the model's own summary plus facts Bridge collects
//      itself (plan, files changed, commands run, running jobs, git status). The meter resets.
//   4. `resume` returns the latest checkpoint so a fresh chat can continue the work.
//
// Checkpoints live outside the project: ~/.bridge/context/<project-hash>/<id>.md
// (override the base folder with BRIDGE_CONTEXT_DIR).

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const CHARS_PER_TOKEN = 4;
const WARN_RATIO = 0.6;
const URGENT_RATIO = 0.85;
const URGENT_REPEAT_EVERY = 5; // calls between repeated urgent notices
const MAX_CHECKPOINTS = 20;
const MAX_SUMMARY_CHARS = 20000;
const MAX_LIST_ITEMS = 60;
const MAX_COMMANDS = 15;

const WRITE_TOOLS = new Set([
  'write', 'write_file', 'edit', 'edit_file', 'str_replace_editor',
  'write_files', 'write_multiple_files', 'delete_file', 'revert_file'
]);
const COMMAND_TOOLS = new Set(['execute_command', 'bash', 'pwsh']);

function estimateTokens(text) {
  return Math.ceil(String(text || '').length / CHARS_PER_TOKEN);
}

function clip(text, max) {
  const s = String(text == null ? '' : text);
  return s.length > max ? s.slice(0, max) + `\n…(truncated, ${s.length - max} more chars)` : s;
}

function toList(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/\r?\n/).map(s => s.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
  return [];
}

function newCheckpointId(now) {
  // Sortable, filename-safe: 20261123T101500Z-ab12
  const stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${stamp}-${crypto.randomBytes(2).toString('hex')}`;
}

function createContextCompactor(options = {}) {
  const getRoot = options.getRoot || (() => process.cwd());
  const getPlan = options.getPlan || (() => []);
  const getJobs = options.getJobs || (() => []);
  const now = options.now || (() => Date.now());
  const baseDir = options.storeDir || process.env.BRIDGE_CONTEXT_DIR || path.join(os.homedir(), '.bridge', 'context');

  const envBudget = parseInt(process.env.BRIDGE_CONTEXT_BUDGET, 10);
  let budgetTokens = Number.isFinite(options.budgetTokens) ? options.budgetTokens
    : Number.isFinite(envBudget) ? envBudget : 100000;
  const envIdle = parseInt(process.env.BRIDGE_CONTEXT_IDLE_RESET_MIN, 10);
  const idleResetMs = (Number.isFinite(options.idleResetMinutes) ? options.idleResetMinutes
    : Number.isFinite(envIdle) ? envIdle : 60) * 60000;

  const meter = { tokens: 0, calls: 0, lastCallAt: 0, warned: false, urgentAtCall: 0, sinceCheckpoint: null };
  const touchedByRoot = new Map(); // root -> Map(relPath -> last op)
  const commands = []; // { command, ok, at }

  function storeDir() {
    const root = getRoot();
    const hash = crypto.createHash('sha256').update(String(root).toLowerCase()).digest('hex').slice(0, 16);
    return path.join(baseDir, hash);
  }

  function resetMeter() {
    meter.tokens = 0;
    meter.calls = 0;
    meter.warned = false;
    meter.urgentAtCall = 0;
  }

  function touched() {
    const root = getRoot();
    if (!touchedByRoot.has(root)) touchedByRoot.set(root, new Map());
    return touchedByRoot.get(root);
  }

  function recordFiles(name, args) {
    if (!WRITE_TOOLS.has(name)) return;
    if (name === 'str_replace_editor' && args.command === 'view') return;
    const op = name === 'delete_file' ? 'deleted' : name === 'revert_file' ? 'reverted' : 'written';
    const paths = (name === 'write_files' || name === 'write_multiple_files')
      ? (Array.isArray(args.files) ? args.files.map(f => f && (f.path || f.file_path)) : [])
      : [args.path || args.file_path];
    for (const p of paths) {
      if (typeof p === 'string' && p) {
        const map = touched();
        map.delete(p); // keep most recent last
        map.set(p, op);
      }
    }
  }

  function recordCommand(name, args, ok) {
    let command = null;
    if (COMMAND_TOOLS.has(name)) command = args.command;
    else if (name === 'manage_background_job' && args.action === 'start') command = `[background] ${args.command}`;
    if (typeof command !== 'string' || !command) return;
    commands.push({ command: clip(command, 300), ok, at: now() });
    while (commands.length > MAX_COMMANDS) commands.shift();
  }

  function usage() {
    return {
      tokens: meter.tokens,
      budget: budgetTokens,
      ratio: budgetTokens > 0 ? meter.tokens / budgetTokens : 0,
      calls: meter.calls
    };
  }

  function noticeFor() {
    if (!(budgetTokens > 0)) return '';
    const { ratio, tokens } = usage();
    const pct = Math.round(ratio * 100);
    if (ratio >= URGENT_RATIO) {
      if (meter.urgentAtCall && meter.calls - meter.urgentAtCall < URGENT_REPEAT_EVERY) return '';
      meter.urgentAtCall = meter.calls;
      return `\n\n[Bridge context notice: URGENT] About ${tokens} tokens of tool traffic (~${pct}% of the ${budgetTokens}-token budget) are in this chat. ` +
        'Before doing anything else, call `compact_context` with a summary of the goal, decisions made, progress, and next steps. ' +
        'Then tell the user they can start a new chat and call `resume_context` to continue with a clean context.';
    }
    if (ratio >= WARN_RATIO && !meter.warned) {
      meter.warned = true;
      return `\n\n[Bridge context notice] About ${tokens} tokens of tool traffic (~${pct}% of the ${budgetTokens}-token budget) are in this chat. ` +
        'At the next natural stopping point, call `compact_context` to save a checkpoint. Prefer targeted reads (search_files, line ranges) over re-reading whole files.';
    }
    return '';
  }

  // Called after every tools/call. Returns text to append to the result ('' for none).
  function recordCall(name, args, resultText, isError) {
    args = args || {};
    const t = now();
    if (idleResetMs > 0 && meter.lastCallAt && t - meter.lastCallAt > idleResetMs) resetMeter(); // likely a new chat
    meter.lastCallAt = t;
    meter.calls += 1;
    let argText = '';
    try { argText = JSON.stringify(args); } catch (e) {}
    meter.tokens += estimateTokens(argText) + estimateTokens(resultText);
    if (!isError) recordFiles(name, args);
    recordCommand(name, args, !isError);
    if (name === 'compact_context' || name === 'resume_context') return '';
    return noticeFor();
  }

  function gitStatus(root) {
    try {
      const out = execFileSync('git', ['status', '--short', '--branch'], {
        cwd: root, timeout: 3000, encoding: 'utf-8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']
      });
      const lines = out.split(/\r?\n/).filter(Boolean);
      return lines.length > 40 ? [...lines.slice(0, 40), `… ${lines.length - 40} more`] : lines;
    } catch (e) {
      return null; // not a git repo or git missing
    }
  }

  function section(title, lines) {
    return lines && lines.length ? `## ${title}\n${lines.map(l => `- ${l}`).join('\n')}\n` : '';
  }

  function buildCheckpoint(id, input) {
    const root = getRoot();
    const plan = (getPlan() || []).map(p => `[${p.completed ? 'x' : ' '}] ${p.id}. ${p.task}`);
    const files = Array.from(touched().entries()).slice(-MAX_LIST_ITEMS).map(([p, op]) => `${p} (${op})`);
    const cmds = commands.map(c => `${c.ok ? 'ok' : 'failed'}: ${c.command}`);
    const jobs = (getJobs() || []).map(j => `#${j.id} [${j.status}] ${j.command}`);
    const git = gitStatus(root);

    let md = `# Bridge context checkpoint ${id}\n\n`;
    md += `- Created: ${new Date(now()).toISOString()}\n`;
    md += `- Project: ${root}\n`;
    if (input.title) md += `- Title: ${clip(input.title, 200)}\n`;
    md += `- Tool traffic before compaction: ~${meter.tokens} tokens over ${meter.calls} calls\n\n`;
    md += `## Summary\n${clip(input.summary, MAX_SUMMARY_CHARS).trim()}\n\n`;
    md += section('Next steps', toList(input.next_steps).slice(0, MAX_LIST_ITEMS));
    md += section('Open questions', toList(input.open_questions).slice(0, MAX_LIST_ITEMS));
    md += section('Key files', toList(input.key_files).slice(0, MAX_LIST_ITEMS));
    md += `\n---\n_Collected by Bridge_\n\n`;
    md += section('Plan', plan) || '## Plan\n- (no plan set)\n';
    md += section('Files changed through Bridge this session', files) || '## Files changed through Bridge this session\n- (none)\n';
    md += section('Recent commands', cmds);
    md += section('Background jobs', jobs);
    if (git) md += `## git status\n\`\`\`\n${git.join('\n') || '(clean)'}\n\`\`\`\n`;
    return md;
  }

  function listCheckpoints() {
    const dir = storeDir();
    try {
      return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3)).sort();
    } catch (e) {
      return [];
    }
  }

  function prune() {
    const ids = listCheckpoints();
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_CHECKPOINTS))) {
      try { fs.unlinkSync(path.join(storeDir(), `${id}.md`)); } catch (e) {}
    }
  }

  function compact(input = {}) {
    const summary = typeof input.summary === 'string' ? input.summary.trim() : '';
    if (summary.length < 20) {
      throw new Error('summary is required: describe the goal, key decisions, what is done, and what is left (at least a few sentences).');
    }
    const id = newCheckpointId(now());
    const md = buildCheckpoint(id, { ...input, summary });
    const dir = storeDir();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.md`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, md, 'utf-8');
    fs.renameSync(tmp, file);
    prune();
    const before = meter.tokens;
    resetMeter();
    meter.sinceCheckpoint = id;
    return `Context compacted. Checkpoint ${id} saved (${before} tokens of tool traffic summarized).\n\n` +
      'From now on, treat the checkpoint below as the source of truth for earlier work; do not re-read files you have already summarized unless you need exact contents. ' +
      'If this chat is getting slow or long, tell the user to open a new chat and call `resume_context` to continue from this checkpoint.\n\n' + md;
  }

  function resume(input = {}) {
    const ids = listCheckpoints();
    if (input.list) {
      if (!ids.length) return `No checkpoints saved for ${getRoot()}.`;
      return `Checkpoints for ${getRoot()} (newest last):\n` + ids.map(id => `- ${id}`).join('\n') +
        `\n\nCurrent tool traffic in this chat: ~${meter.tokens}/${budgetTokens} tokens.`;
    }
    const id = input.checkpoint_id || ids[ids.length - 1];
    if (!id) return `No checkpoints saved for ${getRoot()} yet. Start fresh; call compact_context later to save one.`;
    if (!/^[0-9A-Za-z-]+$/.test(id)) throw new Error('Invalid checkpoint_id.');
    let md;
    try {
      md = fs.readFileSync(path.join(storeDir(), `${id}.md`), 'utf-8');
    } catch (e) {
      throw new Error(`Checkpoint ${id} not found. Call resume_context with list=true to see saved checkpoints.`);
    }
    resetMeter();
    meter.sinceCheckpoint = id;
    return `Resuming from checkpoint ${id}. Continue the work from "Next steps"; verify the current state (git_status, read only the files you need) before editing.\n\n` + md;
  }

  return {
    recordCall,
    compact,
    resume,
    usage,
    listCheckpoints,
    setBudget(tokens) { if (Number.isFinite(tokens) && tokens >= 0) budgetTokens = tokens; },
    get storeDir() { return storeDir(); }
  };
}

module.exports = { createContextCompactor, estimateTokens };
