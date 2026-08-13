/**
 * OpenDocument (.odt, .ods, .odp) — LibreOffice, OpenOffice, and what Google
 * Docs hands you when you ask for an open format.
 *
 * All three are a ZIP with a single `content.xml`, and the differences between
 * them are which body element it holds: `office:text`, `office:spreadsheet` or
 * `office:presentation`. That makes one reader for the family rather than
 * three, with only the walk over the body differing.
 */

import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import type { ZipArchive } from '@/features/documents/viewer/archive/zip';
import {
  attribute,
  childElements,
  findElement,
  isElement,
  parseXml,
  textContent,
  type XmlElement,
} from '@/features/documents/viewer/xml';
import {
  describeBlocks,
  RichDocumentBuilder,
  type RichDocument,
  type RichSpan,
} from '@/features/documents/viewer/rich/rich-document';
import { columnLabels, rectangular, trimEmpty, type DocumentGrid } from '@/features/documents/viewer/grid';

const CONTENT_PART = 'content.xml';

/** A repeat count from ODF's `number-columns-repeated`, clamped to something sane. */
function repeatCount(element: XmlElement, local: string): number {
  const raw = attribute(element, local);
  const value = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(value) || value < 1) return 1;
  // ODF pads a row out to the sheet's full width with one repeated empty cell;
  // honouring that literally would materialise a million blank columns.
  return Math.min(value, 4_096);
}

function spansFromText(element: XmlElement, inherited: RichSpan = { text: '' }): RichSpan[] {
  const spans: RichSpan[] = [];

  for (const child of element.children) {
    if (!isElement(child)) {
      spans.push({ ...inherited, text: child.text });
      continue;
    }

    switch (child.local) {
      case 'span':
        spans.push(...spansFromText(child, inherited));
        break;
      case 'a':
        spans.push(...spansFromText(child, { ...inherited, href: attribute(child, 'href') }));
        break;
      case 'line-break':
        spans.push({ text: '\n' });
        break;
      case 'tab':
        spans.push({ text: '\t' });
        break;
      case 's': {
        // `text:s` is a run of spaces, since ODF collapses literal whitespace.
        const count = repeatCount(child, 'c');
        spans.push({ text: ' '.repeat(count) });
        break;
      }
      default:
        spans.push(...spansFromText(child, inherited));
        break;
    }
  }

  return spans;
}

function addTextBody(builder: RichDocumentBuilder, container: XmlElement, listLevel = 0): void {
  for (const node of childElements(container)) {
    switch (node.local) {
      case 'h': {
        const declared = Number.parseInt(attribute(node, 'outline-level') ?? '1', 10) || 1;
        const level = (declared > 4 ? 4 : declared) as 1 | 2 | 3 | 4;
        builder.add({ kind: 'heading', level, spans: spansFromText(node) });
        break;
      }

      case 'p':
        if (listLevel > 0) {
          builder.add({
            kind: 'listItem',
            ordered: false,
            level: listLevel - 1,
            marker: '•',
            spans: spansFromText(node),
          });
        } else {
          builder.paragraph(spansFromText(node));
        }
        break;

      case 'list':
      case 'list-item':
        addTextBody(builder, node, node.local === 'list' ? listLevel + 1 : listLevel);
        break;

      case 'table':
        addTable(builder, node);
        break;

      case 'section':
      case 'frame':
      case 'text-box':
        addTextBody(builder, node, listLevel);
        break;

      case 'image':
        builder.add({ kind: 'placeholder', label: 'Image' });
        break;

      default:
        break;
    }
  }
}

function tableRows(table: XmlElement): string[][] {
  const rows: string[][] = [];

  const collectRows = (container: XmlElement) => {
    for (const node of childElements(container)) {
      if (node.local === 'table-row') {
        const cells: string[] = [];

        for (const cell of childElements(node)) {
          if (cell.local !== 'table-cell' && cell.local !== 'covered-table-cell') continue;

          const value = childElements(cell)
            .map((paragraph) => textContent(paragraph))
            .join('\n')
            .trim();

          const repeats = repeatCount(cell, 'number-columns-repeated');
          for (let index = 0; index < repeats; index += 1) cells.push(value);
        }

        const repeats = repeatCount(node, 'number-rows-repeated');
        for (let index = 0; index < repeats && rows.length < 50_000; index += 1) rows.push([...cells]);
      } else if (node.local === 'table-header-rows' || node.local === 'table-row-group') {
        collectRows(node);
      }
    }
  };

  collectRows(table);
  return rows;
}

function addTable(builder: RichDocumentBuilder, table: XmlElement): void {
  const rows = trimEmpty(tableRows(table));
  if (rows.length === 0) return;

  builder.add({ kind: 'table', columns: rows[0]!, rows: rows.slice(1) });
}

function contentRoot(zip: ZipArchive): XmlElement {
  const xml = zip.readText(CONTENT_PART);
  if (!xml) {
    throw new DocumentParseError('This OpenDocument file has no content part.');
  }
  return parseXml(xml);
}

/** .odt / .odp → a readable document. */
export function parseOpenDocumentText(zip: ZipArchive): RichDocument {
  const root = contentRoot(zip);
  const body = findElement(root, 'body');
  if (!body) throw new DocumentParseError('This OpenDocument file has no body.');

  const builder = new RichDocumentBuilder();

  const presentation = findElement(body, 'presentation');
  if (presentation) {
    childElements(presentation, 'page').forEach((page, index) => {
      builder.section(attribute(page, 'name') ?? `Slide ${index + 1}`);
      addTextBody(builder, page);
    });

    return builder.build((blocks) => describeBlocks(blocks, 'OpenDocument presentation'));
  }

  const text = findElement(body, 'text') ?? body;
  addTextBody(builder, text);

  return builder.build((blocks) => describeBlocks(blocks, 'OpenDocument text'));
}

/** .ods → one grid per sheet, matching how .xlsx is presented. */
export function parseOpenDocumentSheet(zip: ZipArchive): DocumentGrid[] {
  const root = contentRoot(zip);
  const spreadsheet = findElement(root, 'spreadsheet');
  if (!spreadsheet) {
    throw new DocumentParseError('This OpenDocument file has no spreadsheet content.');
  }

  const grids = childElements(spreadsheet, 'table').map((table, index) => {
    const raw = tableRows(table);
    const rows = trimEmpty(rectangular(raw, maxWidth(raw)));

    return {
      name: attribute(table, 'name') ?? `Sheet ${index + 1}`,
      columns: columnLabels(rows[0]?.length ?? 0),
      rows,
    };
  });

  if (grids.length === 0) {
    throw new DocumentParseError('This spreadsheet has no readable sheets.');
  }

  return grids;
}

function maxWidth(rows: string[][]): number {
  return rows.reduce((width, row) => Math.max(width, row.length), 0);
}
