-- Greenfield en proyectos Supabase vacíos: el baseline usa uuid_generate_v4()/crypt
-- sin schema. Las extensiones viven en schema extensions.
--
-- Solo plataforma (extensiones + alias públicos). NO stubs de get_my_clinic_id /
-- get_my_role: esos se definen en orden correcto dentro del baseline.
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.uuid_generate_v4()
returns uuid
language sql
volatile
as $$ select extensions.uuid_generate_v4(); $$;

create or replace function public.gen_salt(text)
returns text
language sql
volatile
as $$ select extensions.gen_salt($1); $$;

create or replace function public.crypt(text, text)
returns text
language sql
immutable
as $$ select extensions.crypt($1, $2); $$;
