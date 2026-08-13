/**
 * Reading ZIP containers.
 *
 * .docx, .xlsx, .pptx, .odt, .ods, .odp and .epub are all ZIPs with an agreed
 * set of XML parts inside, so one correct container reader is what turns "we
 * can show text and images" into "we can show documents".
 *
 * The central directory is used rather than walking local headers, because
 * only the central directory is authoritative: a local header may declare
 * zero sizes and defer them to a data descriptor after the compressed bytes,
 * which cannot be parsed without already knowing where the entry ends.
 */

import { AppError } from '@/utils/errors';
import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import { inflateRaw } from '@/features/documents/viewer/archive/inflate';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_END_LOCATOR = 0x07064b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

export interface ZipEntry {
  /** Full path inside the archive, e.g. `word/document.xml`. */
  name: string;
  uncompressedSize: number;
  compressedSize: number;
  compressionMethod: number;
  /** Last-modified time from the archive, or null when it is unset/invalid. */
  modifiedAt: Date | null;
  isDirectory: boolean;
  /** Offset of the entry's local header, used to find its bytes. */
  localHeaderOffset: number;
}

export interface ZipArchive {
  entries: ZipEntry[];
  /** Reads and decompresses one entry. Throws if it isn't in the archive. */
  read: (name: string) => Uint8Array;
  /** Reads an entry as UTF-8 text, or null when it isn't present. */
  readText: (name: string) => string | null;
  has: (name: string) => boolean;
}

function malformed(detail: string): AppError {
  return new DocumentParseError(`This archive could not be read (${detail}).`);
}

/** True when the bytes start with the ZIP local-header signature. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  );
}

/**
 * Converts an MS-DOS date/time pair into a `Date`.
 * Zero means "not set", which several writers emit.
 */
function dosDateTime(time: number, date: number): Date | null {
  if (date === 0) return null;

  const year = 1980 + ((date >> 9) & 0x7f);
  const month = (date >> 5) & 0x0f;
  const day = date & 0x1f;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const hours = (time >> 11) & 0x1f;
  const minutes = (time >> 5) & 0x3f;
  const seconds = (time & 0x1f) * 2;

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Finds the end-of-central-directory record, scanning back from the end.
 *
 * It sits at the very end unless the archive carries a trailing comment, so
 * the search is bounded by the maximum comment length (64 KB) plus the record.
 */
function findEndOfCentralDirectory(view: DataView, byteLength: number): number {
  const earliest = Math.max(0, byteLength - (0xffff + 22));

  for (let offset = byteLength - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }

  throw malformed('it has no central directory — it may be truncated');
}

const utf8 = new TextDecoder('utf-8');

export function readZip(bytes: Uint8Array): ZipArchive {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(view, bytes.byteLength);

  let entryCount = view.getUint16(endOffset + 10, true);
  let directoryOffset = view.getUint32(endOffset + 16, true);

  // Zip64: the 32-bit fields are saturated and the real values live in the
  // Zip64 end record, which the locator just before the EOCD points at.
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    const locatorOffset = endOffset - 20;
    if (locatorOffset < 0 || view.getUint32(locatorOffset, true) !== ZIP64_END_LOCATOR) {
      throw malformed('it declares Zip64 sizes but has no Zip64 record');
    }

    const zip64Offset = Number(view.getBigUint64(locatorOffset + 8, true));
    entryCount = Number(view.getBigUint64(zip64Offset + 32, true));
    directoryOffset = Number(view.getBigUint64(zip64Offset + 48, true));
  }

  const entries: ZipEntry[] = [];
  const byName = new Map<string, ZipEntry>();
  let cursor = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== CENTRAL_FILE_HEADER) {
      throw malformed('its file list is damaged');
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const modifiedTime = view.getUint16(cursor + 12, true);
    const modifiedDate = view.getUint16(cursor + 14, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const nameStart = cursor + 46;
    const name = utf8.decode(bytes.subarray(nameStart, nameStart + nameLength));

    const entry: ZipEntry = {
      name,
      uncompressedSize,
      compressedSize,
      compressionMethod,
      modifiedAt: dosDateTime(modifiedTime, modifiedDate),
      isDirectory: name.endsWith('/'),
      localHeaderOffset,
    };

    entries.push(entry);
    byName.set(name, entry);

    cursor = nameStart + nameLength + extraLength + commentLength;
  }

  function read(name: string): Uint8Array {
    const entry = byName.get(name);
    if (!entry) throw malformed(`it has no "${name}" inside`);

    const headerOffset = entry.localHeaderOffset;
    if (view.getUint32(headerOffset, true) !== LOCAL_FILE_HEADER) {
      throw malformed(`the entry "${name}" is not where the file list says`);
    }

    // The local header's own name/extra lengths are the ones that matter here:
    // writers routinely put different extra fields in the two headers.
    const nameLength = view.getUint16(headerOffset + 26, true);
    const extraLength = view.getUint16(headerOffset + 28, true);
    const dataStart = headerOffset + 30 + nameLength + extraLength;
    const data = bytes.subarray(dataStart, dataStart + entry.compressedSize);

    if (entry.compressionMethod === METHOD_STORED) return data;
    if (entry.compressionMethod === METHOD_DEFLATE) return inflateRaw(data, entry.uncompressedSize);

    throw new DocumentParseError(
      `"${name}" uses a compression method this app doesn't support (${entry.compressionMethod}).`
    );
  }

  return {
    entries,
    read,
    readText: (name) => (byName.has(name) ? utf8.decode(read(name)) : null),
    has: (name) => byName.has(name),
  };
}
