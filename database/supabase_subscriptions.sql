-- ============================================================
-- DienteLink — Subscriptions Table
-- Run this in the Supabase SQL Editor
-- ============================================================

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  clinic_id             uuid not null references auth.users(id) on delete cascade,
  status                text not null default 'inactive'
                          check (status in ('active', 'inactive', 'pending', 'trial')),
  plan                  text not null default 'monthly',
  amount                numeric(10, 2) not null default 15.00,
  currency              text not null default 'USD',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  pagadito_token        text,
  last_payment_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (clinic_id)
);

-- Index for fast lookups by clinic
create index if not exists idx_subscriptions_clinic_id on public.subscriptions(clinic_id);

-- Row Level Security: clinics can only read their own subscription
alter table public.subscriptions enable row level security;

create policy "Clinics read own subscription"
  on public.subscriptions for select
  using (auth.uid() = clinic_id);

-- Only backend (service role) can write subscriptions — no insert/update policy for clients
-- The Edge Function uses the service role key to bypass RLS.

-- Grant read to authenticated users
grant select on public.subscriptions to authenticated;

-- Helper view: is the current clinic's subscription active?
create or replace view public.subscription_status with (security_invoker = true) as
  select
    clinic_id,
    status,
    plan,
    amount,
    currency,
    current_period_end,
    last_payment_at,
    case
      when status = 'active' and current_period_end > now() then true
      else false
    end as is_active,
    case
      when status = 'active' and current_period_end between now() and now() + interval '7 days' then true
      else false
    end as expires_soon
  from public.subscriptions
  where clinic_id = auth.uid();

grant select on public.subscription_status to authenticated;
