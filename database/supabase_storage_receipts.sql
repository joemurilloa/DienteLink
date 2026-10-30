-- ARCHIVO HIST”RICO. NO EJECUTAR EN PRODUCCI”N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================================
-- DienteLink ‚Äî Storage Setup para Comprobantes de Pago
-- El comprobante viaja por correo. Este bucket queda privado.
-- Volver a ejecutar este archivo NO lo abre al p√∫blico.
-- ============================================================================

-- 1. Crear el bucket 'payment-receipts' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-receipts',
    'payment-receipts',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Quitar pol√≠ticas que dejaban leer, subir o modificar a cualquiera
DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores modificar sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores eliminar sus comprobantes" ON storage.objects;

-- Fin del script.
