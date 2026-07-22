import { applyImportRules, suggestCounterparties } from '@/features/imports/counterparty-match';

const COUNTERPARTIES = [
  { id: 'bhat', display_name: 'Bhatbhateni Supermarket' },
  { id: 'ram', display_name: 'Ram Shrestha' },
  { id: 'ntc', display_name: 'Nepal Telecom' },
];

describe('suggestCounterparties', () => {
  it('matches a name embedded in a noisy bank description', () => {
    const [best] = suggestCounterparties(
      'POS PURCHASE 4512889 BHATBHATENI SUPERMARKET REF:998812',
      COUNTERPARTIES,
      []
    );

    expect(best?.counterpartyId).toBe('bhat');
  });

  // Once the user has said this raw text means this person, there is nothing
  // left to guess — a fuzzy match must never override it.
  it('prefers a confirmed alias over any fuzzy match', () => {
    const [best] = suggestCounterparties('PAYMENT TO NT LTD', COUNTERPARTIES, [
      { counterparty_id: 'ram', alias: 'PAYMENT TO NT LTD' },
    ]);

    expect(best?.counterpartyId).toBe('ram');
    expect(best?.source).toBe('alias');
    expect(best?.score).toBe(1);
  });

  it('returns nothing when the description normalises to nothing', () => {
    expect(suggestCounterparties('POS TXN REF 12345678', COUNTERPARTIES, [])).toEqual([]);
  });

  it('returns nothing when there is nobody to match against', () => {
    expect(suggestCounterparties('Bhatbhateni', [], [])).toEqual([]);
  });

  it('reports a confidence between 0 and 1', () => {
    const [best] = suggestCounterparties('BHATBHATENI SUPERMARKET', COUNTERPARTIES, []);

    expect(best!.score).toBeGreaterThan(0);
    expect(best!.score).toBeLessThanOrEqual(1);
  });

  it('respects the result limit', () => {
    expect(suggestCounterparties('Shrestha', COUNTERPARTIES, [], 1).length).toBeLessThanOrEqual(1);
  });
});

describe('applyImportRules', () => {
  const rules = [
    { match_text: 'bhatbhateni', category_id: 'groceries', counterparty_id: 'bhat' },
    { match_text: 'bhatbhateni supermarket durbarmarg', category_id: 'household', counterparty_id: 'bhat' },
  ];

  it('applies a rule whose text appears in the description', () => {
    const result = applyImportRules('POS BHATBHATENI 8891', rules);
    expect(result?.categoryId).toBe('groceries');
  });

  // A specific rule should beat a general one, or adding detail would make
  // matching less accurate rather than more.
  it('prefers the longest matching rule', () => {
    const result = applyImportRules('POS BHATBHATENI SUPERMARKET DURBARMARG 8891', rules);
    expect(result?.categoryId).toBe('household');
  });

  it('returns null when nothing matches', () => {
    expect(applyImportRules('SALARY CREDIT', rules)).toBeNull();
  });

  it('returns null when the description normalises to nothing', () => {
    expect(applyImportRules('REF 99887766', rules)).toBeNull();
  });
});
