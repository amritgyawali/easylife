import {
  attribute,
  childElements,
  findElement,
  parseXml,
  textContent,
} from '@/features/documents/viewer/xml';
import { parseMarkdown } from '@/features/documents/viewer/rich/markdown';
import { parseHtmlDocument } from '@/features/documents/viewer/rich/html';
import { parseRtf } from '@/features/documents/viewer/rich/rtf';
import { blockText, type RichBlock } from '@/features/documents/viewer/rich/rich-document';

const text = (blocks: RichBlock[]) => blocks.map(blockText).join('\n');

describe('parseXml', () => {
  it('reads elements, attributes and nested text', () => {
    const root = parseXml('<w:p w:rsid="00A"><w:r><w:t>Hello</w:t></w:r></w:p>');

    expect(root.name).toBe('w:p');
    expect(root.local).toBe('p');
    expect(attribute(root, 'rsid')).toBe('00A');
    expect(textContent(root)).toBe('Hello');
  });

  it('decodes entities, including numeric references', () => {
    expect(textContent(parseXml('<t>a &amp; b &#8377; &#x20B9;</t>'))).toBe('a & b ₹ ₹');
  });

  it('handles self-closing tags, comments, CDATA and the prolog', () => {
    const root = parseXml(
      '<?xml version="1.0"?><!-- note --><doc><br/><![CDATA[<not markup>]]><p>x</p></doc>'
    );

    expect(root.local).toBe('doc');
    expect(textContent(root)).toBe('<not markup>x');
    expect(childElements(root).map((child) => child.local)).toEqual(['br', 'p']);
  });

  it('keeps a > inside an attribute value from ending the tag', () => {
    const root = parseXml('<a title="1 > 0"><b/></a>');

    expect(attribute(root, 'title')).toBe('1 > 0');
    expect(findElement(root, 'b')).not.toBeNull();
  });

  it('survives a stray closing tag rather than losing the document', () => {
    // Real-world files are not always well-formed, and refusing them would
    // show the reader nothing at all.
    expect(textContent(parseXml('<doc><p>kept</p></b><p>also kept</p></doc>'))).toBe('keptalso kept');
  });

  it('treats HTML void and raw-text elements correctly when asked', () => {
    const root = parseXml('<body><p>one<br>two</p><script>if (a < b) {}</script><p>three</p></body>', {
      voidElements: new Set(['br']),
      rawTextElements: new Set(['script']),
      lowerCaseNames: true,
    });

    // Without void handling, everything after <br> would nest inside it —
    // here both paragraphs stay siblings at the top level.
    expect(childElements(root).map((child) => child.local)).toEqual(['p', 'script', 'p']);
    expect(childElements(root, 'p').map(textContent)).toEqual(['onetwo', 'three']);

    // The script element survives as an empty node; its body is never text.
    expect(textContent(root)).toBe('onetwothree');
  });
});

describe('parseMarkdown', () => {
  const document = parseMarkdown(
    [
      '# Weekly review',
      '',
      'Spending was **down** this week, mostly on *fuel*.',
      '',
      '## Actions',
      '- Reconcile the Nabil import',
      '- Chase the [deposit](https://example.test/deposit)',
      '',
      '1. First',
      '2. Second',
      '',
      '> Worth repeating next month.',
      '',
      '```sql',
      'select count(*) from ledger_entries;',
      '```',
      '',
      '| Item | Cost |',
      '| --- | --- |',
      '| Rent | 25000 |',
      '',
      '---',
    ].join('\n')
  );

  it('reads headings at their level', () => {
    expect(document.blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(document.blocks.find((block) => blockText(block) === 'Actions')).toMatchObject({ level: 2 });
  });

  it('reads inline emphasis without leaving the markers in the text', () => {
    const paragraph = document.blocks.find((block) => block.kind === 'paragraph')!;

    expect(blockText(paragraph)).toBe('Spending was down this week, mostly on fuel.');
    expect(paragraph).toMatchObject({
      spans: [
        { text: 'Spending was ' },
        { text: 'down', bold: true },
        { text: ' this week, mostly on ' },
        { text: 'fuel', italic: true },
        { text: '.' },
      ],
    });
  });

  it('keeps list ordering and link targets', () => {
    const items = document.blocks.filter((block) => block.kind === 'listItem');

    expect(items.map((item) => (item.kind === 'listItem' ? item.marker : ''))).toEqual([
      '•',
      '•',
      '1.',
      '2.',
    ]);
    expect(items[1]).toMatchObject({
      spans: expect.arrayContaining([{ text: 'deposit', href: 'https://example.test/deposit' }]),
    });
  });

  it('keeps code fences verbatim', () => {
    expect(document.blocks.find((block) => block.kind === 'code')).toMatchObject({
      text: 'select count(*) from ledger_entries;',
    });
  });

  it('reads a pipe table and a rule', () => {
    expect(document.blocks.find((block) => block.kind === 'table')).toMatchObject({
      columns: ['Item', 'Cost'],
      rows: [['Rent', '25000']],
    });
    expect(document.blocks.some((block) => block.kind === 'divider')).toBe(true);
  });

  it('reads a quote', () => {
    expect(document.blocks.find((block) => block.kind === 'quote')).toMatchObject({
      spans: [{ text: 'Worth repeating next month.' }],
    });
  });
});

describe('parseHtmlDocument', () => {
  const document = parseHtmlDocument(`
    <html><head><title>ignored</title><style>p { color: red }</style></head>
    <body>
      <h1>Invoice 204</h1>
      <p>Due <strong>15 Magh</strong>, payable to <a href="https://example.test/pay">the account</a>.</p>
      <ul><li>Delivery</li><li>Installation</li></ul>
      <table><tr><th>Line</th><th>Amount</th></tr><tr><td>Labour</td><td>4,500</td></tr></table>
      <script>alert('never runs')</script>
      <blockquote>Thank you for your business.</blockquote>
    </body></html>
  `);

  it('reads structure, not markup', () => {
    expect(document.blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(text(document.blocks)).toContain('Invoice 204');
    expect(text(document.blocks)).toContain('Due 15 Magh, payable to the account.');
  });

  it('drops scripts and styles entirely', () => {
    const all = text(document.blocks);

    expect(all).not.toContain('alert');
    expect(all).not.toContain('color: red');
  });

  it('keeps links, lists, tables and quotes', () => {
    expect(document.blocks.filter((block) => block.kind === 'listItem')).toHaveLength(2);
    expect(document.blocks.find((block) => block.kind === 'table')).toMatchObject({
      columns: ['Line', 'Amount'],
      rows: [['Labour', '4,500']],
    });
    expect(document.blocks.find((block) => block.kind === 'quote')).toBeDefined();

    const link = document.blocks
      .flatMap((block) => ('spans' in block ? block.spans : []))
      .find((span) => span.href);
    expect(link).toMatchObject({ text: 'the account', href: 'https://example.test/pay' });
  });

  it('does not repeat a table or list as loose text', () => {
    const occurrences = text(document.blocks).match(/Labour/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });
});

describe('parseRtf', () => {
  const document = parseRtf(
    String.raw`{\rtf1\ansi\deff0{\fonttbl{\f0\fnil Calibri;}}{\colortbl ;\red0\green0\blue0;}
{\info{\author Somebody}}
\pard Receipt for \b Khalti\b0  top-up\par
\pard Amount: \'a3500 and \u8377? paid\par
\pard\i Thank you\i0\par}`
  );

  it('reads paragraphs, dropping the font and colour tables', () => {
    const all = text(document.blocks);

    expect(all).toContain('Receipt for Khalti top-up');
    expect(all).not.toContain('Calibri');
    expect(all).not.toContain('Somebody');
  });

  it('decodes escaped bytes and Unicode escapes', () => {
    expect(text(document.blocks)).toContain('Amount: £500 and ₹ paid');
  });

  it('keeps bold and italic runs', () => {
    const spans = document.blocks.flatMap((block) => ('spans' in block ? block.spans : []));

    expect(spans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Khalti', bold: true }),
        expect.objectContaining({ text: 'Thank you', italic: true }),
      ])
    );
  });
});
