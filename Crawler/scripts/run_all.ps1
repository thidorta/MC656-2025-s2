# Requires PowerShell 5+ (Windows 10+)
# Usage: Right-click → Run with PowerShell (or) in PS:
#   PS> ./scripts/run_all.ps1

$ErrorActionPreference = 'Stop'

# Resolve project root (folder containing this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')
Set-Location $ProjectRoot

# Virtualenv activation
$VenvActivate = Join-Path $ProjectRoot '.venv/Scripts/Activate.ps1'
if (-not (Test-Path $VenvActivate)) {
  Write-Error "Não encontrei $VenvActivate. Crie a venv: python -m venv .venv"
}

Write-Host "[1/3] Ativando venv: $VenvActivate" -ForegroundColor Cyan
. $VenvActivate

# Optional: show python
Write-Host "Python: " -NoNewline; python --version

# Step 1: enumerate → outputs/json
Write-Host "[2/3] Rodando coletor (enumerate_dimensions)" -ForegroundColor Cyan
python -m src.collectors.enumerate_dimensions
if ($LASTEXITCODE -ne 0) { throw "Falha no coletor (enumerate_dimensions)" }

# Step 2: build DB
Write-Host "[3/3] Construindo banco (build_simple_db)" -ForegroundColor Cyan
python -m src.tools.build_simple_db
if ($LASTEXITCODE -ne 0) { throw "Falha ao construir o banco (build_simple_db)" }

Write-Host "✅ Concluído. JSONs em outputs/json e DB em outputs/gde_simple.db" -ForegroundColor Green