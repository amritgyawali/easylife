import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { AppError } from '@/utils/errors';
import { formatFileSize } from '@/utils/bytes';
import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import { downloadDocument, readFileBytes, signedUrlFor } from '@/features/documents/api';
import { needsBytes } from '@/features/documents/viewer/file-kinds';
import { describeReaderSource, type ReaderSource } from '@/features/documents/viewer/reader-source';

/**
 * How long a viewing link stays valid. Long enough to actually read a
 * statement without the page dying mid-scroll, short enough that a URL copied
 * out of the address bar is worthless within the hour.
 */
export const READER_URL_TTL_SECONDS = 60 * 60;

/**
 * Largest file the reader will pull into memory to parse.
 *
 * Well above anything the vault accepts (`EXPO_PUBLIC_MAX_UPLOAD_MB`, 15 MB by
 * default) so it never fires on a stored document, and there to catch the case
 * the limit doesn't cover: a huge file opened straight off the device.
 */
const MAX_IN_MEMORY_BYTES = 64 * 1024 * 1024;

export interface ReaderContent {
  /**
   * A URL the platform can render directly — an `<iframe>` on web, an
   * `<Image>` on native. Null for kinds that are rendered from text.
   */
  displayUrl: string | null;
  /** Raw file bytes, loaded only for the text-rendered kinds. */
  bytes: Uint8Array | null;
}

export interface ReaderContentState {
  content: ReaderContent | null;
  isLoading: boolean;
  error: unknown;
  reload: () => void;
}

/**
 * Loads whatever the viewer needs to show a source, and nothing more.
 *
 * Two deliberate choices:
 *
 * 1. **Not TanStack Query.** Every query in this app is persisted to
 *    AsyncStorage (see `services/offline/persister.ts`), and writing a 12 MB
 *    scan into `localStorage` on web would blow the storage quota and take
 *    the whole cache down with it. File contents are cache-hostile by nature,
 *    so they live in component state for exactly as long as the file is open.
 *
 * 2. **URL over bytes wherever possible.** A PDF or an image is handed to the
 *    browser as a signed URL (vault) or an object URL (local file), so the
 *    platform streams and decodes it. Only CSV/text — which have to become
 *    strings anyway — are pulled into the JS heap.
 */
export function useReaderContent(source: ReaderSource | null): ReaderContentState {
  const [content, setContent] = useState<ReaderContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  // Latest-value ref: the effect is keyed on the source's identity string, not
  // on the object, so a caller re-deriving `{ origin, document }` on every
  // render can't put this into a reload loop.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const key = source ? describeReaderSource(source).key : null;

  useEffect(() => {
    const current = sourceRef.current;

    if (!current || !key) {
      setContent(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;

    setIsLoading(true);
    setError(null);
    setContent(null);

    void (async () => {
      try {
        const { kind, mimeType, sizeBytes } = describeReaderSource(current);

        if (needsBytes(kind)) {
          // Parsing means holding the file, its decoded text and the parsed
          // result at once. Beyond this a phone would be killed by the OS
          // rather than shown a document, so say so instead.
          if (sizeBytes > MAX_IN_MEMORY_BYTES) {
            throw new DocumentParseError(
              `This file is ${formatFileSize(sizeBytes)}. The reader opens documents up to ${formatFileSize(
                MAX_IN_MEMORY_BYTES
              )} in place; open it outside the app instead.`
            );
          }

          const bytes =
            current.origin === 'vault'
              ? await downloadDocument(current.document)
              : await readFileBytes(current.file.uri);

          if (cancelled) return;
          setContent({ displayUrl: null, bytes });
          return;
        }

        if (current.origin === 'vault') {
          const displayUrl = await signedUrlFor(current.document, READER_URL_TTL_SECONDS);
          if (cancelled) return;
          setContent({ displayUrl, bytes: null });
          return;
        }

        // A local file on native is already a readable `file://` URL. On web
        // the picker hands back a `data:` URL, which browsers refuse to render
        // as a PDF inside a frame — so the bytes are re-wrapped as a blob.
        if (Platform.OS !== 'web') {
          setContent({ displayUrl: current.file.uri, bytes: null });
          return;
        }

        const bytes = await readFileBytes(current.file.uri);
        if (cancelled) return;

        // `readFileBytes` always returns a whole, freshly allocated array, so
        // its backing buffer is exactly the file. The cast is needed only
        // because TypeScript models every `Uint8Array` as possibly
        // SharedArrayBuffer-backed, which `BlobPart` excludes.
        const fileBuffer = bytes.buffer as ArrayBuffer;
        createdObjectUrl = URL.createObjectURL(new Blob([fileBuffer], { type: mimeType }));
        setContent({ displayUrl: createdObjectUrl, bytes: null });
      } catch (failure) {
        if (cancelled) return;
        setError(
          failure instanceof AppError
            ? failure
            : new AppError('not_found', 'The file could not be opened.', failure)
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { content, isLoading, error, reload };
}
