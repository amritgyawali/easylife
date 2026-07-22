-- 0006_notes.sql
-- Notes with version history, folders, linking to other entities, and an
-- optional application-level lock (encryption key handled client-side; the
-- server only stores the ciphertext + a lock flag).

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder text,
  note_type note_type not null default 'plain',
  title text not null default '',
  content text not null default '',
  content_checklist jsonb,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  is_locked boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  device_id uuid references devices(id) on delete set null
);

create trigger notes_set_updated_at
  before update on notes
  for each row execute function set_updated_at();

create index notes_user_id_idx on notes (user_id) where deleted_at is null;
create index notes_folder_idx on notes (user_id, folder) where deleted_at is null;
create index notes_pinned_idx on notes (user_id) where is_pinned and deleted_at is null;
create index notes_search_idx on notes using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

create table note_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index note_versions_note_idx on note_versions (note_id, created_at desc);

-- Internal links between notes and any other entity (task, loan, transaction, ...).
create type linkable_entity as enum (
  'task', 'note', 'financial_transaction', 'loan', 'investment_asset',
  'document', 'calendar_event', 'counterparty'
);

create table note_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references notes(id) on delete cascade,
  linked_entity_type linkable_entity not null,
  linked_entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (note_id, linked_entity_type, linked_entity_id)
);

create index note_links_note_idx on note_links (note_id);
create index note_links_entity_idx on note_links (user_id, linked_entity_type, linked_entity_id);

-- Calendar events (appointments) referenced by the Today dashboard and note links.
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) > 0),
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);

create trigger calendar_events_set_updated_at
  before update on calendar_events
  for each row execute function set_updated_at();

create index calendar_events_user_range_idx on calendar_events (user_id, starts_at) where deleted_at is null;
