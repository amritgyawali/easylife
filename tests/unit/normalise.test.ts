import {
  guessColumnMapping,
  normaliseDescription,
  parseAmountCell,
  parseDateCell,
} from '@/features/imports/normalise';

describe('guessColumnMapping', () => {
  it('recognises the common Nepali bank header names', () => {
    const mapping = guessColumnMapping(['Date', 'Particulars', 'Debit', 'Credit', 'Balance']);

    expect(mapping).toEqual({
      Date: 'transaction_date',
      Particulars: 'description',
      Debit: 'debit',
      Credit: 'credit',
      Balance: 'balance',
    });
  });

  // "value date" must not be swallowed by the bare "date" rule.
  it('prefers the longest matching pattern', () => {
    const mapping = guessColumnMapping(['Txn Date', 'Value Date']);

    expect(mapping['Txn Date']).toBe('transaction_date');
    expect(mapping['Value Date']).toBe('value_date');
  });

  it('ignores columns it does not recognise', () => {
    expect(guessColumnMapping(['Mystery'])['Mystery']).toBe('ignore');
  });

  it('does not assign the same role to two columns', () => {
    const mapping = guessColumnMapping(['Description', 'Narration']);
    const roles = Object.values(mapping).filter((role) => role === 'description');
    expect(roles).toHaveLength(1);
  });
});

describe('parseDateCell', () => {
  it('passes an ISO date through', () => {
    expect(parseDateCell('2026-07-23')).toBe('2026-07-23');
  });

  it('reads a named month', () => {
    expect(parseDateCell('23-Jul-2026')).toBe('2026-07-23');
  });

  it('expands a two-digit year', () => {
    expect(parseDateCell('23-Jul-26')).toBe('2026-07-23');
  });

  // 03/04/2026 is genuinely ambiguous; only the profile knows which a given
  // bank means, so an explicit format must be obeyed.
  it('obeys an explicit format over any heuristic', () => {
    expect(parseDateCell('03/04/2026', 'MM/DD/YYYY')).toBe('2026-03-04');
    expect(parseDateCell('03/04/2026', 'DD/MM/YYYY')).toBe('2026-04-03');
  });

  it('uses a value above 12 to settle the ambiguity', () => {
    expect(parseDateCell('23/07/2026')).toBe('2026-07-23');
    expect(parseDateCell('07/23/2026')).toBe('2026-07-23');
  });

  it('defaults to day-first, the convention in Nepal', () => {
    expect(parseDateCell('03/04/2026')).toBe('2026-04-03');
  });

  // A wrong-but-plausible date is worse than an unparsed row.
  it('returns null on an impossible date', () => {
    expect(parseDateCell('31/02/2026')).toBeNull();
  });

  it('returns null on unparseable text', () => {
    expect(parseDateCell('sometime last week')).toBeNull();
    expect(parseDateCell('')).toBeNull();
  });
});

describe('parseAmountCell', () => {
  it('reads a plain decimal', () => {
    expect(parseAmountCell('1250.50', 'NPR')).toBe(125_050);
  });

  it('strips thousands separators', () => {
    expect(parseAmountCell('1,25,050.75', 'NPR')).toBe(12_505_075);
  });

  it('strips a currency symbol', () => {
    expect(parseAmountCell('Rs 500.00', 'NPR')).toBe(50_000);
  });

  it('reads accounting-style parentheses as negative', () => {
    expect(parseAmountCell('(1,234.00)', 'NPR')).toBe(-123_400);
  });

  it('reads a trailing Dr as negative and Cr as positive', () => {
    expect(parseAmountCell('500.00 Dr', 'NPR')).toBe(-50_000);
    expect(parseAmountCell('500.00 Cr', 'NPR')).toBe(50_000);
  });

  it('reads a leading minus', () => {
    expect(parseAmountCell('-500.00', 'NPR')).toBe(-50_000);
  });

  it('honours an explicit European separator convention', () => {
    expect(parseAmountCell('1.234,56', 'NPR', { decimalSeparator: ',', thousandsSeparator: '.' })).toBe(
      123_456
    );
  });

  // 1,234 is far more likely a thousands group than 1.234 of a rupee.
  it('infers a lone comma with a three-digit tail as a thousands separator', () => {
    expect(parseAmountCell('1,234', 'NPR')).toBe(123_400);
  });

  it('infers a lone comma with a two-digit tail as the decimal point', () => {
    expect(parseAmountCell('1234,56', 'NPR')).toBe(123_456);
  });

  // A silent zero would post a transaction that balances but means nothing.
  it('returns null rather than zero on unreadable text', () => {
    expect(parseAmountCell('n/a', 'NPR')).toBeNull();
    expect(parseAmountCell('', 'NPR')).toBeNull();
  });
});

describe('normaliseDescription', () => {
  it('strips long transaction ids and filler words', () => {
    expect(normaliseDescription('POS PURCHASE 4512889 BHATBHATENI SUPERMARKET REF:998812')).toBe(
      'bhatbhateni supermarket'
    );
  });

  it('drops punctuation and collapses whitespace', () => {
    expect(normaliseDescription('  ACME--CORP.,  LTD  ')).toBe('acme corp ltd');
  });

  it('keeps Devanagari text', () => {
    expect(normaliseDescription('राम श्रेष्ठ')).toBe('राम श्रेष्ठ');
  });

  it('returns an empty string when nothing meaningful survives', () => {
    expect(normaliseDescription('POS TXN REF 12345678')).toBe('');
  });
});
