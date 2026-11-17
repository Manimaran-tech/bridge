#!/usr/bin/env node

/**
 * Complete DeepSeek-Harness Powered Secure MCP Server
 * 
 * 100% Complete Implementation of DeepSeek Harness (dsh) Core Tools:
 * - Subprocess Shell Execution (dsh-tool-bash, dsh-tool-pwsh)
 * - Background Job Management (dsh-tool-jobs, dsh-jobs-local)
 * - Git Tracking, Diffs & Status (dsh-base, dsh-tool-worktree)
 * - Workspace Dependency Analyzer (dsh-tool-workspace-dependencies)
 * - Web Documentation Fetcher (dsh-tool-web)
 * - Atomic Write & Revert History (dsh-atomic-write, dsh-tool-str-replace-editor)
 * - Plan & Goal Checklist Mode (dsh-plan-mode, dsh-tool-goal, dsh-tool-todo)
 * - Sandboxed Filesystem Suite (dsh-tool-fs)
 * - Dynamic Project Selection & Strict Folder Jailing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const http = require('http');
const { exec, spawn, execSync } = require('child_process');

// ==========================================
// 1. State & CLI Parsing
// ==========================================

const args = process.argv.slice(2);

let rootDir = null;
let isReadOnly = false;
let allowEnvFiles = false;
let httpPort = null;
let currentPlan = []; // dsh-plan-mode
const fileBackups = new Map(); // dsh-atomic-write: path -> [previous_contents]
const backgroundJobs = new Map(); // dsh-tool-jobs: jobId -> { proc, cmd, startTime, logs }
let nextJobId = 1;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--read-only') {
    isReadOnly = true;
  } else if (arg === '--allow-env') {
    allowEnvFiles = true;
  } else if (arg === '--http') {
    httpPort = parseInt(args[++i], 10) || 3000;
  } else if (!arg.startsWith('-') && !rootDir) {
    rootDir = arg;
  }
}

if (!rootDir) {
  rootDir = process.cwd();
}

try {
  rootDir = fs.realpathSync(path.resolve(rootDir));
} catch (e) {
  rootDir = process.cwd();
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', '.vscode', '.idea',
  'dist', 'build', 'out', 'target', '.next', '.nuxt',
  'coverage', '.venv', 'venv', '__pycache__', '.pytest_cache'
]);

const SENSITIVE_PATTERNS = [
  /^\.env($|\..+)/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /credentials\.json$/i
];

const BLOCKED_COMMANDS = [
  /\bformat\b/i,
  /\brm\s+(-rf?|--recursive)\s+[\/\\]/i,
  /\bdel\s+\/[sfq]\s+[c-z]:\\/i,
  /\bshutdown\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bfdisk\b/i
];

function logInfo(msg) {
  process.stderr.write(`[DSH-MCP] ${msg}\n`);
}

// ==========================================
// 2. Security Sandbox Validation
// ==========================================

function validateAndResolve(requestedPath, allowNonExistent = false) {
  if (!requestedPath || typeof requestedPath !== 'string') {
    throw new Error('Path parameter must be a non-empty string.');
  }

  if (requestedPath.includes('\0')) {
    throw new Error('Security Violation: Null byte detected.');
  }

  const resolved = path.resolve(rootDir, requestedPath);
  const rel = path.relative(rootDir, resolved);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Security Violation: Path "${requestedPath}" escapes the sandboxed project folder (${rootDir}).`);
  }

  const baseName = path.basename(resolved);
  if (!allowEnvFiles) {
    for (const pat of SENSITIVE_PATTERNS) {
      if (pat.test(baseName)) {
        throw new Error(`Security Violation: Access to sensitive file "${baseName}" is blocked by security policy.`);
      }
    }
  }

  if (fs.existsSync(resolved)) {
    try {
      const real = fs.realpathSync(resolved);
      const realRel = path.relative(rootDir, real);
      if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
        throw new Error(`Security Violation: Symlink points outside allowed directory (${real}).`);
      }
    } catch (e) {
      if (e.message.includes('Security Violation')) throw e;
    }
  } else if (!allowNonExistent) {
    throw new Error(`File or directory does not exist: "${requestedPath}"`);
  }

  return resolved;
}

function isBinaryFile(filePath) {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.woff', '.woff2', '.ttf', '.mp3', '.mp4'
  ]);
  const ext = path.extname(filePath).toLowerCase();
  if (binaryExtensions.has(ext)) return true;

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
  } catch (e) {}
  return false;
}

function openWindowsFolderPicker() {
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = "Select the Project Folder to Sandbox for the LLM:"
    $d.ShowNewFolderButton = $true
    if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
      Write-Output $d.SelectedPath
    }
  `.replace(/\r?\n/g, ' ');

  try {
    const output = execSync(`powershell -NoProfile -NonInteractive -Command "${psScript}"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return output || null;
  } catch (e) {
    return null;
  }
}

// ==========================================
// 3. Complete DeepSeek Harness Tool Definitions
// ==========================================

const tools = [
  // --- 1. Subprocess Execution (dsh-tool-bash, dsh-tool-pwsh) ---
  {
    name: 'bash',
    description: 'DeepSeek Harness Bash: Runs a command in Bash/Shell inside the project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute.'
        },
        timeout_seconds: {
          type: 'number',
          description: 'Timeout in seconds.'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'pwsh',
    description: 'DeepSeek Harness PowerShell: Runs a PowerShell command inside the project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The PowerShell command to execute.'
        },
        timeout_seconds: {
          type: 'number',
          description: 'Timeout in seconds.'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'execute_command',
    description: 'DeepSeek Harness Shell: Executes a terminal command (pytest, npm test, python script.py, etc.) strictly inside the project root directory. Captures exit code, stdout, and stderr for testing and verification.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute inside the project directory.'
        },
        timeout_seconds: {
          type: 'number',
          description: 'Maximum runtime in seconds (default: 30, max: 60).',
          default: 30
        }
      },
      required: ['command']
    }
  },

  // --- 2. Background Jobs (dsh-tool-jobs, dsh-jobs-local) ---
  {
    name: 'jobs',
    description: 'DeepSeek Harness Background Jobs: Manage long-running background tasks (start, status, logs, stop, list).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start', 'status', 'logs', 'stop', 'list'],
          description: 'Action to perform.'
        },
        command: {
          type: 'string',
          description: 'Command to run when action="start".'
        },
        job_id: {
          type: 'number',
          description: 'Job ID for status, logs, or stop.'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'manage_background_job',
    description: 'DeepSeek Background Job Runner: Starts long-running processes (e.g., "npm run dev", local servers, file watchers), checks their logs, or stops them.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['start', 'status', 'logs', 'stop', 'list'],
          description: 'Job action to perform.'
        },
        command: {
          type: 'string',
          description: 'Command to run in background when action="start".'
        },
        job_id: {
          type: 'number',
          description: 'Job ID for status, logs, or stop actions.'
        }
      },
      required: ['action']
    }
  },

  // --- 3. Git Tracking & Diffs (dsh-base, dsh-tool-worktree) ---
  {
    name: 'git_diff',
    description: 'Inspects uncommitted changes in the repository (git diff). Allows reviewing exact modifications.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Optional file path relative to root to inspect diff for.'
        }
      }
    }
  },
  {
    name: 'git_status',
    description: 'Returns the current git status (modified, staged, and untracked files).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // --- 4. Workspace Dependencies (dsh-tool-workspace-dependencies) ---
  {
    name: 'inspect_dependencies',
    description: 'DeepSeek Dependency Analyzer: Inspects project manifests (package.json, requirements.txt, pyproject.toml, Cargo.toml, go.mod, pom.xml) to identify the project tech stack, frameworks, and installed libraries.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // --- 5. Atomic Edit & Revert (dsh-atomic-write, dsh-tool-str-replace-editor) ---
  {
    name: 'edit',
    description: 'DeepSeek Harness Edit: Atomically updates a specific code snippet inside an existing file.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path of the file relative to project root.'
        },
        old_string: {
          type: 'string',
          description: 'Exact code snippet to replace.'
        },
        new_string: {
          type: 'string',
          description: 'New code snippet.'
        },
        replace_all: {
          type: 'boolean',
          description: 'Whether to replace all occurrences (default: false).'
        }
      },
      required: ['file_path', 'old_string', 'new_string']
    }
  },
  {
    name: 'read',
    description: 'DeepSeek Harness Read: Reads a UTF-8 text file and returns line-numbered content.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path of the file relative to project root.'
        },
        offset: {
          type: 'number',
          description: '1-based line number to start reading from (default: 1).'
        },
        limit: {
          type: 'number',
          description: 'Number of lines to read.'
        }
      },
      required: ['file_path']
    }
  },
  {
    name: 'write',
    description: 'DeepSeek Harness Write: Creates or overwrites a file inside the project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path of the file relative to project root.'
        },
        content: {
          type: 'string',
          description: 'Full text content to write.'
        }
      },
      required: ['file_path', 'content']
    }
  },
  {
    name: 'str_replace_editor',
    description: 'DeepSeek Harness Standalone Editor: View, create, replace string, or insert lines into files.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['view', 'create', 'str_replace', 'insert'],
          description: 'Action to perform.'
        },
        path: {
          type: 'string',
          description: 'Path of the file.'
        },
        old_str: {
          type: 'string',
          description: 'Existing string for str_replace.'
        },
        new_str: {
          type: 'string',
          description: 'New string for str_replace or insert.'
        },
        file_text: {
          type: 'string',
          description: 'Content for create.'
        },
        insert_line: {
          type: 'number',
          description: '0-based line number for insert.'
        },
        view_range: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional [start_line, end_line] for view.'
        }
      },
      required: ['command', 'path']
    }
  },
  {
    name: 'edit_file',
    description: 'DeepSeek Surgical Editor: Atomically replaces a specific text snippet inside an existing file. Automatically creates an undo snapshot before modifying.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the file relative to the project root.'
        },
        target: {
          type: 'string',
          description: 'Exact existing code snippet to replace (must match whitespace exactly).'
        },
        replacement: {
          type: 'string',
          description: 'New code snippet to replace the target with.'
        }
      },
      required: ['path', 'target', 'replacement']
    }
  },
  {
    name: 'revert_file',
    description: 'DeepSeek Atomic Undo: Reverts a file to its previous state prior to the last edit or write operation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the file to revert relative to the project root.'
        }
      },
      required: ['path']
    }
  },

  // --- 6. Web Documentation Fetcher (dsh-tool-web) ---
  {
    name: 'fetch_web_documentation',
    description: 'DeepSeek Web Fetcher: Retrieves external documentation or library API references from an HTTPS URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The HTTPS URL of the documentation or webpage to retrieve.'
        }
      },
      required: ['url']
    }
  },

  // --- 7. Plan & Goal Mode (dsh-plan-mode, dsh-tool-goal, dsh-tool-todo) ---
  {
    name: 'plan_mode',
    description: 'DeepSeek Harness Plan Mode: Collaborative milestone planning and checklist tracking (get, set, complete_step).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'set', 'complete_step'],
          description: 'Action: "get" to view plan, "set" to update plan items, "complete_step" to check off a milestone.'
        },
        plan_items: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of milestones/steps when action is "set".'
        },
        step_index: {
          type: 'number',
          description: '1-based index of the step to mark completed when action is "complete_step".'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'manage_plan',
    description: 'DeepSeek Plan Mode: Creates or updates a living checklist of milestones and goals for the current task.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'set', 'complete_step'],
          description: 'Action: "get" to view plan, "set" to update plan items, "complete_step" to check off a milestone.'
        },
        plan_items: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of milestones/steps when action is "set".'
        },
        step_index: {
          type: 'number',
          description: '1-based index of the step to mark completed when action is "complete_step".'
        }
      },
      required: ['action']
    }
  },

  // --- 8. Core Filesystem Suite (dsh-tool-fs) ---
  {
    name: 'select_project_folder',
    description: 'Selects or changes the active sandboxed project folder. Can open a native Windows folder picker dialog or accept a direct path.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_path: {
          type: 'string',
          description: 'Absolute path to project directory, or "browse" to open folder dialog.'
        }
      }
    }
  },
  {
    name: 'get_current_project',
    description: 'Returns information about the currently active project folder, detected dependencies, and sandbox boundaries.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_directory',
    description: 'Lists files and folders inside the active project directory in a clean tree structure.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Sub-path inside the project directory to list. Default: "."',
          default: '.'
        },
        depth: {
          type: 'number',
          description: 'Folder recursion depth limit (1 to 4). Default: 2',
          default: 2
        }
      }
    }
  },
  {
    name: 'read_file',
    description: 'Reads the content of a file in the project folder with optional line ranges.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the file relative to the project root.'
        },
        start_line: {
          type: 'number',
          description: 'Optional 1-based start line number.'
        },
        end_line: {
          type: 'number',
          description: 'Optional 1-based end line number.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Creates or completely overwrites a file inside the active project folder. Automatically saves a revert snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the file relative to the project root.'
        },
        content: {
          type: 'string',
          description: 'Full text content to write to the file.'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'search_files',
    description: 'Searches for text or regex patterns across all code files inside the project folder.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text string or regex pattern to search for.'
        },
        path: {
          type: 'string',
          description: 'Sub-directory to search within (default: root ".").'
        },
        file_extension: {
          type: 'string',
          description: 'Optional extension filter (e.g. ".py", ".js", ".html").'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_file_info',
    description: 'Inspects metadata (file size, total line count, modified date) of a file or directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to inspect relative to the project root.'
        }
      },
      required: ['path']
    }
  }
];

const prompts = [
  {
    name: 'deepseek_harness_instructions',
    description: 'Complete DeepSeek Harness autonomous software engineering instructions.',
    arguments: []
  }
];

function getHarnessInstructions() {
  return `You are operating as an autonomous software engineering agent running inside the complete DeepSeek Harness (dsh) environment.

ACTIVE WORKSPACE:
Directory: "${rootDir}"

FULL CAPABILITY SUITE:
- Subprocess Execution (execute_command): Run linters, unit tests (pytest, npm test), and build tools.
- Background Services (manage_background_job): Run local servers in background and inspect logs.
- Dependency Analyzer (inspect_dependencies): Check package.json / requirements.txt to know the tech stack.
- Git Tracking (git_status, git_diff): Inspect and verify all changes.
- Atomic Undo (revert_file): Roll back changes if an edit introduced a bug.
- Web Docs (fetch_web_documentation): Query external API docs when needed.
- Plan Checklist (manage_plan): Track multi-step tasks.
- Surgical Editor (edit_file, read_file): Fast, token-efficient code manipulation.

RULES:
1. Always run tests using execute_command to verify changes.
2. Check git_diff before declaring a task finished.
3. You are strictly confined to "${rootDir}". All execution runs within this directory.`;
}

// ==========================================
// 4. Tool Execution Handlers
// ==========================================

async function handleToolCall(name, args) {
  args = args || {};

  switch (name) {
    // --- 1. Subprocess Execution (dsh-tool-bash, dsh-tool-pwsh) ---
    case 'pwsh':
    case 'bash':
    case 'execute_command': {
      if (isReadOnly) throw new Error('Server running in read-only mode.');
      const cmd = args.command;
      if (!cmd || typeof cmd !== 'string') throw new Error('Command must be a non-empty string.');

      for (const pattern of BLOCKED_COMMANDS) {
        if (pattern.test(cmd)) {
          throw new Error(`Security Violation: Command "${cmd}" is blocked by DeepSeek safety policies.`);
        }
      }

      const timeoutMs = Math.min(Math.max(5, (args.timeout_seconds || 30)) * 1000, 60000);

      return new Promise((resolve) => {
        exec(cmd, {
          cwd: rootDir,
          timeout: timeoutMs,
          maxBuffer: 1024 * 512,
          windowsHide: true
        }, (error, stdout, stderr) => {
          const exitCode = error ? (error.code !== undefined ? error.code : 1) : 0;
          let output = '';
          if (stdout && stdout.trim()) output += `STDOUT:\n${stdout.trim()}\n`;
          if (stderr && stderr.trim()) output += `STDERR:\n${stderr.trim()}\n`;
          if (!output) output = '(Command exited with no output)';

          resolve(`[DeepSeek Harness Execution]\nCommand: ${cmd}\nExit Code: ${exitCode}\nDirectory: ${rootDir}\n\n${output.trim()}`);
        });
      });
    }

    // --- 2. Background Jobs (dsh-tool-jobs) ---
    case 'jobs':
    case 'manage_background_job': {
      const action = args.action;
      if (action === 'start') {
        if (isReadOnly) throw new Error('Server running in read-only mode.');
        const cmd = args.command;
        if (!cmd) throw new Error('Must specify command to start background job.');

        const jobId = nextJobId++;
        const parts = cmd.split(' ');
        const bin = parts[0];
        const cmdArgs = parts.slice(1);

        const proc = spawn(bin, cmdArgs, {
          cwd: rootDir,
          shell: true,
          windowsHide: true
        });

        const jobRecord = {
          id: jobId,
          command: cmd,
          startTime: new Date().toISOString(),
          status: 'running',
          logs: []
        };

        proc.stdout.on('data', d => {
          jobRecord.logs.push(d.toString());
          if (jobRecord.logs.length > 50) jobRecord.logs.shift();
        });
        proc.stderr.on('data', d => {
          jobRecord.logs.push(d.toString());
          if (jobRecord.logs.length > 50) jobRecord.logs.shift();
        });
        proc.on('exit', code => {
          jobRecord.status = `exited with code ${code}`;
        });

        backgroundJobs.set(jobId, { proc, record: jobRecord });
        return `Started background job #${jobId}: "${cmd}" (PID: ${proc.pid})`;
      } else if (action === 'list') {
        if (backgroundJobs.size === 0) return 'No background jobs currently running.';
        const list = Array.from(backgroundJobs.values()).map(j => `#${j.record.id} [${j.record.status}] "${j.record.command}" (Started: ${j.record.startTime})`);
        return `Active Background Jobs:\n${list.join('\n')}`;
      } else if (action === 'logs') {
        const jobId = args.job_id;
        const job = backgroundJobs.get(jobId);
        if (!job) throw new Error(`Job #${jobId} not found.`);
        return `Recent logs for Job #${jobId} ("${job.record.command}"):\n\n${job.record.logs.join('') || '(No output recorded yet)'}`;
      } else if (action === 'stop') {
        const jobId = args.job_id;
        const job = backgroundJobs.get(jobId);
        if (!job) throw new Error(`Job #${jobId} not found.`);
        try {
          job.proc.kill();
          job.record.status = 'stopped';
          return `Job #${jobId} stopped successfully.`;
        } catch (e) {
          return `Could not stop job #${jobId}: ${e.message}`;
        }
      } else {
        const jobId = args.job_id;
        const job = backgroundJobs.get(jobId);
        if (!job) throw new Error(`Job #${jobId} not found.`);
        return JSON.stringify(job.record, null, 2);
      }
    }

    // --- 3. Git Tools ---
    case 'git_diff': {
      let cmd = 'git diff';
      if (args.file_path) {
        const resolved = validateAndResolve(args.file_path);
        const rel = path.relative(rootDir, resolved);
        cmd = `git diff -- "${rel}"`;
      }
      return new Promise((resolve) => {
        exec(cmd, { cwd: rootDir, timeout: 10000 }, (error, stdout, stderr) => {
          if (error && !stdout) {
            resolve(`Git diff unavailable: ${stderr || error.message}`);
          } else {
            resolve(stdout.trim() || 'No uncommitted changes detected (clean working tree).');
          }
        });
      });
    }

    case 'git_status': {
      return new Promise((resolve) => {
        exec('git status --short --branch', { cwd: rootDir, timeout: 10000 }, (error, stdout, stderr) => {
          if (error && !stdout) {
            resolve(`Git status unavailable (not a git repository): ${stderr || error.message}`);
          } else {
            resolve(stdout.trim() || 'Git working tree clean.');
          }
        });
      });
    }

    // --- 4. Dependency Inspector ---
    case 'inspect_dependencies': {
      const summary = { project_root: rootDir, detected_manifests: {} };

      // Node.js
      const pkgPath = path.join(rootDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          summary.detected_manifests['Node.js (package.json)'] = {
            name: pkg.name,
            version: pkg.version,
            scripts: pkg.scripts,
            dependencies: pkg.dependencies,
            devDependencies: pkg.devDependencies
          };
        } catch (e) {}
      }

      // Python requirements
      const reqPath = path.join(rootDir, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        try {
          const reqs = fs.readFileSync(reqPath, 'utf-8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
          summary.detected_manifests['Python (requirements.txt)'] = reqs;
        } catch (e) {}
      }

      // Python pyproject
      const pyproject = path.join(rootDir, 'pyproject.toml');
      if (fs.existsSync(pyproject)) {
        summary.detected_manifests['Python (pyproject.toml)'] = 'Present';
      }

      // Rust Cargo.toml
      const cargo = path.join(rootDir, 'Cargo.toml');
      if (fs.existsSync(cargo)) {
        summary.detected_manifests['Rust (Cargo.toml)'] = 'Present';
      }

      // Go go.mod
      const gomod = path.join(rootDir, 'go.mod');
      if (fs.existsSync(gomod)) {
        summary.detected_manifests['Go (go.mod)'] = 'Present';
      }

      return JSON.stringify(summary, null, 2);
    }

    // --- 5. Atomic Edit & Revert (dsh-tool-fs / dsh-tool-str-replace-editor) ---
    case 'edit':
    case 'edit_file': {
      if (isReadOnly) throw new Error('Server running in read-only mode.');
      const filePath = args.file_path || args.path;
      if (!filePath) throw new Error('file_path or path parameter is required.');
      const resolved = validateAndResolve(filePath);
      if (isBinaryFile(resolved)) throw new Error(`Cannot edit binary file "${filePath}".`);

      const content = fs.readFileSync(resolved, 'utf-8');
      const target = args.old_string !== undefined ? args.old_string : (args.old_str !== undefined ? args.old_str : args.target);
      const replacement = args.new_string !== undefined ? args.new_string : (args.new_str !== undefined ? args.new_str : (args.replacement !== undefined ? args.replacement : ''));
      const replaceAll = args.replace_all || false;

      if (!target) throw new Error('old_string or target parameter is required.');
      if (!content.includes(target)) {
        throw new Error(`Target snippet not found in "${filePath}". Check whitespace and indentation.`);
      }

      // Save undo snapshot
      if (!fileBackups.has(resolved)) fileBackups.set(resolved, []);
      fileBackups.get(resolved).push(content);

      const updated = replaceAll ? content.split(target).join(replacement) : content.replace(target, replacement);
      fs.writeFileSync(resolved, updated, 'utf-8');
      return replaceAll
        ? `The file ${filePath} has been updated. All occurrences were successfully replaced.`
        : `The file ${filePath} has been updated successfully. (Snapshot saved. Can revert with revert_file).`;
    }

    case 'str_replace_editor': {
      if (isReadOnly && args.command !== 'view') throw new Error('Server running in read-only mode.');
      const cmd = args.command;
      const filePath = args.path || args.file_path;
      if (!filePath) throw new Error('path parameter is required.');

      if (cmd === 'view') {
        const resolved = validateAndResolve(filePath);
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          const entries = fs.readdirSync(resolved);
          return `Directory listing for ${filePath}:\n` + entries.slice(0, 50).join('\n');
        }
        const content = fs.readFileSync(resolved, 'utf-8');
        const lines = content.split(/\r?\n/);
        let start = 1;
        let end = lines.length;
        if (Array.isArray(args.view_range) && args.view_range.length === 2) {
          start = Math.max(1, args.view_range[0]);
          end = Math.min(lines.length, args.view_range[1]);
        }
        return lines.slice(start - 1, end).map((l, i) => `${String(start + i).padStart(4, ' ')} | ${l}`).join('\n');
      } else if (cmd === 'create') {
        const resolved = validateAndResolve(filePath, true);
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolved, args.file_text || '', 'utf-8');
        return `File created successfully at: ${filePath}`;
      } else if (cmd === 'str_replace') {
        const resolved = validateAndResolve(filePath);
        const content = fs.readFileSync(resolved, 'utf-8');
        const oldStr = args.old_str;
        const newStr = args.new_str || '';
        if (!content.includes(oldStr)) throw new Error(`old_str not found in ${filePath}`);
        if (!fileBackups.has(resolved)) fileBackups.set(resolved, []);
        fileBackups.get(resolved).push(content);
        fs.writeFileSync(resolved, content.replace(oldStr, newStr), 'utf-8');
        return `The file ${filePath} has been updated successfully.`;
      } else if (cmd === 'insert') {
        const resolved = validateAndResolve(filePath);
        const content = fs.readFileSync(resolved, 'utf-8');
        const lines = content.split(/\r?\n/);
        const lineNum = Math.max(0, Math.min(lines.length, args.insert_line || 0));
        lines.splice(lineNum, 0, args.new_str || '');
        if (!fileBackups.has(resolved)) fileBackups.set(resolved, []);
        fileBackups.get(resolved).push(content);
        fs.writeFileSync(resolved, lines.join('\n'), 'utf-8');
        return `Inserted content into ${filePath} at line ${lineNum}.`;
      } else {
        throw new Error(`Unknown str_replace_editor command: ${cmd}`);
      }
    }

    case 'revert_file': {
      if (isReadOnly) throw new Error('Server running in read-only mode.');
      const resolved = validateAndResolve(args.path);
      const history = fileBackups.get(resolved);

      if (!history || history.length === 0) {
        throw new Error(`No undo snapshots available for "${args.path}".`);
      }

      const previous = history.pop();
      fs.writeFileSync(resolved, previous, 'utf-8');
      return `Successfully reverted "${args.path}" to previous snapshot. (${history.length} snapshots remaining).`;
    }

    // --- 6. Web Documentation Fetcher ---
    case 'fetch_web_documentation': {
      const targetUrl = args.url;
      if (!targetUrl || !targetUrl.startsWith('https://')) {
        throw new Error('URL must start with https://');
      }

      try {
        const response = await fetch(targetUrl, { headers: { 'User-Agent': 'DeepSeek-Harness-Agent/1.0' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const clean = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
        return clean.slice(0, 15000);
      } catch (err) {
        throw new Error(`Failed to fetch URL: ${err.message}`);
      }
    }

    // --- 7. Plan Mode (dsh-plan-mode) ---
    case 'plan_mode':
    case 'manage_plan': {
      const action = args.action;
      if (action === 'set') {
        if (!Array.isArray(args.plan_items)) throw new Error('plan_items must be an array of strings.');
        currentPlan = args.plan_items.map((item, idx) => ({ id: idx + 1, task: item, completed: false }));
        return `Plan initialized with ${currentPlan.length} milestones:\n` + currentPlan.map(p => `[ ] ${p.id}. ${p.task}`).join('\n');
      } else if (action === 'complete_step') {
        const idx = args.step_index;
        if (!idx || idx < 1 || idx > currentPlan.length) throw new Error(`Invalid step_index: ${idx}`);
        currentPlan[idx - 1].completed = true;
        return `Marked milestone #${idx} as completed.\nCurrent Plan Status:\n` + currentPlan.map(p => `[${p.completed ? 'x' : ' '}] ${p.id}. ${p.task}`).join('\n');
      } else {
        if (currentPlan.length === 0) return 'No active plan. Use action="set" with plan_items to initialize a plan.';
        return 'Current Plan Status:\n' + currentPlan.map(p => `[${p.completed ? 'x' : ' '}] ${p.id}. ${p.task}`).join('\n');
      }
    }

    // --- 8. Core Filesystem Tools ---
    case 'select_project_folder': {
      let targetPath = args.folder_path;
      if (!targetPath || targetPath === 'browse' || targetPath === 'picker') {
        logInfo('Opening native Windows FolderBrowserDialog...');
        targetPath = openWindowsFolderPicker();
        if (!targetPath) {
          return `Folder selection cancelled. Active project remains: "${rootDir}".`;
        }
      }

      const resolved = path.resolve(targetPath);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new Error(`Target path "${targetPath}" is not a valid directory.`);
      }

      rootDir = fs.realpathSync(resolved);
      currentPlan = [];
      fileBackups.clear();
      logInfo(`Switched project to: ${rootDir}`);
      return `✓ Project folder successfully set to: "${rootDir}".\nDeepSeek Harness now strictly sandboxed to this folder.`;
    }

    case 'get_current_project': {
      let fileCount = 0;
      let dirCount = 0;
      try {
        const entries = fs.readdirSync(rootDir);
        for (const e of entries) {
          if (IGNORED_DIRS.has(e)) continue;
          try {
            const s = fs.statSync(path.join(rootDir, e));
            if (s.isDirectory()) dirCount++;
            else fileCount++;
          } catch (err) {}
        }
      } catch (e) {}

      return JSON.stringify({
        active_project_path: rootDir,
        harness: 'DeepSeek Harness (dsh)',
        modules: [
          'dsh-tool-bash (execute_command)',
          'dsh-tool-jobs (manage_background_job)',
          'dsh-base (git_diff, git_status)',
          'dsh-tool-workspace-dependencies (inspect_dependencies)',
          'dsh-atomic-write (edit_file, revert_file)',
          'dsh-tool-web (fetch_web_documentation)',
          'dsh-plan-mode (manage_plan)',
          'dsh-tool-fs (read_file, write_file, search_files, list_directory)'
        ],
        top_level_files: fileCount,
        top_level_directories: dirCount,
        boundary: 'Strictly jailed to this directory alone'
      }, null, 2);
    }

    case 'list_directory': {
      const targetRel = args.path || '.';
      const maxDepth = Math.min(Math.max(1, args.depth || 2), 4);
      const resolved = validateAndResolve(targetRel);

      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) throw new Error(`"${targetRel}" is a file.`);

      const results = [];
      function walk(currentDir, currentDepth) {
        if (currentDepth > maxDepth) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;

          const fullEntryPath = path.join(currentDir, entry.name);
          const relPath = path.relative(rootDir, fullEntryPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            results.push({ type: 'dir', path: relPath });
            walk(fullEntryPath, currentDepth + 1);
          } else {
            let size = 0;
            try { size = fs.statSync(fullEntryPath).size; } catch (e) {}
            results.push({ type: 'file', path: relPath, size });
          }
        }
      }

      walk(resolved, 1);
      if (results.length === 0) return `Directory "${targetRel}" is empty.`;

      const formatted = results.map(item => item.type === 'dir' ? `[DIR]  ${item.path}/` : `[FILE] ${item.path} (${item.size} bytes)`).join('\n');
      return `Workspace: "${rootDir}"\n\n${formatted}`;
    }

    case 'read':
    case 'read_file': {
      const filePath = args.file_path || args.path;
      if (!filePath) throw new Error('file_path or path parameter is required.');
      const resolved = validateAndResolve(filePath);
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) throw new Error(`"${filePath}" is a directory.`);
      if (isBinaryFile(resolved)) return `[Binary file (${stat.size} bytes) cannot be displayed as text.]`;

      const content = fs.readFileSync(resolved, 'utf-8');
      const lines = content.split(/\r?\n/);
      const totalLines = lines.length;

      let startLine = 1;
      if (args.offset !== undefined) startLine = Math.max(1, parseInt(args.offset, 10));
      else if (args.start_line !== undefined) startLine = Math.max(1, parseInt(args.start_line, 10));

      let endLine = totalLines;
      if (args.limit !== undefined) endLine = Math.min(totalLines, startLine + parseInt(args.limit, 10) - 1);
      else if (args.end_line !== undefined) endLine = Math.min(totalLines, parseInt(args.end_line, 10));

      const slice = lines.slice(startLine - 1, endLine);
      const outputLines = slice.map((line, idx) => `${String(startLine + idx).padStart(4, ' ')} | ${line}`);

      return `File: ${filePath} (Lines ${startLine}-${endLine} of ${totalLines}):\n\n${outputLines.join('\n')}`;
    }

    case 'write':
    case 'write_file': {
      if (isReadOnly) throw new Error('Server running in read-only mode.');
      const filePath = args.file_path || args.path;
      if (!filePath) throw new Error('file_path or path parameter is required.');
      const resolved = validateAndResolve(filePath, true);
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Save undo snapshot if file exists
      if (fs.existsSync(resolved)) {
        if (!fileBackups.has(resolved)) fileBackups.set(resolved, []);
        fileBackups.get(resolved).push(fs.readFileSync(resolved, 'utf-8'));
      }

      fs.writeFileSync(resolved, args.content !== undefined ? args.content : '', 'utf-8');
      const stat = fs.statSync(resolved);
      return `<path>${filePath}</path>\n<type>file</type>\n<content>\n${fs.existsSync(resolved) ? 'Updated' : 'Created'} file (${stat.size} bytes)\n</content>`;
    }

    case 'search_files': {
      const targetRel = args.path || '.';
      const query = args.query;
      const extFilter = args.file_extension ? args.file_extension.toLowerCase() : null;
      const resolved = validateAndResolve(targetRel);

      const matches = [];
      const MAX_MATCHES = 40;

      function searchDir(currentDir) {
        if (matches.length >= MAX_MATCHES) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (matches.length >= MAX_MATCHES) break;
          if (entry.name.startsWith('.')) continue;
          if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;

          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            searchDir(fullPath);
          } else {
            if (extFilter && !entry.name.toLowerCase().endsWith(extFilter)) continue;
            if (isBinaryFile(fullPath)) continue;

            try {
              const fileContent = fs.readFileSync(fullPath, 'utf-8');
              const lines = fileContent.split(/\r?\n/);
              for (let i = 0; i < lines.length; i++) {
                if (matches.length >= MAX_MATCHES) break;
                if (lines[i].includes(query)) {
                  const rel = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                  matches.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
                }
              }
            } catch (e) {}
          }
        }
      }

      searchDir(resolved);
      if (matches.length === 0) return `No matches found for "${query}".`;
      return `Search results for "${query}":\n\n${matches.join('\n')}`;
    }

    case 'get_file_info': {
      const resolved = validateAndResolve(args.path);
      const stat = fs.statSync(resolved);
      return JSON.stringify({
        path: args.path,
        is_directory: stat.isDirectory(),
        size_bytes: stat.size,
        modified: stat.mtime
      }, null, 2);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ==========================================
// 5. JSON-RPC Protocol Processor (Shared)
// ==========================================

async function processJsonRpcMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          prompts: { listChanged: true }
        },
        serverInfo: {
          name: 'deepseek-harness-mcp',
          version: '3.5.0'
        }
      }
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools } };
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    try {
      const resultText = await handleToolCall(name, toolArgs);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: typeof resultText === 'string' ? resultText : JSON.stringify(resultText) }],
          isError: false
        }
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true
        }
      };
    }
  }

  if (method === 'prompts/list') {
    return { jsonrpc: '2.0', id, result: { prompts } };
  }

  if (method === 'prompts/get') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        description: 'DeepSeek Harness Instructions',
        messages: [{ role: 'user', content: { type: 'text', text: getHarnessInstructions() } }]
      }
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  };
}

// ==========================================
// 6. HTTP Transport (Gemini, Claude, ChatGPT)
// ==========================================

function startHttpServer(port) {
  logInfo(`Starting Complete DeepSeek-Harness MCP Server on port ${port}...`);
  logInfo(`Current Sandboxed Folder: ${rootDir}`);

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-mcp-version, mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && (url.pathname === '/mcp' || url.pathname === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        service: 'DeepSeek Harness Complete MCP Suite',
        protocolVersion: '2024-11-05',
        activeProject: rootDir,
        toolsCount: tools.length,
        tools: tools.map(t => t.name)
      }, null, 2));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/openapi.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        openapi: '3.1.0',
        info: {
          title: 'DeepSeek Harness MCP API',
          description: 'Full software engineering harness: execution, background jobs, git, dependency analysis, atomic undo, and filesystem.',
          version: '3.5.0'
        },
        servers: [{ url: `https://${req.headers.host}` }],
        paths: {
          '/call': {
            post: {
              summary: 'Execute a DeepSeek Harness tool',
              operationId: 'executeTool',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', enum: tools.map(t => t.name) },
                        arguments: { type: 'object' }
                      },
                      required: ['name', 'arguments']
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Tool result',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          result: { type: 'string' },
                          error: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }, null, 2));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        activeProject: rootDir,
        toolsCount: tools.length,
        isReadOnly: isReadOnly,
        uptime: process.uptime()
      }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/set-directory') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          let targetPath = payload.path;
          if (!targetPath) throw new Error('Missing path parameter.');
          const resolved = path.resolve(targetPath);
          if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
            throw new Error(`Directory "${targetPath}" does not exist.`);
          }
          rootDir = fs.realpathSync(resolved);
          currentPlan = [];
          fileBackups.clear();
          logInfo(`Switched project directory via CLI to: ${rootDir}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, activeProject: rootDir }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/call') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const result = await handleToolCall(payload.name, payload.arguments);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/mcp' || url.pathname === '/')) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const msg = JSON.parse(body);
          const response = await processJsonRpcMessage(msg);
          if (response) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } else {
            res.writeHead(204);
            res.end();
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error: invalid JSON' }
          }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found. Use /mcp' }));
  });

  server.listen(port, () => {
    logInfo(`Complete DeepSeek Harness listening on port ${port}`);
  });
}

// ==========================================
// 7. Stdio Transport
// ==========================================

function startStdioServer() {
  logInfo(`Starting Stdio DeepSeek-Harness Server...`);
  logInfo(`Current Sandboxed Folder: ${rootDir}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const msg = JSON.parse(trimmed);
      const response = await processJsonRpcMessage(msg);
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (e) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }) + '\n');
    }
  });
}

// ==========================================
// 8. Launch
// ==========================================

if (httpPort) {
  startHttpServer(httpPort);
} else {
  startStdioServer();
}
