import { AppError } from '@/utils/errors';

/**
 * A parsing failure with a message meant for the person reading the document.
 *
 * `toUserMessage` deliberately replaces an `AppError`'s message with fixed copy
 * per code, so that a Supabase or network error can never leak its internals
 * into the UI. That is the right default and the wrong one here: "this Word
 * file has no document part — it may be an older .doc renamed to .docx" tells
 * someone exactly what happened and what to do, and it is a string this
 * codebase wrote, not one a server handed us.
 *
 * So parse failures carry their own `detail`, and only the viewer — which
 * knows the string is safe by construction — shows it.
 */
export class DocumentParseError extends AppError {
  readonly detail: string;

  constructor(detail: string, cause?: unknown) {
    super('unsupported_document', detail, cause);
    this.name = 'DocumentParseError';
    this.detail = detail;
  }
}

/** The reader-facing explanation for an error, when it has one. */
export function parseErrorDetail(error: unknown): string | null {
  return error instanceof DocumentParseError ? error.detail : null;
}
