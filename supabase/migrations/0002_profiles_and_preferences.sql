-- 0002_profiles_and_preferences.sql
-- Profiles, user preferences and registered devices (for sync/notifications).

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_currency text not null default 'NPR',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, default_currency)
  values (new.id, new.raw_user_meta_data ->> 'full_name', coalesce(new.raw_user_meta_data ->> 'default_currency', 'NPR'));

  insert into public.user_preferences (user_id)
  values (new.id);

  insert into public.email_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Kathmandu',
  language app_language not null default 'en',
  date_system date_system not null default 'AD',
  week_start smallint not null default 0 check (week_start between 0 and 6),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  fiscal_year_start_month smallint not null default 4 check (fiscal_year_start_month between 1 and 12),
  biometric_lock_enabled boolean not null default false,
  pin_lock_enabled boolean not null default false,
  auto_lock_minutes smallint not null default 5 check (auto_lock_minutes >= 0),
  notification_preferences jsonb not null default '{
    "task_reminders": true,
    "habit_reminders": true,
    "bill_reminders": true,
    "loan_due_reminders": true,
    "weekly_summary": true
  }'::jsonb,
  dashboard_layout jsonb not null default '[]'::jsonb,
  delete_documents_after_extraction boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text,
  platform text not null check (platform in ('ios', 'android', 'web')),
  push_token text,
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, push_token)
);

create trigger devices_set_updated_at
  before update on devices
  for each row execute function set_updated_at();

create index devices_user_id_idx on devices (user_id);
