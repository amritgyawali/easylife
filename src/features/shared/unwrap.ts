import type { PostgrestError } from '@supabase/supabase-js';

import { AppError, type AppErrorCode } from '@/utils/errors';

/**
 * Turns a Supabase result into data-or-throw, mapping Postgres error codes
 * onto the app's own `AppErrorCode` vocabulary.
 *
 * Every feature query goes through here so the UI can branch on `code`
 * (see `ErrorState`) instead of pattern-matching driver error strings, and
 * so a raw Postgres message never reaches the screen.
 */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): NonNullable<T> {
  if (result.error) throw toAppError(result.error);
  // A successful select always yields data; `null` here only happens on the
  // `.single()` no-rows path, which Supabase reports as an error instead —
  // hence the non-null return type, which spares every caller a redundant
  // null check the driver has already ruled out.
  return result.data as NonNullable<T>;
}

/** Same as `unwrap`, for writes where only the error matters. */
export function unwrapVoid(result: { error: PostgrestError | null }): void {
  if (result.error) throw toAppError(result.error);
}

export function toAppError(error: PostgrestError): AppError {
  const code: AppErrorCode =
    error.code === 'PGRST116'
      ? 'not_found'
      : error.code === '23505'
        ? 'duplicate_data'
        : error.code === '23514' || error.code === '23503'
          ? 'validation_failed'
          : error.code === '42501'
            ? 'session_expired'
            : 'unknown';

  return new AppError(code, error.message, error);
}
