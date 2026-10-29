# DienteLink — Base de datos

El esquema oficial está en `supabase/migrations/20261029071346_baseline_public.sql`.
Es una foto del esquema `public` que ya está en producción, sin datos de pacientes.
Esa versión ya quedó marcada como aplicada. No se vuelve a ejecutar en el proyecto en vivo.

A partir de aquí, cada cambio de esquema es un archivo nuevo en `supabase/migrations/` y se aplica con:

```
npx supabase db push
```

`db push` solo corre migraciones que todavía no están en el historial. El baseline no se vuelve a aplicar.

Los archivos de esta carpeta `database/` son archivo histórico. No los vuelvas a pegar en el SQL Editor de una base que ya funciona: un script viejo puede pisar una función o una política más nueva.

Las políticas de Storage no están en el baseline. El rol de la CLI no puede leer ese esquema. Siguen aplicadas en producción. En un proyecto nuevo hay que revisar `supabase_storage_receipts.sql` y `phase1_access_hardening.sql`.

---

---

## Archivo histórico

Este orden sirvió para construir la base a mano. No es el camino para una instalación nueva ni para el proyecto que ya está en producción. La instalación nueva parte del baseline de `supabase/migrations`.

### Fase 1: Esquema base
| # | Archivo | Descripción |
|---|---------|-------------|
| 01 | `supabase_schema.sql` | Crea las 12 tablas principales + índices |
| 02 | `migration_appointments.sql` | Agrega columnas extra a `appointments` (reminder_scheduled_at, etc.) |
| 03 | `patient_anamnesis_fields.sql` | Agrega columnas de anamnesis a `patients` (blood_type, smoker, etc.) |
| 04 | `setup_lab_works.sql` | Agrega tabla `lab_works` |

### Fase 2: Seguridad y acceso
| # | Archivo | Descripción |
|---|---------|-------------|
| 05 | `supabase_rls.sql` | RLS básico multi-tenant + función `get_my_clinic_id()` |
| 06 | `supabase_roles_migration.sql` | Sistema de roles (owner/admin/assistant/receptionist) |
| 07 | `supabase_strict_rls.sql` | RBAC estricto — reemplaza las políticas del paso 05 |
| 08 | `supabase_security_fixes.sql` | Parches de seguridad adicionales |
| 09 | `lock_roles_and_public_requests.sql` | Bloquea escalado de roles y restricciones de acceso público |
| 10 | `critical_access_fixes.sql` | Restricciones críticas: expediente, enlace público, acceso por plan |
| 11 | `security_review_fixes.sql` | Fixes tras auditoría de seguridad |

### Fase 3: Suscripciones y billing
| # | Archivo | Descripción |
|---|---------|-------------|
| 12 | `supabase_subscriptions.sql` | Tabla `subscriptions` v1 |
| 13 | `supabase_subscriptions_v2.sql` | Vista `subscription_status` + mejoras v2 |
| 14 | `create_trial_trigger.sql` | Trigger que crea el trial de 14 días al registrarse |
| 15 | `supabase_subscription_cron.sql` | Cron job que marca suscripciones como expiradas |
| 16 | `paid_beta_access.sql` | Tabla `payment_receipts` para acceso de pago manual |
| 17 | `supabase_storage_receipts.sql` | Políticas de Storage para comprobantes de pago |
| 18 | `payment_receipt_provisional_access.sql` | Acceso provisional mientras se revisa el comprobante |
| 19 | `supabase_admin_billing.sql` | Vistas y funciones de administración de facturación |
| 20 | `receipts_email_only.sql` | Restricción: solo el email del dueño puede subir comprobantes |

### Fase 4: Funcionalidades
| # | Archivo | Descripción |
|---|---------|-------------|
| 21 | `supabase_team_invitations.sql` | Tabla `team_invitations` + políticas de equipo |
| 22 | `supabase_public_booking_rpc.sql` | RPCs para la página de reservas pública (`get_public_doctor_availability`, etc.) |
| 23 | `supabase_anti_spam.sql` | Rate limiting para solicitudes de reserva pública |
| 24 | `notifications_setup.sql` | Tabla `notifications` para el centro de notificaciones |

### Fase 5: Correcciones puntuales (ya aplicados en producción)
| # | Archivo | Estado |
|---|---------|--------|
| 25 | `fix_status_constraint.sql` | ✅ Aplicado |
| 26 | `reject_past_requests.sql` | ✅ Aplicado |
| 27 | `admin_reject_pending_receipt.sql` | ✅ Aplicado |
| 28 | `receipt_resubmit_pending.sql` | ✅ Aplicado |
| 29 | `remove_whatsapp_cron.sql` | ✅ Aplicado |

### Fase 6: Endurecimiento (pegar en un proyecto que ya existe)
| # | Archivo | Descripción |
|---|---------|-------------|
| 30 | `phase1_access_hardening.sql` | Bucket de comprobantes privado y lectura de pagos/presupuestos solo para owner y admin |
| 31 | `phase2_schema_consolidation.sql` | Funciones públicas con search_path y plan vigente. Roles solo owner, admin, assistant, receptionist |
| 32 | `phase3_price_catalog.sql` | Catálogo de precios sincronizado en Postgres para toda la clínica con RLS |
| 33 | `phase4_user_notifications.sql` | Avisos de la app por usuario, con RLS |
| 34 | `phase5_public_booking_hardening.sql` | La página pública ya no ve el id de la solicitud. Solo bloquean hueco las citas Programada de hoy en adelante. El aviso por correo exige secreto en Vault |
| 35 | `phase6_clinical_read.sql` | Notas, eventos, recetas y consentimientos los leen solo owner, admin y assistant |
| 36 | `phase7_trial_from_database.sql` | Toda clínica dueña tiene fila de suscripción. Sin fila no hay prueba. El vencimiento lo escribe la base |

---

## 🔴 Operaciones destructivas

> [!CAUTION]
> Los scripts de Fase 2 ejecutan `DROP POLICY IF EXISTS` antes de `CREATE POLICY`. Si ya tienes políticas personalizadas, serán eliminadas. Revisa el contenido antes de ejecutar en producción.

---

## Checklist histórico

Estos pasos ya quedaron absorbidos por el baseline. No los marques ni los vuelvas a correr en producción.

```
[ ] 01 supabase_schema.sql
[ ] 02 migration_appointments.sql
[ ] 03 patient_anamnesis_fields.sql
[ ] 04 setup_lab_works.sql
[ ] 05 supabase_rls.sql
[ ] 06 supabase_roles_migration.sql
[ ] 07 supabase_strict_rls.sql
[ ] 08 supabase_security_fixes.sql
[ ] 09 lock_roles_and_public_requests.sql
[ ] 10 critical_access_fixes.sql
[ ] 11 security_review_fixes.sql
[ ] 12 supabase_subscriptions.sql
[ ] 13 supabase_subscriptions_v2.sql
[ ] 14 create_trial_trigger.sql
[ ] 15 supabase_subscription_cron.sql
[ ] 16 paid_beta_access.sql
[ ] 17 supabase_storage_receipts.sql
[ ] 18 payment_receipt_provisional_access.sql
[ ] 19 supabase_admin_billing.sql
[ ] 20 receipts_email_only.sql
[ ] 21 supabase_team_invitations.sql
[ ] 22 supabase_public_booking_rpc.sql
[ ] 23 supabase_anti_spam.sql
[ ] 24 notifications_setup.sql
[ ] 30 phase1_access_hardening.sql
[ ] 31 phase2_schema_consolidation.sql
[ ] 32 phase3_price_catalog.sql
[ ] 33 phase4_user_notifications.sql
[ ] 34 phase5_public_booking_hardening.sql
[ ] 35 phase6_clinical_read.sql
[ ] 36 phase7_trial_from_database.sql
```
