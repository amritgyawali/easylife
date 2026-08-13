import type { InlineFrameProps } from '@/features/documents/viewer/inline-frame-types';

/**
 * Native build: there is no frame to embed into.
 *
 * Rendering a PDF in-process on Android/iOS needs a native module, and this
 * project is pinned to SDK 54 precisely so it keeps running in Expo Go (see
 * AGENTS.md) — so the reader hands PDFs to the system viewer here and keeps
 * true in-page reading for the web app, rather than shipping a dependency
 * that would make the app unopenable on the phone it's developed against.
 *
 * Everything else the reader supports (images, CSV, text) renders natively on
 * all three platforms and never reaches this component.
 */
export function InlineFrame({ fallback }: InlineFrameProps) {
  return <>{fallback}</>;
}
