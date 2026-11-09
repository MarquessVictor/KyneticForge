<#
.SYNOPSIS
  Run every quality gate: backend lint + tests, frontend lint + typecheck + tests + build.
  Exits with a non-zero code if any step fails.
#>
# Tools write to stderr; failures are detected through $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
$Failures = @()

function Invoke-Step([string]$Name, [string]$Dir, [scriptblock]$Command) {
    Write-Host "==> $Name" -ForegroundColor Cyan
    Push-Location $Dir
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) { $script:Failures += $Name }
    } finally { Pop-Location }
}

$Backend = Join-Path $Root 'backend'
$Py = Join-Path $Backend '.venv\Scripts\python.exe'
$Frontend = Join-Path $Root 'frontend'

Invoke-Step 'backend: ruff check' $Backend { & $Py -m ruff check . }
Invoke-Step 'backend: ruff format --check' $Backend { & $Py -m ruff format --check . }
Invoke-Step 'backend: pytest' $Backend { & $Py -m pytest -q }
Invoke-Step 'frontend: eslint' $Frontend { npm run lint }
Invoke-Step 'frontend: prettier --check' $Frontend { npm run format:check }
Invoke-Step 'frontend: vitest' $Frontend { npm test }
Invoke-Step 'frontend: typecheck + build' $Frontend { npm run build }

if ($Failures.Count -gt 0) {
    Write-Host "FAILED: $($Failures -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host 'All checks passed.' -ForegroundColor Green
