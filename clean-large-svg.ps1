$ErrorActionPreference = "Stop"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Limpando Arquivos SVG Grandes" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$publicPath = "public"

$filesToRemove = @(
    "favicon.svg",
    "pwa-192x192.svg",
    "pwa-512x512.svg",
    "apple-touch-icon.svg"
)

$removedCount = 0

foreach ($file in $filesToRemove) {
    $filePath = Join-Path $publicPath $file
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "[OK] Removido: $file" -ForegroundColor Green
        $removedCount++
    }
}

if ($removedCount -eq 0) {
    Write-Host "[INFO] Nenhum arquivo SVG grande encontrado" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[SUCESSO] $removedCount arquivo(s) removido(s)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Os arquivos PNG ainda estao presentes e funcionais." -ForegroundColor Cyan
Write-Host ""
