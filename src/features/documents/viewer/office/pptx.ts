/**
 * PowerPoint (.pptx) → `RichDocument`, one section per slide.
 *
 * A deck's text lives in shapes on each slide, as DrawingML paragraphs
 * (`a:p` → `a:r` → `a:t`) — the same run/paragraph idea as Word, under a
 * different namespace. Slide *layout* is not reproduced: a phone-sized
 * rendering of a 16:9 canvas would be unreadable, whereas the deck's words in
 * order, slide by slide, is exactly what someone reopening a deck wants.
 *
 * Speaker notes are included where present, since they usually carry what the
 * slide itself deliberately leaves out.
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

const SLIDE_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/;

/** Paragraph runs inside a DrawingML text body. */
function paragraphSpans(paragraph: XmlElement): RichSpan[] {
  const spans: RichSpan[] = [];

  for (const child of paragraph.children) {
    if (!isElement(child)) continue;

    if (child.local === 'r') {
      const properties = childElements(child, 'rPr')[0];
      const bold = properties ? attribute(properties, 'b') === '1' : false;
      const italic = properties ? attribute(properties, 'i') === '1' : false;

      for (const text of childElements(child, 't')) {
        spans.push({ text: textContent(text), bold, italic });
      }
    } else if (child.local === 'br') {
      spans.push({ text: '\n' });
    } else if (child.local === 'fld') {
      // A field (slide number, date) carries its last-rendered text.
      for (const text of childElements(child, 't')) spans.push({ text: textContent(text) });
    }
  }

  return spans;
}

/** True when the shape is the slide's title placeholder. */
function isTitleShape(shape: XmlElement): boolean {
  const placeholder = findElement(shape, 'ph');
  const type = placeholder ? attribute(placeholder, 'type') : undefined;
  return type === 'title' || type === 'ctrTitle';
}

function addShapeText(builder: RichDocumentBuilder, shape: XmlElement, asTitle: boolean): void {
  const textBody = findElement(shape, 'txBody');
  if (!textBody) return;

  const paragraphs = childElements(textBody, 'p');

  paragraphs.forEach((paragraph, index) => {
    const spans = paragraphSpans(paragraph);
    if (spans.length === 0) return;

    if (asTitle && index === 0) {
      builder.add({ kind: 'heading', level: 2, spans });
      return;
    }

    const properties = childElements(paragraph, 'pPr')[0];
    const level = properties ? Number.parseInt(attribute(properties, 'lvl') ?? '0', 10) || 0 : 0;

    // Every non-title paragraph on a slide is a bullet in practice, which is
    // how a deck reads back.
    builder.add({ kind: 'listItem', ordered: false, level, marker: '•', spans });
  });
}

function slideNumber(path: string): number {
  const match = SLIDE_PATTERN.exec(path);
  return match ? Number.parseInt(match[1]!, 10) : Number.MAX_SAFE_INTEGER;
}

export function parsePptx(zip: ZipArchive): RichDocument {
  const slides = zip.entries
    .map((entry) => entry.name)
    .filter((name) => SLIDE_PATTERN.test(name))
    // Alphabetical order would put slide10 before slide2.
    .sort((left, right) => slideNumber(left) - slideNumber(right));

  if (slides.length === 0) {
    throw new DocumentParseError('This presentation has no readable slides.');
  }

  const builder = new RichDocumentBuilder();

  slides.forEach((path, index) => {
    builder.section(`Slide ${index + 1}`);

    const xml = zip.readText(path);
    if (!xml) return;

    const root = parseXml(xml);
    const shapes = findElements(root, 'sp');

    // Title first, so a slide reads title-then-body regardless of the order
    // the shapes happen to be stored in.
    for (const shape of shapes.filter(isTitleShape)) addShapeText(builder, shape, true);
    for (const shape of shapes.filter((shape) => !isTitleShape(shape))) {
      addShapeText(builder, shape, false);
    }

    const notesPath = `ppt/notesSlides/notesSlide${slideNumber(path)}.xml`;
    const notesXml = zip.has(notesPath) ? zip.readText(notesPath) : null;
    if (!notesXml) return;

    const notes = findElements(parseXml(notesXml), 'p')
      .map((paragraph) =>
        paragraphSpans(paragraph)
          .map((span) => span.text)
          .join('')
      )
      .map((line) => line.trim())
      // The notes placeholder repeats the slide number as its own paragraph.
      .filter((line) => line.length > 0 && line !== `${index + 1}`);

    if (notes.length > 0) builder.add({ kind: 'quote', spans: [{ text: `Notes: ${notes.join('\n')}` }] });
  });

  return builder.build((blocks) =>
    describeBlocks(blocks, `Presentation · ${slides.length} slide${slides.length === 1 ? '' : 's'}`)
  );
}
