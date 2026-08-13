import { Platform } from 'react-native';

import { formatFileSize } from '@/utils/bytes';
import { formatIsoDate } from '@/utils/date';
import type { DocumentRow, PickedFile } from '@/features/documents/api';
import { resolveViewerKind, type ViewerKind } from '@/features/documents/viewer/file-kinds';

/**
 * The two things the reader can open.
 *
 * A local file is deliberately a first-class source rather than a step on the
 * way to an upload: the point of the reader is that a file can be opened and
 * read immediately, in the page, with no round trip to storage and nothing
 * saved unless the user asks for it.
 */
export type ReaderSource = { origin: 'vault'; document: DocumentRow } | { origin: 'local'; file: PickedFile };

export interface ReaderSourceMeta {
  /** Stable identity for the source, used to key loading effects. */
  key: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: ViewerKind;
  /** One line of provenance shown under the title. */
  subtitle: string;
}

export function describeReaderSource(source: ReaderSource): ReaderSourceMeta {
  if (source.origin === 'vault') {
    const { document } = source;
    const kind = resolveViewerKind({ name: document.storage_path, mimeType: document.mime_type });

    return {
      // The id alone: a stored object never changes in place, so editing the
      // title must not throw away a document that is already open.
      key: `vault:${document.id}`,
      title: document.title,
      fileName: document.storage_path.split('/').pop() ?? document.title,
      mimeType: document.mime_type,
      sizeBytes: document.file_size_bytes,
      kind,
      subtitle: [
        formatFileSize(document.file_size_bytes),
        document.institution,
        document.document_date ? formatIsoDate(document.document_date) : null,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }

  const { file } = source;
  const kind = resolveViewerKind({ name: file.name, mimeType: file.mimeType });

  return {
    key: `local:${file.uri}`,
    title: file.name,
    fileName: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.size,
    kind,
    subtitle: [formatFileSize(file.size), 'On this device — not saved'].join(' · '),
  };
}

/**
 * Releases a browser object URL held by a local source.
 *
 * Every `URL.createObjectURL` pins the whole file in memory until it is
 * revoked or the tab closes, so dropping ten statements into the reader
 * without this would keep all ten alive.
 */
export function releaseReaderSource(source: ReaderSource | null): void {
  if (!source || source.origin !== 'local') return;
  if (Platform.OS !== 'web') return;
  if (!source.file.uri.startsWith('blob:')) return;

  URL.revokeObjectURL(source.file.uri);
}
