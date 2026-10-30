# Contrato + esqueleto `save_patient` (v2 — listo para implementar)

**Estado:** SQL + cliente cableados. Smoke en `scripts/smoke_save_patient.sql` + `scripts/smoke_approve_rpc.sql`.  
**No aplicar a prod** hasta que ambos smokes pasen en proyecto desechable.  
**REVOKE direct writes** (`20261029240001_…`) solo después del cutover desplegado.

## Decisiones (ajustes post-revisión)

| Tema | Decisión |
|---|---|
| Concurrencia | `patients.version int` → conflicto `DL412` |
| Alta concurrente mismo id | **INSERT plano** (sin `ON CONFLICT`); `unique_violation` en pkey → **`DL412`**. Update va por `UPDATE … AND version = p_expected_version` |
| Guardado parcial | `jsonb_has` (clave presente y ≠ json null). Ausente = no tocar. `""` → NULL vía `nullif` |
| `null` JSON explícito | **`DL400`** (no limpiar en silencio). Limpiar texto = `""` |
| `fullName` presente y vacío tras `btrim` | **`DL400`** (alta y update) |
| Forma | `identification` / `clinicalHistory` / `collections` = object; `allergies` = array; colección = objeto con `items`/`removedIds`; disjuntos; máx 500 |
| Colecciones | upsert + `removedIds` únicamente (7 iguales) |
| `[]` sin removedIds | no-op de borrado |
| Upsert subtablas | `ON CONFLICT DO UPDATE … WHERE doctor_id = v_clinic AND patient_id = v_pid AND deleted_at IS NULL`; filas afectadas ≠ enviadas → **`DL404`** |
| Soft-deleted + upsert | **`DL413`** (paciente o subfila) |
| removedIds ajeno | 0 filas OK; respuesta `removed` / `ignored` |
| Columnas | lista explícita; nunca `jsonb_populate_record` completo |
| Colección denegada por rol | **`DL403`** (no omitir en silencio) |
| Alta: `version` null + id ya existe | **`DL412`** |
| Payments | soft delete + `deleted_by`; amount/date/method inmutables para recepción |
| FK payments↔budget | **no existe** en el schema actual |
| Camino viejo | `savePatientLegacy` mientras flag ≠ true (wipe `[]`+loaded). **Reloj 14 días** empieza solo tras smoke limpio → then flag on en prod. **Retiro:** ≥7 días on + DL* en Sentry/rpc_events (no sessionStorage) sin anómalos + REVOKE → borrar legacy. `rpcMetrics` = solo dev |
| Camino viejo (revoke DB) | REVOKE writes authenticated **después** del cutover del cliente (migración hermana) |
| Smoke extra | 2 altas concurrentes → 2ª DL412; fullName `""` → DL400 + nombre intacto; parciales; null → DL400; recep payments intacto+nuevo |
| Límite conocido | Máx **500** items / removedIds por colección y guardado (`DL400`). Motivo concreto para patches por-id más adelante |
| Colección dirty | Se reenvía el lote completo de esa colección; `version` cubre carrera entre clientes RPC. Escritores fuera de RPC → REVOKE cutover |

### Matriz de escritura

| Recurso | owner | admin | assistant | receptionist |
|---|---|---|---|---|
| `patients` (identidad) | ✓ | ✓ | ✓ | ✓ |
| `patient_clinical` | ✓ | ✓ | ✓ | ✗ → DL403 si viene en payload |
| notes / events / consents / rx | ✓ | ✓ | ✓ | ✗ |
| lab_works | ✓ | ✓ | ✓ | ✓ |
| budget / payments (crear/editar permitidos) | ✓ | ✓ | ✗ | ✓ |
| payments: borrar / cambiar amount\|date\|method | ✓ | ✓ | ✗ | ✗ |

### Códigos

| SQLSTATE | Significado |
|---|---|
| `DL400` | forma jsonb inválida / tope tamaño / items∩removedIds |
| `DL403` | rol / auth |
| `DL404` | upsert no tocó fila (otra clínica/paciente) |
| `DL412` | versión stale o alta con id ya existente |
| `DL413` | intento de upsert sobre soft-deleted |

Retorno distingue `written` / `skipped` (ausente) — denegada no aparece en skipped: aborta con DL403.

---

## Esqueleto operativo (orden)

1. Auth + clinic + role  
2. Validar forma mínima del jsonb  
3. `FOR UPDATE` paciente si existe  
4. Reglas version / alta  
5. Upsert `patients` (columnas identity) + bump version  
6. `patient_clinical` si clave presente (o bloque clinical en root)  
7. Loop colecciones presentes: validate role → soft-delete removedIds → check DL413 → batch upsert → contar filas  
8. Return `{ patient_id, version, written, skipped, removed, ignored }`  
9. Cualquier excepción aborta **toda** la TX (sin EXCEPTION que trague)

Ver SQL completo en la migración.
