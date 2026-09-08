param (
    [switch]$SkipBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\scripts\verify-smoke.ps1 [-SkipBuild]"
    exit 0
}

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Set-Location $RootDir
Write-Host "=== YoWebDocPreview Smoke Verification ==="

Write-Host "`n[Step 0/5] Check Node & pnpm environment..."
$nodeVersion = node -v
$pnpmVersion = pnpm -v
Write-Host "Node: $nodeVersion, pnpm: $pnpmVersion"

Write-Host "`n[Step 1/5] Check UI dependency discipline..."
Set-Location "$RootDir\ui"
& pnpm lint:deps
if ($LASTEXITCODE -ne 0) {
    Write-Error "UI dependency check failed"
    exit 1
}

Write-Host "`n[Step 2/5] Run UI typecheck, tests, and build..."
& pnpm typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Error "UI typecheck failed"
    exit 1
}

& pnpm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "UI vitest tests failed"
    exit 1
}

if (-not $SkipBuild) {
    & pnpm build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "UI build failed"
        exit 1
    }
}

Set-Location $RootDir
$CargoRunner = Join-Path $RootDir "run_msvc_cargo.bat"

Write-Host "`n[Step 3/5] Test Rust Core crates (zero Tauri)..."
& cmd /c "$CargoRunner test -p yohu-protocol -p yohu-domain -p yohu-runtime -p yohu-source -p yohu-library"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Rust core tests failed"
    exit 1
}

Write-Host "`n[Step 4/5] Run R4 golden parity & baseline gate..."
& cmd /c "$CargoRunner test -p yohu-md-convert --test golden"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Golden gate test failed"
    exit 1
}

Write-Host "`n[Step 5/5] Check Tauri app composition root..."
& cmd /c "$CargoRunner check -p yohu-docpreview"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri check failed"
    exit 1
}

Write-Host "`n=== Smoke verification passed successfully! ==="
