$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = Resolve-Path (Join-Path $ScriptDir '..')
Set-Location $BackendRoot

$VenvActivate = Join-Path $BackendRoot '.venv/Scripts/Activate.ps1'

if (-not (Test-Path $VenvActivate)) {
    Write-Host "Virtualenv not found at $VenvActivate" -ForegroundColor Red
    exit 1
}

. $VenvActivate

Write-Host "Running pytest..." -ForegroundColor Cyan
python -m pytest @args
