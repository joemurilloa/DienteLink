-- ============================================================
-- DienteLink — Auto Trial on Signup
-- Run this in the Supabase SQL Editor AFTER supabase_subscriptions.sql
-- ============================================================
--
-- When a new profile is created (user signs up), automatically
-- create a trial subscription with 14-day access.
-- This way every new user gets a trial without any frontend logic.
-- ============================================================

-- 1. Function that creates a trial subscription
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    clinic_id,
    status,
    plan,
    amount,
    currency,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trial',
    'monthly',
    15.00,
    'USD',
    now(),
    now() + interval '14 days',
    now(),
    now()
  )
  ON CONFLICT (clinic_id) DO NOTHING; -- Don't overwrite existing subscriptions
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger that fires after a new profile is inserted
DROP TRIGGER IF EXISTS on_profile_created_start_trial ON public.profiles;

CREATE TRIGGER on_profile_created_start_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- ============================================================
-- VERIFICATION
-- ============================================================
-- After running this, create a test user and check:
--   SELECT * FROM public.subscriptions WHERE clinic_id = '<new_user_id>';
-- You should see a row with status='trial' and period_end = 14 days from now.
-- ============================================================
