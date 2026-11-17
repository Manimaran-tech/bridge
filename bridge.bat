@echo off
title Bridge - Universal Local-to-Web AI Harness
mode con: cols=100 lines=30 >nul 2>&1
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v FaceName /t REG_SZ /d "Courier New" /f >nul 2>&1
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v FontSize /t REG_DWORD /d 0x00120000 /f >nul 2>&1
cd /d "%~dp0"
node bridge.js --launch %*
echo.
pause
