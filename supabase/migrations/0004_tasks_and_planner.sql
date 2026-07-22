-- 0004_tasks_and_planner.sql
-- Task inbox, projects, subtasks, recurrence rules and reminders.

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

create index projects_user_id_idx on projects (user_id) where deleted_at is null;

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null check (char_length(title) > 0),
  description text,
  status task_status not null default 'inbox',
  priority task_priority not null default 'none',
  start_date date,
  due_date date,
  due_time time,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  waiting_for text,
  list_name text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'quick_entry', 'recurrence')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  device_id uuid references devices(id) on delete set null
);

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create index tasks_user_id_idx on tasks (user_id) where deleted_at is null;
create index tasks_project_idx on tasks (project_id) where deleted_at is null;
create index tasks_parent_idx on tasks (parent_task_id) where deleted_at is null;
create index tasks_due_date_idx on tasks (user_id, due_date) where deleted_at is null and status not in ('completed', 'cancelled');
create index tasks_status_idx on tasks (user_id, status) where deleted_at is null;
create index tasks_search_idx on tasks using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Subtasks are lightweight checklist items; full tasks can also be nested via
-- parent_task_id above when subtask needs full task features.
create table task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null check (char_length(title) > 0),
  is_completed boolean not null default false,
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger task_subtasks_set_updated_at
  before update on task_subtasks
  for each row execute function set_updated_at();

create index task_subtasks_task_idx on task_subtasks (task_id) where deleted_at is null;

create table task_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  interval integer not null default 1 check (interval > 0),
  by_weekday smallint[] ,
  by_month_day smallint[],
  starts_on date not null,
  ends_on date,
  max_occurrences integer,
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger task_recurrence_rules_set_updated_at
  before update on task_recurrence_rules
  for each row execute function set_updated_at();

create index task_recurrence_rules_task_idx on task_recurrence_rules (task_id) where deleted_at is null;

create table task_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'local_notification' check (channel in ('local_notification', 'email')),
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index task_reminders_task_idx on task_reminders (task_id);
create index task_reminders_due_idx on task_reminders (user_id, remind_at) where sent_at is null and cancelled_at is null;

-- Simple dependency graph: task_id depends on depends_on_task_id (must
-- complete first). Enforced in application logic to avoid cycles.
create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create index task_dependencies_task_idx on task_dependencies (task_id);
