Rotación de claves y limpieza del repositorio

Resumen
- Debes rotar las claves encontradas en el repositorio (.env y supabase/pagadito).
- Después de rotar, si quieres eliminar rastros históricos, hay que purgar el historial git (destructivo).

Pasos recomendados

1. Rotar claves inmediatas (dashboard)
   - Supabase:
     1. Entra a la consola de Supabase > Settings > API.
     2. Rota el Anon key y la Service Role key si están comprometidas.
     3. Guarda las nuevas claves en el secreto de CI (GitHub Actions Secrets) como SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
   - Pagadito:
     1. En tu panel de Pagadito (sandbox o producción) genera nuevas credenciales si las viejas estaban en el repo.
     2. Actualiza las variables en Supabase Edge Functions (Deno env) y en los secretos de CI.

2. Actualizar secretos en GitHub (o tu CI)
   - Ve a Settings > Secrets > Actions y actualiza los valores.
   - También actualiza cualquier runner/env que use estas variables.

3. Marcar el repositorio local como limpio
   - Asegúrate de que .env no esté en el index:
     git rm --cached .env || true
     git commit -m "chore: stop tracking .env"

4. (Opcional, destructivo) Purgar historial git para eliminar secretos antiguos
   - Yo puedo preparar los comandos; DEBES coordinar con colaboradores porque esto reescribe la historia.
   - Recomendado flujo con git-filter-repo (más rápido/robusto que BFG):
     git clone --mirror <repo-url> repo.git
     cd repo.git
     git filter-repo --invert-paths --paths .env --force
     git push --force --all
     git push --force --tags

   - Alternativa BFG: se puede usar pero requiere Java y pasos adicionales.

5. Validar
   - Ejecuta gitleaks en la rama principal localmente: gitleaks detect --source .
   - Confirma que no quedan secretos.

Notas
- No ejecutes la purga hasta que todos los colaboradores estén preparados (cambios abranches, PRs, CI tokens, etc.).
- Si necesitas, preparo un script PowerShell que detecte commits donde aparece el patrón de la clave y genere un reporte.

