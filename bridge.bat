@echo off
title Bridge - Universal Local-to-Web AI Harness
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v FaceName /t REG_SZ /d "Courier New" /f >nul 2>&1
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v FontSize /t REG_DWORD /d 0x00120000 /f >nul 2>&1
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v ScreenBufferSize /t REG_DWORD /d 0x23290096 /f >nul 2>&1
reg add "HKCU\Console\Bridge - Universal Local-to-Web AI Harness" /v WindowSize /t REG_DWORD /d 0x00280096 /f >nul 2>&1
cd /d "%~dp0"
node bridge.js --launch %*
echo.
pause
