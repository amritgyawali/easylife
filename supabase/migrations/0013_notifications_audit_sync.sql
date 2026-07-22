-- 0013_notifications_audit_sync.sql
-- In-app notifications, email preferences (Resend opt-in/out), audit trail
-- and the sync-conflict log used by the mobile offline-first engine.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'task_reminder', 'habit_reminder', 'bill_due', 'loan_due', 'loan_overdue',
    'extraction_complete', 'export_ready', 'backup_reminder', 'sync_conflict', 'security'
  )),
  title text not null,
  body text,
  related_entity_type linkable_entity,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications (user_id, created_at desc) where read_at is null;

create table email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  welcome_sent_at timestamptz,
  security_notifications boolean not null default true,
  weekly_summary boolean not null default true,
  loan_due_reminders boolean not null default true,
  export_ready_notifications boolean not null default true,
  extraction_complete_notifications boolean not null default true,
  backup_reminders boolean not null default false,
  include_amounts_in_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_preferences_set_updated_at
  before update on email_preferences
  for each row execute function set_updated_at();

-- Append-only audit trail for sensitive/financial actions. Never stores raw
-- document content, tokens or full account numbers — only structured,
-- non-sensitive metadata about what happened.
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  device_id uuid references devices(id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index audit_logs_user_idx on audit_logs (user_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- Sync conflicts: when a local (offline) edit and a server edit to the same
-- row diverge, both versions are preserved here for the user to resolve.
-- Financial data is never silently discarded (see OFFLINE_SYNC.md).
create table sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  local_version integer not null,
  server_version integer not null,
  local_payload jsonb not null,
  server_payload jsonb not null,
  device_id uuid references devices(id) on delete set null,
  resolution text check (resolution in ('kept_local', 'kept_server', 'merged')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index sync_conflicts_user_unresolved_idx on sync_conflicts (user_id) where resolved_at is null;
create index sync_conflicts_entity_idx on sync_conflicts (entity_type, entity_id);
