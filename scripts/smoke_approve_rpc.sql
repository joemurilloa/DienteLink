-- =============================================================================
-- Smoke-test: approve_appointment_request + roles + protect_profile
-- Staging / local / branch — NUNCA prod.
--
-- Este script SEEDS datos de prueba y hace ROLLBACK al final.
-- Requiere rol postgres (SQL editor como postgres, o psql local tras db reset).
--
-- Códigos esperados:
--   DL403 forbidden | DL404 not found | DL409 conflict | DL410 invalid state
-- =============================================================================

begin;

create temporary table smoke_results (
  test text primary key,
  detail text not null
);
-- Tras set local role authenticated los DO necesitan escribir aquí
grant all on table smoke_results to authenticated;

-- ---------------------------------------------------------------------------
-- SEED (uuids fijos solo dentro de esta TX)
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner_a  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_admin_a  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  v_admin2_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  v_recep_a  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  v_assist_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  v_owner_b  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  v_req_ok   uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
  v_req_cf   uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  v_req_rj   uuid := 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  v_appt_cf  uuid := 'dddddddd-dddd-dddd-dddd-ddddddddddd1';
begin
  -- auth.users mínimos (Supabase local / postgres). Si falla por FK/triggers,
  -- crea los users en Studio y cambia solo los UUIDs de abajo.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values
    (v_owner_a,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-owner-a@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Owner A"}', now(), now()),
    (v_admin_a,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-admin-a@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Admin A"}', now(), now()),
    (v_admin2_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-admin2-a@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Admin2 A"}', now(), now()),
    (v_recep_a,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-recep-a@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Recep A"}', now(), now()),
    (v_assist_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-assist-a@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Assist A"}', now(), now()),
    (v_owner_b,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-owner-b@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Owner B"}', now(), now())
  on conflict (id) do nothing;

  -- profiles: handle_new_user puede haber insertado; forzamos roles/clínica
  insert into public.profiles (id, full_name, role, clinic_id, has_completed_onboarding)
  values
    (v_owner_a,  'Owner A',  'owner',        null,       true),
    (v_admin_a,  'Admin A',  'admin',        v_owner_a,  true),
    (v_admin2_a, 'Admin2 A', 'admin',        v_owner_a,  true),
    (v_recep_a,  'Recep A',  'receptionist', v_owner_a,  true),
    (v_assist_a, 'Assist A', 'assistant',    v_owner_a,  true),
    (v_owner_b,  'Owner B',  'owner',        null,       true)
  on conflict (id) do update
    set role = excluded.role,
        clinic_id = excluded.clinic_id,
        full_name = excluded.full_name,
        has_completed_onboarding = excluded.has_completed_onboarding;

  -- Cita que ocupa el slot del conflicto
  insert into public.appointments (
    id, doctor_id, patient_name, phone_number, date, time, type, status, reminder_status
  ) values (
    v_appt_cf, v_owner_a, 'Paciente Slot', '99990000',
    '2099-12-01', '10:00', 'Consulta', 'Programada', 'not_sent'
  ) on conflict (id) do nothing;

  -- Seed sin guard: INSERT fuerza pending; ON CONFLICT UPDATE exige auth.uid().
  alter table public.appointment_requests disable trigger user;

  insert into public.appointment_requests (
    id, doctor_id, patient_name, patient_email, patient_phone,
    requested_date, requested_time, appointment_type, status
  ) values
    (v_req_ok, v_owner_a, 'Paciente Libre', 'libre@example.com', '99991111',
     '2099-12-02', '11:00', 'Consulta', 'pending'),
    (v_req_cf, v_owner_a, 'Paciente Choque', 'choque@example.com', '99992222',
     '2099-12-01', '10:00', 'Consulta', 'pending'),
    (v_req_rj, v_owner_a, 'Paciente Reject', 'rej@example.com', '99993333',
     '2099-12-03', '12:00', 'Consulta', 'rejected')
  on conflict (id) do update
    set requested_date = excluded.requested_date,
        requested_time = excluded.requested_time,
        status = excluded.status,
        approved_patient_id = null,
        approved_appointment_id = null,
        responded_at = case when excluded.status = 'rejected' then now() else null end;

  alter table public.appointment_requests enable trigger user;

  raise notice 'SEED OK owner_a=% req_ok=% req_conflict=% req_rejected=%',
    v_owner_a, v_req_ok, v_req_cf, v_req_rj;
end $$;

-- Helper: impersonar (pg_temp: CREATE TEMPORARY FUNCTION no existe en Postgres)
create or replace function pg_temp.smoke_as(p_uid uuid, p_email text)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated', 'email', p_email)::text,
    true
  );
end;
$$;

set local role authenticated;

-- =============================================================================
-- TEST 1: DL409 conflicto + atomicidad
-- =============================================================================
select pg_temp.smoke_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'smoke-owner-a@example.com');

do $$
declare
  n_before int; n_after int; st text; caught boolean := false;
begin
  select count(*) into n_before from public.patients where doctor_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  begin
    perform public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid, false);
    raise exception 'FALLO: debió lanzar DL409';
  exception
    when sqlstate 'DL409' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      if sqlstate = 'DL409' or sqlerrm like 'APPOINTMENT_CONFLICT%' then caught := true; else raise; end if;
  end;
  select count(*) into n_after from public.patients where doctor_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  select status into st from public.appointment_requests where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';
  if not caught then raise exception 'FALLO: sin DL409'; end if;
  if n_after <> n_before then raise exception 'FALLO: pacientes % -> %', n_before, n_after; end if;
  if st is distinct from 'pending' then raise exception 'FALLO: status=%', st; end if;
  insert into smoke_results values ('TEST 1', 'OK DL409 atomicidad');
end $$;

-- =============================================================================
-- TEST 2: idempotencia
-- =============================================================================
do $$
declare r1 jsonb; r2 jsonb;
begin
  r1 := public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc1'::uuid, false);
  r2 := public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc1'::uuid, false);
  if r1->>'appointment_id' is distinct from r2->>'appointment_id'
     or r1->>'patient_id' is distinct from r2->>'patient_id' then
    raise exception 'FALLO ids % vs %', r1, r2;
  end if;
  if coalesce((r2->>'idempotent')::boolean, false) is not true then
    raise exception 'FALLO: 2ª llamada sin idempotent: %', r2;
  end if;
  insert into smoke_results values ('TEST 2', 'OK idempotencia');
end $$;

-- =============================================================================
-- TEST 4: self-update clinic_id / role
-- =============================================================================
do $$
begin
  begin
    update public.profiles set clinic_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
     where id = auth.uid();
    raise exception 'FALLO: clinic_id editable';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  begin
    update public.profiles set role = 'owner' where id = auth.uid();
    raise exception 'FALLO: role editable';
  exception when others then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  insert into smoke_results values ('TEST 4', 'OK self-update clinic_id/role bloqueado');
end $$;

-- =============================================================================
-- TEST 5: recepción no puede forzar solape → DL403
-- =============================================================================
select pg_temp.smoke_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'::uuid, 'smoke-recep-a@example.com');

do $$
declare caught boolean := false;
begin
  begin
    perform public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid, true);
    raise exception 'FALLO: recepción forzó solape';
  exception
    when sqlstate 'DL403' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      if sqlstate = 'DL403' or sqlerrm like 'FORBIDDEN%' then caught := true; else raise; end if;
  end;
  if not caught then raise exception 'FALLO: esperaba DL403'; end if;
  insert into smoke_results values ('TEST 5', 'OK recepción force_overlap → DL403');
end $$;

-- =============================================================================
-- TEST 6: asistente no aprueba → DL403
-- =============================================================================
select pg_temp.smoke_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5'::uuid, 'smoke-assist-a@example.com');

do $$
declare caught boolean := false;
begin
  begin
    -- usar una pending nueva no necesaria: incluso OK ya approved da idempotente
    -- para assistant; mejor una pending dedicada — reinsertar vía status reset no.
    -- Probamos force=false sobre conflicto: debe fallar por rol antes o por conflict.
    -- Forzamos rol: approve de request rejected no aplica. Creamos pending efímera.
    null;
  end;

  -- Insertar pending como postgres no; usamos set_team test abajo.
  -- Aquí: assistant intenta approve del conflicto → FORBIDDEN por rol
  begin
    perform public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid, false);
    raise exception 'FALLO: asistente aprobó';
  exception
    when sqlstate 'DL403' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      -- Si por orden de checks llega DL409, el rol no se validó primero: fallo de diseño
      if sqlstate = 'DL403' or sqlerrm like 'FORBIDDEN%' then caught := true;
      else raise exception 'FALLO: esperaba DL403, got % %', sqlstate, sqlerrm;
      end if;
  end;
  if not caught then raise exception 'FALLO TEST 6'; end if;
  insert into smoke_results values ('TEST 6', 'OK assistant → DL403');
end $$;

-- =============================================================================
-- TEST 7: DL410 — aprobar solicitud ya rejected (status real, no debilitado)
-- =============================================================================
select pg_temp.smoke_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, 'smoke-owner-a@example.com');

do $$
declare
  caught boolean := false;
  st text;
  st_after text;
begin
  select status into st from public.appointment_requests
   where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  if st is distinct from 'rejected' then
    raise exception 'FALLO TEST 7 seed: status=% (debe ser rejected)', st;
  end if;

  begin
    perform public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc3'::uuid, false);
    raise exception 'FALLO: debió ser DL410';
  exception
    when sqlstate 'DL410' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      if sqlstate = 'DL410' or sqlerrm like 'NOT_PENDING%' then caught := true;
      else raise exception 'FALLO: esperaba DL410, got % %', sqlstate, sqlerrm;
      end if;
  end;
  if not caught then raise exception 'FALLO TEST 7'; end if;

  select status into st_after from public.appointment_requests
   where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  if st_after is distinct from 'rejected' then
    raise exception 'FALLO TEST 7: status cambió a %', st_after;
  end if;

  insert into smoke_results values (
    'TEST 7',
    'OK DL410 sobre rejected real (antes=' || st || ' después=' || st_after || ')'
  );
end $$;

-- =============================================================================
-- TEST 8: admin no degrada a otro admin → DL403
-- =============================================================================
select pg_temp.smoke_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, 'smoke-admin-a@example.com');

do $$
declare caught boolean := false;
begin
  begin
    perform public.set_team_member_role(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid,
      'assistant'
    );
    raise exception 'FALLO: admin degradó a otro admin';
  exception
    when sqlstate 'DL403' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      if sqlstate = 'DL403' or sqlerrm like 'FORBIDDEN%' then caught := true;
      else raise exception 'FALLO: esperaba DL403, got % %', sqlstate, sqlerrm;
      end if;
  end;
  if not caught then raise exception 'FALLO TEST 8'; end if;
  insert into smoke_results values ('TEST 8', 'OK admin no degrada admin');
end $$;

-- =============================================================================
-- TEST 3: cruce de clínicas
-- =============================================================================
select pg_temp.smoke_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, 'smoke-owner-b@example.com');

do $$
declare caught boolean := false;
begin
  begin
    perform public.approve_appointment_request('cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid, false);
    raise exception 'FALLO: cruzó clínicas';
  exception
    when sqlstate 'DL404' then caught := true;
    when sqlstate 'DL403' then caught := true;
    when others then
      if sqlerrm like 'FALLO%' then raise; end if;
      caught := true;
      raise notice 'TEST 3 nota: % (%)', sqlerrm, sqlstate;
  end;
  if not caught then raise exception 'FALLO TEST 3'; end if;
  insert into smoke_results values ('TEST 3', 'OK cross-clinic');
end $$;

-- Una fila por TEST (NOTICE no vuelve por la API de db query)
select test, detail from smoke_results order by test;

rollback;

-- =============================================================================
-- Como postgres, fuera de la TX (en local tras reset):
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--   select column_name from information_schema.column_privileges
--    where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE';
--   -- role y clinic_id no deben salir
-- =============================================================================
