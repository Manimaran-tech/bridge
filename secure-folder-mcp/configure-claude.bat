@echo off
setlocal
set "PROJECT_DIR=%~1"
if "%PROJECT_DIR%"=="" set "PROJECT_DIR=%CD%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-claude.ps1" -ProjectDir "%PROJECT_DIR%"
pause
