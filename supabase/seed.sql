-- seed.sql
-- Local-development-only seed data. This does NOT run against production —
-- it is applied by `supabase db reset` for local testing. It intentionally
-- contains no real personal data.
--
-- Per-user default categories/import-profiles are created by the app on
-- first sign-in (see src/features/auth/onboarding), not by this file, since
-- every row here would need a real auth.users row to satisfy RLS/user_id.
-- This file is kept intentionally minimal; see supabase/policies for RLS and
-- database/seed-data (client-side) for the default category/profile set that
-- is inserted per-user at onboarding time.

select 1;
