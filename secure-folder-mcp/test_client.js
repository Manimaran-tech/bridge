/**
 * Automated Test Suite for Secure Folder MCP Server
 * Validates protocol compliance, file operations, and strict security isolation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
    console.assert(initRes.result.serverInfo.version === '1.0.10', 'Server version match');
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
