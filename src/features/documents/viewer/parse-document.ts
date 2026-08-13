/**
 * One entry point from "here are the bytes" to "here is something to read".
 *
 * Every format the reader understands is dispatched from here, which keeps the
 * viewer free of parsing knowledge and gives the whole feature a single place
 * where a new format is registered. The result is always one of three
 * presentations — text, grids, or a formatted document — each with exactly one
 * view behind it.
 */

import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import { parseDelimited } from '@/features/imports/delimited';
import { looksLikeZip, readZip, type ZipArchive } from '@/features/documents/viewer/archive/zip';
import { columnLabel, type DocumentGrid } from '@/features/documents/viewer/grid';
import { decodeTextPreview, type TextPreview } from '@/features/documents/viewer/text-preview';
import { parseDocx } from '@/features/documents/viewer/office/docx';
import { parsePptx } from '@/features/documents/viewer/office/pptx';
import { parseXlsx } from '@/features/documents/viewer/office/xlsx';
import {
  parseOpenDocumentSheet,
  parseOpenDocumentText,
} from '@/features/documents/viewer/office/opendocument';
import { parseEpub } from '@/features/documents/viewer/rich/epub';
import { parseHtmlDocument } from '@/features/documents/viewer/rich/html';
import { parseMarkdown } from '@/features/documents/viewer/rich/markdown';
import { parseRtf } from '@/features/documents/viewer/rich/rtf';
import { blockText, type RichDocument } from '@/features/documents/viewer/rich/rich-document';
import { formatFileSize } from '@/utils/bytes';
import type { FileFormat } from '@/features/documents/viewer/file-kinds';

export type ParsedDocument =
  /** Plain text, shown line by line. Also produced for delimited files in text mode. */
  | { presentation: 'text'; preview: TextPreview }
  /** A delimited file: a grid to read, and the original text behind a toggle. */
  | { presentation: 'delimited'; preview: TextPreview; grid: DocumentGrid }
  /** One or more sheets/tables — a workbook, or an archive's file list. */
  | { presentation: 'grids'; grids: DocumentGrid[] }
  /** A formatted document: headings, paragraphs, lists, tables. */
  | { presentation: 'rich'; document: RichDocument };

/**
 * The ZIP-based formats, identified by what is inside rather than by name.
 *
 * Files arrive misnamed constantly — a .docx saved as .zip, an .xlsx mailed as
 * `application/octet-stream`, an EPUB with no extension at all — and the
 * container says plainly which one it is.
 */
function identifyZip(zip: ZipArchive): FileFormat {
  if (zip.has('word/document.xml')) return 'docx';
  if (zip.has('xl/workbook.xml')) return 'xlsx';
  if (zip.has('ppt/presentation.xml')) return 'pptx';
  if (zip.has('META-INF/container.xml')) return 'epub';

  // OpenDocument states its own type in an uncompressed `mimetype` entry.
  const mimetype = zip.has('mimetype') ? zip.readText('mimetype')?.trim() : null;
  if (mimetype?.includes('opendocument.text')) return 'odt';
  if (mimetype?.includes('opendocument.spreadsheet')) return 'ods';
  if (mimetype?.includes('opendocument.presentation')) return 'odp';
  if (mimetype === 'application/epub+zip') return 'epub';

  return 'zip';
}

/** File signatures worth trusting over a name. */
export function sniffFileFormat(bytes: Uint8Array, declared: FileFormat): FileFormat {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf'; // "%PDF"
  }

  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '{\\rtf') return 'rtf';

  if (looksLikeZip(bytes)) {
    try {
      return identifyZip(readZip(bytes));
    } catch {
      // A damaged container still reads better as an archive listing attempt
      // than as a wall of binary, and that path reports the real error.
      return declared === 'unknown' ? 'zip' : declared;
    }
  }

  return declared;
}

function gridFromArchive(zip: ZipArchive): DocumentGrid {
  const files = zip.entries.filter((entry) => !entry.isDirectory);

  return {
    name: 'Contents',
    columns: ['Name', 'Size', 'Packed', 'Modified'],
    rows: files.map((entry) => [
      entry.name,
      formatFileSize(entry.uncompressedSize),
      formatFileSize(entry.compressedSize),
      entry.modifiedAt ? entry.modifiedAt.toISOString().slice(0, 16).replace('T', ' ') : '',
    ]),
    note: `${files.length} file${files.length === 1 ? '' : 's'}`,
  };
}

/** Pretty-prints JSON so a one-line API response is actually readable. */
function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not valid JSON (or NDJSON, which isn't) — show it as written.
    return text;
  }
}

export interface ParseDocumentInput {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  /** The format resolved from the name/MIME type; refined by sniffing here. */
  format: FileFormat;
}

export function parseDocumentBytes({ bytes, format }: ParseDocumentInput): ParsedDocument {
  const resolved = sniffFileFormat(bytes, format);

  switch (resolved) {
    case 'docx':
      return { presentation: 'rich', document: parseDocx(readZip(bytes)) };
    case 'pptx':
      return { presentation: 'rich', document: parsePptx(readZip(bytes)) };
    case 'odt':
    case 'odp':
      return { presentation: 'rich', document: parseOpenDocumentText(readZip(bytes)) };
    case 'epub':
      return { presentation: 'rich', document: parseEpub(readZip(bytes)) };

    case 'xlsx':
      return { presentation: 'grids', grids: parseXlsx(readZip(bytes)) };
    case 'ods':
      return { presentation: 'grids', grids: parseOpenDocumentSheet(readZip(bytes)) };
    case 'zip':
      return { presentation: 'grids', grids: [gridFromArchive(readZip(bytes))] };

    case 'html':
      return { presentation: 'rich', document: parseHtmlDocument(decodeTextPreview(bytes).text) };
    case 'rtf':
      return { presentation: 'rich', document: parseRtf(decodeTextPreview(bytes).text) };
    case 'markdown':
      return { presentation: 'rich', document: parseMarkdown(decodeTextPreview(bytes).text) };

    case 'csv': {
      const preview = decodeTextPreview(bytes);
      const table = parseDelimited(preview.text);

      return {
        presentation: 'delimited',
        preview,
        grid: {
          name: 'Table',
          columns: table.header.map((heading, index) => heading || columnLabel(index)),
          rows: table.rows,
          note: table.skippedLines > 0 ? `${table.skippedLines} preamble lines skipped` : undefined,
        },
      };
    }

    case 'json': {
      const preview = decodeTextPreview(bytes);
      return { presentation: 'text', preview: { ...preview, ...reflow(prettyJson(preview.text)) } };
    }

    case 'text':
      return { presentation: 'text', preview: decodeTextPreview(bytes) };

    case 'pdf':
    case 'image':
    case 'audio':
    case 'video':
      // These are shown from a URL by the platform and never reach the parser;
      // arriving here means a file was misnamed and then sniffed correctly.
      throw new DocumentParseError(
        'This file is a PDF, image or media file despite its name — reopen it to view it.'
      );

    case 'unknown': {
      const preview = decodeTextPreview(bytes);
      if (preview.binary) {
        throw new DocumentParseError(
          "This file isn't a document format the reader recognises, and its contents aren't text."
        );
      }
      return { presentation: 'text', preview };
    }
  }
}

/** Re-splits reformatted text so the line list matches what is displayed. */
function reflow(text: string): { text: string; lines: string[] } {
  return { text, lines: text.split('\n') };
}

/** The per-row text a search runs over, so every presentation searches alike. */
export function gridSearchTargets(grid: DocumentGrid): string[] {
  return grid.rows.map((row) => row.join(' '));
}

export function richSearchTargets(document: RichDocument): string[] {
  return document.blocks.map(blockText);
}
