/**
 * RTF (.rtf) → `RichDocument`.
 *
 * RTF is what WordPad, older Word versions and a lot of scanner and
 * point-of-sale software still emit, and it is not XML — it is a stream of
 * `\control` words, `{groups}` and literal text. The reader below keeps the
 * bits that carry meaning (paragraphs, bold, italic, underline, Unicode
 * escapes) and skips the destinations that describe machinery rather than
 * content: font and colour tables, stylesheets, embedded pictures, metadata.
 */

import {
  describeBlocks,
  RichDocumentBuilder,
  type RichDocument,
  type RichSpan,
} from '@/features/documents/viewer/rich/rich-document';

/**
 * Groups whose contents are never shown. `\*\...` marks an optional
 * destination, which by the spec a reader may skip wholesale — this list
 * covers the ones that appear in every file.
 */
const SKIPPED_DESTINATIONS = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'listtable',
  'listoverridetable',
  'info',
  'pict',
  'object',
  'header',
  'footer',
  'headerl',
  'headerr',
  'footerl',
  'footerr',
  'footnote',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'generator',
  'xmlnstbl',
]);

interface Format {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export function parseRtf(source: string): RichDocument {
  const builder = new RichDocumentBuilder();

  let spans: RichSpan[] = [];
  let pending = '';
  let format: Format = { bold: false, italic: false, underline: false };

  const stack: Format[] = [];
  /** Depth at which a skipped destination started, or null when reading normally. */
  let skipDepth: number | null = null;
  let depth = 0;
  /** Set by \uN: how many following characters are the fallback to discard. */
  let unicodeSkip = 1;

  const flushText = () => {
    if (pending.length === 0) return;
    spans.push({ text: pending, ...format });
    pending = '';
  };

  const endParagraph = () => {
    flushText();
    builder.paragraph(spans);
    spans = [];
  };

  let index = 0;

  while (index < source.length) {
    const char = source[index]!;

    if (char === '{') {
      depth += 1;
      stack.push({ ...format });
      index += 1;
      continue;
    }

    if (char === '}') {
      flushText();
      if (skipDepth !== null && depth <= skipDepth) skipDepth = null;
      depth -= 1;
      format = stack.pop() ?? format;
      index += 1;
      continue;
    }

    if (char === '\\') {
      const next = source[index + 1];

      // Escaped literals: \\ \{ \} are the characters themselves.
      if (next === '\\' || next === '{' || next === '}') {
        if (skipDepth === null) pending += next;
        index += 2;
        continue;
      }

      // \'hh — a byte in the document's code page. Windows-1252 is the
      // near-universal default and agrees with Latin-1 for these values.
      if (next === "'") {
        const hex = source.slice(index + 2, index + 4);
        const code = Number.parseInt(hex, 16);
        if (skipDepth === null && Number.isFinite(code)) pending += windows1252(code);
        index += 4;
        continue;
      }

      const control = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(source.slice(index));
      if (!control) {
        index += 1;
        continue;
      }

      const word = control[1]!;
      const parameter = control[2] ? Number.parseInt(control[2], 10) : undefined;
      index += control[0].length;

      // `\*` immediately before a destination marks it as skippable.
      if (word === 'u' && parameter !== undefined) {
        if (skipDepth === null) {
          // Negative values are how RTF writes code points above 32767.
          pending += String.fromCodePoint(parameter < 0 ? parameter + 65536 : parameter);
        }
        // The next `unicodeSkip` characters are an ASCII fallback for readers
        // that don't understand \u, and must not be shown twice.
        index = skipFallback(source, index, unicodeSkip);
        continue;
      }

      if (SKIPPED_DESTINATIONS.has(word)) {
        if (skipDepth === null) skipDepth = depth;
        continue;
      }

      if (skipDepth !== null) continue;

      switch (word) {
        case 'par':
        case 'sect':
          endParagraph();
          break;
        case 'line':
          pending += '\n';
          break;
        case 'tab':
          pending += '\t';
          break;
        case 'uc':
          if (parameter !== undefined) unicodeSkip = Math.max(0, parameter);
          break;
        case 'b':
          flushText();
          format = { ...format, bold: parameter !== 0 };
          break;
        case 'i':
          flushText();
          format = { ...format, italic: parameter !== 0 };
          break;
        case 'ul':
          flushText();
          format = { ...format, underline: true };
          break;
        case 'ulnone':
          flushText();
          format = { ...format, underline: false };
          break;
        case 'plain':
          flushText();
          format = { bold: false, italic: false, underline: false };
          break;
        case 'pard':
          // Paragraph defaults; formatting carries on, the paragraph resets.
          break;
        default:
          break;
      }

      continue;
    }

    if (char === '\n' || char === '\r') {
      index += 1;
      continue;
    }

    if (skipDepth === null) pending += char;
    index += 1;
  }

  endParagraph();

  return builder.build((blocks) => describeBlocks(blocks, 'Rich text'));
}

/** Skips the ASCII fallback characters that follow a `\uN` escape. */
function skipFallback(source: string, from: number, count: number): number {
  let index = from;
  let remaining = count;

  while (remaining > 0 && index < source.length) {
    if (source[index] === '\\' && source[index + 1] === "'") {
      index += 4;
    } else if (source[index] === '{' || source[index] === '}') {
      break;
    } else {
      index += 1;
    }
    remaining -= 1;
  }

  return index;
}

/** The 27 Windows-1252 code points that differ from Latin-1 (0x80–0x9F). */
const WINDOWS_1252_HIGH: Record<number, string> = {
  0x80: '€',
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…',
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8a: 'Š',
  0x8b: '‹',
  0x8c: 'Œ',
  0x8e: 'Ž',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
  0x98: '˜',
  0x99: '™',
  0x9a: 'š',
  0x9b: '›',
  0x9c: 'œ',
  0x9e: 'ž',
  0x9f: 'Ÿ',
};

function windows1252(code: number): string {
  return WINDOWS_1252_HIGH[code] ?? String.fromCharCode(code);
}
