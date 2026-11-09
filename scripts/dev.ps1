<#
.SYNOPSIS
  Development mode: backend (auto-reload) + Vite dev server (hot reload) together.

.DESCRIPTION
  For working on the code. Starts the FastAPI backend (port 8000, reloads on
  Python changes) and the Vite dev server (port 5173, hot reload) in this console,
  waits until both answer, then opens http://localhost:5173.
  Press Ctrl+C (or close the window) to stop both.
  To simply USE the app, run KyneticForge.bat / scripts\start.ps1 instead.

.PARAMETER NoBrowser
  Do not open the browser automatically.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
#>
param([switch]$NoBrowser)

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$VenvPython = Join-Path $Backend '.venv\Scripts\python.exe'
$AppUrl = 'http://localhost:5173'
$HealthUrl = 'http://127.0.0.1:8000/api/v1/health'

function Stop-Tree($proc) {
    if ($proc -and -not $proc.HasExited) {
        # /T also stops child processes (node spawned by npm, etc.).
        & taskkill.exe /PID $proc.Id /T /F 2>$null | Out-Null
    }
}

function Test-Port([int]$Port) {
    # A successful TCP connection means something is already listening on the port.
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        return $client.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

function Wait-Url([string]$Url, [int]$TimeoutSec, $Proc) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ($Proc.HasExited) { return $false }
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch { Start-Sleep -Milliseconds 400 }
    }
    return $false
}

# --- Pre-flight checks --------------------------------------------------------------
if (-not (Test-Path $VenvPython) -or -not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Write-Host 'Dependencies not installed yet - running setup first...' -ForegroundColor Yellow
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup.ps1')
    if ($LASTEXITCODE -ne 0) { Write-Host 'Setup failed.' -ForegroundColor Red; exit 1 }
}
foreach ($port in 8000, 5173) {
    if (Test-Port $port) {
        Write-Host "Port $port is already in use. Is KyneticForge already running? Close it and try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ''
Write-Host '  KyneticForge Studio v0.1.0 - development mode' -ForegroundColor Cyan
Write-Host '  Starting backend and frontend... (Ctrl+C to stop)' -ForegroundColor DarkGray
Write-Host ''

$backendProc = $null
$frontendProc = $null
try {
    $backendProc = Start-Process -FilePath $VenvPython -WorkingDirectory $Backend -NoNewWindow -PassThru `
        -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload', '--log-level', 'warning'
    $frontendProc = Start-Process -FilePath 'npm.cmd' -WorkingDirectory $Frontend -NoNewWindow -PassThru `
        -ArgumentList 'run', 'dev', '--', '--clearScreen', 'false', '--logLevel', 'warn'

    if (-not (Wait-Url $HealthUrl 60 $backendProc)) { throw 'The backend did not start (see the messages above).' }
    Write-Host '  [ok] Backend  http://127.0.0.1:8000  (API docs: /docs)' -ForegroundColor Green
    if (-not (Wait-Url $AppUrl 60 $frontendProc)) { throw 'The frontend did not start (see the messages above).' }
    Write-Host "  [ok] Frontend $AppUrl" -ForegroundColor Green
    Write-Host ''
    Write-Host '  KyneticForge Studio is running. Press Ctrl+C to stop.' -ForegroundColor Cyan

    if (-not $NoBrowser) { Start-Process $AppUrl }

    # Keep running until either server exits (or the user presses Ctrl+C).
    while (-not $backendProc.HasExited -and -not $frontendProc.HasExited) {
        Start-Sleep -Milliseconds 500
    }
    if ($backendProc.HasExited) { Write-Host 'The backend stopped unexpectedly.' -ForegroundColor Red }
    if ($frontendProc.HasExited) { Write-Host 'The frontend stopped unexpectedly.' -ForegroundColor Red }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Write-Host 'Stopping KyneticForge Studio...' -ForegroundColor DarkGray
    Stop-Tree $frontendProc
    Stop-Tree $backendProc
}
