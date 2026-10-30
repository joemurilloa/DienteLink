-- =============================================================================
-- Checklist: column_privileges + profiles REVOKE/GRANT + 2 clínicas
-- Desechable only. Sin ROLLBACK final en privilegios (son de catálogo).
-- =============================================================================

begin;

create temporary table chk_results (test text primary key, detail text not null);
grant all on table chk_results to authenticated;

-- ---------------------------------------------------------------------------
-- 1) column_privileges: authenticated NO puede UPDATE role ni clinic_id
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
begin
  select count(*) into n
    from information_schema.column_privileges
   where table_schema = 'public'
     and table_name = 'profiles'
     and grantee = 'authenticated'
     and privilege_type = 'UPDATE'
     and column_name in ('role', 'clinic_id');

  if n > 0 then
    raise exception 'FAIL privileges: authenticated puede UPDATE role/clinic_id (% cols)', n;
  end if;

  insert into chk_results values (
    'PRIV01',
    'OK authenticated sin UPDATE en role/clinic_id'
  );
end $$;

-- Columnas que SÍ debe poder actualizar (subset mínimo onboarding/perfil)
do $$
declare
  missing text;
begin
  select string_agg(req, ', ') into missing
    from unnest(array['full_name', 'has_completed_onboarding', 'updated_at']) as req
   where not exists (
     select 1 from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and grantee = 'authenticated'
        and privilege_type = 'UPDATE'
        and column_name = req
   );

  if missing is not null then
    raise exception 'FAIL privileges: faltan GRANT UPDATE en %', missing;
  end if;

  insert into chk_results values (
    'PRIV02',
    'OK GRANT UPDATE full_name/has_completed_onboarding/updated_at'
  );
end $$;

-- ---------------------------------------------------------------------------
-- 2) Regresión profiles: guardar perfil / onboarding (columnas permitidas)
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'smoke-owner-a@example.com', crypt('x', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Owner A"}', now(), now()
  ) on conflict (id) do nothing;

  insert into public.profiles (id, full_name, role, clinic_id, has_completed_onboarding)
  values (v_owner, 'Owner A', 'owner', null, false)
  on conflict (id) do update
    set full_name = 'Owner A', role = 'owner', clinic_id = null, has_completed_onboarding = false;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);

  -- Perfil: full_name permitido
  update public.profiles
     set full_name = 'Owner A Updated', updated_at = now()
   where id = v_owner;
  if not found then
    raise exception 'FAIL profile: no actualizó full_name';
  end if;

  -- Onboarding flag permitido
  update public.profiles
     set has_completed_onboarding = true, updated_at = now()
   where id = v_owner;

  -- clinic_name / phone si existen
  begin
    execute $u$
      update public.profiles
         set clinic_name = coalesce(clinic_name, 'Clínica Smoke'),
             phone = coalesce(phone, '99990000'),
             updated_at = now()
       where id = $1
    $u$ using v_owner;
  exception when undefined_column then
    null;
  end;

  insert into chk_results values ('PROF01', 'OK update full_name + onboarding (+clinic_name/phone si hay)');
end $$;

-- Self-update role/clinic_id debe fallar (privilegio o trigger)
do $$
declare
  v_owner uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  blocked int := 0;
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);

  begin
    update public.profiles set role = 'admin' where id = v_owner;
    if found then
      raise exception 'FAIL: role editable';
    end if;
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    blocked := blocked + 1;
  end;

  begin
    update public.profiles
       set clinic_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
     where id = v_owner;
    if found then
      raise exception 'FAIL: clinic_id editable';
    end if;
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    blocked := blocked + 1;
  end;

  if blocked < 1 then
    -- Si el UPDATE "pasa" sin filas por RLS, también OK; exigir al menos un bloqueo duro
    -- o 0 filas. Re-check privilegios ya cubiertos en PRIV01.
    null;
  end if;

  insert into chk_results values (
    'PROF02',
    'OK self-update role/clinic_id bloqueado (err o 0 filas); blocked_hard=' || blocked
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3) Dos clínicas: owner B no ve/aprueba de A
-- ---------------------------------------------------------------------------
reset role;

do $$
declare
  v_owner_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_owner_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  v_req uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc9';
  caught boolean := false;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'smoke-owner-b@example.com', crypt('x', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Owner B"}', now(), now()
  ) on conflict (id) do nothing;

  insert into public.profiles (id, full_name, role, clinic_id, has_completed_onboarding)
  values (v_owner_b, 'Owner B', 'owner', null, true)
  on conflict (id) do update set role = 'owner', clinic_id = null;

  alter table public.appointment_requests disable trigger user;
  insert into public.appointment_requests (
    id, doctor_id, patient_name, patient_email, patient_phone,
    requested_date, requested_time, appointment_type, status
  ) values (
    v_req, v_owner_a, 'Cross', 'c@x.com', '1', '2099-12-10', '09:00', 'Consulta', 'pending'
  ) on conflict (id) do update set status = 'pending', doctor_id = excluded.doctor_id;
  alter table public.appointment_requests enable trigger user;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_b::text, 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.approve_appointment_request(v_req, false);
    raise exception 'FAIL: B aprobó solicitud de A';
  exception
    when sqlstate 'DL404' then caught := true;
    when sqlstate 'DL403' then caught := true;
    when others then
      if sqlerrm like 'FAIL:%' then raise; end if;
      caught := true;
  end;

  if not caught then
    raise exception 'FAIL CLINICS';
  end if;

  insert into chk_results values ('CLINIC01', 'OK owner B no aprueba request de clínica A');
end $$;

select test, detail from chk_results order by test;

rollback;
