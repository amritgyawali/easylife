/**
 * Consistent error architecture used across the whole app (see
 * ARCHITECTURE.md "Error handling"). Every error the UI needs to react to
 * differently is a distinct AppError subclass with a fixed `code`; screens
 * branch on `code`, never on parsing an error message string. `toUserMessage`
 * is the single place that turns any error (AppError or not) into copy that
 * is safe to show a user — no raw stack traces ever reach the UI.
 */

export type AppErrorCode =
  | 'no_internet'
  | 'session_expired'
  | 'upload_failed'
  | 'unsupported_document'
  | 'auth_failed'
  | 'ocr_failed'
  | 'ocr_partial_result'
  | 'unreadable_image'
  | 'reconciliation_mismatch'
  | 'duplicate_data'
  | 'sync_conflict'
  | 'storage_quota_reached'
  | 'email_quota_reached'
  | 'rate_limited'
  | 'service_unavailable'
  | 'validation_failed'
  | 'not_found'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

const USER_MESSAGES: Record<AppErrorCode, string> = {
  no_internet: "You're offline. Changes are saved on this device and will sync once you're back online.",
  session_expired: 'Your session has expired. Please sign in again.',
  upload_failed: "The file couldn't be uploaded. Check your connection and try again.",
  unsupported_document:
    'This file type or size is not supported. Use a PDF, JPG or PNG under the size limit.',
  auth_failed: 'That email or password is not correct.',
  ocr_failed: "We couldn't read this document automatically. You can still enter the details manually.",
  ocr_partial_result:
    'Only part of this document could be read automatically — please review the highlighted rows.',
  unreadable_image: 'This photo is too blurry or dark to read. Try retaking it with better lighting.',
  reconciliation_mismatch: "The statement's opening and closing balances don't match the transactions found.",
  duplicate_data: 'This looks like something you already have. Review the match before continuing.',
  sync_conflict: 'This item changed on another device too. Choose which version to keep.',
  storage_quota_reached:
    "You've reached your storage limit for now. Delete unused documents or try again later.",
  email_quota_reached:
    "You've reached today's email limit. This will be sent automatically once the limit resets.",
  rate_limited: "You're doing that a little too fast. Please wait a moment and try again.",
  service_unavailable: "We're having trouble reaching the server. Please try again shortly.",
  validation_failed: 'Please check the highlighted fields and try again.',
  not_found: "We couldn't find what you were looking for.",
  unknown: 'Something unexpected happened. Please try again.',
};

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return USER_MESSAGES[error.code];
  }
  return USER_MESSAGES.unknown;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
