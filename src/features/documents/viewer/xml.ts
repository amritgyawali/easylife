/**
 * A small, forgiving XML reader for document formats.
 *
 * Office Open XML and OpenDocument parts are plain XML, and React Native has
 * no `DOMParser`, so the reader is written here. It is deliberately narrow:
 * it understands elements, attributes, text, CDATA, comments, processing
 * instructions and the five predefined entities plus numeric references —
 * which is the whole of what `word/document.xml` or `content.xml` uses. It has
 * no notion of validation, external entities or DTDs, so it cannot be talked
 * into fetching anything (an XXE is structurally impossible here).
 *
 * Namespace prefixes are kept verbatim on `name` and stripped on `local`, so
 * callers can match `w:p` by its local name `p` without tracking declarations —
 * OOXML and ODF both use stable, well-known prefixes.
 */

export interface XmlElement {
  /** Qualified name exactly as written, e.g. `w:p`. */
  name: string;
  /** Name with any namespace prefix removed, e.g. `p`. */
  local: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

export interface XmlText {
  text: string;
}

export type XmlNode = XmlElement | XmlText;

export function isElement(node: XmlNode): node is XmlElement {
  return (node as XmlElement).name !== undefined;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeXmlEntities(value: string): string {
  if (!value.includes('&')) return value;

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function safeFromCodePoint(code: number, fallback: string): string {
  // Out-of-range references appear in the wild; leaving them as written beats
  // throwing on an otherwise readable document.
  if (code < 0 || code > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

function localName(name: string): string {
  const colon = name.indexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
}

export interface XmlParseOptions {
  /**
   * Elements that never have content, given as lower-case local names. HTML's
   * `<br>` and `<img>` are not written self-closing, and without this the rest
   * of the document would be parsed as their children.
   */
  voidElements?: ReadonlySet<string>;
  /**
   * Elements whose content is text, not markup (HTML's `<script>`/`<style>`).
   * Their content is skipped entirely — it is never something to read.
   */
  rawTextElements?: ReadonlySet<string>;
  /** Lower-cases element and attribute names, since HTML is case-insensitive. */
  lowerCaseNames?: boolean;
}

/**
 * Parses a document and returns its root element.
 *
 * Unmatched or stray closing tags are ignored rather than fatal: a reader that
 * refuses a slightly malformed file shows the user nothing, while one that
 * keeps going shows them their document.
 */
export function parseXml(source: string, options: XmlParseOptions = {}): XmlElement {
  const root: XmlElement = { name: '#document', local: '#document', attributes: {}, children: [] };
  const stack: XmlElement[] = [root];
  let index = 0;

  const current = (): XmlElement => stack[stack.length - 1]!;

  while (index < source.length) {
    const open = source.indexOf('<', index);

    if (open === -1) {
      appendText(current(), source.slice(index));
      break;
    }

    if (open > index) appendText(current(), source.slice(index, open));

    // Comments, CDATA, DOCTYPE and processing instructions.
    if (source.startsWith('<!--', open)) {
      const close = source.indexOf('-->', open + 4);
      index = close === -1 ? source.length : close + 3;
      continue;
    }

    if (source.startsWith('<![CDATA[', open)) {
      const close = source.indexOf(']]>', open + 9);
      const end = close === -1 ? source.length : close;
      current().children.push({ text: source.slice(open + 9, end) });
      index = close === -1 ? source.length : close + 3;
      continue;
    }

    if (source.startsWith('<?', open)) {
      const close = source.indexOf('?>', open + 2);
      index = close === -1 ? source.length : close + 2;
      continue;
    }

    if (source.startsWith('<!', open)) {
      index = skipDoctype(source, open);
      continue;
    }

    const close = findTagEnd(source, open);
    if (close === -1) {
      appendText(current(), source.slice(open));
      break;
    }

    const tag = source.slice(open + 1, close);
    index = close + 1;

    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      closeElement(stack, options.lowerCaseNames ? name.toLowerCase() : name);
      continue;
    }

    const selfClosing = tag.endsWith('/');
    const body = selfClosing ? tag.slice(0, -1) : tag;
    const element = parseTag(body, options);

    current().children.push(element);

    if (selfClosing || options.voidElements?.has(element.local)) continue;

    if (options.rawTextElements?.has(element.local)) {
      index = skipRawText(source, index, element.name);
      continue;
    }

    stack.push(element);
  }

  // A well-formed document has exactly one root; anything else (a fragment, a
  // stray prolog) is wrapped so callers always get one element back.
  const elements = root.children.filter(isElement);
  return elements.length === 1 ? elements[0]! : root;
}

function appendText(parent: XmlElement, raw: string): void {
  if (raw.length === 0) return;
  parent.children.push({ text: decodeXmlEntities(raw) });
}

/** Finds the `>` that ends a tag, skipping any inside quoted attribute values. */
function findTagEnd(source: string, start: number): number {
  let quote: string | null = null;

  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]!;

    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return index;
    }
  }

  return -1;
}

/** Skips `<!DOCTYPE ...>`, including an internal subset in square brackets. */
function skipDoctype(source: string, start: number): number {
  let depth = 0;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === '[') depth += 1;
    else if (char === ']') depth -= 1;
    else if (char === '>' && depth <= 0) return index + 1;
  }

  return source.length;
}

/** Skips to the end of a raw-text element, returning the index after its close tag. */
function skipRawText(source: string, from: number, name: string): number {
  const close = source.toLowerCase().indexOf(`</${name.toLowerCase()}`, from);
  if (close === -1) return source.length;

  const end = source.indexOf('>', close);
  return end === -1 ? source.length : end + 1;
}

const ATTRIBUTE_PATTERN = /([^\s=/>]+)(\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function parseTag(body: string, options: XmlParseOptions): XmlElement {
  const trimmed = body.trim();
  const nameEnd = trimmed.search(/[\s/]/);
  const rawName = nameEnd === -1 ? trimmed : trimmed.slice(0, nameEnd);
  const name = options.lowerCaseNames ? rawName.toLowerCase() : rawName;

  const attributes: Record<string, string> = {};
  if (nameEnd !== -1) {
    const rest = trimmed.slice(nameEnd);
    ATTRIBUTE_PATTERN.lastIndex = 0;

    let match = ATTRIBUTE_PATTERN.exec(rest);
    while (match) {
      const key = options.lowerCaseNames ? match[1]!.toLowerCase() : match[1]!;
      // A bare attribute (HTML's `disabled`) has no value; the empty string
      // matches how the DOM reports it.
      const value = match[4] ?? match[5] ?? match[6] ?? '';
      attributes[key] = decodeXmlEntities(value);
      match = ATTRIBUTE_PATTERN.exec(rest);
    }
  }

  return { name, local: localName(name), attributes, children: [] };
}

/**
 * Closes the nearest open element with this name. If there is none — a stray
 * `</b>` — nothing is closed, which keeps the surrounding content intact.
 */
function closeElement(stack: XmlElement[], name: string): void {
  for (let index = stack.length - 1; index > 0; index -= 1) {
    if (stack[index]!.name === name) {
      stack.length = index;
      return;
    }
  }
}

/** Direct child elements, optionally filtered by local name. */
export function childElements(element: XmlElement, local?: string): XmlElement[] {
  const children = element.children.filter(isElement);
  return local ? children.filter((child) => child.local === local) : children;
}

/** The first descendant with this local name, depth-first. */
export function findElement(element: XmlElement, local: string): XmlElement | null {
  for (const child of element.children) {
    if (!isElement(child)) continue;
    if (child.local === local) return child;

    const nested = findElement(child, local);
    if (nested) return nested;
  }

  return null;
}

/** Every descendant with this local name, in document order. */
export function findElements(element: XmlElement, local: string): XmlElement[] {
  const found: XmlElement[] = [];

  const walk = (node: XmlElement) => {
    for (const child of node.children) {
      if (!isElement(child)) continue;
      if (child.local === local) found.push(child);
      walk(child);
    }
  };

  walk(element);
  return found;
}

/** Attribute lookup that ignores the namespace prefix (`w:val` matches `val`). */
export function attribute(element: XmlElement, local: string): string | undefined {
  const direct = element.attributes[local];
  if (direct !== undefined) return direct;

  for (const [name, value] of Object.entries(element.attributes)) {
    if (localName(name) === local) return value;
  }

  return undefined;
}

/** All text inside an element, concatenated in document order. */
export function textContent(element: XmlElement): string {
  let text = '';

  const walk = (node: XmlNode) => {
    if (!isElement(node)) {
      text += node.text;
      return;
    }
    for (const child of node.children) walk(child);
  };

  walk(element);
  return text;
}
