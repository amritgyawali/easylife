/**
 * Turning raw file bytes into something that can be read on screen, and
 * finding things inside it.
 *
 * Pure so the awkward parts — a UTF-8 BOM, CRLF line endings, a file that is
 * actually binary, a multi-byte character sitting exactly on the truncation
 * boundary — are unit-testable without a real file or a running app.
 */

/**
 * How much of a text file is decoded for display.
 *
 * A reader has to stay responsive on a phone, and beyond a couple of
 * megabytes the cost is in laying out the text, not in reading it. Past this
 * the viewer shows the beginning and says plainly how much it left out,
 * rather than freezing on a 50 MB log.
 */
export const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

export interface TextPreview {
  text: string;
  lines: string[];
  /** True when the file was longer than `MAX_TEXT_PREVIEW_BYTES`. */
  truncated: boolean;
  /** Bytes that were not decoded, when truncated. */
  omittedBytes: number;
  /** True when the content looks like binary rather than text. */
  binary: boolean;
}

const BOM = '\uFEFF';
const REPLACEMENT = '\uFFFD';

export function decodeTextPreview(bytes: Uint8Array, limit = MAX_TEXT_PREVIEW_BYTES): TextPreview {
  const truncated = bytes.length > limit;
  const slice = truncated ? bytes.subarray(0, limit) : bytes;

  let text = new TextDecoder('utf-8').decode(slice);

  // A BOM is metadata, not content: left in place it shows up as a stray
  // glyph in the first cell of every CSV opened here.
  if (text.startsWith(BOM)) text = text.slice(1);

  // Truncation can land mid-character; the decoder marks that with a single
  // replacement char at the very end, which is an artefact of the cut.
  if (truncated && text.endsWith(REPLACEMENT)) text = text.slice(0, -1);

  return {
    text,
    lines: splitLines(text),
    truncated,
    omittedBytes: truncated ? bytes.length - limit : 0,
    binary: looksBinary(text),
  };
}

/** Splits on any of the three line-ending conventions, keeping empty lines. */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/**
 * Heuristic "this isn't text" check, used to show an honest message instead
 * of pages of mojibake.
 *
 * NUL bytes never occur in real UTF-8 text, and a decoder emits replacement
 * characters for every byte it can't make sense of — so a high proportion of
 * either in the opening sample is decisive. Only the sample is examined, so
 * the cost doesn't grow with file size.
 */
export function looksBinary(text: string, sampleSize = 2_000): boolean {
  const sample = text.slice(0, sampleSize);
  if (sample.length === 0) return false;
  if (sample.includes('\u0000')) return true;

  let undecodable = 0;
  for (const char of sample) {
    if (char === REPLACEMENT) undecodable += 1;
  }

  return undecodable / sample.length > 0.1;
}

/** Indices of the lines containing `query`, case-insensitively. */
export function findMatchingLines(lines: string[], query: string): number[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]!.toLowerCase().includes(needle)) matches.push(index);
  }
  return matches;
}

/** Indices of the table rows with any cell containing `query`. */
export function findMatchingRows(rows: string[][], query: string): number[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: number[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index]!.some((cell) => cell.toLowerCase().includes(needle))) matches.push(index);
  }
  return matches;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/**
 * Splits a line into alternating plain and matching segments so the view can
 * highlight hits without a regex — the query is user input, and building a
 * `RegExp` out of it would either throw on `(` or silently treat `.` as a
 * wildcard.
 */
export function splitHighlights(value: string, query: string): HighlightSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle || !value) return [{ text: value, match: false }];

  const haystack = value.toLowerCase();
  // Lower-casing is length-preserving for every script this app ships in, but
  // not universally (ẞ → ss). If it wasn't, the offsets below would slice the
  // original string in the wrong places, so highlighting is simply skipped.
  if (haystack.length !== value.length) return [{ text: value, match: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (;;) {
    const found = haystack.indexOf(needle, cursor);
    if (found === -1) break;

    if (found > cursor) segments.push({ text: value.slice(cursor, found), match: false });
    segments.push({ text: value.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
  }

  if (segments.length === 0) return [{ text: value, match: false }];
  if (cursor < value.length) segments.push({ text: value.slice(cursor), match: false });

  return segments;
}
