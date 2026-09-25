-- ============================================================================
-- DienteLink — Storage Setup para Comprobantes de Pago
-- Ejecuta este archivo en el SQL Editor de Supabase
-- ============================================================================

-- 1. Crear el bucket 'payment-receipts' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-receipts',
    'payment-receipts',
    true, -- Necesita ser público para que puedas ver las fotos desde el email
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Eliminar políticas anteriores si existen para evitar duplicados
DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;

-- 3. Crear política para que los doctores (autenticados) puedan subir archivos a este bucket
CREATE POLICY "Permitir a doctores subir comprobantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- 4. Crear política para que cualquiera pueda leer (necesario porque el bucket es público)
CREATE POLICY "Permitir a cualquiera ver comprobantes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');

-- (Opcional) Permitir a los usuarios eliminar/actualizar sus propios comprobantes si lo llegaran a necesitar
DROP POLICY IF EXISTS "Permitir a doctores modificar sus comprobantes" ON storage.objects;
CREATE POLICY "Permitir a doctores modificar sus comprobantes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Permitir a doctores eliminar sus comprobantes" ON storage.objects;
CREATE POLICY "Permitir a doctores eliminar sus comprobantes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Fin del script.
