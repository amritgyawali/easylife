/**
 * How a file should be *read*, independent of where it came from.
 *
 * Pure and platform-free on purpose: the same resolution has to hold for a
 * file the user just picked (which has only a name and the picker's guess at
 * a MIME type) and for a row already in the vault (which has a stored
 * `mime_type`), on web and on native alike. Each kind maps to exactly one
 * renderer in `DocumentViewer`, so adding a format later is a new entry here
 * plus a new view — never a branch inside a screen.
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ViewerKind = 'pdf' | 'image' | 'delimited' | 'text' | 'unsupported';

export interface FileIdentity {
  name: string;
  /** The picker's or the vault row's content type; often missing or wrong. */
  mimeType?: string | null;
}

/**
 * MIME types that are textual despite not living under `text/*`.
 * Anything ending in `+json` / `+xml` is handled by the suffix rule below.
 */
const TEXTUAL_MIME_TYPES = new Set([
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/x-sh',
  'application/javascript',
  'application/x-ndjson',
]);

const DELIMITED_MIME_TYPES = new Set([
  'text/csv',
  'text/comma-separated-values',
  'text/tab-separated-values',
  'application/csv',
  'application/vnd.ms-excel', // What several exporters label a plain .csv as.
]);

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf', 'application/acrobat']);

/** Extension fallback, for the very common case of a missing or generic MIME type. */
const EXTENSION_KINDS: Record<string, ViewerKind> = {
  pdf: 'pdf',
  csv: 'delimited',
  tsv: 'delimited',
  tab: 'delimited',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  heic: 'image',
  heif: 'image',
  svg: 'image',
  txt: 'text',
  text: 'text',
  log: 'text',
  md: 'text',
  markdown: 'text',
  json: 'text',
  ndjson: 'text',
  xml: 'text',
  yml: 'text',
  yaml: 'text',
  ini: 'text',
  conf: 'text',
  sql: 'text',
  vcf: 'text',
  ics: 'text',
};

export function fileExtension(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const dot = trimmed.lastIndexOf('.');
  // A leading dot is a dotfile (".env"), not an extension.
  return dot > 0 ? trimmed.slice(dot + 1) : '';
}

/**
 * Decides which viewer can render a file.
 *
 * MIME type wins when it says something specific, because a `.dat` export
 * served as `text/csv` really is a CSV. The extension is the fallback rather
 * than the primary signal because pickers hand back
 * `application/octet-stream` constantly, and that must not turn a readable
 * PDF into "unsupported".
 */
export function resolveViewerKind({ name, mimeType }: FileIdentity): ViewerKind {
  const mime = (mimeType ?? '').trim().toLowerCase().split(';')[0]?.trim() ?? '';

  if (PDF_MIME_TYPES.has(mime)) return 'pdf';
  if (DELIMITED_MIME_TYPES.has(mime)) return 'delimited';
  // SVG is served as an image and every browser renders it as one; native
  // falls back to the "can't preview" card rather than a broken image.
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('text/') || TEXTUAL_MIME_TYPES.has(mime)) return 'text';
  if (mime.endsWith('+json') || mime.endsWith('+xml')) return 'text';

  return EXTENSION_KINDS[fileExtension(name)] ?? 'unsupported';
}

/** Short label for the kind badge, e.g. "PDF", "Spreadsheet". */
export function viewerKindLabel(kind: ViewerKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'image':
      return 'Image';
    case 'delimited':
      return 'Spreadsheet';
    case 'text':
      return 'Text';
    case 'unsupported':
      return 'File';
  }
}

/** Ionicons name used for the kind, in lists and empty states. */
export function viewerKindIcon(kind: ViewerKind): IconName {
  switch (kind) {
    case 'pdf':
      return 'document-text-outline';
    case 'image':
      return 'image-outline';
    case 'delimited':
      return 'grid-outline';
    case 'text':
      return 'reader-outline';
    case 'unsupported':
      return 'document-outline';
  }
}

/**
 * Whether the viewer needs the file's raw bytes in JavaScript.
 *
 * Only the kinds rendered *from text* do. PDFs and images are handed to the
 * browser (or to a native `Image`) as a URL, so a 12 MB scan is streamed and
 * decoded by the platform instead of being held in the JS heap.
 */
export function needsBytes(kind: ViewerKind): boolean {
  return kind === 'text' || kind === 'delimited';
}
