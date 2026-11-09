@echo off
rem Double-click to start KyneticForge Studio (backend + frontend) and open the browser.
title KyneticForge Studio
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\start.ps1" %*
pause
