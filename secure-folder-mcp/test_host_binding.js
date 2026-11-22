'use strict';

// Run with Node >=18: node --test secure-folder-mcp/test_host_binding.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const STARTUP_TIMEOUT_MS = 10000;
const REQUEST_TIMEOUT_MS = 2000;
const TOKEN = 'host-binding-test-token';

async function freePort() {
  const reservation = net.createServer();
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Free-port lookup timed out')), 2000);
      reservation.once('error', error => {
        clearTimeout(timer);
        reject(error);
      });
      reservation.listen(0, '0.0.0.0', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    return reservation.address().port;
  } finally {
    await new Promise(resolve => reservation.close(resolve));
  }
}

function statusRequest(port, authenticated) {
  return new Promise((resolve, reject) => {
    // An absolute deadline also bounds connect time and trickling responses.
    const timer = setTimeout(() => {
      request.destroy(new Error('GET /api/status timed out'));
    }, REQUEST_TIMEOUT_MS);
    const request = http.get({
      host: '127.0.0.1',
      port,
      path: '/api/status',
      agent: false,
      headers: authenticated ? { Authorization: `Bearer ${TOKEN}` } : {}
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.once('error', reject);
      response.once('end', () => {
        clearTimeout(timer);
        resolve({ statusCode: response.statusCode, body });
      });
    });
    request.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function stopChild(child, closed) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  let timer;
  try {
    await Promise.race([
      closed,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Server cleanup timed out')), 5000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const cases = [
  { name: 'absent BRIDGE_HOST defaults to loopback', value: undefined, host: '127.0.0.1' },
  { name: 'empty BRIDGE_HOST defaults to loopback', value: '', host: '127.0.0.1' },
  { name: 'explicit loopback BRIDGE_HOST is honored', value: '127.0.0.1', host: '127.0.0.1' },
  { name: 'explicit wildcard BRIDGE_HOST is honored', value: '0.0.0.0', host: '0.0.0.0' }
];

for (const scenario of cases) {
  test(scenario.name, { timeout: 20000 }, async t => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'bridge-host-binding-'));
    let child;
    let closed;
    t.after(async () => {
      try {
        if (child) await stopChild(child, closed);
      } finally {
        await rm(directory, { recursive: true, force: true, maxRetries: 3 });
      }
    });

    // Observe the real socket, not just a log that could disagree with the bind.
    // The original listen implementation and all HTTP handling remain untouched.
    const observer = path.join(directory, 'observe-binding.cjs');
    await writeFile(observer, `
'use strict';
const net = require('node:net');
const originalEmit = net.Server.prototype.emit;
net.Server.prototype.emit = function (event, ...args) {
  if (event === 'listening' && process.send) {
    process.send({ type: 'host-binding-address', address: this.address() });
  }
  return originalEmit.call(this, event, ...args);
};
`);

    const port = await freePort();
    const env = { ...process.env };
    // Environment keys are case-insensitive on Windows; remove inherited variants.
    for (const key of Object.keys(env)) {
      if (['BRIDGE_HOST', 'BRIDGE_TOKEN', 'BRIDGE_AUTH_TOKEN', 'NODE_OPTIONS',
        'HOME', 'USERPROFILE'].includes(key.toUpperCase())) delete env[key];
    }
    if (scenario.value !== undefined) env.BRIDGE_HOST = scenario.value;
    // Keep request logs under the disposable directory, including on Windows.
    env.HOME = directory;
    env.USERPROFILE = directory;

    child = spawn(process.execPath, [
      '--require', observer,
      path.join(__dirname, 'server.js'), directory,
      '--http', String(port), '--token', TOKEN
    ], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });

    let output = '';
    let address;
    let spawnError;
    let hasClosed = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const capture = chunk => { output = (output + chunk).slice(-32768); };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('message', message => {
      if (message && message.type === 'host-binding-address') address = message.address;
    });
    child.on('error', error => { spawnError = error; });
    closed = new Promise(resolve => child.once('close', () => {
      hasClosed = true;
      resolve();
    }));


    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (!address || !output.includes('Bridge MCP listening on ')) {
      if (spawnError) throw spawnError;
      assert.ok(!hasClosed, `Server exited before readiness:\n${output}`);
      assert.ok(Date.now() < deadline, `Server readiness timed out:\n${output}`);
      await delay(25);
    }

    // Exercise authentication for every binding, including the public opt-in.
    const unauthenticated = await statusRequest(port, false);
    assert.equal(unauthenticated.statusCode, 401, 'Status must require authentication');
    const authenticated = await statusRequest(port, true);
    assert.equal(authenticated.statusCode, 200, 'A valid Bearer token must be accepted');
    assert.equal(JSON.parse(authenticated.body).status, 'online');

    assert.equal(address.address, scenario.host, 'Actual socket must use the selected host');
    assert.equal(address.port, port, 'Actual socket must use the allocated port');
    const readinessLines = output.split(/\r?\n/)
      .filter(line => line.includes('Bridge MCP listening on '));
    assert.equal(readinessLines.length, 1, `Expected one readiness log:\n${output}`);
    assert.ok(readinessLines[0].endsWith(`Bridge MCP listening on ${scenario.host}:${port}`),
      `Readiness log must report the selected host and port:\n${output}`);
  });
}
