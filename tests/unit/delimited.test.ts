import { detectDelimiter, parseDelimited, parseLine } from '@/features/imports/delimited';

describe('parseLine', () => {
  it('splits on the delimiter', () => {
    expect(parseLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('trims surrounding whitespace', () => {
    expect(parseLine(' a , b ', ',')).toEqual(['a', 'b']);
  });

  // A payee called "SHRESTHA, RAM" is entirely normal on a statement.
  it('keeps a delimiter that appears inside quotes', () => {
    expect(parseLine('2026-07-01,"SHRESTHA, RAM",500', ',')).toEqual(['2026-07-01', 'SHRESTHA, RAM', '500']);
  });

  it('unescapes a doubled quote inside a quoted field', () => {
    expect(parseLine('a,"say ""hi""",b', ',')).toEqual(['a', 'say "hi"', 'b']);
  });

  it('preserves empty fields', () => {
    expect(parseLine('a,,c', ',')).toEqual(['a', '', 'c']);
  });

  it('handles tabs', () => {
    expect(parseLine('a\tb', '\t')).toEqual(['a', 'b']);
  });
});

describe('detectDelimiter', () => {
  it('finds commas', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('finds semicolons', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('finds tabs', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  // A description field full of commas would win a naive frequency count,
  // but produces ragged rows; the real delimiter gives consistent widths.
  it('prefers the delimiter that yields consistent column counts', () => {
    const text = 'date;description;amount\n2026-07-01;"PAID TO RAM, SITA, HARI";500';
    expect(detectDelimiter(text)).toBe(';');
  });

  it('falls back to a comma on unsplittable text', () => {
    expect(detectDelimiter('just one line of prose')).toBe(',');
  });
});

describe('parseDelimited', () => {
  it('takes the first wide line as the header', () => {
    const result = parseDelimited('Date,Description,Amount\n2026-07-01,Tea,50');

    expect(result.header).toEqual(['Date', 'Description', 'Amount']);
    expect(result.rows).toEqual([['2026-07-01', 'Tea', '50']]);
  });

  // Nepali bank exports routinely open with account details and blank lines.
  it('skips a preamble to find the header by pattern', () => {
    const text = [
      'NIC ASIA BANK LIMITED',
      'Account: 1234567890',
      '',
      'Date,Particulars,Debit,Credit',
      '2026-07-01,Tea,50,',
    ].join('\n');

    const result = parseDelimited(text, 'Particulars');

    expect(result.header).toEqual(['Date', 'Particulars', 'Debit', 'Credit']);
    expect(result.skippedLines).toBe(3);
    expect(result.rows).toHaveLength(1);
  });

  it('drops blank lines and short trailing fragments', () => {
    const text = 'Date,Description,Amount\n2026-07-01,Tea,50\n\nTotal\n';
    expect(parseDelimited(text).rows).toEqual([['2026-07-01', 'Tea', '50']]);
  });

  it('returns nothing usable for text with no table at all', () => {
    const result = parseDelimited('a single word');
    expect(result.header).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});
