import { Platform } from 'react-native';

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
 * Only the delimited-text engine is implemented today, and that is a
 * deliberate, documented position rather than an oversight:
 *
 *   - **ML Kit** needs native modules and therefore a development build. It
 *     can never work in Expo Go, and this project is pinned to SDK 54 *for*
 *     Expo Go (see AGENTS.md). Shipping a provider that always fails at
 *     runtime would be worse than one that says up front what it needs.
 *   - **Tesseract / PDF.js** would add megabytes of web-only dependency and a
 *     worker pipeline for a capability that is useless on the platform this
 *     app is actually developed against.
 *
 * Both are registered as unavailable-with-a-reason so the UI can explain the
 * situation, and so adding the real implementation later is a change to one
 * file rather than to every call site.
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

function unimplemented(engine: ExtractionEngine, mimeTypes: string[], reason: string): OCRProvider {
  return {
    engine,
    supportsCancellation: false,
    accepts: (mimeType) => mimeTypes.some((type) => mimeType.toLowerCase().startsWith(type)),
    availability: () => ({ available: false, reason }),
    extractText: () => Promise.reject(new ProviderUnavailableError(engine, reason)),
  };
}

export const mlKitProvider = unimplemented(
  'mlkit',
  ['image/'],
  'Reading text from photos needs on-device ML Kit, which requires an Expo development build — it cannot run in Expo Go. Enter the transaction manually, or export a CSV from your bank.'
);

export const tesseractWebProvider = unimplemented(
  'tesseract_web',
  ['application/pdf', 'image/'],
  'Reading text from PDFs and images in the browser is not enabled in this build. Export a CSV from your bank instead, or enter the transaction manually.'
);

const ALL_PROVIDERS: OCRProvider[] = [
  delimitedTextProvider,
  // Photos are only ever handled on a native platform.
  ...(Platform.OS === 'web' ? [tesseractWebProvider] : [mlKitProvider, tesseractWebProvider]),
];

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
