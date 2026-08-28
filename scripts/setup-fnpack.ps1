# Download official fnOS fnpack (Windows amd64) into <repo>/tools/
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-fnpack.ps1

$ErrorActionPreference = 'Stop'
$Version = '1.2.3'
$Url = "https://static2.fnnas.com/fnpack/fnpack-${Version}-windows-amd64"
$ToolsDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'tools'
$Dest = Join-Path $ToolsDir 'fnpack.exe'

New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

Write-Host "==> Downloading fnpack v${Version} (Windows amd64)"
Write-Host "    from: $Url"
Write-Host "    to:   $Dest"

Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing

if (-not (Test-Path $Dest)) {
    Write-Error "Download failed: $Dest does not exist"
}
$size = (Get-Item $Dest).Length
if ($size -lt 1000000) {
    Write-Error "Downloaded file too small ($size bytes); not a valid binary"
}
Write-Host "    size: $size bytes"

Write-Host "==> Verifying"
& $Dest --help 2>&1 | Select-Object -First 5

Write-Host ""
Write-Host "==> Done. Next, from Git Bash run:"
Write-Host "    MIYIN_VERSION=1.0.0 REQUIRE_FNPACK=1 FNPACK_OUT_DIR='C:\Users\Administrator\Desktop\installer' bash packaging/fnos/scripts/build-fpk.sh"
