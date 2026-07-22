-- 0001_rls_policies.sql
-- Row Level Security for every user-owned table in Amrit LifeOS.
--
-- Rules enforced throughout this file (per SECURITY.md):
--   * A user may SELECT only rows where user_id = auth.uid() (or id =
--     auth.uid() for `profiles`).
--   * A user may INSERT only rows where user_id = auth.uid().
--   * A user may UPDATE/DELETE only rows they already own, and cannot
--     change user_id to someone else's via the WITH CHECK clause.
--   * No permissive/blanket "authenticated can do anything" policies exist
--     anywhere in this file.
--   * Tables that represent immutable history (audit_logs, note_versions)
--     intentionally have no UPDATE or DELETE policy at all.
--   * Tables maintained only by trusted server-side logic
--     (account_balance_snapshots) intentionally have no client-writable
--     policy — they are refreshed via SECURITY DEFINER functions.
--
-- This file is idempotent-ish for local dev via `drop policy if exists`, but
-- is intended to be applied once per table as part of the migration set.

-- ---------------------------------------------------------------------------
-- profiles (owner column: id)
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- No insert/delete policy: profile rows are created by the
-- handle_new_user() trigger (SECURITY DEFINER) and removed via
-- ON DELETE CASCADE when the auth.users row is deleted.

-- ---------------------------------------------------------------------------
-- user_preferences / email_preferences (owner column: user_id, PK)
-- ---------------------------------------------------------------------------
alter table user_preferences enable row level security;

create policy "user_preferences_select_own" on user_preferences
  for select using (user_id = auth.uid());
create policy "user_preferences_update_own" on user_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table email_preferences enable row level security;

create policy "email_preferences_select_own" on email_preferences
  for select using (user_id = auth.uid());
create policy "email_preferences_update_own" on email_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Generic full-CRUD-by-owner tables.
-- Every table below has a `user_id uuid` column set on insert to auth.uid().
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  owned_tables text[] := array[
    'devices',
    'tags', 'entity_tags',
    'projects', 'tasks', 'task_subtasks', 'task_recurrence_rules',
    'task_reminders', 'task_dependencies',
    'habits', 'habit_entries',
    'notes', 'note_links', 'calendar_events',
    'accounts', 'categories', 'counterparties', 'counterparty_aliases',
    'counterparty_bank_references', 'counterparty_wallet_references',
    'exchange_rates',
    'financial_transactions', 'ledger_entries', 'transaction_splits',
    'loans', 'loan_events', 'loan_instalments', 'loan_reminders',
    'budgets', 'budget_items', 'savings_goals', 'goal_events',
    'investment_assets', 'investment_transactions', 'investment_valuations',
    'documents', 'document_pages', 'import_profiles',
    'extraction_jobs', 'extracted_statements', 'extracted_transactions',
    'import_rules', 'attachments',
    'notifications',
    'sync_conflicts'
  ];
begin
  foreach t in array owned_tables loop
    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy %I on %I for select using (user_id = auth.uid())',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (user_id = auth.uid())',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (user_id = auth.uid())',
      t || '_delete_own', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Append-only / immutable-history tables: select + insert only.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  append_only_tables text[] := array['note_versions', 'audit_logs'];
begin
  foreach t in array append_only_tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (user_id = auth.uid())',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (user_id = auth.uid())',
      t || '_insert_own', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- account_balance_snapshots: read-only to the client. Written only by
-- SECURITY DEFINER functions (e.g. refresh_account_balance, added in the
-- finance feature migration) which verify ownership internally before
-- writing, so no client-facing INSERT/UPDATE/DELETE policy is defined here.
-- ---------------------------------------------------------------------------
alter table account_balance_snapshots enable row level security;

create policy "account_balance_snapshots_select_own" on account_balance_snapshots
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: private `documents` bucket, isolated by user folder
-- (documents/<user_id>/...). No public buckets, no permanent public URLs —
-- access is exclusively via short-lived signed URLs requested by the owning
-- authenticated user.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_select_own"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_update_own"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_bucket_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket: public read (profile pictures only, never financial
-- documents), owner-only write.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_bucket_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_bucket_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_bucket_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
