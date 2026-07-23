import { escapeCsvCell, toCsv, transactionsToCsv } from '@/features/export/csv';
import type { TransactionRow } from '@/features/finance/transactions-api';

describe('escapeCsvCell', () => {
  it('passes plain values through unquoted', () => {
    expect(escapeCsvCell('hello')).toBe('hello');
    expect(escapeCsvCell(42)).toBe('42');
    expect(escapeCsvCell(true)).toBe('true');
  });

  it('renders null and undefined as empty', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes and escapes commas, quotes and newlines (RFC 4180)', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes leading formula characters to defuse CSV injection', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe('"=SUM(A1:A2)"');
    expect(escapeCsvCell('+1234')).toBe('"+1234"');
    expect(escapeCsvCell('@cmd')).toBe('"@cmd"');
  });
});

describe('toCsv', () => {
  it('builds a header row and CRLF-terminated data rows', () => {
    const csv = toCsv(
      [
        { name: 'Rice', qty: 2 },
        { name: 'Dal, red', qty: 1 },
      ],
      [
        { header: 'Item', value: (r) => r.name },
        { header: 'Qty', value: (r) => r.qty },
      ]
    );

    expect(csv).toBe('Item,Qty\r\nRice,2\r\n"Dal, red",1\r\n');
  });

  it('emits just the header for an empty dataset', () => {
    const csv = toCsv([] as { name: string }[], [{ header: 'Item', value: (r) => r.name }]);
    expect(csv).toBe('Item\r\n');
  });
});

function transaction(overrides: Partial<TransactionRow>): TransactionRow {
  return {
    id: 'txn',
    user_id: 'user',
    transaction_type: 'expense',
    transaction_date: '2026-07-10',
    posting_date: '2026-07-10',
    amount_minor: 125_050,
    currency: 'NPR',
    exchange_rate: null,
    npr_equivalent_minor: null,
    account_id: 'account-1',
    destination_account_id: null,
    category_id: null,
    counterparty_id: null,
    payment_method: null,
    description: null,
    reference: null,
    notes: null,
    location: null,
    is_imported: false,
    status: 'confirmed',
    is_reconciled: false,
    source_document_id: null,
    source_extracted_transaction_id: null,
    loan_id: null,
    investment_transaction_id: null,
    created_by_device_id: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    deleted_at: null,
    version: 1,
    ...overrides,
  };
}

describe('transactionsToCsv', () => {
  it('formats amounts as plain decimals and resolves names via lookups', () => {
    const csv = transactionsToCsv([transaction({ description: 'Groceries' })], {
      accountName: () => 'Cash',
      categoryName: () => 'Food',
    });

    const [header, row] = csv.trim().split('\r\n');
    expect(header).toBe(
      'Date,Type,Amount,Currency,Account,Category,Counterparty,Description,Reference,Notes,Status,Imported'
    );
    expect(row).toBe('2026-07-10,expense,1250.50,NPR,Cash,Food,,Groceries,,,confirmed,no');
  });

  it('falls back to the raw id when no lookup is supplied', () => {
    const csv = transactionsToCsv([transaction({})]);
    expect(csv).toContain('account-1');
  });
});
