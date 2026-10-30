# Cierre — save_patient / approve (2026-10-30)

## Hecho (validado)

- Diseño + SQL `save_patient` / `approve_appointment_request`
- Greenfield reproducible (`71345` extensiones; baseline reordenado; sin stubs de orden)
- Smokes en desechable `etbnfcogagvpsxcevnjv`: approve 1–8, SP01–13, PRIV/PROF/CLINIC
- Concurrente 2 sesiones (desechable previo): A commit, B DL412, nombre intacto
- Prod solo-lectura: `get_my_clinic_id` / `get_my_role` = cuerpo de `29220000`

## No hecho (despliegue — manual)

1. UI con `VITE_USE_SAVE_PATIENT_RPC=true` → desechable  
2. Dump de prod + migraciones en otro proyecto  
3. Sentry / `rpc_events`  
4. Backup prod → migraciones → cliente flag off → flag on  
5. Después: REVOKE writes, RLS `deleted_at`, catches vacíos, booking dual  

## Refs

| | |
|---|---|
| Desechable (CLI) | `etbnfcogagvpsxcevnjv` |
| Prod (no tocar sin checklist) | `jrzydxpcyonrzhbpzibc` |

**Fin del tramo de código/SQL.**
