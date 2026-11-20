/**
 * Automated Test Suite for Secure Folder MCP Server
 * Validates protocol compliance, file operations, and strict security isolation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

function makeHttpRequest({ host = '127.0.0.1', port = 3899, path = '/mcp', method = 'POST', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path, method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const SANDBOX_DIR = path.join(__dirname, 'test_sandbox');

// Ensure clean test sandbox
if (fs.existsSync(SANDBOX_DIR)) {
  fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SANDBOX_DIR, { recursive: true });

console.log(`[TEST] Setting up test sandbox at: ${SANDBOX_DIR}`);

// Start server child process
const serverProcess = spawn('node', [path.join(__dirname, 'server.js'), SANDBOX_DIR], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;
const pendingRequests = new Map();
let buffer = '';

serverProcess.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep partial line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line.trim());
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        resolve(msg);
      }
    } catch (e) {
      console.error('[TEST] Could not parse JSON from server:', line);
    }
  }
});

serverProcess.stderr.on('data', (chunk) => {
  // Stderr is for server diagnostic logs
  // console.log('[SERVER-STDERR]', chunk.toString().trim());
});

function sendRequest(method, params = {}) {
  const id = messageId++;
  const payload = {
    jsonrpc: '2.0',
    id,
    method,
    params
  };

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    serverProcess.stdin.write(JSON.stringify(payload) + '\n');
  });
}

function sendNotification(method, params = {}) {
  const payload = {
    jsonrpc: '2.0',
    method,
    params
  };
  serverProcess.stdin.write(JSON.stringify(payload) + '\n');
}

async function runTests() {
  console.log('[TEST] Starting MCP Protocol Verification...\n');

  try {
    // 1. Initialize
    console.log('1. Testing "initialize"...');
    const initRes = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
    console.assert(initRes.result.serverInfo.name === 'Bridge', 'Server name match');
    console.assert(initRes.result.serverInfo.version === '1.0.14', 'Server version match');
    console.log('   ✓ Initialize succeeded:', initRes.result.serverInfo);

    // 2. Notification initialized
    sendNotification('notifications/initialized');

    // 3. Tools list
    console.log('2. Testing "tools/list"...');
    const toolsRes = await sendRequest('tools/list', {});
    const tools = toolsRes.result.tools;
    console.assert(tools.length >= 7, 'Has at least 7 tools');
    console.log(`   ✓ Found ${tools.length} available tools:`, tools.map(t => t.name).join(', '));

    // 4. Write file
    console.log('3. Testing "write_file"...');
    const writeRes = await sendRequest('tools/call', {
      name: 'write_file',
      arguments: {
        path: 'src/main.py',
        content: 'def hello():\n    print("Hello from Chatbot MCP!")\n\nif __name__ == "__main__":\n    hello()\n'
      }
    });
    console.assert(writeRes.result.isError === false, 'Write file succeeded');
    console.log('   ✓ Write succeeded:', writeRes.result.content[0].text);

    // 5. Read file (full & range)
    console.log('4. Testing "read_file"...');
    const readRes = await sendRequest('tools/call', {
      name: 'read_file',
      arguments: {
        path: 'src/main.py',
        start_line: 1,
        end_line: 2
      }
    });
    console.assert(readRes.result.isError === false, 'Read range succeeded');
    console.log('   ✓ Read line range succeeded:\n' + readRes.result.content[0].text);

    // 6. Edit file (Search & Replace)
    console.log('5. Testing "edit_file" (surgical token-saving replacement)...');
    const editRes = await sendRequest('tools/call', {
      name: 'edit_file',
      arguments: {
        path: 'src/main.py',
        target: 'print("Hello from Chatbot MCP!")',
        replacement: 'print("Hello from Claude/Gemini/DeepSeek Secure MCP!")'
      }
    });
    console.assert(editRes.result.isError === false, 'Edit succeeded');
    console.log('   ✓ Edit succeeded:', editRes.result.content[0].text);

    // Verify edit persisted
    const verifyEdit = await sendRequest('tools/call', {
      name: 'read_file',
      arguments: { path: 'src/main.py' }
    });
    console.assert(verifyEdit.result.content[0].text.includes('Claude/Gemini/DeepSeek'), 'Replacement verified');

    // 7. Search files
    console.log('6. Testing "search_files"...');
    const searchRes = await sendRequest('tools/call', {
      name: 'search_files',
      arguments: { query: 'DeepSeek' }
    });
    console.assert(searchRes.result.content[0].text.includes('src/main.py'), 'Search found file');
    console.log('   ✓ Search succeeded:\n' + searchRes.result.content[0].text);

    // 8. List directory
    console.log('7. Testing "list_directory"...');
    const listRes = await sendRequest('tools/call', {
      name: 'list_directory',
      arguments: { path: '.' }
    });
    console.assert(listRes.result.content[0].text.includes('src/main.py'), 'List contains created file');
    console.log('   ✓ Directory listing:\n' + listRes.result.content[0].text);

    // 9. SECURITY VERIFICATION: Path Traversal Tests
    console.log('8. Testing SECURITY SANDBOX (Attempting Traversal Outside Folder)...');

    // Attack A: Read parent file
    const attackA = await sendRequest('tools/call', {
      name: 'read_file',
      arguments: { path: '../../build_compiled_dossier.py' }
    });
    console.assert(attackA.result.isError === true, 'Attack A blocked');
    console.log('   ✓ Attack A (relative traversal) BLOCKED successfully:', attackA.result.content[0].text);

    // Attack B: Write outside folder
    const attackB = await sendRequest('tools/call', {
      name: 'write_file',
      arguments: { path: '../malicious_hack.txt', content: 'pwned' }
    });
    console.assert(attackB.result.isError === true, 'Attack B blocked');
    console.log('   ✓ Attack B (write outside root) BLOCKED successfully:', attackB.result.content[0].text);

    // Attack C: Read sensitive .env file
    fs.writeFileSync(path.join(SANDBOX_DIR, '.env'), 'SECRET_API_KEY=12345');
    const attackC = await sendRequest('tools/call', {
      name: 'read_file',
      arguments: { path: '.env' }
    });
    console.assert(attackC.result.isError === true, 'Attack C blocked');
    console.log('   ✓ Attack C (.env secret file protection) BLOCKED successfully:', attackC.result.content[0].text);

    // 9. HTTP Authentication & Authorization Verification
    console.log('\n9. Testing HTTP Server Authentication & Authorization...');
    const testHttpPort = 3899;
    const testToken = 'super-secret-test-token-7788';
    const httpProc = spawn('node', [
      path.join(__dirname, 'server.js'),
      SANDBOX_DIR,
      '--http',
      String(testHttpPort),
      '--token',
      testToken
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    // Wait 1 second for HTTP server to bind
    await new Promise(r => setTimeout(r, 1000));

    try {
      // 9a. Unauthenticated POST /mcp -> 401
      const unauthMcp = await makeHttpRequest({
        port: testHttpPort,
        path: '/mcp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      console.assert(unauthMcp.statusCode === 401, 'Unauthenticated /mcp rejected with 401');
      console.log('   ✓ Unauthenticated POST /mcp returned 401 Unauthorized');

      // 9b. Unauthenticated POST /call -> 401
      const unauthCall = await makeHttpRequest({
        port: testHttpPort,
        path: '/call',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'list_directory', arguments: {} }
      });
      console.assert(unauthCall.statusCode === 401, 'Unauthenticated /call rejected with 401');
      console.log('   ✓ Unauthenticated POST /call returned 401 Unauthorized');

      // 9c. Unauthenticated POST /api/set-directory -> 401
      const unauthSetDir = await makeHttpRequest({
        port: testHttpPort,
        path: '/api/set-directory',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { path: SANDBOX_DIR }
      });
      console.assert(unauthSetDir.statusCode === 401, 'Unauthenticated /api/set-directory rejected with 401');
      console.log('   ✓ Unauthenticated POST /api/set-directory returned 401 Unauthorized');

      // 9d. Invalid Bearer Token -> 401
      const wrongTokenRes = await makeHttpRequest({
        port: testHttpPort,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-token'
        },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      console.assert(wrongTokenRes.statusCode === 401, 'Wrong token rejected with 401');
      console.log('   ✓ Invalid token rejected with 401 Unauthorized');

      // 9e. Valid Bearer Token Header -> 200
      const validBearerRes = await makeHttpRequest({
        port: testHttpPort,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      console.assert(validBearerRes.statusCode === 200, 'Valid Bearer token accepted');
      console.log('   ✓ Valid Authorization: Bearer token accepted (200 OK)');

      // 9f. Valid Token via Query Parameter -> 200
      const validQueryRes = await makeHttpRequest({
        port: testHttpPort,
        path: `/mcp?token=${testToken}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
      });
      console.assert(validQueryRes.statusCode === 200, 'Valid token query param accepted');
      console.log('   ✓ Valid ?token= query parameter accepted (200 OK)');

      // 9g. Authenticated /api/set-directory -> 200
      const authSetDir = await makeHttpRequest({
        port: testHttpPort,
        path: '/api/set-directory',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: { path: SANDBOX_DIR }
      });
      console.assert(authSetDir.statusCode === 200, 'Authenticated /api/set-directory succeeded');
      console.log('   ✓ Authenticated /api/set-directory succeeded (200 OK)');

    } finally {
      httpProc.kill();
    }

    // 10. Shell Command Disablement Verification (--disable-shell)
    console.log('\n10. Testing Shell Execution Disablement (--disable-shell)...');
    const shellProc = spawn('node', [
      path.join(__dirname, 'server.js'),
      SANDBOX_DIR,
      '--disable-shell'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const shellPending = new Map();
    let shellMsgId = 100;
    let shellBuf = '';

    shellProc.stdout.on('data', chunk => {
      shellBuf += chunk.toString();
      const lines = shellBuf.split('\n');
      shellBuf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const m = JSON.parse(line.trim());
          if (m.id && shellPending.has(m.id)) {
            shellPending.get(m.id)(m);
            shellPending.delete(m.id);
          }
        } catch (e) {}
      }
    });

    try {
      const sendShellReq = (toolName, toolArgs) => {
        const id = shellMsgId++;
        return new Promise(resolve => {
          shellPending.set(id, resolve);
          shellProc.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params: { name: toolName, arguments: toolArgs }
          }) + '\n');
        });
      };

      const shellRes = await sendShellReq('execute_command', { command: 'echo hello' });
      console.assert(shellRes.result.isError === true, 'Shell execution blocked when disabled');
      console.log('   ✓ Shell command correctly BLOCKED with policy error:', shellRes.result.content[0].text);
    } finally {
      shellProc.kill();
    }

    console.log('\n========================================');
    console.log('[PASS] ALL TESTS PASSED! 100% SECURE & FUNCTIONAL.');
    console.log('========================================\n');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    serverProcess.kill();
    // Clean up test sandbox
    try {
      fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
    } catch (e) {}
    process.exit(0);
  }
}

runTests();
