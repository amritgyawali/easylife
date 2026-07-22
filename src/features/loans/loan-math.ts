import type { LoanStatus } from '@/types/database';
import { differenceInDays, type IsoDate } from '@/utils/date';

/**
 * Loan arithmetic, kept pure and UI-free so the money maths is testable
 * without a database.
 *
 * The governing rule, mirroring the ledger: a loan's outstanding balance is
 * **derived from its events**, never stored and hand-edited. `loans.status`
 * is likewise a computed view of those events plus the due date, so it can
 * never drift out of step with the money.
 */

export type LoanEventType =
  'disbursement' | 'repayment' | 'interest_accrual' | 'write_off' | 'reminder_sent' | 'note';

export interface LoanEventLike {
  event_type: LoanEventType;
  amount_minor: number;
  event_date: IsoDate;
  deleted_at?: string | null;
}

export interface LoanLike {
  principal_minor: number;
  due_date: IsoDate | null;
  status: LoanStatus;
}

/** Event types that move money; the rest are annotations on the timeline. */
const MONETARY_EVENTS: LoanEventType[] = ['repayment', 'interest_accrual', 'write_off'];

export function isMonetary(event: LoanEventLike): boolean {
  return MONETARY_EVENTS.includes(event.event_type) && !event.deleted_at;
}

export function sumEvents(events: LoanEventLike[], type: LoanEventType): number {
  return events
    .filter((event) => event.event_type === type && !event.deleted_at)
    .reduce((total, event) => total + event.amount_minor, 0);
}

/**
 * What is still owed.
 *
 * Deliberately identical to `recompute_loan_outstanding()` in
 * `0009_loans.sql` — principal, less repayments, less anything written off,
 * plus accrued interest. Clamped at zero so an overpayment reads as settled
 * rather than as a negative debt, which no one means by "outstanding".
 */
export function outstandingMinor(loan: LoanLike, events: LoanEventLike[]): number {
  const outstanding =
    loan.principal_minor -
    sumEvents(events, 'repayment') -
    sumEvents(events, 'write_off') +
    sumEvents(events, 'interest_accrual');

  return Math.max(0, outstanding);
}

export function totalRepaidMinor(events: LoanEventLike[]): number {
  return sumEvents(events, 'repayment');
}

/** 0–1 share of the loan settled, counting write-offs as settled. */
export function repaymentProgress(loan: LoanLike, events: LoanEventLike[]): number {
  const total = loan.principal_minor + sumEvents(events, 'interest_accrual');
  if (total <= 0) return 1;

  const settled = sumEvents(events, 'repayment') + sumEvents(events, 'write_off');
  return Math.min(1, Math.max(0, settled / total));
}

/**
 * The status the events imply.
 *
 * `cancelled` and `draft` are user-set states about the loan's existence
 * rather than its balance, so they are passed through untouched — recomputing
 * them from money would silently resurrect a cancelled loan.
 */
export function derivedStatus(loan: LoanLike, events: LoanEventLike[], today: IsoDate): LoanStatus {
  if (loan.status === 'cancelled' || loan.status === 'draft') return loan.status;

  const outstanding = outstandingMinor(loan, events);

  if (outstanding === 0) {
    return sumEvents(events, 'write_off') > 0 && sumEvents(events, 'repayment') === 0
      ? 'written_off'
      : 'repaid';
  }

  // Overdue only once the due date has fully passed, matching `isOverdue`
  // for tasks — a loan due today is not yet late.
  if (loan.due_date && differenceInDays(today, loan.due_date) < 0) return 'overdue';

  return sumEvents(events, 'repayment') > 0 ? 'partially_repaid' : 'active';
}

/**
 * Simple (non-compounding) interest accrued between two dates.
 *
 * Simple rather than compound because that is what `interest_type` offers and
 * what informal lending in Nepal overwhelmingly uses; `manual` loans get
 * their interest entered as explicit events instead of computed here.
 * Returns whole minor units — money is never fractional.
 */
export function simpleInterestMinor(
  principalMinor: number,
  ratePercent: number,
  period: 'monthly' | 'yearly',
  fromDate: IsoDate,
  toDate: IsoDate
): number {
  const days = differenceInDays(fromDate, toDate);
  if (days <= 0 || ratePercent <= 0 || principalMinor <= 0) return 0;

  const periodsElapsed = period === 'monthly' ? days / 30 : days / 365;
  return Math.round(principalMinor * (ratePercent / 100) * periodsElapsed);
}

export interface CounterpartyExposure {
  counterpartyId: string;
  currency: string;
  /** Owed to the user (money they lent out and haven't got back). */
  owedToUserMinor: number;
  /** Owed by the user (money they borrowed and haven't repaid). */
  owedByUserMinor: number;
  /** Positive when the counterparty owes the user on balance. */
  netMinor: number;
}

export interface LoanWithEvents {
  counterparty_id: string;
  currency: string;
  direction: 'lent' | 'borrowed';
  loan: LoanLike;
  events: LoanEventLike[];
}

/**
 * Net position per person per currency, for the People screen.
 *
 * Netting lent against borrowed matters: with one friend you've both lent to
 * and borrowed from, two separate gross figures make you do the subtraction
 * in your head, and that is exactly the number the screen exists to answer.
 * Currencies stay separate — netting NPR against AUD without a rate would be
 * meaningless.
 */
export function exposureByCounterparty(loans: LoanWithEvents[]): CounterpartyExposure[] {
  const byKey = new Map<string, CounterpartyExposure>();

  for (const entry of loans) {
    const status = entry.loan.status;
    if (status === 'cancelled' || status === 'draft') continue;

    const key = `${entry.counterparty_id}:${entry.currency}`;
    const exposure = byKey.get(key) ?? {
      counterpartyId: entry.counterparty_id,
      currency: entry.currency,
      owedToUserMinor: 0,
      owedByUserMinor: 0,
      netMinor: 0,
    };

    const outstanding = outstandingMinor(entry.loan, entry.events);
    if (entry.direction === 'lent') exposure.owedToUserMinor += outstanding;
    else exposure.owedByUserMinor += outstanding;

    exposure.netMinor = exposure.owedToUserMinor - exposure.owedByUserMinor;
    byKey.set(key, exposure);
  }

  return [...byKey.values()];
}
