@echo off
setlocal
set "PROJECT_DIR=%~1"
if "%PROJECT_DIR%"=="" set "PROJECT_DIR=%CD%"

echo ========================================================
echo   Starting Secure Folder MCP (Web Bridge Mode)
echo ========================================================
echo Sandboxed Directory: %PROJECT_DIR%
echo HTTP Endpoint:       http://localhost:3000
echo OpenAPI Schema:      http://localhost:3000/openapi.json
echo.
echo Ready for Web Chatbots (ChatGPT, Claude, DeepSeek, Gemini)!
echo Press Ctrl+C to stop.
echo ========================================================
echo.

node "%~dp0server.js" "%PROJECT_DIR%" --http 3000
pause
