/**
 * EPUB (.epub) → `RichDocument`.
 *
 * An EPUB is a ZIP of XHTML chapters plus a package file that says which order
 * they go in. Since the chapters are HTML, the whole reader is: find the
 * package, read the spine, and append each chapter through the HTML parser —
 * which is the payoff for having one `RichDocument` model instead of a
 * bespoke view per format.
 */

import { DocumentParseError } from '@/features/documents/viewer/parse-error';
import type { ZipArchive } from '@/features/documents/viewer/archive/zip';
import {
  attribute,
  childElements,
  findElement,
  findElements,
  parseXml,
} from '@/features/documents/viewer/xml';
import {
  describeBlocks,
  RichDocumentBuilder,
  type RichDocument,
} from '@/features/documents/viewer/rich/rich-document';
import { appendHtmlBody } from '@/features/documents/viewer/rich/html';

const CONTAINER_PART = 'META-INF/container.xml';

/** Resolves an href that is relative to the package file's own folder. */
function resolveRelative(base: string, href: string): string {
  const folder = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const combined = href.startsWith('/') ? href.slice(1) : folder + href;

  // Collapse any `../` segments so the path matches a ZIP entry name.
  const segments: string[] = [];
  for (const segment of combined.split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }

  return segments.join('/');
}

function findPackagePath(zip: ZipArchive): string {
  const containerXml = zip.readText(CONTAINER_PART);

  if (containerXml) {
    const rootFile = findElement(parseXml(containerXml), 'rootfile');
    const path = rootFile ? attribute(rootFile, 'full-path') : undefined;
    if (path && zip.has(path)) return path;
  }

  // Some hand-made EPUBs omit the container; the package file is still there.
  const fallback = zip.entries.find((entry) => entry.name.toLowerCase().endsWith('.opf'));
  if (fallback) return fallback.name;

  throw new DocumentParseError('This EPUB has no package file, so its chapters can’t be ordered.');
}

export function parseEpub(zip: ZipArchive): RichDocument {
  const packagePath = findPackagePath(zip);
  const packageXml = zip.readText(packagePath);
  if (!packageXml) throw new DocumentParseError('This EPUB’s package file could not be read.');

  const root = parseXml(packageXml);

  const title = findElements(root, 'title')[0];
  const bookTitle = title ? title.children.map((node) => ('text' in node ? node.text : '')).join('') : '';

  const manifest = new Map<string, { href: string; mediaType: string }>();
  const manifestElement = findElement(root, 'manifest');
  if (manifestElement) {
    for (const item of childElements(manifestElement, 'item')) {
      const id = attribute(item, 'id');
      const href = attribute(item, 'href');
      if (!id || !href) continue;
      manifest.set(id, { href, mediaType: attribute(item, 'media-type') ?? '' });
    }
  }

  const spineElement = findElement(root, 'spine');
  const spine = spineElement ? childElements(spineElement, 'itemref') : [];

  const builder = new RichDocumentBuilder();
  let chapters = 0;

  for (const itemRef of spine) {
    const id = attribute(itemRef, 'idref');
    const item = id ? manifest.get(id) : undefined;
    if (!item) continue;

    const path = resolveRelative(packagePath, item.href);
    const chapterXml = zip.has(path) ? zip.readText(path) : null;
    if (!chapterXml) continue;

    chapters += 1;
    builder.section(`Chapter ${chapters}`);
    appendHtmlBody(builder, chapterXml);

    // The builder stops accepting blocks at its cap; reading further chapters
    // would only cost time.
    if (builder.length >= 20_000) break;
  }

  if (chapters === 0) throw new DocumentParseError('This EPUB has no readable chapters.');

  return builder.build((blocks) =>
    describeBlocks(
      blocks,
      [bookTitle || 'EPUB', `${chapters} chapter${chapters === 1 ? '' : 's'}`].join(' · ')
    )
  );
}
