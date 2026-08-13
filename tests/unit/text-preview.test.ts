import {
  decodeTextPreview,
  findMatchingLines,
  findMatchingRows,
  looksBinary,
  splitHighlights,
  splitLines,
} from '@/features/documents/viewer/text-preview';

const encode = (value: string) => new TextEncoder().encode(value);

describe('decodeTextPreview', () => {
  it('decodes UTF-8 and strips a byte-order mark', () => {
    const preview = decodeTextPreview(encode('\ufeffDate,Amount\n2026-01-01,500'));

    expect(preview.text.startsWith('Date')).toBe(true);
    expect(preview.truncated).toBe(false);
    expect(preview.lines).toEqual(['Date,Amount', '2026-01-01,500']);
  });

  it('keeps Devanagari intact', () => {
    expect(decodeTextPreview(encode('किराना पसल')).text).toBe('किराना पसल');
  });

  it('truncates past the limit and reports how much was left out', () => {
    const preview = decodeTextPreview(encode('abcdefghij'), 4);

    expect(preview.text).toBe('abcd');
    expect(preview.truncated).toBe(true);
    expect(preview.omittedBytes).toBe(6);
  });

  it('drops the partial character a truncation leaves behind', () => {
    // "नम" is three bytes per character; cutting at 4 splits the second one.
    const preview = decodeTextPreview(encode('नम'), 4);

    expect(preview.text).toBe('न');
    expect(preview.truncated).toBe(true);
  });

  it('flags binary content instead of showing mojibake', () => {
    expect(decodeTextPreview(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])).binary).toBe(true);
  });
});

describe('splitLines', () => {
  it('handles all three line endings and keeps blank lines', () => {
    expect(splitLines('a\r\nb\nc\r\n\nd')).toEqual(['a', 'b', 'c', '', 'd']);
  });
});

describe('looksBinary', () => {
  it('is false for ordinary text', () => {
    expect(looksBinary('Opening balance 12,400.55\nBank of Kathmandu')).toBe(false);
  });

  it('is true when the sample contains NUL', () => {
    expect(looksBinary('abc\u0000def')).toBe(true);
  });

  it('is true when most of the sample failed to decode', () => {
    expect(looksBinary('\ufffd\ufffd\ufffd\ufffda')).toBe(true);
  });
});

describe('findMatchingLines', () => {
  const lines = ['Opening balance', 'ESEWA LOAD', 'esewa cashback', 'Closing balance'];

  it('matches case-insensitively, in order', () => {
    expect(findMatchingLines(lines, 'esewa')).toEqual([1, 2]);
  });

  it('returns nothing for a blank query', () => {
    expect(findMatchingLines(lines, '   ')).toEqual([]);
  });
});

describe('findMatchingRows', () => {
  it('matches on any cell in the row', () => {
    const rows = [
      ['2026-01-01', 'Salary', '80000'],
      ['2026-01-02', 'Rent', '-25000'],
    ];

    expect(findMatchingRows(rows, 'rent')).toEqual([1]);
    expect(findMatchingRows(rows, '2026')).toEqual([0, 1]);
  });
});

describe('splitHighlights', () => {
  it('splits a line into plain and matching runs', () => {
    expect(splitHighlights('Khalti topup, Khalti', 'khalti')).toEqual([
      { text: 'Khalti', match: true },
      { text: ' topup, ', match: false },
      { text: 'Khalti', match: true },
    ]);
  });

  it('returns the whole value when there is no match or no query', () => {
    expect(splitHighlights('Rent', 'salary')).toEqual([{ text: 'Rent', match: false }]);
    expect(splitHighlights('Rent', '')).toEqual([{ text: 'Rent', match: false }]);
  });

  it('treats the query literally rather than as a pattern', () => {
    // A regex-based implementation would either throw here or match anything.
    expect(splitHighlights('total (net)', '(net)')).toEqual([
      { text: 'total ', match: false },
      { text: '(net)', match: true },
    ]);
    expect(splitHighlights('a.b', 'a.b')).toEqual([{ text: 'a.b', match: true }]);
    expect(splitHighlights('axb', 'a.b')).toEqual([{ text: 'axb', match: false }]);
  });
});
