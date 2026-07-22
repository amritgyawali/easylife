-- 0005_habits.sql
-- Habits and routines. No points/badges/streak-shaming — streaks are shown
-- as plain factual counters only (see coding rule: no manipulative gamification).

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0),
  description text,
  icon text,
  color text,
  recurrence text not null default 'daily' check (recurrence in ('daily', 'weekly', 'custom')),
  target_count integer not null default 1 check (target_count > 0),
  by_weekday smallint[],
  reminder_time time,
  is_paused boolean not null default false,
  paused_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger habits_set_updated_at
  before update on habits
  for each row execute function set_updated_at();

create index habits_user_id_idx on habits (user_id) where deleted_at is null;

create table habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  entry_date date not null,
  count integer not null default 1 check (count >= 0),
  is_skipped boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, entry_date)
);

create trigger habit_entries_set_updated_at
  before update on habit_entries
  for each row execute function set_updated_at();

create index habit_entries_habit_idx on habit_entries (habit_id, entry_date desc);
