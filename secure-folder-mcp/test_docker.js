'use strict';

// Run on Linux/WSL with Docker and Compose >=2.24.4; uses an ephemeral loopback port.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { promisify } = require('node:util');

const exec = promisify(execFile);
const ROOT = path.resolve(__dirname, '..');
const SERVICE = 'bridge-sandbox';
const COMMAND_MS = 30000;
const HTTP_MS = 3000;

function request(port, token, payload) {
  return new Promise((resolve, reject) => {
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const req = http.request({
      host: '127.0.0.1', port, path: payload ? '/mcp' : '/api/status',
      method: body ? 'POST' : 'GET', agent: false,
      headers: {
        Accept: 'application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
      }
    });
    // Absolute deadline bounds connection, headers, and trickling response bodies.
    const timer = setTimeout(() => req.destroy(new Error('HTTP deadline exceeded')), HTTP_MS);
    req.once('error', error => { clearTimeout(timer); reject(error); });
    req.once('response', res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        text += chunk;
        if (text.length > 1024 * 1024) req.destroy(new Error('HTTP response too large'));
      });
      res.once('error', error => { clearTimeout(timer); reject(error); });
      res.once('end', () => {
        clearTimeout(timer);
        try { resolve({ status: res.statusCode, body: JSON.parse(text) }); }
        catch (error) { reject(new Error(`Invalid JSON response (${res.statusCode}): ${error.message}`)); }
      });
    });
    req.end(body);
  });
}

test('Docker sandbox integration (real Compose configuration)', { timeout: 540000 }, async t => {
  assert.equal(process.platform, 'linux', 'Run this integration test inside WSL/Linux');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-docker-test-'));
  const workspace = path.join(temp, 'workspace');
  const absent = path.join(temp, 'does-not-exist');
  const envFile = path.join(temp, 'empty.env');
  const overrideFile = path.join(temp, 'test-ports.yml');
  const project = `bridge-test-${process.pid}-${randomBytes(6).toString('hex')}`;
  const token = randomBytes(32).toString('hex');
  const marker = `docker-integration-${randomBytes(16).toString('hex')}`;
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(COMPOSE_|BRIDGE_)/i.test(key)) delete env[key];
  }
  Object.assign(env, { BRIDGE_TOKEN: token, BRIDGE_WORKSPACE: workspace, COMPOSE_ANSI: 'never' });
  const redact = text => String(text).split(token).join('[REDACTED]');
  const base = ['compose', '--project-directory', ROOT, '--env-file', envFile,
    '-f', path.join(ROOT, 'docker-compose.yml'), '-p', project];
  let usedDocker = false;
  let sequence = 0;
  let port;

  async function docker(args, { environment = env, timeout = COMMAND_MS, allowFailure = false } = {}) {
    let result;
    try {
      const output = await exec('docker', args, {
        cwd: ROOT, env: environment, timeout, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024
      });
      result = { code: 0, ...output };
    } catch (error) {
      if (error.killed || error.signal || typeof error.code !== 'number') {
        throw new Error(redact(`docker ${args.join(' ')} could not complete: ${error.message}`));
      }
      result = { code: error.code, stdout: error.stdout || '', stderr: error.stderr || '' };
    }
    if (!allowFailure && result.code !== 0) {
      throw new Error(redact(`docker ${args.join(' ')} exited ${result.code}\n${result.stdout}\n${result.stderr}`));
    }
    return result;
  }
  const compose = (args, options) => docker([...base, '-f', overrideFile, ...args], options);
  async function ids(kind) {
    const args = kind === 'container' ? ['ps', '-aq'] : ['network', 'ls', '-q'];
    return (await docker([...args, '--filter', `label=com.docker.compose.project=${project}`]))
      .stdout.trim().split(/\s+/).filter(Boolean);
  }

  // Register before setup: even partial builds/up failures must release owned resources.
  t.after(async () => {
    const errors = [];
    if (usedDocker) {
      try {
        const logs = await compose(['logs', '--no-color', '--tail', '30'], { allowFailure: true });
        if (logs.stdout || logs.stderr) t.diagnostic(redact(`Container logs:\n${logs.stdout}${logs.stderr}`));
      } catch (error) { errors.push(error); }
      try { await compose(['down', '--volumes', '--remove-orphans', '--rmi', 'local', '--timeout', '5']); }
      catch (error) { errors.push(error); }
      // Label-scoped fallback also catches the disposable image-probe container.
      try {
        const containers = await ids('container');
        if (containers.length) await docker(['rm', '-f', '-v', ...containers]);
        const networks = await ids('network');
        if (networks.length) await docker(['network', 'rm', ...networks]);
        assert.deepEqual(await ids('container'), [], 'Leaked test containers');
        assert.deepEqual(await ids('network'), [], 'Leaked test networks');
      } catch (error) { errors.push(error); }
    }
    try { await fs.rm(temp, { recursive: true, force: true, maxRetries: 3 }); }
    catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, 'Docker integration cleanup failed');
    t.diagnostic('Cleanup verified: no test containers, networks, or temporary directories remain');
  });

  await fs.writeFile(envFile, '');
  // Replace, rather than append to, the shipped port mapping to leave other servers alone.
  await fs.writeFile(overrideFile, 'services:\n  bridge-sandbox:\n    ports: !override\n      - "127.0.0.1:0:3000"\n');
  await fs.mkdir(workspace, { mode: 0o700 });
  // Only touch the disposable directory; never chmod/chown the repository or user workspace.
  if (process.getuid() === 0) await fs.chown(workspace, 1000, 1000);
  else await fs.chmod(workspace, process.getuid() === 1000 ? 0o700 : 0o777);
  await fs.writeFile(path.join(workspace, 'host-input.txt'), marker, { mode: 0o644 });
  await docker(['info', '--format', '{{.ServerVersion}}']);
  usedDocker = true;

  await t.test('Compose rejects missing/empty token and workspace without inherited .env', async () => {
    for (const variable of ['BRIDGE_TOKEN', 'BRIDGE_WORKSPACE']) {
      for (const value of [undefined, '']) {
        const environment = { ...env };
        if (value === undefined) delete environment[variable];
        else environment[variable] = value;
        const result = await compose(['config', '--quiet'], { environment, allowFailure: true });
        assert.notEqual(result.code, 0, `${variable}=${String(value)} must fail`);
        assert.match(result.stderr, new RegExp(variable), 'Failure must identify the missing variable');
      }
    }
  });

  await t.test('shipped Compose configuration publishes only on host loopback', async () => {
    const config = JSON.parse((await docker([...base, 'config', '--format', 'json'])).stdout);
    assert.equal(config.services[SERVICE].ports.length, 1);
    const published = config.services[SERVICE].ports[0];
    assert.equal(published.host_ip, '127.0.0.1');
    assert.equal(String(published.published), '3000');
    assert.equal(published.target, 3000);
  });
  t.diagnostic(`Building actual Compose service under unique project ${project}`);
  await compose(['build', SERVICE], { timeout: 240000 });
  await t.test('nonexistent bind source fails without creating the directory', async () => {
    const result = await compose(['up', '-d', '--no-build', '--pull', 'never', SERVICE], {
      environment: { ...env, BRIDGE_WORKSPACE: absent }, allowFailure: true
    });
    assert.notEqual(result.code, 0, 'Missing workspace must fail container startup');
    assert.match(result.stdout + result.stderr, /bind source path does not exist|invalid mount config.*bind/i);
    await assert.rejects(fs.stat(absent), { code: 'ENOENT' });
  });
  await compose(['down', '--volumes', '--remove-orphans', '--timeout', '5']);
  await compose(['up', '-d', '--no-build', '--pull', 'never', SERVICE]);
  const container = (await compose(['ps', '-q', SERVICE])).stdout.trim();
  assert.match(container, /^[a-f0-9]{12,64}$/, 'Expected exactly one running service container');
  const inspect = async () => JSON.parse((await docker(['inspect', container])).stdout)[0];
  port = Number((await inspect()).NetworkSettings.Ports['3000/tcp'][0].HostPort);
  assert.ok(Number.isInteger(port) && port > 0, 'Docker must allocate a published test port');
  const inContainer = async source => (await docker(['exec', container, 'node', '-e', source])).stdout.trim();
  async function ready() {
    const deadline = Date.now() + 30000;
    let last;
    do {
      try {
        const response = await request(port, token);
        if (response.status === 200 && response.body.status === 'online') return;
        last = JSON.stringify(response);
      } catch (error) { last = error.message; }
      await delay(200);
    } while (Date.now() < deadline);
    throw new Error(`Readiness failed after 30s: ${last}`);
  }
  async function rpc(method, params) {
    const id = ++sequence;
    const response = await request(port, token, { jsonrpc: '2.0', id, method, params });
    assert.equal(response.status, 200);
    assert.equal(response.body.jsonrpc, '2.0');
    assert.equal(response.body.id, id);
    assert.equal(response.body.error, undefined, JSON.stringify(response.body.error));
    return response.body.result;
  }
  async function tool(name, args, isError = false) {
    const result = await rpc('tools/call', { name, arguments: args });
    assert.equal(result.isError, isError, JSON.stringify(result));
    return result.content.map(item => item.text || '').join('\n');
  }
  await ready();

  await t.test('inspect confirms runtime isolation and resource limits', async () => {
    const actual = await inspect();
    const host = actual.HostConfig;
    assert.equal(actual.State.Running, true);
    assert.ok(['node', '1000', '1000:1000', 'node:node'].includes(actual.Config.User));
    assert.equal(host.Privileged, false);
    assert.equal(host.ReadonlyRootfs, true);
    assert.equal(host.Init, true);
    assert.equal(host.Memory, 1024 ** 3);
    assert.equal(host.NanoCpus, 1500000000);
    assert.equal(host.PidsLimit, 256);
    assert.deepEqual(host.CapDrop.map(value => value.toUpperCase()), ['ALL']);
    assert.equal((host.CapAdd || []).length, 0);
    assert.ok(host.SecurityOpt.some(value => /^no-new-privileges(?::true|=true)?$/.test(value)));
    assert.ok(!['host', 'container'].some(value => host.NetworkMode.startsWith(value)));
    assert.ok(!['host'].includes(host.PidMode));
    assert.equal((host.Devices || []).length, 0);
    assert.deepEqual(Object.keys(host.PortBindings), ['3000/tcp']);
    assert.equal(host.PortBindings['3000/tcp'].length, 1);
    assert.equal(host.PortBindings['3000/tcp'][0].HostIp, '127.0.0.1');
    assert.deepEqual(actual.NetworkSettings.Ports,
      { '3000/tcp': [{ HostIp: '127.0.0.1', HostPort: String(port) }] });
    assert.ok(actual.Config.Env.includes('BRIDGE_HOST=0.0.0.0'));
    assert.ok(actual.Config.Env.includes(`BRIDGE_TOKEN=${token}`), 'Configured test token must reach the server');
    const binds = actual.Mounts.filter(mount => mount.Type === 'bind');
    assert.equal(binds.length, 1, 'Only the dedicated workspace may be host-bound');
    assert.equal(binds[0].Source, await fs.realpath(workspace));
    assert.equal(binds[0].Destination, '/workspace');
    assert.equal(binds[0].RW, true);
    for (const mount of actual.Mounts) {
      assert.ok(mount.Type === 'tmpfs' || (mount.Type === 'bind' && mount.Destination === '/workspace'),
        `Unexpected mount: ${JSON.stringify(mount)}`);
      assert.doesNotMatch(`${mount.Source} ${mount.Destination}`, /docker\.sock|\/var\/run\/docker/i);
    }
    assert.deepEqual(Object.keys(host.Tmpfs).sort(), ['/home/node', '/tmp']);
    for (const [target, size] of [['/home/node', '64m'], ['/tmp', '128m']]) {
      const options = host.Tmpfs[target].split(',');
      for (const option of ['rw', 'nosuid', 'nodev', `size=${size}`]) assert.ok(options.includes(option));
    }
    for (const option of ['uid=1000', 'gid=1000']) assert.ok(host.Tmpfs['/home/node'].split(',').includes(option));
    assert.match(host.Tmpfs['/home/node'], /(?:^|,)mode=0?700(?:,|$)/);
  });

  await t.test('authentication and MCP initialization', async () => {
    for (const credential of [undefined, `${token}-wrong`]) {
      assert.equal((await request(port, credential)).status, 401);
      assert.equal((await request(port, credential, { jsonrpc: '2.0', id: 1, method: 'initialize' })).status, 401);
    }
    const status = await request(port, token);
    assert.equal(status.status, 200);
    assert.equal(status.body.activeProject, '/workspace');
    const initialized = await rpc('initialize', {
      protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'docker-integration', version: '1.0' }
    });
    assert.equal(initialized.protocolVersion, '2024-11-05');
    assert.equal(initialized.serverInfo.name, 'Bridge');
    assert.ok(initialized.capabilities.tools);
  });

  await t.test('MCP host persistence, traversal rejection, and shell execution', async () => {
    assert.ok((await tool('read_file', { path: 'host-input.txt' })).includes(marker));
    await tool('write_file', { path: 'persist.txt', content: marker });
    assert.equal(await fs.readFile(path.join(workspace, 'persist.txt'), 'utf8'), marker);
    assert.ok((await tool('read_file', { path: 'persist.txt' })).includes(marker));
    for (const name of ['read_file', 'write_file']) {
      const text = await tool(name, { path: '../escape.txt', content: marker }, true);
      assert.match(text, /escapes the sandboxed project folder/i);
    }
    await assert.rejects(fs.stat(path.join(temp, 'escape.txt')), { code: 'ENOENT' });
    const output = await tool('execute_command', { command: 'echo bridge-docker-shell-ok', timeout_seconds: 5 });
    assert.match(output, /Exit Code: 0\b/);
    assert.match(output, /STDOUT:\s*bridge-docker-shell-ok\s*$/);
    const uid = await tool('execute_command', { command: 'node -p "process.getuid()"', timeout_seconds: 5 });
    assert.match(uid, /Exit Code: 0\b/);
    assert.match(uid, /STDOUT:\s*1000\s*$/);
  });

  await t.test('actual UID, writable tmpfs/workspace, readonly app, and kernel privilege state', async () => {
    const result = JSON.parse(await inContainer(`
      const fs = require('node:fs');
      const assert = require('node:assert/strict');
      assert.equal(process.getuid(), 1000);
      assert.equal(process.getgid(), 1000);
      for (const dir of ['/tmp', '/home/node', '/workspace']) {
        const file = dir + '/runtime-probe.txt';
        fs.writeFileSync(file, 'runtime-probe');
        assert.equal(fs.readFileSync(file, 'utf8'), 'runtime-probe');
      }
      let appError;
      try { fs.writeFileSync('/app/runtime-probe.txt', 'must fail'); }
      catch (error) { appError = error.code; }
      assert.equal(appError, 'EROFS');
      const home = fs.statSync('/home/node');
      assert.equal(home.uid, 1000);
      assert.equal(home.gid, 1000);
      assert.equal(home.mode & 0o777, 0o700);
      for (const pid of ['self', '1']) {
        const status = fs.readFileSync('/proc/' + pid + '/status', 'utf8');
        assert.match(status, /^CapEff:\\s*0+$/m);
        assert.match(status, /^NoNewPrivs:\\s*1$/m);
      }
      console.log(JSON.stringify({ uid: process.getuid(), appError }));
    `));
    assert.deepEqual(result, { uid: 1000, appError: 'EROFS' });
    assert.equal(await fs.readFile(path.join(workspace, 'runtime-probe.txt'), 'utf8'), 'runtime-probe');
    const logs = (await compose(['logs', '--no-color', SERVICE])).stdout;
    assert.match(logs, /Bridge MCP listening on 0\.0\.0\.0:3000/);
  });

  await t.test('workspace persists across restart and server becomes ready again', async () => {
    await compose(['restart', '--timeout', '5', SERVICE]);
    // Docker may allocate a different ephemeral published port on restart.
    port = Number((await inspect()).NetworkSettings.Ports['3000/tcp'][0].HostPort);
    await ready();
    assert.equal((await inspect()).Id, container);
    assert.equal(await fs.readFile(path.join(workspace, 'persist.txt'), 'utf8'), marker);
    assert.ok((await tool('read_file', { path: 'persist.txt' })).includes(marker));
    assert.equal((await request(port)).status, 401);
  });

  await t.test('unmounted image /app contains only runtime sources, no test data or secrets', async () => {
    const image = (await inspect()).Image;
    const imageConfig = JSON.parse((await docker(['image', 'inspect', image])).stdout)[0].Config;
    assert.ok(!imageConfig.Env.some(value => /^BRIDGE_TOKEN=/.test(value)), 'Token must not be baked into image');
    const probe = `
      const fs = require('node:fs');
      const assert = require('node:assert/strict');
      assert.deepEqual(fs.readdirSync('/app').sort(), ['package.json', 'secure-folder-mcp']);
      assert.deepEqual(fs.readdirSync('/app/secure-folder-mcp'), ['server.js']);
      for (const file of ['/app/package.json', '/app/secure-folder-mcp/server.js']) {
        const text = fs.readFileSync(file, 'utf8');
        for (const secret of ${JSON.stringify([token, marker, workspace, temp])}) {
          assert.ok(!text.includes(secret), file + ' contains test data');
        }
      }
      assert.deepEqual(fs.readdirSync('/workspace'), []);
      console.log('clean runtime-only image');
    `;
    const output = await docker(['run', '--rm', '--name', `${project}-image-probe`,
      '--label', `com.docker.compose.project=${project}`, '--network', 'none', '--read-only',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--entrypoint', 'node', image, '-e', probe]);
    assert.equal(output.stdout.trim(), 'clean runtime-only image');
  });
});
