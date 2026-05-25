<#
PowerShell helper: busca en los commits entradas que contengan patrones peligrosos
No modifica la historia; solo genera un reporte.
#>
param(
  [string]$RepoPath = ".",
  [string[]]$Patterns = @('VITE_SUPABASE_ANON_KEY', 'PAGADITO_WSK', 'PAGADITO_UID')
)

Set-Location -LiteralPath $RepoPath

Write-Host "Scanning commits for potential secret patterns..."

foreach ($p in $Patterns) {
  Write-Host "\nPattern: $p"
  git log --all -S $p --pretty=format:"%C(yellow)%h%Creset %C(green)%ad%Creset %s" --date=short | Select-Object -First 50
}

Write-Host "\nAlso running gitleaks detect (if installed)..."
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
  gitleaks detect --source . --report-format json --report-path secrets-report.json
  Write-Host "gitleaks report saved to secrets-report.json"
} else {
  Write-Host "gitleaks not found. Install from https://github.com/zricethezav/gitleaks"
}
