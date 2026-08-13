/**
 * The one shape every formatted document is converted into before it is shown.
 *
 * A Word file, a slide deck, an ODT, an EPUB chapter, an HTML page and a
 * Markdown note all carry the same handful of ideas — headings, paragraphs,
 * lists, quotes, code, tables, pictures — so each format gets a parser that
 * ends here, and there is exactly one renderer (`RichDocumentView`) plus one
 * search implementation for all of them. Adding a format later means writing a
 * parser, not another view.
 *
 * The model is deliberately shallow (a flat block list, not a tree): it is
 * what a virtualised list can render one row at a time, which is what keeps a
 * 300-page document scrollable on a phone.
 */

export interface RichSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  /** Absolute URL for a hyperlink; the viewer shows it as a link. */
  href?: string;
}

export type RichBlock =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4; spans: RichSpan[] }
  | { kind: 'paragraph'; spans: RichSpan[] }
  | { kind: 'listItem'; ordered: boolean; level: number; marker: string; spans: RichSpan[] }
  | { kind: 'quote'; spans: RichSpan[] }
  | { kind: 'code'; text: string }
  | { kind: 'table'; columns: string[]; rows: string[][] }
  | { kind: 'divider' }
  /** A slide, chapter or sheet boundary — rendered as a labelled rule. */
  | { kind: 'section'; label: string }
  /** Something embedded that can't be shown inline, named so it isn't silently lost. */
  | { kind: 'placeholder'; label: string };

export interface RichDocument {
  blocks: RichBlock[];
  /** One line about the source, e.g. "Word document · 24 paragraphs". */
  summary: string;
  /** True when the document was longer than `MAX_RICH_BLOCKS`. */
  truncated: boolean;
}

/**
 * Upper bound on blocks kept from one document.
 *
 * Virtualisation makes rendering cheap, but parsing and searching are linear,
 * and a runaway generated file (a 200 MB XML export) should degrade to "here
 * is the start of it" rather than to a frozen tab.
 */
export const MAX_RICH_BLOCKS = 20_000;

export function spansText(spans: RichSpan[]): string {
  let text = '';
  for (const span of spans) text += span.text;
  return text;
}

/** The plain text of a block, used for search and for the outline. */
export function blockText(block: RichBlock): string {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
    case 'quote':
      return spansText(block.spans);
    case 'listItem':
      return `${block.marker} ${spansText(block.spans)}`;
    case 'code':
      return block.text;
    case 'table':
      return [block.columns, ...block.rows].map((row) => row.join(' ')).join(' ');
    case 'section':
      return block.label;
    case 'placeholder':
      return block.label;
    case 'divider':
      return '';
  }
}

/**
 * Merges runs that share formatting and drops empty ones.
 *
 * Word in particular splits a single sentence across many runs (a spell-check
 * pass alone can do it), and without this a one-line paragraph can arrive as
 * thirty spans — which the renderer would then lay out separately and the
 * search would highlight in pieces.
 */
export function normaliseSpans(spans: RichSpan[]): RichSpan[] {
  const merged: RichSpan[] = [];

  for (const span of spans) {
    if (span.text.length === 0) continue;

    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.bold === span.bold &&
      previous.italic === span.italic &&
      previous.underline === span.underline &&
      previous.code === span.code &&
      previous.href === span.href
    ) {
      previous.text += span.text;
      continue;
    }

    merged.push({ ...span });
  }

  return merged;
}

/**
 * Accumulates blocks while parsing, enforcing the cap and skipping blocks that
 * would render as nothing.
 */
export class RichDocumentBuilder {
  private readonly blocks: RichBlock[] = [];
  private truncated = false;

  add(block: RichBlock): void {
    if (this.truncated) return;

    if (this.blocks.length >= MAX_RICH_BLOCKS) {
      this.truncated = true;
      return;
    }

    if ('spans' in block) {
      const spans = normaliseSpans(block.spans);
      // An empty paragraph is spacing, not content, and a document full of
      // them (Word writes plenty) would be mostly blank rows.
      if (spans.length === 0 && block.kind !== 'paragraph') return;
      if (spans.length === 0 && block.kind === 'paragraph') {
        const previous = this.blocks[this.blocks.length - 1];
        if (!previous || previous.kind === 'paragraph') return;
      }
      this.blocks.push({ ...block, spans } as RichBlock);
      return;
    }

    this.blocks.push(block);
  }

  paragraph(spans: RichSpan[]): void {
    this.add({ kind: 'paragraph', spans });
  }

  text(value: string): void {
    this.paragraph([{ text: value }]);
  }

  section(label: string): void {
    this.add({ kind: 'section', label });
  }

  get length(): number {
    return this.blocks.length;
  }

  build(summary: (blocks: RichBlock[]) => string): RichDocument {
    // A trailing empty paragraph is an artefact of how most writers end a file.
    while (this.blocks.length > 0) {
      const last = this.blocks[this.blocks.length - 1]!;
      if ('spans' in last && last.spans.length === 0) this.blocks.pop();
      else break;
    }

    return { blocks: this.blocks, summary: summary(this.blocks), truncated: this.truncated };
  }
}

/** Counts blocks by kind, for the one-line summary each parser shows. */
export function describeBlocks(blocks: RichBlock[], sourceLabel: string): string {
  const words = blocks.reduce((total, block) => {
    const text = blockText(block).trim();
    return total + (text ? text.split(/\s+/).length : 0);
  }, 0);

  const tables = blocks.filter((block) => block.kind === 'table').length;

  return [
    sourceLabel,
    `${words.toLocaleString()} words`,
    tables > 0 ? `${tables} table${tables === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
