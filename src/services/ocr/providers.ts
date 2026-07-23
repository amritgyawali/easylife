import { getSupabaseClient } from '@/services/supabase/client';
import { readFileBytes } from '@/features/documents/api';
import { AppError } from '@/utils/errors';
import {
  ProviderUnavailableError,
  type ExtractionEngine,
  type OCRInput,
  type OCRProvider,
  type OCRResult,
  type ProviderAvailability,
} from '@/services/ocr/types';

/**
 * The concrete extraction engines.
 *
 * Delimited text needs no recognition at all, and server-side OCR
 * (`serverFallbackProvider` below) covers photos and PDFs on every
 * platform via a Supabase Edge Function — see
 * `supabase/functions/ocr-extract`. On-device ML Kit is deliberately *not*
 * registered: it needs native modules and therefore a development build,
 * which can never run in Expo Go, and this project is pinned to SDK 54
 * precisely so it runs in Expo Go (see AGENTS.md). A provider that always
 * fails at runtime would be worse than not offering it.
 */

/** Statement exports the app can read today, with no OCR involved. */
const DELIMITED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
];

export const delimitedTextProvider: OCRProvider = {
  engine: 'pdf_text',
  supportsCancellation: false,

  accepts(mimeType: string) {
    return DELIMITED_MIME_TYPES.some((type) => mimeType.toLowerCase().startsWith(type));
  },

  availability(): ProviderAvailability {
    return { available: true };
  },

  async extractText(input: OCRInput): Promise<OCRResult> {
    if (input.text === undefined) {
      throw new ProviderUnavailableError('pdf_text', 'The file could not be read as text.');
    }
    return { text: input.text, engine: 'pdf_text', pagesProcessed: 1 };
  },
};

const IMAGE_AND_PDF_MIME_TYPES = ['image/', 'application/pdf'];

// OCR.space's free-tier per-file limit — checked client-side so an oversized
// photo fails fast with a helpful message instead of a slow round trip that
// the server would reject anyway (see supabase/functions/ocr-extract).
const MAX_OCR_IMAGE_BYTES = 1_000_000;

/**
 * Reads text off a photo or PDF via a Supabase Edge Function calling
 * OCR.space (see `supabase/functions/ocr-extract`). No native module, no
 * vendor key in the client bundle — just an authenticated call, so it works
 * identically in Expo Go on iOS, Android and web.
 *
 * The returned text feeds the same delimited-table parser CSV imports use
 * (`src/features/imports/parse-statement.ts`); a bank statement photo taken
 * with "isTable" recognition on tends to keep its column spacing, which is
 * what that parser looks for. A single retail receipt won't look like a
 * table and will mostly come back unparsed — that is a real limitation, not
 * a bug, and is why Scan still offers a plain "file to Documents" path too.
 */
export const serverFallbackProvider: OCRProvider = {
  engine: 'server_fallback',
  supportsCancellation: false,

  accepts(mimeType: string) {
    return IMAGE_AND_PDF_MIME_TYPES.some((type) => mimeType.toLowerCase().startsWith(type));
  },

  availability(): ProviderAvailability {
    return { available: true };
  },

  async extractText(input: OCRInput): Promise<OCRResult> {
    const bytes = await readFileBytes(input.uri);

    if (bytes.byteLength > MAX_OCR_IMAGE_BYTES) {
      throw new AppError(
        'unreadable_image',
        'That photo is too large to scan for text. Retake it at a lower quality, or crop it tighter to the document.'
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke<{ text: string; pagesProcessed: number }>(
      'ocr-extract',
      { method: 'POST', body: { imageBase64: bytesToBase64(bytes), mimeType: input.mimeType } }
    );

    if (error || !data) {
      throw new AppError('ocr_failed', await functionErrorMessage(error));
    }

    return { text: data.text, engine: 'server_fallback', pagesProcessed: data.pagesProcessed };
  },
};

/** Chunked to avoid blowing the call stack on `String.fromCharCode(...bytes)` for a multi-MB photo. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

const DEFAULT_OCR_FAILURE_MESSAGE =
  "We couldn't read this document automatically. You can still enter the transaction manually, or export a CSV instead.";

/** The Edge Function's `{ error: string }` body, if the failure carried one. */
async function functionErrorMessage(error: unknown): Promise<string> {
  const context = error && typeof error === 'object' && 'context' in error ? error.context : null;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string };
      if (typeof body.error === 'string' && body.error.length > 0) return body.error;
    } catch {
      // Response body wasn't JSON — fall through to the default message.
    }
  }
  return DEFAULT_OCR_FAILURE_MESSAGE;
}

const ALL_PROVIDERS: OCRProvider[] = [delimitedTextProvider, serverFallbackProvider];

/**
 * Picks the engine for a file, preferring one that actually works.
 *
 * Available providers are tried first so a CSV never falls through to an
 * unavailable OCR engine; an unavailable-but-matching provider is returned
 * only so the caller can surface its reason rather than a generic failure.
 */
export function providerFor(mimeType: string): OCRProvider | null {
  const matching = ALL_PROVIDERS.filter((provider) => provider.accepts(mimeType));
  return matching.find((provider) => provider.availability().available) ?? matching[0] ?? null;
}

export function listProviders(): OCRProvider[] {
  return ALL_PROVIDERS;
}

export type { ExtractionEngine };
