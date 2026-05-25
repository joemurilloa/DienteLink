Purgado de historial: checklist

- [ ] Coordina con todos los colaboradores: nadie debe hacer push durante la operación.
- [ ] Haz backup del repo (git clone --mirror).
- [ ] Rota todas las claves comprometidas (Supabase, Pagadito, otros).
- [ ] Ejecuta el script de purga en un clone espejo y revisa los refs.
- [ ] Fuerza el push: git push --force --all y git push --force --tags
- [ ] Después del push, obliga a los colaboradores a reclonar o a rebase / reset de sus ramas.
- [ ] Ejecuta gitleaks detect en el remote y localmente para confirmar.

Si quieres, puedo generar un PR con estos documentos y scripts y preparar los comandos listos para ejecutar cuando des permiso.
