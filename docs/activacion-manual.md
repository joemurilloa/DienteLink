# Guía de Activación Manual de Cuentas — DienteLink

## Cuándo usar esta guía

Cuando un doctor haya pagado y subido su comprobante, recibirás un **email de notificación** con todos los detalles y los pasos a seguir directamente en el email.

Esta guía es el respaldo de referencia.

---

## Principio fundamental: Los datos NUNCA se borran

> ⚠️ **CRÍTICO**: La suscripción solo controla el **acceso** a la app.
> Los datos de pacientes, expedientes, citas y pagos se conservan indefinidamente
> en la base de datos independientemente del estado de la suscripción.
> Nunca uses DELETE en tablas de datos clínicos.

---

## Pasos para activar una cuenta (en Supabase)

### 1. Verificar el pago
- Abre tu app bancaria
- Busca la transferencia con el **email del doctor** como concepto/referencia
- Confirma que el monto y la fecha coinciden con lo que muestra el comprobante

### 2. Ir a Supabase
1. Abre [supabase.com](https://supabase.com) → Tu proyecto DienteLink
2. En el menú lateral: **Table Editor**
3. Selecciona la tabla: `subscriptions`

### 3. Encontrar al doctor
**Opción A** — Por email (más fácil):
1. Copia el email del doctor que aparece en el email de notificación
2. En Supabase, ve a **SQL Editor** y corre:
```sql
SELECT s.*, p.full_name
FROM subscriptions s
JOIN profiles p ON p.id = s.clinic_id
JOIN auth.users u ON u.id = s.clinic_id
WHERE u.email = 'email_del_doctor@ejemplo.com';
```

**Opción B** — Por Clinic ID (viene en el email de notificación):
```sql
SELECT * FROM subscriptions WHERE clinic_id = 'uuid-aqui';
```

### 4. Activar la suscripción
**Opción más fácil — correr esta función SQL:**
```sql
SELECT public.activate_subscription('clinic-id-del-doctor-aqui', 1);
-- El segundo parámetro es la cantidad de meses (1 por defecto)
```

**Opción manual — editar directamente en Table Editor:**
1. Localiza la fila del doctor
2. Cambia los siguientes campos:
   - `status` → `active`
   - `current_period_start` → fecha de hoy (ej: `2026-07-16T18:00:00Z`)
   - `current_period_end` → fecha de hoy + 30 días (ej: `2026-08-16T18:00:00Z`)
   - `last_payment_at` → fecha de hoy
3. Guarda los cambios (botón "Save" o Enter)

### 5. Verificar
```sql
SELECT * FROM subscription_status WHERE clinic_id = 'uuid-aqui';
-- Deberías ver: status='active', is_active=true, days_left=30
```

### 6. (Opcional) Notificar al doctor
Puedes enviarle un WhatsApp o email rápido:
> "¡Hola! Ya activamos tu cuenta de DienteLink. Ya puedes ingresar con normalidad. ¡Gracias por confiar en nosotros!"

---

## Renovaciones mensuales

El mismo proceso aplica para renovaciones:
1. Doctor paga → sube comprobante → recibes email
2. Verificas pago → corres `activate_subscription(clinic_id, 1)`
3. Listo — el sistema extiende 30 días desde la fecha de activación

---

## Cron job automático de expiración

El sistema corre todos los días a las **00:05 AM UTC** (6:05 PM Honduras) y marca automáticamente como `expired` cualquier suscripción cuya `current_period_end` ya pasó.

No necesitas hacer nada para desactivar cuentas — es completamente automático.

Para verificar que el cron está activo:
```sql
SELECT * FROM cron.job WHERE jobname = 'expire-overdue-subscriptions';
```

---

## Tabla payment_receipts — Ver comprobantes

Para ver todos los comprobantes pendientes de revisión:
```sql
SELECT 
  pr.id,
  pr.email_referencia,
  pr.image_url,
  pr.notes,
  pr.created_at,
  p.full_name
FROM payment_receipts pr
JOIN profiles p ON p.id = pr.clinic_id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;
```

Para marcar un comprobante como aprobado después de verificar:
```sql
UPDATE payment_receipts
SET status = 'approved', reviewed_at = now(), reviewed_note = 'Pago verificado - L.500'
WHERE id = 'id-del-comprobante';
```

---

## Precios de referencia

| Plan | Monto | Duración |
|------|-------|----------|
| Mensual | L. 500 | 30 días |
| (futuro) Semestral | L. 2,500 | 180 días |
| (futuro) Anual | L. 4,500 | 365 días |

---

## Configuración de datos bancarios en la app

Para cambiar los datos bancarios que se muestran al doctor en la pantalla de pago, edita el archivo:

```
components/SubscriptionGate.tsx
```

Busca la constante `PAYMENT_INFO` al inicio del archivo y actualiza los valores.

---

## Storage — Comprobantes de pago

Los comprobantes se almacenan en Supabase Storage:
- **Bucket**: `payment-receipts`
- **Ruta**: `{clinic_id}/{timestamp}.{ext}`

Para ver los archivos: Supabase → Storage → `payment-receipts`
