-- =============================================================================
-- Smoke-test: save_patient
-- Staging / local / branch — NUNCA prod.
--
-- SEEDS + ROLLBACK. Requiere rol postgres (SQL editor o psql tras db reset).
-- Depende de migración 20261029240000_save_patient.sql.
--
-- Códigos: DL400 forma/null/vacío | DL403 rol | DL404 ajeno | DL412 versión |
--          DL413 soft-deleted
-- =============================================================================

begin;

create temporary table smoke_results (
  test text primary key,
  detail text not null
);

do $$
declare
  v_owner  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01';
  v_recep  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02';
  v_other  uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01';
  v_pid    uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01';
  v_pid2   uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02';
  v_note   uuid := 'ffffffff-ffff-ffff-ffff-fffffffffff1';
  v_res    jsonb;
  v_phone  text;
  v_name   text;
  v_ver    int;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values
    (v_owner, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-sp-owner@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"SP Owner"}', now(), now()),
    (v_recep, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-sp-recep@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"SP Recep"}', now(), now()),
    (v_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'smoke-sp-other@example.com', crypt('x', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"SP Other"}', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, role, clinic_id, has_completed_onboarding)
  values
    (v_owner, 'SP Owner', 'owner', null, true),
    (v_recep, 'SP Recep', 'receptionist', v_owner, true),
    (v_other, 'SP Other', 'owner', null, true)
  on conflict (id) do update
    set role = excluded.role,
        clinic_id = excluded.clinic_id,
        full_name = excluded.full_name,
        has_completed_onboarding = true;

  -- Auth como owner
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1) Alta OK
  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid,
      'identification', jsonb_build_object(
        'fullName', 'Paciente Smoke',
        'phone', '5551000'
      ),
      'consentSigned', false
    ),
    null
  );
  if (v_res->>'version')::int is distinct from 1 then
    raise exception 'FAIL alta: version=%', v_res->>'version';
  end if;
  insert into smoke_results values ('SP01', 'OK alta version=1');

  -- 2) Re-alta post-commit con expected_version null → DL412 del chequeo
  --    previo (v_new=false), NO del unique_violation. La alta concurrente
  --    real (dos TX ven “no existe”) requiere DOS SESIONES; no cubierta aquí.
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid,
        'identification', jsonb_build_object('fullName', 'Hijack')
      ),
      null
    );
    raise exception 'FAIL: re-alta debió DL412';
  exception
    when sqlstate 'DL412' then
      insert into smoke_results values ('SP02', 'OK re-alta post-commit → DL412 (previo; 2-sess aparte)');
  end;

  select full_name into v_name from public.patients where id = v_pid;
  if v_name is distinct from 'Paciente Smoke' then
    raise exception 'FAIL: re-alta sobrescribió nombre → %', v_name;
  end if;

  -- 3) Partial: solo phone — nombre intacto
  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid,
      'identification', jsonb_build_object('phone', '5552000')
    ),
    1
  );
  select full_name, phone, version into v_name, v_phone, v_ver
    from public.patients where id = v_pid;
  if v_name is distinct from 'Paciente Smoke' or v_phone is distinct from '5552000' or v_ver <> 2 then
    raise exception 'FAIL parcial phone: name=% phone=% ver=%', v_name, v_phone, v_ver;
  end if;
  insert into smoke_results values ('SP03', 'OK parcial phone nombre intacto ver=2');

  -- 4) fullName vacío → DL400, nombre intacto
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid,
        'identification', jsonb_build_object('fullName', '')
      ),
      2
    );
    raise exception 'FAIL: fullName vacío debió DL400';
  exception
    when sqlstate 'DL400' then
      insert into smoke_results values ('SP04', 'OK fullName vacío → DL400');
  end;
  select full_name, version into v_name, v_ver from public.patients where id = v_pid;
  if v_name is distinct from 'Paciente Smoke' or v_ver <> 2 then
    raise exception 'FAIL: fullName vacío alteró fila';
  end if;

  -- 5) null explícito → DL400
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid,
        'identification', jsonb_build_object('phone', null)
      ),
      2
    );
    raise exception 'FAIL: null explícito debió DL400';
  exception
    when sqlstate 'DL400' then
      insert into smoke_results values ('SP05', 'OK null explícito → DL400');
  end;

  -- 6) clinicalHistory no-object → DL400
  begin
    perform public.save_patient(
      jsonb_build_object('id', v_pid, 'clinicalHistory', '[]'::jsonb),
      2
    );
    raise exception 'FAIL: clinicalHistory array debió DL400';
  exception
    when sqlstate 'DL400' then
      insert into smoke_results values ('SP06', 'OK clinicalHistory no-object → DL400');
  end;

  -- 7) versión stale → DL412
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid,
        'identification', jsonb_build_object('phone', '999')
      ),
      1
    );
    raise exception 'FAIL: stale debió DL412';
  exception
    when sqlstate 'DL412' then
      insert into smoke_results values ('SP07', 'OK versión stale → DL412');
  end;

  -- 8) clinical + odontogram parcial
  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid,
      'clinicalHistory', jsonb_build_object(
        'allergies', jsonb_build_array('penicilina'),
        'motiveOfConsult', 'dolor'
      ),
      'odontogram', '[]'::jsonb
    ),
    2
  );
  if not exists (
    select 1 from public.patient_clinical
     where patient_id = v_pid and allergies = array['penicilina']
  ) then
    raise exception 'FAIL clinical allergies';
  end if;
  select phone into v_phone from public.patients where id = v_pid;
  if v_phone is distinct from '5552000' then
    raise exception 'FAIL: clinical wipeó phone';
  end if;
  insert into smoke_results values ('SP08', 'OK clinical parcial phone intacto');

  -- 9) colección notes
  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid,
      'collections', jsonb_build_object(
        'evolutionNotes', jsonb_build_object(
          'items', jsonb_build_array(
            jsonb_build_object('id', v_note, 'date', '2099-01-01', 'content', 'nota', 'procedure', '')
          ),
          'removedIds', '[]'::jsonb
        )
      )
    ),
    (select version from public.patients where id = v_pid)
  );
  if not exists (select 1 from public.evolution_notes where id = v_note and deleted_at is null) then
    raise exception 'FAIL evolution note insert';
  end if;
  insert into smoke_results values ('SP09', 'OK evolutionNotes upsert');

  -- 10) soft-delete paciente → DL413
  update public.patients set deleted_at = now() where id = v_pid;
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid,
        'identification', jsonb_build_object('phone', '1')
      ),
      99
    );
    raise exception 'FAIL: soft-deleted debió DL413';
  exception
    when sqlstate 'DL413' then
      insert into smoke_results values ('SP10', 'OK soft-deleted → DL413');
  end;

  -- 11) recepción no escribe clinical → DL403
  perform set_config('request.jwt.claim.sub', v_recep::text, true);
  begin
    perform public.save_patient(
      jsonb_build_object(
        'id', v_pid2,
        'identification', jsonb_build_object('fullName', 'Recep Pac'),
        'clinicalHistory', jsonb_build_object('allergies', '[]'::jsonb)
      ),
      null
    );
    raise exception 'FAIL: recep+clinical debió DL403';
  exception
    when sqlstate 'DL403' then
      insert into smoke_results values ('SP11', 'OK recep clinical → DL403');
  end;

  -- 12) recepción alta solo identidad OK
  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid2,
      'identification', jsonb_build_object('fullName', 'Recep Pac', 'phone', '111')
    ),
    null
  );
  if (v_res->>'version')::int is distinct from 1 then
    raise exception 'FAIL recep alta';
  end if;
  insert into smoke_results values ('SP12', 'OK recep alta identidad');

  -- 13) recepción: pago existente intacto + uno nuevo → OK (inmutabilidad)
  insert into public.payments (id, patient_id, doctor_id, amount, method, note, date)
  values (
    'ffffffff-ffff-ffff-ffff-fffffffffff2',
    v_pid2, v_owner, 100.00, 'cash', null, '2099-01-02'
  );

  v_res := public.save_patient(
    jsonb_build_object(
      'id', v_pid2,
      'collections', jsonb_build_object(
        'payments', jsonb_build_object(
          'items', jsonb_build_array(
            jsonb_build_object(
              'id', 'ffffffff-ffff-ffff-ffff-fffffffffff2',
              'amount', 100, 'method', 'cash', 'note', '', 'date', '2099-01-02'
            ),
            jsonb_build_object(
              'id', 'ffffffff-ffff-ffff-ffff-fffffffffff3',
              'amount', 50, 'method', 'cash', 'note', 'nuevo', 'date', '2099-01-03'
            )
          ),
          'removedIds', '[]'::jsonb
        )
      )
    ),
    1
  );
  if not exists (
    select 1 from public.payments
     where id = 'ffffffff-ffff-ffff-ffff-fffffffffff3'
       and patient_id = v_pid2 and deleted_at is null and amount = 50
  ) then
    raise exception 'FAIL recep payments: no insertó el nuevo';
  end if;
  if (select amount from public.payments where id = 'ffffffff-ffff-ffff-ffff-fffffffffff2') is distinct from 100 then
    raise exception 'FAIL recep payments: alteró el existente';
  end if;
  insert into smoke_results values ('SP13', 'OK recep payments intacto+nuevo');
  insert into smoke_results values ('SP99', 'script OK; concurrente 2-sess ya corrido aparte');
end $$;

select test, detail from smoke_results order by test;

rollback;
