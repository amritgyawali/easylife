import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * What a file *is*, and how it should be *shown* — two related but separate
 * questions, kept apart on purpose.
 *
 * `FileFormat` is the precise type, and picks the parser. `ViewerKind` is the
 * presentation, and picks the view. Many formats share a view (a .docx, an
 * .odt, an .epub and a Markdown note all end up as a `RichDocument`), and the
 * split is what stops the viewer growing a branch per format.
 *
 * Both are pure and platform-free: the same resolution has to hold for a file
 * the user just picked (which has only a name and the picker's guess at a MIME
 * type) and for a row already in the vault (which has a stored `mime_type`).
 */

export type FileFormat =
  // Shown by the platform.
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  // Read as text.
  | 'csv'
  | 'text'
  | 'markdown'
  | 'json'
  // Parsed into a formatted document.
  | 'html'
  | 'rtf'
  | 'docx'
  | 'pptx'
  | 'odt'
  | 'odp'
  | 'epub'
  // Parsed into a grid.
  | 'xlsx'
  | 'ods'
  // Listed as a container.
  | 'zip'
  | 'unknown';

export type ViewerKind =
  'pdf' | 'image' | 'media' | 'delimited' | 'text' | 'document' | 'sheet' | 'archive' | 'unsupported';

export interface FileIdentity {
  name: string;
  /** The picker's or the vault row's content type; often missing or wrong. */
  mimeType?: string | null;
}

const MIME_FORMATS: Record<string, FileFormat> = {
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'application/acrobat': 'pdf',

  'text/csv': 'csv',
  'text/comma-separated-values': 'csv',
  'text/tab-separated-values': 'csv',
  'application/csv': 'csv',
  // What several exporters label a plain .csv as.
  'application/vnd.ms-excel': 'csv',

  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',

  'text/html': 'html',
  'application/xhtml+xml': 'html',

  'application/rtf': 'rtf',
  'text/rtf': 'rtf',

  'application/json': 'json',
  'application/ld+json': 'json',
  'application/x-ndjson': 'json',

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',

  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',

  'application/epub+zip': 'epub',

  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',

  'application/xml': 'text',
  'application/x-yaml': 'text',
  'application/yaml': 'text',
  'application/x-sh': 'text',
  'application/javascript': 'text',
};

const EXTENSION_FORMATS: Record<string, FileFormat> = {
  pdf: 'pdf',

  csv: 'csv',
  tsv: 'csv',
  tab: 'csv',

  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  heic: 'image',
  heif: 'image',
  avif: 'image',
  svg: 'image',

  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
  opus: 'audio',
  flac: 'audio',

  mp4: 'video',
  mov: 'video',
  webm: 'video',
  m4v: 'video',

  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',

  json: 'json',
  ndjson: 'json',

  html: 'html',
  htm: 'html',
  xhtml: 'html',

  rtf: 'rtf',

  docx: 'docx',
  docm: 'docx',
  xlsx: 'xlsx',
  xlsm: 'xlsx',
  pptx: 'pptx',
  pptm: 'pptx',

  odt: 'odt',
  ott: 'odt',
  ods: 'ods',
  odp: 'odp',

  epub: 'epub',
  zip: 'zip',

  txt: 'text',
  text: 'text',
  log: 'text',
  xml: 'text',
  yml: 'text',
  yaml: 'text',
  ini: 'text',
  conf: 'text',
  sql: 'text',
  vcf: 'text',
  ics: 'text',
  srt: 'text',
  vtt: 'text',
};

const FORMAT_KINDS: Record<FileFormat, ViewerKind> = {
  pdf: 'pdf',
  image: 'image',
  audio: 'media',
  video: 'media',
  csv: 'delimited',
  text: 'text',
  markdown: 'document',
  json: 'text',
  html: 'document',
  rtf: 'document',
  docx: 'document',
  pptx: 'document',
  odt: 'document',
  odp: 'document',
  epub: 'document',
  xlsx: 'sheet',
  ods: 'sheet',
  zip: 'archive',
  unknown: 'unsupported',
};

const FORMAT_LABELS: Record<FileFormat, string> = {
  pdf: 'PDF',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  csv: 'Spreadsheet',
  text: 'Text',
  markdown: 'Markdown',
  json: 'JSON',
  html: 'Web page',
  rtf: 'Rich text',
  docx: 'Word',
  pptx: 'Slides',
  odt: 'Document',
  odp: 'Slides',
  epub: 'EPUB',
  xlsx: 'Excel',
  ods: 'Spreadsheet',
  zip: 'Archive',
  unknown: 'File',
};

export function fileExtension(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const dot = trimmed.lastIndexOf('.');
  // A leading dot is a dotfile (".env"), not an extension.
  return dot > 0 ? trimmed.slice(dot + 1) : '';
}

/**
 * Decides what a file is.
 *
 * MIME type wins when it says something specific, because a `.dat` export
 * served as `text/csv` really is a CSV. The extension is the fallback rather
 * than the primary signal because pickers hand back
 * `application/octet-stream` constantly, and that must not turn a readable
 * PDF into "unsupported". When the bytes are available, `sniffFileFormat`
 * (see `parse-document.ts`) gets the final word.
 */
export function resolveFileFormat({ name, mimeType }: FileIdentity): FileFormat {
  const mime = (mimeType ?? '').trim().toLowerCase().split(';')[0]?.trim() ?? '';

  const byMime = MIME_FORMATS[mime];
  if (byMime) return byMime;

  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('text/') || mime.endsWith('+xml')) return 'text';
  if (mime.endsWith('+json')) return 'json';

  return EXTENSION_FORMATS[fileExtension(name)] ?? 'unknown';
}

export function viewerKindOf(format: FileFormat): ViewerKind {
  return FORMAT_KINDS[format];
}

/** Convenience for callers that only care how a file will be displayed. */
export function resolveViewerKind(identity: FileIdentity): ViewerKind {
  return viewerKindOf(resolveFileFormat(identity));
}

/** Short label for the badge beside a document's title. */
export function fileFormatLabel(format: FileFormat): string {
  return FORMAT_LABELS[format];
}

/** Ionicons name for the format, in lists and empty states. */
export function fileFormatIcon(format: FileFormat): IconName {
  switch (format) {
    case 'pdf':
      return 'document-text-outline';
    case 'image':
      return 'image-outline';
    case 'audio':
      return 'musical-notes-outline';
    case 'video':
      return 'videocam-outline';
    case 'csv':
    case 'xlsx':
    case 'ods':
      return 'grid-outline';
    case 'docx':
    case 'odt':
    case 'rtf':
      return 'document-outline';
    case 'pptx':
    case 'odp':
      return 'easel-outline';
    case 'epub':
      return 'book-outline';
    case 'html':
      return 'globe-outline';
    case 'markdown':
    case 'json':
    case 'text':
      return 'reader-outline';
    case 'zip':
      return 'file-tray-full-outline';
    case 'unknown':
      return 'help-circle-outline';
  }
}

/**
 * Whether the viewer needs the file's raw bytes in JavaScript.
 *
 * Only the kinds parsed *in the app* do. PDFs, images and media are handed to
 * the platform as a URL, so a 12 MB scan is streamed and decoded by the
 * platform instead of being held in the JS heap. Unknown files are read too,
 * but only so their first bytes can be sniffed — a .docx mailed as
 * `application/octet-stream` is still a .docx.
 */
export function needsBytes(kind: ViewerKind): boolean {
  return (
    kind === 'text' ||
    kind === 'delimited' ||
    kind === 'document' ||
    kind === 'sheet' ||
    kind === 'archive' ||
    kind === 'unsupported'
  );
}
