param([switch]$Lan, [int]$Port = 8765)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$vartaPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $vartaPython)) {
    throw 'Спочатку встановіть залежності за інструкцією README.md.'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) {
    throw 'Спочатку виконайте npm install та npm run build.'
}
Write-Host "Варта: http://localhost:$Port — зупинка Ctrl+C"
if ($Lan) {
    & $vartaPython -m backend --lan --port $Port
} else {
    & $vartaPython -m backend --port $Port
}
