param (
    [Parameter(Mandatory=$false)]
    [string]$ProjectDir = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $scriptDir "server.js"

if (-not (Test-Path $serverScript)) {
    Write-Host "[ERROR] server.js not found at $serverScript" -ForegroundColor Red
    exit 1
}

# Resolve canonical paths
$resolvedProject = (Resolve-Path $ProjectDir).Path
Write-Host "`n=== Secure Folder MCP: Universal Tunnel Configurator ===" -ForegroundColor Cyan
Write-Host "Sandboxing LLM to folder: $resolvedProject" -ForegroundColor Green
Write-Host "Server executable:       $serverScript" -ForegroundColor Gray

$claudeDir = Join-Path $env:APPDATA "Claude"
$configFile = Join-Path $claudeDir "claude_desktop_config.json"

if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
}

$config = @{ mcpServers = @{} }
if (Test-Path $configFile) {
    try {
        $raw = Get-Content -Raw -Path $configFile
        if ($raw.Trim()) {
            $parsed = ConvertFrom-Json $raw -AsHashtable
            if ($parsed.ContainsKey("mcpServers")) {
                $config = $parsed
            } else {
                $config["mcpServers"] = @{}
            }
        }
    } catch {
        Write-Host "[WARN] Existing config could not be parsed as JSON, backing up to claude_desktop_config.json.bak" -ForegroundColor Yellow
        Copy-Item $configFile "$configFile.bak" -Force
    }
}

# Add or update secure-folder entry
$config["mcpServers"]["secure-folder"] = @{
    command = "node"
    args = @(
        $serverScript,
        $resolvedProject
    )
}

$jsonOutput = ConvertTo-Json $config -Depth 10
Set-Content -Path $configFile -Value $jsonOutput -Encoding utf8

Write-Host "`n[OK] Claude Desktop configuration updated successfully!" -ForegroundColor Green
Write-Host "Config file: $configFile" -ForegroundColor Gray
Write-Host "`nNext Step: Restart Claude Desktop. You will see the tools icon with all 8 file tools enabled!`n" -ForegroundColor Yellow
