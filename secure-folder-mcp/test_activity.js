'use strict';

// Run with Node >=18: node --test secure-folder-mcp/test_activity.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const SERVER_PATH = path.join(__dirname, 'server.js');
const TOKEN = 'activity-test-token-123456';

async function freePort() {
  const srv = net.createServer();
  try {
    await new Promise((resolve, reject) => {
      srv.once('error', reject);
      srv.listen(0, '127.0.0.1', resolve);
    });
    return srv.address().port;
  } finally {
    await new Promise(resolve => srv.close(resolve));
  }
}

function callToolHttp(port, name, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1e9),
      method: 'tools/call',
      params: { name, arguments: args }
    });
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${TOKEN}`
      }
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          reject(new Error(`Invalid JSON (${res.statusCode}): ${raw}`));
        }
      });
    });
    req.once('error', reject);
    req.end(body);
  });
}

async function startIpcServer(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bridge-activity-'));
  const port = await freePort();
  const env = { ...process.env, HOME: dir, USERPROFILE: dir };
  delete env.BRIDGE_HOST;

  const child = spawn(process.execPath, [
    SERVER_PATH, dir, '--http', String(port), '--token', TOKEN, '--approval-mode', 'turbo'
  ], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true });

  const messages = [];
  const waiters = [];
  let stderr = '';
  let closed = false;
  const closedPromise = new Promise(resolve => child.once('close', () => { closed = true; resolve(); }));

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('message', (msg) => {
    messages.push(msg);
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred(msg)) {
        const w = waiters.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg);
      }
    }
  });

  t.after(async () => {
    if (!closed) {
      try { child.send({ type: 'shutdown' }); } catch (e) {}
      await Promise.race([closedPromise, delay(2000)]);
      if (!closed) {
        try { child.kill('SIGKILL'); } catch (e) {}
        await Promise.race([closedPromise, delay(2000)]);
      }
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  const deadline = Date.now() + 10000;
  while (!stderr.includes('Bridge MCP listening on ')) {
    assert.ok(!closed, `Server exited early:\n${stderr}`);
    assert.ok(Date.now() < deadline, `Server startup timed out:\n${stderr}`);
    await delay(25);
  }

  function waitForMessage(pred, timeoutMs = 8000, fromIndex = 0) {
    for (let i = fromIndex; i < messages.length; i++) {
      if (pred(messages[i])) return Promise.resolve(messages[i]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex(w => w.timer === timer);
        if (idx !== -1) waiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for IPC message. Received ${messages.length} messages.`));
      }, timeoutMs);
      waiters.push({ pred, resolve, timer });
    });
  }

  return { dir, port, child, messages, waitForMessage };
}

test('file-change activity events report accurate +/- counts, 2MB cap, snapshot, and revert-request', { timeout: 20000 }, async (t) => {
  const { dir, port, child, messages, waitForMessage } = await startIpcServer(t);

  // 1. Create a.txt (3 lines)
  let idx = messages.length;
  const r1 = await callToolHttp(port, 'write_file', { path: 'a.txt', content: 'line1\nline2\nline3\n' });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.result.isError, false);
  const ev1 = await waitForMessage(m => m.type === 'activity' && m.kind === 'file-change' && m.path === 'a.txt', 3000, idx);
  assert.equal(ev1.op, 'create');
  assert.equal(ev1.added, 3);
  assert.equal(ev1.removed, 0);
  assert.equal(ev1.tool, 'write_file');

  // 2. Edit a.txt (replace 1 line with 2 lines -> +2, -1)
  idx = messages.length;
  const r2 = await callToolHttp(port, 'edit_file', { path: 'a.txt', target: 'line2', replacement: 'line2a\nline2b' });
  assert.equal(r2.body.result.isError, false);
  const ev2 = await waitForMessage(m => m.type === 'activity' && m.kind === 'file-change' && m.path === 'a.txt', 3000, idx);
  assert.equal(ev2.op, 'modify');
  assert.equal(ev2.added, 2);
  assert.equal(ev2.removed, 1);
  assert.equal(ev2.tool, 'edit_file');

  // 3. Batch write_files (create b.txt with 2 lines)
  idx = messages.length;
  const r3 = await callToolHttp(port, 'write_files', { files: [{ path: 'b.txt', content: 'alpha\nbeta\n' }] });
  assert.equal(r3.body.result.isError, false);
  const ev3 = await waitForMessage(m => m.type === 'activity' && m.kind === 'file-change' && m.path === 'b.txt', 3000, idx);
  assert.equal(ev3.op, 'create');
  assert.equal(ev3.added, 2);
  assert.equal(ev3.removed, 0);

  // 4. Oversized file (> 2 MB) -> added: null
  idx = messages.length;
  const big = 'x'.repeat(2 * 1024 * 1024 + 64);
  const r4 = await callToolHttp(port, 'write_file', { path: 'big.txt', content: big });
  assert.equal(r4.body.result.isError, false);
  const ev4 = await waitForMessage(m => m.type === 'activity' && m.kind === 'file-change' && m.path === 'big.txt', 3000, idx);
  assert.equal(ev4.added, null);
  assert.equal(ev4.removed, null);

  // 5. snapshot-request returns tracked files
  idx = messages.length;
  child.send({ type: 'snapshot-request' });
  const snap = await waitForMessage(m => m.type === 'snapshot', 3000, idx);
  assert.ok(Array.isArray(snap.files));
  assert.ok(snap.files.some(f => f.path === 'a.txt'));
  assert.ok(snap.files.some(f => f.path === 'b.txt'));

  // 6. revert-request restores a.txt and emits op: 'revert'
  idx = messages.length;
  child.send({ type: 'revert-request', path: 'a.txt', requestId: 42 });
  const revRes = await waitForMessage(m => m.type === 'revert-result' && m.requestId === 42, 3000, idx);
  assert.equal(revRes.ok, true);
  const revEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'file-change' && m.path === 'a.txt' && m.op === 'revert', 3000, idx);
  assert.equal(revEv.op, 'revert');
  const onDisk = await readFile(path.join(dir, 'a.txt'), 'utf8');
  assert.equal(onDisk, 'line1\nline2\nline3\n');
});

test('foreground execute_command emits cmd-start, cmd-output, and cmd-exit', { timeout: 20000 }, async (t) => {
  const { port, messages, waitForMessage } = await startIpcServer(t);
  const idx = messages.length;

  const res = await callToolHttp(port, 'execute_command', {
    command: 'node -e "console.log(\'hello-out\'); console.error(\'hello-err\')"'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.result.isError, false);

  const startEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-start', 3000, idx);
  assert.match(startEv.id, /^cmd-\d+$/);
  assert.equal(startEv.background, false);
  assert.ok(typeof startEv.pid === 'number' && startEv.pid > 0);

  const exitEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-exit' && m.id === startEv.id, 3000, idx);
  assert.equal(exitEv.code, 0);
  assert.equal(exitEv.status, 'exited');

  const outText = messages.slice(idx)
    .filter(m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && m.stream === 'out')
    .map(m => m.chunk).join('');
  const errText = messages.slice(idx)
    .filter(m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && m.stream === 'err')
    .map(m => m.chunk).join('');
  assert.match(outText, /hello-out/);
  assert.match(errText, /hello-err/);
});

test('background job streams output and job-stop kills it with status stopped', { timeout: 20000 }, async (t) => {
  const { port, child, messages, waitForMessage } = await startIpcServer(t);
  const idx = messages.length;

  const res = await callToolHttp(port, 'manage_background_job', {
    action: 'start',
    command: 'node -e "console.log(\'bg-ready\'); setInterval(() => {}, 1000)"'
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.result.isError, false);

  const startEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-start' && m.background === true, 5000, idx);
  assert.match(startEv.id, /^job-\d+$/);

  await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && String(m.chunk).includes('bg-ready'),
    5000,
    idx
  );

  child.send({ type: 'job-stop', id: startEv.id });
  const exitEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-exit' && m.id === startEv.id, 5000, idx);
  assert.equal(exitEv.status, 'stopped');
});

test('job-input forwards stdin to an interactive readline script', { timeout: 20000 }, async (t) => {
  const { port, child, messages, waitForMessage } = await startIpcServer(t);
  const idx = messages.length;

  const cmd = `node -e "require('readline').createInterface({input:process.stdin,output:process.stdout}).question('name? ', a=>{console.log('hi '+a);process.exit(0)})"`;
  const res = await callToolHttp(port, 'manage_background_job', { action: 'start', command: cmd });
  assert.equal(res.status, 200);
  assert.equal(res.body.result.isError, false);

  const startEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-start' && m.background === true, 5000, idx);
  await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && String(m.chunk).includes('name?'),
    5000,
    idx
  );

  const eol = process.platform === 'win32' ? '\r\n' : '\n';
  child.send({ type: 'job-input', id: startEv.id, data: `BridgeUser${eol}` });

  await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && String(m.chunk).includes('hi BridgeUser'),
    5000,
    idx
  );
  const exitEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-exit' && m.id === startEv.id, 5000, idx);
  assert.equal(exitEv.code, 0);
});

test('job-eof closes process stdin, emits stdin-closed activity, and lets script exit 0', { timeout: 20000 }, async (t) => {
  const { port, child, messages, waitForMessage } = await startIpcServer(t);
  const idx = messages.length;

  const cmd = `node -e "console.log('eof-ready'); let buf=''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c=>{buf+=c}); process.stdin.on('end', ()=>{const lines=buf.split(/\\r?\\n/).filter(Boolean).length; console.log('LINES='+lines); process.exit(0);});"`;
  const res = await callToolHttp(port, 'manage_background_job', { action: 'start', command: cmd });
  assert.equal(res.status, 200);
  assert.equal(res.body.result.isError, false);

  const startEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-start' && m.background === true, 5000, idx);
  await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && String(m.chunk).includes('eof-ready'),
    5000,
    idx
  );

  const eol = process.platform === 'win32' ? '\r\n' : '\n';
  child.send({ type: 'job-input', id: startEv.id, data: `first line${eol}` });
  child.send({ type: 'job-input', id: startEv.id, data: `second line${eol}` });
  child.send({ type: 'job-eof', id: startEv.id });

  const stdinClosedEv = await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-stdin-closed' && m.id === startEv.id,
    5000,
    idx
  );
  assert.equal(stdinClosedEv.stdinOpen, false);

  await waitForMessage(
    m => m.type === 'activity' && m.kind === 'cmd-output' && m.id === startEv.id && String(m.chunk).includes('LINES=2'),
    5000,
    idx
  );
  const exitEv = await waitForMessage(m => m.type === 'activity' && m.kind === 'cmd-exit' && m.id === startEv.id, 5000, idx);
  assert.equal(exitEv.code, 0);
});

test('server runs safely without IPC in stdio mode', { timeout: 20000 }, async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bridge-no-ipc-'));
  const env = { ...process.env, HOME: dir, USERPROFILE: dir };
  const child = spawn(process.execPath, [SERVER_PATH, dir], {
    cwd: dir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  let buf = '';
  let stderr = '';
  const pending = new Map();
  let nextId = 1;
  let closed = false;
  const closedPromise = new Promise(resolve => child.once('close', () => { closed = true; resolve(); }));

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', c => { stderr += c; });
  child.stdout.on('data', chunk => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const resolve = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    }
  });

  t.after(async () => {
    if (!closed) {
      try { child.kill('SIGKILL'); } catch (e) {}
      await Promise.race([closedPromise, delay(2000)]);
    }
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`RPC ${method} timed out`)), 5000);
    pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });

  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } });
  assert.equal(init.result.serverInfo.name, 'Bridge');

  const w = await rpc('tools/call', { name: 'write_file', arguments: { path: 'hello.txt', content: 'a\nb\n' } });
  assert.equal(w.result.isError, false);

  const e = await rpc('tools/call', { name: 'edit_file', arguments: { path: 'hello.txt', target: 'b', replacement: 'c' } });
  assert.equal(e.result.isError, false);

  const cmd = await rpc('tools/call', { name: 'execute_command', arguments: { command: 'node -e "console.log(\'no-ipc-ok\')"' } });
  assert.equal(cmd.result.isError, false);
  assert.match(cmd.result.content[0].text, /no-ipc-ok/);
  assert.equal(closed, false, `Server should remain alive without IPC:\n${stderr}`);
});
