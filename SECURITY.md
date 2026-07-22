# Security

## Row Level Security

Every user-owned table has RLS **enabled**, with four policies (`select_own`, `insert_own`, `update_own`, `delete_own`) all keyed on `user_id = auth.uid()` — see `supabase/policies/0001_rls_policies.sql`, the single dedicated file containing every policy. There are no permissive/"authenticated can do anything" policies anywhere. Exceptions, all deliberate:

- `profiles`: keyed on `id = auth.uid()`, insert-only via the `handle_new_user()` trigger (`SECURITY DEFINER`) — never client-insertable.
- `note_versions`, `audit_logs`: select + insert only. History is immutable; there is no update/delete policy.
- `account_balance_snapshots`: select only. Written exclusively by trusted server-side logic (future `SECURITY DEFINER` function), never directly by the client — this is what "do not allow direct mutation of historical balances" means in practice.

Storage (`documents`, `avatars` buckets) is isolated by user folder: every policy checks `(storage.foldername(name))[1] = auth.uid()::text`. The `documents` bucket is fully private; the `avatars` bucket allows public _read_ (profile pictures only — never a financial document) with owner-only write.

## Session storage

Supabase session tokens are never stored in plaintext `AsyncStorage`. On native, `src/services/supabase/secure-store-adapter.ts` implements the standard Expo pattern for large session objects: a random AES-256 key is generated per storage key and kept in `expo-secure-store` (iOS Keychain / Android Keystore — capped at ~2048 bytes per item, too small for a full session), while the AES-encrypted session blob itself (no practical size limit) lives in `AsyncStorage`. AsyncStorage alone never sees plaintext tokens. On web, the browser's own storage is used (there is no native Keychain/Keystore equivalent to wrap).

## App lock

Biometric unlock (`expo-local-authentication`, native only) with a PIN fallback. The PIN never leaves the device and is never sent to Supabase — only a salted SHA-256 hash is stored in SecureStore (`src/services/security/pin.ts`). Auto-lock triggers after `user_preferences.auto_lock_minutes` (default 5) of the app being backgrounded (`src/components/layout/AppLockGate.tsx`), tracked via `AppState`. Not available on web (no OS-level equivalent).

## Account numbers and PII

Account numbers are stored masked (`masked_account_number`, `last_four`) — the schema never has a column for a full, unmasked account number. `src/utils/logger.ts`'s `redact()` helper masks any value down to its last 4 characters for the rare case a raw reference needs to appear in a log.

## Never logged, never bundled

- Raw financial documents, auth tokens, and full account numbers are never passed to `logger.*` — `logger.ts`'s context sanitizer additionally redacts any log-context key matching `/token|password|secret|api[_-]?key|account[_-]?number|pin\b/i` as a second line of defense.
- Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `DOCUMENT_PROCESSING_SECRET`, `CRON_SECRET`) are never read outside `supabase/functions/**` (Deno) or a server-only Vercel context — never prefixed `EXPO_PUBLIC_`, never imported by anything under `src/`. `src/constants/env.ts` only ever reads `EXPO_PUBLIC_*` variables and throws `EnvValidationError` (a friendly, no-stack-trace message) if the client is misconfigured.

## Account deletion

`supabase/functions/delete-account/index.ts` is the only way an account is deleted. It: (1) verifies the caller's own JWT via an anon-key-scoped client (there is no way to pass an arbitrary user id — you can only ever delete the account whose token you're holding), (2) removes that user's objects from both storage buckets, (3) calls `auth.admin.deleteUser()` with a service-role client, which cascades to every user-owned table via `ON DELETE CASCADE`. The Settings screen requires an explicit destructive-action confirmation dialog before invoking it (`src/app/settings/index.tsx`). Known limitation: the storage cleanup step lists only the top level of each user's folder (`storage.list(user.id)`), so files nested in subfolders would need a recursive listing pass before this goes to production — tracked for the Documents phase, where the actual folder structure gets decided.

## OCR-extracted data

By design, nothing produced by the (not-yet-built) OCR pipeline can become a real `financial_transactions` row without landing in the `extracted_transactions` review queue and being explicitly confirmed by the user (`review_status = 'confirmed'`). See [OCR_PIPELINE.md](./OCR_PIPELINE.md).

## Input/file validation

Not yet implemented (Phase 5, when uploads exist). Planned: MIME-type validation against an allowlist (never trust the file extension alone), size limits read from `MAX_UPLOAD_MB`, page-count limits from `MAX_PDF_PAGES` — both configurable via environment variables / Settings, never hardcoded.

## Rate limiting

Not yet implemented — planned at the Edge Function layer for extraction jobs (`MAX_DAILY_EXTRACTIONS`) and email sends (`MAX_DAILY_EMAILS`), both configurable via environment variables rather than hardcoded vendor quota numbers.

## What's still open

This document will grow with each phase. As of Phase 1: audit logging (`audit_logs` table + RLS exist; nothing writes to it yet), file/upload validation, and rate limiting are schema-ready but not yet wired to running code.
