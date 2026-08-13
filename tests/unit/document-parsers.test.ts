import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readZip } from '@/features/documents/viewer/archive/zip';
import { parseDocumentBytes, sniffFileFormat } from '@/features/documents/viewer/parse-document';
import { excelSerialToIso } from '@/features/documents/viewer/office/xlsx';
import { blockText, type RichBlock, type RichDocument } from '@/features/documents/viewer/rich/rich-document';

/**
 * Real files, produced by Python's `zipfile` with real DEFLATE streams, so the
 * whole path is under test: inflate → ZIP container → XML → format parser.
 */
const FIXTURES = join(__dirname, '..', 'fixtures', 'documents');
const load = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

function parse(name: string, format: Parameters<typeof parseDocumentBytes>[0]['format']) {
  return parseDocumentBytes({
    bytes: load(name),
    fileName: name,
    mimeType: 'application/octet-stream',
    format,
  });
}

function richOf(parsed: ReturnType<typeof parseDocumentBytes>): RichDocument {
  if (parsed.presentation !== 'rich') throw new Error(`expected a rich document, got ${parsed.presentation}`);
  return parsed.document;
}

const textOfBlocks = (blocks: RichBlock[]) => blocks.map(blockText).join('\n');

describe('readZip', () => {
  it('lists entries with their sizes and compression method', () => {
    const zip = readZip(load('sample.zip'));
    const names = zip.entries.map((entry) => entry.name);

    expect(names).toEqual(expect.arrayContaining(['readme.txt', 'logs/big.log', 'stored.bin']));

    const stored = zip.entries.find((entry) => entry.name === 'stored.bin')!;
    expect(stored.compressionMethod).toBe(0);
    expect(stored.uncompressedSize).toBe(256);
  });

  it('reads both stored and deflated entries', () => {
    const zip = readZip(load('sample.zip'));

    expect(zip.readText('readme.txt')).toBe('Kept for the archive listing test.\n');
    expect(zip.readText('logs/big.log')).toHaveLength('2026-01-01 sync ok\n'.length * 400);
    expect(zip.read('stored.bin')[255]).toBe(255);
  });

  it('reports a file that is not in the archive', () => {
    expect(() => readZip(load('sample.zip')).read('nope.txt')).toThrow(/no "nope.txt"/);
  });
});

describe('sniffFileFormat', () => {
  it('identifies ZIP-based formats by what is inside, not by name', () => {
    // The whole point: a .docx mailed as `application/octet-stream` and saved
    // with the wrong extension is still a .docx.
    expect(sniffFileFormat(load('sample.docx'), 'unknown')).toBe('docx');
    expect(sniffFileFormat(load('sample.xlsx'), 'zip')).toBe('xlsx');
    expect(sniffFileFormat(load('sample.pptx'), 'unknown')).toBe('pptx');
    expect(sniffFileFormat(load('sample.odt'), 'zip')).toBe('odt');
    expect(sniffFileFormat(load('sample.ods'), 'unknown')).toBe('ods');
    expect(sniffFileFormat(load('sample.epub'), 'zip')).toBe('epub');
    expect(sniffFileFormat(load('sample.zip'), 'unknown')).toBe('zip');
  });

  it('identifies PDF and RTF by their signature', () => {
    expect(sniffFileFormat(new TextEncoder().encode('%PDF-1.7\n...'), 'text')).toBe('pdf');
    expect(sniffFileFormat(new TextEncoder().encode('{\\rtf1\\ansi Hello}'), 'unknown')).toBe('rtf');
  });

  it('leaves a plain text file alone', () => {
    expect(sniffFileFormat(new TextEncoder().encode('a,b\n1,2'), 'csv')).toBe('csv');
  });
});

describe('parseDocx', () => {
  const document = richOf(parse('sample.docx', 'docx'));
  const text = textOfBlocks(document.blocks);

  it('reads the document in order, with headings', () => {
    expect(document.blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(text).toContain('Rental agreement');
    expect(text).toContain('Parties');
    expect(text).toContain('Signed in Kathmandu.');
  });

  it('merges the runs Word splits a sentence into, keeping the formatting', () => {
    const paragraph = document.blocks.find(
      (block) => block.kind === 'paragraph' && blockText(block).startsWith('Between')
    );

    expect(paragraph).toBeDefined();
    expect(blockText(paragraph!)).toBe('Between Amrit Gyawali and Shrestha Properties.');
    expect(paragraph).toMatchObject({
      spans: [
        { text: 'Between ' },
        { text: 'Amrit Gyawali', bold: true },
        { text: ' and ' },
        { text: 'Shrestha Properties', italic: true },
        { text: '.' },
      ],
    });
  });

  it('resolves a hyperlink to its target', () => {
    const link = document.blocks
      .flatMap((block) => ('spans' in block ? block.spans : []))
      .find((span) => span.href);

    expect(link).toMatchObject({ text: 'Full terms online', href: 'https://example.test/terms' });
  });

  it('numbers an ordered list and bullets an unordered one', () => {
    const items = document.blocks.filter((block) => block.kind === 'listItem');

    expect(items).toMatchObject([
      { ordered: true, marker: '1.', level: 0 },
      { ordered: true, marker: '2.' },
      { ordered: false, marker: '•' },
    ]);
  });

  it('keeps tables as tables', () => {
    const table = document.blocks.find((block) => block.kind === 'table');

    expect(table).toMatchObject({ columns: ['Month', 'Rent'], rows: [['Baisakh', '25,000']] });
  });

  it('summarises what was read', () => {
    expect(document.summary).toContain('Word document');
    expect(document.summary).toMatch(/\d+ words/);
  });
});

describe('parseXlsx', () => {
  const parsed = parse('sample.xlsx', 'xlsx');
  if (parsed.presentation !== 'grids') throw new Error('expected grids');
  const [january, summary] = parsed.grids;

  it('reads every sheet, under its own name', () => {
    expect(parsed.grids.map((grid) => grid.name)).toEqual(['January', 'Summary']);
  });

  it('resolves shared strings, including ones split across runs', () => {
    expect(january!.rows[0]).toEqual(['Date', 'Description', 'Amount']);
    expect(january!.rows[1]![1]).toBe('Rent Kathmandu');
  });

  it('places rows by their declared index, so a blank row is not closed up', () => {
    // The fixture has no row 3; row 4 must stay row 4.
    expect(january!.rows[2]).toEqual(['', '', '']);
    expect(january!.rows[3]![1]).toBe('Salary');
  });

  it('formats date-styled numbers as dates rather than serials', () => {
    expect(january!.rows[1]![0]).toBe('2023-01-01');
  });

  it("shows a formula's cached result", () => {
    expect(january!.rows[3]![2]).toBe('80000');
  });

  it('labels columns like a spreadsheet', () => {
    expect(january!.columns).toEqual(['A', 'B', 'C']);
  });

  it('reads booleans as words', () => {
    expect(summary!.rows[1]![1]).toBe('TRUE');
  });
});

describe('excelSerialToIso', () => {
  it('converts serials to dates, allowing for the 1900 leap-year bug', () => {
    expect(excelSerialToIso(44927)).toBe('2023-01-01');
    expect(excelSerialToIso(1)).toBe('1900-01-01');
    expect(excelSerialToIso(45658)).toBe('2025-01-01');
  });

  it('keeps the time when the serial has one', () => {
    expect(excelSerialToIso(44927.5)).toBe('2023-01-01 12:00');
  });
});

describe('parsePptx', () => {
  const document = richOf(parse('sample.pptx', 'pptx'));
  const text = textOfBlocks(document.blocks);

  it('reads slides in numeric order, each as its own section', () => {
    const sections = document.blocks.filter((block) => block.kind === 'section');
    expect(sections).toMatchObject([{ label: 'Slide 1' }, { label: 'Slide 2' }]);
  });

  it('reads the title as a heading and the body as bullets', () => {
    expect(document.blocks[1]).toMatchObject({ kind: 'heading', spans: [{ text: 'Quarter in review' }] });
    expect(text).toContain('Income up 12%');
    expect(text).toContain('Next steps');
  });

  it('includes speaker notes', () => {
    expect(text).toContain('Mention the fiscal year change');
  });
});

describe('parseOpenDocument', () => {
  it('reads an .odt with headings, lists and tables', () => {
    const document = richOf(parse('sample.odt', 'odt'));
    const text = textOfBlocks(document.blocks);

    expect(document.blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(text).toContain('Meter readings');
    expect(text).toContain('Recorded on the first of each month.');
    expect(document.blocks.filter((block) => block.kind === 'listItem')).toHaveLength(2);
    expect(document.blocks.find((block) => block.kind === 'table')).toMatchObject({
      columns: ['Month', 'Units'],
    });
  });

  it('reads an .ods without materialising its repeated empty columns', () => {
    const parsed = parse('sample.ods', 'ods');
    if (parsed.presentation !== 'grids') throw new Error('expected grids');

    const [ledger] = parsed.grids;
    expect(ledger!.name).toBe('Ledger');
    expect(ledger!.rows).toEqual([
      ['Item', 'Cost'],
      ['Cement', '1450'],
    ]);
  });
});

describe('parseEpub', () => {
  const document = richOf(parse('sample.epub', 'epub'));
  const text = textOfBlocks(document.blocks);

  it('reads chapters in spine order, including ones in a subfolder', () => {
    expect(text.indexOf('Arrival')).toBeLessThan(text.indexOf('Departure'));
    expect(text).toContain('The bus reached Pokhara after dark.');
    expect(text).toContain('Breakfast at the lakeside');
  });

  it('labels each chapter', () => {
    expect(document.blocks.filter((block) => block.kind === 'section')).toHaveLength(2);
  });

  it('names the book in its summary', () => {
    expect(document.summary).toContain('Field notes');
  });
});

describe('archive listing', () => {
  it('reads a plain ZIP as a file list', () => {
    const parsed = parse('sample.zip', 'zip');
    if (parsed.presentation !== 'grids') throw new Error('expected grids');

    const [contents] = parsed.grids;
    expect(contents!.columns).toEqual(['Name', 'Size', 'Packed', 'Modified']);
    expect(contents!.rows.map((row) => row[0])).toEqual(
      expect.arrayContaining(['readme.txt', 'logs/big.log', 'stored.bin'])
    );
    expect(contents!.rows[0]![3]).toMatch(/^2026-01-02/);
  });
});

describe('parseDocumentBytes fallbacks', () => {
  it('pretty-prints JSON so a one-line response is readable', () => {
    const parsed = parseDocumentBytes({
      bytes: new TextEncoder().encode('{"a":1,"b":[2,3]}'),
      fileName: 'response.json',
      mimeType: 'application/json',
      format: 'json',
    });

    if (parsed.presentation !== 'text') throw new Error('expected text');
    expect(parsed.preview.lines[0]).toBe('{');
    expect(parsed.preview.lines).toContain('  "a": 1,');
  });

  it('refuses a binary file it cannot place, rather than showing noise', () => {
    expect(() =>
      parseDocumentBytes({
        bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x00, 0x00]),
        fileName: 'firmware.bin',
        mimeType: 'application/octet-stream',
        format: 'unknown',
      })
    ).toThrow(/aren't text/i);
  });

  it('reads an unknown but textual file as text', () => {
    const parsed = parseDocumentBytes({
      bytes: new TextEncoder().encode('key = value'),
      fileName: 'app.cfg',
      mimeType: '',
      format: 'unknown',
    });

    expect(parsed.presentation).toBe('text');
  });
});
