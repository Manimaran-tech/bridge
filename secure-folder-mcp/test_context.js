'use strict';

// Run with Node >=18: node --test secure-folder-mcp/test_context.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, readdir } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const { createContextCompactor } = require('./context-compactor');

const SUMMARY = 'Goal: add a date helper. Done: created src/date.js and wired it into app.js. Left: tests.';

async function tempDirs() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bridge-ctx-root-'));
  const store = await mkdtemp(path.join(os.tmpdir(), 'bridge-ctx-store-'));
  return { root, store, cleanup: () => Promise.all([rm(root, { recursive: true, force: true }), rm(store, { recursive: true, force: true })]) };
}

test('meter warns once, then repeats urgent notices every few calls', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  const c = createContextCompactor({ getRoot: () => root, storeDir: store, budgetTokens: 1000, idleResetMinutes: 0 });

  assert.equal(c.recordCall('read_file', { path: 'a' }, 'x'.repeat(1000), false), ''); // ~25%
  assert.match(c.recordCall('read_file', { path: 'a' }, 'x'.repeat(1600), false), /\[Bridge context notice\]/); // ~65%
  assert.equal(c.recordCall('read_file', { path: 'a' }, 'x', false), ''); // warned already
  assert.match(c.recordCall('read_file', { path: 'a' }, 'x'.repeat(1200), false), /URGENT/); // ~95%
  for (let i = 0; i < 4; i++) assert.equal(c.recordCall('read_file', { path: 'a' }, 'x', false), '');
  assert.match(c.recordCall('read_file', { path: 'a' }, 'x', false), /URGENT/);
});

test('budget 0 disables notices', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  const c = createContextCompactor({ getRoot: () => root, storeDir: store, budgetTokens: 0 });
  assert.equal(c.recordCall('read_file', {}, 'x'.repeat(100000), false), '');
});

test('compact saves a checkpoint with collected facts and resets the meter', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  const c = createContextCompactor({
    getRoot: () => root,
    storeDir: store,
    budgetTokens: 1000,
    getPlan: () => [{ id: 1, task: 'Write helper', completed: true }, { id: 2, task: 'Add tests', completed: false }],
    getJobs: () => [{ id: 3, status: 'running', command: 'npm run dev' }]
  });
  c.recordCall('write_file', { path: 'src/date.js', content: 'x' }, 'Created', false);
  c.recordCall('write_files', { files: [{ path: 'src/a.js' }, { path: 'src/b.js' }] }, 'ok', false);
  c.recordCall('write_file', { path: 'src/failed.js' }, 'Error: denied', true); // errors are not "changed"
  c.recordCall('execute_command', { command: 'npm test' }, 'pass', false);
  c.recordCall('read_file', {}, 'x'.repeat(3000), false);
  assert.ok(c.usage().tokens > 700);

  assert.throws(() => c.compact({ summary: 'short' }), /summary is required/);
  const out = c.compact({ summary: SUMMARY, next_steps: ['Write tests'], key_files: ['src/date.js - helper'] });
  assert.match(out, /Context compacted\. Checkpoint \S+ saved/);
  assert.match(out, /src\/date\.js \(written\)/);
  assert.match(out, /src\/b\.js \(written\)/);
  assert.doesNotMatch(out, /failed\.js/);
  assert.match(out, /\[x\] 1\. Write helper/);
  assert.match(out, /ok: npm test/);
  assert.match(out, /#3 \[running\] npm run dev/);
  assert.match(out, /- Write tests/);
  assert.equal(c.usage().tokens, 0);
  assert.equal(c.listCheckpoints().length, 1);
});

test('resume returns the newest checkpoint, lists, and rejects bad ids', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  let clock = Date.parse('2026-11-23T10:00:00Z');
  const c = createContextCompactor({ getRoot: () => root, storeDir: store, now: () => clock });
  assert.match(c.resume({}), /No checkpoints saved/);
  c.compact({ summary: SUMMARY + ' first' });
  clock += 60000;
  c.compact({ summary: SUMMARY + ' second' });
  const latest = c.resume({});
  assert.match(latest, /Resuming from checkpoint/);
  assert.match(latest, /second/);
  const first = c.listCheckpoints()[0];
  assert.match(c.resume({ checkpoint_id: first }), /first/);
  assert.match(c.resume({ list: true }), new RegExp(first));
  assert.throws(() => c.resume({ checkpoint_id: '../../etc/passwd' }), /Invalid checkpoint_id/);
  assert.throws(() => c.resume({ checkpoint_id: 'nope' }), /not found/);
});

test('checkpoints are kept per project and pruned to 20', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  let current = root;
  let clock = Date.parse('2026-11-23T10:00:00Z');
  const c = createContextCompactor({ getRoot: () => current, storeDir: store, now: () => clock });
  for (let i = 0; i < 23; i++) { clock += 1000; c.compact({ summary: `${SUMMARY} #${i}` }); }
  assert.equal(c.listCheckpoints().length, 20);
  current = path.join(root, 'other');
  assert.equal(c.listCheckpoints().length, 0);
  assert.equal((await readdir(store)).length, 1);
});

test('idle gap resets the meter (new chat heuristic)', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  let clock = 0;
  const c = createContextCompactor({ getRoot: () => root, storeDir: store, idleResetMinutes: 60, now: () => clock });
  clock = 1;
  c.recordCall('read_file', {}, 'x'.repeat(4000), false);
  const before = c.usage().tokens;
  clock += 61 * 60000;
  c.recordCall('read_file', {}, 'x', false);
  assert.ok(c.usage().tokens < before);
});

test('server exposes compact_context / resume_context and appends notices over stdio', async (t) => {
  const { root, store, cleanup } = await tempDirs();
  t.after(cleanup);
  const child = spawn(process.execPath, [path.join(__dirname, 'server.js'), root, '--approval-mode', 'turbo', '--context-budget', '200'], {
    env: { ...process.env, BRIDGE_CONTEXT_DIR: store },
    stdio: ['pipe', 'pipe', 'ignore']
  });
  t.after(() => child.kill());
  const rl = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  rl.on('line', line => {
    let msg;
    try { msg = JSON.parse(line); } catch (e) { return; }
    const resolve = pending.get(msg.id);
    if (resolve) { pending.delete(msg.id); resolve(msg); }
  });
  let nextId = 1;
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), 10000);
    pending.set(id, msg => { clearTimeout(timer); resolve(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result.content[0].text;

  await rpc('initialize', { protocolVersion: '2024-11-05' });
  const { result } = await rpc('tools/list', {});
  const names = result.tools.map(tool => tool.name);
  assert.ok(names.includes('compact_context'));
  assert.ok(names.includes('resume_context'));
  for (const tool of result.tools) {
    for (const hint of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
      assert.equal(typeof tool.annotations[hint], 'boolean', `${tool.name}.${hint}`);
    }
  }

  const written = await call('write_file', { path: 'notes.txt', content: 'y'.repeat(800) });
  assert.match(written, /Created file/);
  assert.match(written, /Bridge context notice: URGENT/); // 800 chars of args > 85% of 200 tokens
  const read = await call('read_file', { path: 'notes.txt' });
  assert.doesNotMatch(read, /Bridge context notice/); // urgent notice is not repeated on the very next call

  const compacted = await call('compact_context', { summary: SUMMARY, next_steps: ['Write tests'] });
  assert.match(compacted, /Context compacted/);
  assert.match(compacted, /notes\.txt \(written\)/);

  const resumed = await call('resume_context', {});
  assert.match(resumed, /Resuming from checkpoint/);

  const prompt = await rpc('prompts/get', { name: 'resume_session' });
  assert.match(prompt.result.messages[0].content.text, /Resuming from checkpoint/);
});
