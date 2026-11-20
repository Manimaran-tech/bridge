# 🛡️ Secure Folder MCP Server (`secure-fs-mcp`)

Connect your local files directly to LLM chatbots (**Claude Desktop, Gemini, ChatGPT, DeepSeek, Ollama, etc.**) with **strict folder-level security isolation**.

---

## 💡 Why This Exists

| AI IDEs (Cursor, Windsurf, Cline) | Chatbots + Secure Folder MCP |
| :--- | :--- |
| 💸 Expensive ($20–$40/mo or costly per-token API fees) | 🆓 Leverages generous free/included chatbot subscriptions |
| 🔒 Full system access or broad workspace scope | 🛡️ **Jailed strictly** to a single folder you choose |
| 📋 Copy-pasting code between chat & editor | ⚡ Chatbot reads & writes directly to your project files |

---

## 🔒 Security Guarantees

1. **Strict Folder Sandboxing**: The server checks every requested file against your designated folder. Any attempt to navigate outside (e.g., `../../Windows`, `/etc/passwd`, or drive root) is blocked with a security violation error.
2. **Symlink Attack Protection**: Symlinks pointing outside the allowed root directory are resolved and blocked before access.
3. **Sensitive File Blocker**: Sensitive files like `.env`, `.env.*`, `*.pem`, `*.key`, and `id_rsa` are shielded by default (can be overridden with `--allow-env`).
4. **Token-Optimized Operations**:
   - `edit_file`: Performs surgical search-and-replace so the chatbot doesn't have to output 500 lines of code just to change 3 lines (saving tokens and avoiding truncated responses).
   - `read_file`: Supports `start_line` and `end_line` ranges to keep context windows clean.

---

## 🛠️ Included Tools

| Tool | Description |
| :--- | :--- |
| `list_directory` | Lists directory contents with clean tree format, depth limit, and auto-filters (`node_modules`, `.git`, etc.) |
| `read_file` | Reads text files with line numbers and optional line-range slicing (`start_line`, `end_line`) |
| `write_file` | Creates or completely overwrites a file (auto-creates subdirectories) |
| `edit_file` | Surgically replaces a target text block with replacement text (saves tokens!) |
| `search_files` | Fast grep/regex text search across code files |
| `get_file_info` | Metadata (size, line count, modified time) |
| `make_directory` | Creates nested folders safely |
| `delete_file` | Deletes a file inside the folder (requires `confirm: true`) |

---

## 🚀 Quick Setup Guide

### 1. Claude Desktop (Anthropic)
Claude Desktop has built-in native MCP support.

#### Automatic Setup (Windows):
Run the included helper script:
```powershell
.\configure-claude.bat "C:\path\to\your\project"
```
Or with PowerShell:
```powershell
.\configure-claude.ps1 -ProjectDir "C:\path\to\your\project"
```

#### Manual Setup:
Open `%APPDATA%\Claude\claude_desktop_config.json` (or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS) and add:
```json
{
  "mcpServers": {
    "secure-folder": {
      "command": "node",
      "args": [
        "c:/tmp/interview/secure-folder-mcp/server.js",
        "C:/path/to/your/project"
      ]
    }
  }
}
```
*Restart Claude Desktop. You will see the 🔨 hammer icon with all 8 file tools enabled!*

---

### 2. Multi-Model Chatbots: DeepSeek, Gemini, ChatGPT, Ollama
To chat with **DeepSeek (V3/R1)**, **Gemini 2.0 (Free via Google AI Studio)**, or **ChatGPT** with native MCP tools, use any open-source desktop client:

#### Option A: Cherry Studio (Recommended)
1. Download [Cherry Studio](https://cherry-studio.net/) (free, open source).
2. Go to **Settings** → **MCP Servers** → **Add Server**.
   - **Type**: `stdio`
   - **Command**: `node`
   - **Arguments**: `C:\tmp\interview\secure-folder-mcp\server.js C:\path\to\your\project`
3. Select any model (**DeepSeek V3/R1, Gemini 2.0 Flash, GPT-4o, Claude 3.5**) and chat! The model will automatically invoke `list_directory`, `read_file`, and `edit_file` to work on your code.

#### Option B: Goose (by Block)
```bash
goose configure
# Add extension: command = node, args = ["c:/tmp/interview/secure-folder-mcp/server.js", "C:/path/to/project"]
```

#### Option C: Chatbox / LibreChat
In their respective settings, add the stdio command:
`node c:\tmp\interview\secure-folder-mcp\server.js C:\path\to\your\project`

---

### 3. Web Chatbots (ChatGPT Custom GPTs / Webhooks)
You can also run the server in HTTP mode to connect with web-based bots or OpenAI Custom Actions:

1. **Start the HTTP Server**:
   ```bash
   node server.js "C:\path\to\your\project" --http 3000
   ```
2. **Expose with a secure tunnel** (e.g. Cloudflare or ngrok):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. **Import OpenAPI Schema**:
   In ChatGPT **Explore GPTs** → **Create a GPT** → **Configure** → **Actions**:
   - Paste the OpenAPI schema from `http://localhost:3000/openapi.json` (or via your tunnel URL).

---

## ⚙️ Command-Line Options

```bash
node server.js [folder_path] [options]
```

- `folder_path`: Directory to sandbox the chatbot to (defaults to current directory).
- `--read-only`: Disables `write_file`, `edit_file`, and `delete_file` (view-only mode).
- `--allow-env`: Permits access to `.env` files (shielded by default).
- `--http <port>`: Runs as an HTTP/REST server on the given port (e.g., 3000), bound strictly to 127.0.0.1.
- `--token <secret>`: Adds Bearer authentication to HTTP endpoints (auto-generated if omitted).
- `--disable-shell`: Disables shell command execution tools (`bash`, `pwsh`, `execute_command`).
- `--no-auth`: Explicitly disables authentication (for isolated local testing).

---

## 🧪 Verification & Testing

To run the built-in automated test suite verifying both protocol compliance and security attack blockades:
```bash
node test_client.js
```
All tests should pass:
- ✅ JSON-RPC 2.0 handshake
- ✅ Tool execution (`list`, `read`, `write`, `edit`, `search`)
- ✅ Path traversal attack blocked (`../../`)
- ✅ Symlink escape blocked
- ✅ Sensitive file blocked (`.env`)
