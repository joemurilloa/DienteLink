-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- Rechaza solicitudes públicas con fecha/hora que ya pasó (hora de Honduras)
create or replace function public.reject_past_appointment_request()
returns trigger language plpgsql as $$
declare
  local_now timestamp := (now() at time zone 'America/Tegucigalpa');
  req_ts timestamp;
begin
  begin
    req_ts := (new.requested_date || ' ' || new.requested_time)::timestamp;
  exception when others then
    raise exception 'Fecha u hora inválida';
  end;
  if req_ts <= local_now then
    raise exception 'El horario solicitado ya pasó';
  end if;
  return new;
end $$;

drop trigger if exists trg_reject_past_request on public.appointment_requests;
create trigger trg_reject_past_request
before insert on public.appointment_requests
for each row execute function public.reject_past_appointment_request();
