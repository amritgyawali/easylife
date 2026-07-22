/**
 * The extraction-engine abstraction from OCR_PIPELINE.md.
 *
 * Four engines are foreseen (`extraction_jobs.engine` enumerates them):
 * delimited-text parsing, on-device ML Kit, Tesseract in a web worker, and an
 * optional Edge Function fallback. They sit behind one interface so a future
 * paid AI provider could be added as a fifth without touching call sites.
 *
 * Crucially, a provider is allowed to be *unavailable*, and must say so with
 * a reason the UI can show. The architecture requires the app to keep working
 * with the optional engines disabled, so "unavailable" is a normal state, not
 * an error path.
 */

export type ExtractionEngine = 'pdf_text' | 'mlkit' | 'tesseract_web' | 'server_fallback';

export interface OCRInput {
  /** Local file URI from the document picker or camera. */
  uri: string;
  mimeType: string;
  /** Set for text-like sources the caller has already read. */
  text?: string;
}

export interface OCRResult {
  /** The full extracted text, ready for the statement parser. */
  text: string;
  engine: ExtractionEngine;
  pagesProcessed: number;
}

export interface ProviderAvailability {
  available: boolean;
  /** Shown to the user when unavailable. Must explain what to do instead. */
  reason?: string;
}

export interface OCRProvider {
  readonly engine: ExtractionEngine;
  readonly supportsCancellation: boolean;
  /** MIME types this provider claims. */
  accepts(mimeType: string): boolean;
  availability(): ProviderAvailability;
  extractText(input: OCRInput): Promise<OCRResult>;
}

export class ProviderUnavailableError extends Error {
  readonly engine: ExtractionEngine;

  constructor(engine: ExtractionEngine, message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
    this.engine = engine;
  }
}
