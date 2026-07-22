-- 0003_tags.sql
-- Generic tagging usable across tasks, notes, transactions, documents, etc.
-- entity_tags is intentionally polymorphic (entity_type + entity_id) rather
-- than FK-per-table, since tags apply to many unrelated tables. Ownership is
-- still enforced by RLS via user_id on both tables.

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create trigger tags_set_updated_at
  before update on tags
  for each row execute function set_updated_at();

create index tags_user_id_idx on tags (user_id) where deleted_at is null;

create type taggable_entity as enum (
  'task', 'note', 'financial_transaction', 'document', 'loan',
  'investment_asset', 'counterparty', 'savings_goal'
);

create table entity_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  entity_type taggable_entity not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tag_id, entity_type, entity_id)
);

create index entity_tags_lookup_idx on entity_tags (user_id, entity_type, entity_id);
create index entity_tags_tag_idx on entity_tags (tag_id);
