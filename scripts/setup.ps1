<#
.SYNOPSIS
  One-time setup of KyneticForge Studio on Windows 11.

.DESCRIPTION
  1. Finds Python 3.12+ (py launcher or PATH). If none is found, installs a
     project-local CPython 3.12 into .tooling\ using uv (nothing outside the
     project folder is modified).
  2. Creates backend\.venv and installs the backend with dev tools.
  3. Installs the frontend dependencies with npm.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
#>
# Native tools write progress to stderr; failures are detected through $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Tooling = Join-Path $Root '.tooling'

function Test-Python312([string]$exe, [string[]]$prefix = @()) {
    try {
        $out = & $exe @prefix -c "import sys; print('KF-OK' if sys.version_info >= (3, 12) else 'KF-OLD')" 2>$null
        return ($out -join '') -match 'KF-OK'
    } catch { return $false }
}

function Assert-Success([string]$what) {
    if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: $what failed." -ForegroundColor Red; exit 1 }
}

function Get-PythonPath([string]$exe, [string[]]$prefix = @()) {
    return (& $exe @prefix -c "import sys; print(sys.executable)").Trim()
}

Write-Host '==> Locating Python 3.12+' -ForegroundColor Cyan
$Python = $null
if ((Get-Command py -ErrorAction SilentlyContinue) -and (Test-Python312 'py' @('-3.12'))) {
    $Python = Get-PythonPath 'py' @('-3.12')
} elseif ((Get-Command python -ErrorAction SilentlyContinue) -and (Test-Python312 'python')) {
    $Python = Get-PythonPath 'python'
}

$Uv = $null
if (-not $Python) {
    Write-Host '    Python 3.12+ not found. Installing a project-local copy in .tooling\ ...' -ForegroundColor Yellow
    $Bootstrap = Join-Path $Tooling 'bootstrap'
    $Uv = Join-Path $Bootstrap 'Scripts\uv.exe'
    if (-not (Test-Path $Uv)) {
        $AnyPython = Get-Command python -ErrorAction SilentlyContinue
        if (-not $AnyPython) {
            Write-Host 'ERROR: No Python found. Install Python 3.12+ (https://www.python.org/downloads/ or "winget install Python.Python.3.12") and re-run.' -ForegroundColor Red
            exit 1
        }
        & python -m venv $Bootstrap
        Assert-Success 'Creating the bootstrap environment'
        & (Join-Path $Bootstrap 'Scripts\python.exe') -m pip install --quiet uv
        Assert-Success 'Installing uv'
    }
    $env:UV_PYTHON_INSTALL_DIR = Join-Path $Tooling 'python'
    $env:UV_CACHE_DIR = Join-Path $Tooling 'uv-cache'
    & $Uv python install 3.12 --no-bin
    Assert-Success 'Installing Python 3.12'
    $Python = ((& $Uv python find 3.12 --managed-python) -join '').Trim()
}
Write-Host "    Using $Python"

Write-Host '==> Creating backend virtual environment' -ForegroundColor Cyan
$Backend = Join-Path $Root 'backend'
$VenvPython = Join-Path $Backend '.venv\Scripts\python.exe'
if (-not (Test-Path $VenvPython)) {
    & $Python -m venv (Join-Path $Backend '.venv')
    Assert-Success 'Creating backend\.venv'
}
# Virtual environments created by uv do not ship pip; bootstrap it if missing.
& $VenvPython -m pip --version 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    & $VenvPython -m ensurepip --upgrade 2>$null | Out-Null
    Assert-Success 'Bootstrapping pip'
}
& $VenvPython -m pip install --quiet --disable-pip-version-check -e "$Backend[dev]"
Assert-Success 'Backend dependency installation'

Write-Host '==> Installing frontend dependencies' -ForegroundColor Cyan
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'ERROR: npm not found. Install Node.js 20.19+ or 22.12+ (https://nodejs.org) and re-run.' -ForegroundColor Red
    exit 1
}
Push-Location (Join-Path $Root 'frontend')
try {
    if (Test-Path 'package-lock.json') { npm ci --no-audit --no-fund } else { npm install --no-audit --no-fund }
    Assert-Success 'Frontend dependency installation'
} finally { Pop-Location }

Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host '  Backend : powershell -ExecutionPolicy Bypass -File scripts\dev-backend.ps1'
Write-Host '  Frontend: powershell -ExecutionPolicy Bypass -File scripts\dev-frontend.ps1'
Write-Host '  Tests   : powershell -ExecutionPolicy Bypass -File scripts\test.ps1'
