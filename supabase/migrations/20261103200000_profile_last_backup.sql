-- Fecha del último ZIP de respaldo, guardada en la cuenta y no solo en el navegador.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_backup_at timestamptz;

COMMENT ON COLUMN public.profiles.last_backup_at IS
  'Última vez que este usuario descargó el respaldo ZIP de su consultorio.';
