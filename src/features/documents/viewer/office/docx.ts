/**
 * Word (.docx) → `RichDocument`.
 *
 * A .docx is a ZIP whose `word/document.xml` holds the text as a flat run of
 * paragraphs and tables; formatting lives in properties on each paragraph
 * (`w:pPr`) and run (`w:rPr`). Reading it needs no rendering engine — only an
 * honest walk of that structure — which is why a Word file can be opened in
 * this app without a single extra dependency.
 *
 * What is deliberately not attempted: page layout, fonts, columns, floating
 * shapes. Those describe how a printer should lay the document out, and the
 * point here is reading it on a phone.
 */

import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import type { ZipArchive } from '@/features/documents/viewer/archive/zip';
import {
  attribute,
  childElements,
  findElement,
  findElements,
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

const DOCUMENT_PART = 'word/document.xml';
const RELATIONSHIPS_PART = 'word/_rels/document.xml.rels';
const NUMBERING_PART = 'word/numbering.xml';

/** Word style ids, normalised — writers vary between `Heading1` and `heading 1`. */
function normaliseStyleId(styleId: string): string {
  return styleId.toLowerCase().replace(/[\s_-]/g, '');
}

function headingLevelFor(styleId: string): 1 | 2 | 3 | 4 | null {
  const normalised = normaliseStyleId(styleId);

  if (normalised === 'title') return 1;
  if (normalised === 'subtitle') return 2;

  const match = /^heading(\d+)$/.exec(normalised);
  if (!match) return null;

  const level = Number.parseInt(match[1]!, 10);
  return level <= 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
}

/** rId → target, so a hyperlink run can carry the URL it points at. */
function readRelationships(zip: ZipArchive): Map<string, string> {
  const targets = new Map<string, string>();
  const xml = zip.readText(RELATIONSHIPS_PART);
  if (!xml) return targets;

  for (const relationship of findElements(parseXml(xml), 'Relationship')) {
    const id = attribute(relationship, 'Id');
    const target = attribute(relationship, 'Target');
    if (id && target) targets.set(id, target);
  }

  return targets;
}

/**
 * numId + level → whether that list is numbered or bulleted.
 *
 * Word stores the answer two hops away (`w:num` → `w:abstractNum` → the level's
 * `w:numFmt`), and getting it right is the difference between a numbered
 * procedure reading as a procedure and reading as a pile of bullets.
 */
function readNumberingFormats(zip: ZipArchive): Map<string, boolean> {
  const ordered = new Map<string, boolean>();
  const xml = zip.readText(NUMBERING_PART);
  if (!xml) return ordered;

  const root = parseXml(xml);

  const abstractFormats = new Map<string, Map<string, boolean>>();
  for (const abstract of findElements(root, 'abstractNum')) {
    const abstractId = attribute(abstract, 'abstractNumId');
    if (!abstractId) continue;

    const levels = new Map<string, boolean>();
    for (const level of childElements(abstract, 'lvl')) {
      const levelIndex = attribute(level, 'ilvl') ?? '0';
      const format = findElement(level, 'numFmt');
      const value = format ? attribute(format, 'val') : undefined;
      levels.set(levelIndex, value !== 'bullet' && value !== 'none');
    }

    abstractFormats.set(abstractId, levels);
  }

  for (const num of findElements(root, 'num')) {
    const numId = attribute(num, 'numId');
    const abstractRef = findElement(num, 'abstractNumId');
    const abstractId = abstractRef ? attribute(abstractRef, 'val') : undefined;
    if (!numId || !abstractId) continue;

    const levels = abstractFormats.get(abstractId);
    if (!levels) continue;

    for (const [levelIndex, isOrdered] of levels) ordered.set(`${numId}:${levelIndex}`, isOrdered);
  }

  return ordered;
}

/** Bullet glyphs by depth, matching Word's default list styles. */
const BULLETS = ['•', '◦', '▪'];

/** Reads a `w:val` off a named child property element, e.g. `w:numPr/w:numId`. */
function propertyValue(properties: XmlElement, local: string): string | undefined {
  const child = childElements(properties, local)[0];
  return child ? attribute(child, 'val') : undefined;
}

/** True when a run/paragraph property element is on (`w:b` with no val, or val="1"/"true"). */
function isToggleOn(properties: XmlElement | null, local: string): boolean {
  if (!properties) return false;

  const toggle = childElements(properties, local)[0];
  if (!toggle) return false;

  const value = attribute(toggle, 'val');
  return value === undefined || value === '1' || value === 'true' || value === 'on';
}

function runSpans(container: XmlElement, relationships: Map<string, string>, href?: string): RichSpan[] {
  const spans: RichSpan[] = [];

  for (const child of container.children) {
    if (!isElement(child)) continue;

    switch (child.local) {
      case 'r': {
        const properties = childElements(child, 'rPr')[0] ?? null;
        const bold = isToggleOn(properties, 'b');
        const italic = isToggleOn(properties, 'i');
        const underline = Boolean(properties && childElements(properties, 'u')[0]);

        for (const runChild of child.children) {
          if (!isElement(runChild)) continue;

          if (runChild.local === 't') {
            spans.push({ text: textContent(runChild), bold, italic, underline, href });
          } else if (runChild.local === 'tab') {
            spans.push({ text: '\t', bold, italic, underline, href });
          } else if (runChild.local === 'br' || runChild.local === 'cr') {
            spans.push({ text: '\n', bold, italic, underline, href });
          } else if (runChild.local === 'drawing' || runChild.local === 'pict') {
            spans.push({ text: '🖼 ', italic: true });
          }
        }
        break;
      }

      case 'hyperlink': {
        const relationshipId = attribute(child, 'id');
        const target = relationshipId ? relationships.get(relationshipId) : undefined;
        spans.push(...runSpans(child, relationships, target ?? href));
        break;
      }

      // Tracked insertions are part of the text; deletions are not.
      case 'ins':
      case 'smartTag':
      case 'sdt':
      case 'sdtContent':
      case 'bdo':
        spans.push(...runSpans(child, relationships, href));
        break;

      default:
        break;
    }
  }

  return spans;
}

function cellText(cell: XmlElement, relationships: Map<string, string>): string {
  return childElements(cell, 'p')
    .map((paragraph) =>
      runSpans(paragraph, relationships)
        .map((span) => span.text)
        .join('')
    )
    .join('\n')
    .trim();
}

export function parseDocx(zip: ZipArchive): RichDocument {
  const documentXml = zip.readText(DOCUMENT_PART);
  if (!documentXml) {
    throw new DocumentParseError(
      "This looks like a Word file but has no document part — it may be an older .doc renamed to .docx, which isn't the same format."
    );
  }

  const relationships = readRelationships(zip);
  const numbering = readNumberingFormats(zip);

  const body = findElement(parseXml(documentXml), 'body');
  if (!body) throw new DocumentParseError('This Word file has no readable body.');

  const builder = new RichDocumentBuilder();
  const counters = new ListCounters();

  for (const node of childElements(body)) {
    if (node.local === 'p') {
      addParagraph(builder, node, relationships, numbering, counters);
    } else if (node.local === 'tbl') {
      counters.reset();
      addTable(builder, node, relationships);
    }
  }

  return builder.build((blocks) => describeBlocks(blocks, 'Word document'));
}

/**
 * Running numbers for ordered lists.
 *
 * Word stores only "this paragraph belongs to list N at level L" and computes
 * the visible number when it lays the page out, so a reader has to count them
 * itself — otherwise a numbered procedure shows up as a row of identical
 * bullets. Starting a deeper level restarts it, which matches Word's default.
 */
class ListCounters {
  private readonly counts = new Map<string, number>();

  next(numId: string, level: number): number {
    const key = `${numId}:${level}`;
    const value = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, value);

    for (const existing of [...this.counts.keys()]) {
      const [existingNum, existingLevel] = existing.split(':');
      if (existingNum === numId && Number(existingLevel) > level) this.counts.delete(existing);
    }

    return value;
  }

  /** Anything other than a list item ends the run of numbering. */
  reset(): void {
    this.counts.clear();
  }
}

function addParagraph(
  builder: RichDocumentBuilder,
  paragraph: XmlElement,
  relationships: Map<string, string>,
  numbering: Map<string, boolean>,
  counters: ListCounters
): void {
  const properties = childElements(paragraph, 'pPr')[0] ?? null;
  const spans = runSpans(paragraph, relationships);

  const styleId = properties ? (propertyValue(properties, 'pStyle') ?? '') : '';

  const numberProperties = properties ? childElements(properties, 'numPr')[0] : undefined;

  if (numberProperties) {
    const numId = propertyValue(numberProperties, 'numId') ?? '';
    const levelValue = propertyValue(numberProperties, 'ilvl') ?? '0';
    const level = Number.parseInt(levelValue, 10) || 0;
    const ordered = numbering.get(`${numId}:${levelValue}`) ?? false;

    builder.add({
      kind: 'listItem',
      ordered,
      level,
      marker: ordered ? `${counters.next(numId, level)}.` : BULLETS[level % BULLETS.length]!,
      spans,
    });
    return;
  }

  counters.reset();

  const headingLevel = headingLevelFor(styleId);
  if (headingLevel) {
    builder.add({ kind: 'heading', level: headingLevel, spans });
    return;
  }

  if (normaliseStyleId(styleId).includes('quote')) {
    builder.add({ kind: 'quote', spans });
    return;
  }

  builder.paragraph(spans);
}

function addTable(builder: RichDocumentBuilder, table: XmlElement, relationships: Map<string, string>): void {
  const rows = childElements(table, 'tr').map((row) =>
    childElements(row, 'tc').map((cell) => cellText(cell, relationships))
  );

  if (rows.length === 0) return;

  // Word marks a header row only optionally, so the first row is treated as
  // the header — which is what it is in practice, and the view still shows
  // every row either way.
  builder.add({ kind: 'table', columns: rows[0]!, rows: rows.slice(1) });
}
