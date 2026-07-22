import { differenceInDays, type IsoDate } from '@/utils/date';
import type { ParsedRow } from '@/features/imports/parse-statement';

/**
 * Duplicate detection between extracted rows and transactions already in the
 * ledger.
 *
 * Re-importing an overlapping statement period is the normal case, not an
 * edge case, so this has to be reliable. It only ever *flags* — a match is
 * shown to the user, never auto-rejected, because a genuine pair of identical
 * payments on the same day (two identical bus fares, say) is entirely
 * possible and silently dropping one would lose real money from the ledger.
 */

export interface ExistingTransaction {
  id: string;
  transaction_date: IsoDate;
  amount_minor: number;
  transaction_type: string;
  description: string | null;
  reference: string | null;
}

export interface DuplicateMatch {
  rowNumber: number;
  transactionId: string;
  /** 'exact' when the reference matches; 'likely' on date+amount alone. */
  strength: 'exact' | 'likely';
  reason: string;
}

/** How far apart two dates can be and still be the same transaction. */
const DATE_TOLERANCE_DAYS = 2;

function signedAmountOf(transaction: ExistingTransaction): number {
  return transaction.transaction_type === 'income' ? transaction.amount_minor : -transaction.amount_minor;
}

/**
 * Matches extracted rows against existing transactions.
 *
 * A shared reference is decisive — banks don't reuse them. Failing that, the
 * same signed amount within a couple of days is a likely match, which covers
 * the common case of a statement posting a transaction a day or two after the
 * user recorded it by hand.
 */
export function findDuplicates(rows: ParsedRow[], existing: ExistingTransaction[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const claimed = new Set<string>();

  const byReference = new Map<string, ExistingTransaction>();
  for (const transaction of existing) {
    const reference = transaction.reference?.trim().toLowerCase();
    if (reference) byReference.set(reference, transaction);
  }

  for (const row of rows) {
    if (row.signedAmountMinor === null || !row.transactionDate) continue;

    const reference = row.reference?.trim().toLowerCase();
    if (reference) {
      const referenceMatch = byReference.get(reference);
      if (referenceMatch && !claimed.has(referenceMatch.id)) {
        claimed.add(referenceMatch.id);
        matches.push({
          rowNumber: row.rowNumber,
          transactionId: referenceMatch.id,
          strength: 'exact',
          reason: `Same reference "${row.reference}" as an existing transaction`,
        });
        continue;
      }
    }

    // Each existing transaction can only be claimed once, so two identical
    // rows don't both point at the same ledger entry — the second is real.
    const amountMatch = existing.find(
      (transaction) =>
        !claimed.has(transaction.id) &&
        signedAmountOf(transaction) === row.signedAmountMinor &&
        Math.abs(differenceInDays(transaction.transaction_date, row.transactionDate!)) <= DATE_TOLERANCE_DAYS
    );

    if (amountMatch) {
      claimed.add(amountMatch.id);
      matches.push({
        rowNumber: row.rowNumber,
        transactionId: amountMatch.id,
        strength: 'likely',
        reason: `Same amount on ${amountMatch.transaction_date} as an existing transaction`,
      });
    }
  }

  return matches;
}

/**
 * Finds rows that duplicate each other *within* the same import.
 *
 * A statement listing the same row twice is usually a parsing artefact (a
 * page header repeated mid-table), so unlike cross-ledger duplicates these
 * are worth surfacing separately.
 */
export function findInternalDuplicates(rows: ParsedRow[]): number[][] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    if (row.signedAmountMinor === null || !row.transactionDate) continue;
    const key = `${row.transactionDate}|${row.signedAmountMinor}|${row.normalizedDescription ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), row.rowNumber]);
  }

  return [...groups.values()].filter((rowNumbers) => rowNumbers.length > 1);
}
