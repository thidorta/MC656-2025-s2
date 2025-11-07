# Requires PowerShell 5+ (Windows 10+)
# Usage: Right-click -> Run with PowerShell (or) in PS:
#   PS> ./scripts/run_all.ps1

$ErrorActionPreference = 'Stop'

# Resolve project root (folder containing this script)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir '..')
Set-Location $ProjectRoot

$VenvDir = Join-Path $ProjectRoot '.venv'
$VenvActivate = Join-Path $VenvDir 'Scripts/Activate.ps1'
$RequirementsPath = Join-Path $ProjectRoot 'requirements.txt'

$RequiredDeps = @(
  @{ Import = 'dotenv'; Package = 'python-dotenv' }
  @{ Import = 'requests'; Package = 'requests' }
  @{ Import = 'bs4'; Package = 'beautifulsoup4' }
)

function Get-MissingPythonPackages {
  param (
    [Parameter(Mandatory = $true)]
    [array] $Deps
  )

  $missing = @()

  foreach ($dep in $Deps) {
    $importName = $dep.Import
    python -c "import importlib, sys; sys.exit(0) if importlib.util.find_spec('${importName}') else sys.exit(1)"
    if ($LASTEXITCODE -ne 0) {
      $missing += $dep.Package
    }
  }

  return ,$missing
}

$ShouldInstallDeps = $false

# Create the virtualenv if it does not exist
if (-not (Test-Path $VenvActivate)) {
  Write-Host "Creating virtualenv at $VenvDir" -ForegroundColor Cyan
  python -m venv $VenvDir
  if ($LASTEXITCODE -ne 0) { throw "Failed to create virtualenv at $VenvDir" }
  $ShouldInstallDeps = $true
}

Write-Host "[1/4] Activating venv: $VenvActivate" -ForegroundColor Cyan
. $VenvActivate

if ($ShouldInstallDeps) {
  Write-Host "[2/4] Installing dependencies" -ForegroundColor Cyan
  python -m pip install --upgrade pip
  if ($LASTEXITCODE -ne 0) { throw "Failed to upgrade pip" }

  if (Test-Path $RequirementsPath) {
    python -m pip install -r $RequirementsPath
    if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies from $RequirementsPath" }
  } else {
    $defaultPackages = $RequiredDeps | Select-Object -ExpandProperty Package | Sort-Object -Unique
    Write-Host "requirements.txt not found; installing default packages: $($defaultPackages -join ', ')" -ForegroundColor Yellow
    python -m pip install $defaultPackages
    if ($LASTEXITCODE -ne 0) { throw "Failed to install default dependencies ($($defaultPackages -join ', '))" }
  }
} else {
  Write-Host "[2/4] Checking dependencies" -ForegroundColor Cyan
  $missingPackages = Get-MissingPythonPackages -Deps $RequiredDeps
  if ($missingPackages.Count -gt 0) {
    Write-Host "Installing missing packages: $($missingPackages -join ', ')" -ForegroundColor Yellow
    python -m pip install $missingPackages
    if ($LASTEXITCODE -ne 0) { throw "Failed to install missing dependencies ($($missingPackages -join ', '))" }
  } else {
    Write-Host "Dependencies already satisfied." -ForegroundColor Green
  }
}

# Optional: show python version
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
# Step 1: enumerate -> outputs/json
Write-Host "[3/4] Running collector (enumerate_dimensions)" -ForegroundColor Cyan
python -m src.collectors.enumerate_dimensions
if ($LASTEXITCODE -ne 0) { throw "Collector enumerate_dimensions failed" }

# Step 2: build DB -> data/db
Write-Host "[4/4] Building database (crawler_app build-db)" -ForegroundColor Cyan
python -m src.crawler_app.cli build-db
if ($LASTEXITCODE -ne 0) { throw "Database build failed (crawler_app build-db)" }

Write-Host "Done. JSON files in outputs/json and DB in outputs/gde_simple.db" -ForegroundColor Green
