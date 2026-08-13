/**
 * HTML (and EPUB chapters, which are XHTML) → `RichDocument`.
 *
 * Only the structure is read — headings, paragraphs, lists, quotes, code,
 * tables and inline emphasis. Scripts and styles are dropped by the parser
 * before this sees them, and nothing here can issue a request, so a saved web
 * page or an email export is readable without being *executed*: the file
 * cannot phone home, load a tracking pixel, or run anything at all.
 *
 * Whitespace is collapsed the way a browser does, because HTML in the wild is
 * indented for humans reading the markup, not for a text renderer.
 */

import {
  attribute,
  isElement,
  parseXml,
  textContent,
  type XmlElement,
  type XmlNode,
} from '@/features/documents/viewer/xml';
import {
  describeBlocks,
  RichDocumentBuilder,
  type RichDocument,
  type RichSpan,
} from '@/features/documents/viewer/rich/rich-document';

/** Elements that never have content, so an unclosed one doesn't swallow the page. */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elements whose content is code for the machine, never text for the reader. */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'noscript', 'template', 'svg']);

const BLOCK_ELEMENTS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'fieldset',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
]);

export function parseHtmlDocument(source: string): RichDocument {
  const builder = new RichDocumentBuilder();
  const root = parseXml(source, {
    voidElements: VOID_ELEMENTS,
    rawTextElements: RAW_TEXT_ELEMENTS,
    lowerCaseNames: true,
  });

  walk(builder, findBody(root) ?? root, { listDepth: 0 });

  return builder.build((blocks) => describeBlocks(blocks, 'Web page'));
}

/** Appends a whole XHTML chapter to an existing document (used for EPUB). */
export function appendHtmlBody(builder: RichDocumentBuilder, source: string): void {
  const root = parseXml(source, {
    voidElements: VOID_ELEMENTS,
    rawTextElements: RAW_TEXT_ELEMENTS,
    lowerCaseNames: true,
  });

  walk(builder, findBody(root) ?? root, { listDepth: 0 });
}

function findBody(root: XmlElement): XmlElement | null {
  const search = (element: XmlElement): XmlElement | null => {
    for (const child of element.children) {
      if (!isElement(child)) continue;
      if (child.local === 'body') return child;

      const nested = search(child);
      if (nested) return nested;
    }
    return null;
  };

  return root.local === 'body' ? root : search(root);
}

interface WalkContext {
  listDepth: number;
  ordered?: boolean;
}

function walk(builder: RichDocumentBuilder, element: XmlElement, context: WalkContext): void {
  let inlineRun: XmlNode[] = [];

  const flushInline = () => {
    if (inlineRun.length === 0) return;

    const spans = inlineSpans({ ...element, children: inlineRun }, {});
    inlineRun = [];
    if (spans.some((span) => span.text.trim() !== '')) builder.paragraph(spans);
  };

  for (const child of element.children) {
    if (!isElement(child)) {
      inlineRun.push(child);
      continue;
    }

    if (!BLOCK_ELEMENTS.has(child.local)) {
      inlineRun.push(child);
      continue;
    }

    flushInline();
    addBlock(builder, child, context);
  }

  flushInline();
}

function addBlock(builder: RichDocumentBuilder, element: XmlElement, context: WalkContext): void {
  switch (element.local) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const depth = Number.parseInt(element.local.slice(1), 10);
      builder.add({
        kind: 'heading',
        level: (depth > 4 ? 4 : depth) as 1 | 2 | 3 | 4,
        spans: inlineSpans(element, {}),
      });
      return;
    }

    case 'p':
      builder.paragraph(inlineSpans(element, {}));
      return;

    case 'blockquote':
      builder.add({ kind: 'quote', spans: inlineSpans(element, {}) });
      return;

    case 'pre':
      builder.add({ kind: 'code', text: textContent(element).replace(/^\n/, '') });
      return;

    case 'hr':
      builder.add({ kind: 'divider' });
      return;

    case 'ul':
    case 'ol':
      walk(builder, element, { listDepth: context.listDepth + 1, ordered: element.local === 'ol' });
      return;

    case 'li': {
      const ordered = context.ordered ?? false;
      builder.add({
        kind: 'listItem',
        ordered,
        level: Math.max(0, context.listDepth - 1),
        marker: ordered ? '•' : '•',
        spans: inlineSpans(element, {}),
      });

      // A nested list inside the item still needs walking.
      for (const child of element.children) {
        if (isElement(child) && (child.local === 'ul' || child.local === 'ol')) {
          addBlock(builder, child, context);
        }
      }
      return;
    }

    case 'table':
      addTable(builder, element);
      return;

    default:
      walk(builder, element, context);
  }
}

function addTable(builder: RichDocumentBuilder, table: XmlElement): void {
  const rows: string[][] = [];

  const collect = (element: XmlElement) => {
    for (const child of element.children) {
      if (!isElement(child)) continue;

      if (child.local === 'tr') {
        const cells: string[] = [];
        for (const cell of child.children) {
          if (isElement(cell) && (cell.local === 'td' || cell.local === 'th')) {
            cells.push(collapse(textContent(cell)));
          }
        }
        if (cells.length > 0) rows.push(cells);
      } else {
        collect(child);
      }
    }
  };

  collect(table);
  if (rows.length === 0) return;

  builder.add({ kind: 'table', columns: rows[0]!, rows: rows.slice(1) });
}

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  href?: string;
}

function inlineSpans(element: XmlElement, style: InlineStyle): RichSpan[] {
  const spans: RichSpan[] = [];

  for (const child of element.children) {
    if (!isElement(child)) {
      const text = collapse(child.text);
      if (text) spans.push({ ...style, text });
      continue;
    }

    switch (child.local) {
      case 'b':
      case 'strong':
        spans.push(...inlineSpans(child, { ...style, bold: true }));
        break;
      case 'i':
      case 'em':
      case 'cite':
        spans.push(...inlineSpans(child, { ...style, italic: true }));
        break;
      case 'u':
      case 'ins':
        spans.push(...inlineSpans(child, { ...style, underline: true }));
        break;
      case 'code':
      case 'kbd':
      case 'samp':
        spans.push(...inlineSpans(child, { ...style, code: true }));
        break;
      case 'a':
        spans.push(...inlineSpans(child, { ...style, href: attribute(child, 'href') ?? style.href }));
        break;
      case 'br':
        spans.push({ text: '\n' });
        break;
      case 'img': {
        const alternative = attribute(child, 'alt');
        spans.push({ text: alternative ? `🖼 ${alternative} ` : '🖼 ', italic: true });
        break;
      }
      // Nested lists and tables are emitted as their own blocks by `addBlock`;
      // pulling their text in here as well would show every row twice.
      case 'ul':
      case 'ol':
      case 'table':
        break;
      default:
        spans.push(...inlineSpans(child, style));
        break;
    }
  }

  return spans;
}

/** Collapses runs of whitespace to a single space, as a browser would. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ');
}
