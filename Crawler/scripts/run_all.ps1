# Requires PowerShell 5+
# Usage:
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

# Step 1: collect -> data/raw + data/json
Write-Host "[2/3] Rodando coletor (src.crawler_app.cli collect)" -ForegroundColor Cyan
python -m src.crawler_app.cli collect
if ($LASTEXITCODE -ne 0) { throw "Falha no coletor (crawler_app collect)" }

# Step 2: build DB -> data/db
Write-Host "[3/3] Construindo banco (src.crawler_app.cli build-db)" -ForegroundColor Cyan
python -m src.crawler_app.cli build-db
if ($LASTEXITCODE -ne 0) { throw "Falha ao construir o banco (crawler_app build-db)" }

Write-Host "✔ Concluído. JSONs em data/json e DB em data/db/gde_simple.db" -ForegroundColor Green
