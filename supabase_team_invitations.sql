-- Agregar columnas a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner';

-- Opcional: si clinic_id hace referencia a una tabla de clínicas
-- ALTER TABLE public.profiles ADD CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios leer invitaciones de su clínica o enviadas a su email
CREATE POLICY "Users can view team invitations for their clinic"
    ON public.team_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.clinic_id = team_invitations.clinic_id
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Permitir a administradores insertar invitaciones
CREATE POLICY "Admins can insert team invitations"
    ON public.team_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.clinic_id = team_invitations.clinic_id
            AND profiles.role = 'admin'
        )
    );

-- Permitir a usuarios aceptar su invitación
CREATE POLICY "Users can update their own invitations"
    ON public.team_invitations
    FOR UPDATE
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.clinic_id = team_invitations.clinic_id
            AND profiles.role = 'admin'
        )
    );

-- Permitir a administradores eliminar invitaciones
CREATE POLICY "Admins can delete invitations"
    ON public.team_invitations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.clinic_id = team_invitations.clinic_id
            AND profiles.role = 'admin'
        )
    );
