<#
.SYNOPSIS
  Open KyneticForge Studio as a normal application (one process, one port).

.DESCRIPTION
  1. Installs dependencies on the first run (scripts\setup.ps1).
  2. Builds the web interface (frontend\dist) if it is missing or outdated.
  3. Runs `python -m app`: FastAPI serves the API and the interface on
     http://127.0.0.1:8000 and the browser opens automatically.
  Press Ctrl+C (or close the window) to stop.

.PARAMETER NoBrowser
  Do not open the browser automatically.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\start.ps1
#>
param([switch]$NoBrowser)

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$VenvPython = Join-Path $Backend '.venv\Scripts\python.exe'
$DistIndex = Join-Path $Frontend 'dist\index.html'

function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        return $client.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

function Test-FrontendOutdated {
    if (-not (Test-Path $DistIndex)) { return $true }
    $built = (Get-Item $DistIndex).LastWriteTime
    $sources = @(
        Get-ChildItem (Join-Path $Frontend 'src') -Recurse -File
        Get-ChildItem (Join-Path $Frontend 'public') -Recurse -File -ErrorAction SilentlyContinue
        Get-Item (Join-Path $Frontend 'index.html'), (Join-Path $Frontend 'package.json'), (Join-Path $Frontend 'vite.config.ts')
    )
    return [bool]($sources | Where-Object { $_.LastWriteTime -gt $built } | Select-Object -First 1)
}

# 1. Dependencies
if (-not (Test-Path $VenvPython) -or -not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Write-Host 'Primeira execucao: instalando dependencias...' -ForegroundColor Yellow
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup.ps1')
    if ($LASTEXITCODE -ne 0) { Write-Host 'A instalacao falhou.' -ForegroundColor Red; exit 1 }
}

# 2. Web interface
if (Test-FrontendOutdated) {
    Write-Host 'Gerando a interface (frontend\dist)...' -ForegroundColor Yellow
    Push-Location $Frontend
    try { npm run build --silent } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Host 'Falha ao gerar a interface.' -ForegroundColor Red; exit 1 }
}

# 3. Run
if (Test-Port 8000) {
    Write-Host 'A porta 8000 ja esta em uso. O KyneticForge ja esta aberto? Feche-o e tente de novo.' -ForegroundColor Red
    exit 1
}
$appArgs = @('-m', 'app')
if ($NoBrowser) { $appArgs += '--no-browser' }
Push-Location $Backend
try { & $VenvPython @appArgs } finally { Pop-Location }
