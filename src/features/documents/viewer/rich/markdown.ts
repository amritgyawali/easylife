/**
 * Markdown → `RichDocument`.
 *
 * Notes, READMEs and anything exported from a note-taking app arrive as
 * Markdown, and showing the raw asterisks is showing the user the packaging
 * rather than the contents. This covers the CommonMark subset people actually
 * write — headings, lists, quotes, fenced code, tables, and inline emphasis,
 * code and links — and leaves anything it doesn't recognise as plain text,
 * which is exactly how Markdown is supposed to degrade.
 */

import {
  describeBlocks,
  RichDocumentBuilder,
  type RichDocument,
  type RichSpan,
} from '@/features/documents/viewer/rich/rich-document';

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*(```|~~~)(.*)$/;
const UNORDERED_ITEM = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED_ITEM = /^(\s*)(\d+)[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const DIVIDER = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const SETEXT_UNDERLINE = /^\s*(=+|-{2,})\s*$/;

/** Splits a `| a | b |` row into cells, tolerating the optional outer pipes. */
function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/**
 * Parses inline markup into spans.
 *
 * A single pass with one alternation, rather than nested passes, so that a
 * `**bold**` inside a link and a `*` inside code can't be re-interpreted after
 * the fact — the first match wins and its text is consumed.
 */
export function parseInlineMarkdown(line: string): RichSpan[] {
  // Built per call rather than shared at module scope. This function recurses
  // into the text inside `**bold**`, and a `/g` regex carries `lastIndex`
  // between uses — one shared instance would have the inner call rewind the
  // outer scan, and the loop below would never end.
  const inline = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|`([^`]+)`|\[([^\]]*)\]\(([^)\s]+)[^)]*\)|(https?:\/\/\S+)/g;

  const spans: RichSpan[] = [];
  let cursor = 0;

  let match = inline.exec(line);

  while (match) {
    if (match.index > cursor) spans.push({ text: line.slice(cursor, match.index) });

    if (match[2] !== undefined) {
      spans.push(...parseInlineMarkdown(match[2]).map((span) => ({ ...span, bold: true })));
    } else if (match[4] !== undefined) {
      spans.push(...parseInlineMarkdown(match[4]).map((span) => ({ ...span, italic: true })));
    } else if (match[5] !== undefined) {
      spans.push({ text: match[5], code: true });
    } else if (match[7] !== undefined) {
      spans.push({ text: match[6] || match[7], href: match[7] });
    } else if (match[8] !== undefined) {
      spans.push({ text: match[8], href: match[8] });
    }

    cursor = match.index + match[0].length;
    match = inline.exec(line);
  }

  if (cursor < line.length) spans.push({ text: line.slice(cursor) });
  return spans.length > 0 ? spans : [{ text: line }];
}

export function parseMarkdown(source: string): RichDocument {
  const lines = source.split(/\r\n|\r|\n/);
  const builder = new RichDocumentBuilder();

  let index = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    builder.paragraph(parseInlineMarkdown(paragraph.join(' ')));
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index]!;

    const fence = FENCE.exec(line);
    if (fence) {
      flushParagraph();

      const marker = fence[1]!;
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index]!.trimStart().startsWith(marker)) {
        code.push(lines[index]!);
        index += 1;
      }

      index += 1; // Closing fence (or the end of the file).
      builder.add({ kind: 'code', text: code.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      index += 1;
      continue;
    }

    if (DIVIDER.test(line)) {
      flushParagraph();
      builder.add({ kind: 'divider' });
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      const depth = heading[1]!.length;
      builder.add({
        kind: 'heading',
        level: (depth > 4 ? 4 : depth) as 1 | 2 | 3 | 4,
        spans: parseInlineMarkdown(heading[2]!.replace(/\s+#+\s*$/, '')),
      });
      index += 1;
      continue;
    }

    // Setext heading: a line of text underlined with === or ---.
    const underline = lines[index + 1];
    if (paragraph.length === 0 && underline !== undefined && SETEXT_UNDERLINE.test(underline)) {
      builder.add({
        kind: 'heading',
        level: underline.trim().startsWith('=') ? 1 : 2,
        spans: parseInlineMarkdown(line.trim()),
      });
      index += 2;
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flushParagraph();

      const quoted: string[] = [quote[1]!];
      index += 1;

      while (index < lines.length) {
        const next = QUOTE.exec(lines[index]!);
        if (!next) break;
        quoted.push(next[1]!);
        index += 1;
      }

      builder.add({ kind: 'quote', spans: parseInlineMarkdown(quoted.join(' ').trim()) });
      continue;
    }

    // A table needs its delimiter row on the following line to be a table.
    const nextLine = lines[index + 1];
    if (line.includes('|') && nextLine !== undefined && TABLE_DIVIDER.test(nextLine)) {
      flushParagraph();

      const columns = tableCells(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index]!.includes('|') && lines[index]!.trim() !== '') {
        rows.push(tableCells(lines[index]!));
        index += 1;
      }

      builder.add({ kind: 'table', columns, rows });
      continue;
    }

    const ordered = ORDERED_ITEM.exec(line);
    const unordered = ordered ? null : UNORDERED_ITEM.exec(line);

    if (ordered || unordered) {
      flushParagraph();

      const indent = (ordered ? ordered[1]! : unordered![1]!).replace(/\t/g, '  ').length;
      const level = Math.min(4, Math.floor(indent / 2));
      const text = ordered ? ordered[3]! : unordered![2]!;

      builder.add({
        kind: 'listItem',
        ordered: Boolean(ordered),
        level,
        marker: ordered ? `${ordered[2]}.` : '•',
        spans: parseInlineMarkdown(text),
      });
      index += 1;
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();

  return builder.build((blocks) => describeBlocks(blocks, 'Markdown'));
}
