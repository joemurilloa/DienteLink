# DienteLink — Análisis de Valor y Roadmap $15+/mes

## Estado Actual: Lo que YA existe (Sprint 1-3 completados)

| Módulo | Funcionalidades | Estado |
|--------|----------------|--------|
| **Auth** | Login/Signup, perfil doctor, multi-moneda | ✅ Completo |
| **Pacientes** | CRUD completo, búsqueda, ficha clínica 10 tabs | ✅ Completo |
| **Odontograma** | 32 dientes, 12 condiciones, 5 superficies, historial | ✅ Completo |
| **Periodontograma** | 6 sitios/diente, sangrado, movilidad, furcación | ✅ Completo |
| **Citas** | Calendario mes/semana/día, conflictos, soft-delete | ✅ Completo |
| **Reservas Públicas** | Página pública Calendly-like, wizard multi-paso | ✅ Completo |
| **Presupuesto** | Items con costo, estado, balance pendiente | ✅ Completo |
| **Pagos** | Registro efectivo/tarjeta/transferencia, saldo | ✅ Completo |
| **Recetas** | Medicamentos, plantillas rápidas, PDF | ✅ Completo |
| **Consentimientos** | 4 plantillas, firma digital canvas, PDF | ✅ Completo |
| **Notas Evolución** | Notas clínicas fechadas + historial eventos | ✅ Completo |
| **Dashboard** | Métricas: ingresos, pacientes, asistencia, saldo | ✅ Completo |
| **PDF Export** | Ficha completa (10 secciones + periodontograma) | ✅ Completo |
| **CSV Export** | Pacientes y citas | ✅ Completo |
| **WhatsApp** | Recordatorios (plantilla Meta) | ⚠️ Credenciales placeholder |
| **Email** | Recordatorios vía Resend Edge Function | ✅ Completo |
| **Shortcuts** | 12+ atajos de teclado | ✅ Completo |
| **Accesibilidad** | Skip link, focus states, reduced motion | ✅ Completo |
| **Performance** | Debounce, virtualización, lazy loading | ✅ Completo |
| **Tests** | 33 tests Vitest (utils + types) | ✅ Completo |
| **SQL Docs** | Schema 12 tablas + RLS policies | ✅ Completo |
| **Android** | Capacitor configurado (shell) | ⚠️ No compilado |

---

## Comparación con Competidores a $15+/mes

| Feature | DienteLink | Dentrix ($400+) | Dental Intelligence ($299) | Doctocol ($15) | Pearl ($500) |
|---------|-----------|----------|----------------------|---------|------|
| Odontograma digital | ✅ | ✅ | ❌ | ✅ | ❌ |
| Periodontograma | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reservas públicas | ✅ | Addon | ❌ | ❌ | ❌ |
| Dashboard métricas | ✅ Básico | ✅ Full | ✅ Full | ✅ Básico | ❌ |
| Firma digital | ✅ | ✅ | ❌ | ❌ | ❌ |
| Recordatorios auto | ⚠️ Manual | ✅ Auto | ✅ Auto | ❌ | ❌ |
| **Radiografías/imágenes** | ❌ | ✅ | ❌ | ✅ | ✅ AI |
| **Multi-usuario/roles** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Facturación formal** | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Reportes avanzados** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Dark mode** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Onboarding/Tutorial** | ❌ | ✅ | ✅ | ❌ | ❌ |

---

## GAPs Críticos para cobrar $15+/mes

### 🔴 BLOQUEANTES (sin esto no se puede cobrar $15)

1. **Sin onboarding / tutorial interactivo** — Los usuarios abandonan si no entienden el producto en <2 min
2. **Sin dark mode** — Diferenciador visual que todo SaaS moderno tiene
3. **Sin radiografías/imágenes clínicas** — Los dentistas NECESITAN adjuntar fotos/X-rays
4. **Sin reportes gráficos** — Solo métricas numéricas, no hay charts de tendencia
5. **Sin facturación/recibos formales** — El PDF actual es una ficha clínica, no una factura
6. **Sin recordatorios automáticos** — Actualmente es manual (botón por botón)
7. **Sin landing page / pricing page** — No hay forma de vender el producto

### 🟡 IMPORTANTES (diferenciadores para justificar $15)

8. **Multi-usuario (secretaria/asistente)** — Roles: admin, doctor, asistente (solo lectura)
9. **Planes de tratamiento con timeline** — Vista visual del plan paso a paso
10. **Notificaciones push / in-app** — Alertas de citas próximas, pagos pendientes
11. **Custom branding** — Logo del consultorio en PDFs y página de reservas
12. **Backup manual + indicador de sync** — Botón "Descargar respaldo" + status offline

### 🟢 NICE-TO-HAVE (sprint futuro)

13. Integración Google Calendar / iCal
14. Drug interaction checker
15. Referral tracking (pacientes referidos)
16. Multi-idioma (Inglés para mercado US/CA)
17. AI dental assistant (análisis de X-rays)

---

## ROADMAP PROPUESTO — 6 Sprints hacia $15+/mes

### Sprint 4: Experiencia de Usuario (UX Polish) — COMPLETADO ✅
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 4.1 | **Dark mode toggle** (CSS variables + persistencia) | ✅ | Alto |
| 4.2 | **Onboarding wizard** (Tips contextuales) | ✅ | Crítico |
| 4.3 | **Toast de bienvenida + tips contextuales** | ✅ | Medio |
| 4.4 | **Empty states mejorados** con CTAs claros | ✅ | Medio |

### Sprint 5: Imágenes + Reportes — COMPLETADO ✅
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 5.1 | **Subida de radiografías/fotos** (Supabase Storage) | ✅ | Crítico |
| 5.2 | **Galería de imágenes** por paciente con visor lightbox | ✅ | Alto |
| 5.3 | **Dashboard con gráficos** (recharts: ingresos, citas) | ✅ | Alto |
| 5.4 | **Reporte PDF mensual** (resumen financiero + actividad) | ✅ | Alto |

### Sprint 6: Automatización + Facturación — COMPLETADO ✅
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 6.1 | **Recordatorios automáticos** (cron/trigger) | ✅ | Crítico |
| 6.2 | **Generación de recibos/facturas PDF** | ✅ | Alto |
| 6.3 | **Estado de Cuenta Global (PDF)** | ✅ | Medio |
| 6.4 | **Métricas financieras y filtros de deuda** | ✅ | Medio |

### Sprint 7: Multi-usuario + Roles
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 7.1 | **Roles: doctor, asistente, recepcionista** | Alto | Alto |
| 7.2 | **Invitación por email** a equipo | Medio | Alto |
| 7.3 | **Permisos por rol** (asistente: solo lectura; recepcionista: citas+pagos) | Alto | Alto |

### Sprint 8: Landing + Monetización
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 8.1 | **Landing page** con features, pricing, testimonials | Medio | Crítico |
| 8.2 | **Pricing tiers** (Free: 10 pacientes / Pro $15: ilimitado) | Medio | Crítico |
| 8.3 | **Stripe/Paddle integration** para cobros | Alto | Crítico |
| 8.4 | **Trial de 14 días** con countdown y upgrade prompts | Medio | Alto |

### Sprint 9: Mobile + Avanzado
| # | Feature | Esfuerzo | Impacto |
|---|---------|----------|---------|
| 9.1 | **Build Android APK** (Capacitor ya configurado) | Medio | Alto |
| 9.2 | **Push notifications** (Firebase Cloud Messaging) | Alto | Medio |
| 9.3 | **Custom branding** (logo en PDFs y booking page) | Bajo | Medio |
| 9.4 | **Google Calendar sync** (OAuth + API) | Alto | Medio |

---

## Pricing Strategy Recomendado

| Plan | Precio | Límites | Features |
|------|--------|---------|----------|
| **Gratis** | $0 | 10 pacientes, 1 usuario | Core: odontograma, citas, notas |
| **Pro** | $15/mes | Ilimitado, 1 usuario | + Reservas públicas, reportes, recibos, imágenes, recordatorios auto |
| **Clínica** | $39/mes | Ilimitado, 5 usuarios | + Multi-usuario, roles, branding, soporte prioritario |

**Justificación $15/mes:**
- Doctocol (competidor directo LATAM) cobra $15 con MENOS features
- DienteLink tiene periodontograma + reservas públicas + firma digital que Doctocol no tiene
- Con los Sprints 4-6 completados (dark mode, imágenes, reportes, facturas, recordatorios auto), el producto vale fácilmente $15-25/mes

---

## Prioridad de Implementación (ROI máximo)

```
- [x] **Sprint 4: UX Polish** (Completado ✅)
    - Empty states con CTAs.
    - Sistema de tips contextuales.
    - Modo oscuro integral (CSS Variables).
- [x] **Sprint 5: Imágenes + Reportes** (Completado ✅)
    - Galería de radiografías/fotos (Supabase Storage).
    - Dashboard con gráficos de rendimiento.
    - Reporte PDF mensual de desempeño.

SEMANA 5-6: Sprint 6 (Automatización + Facturación)
           → Justifica el cobro mensual

SEMANA 7-8: Sprint 8 (Landing + Monetización)
           → Empieza a generar revenue

DESPUÉS:   Sprint 7 + 9 (Multi-usuario, Mobile)
           → Escala el precio a $39
```
