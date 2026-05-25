<#
Genera comandos para purgar .env del historial usando git-filter-repo.
NO ejecuta nada por ti — solo imprime los pasos.
#>
param(
  [string]$RepoUrl = "origin",
  [string]$MirrorDir = "repo.git"
)

Write-Host "1) Clona espejo (mirror):"
Write-Host "   git clone --mirror $RepoUrl $MirrorDir"

Write-Host "2) Entra al espejo y ejecuta git-filter-repo para eliminar .env:"
Write-Host "   cd $MirrorDir"
Write-Host "   git filter-repo --invert-paths --paths .env --force"

Write-Host "3) Push forzado al remote (esto reescribe historia):"
Write-Host "   git push --force --all"
Write-Host "   git push --force --tags"

Write-Host "Notas: comunica a colaboradores, prepara un backup y rota claves antes de forzar push."
