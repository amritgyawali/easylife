/**
 * Calendar-day helpers.
 *
 * Everything the daily-life features schedule against (`tasks.due_date`,
 * `habit_entries.entry_date`) is a Postgres `date`, not a timestamp — so the
 * only correct notion of "today" is the calendar day in the *user's* timezone,
 * never the device's and never UTC. A user in Kathmandu (UTC+05:45) is on
 * tomorrow's date for the last ~6 hours of every UTC day, so deriving the day
 * from `new Date().toISOString()` would silently mark tasks overdue early and
 * write habit check-ins against the wrong day.
 *
 * Dates are passed around as `YYYY-MM-DD` strings to match the database
 * exactly and to sidestep the timezone drift that comes with parsing a bare
 * date into a `Date` (which JS treats as midnight UTC).
 */

/** A calendar day in `YYYY-MM-DD` form, matching a Postgres `date` column. */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

/**
 * The calendar date `instant` falls on in `timeZone`.
 *
 * Uses `en-CA` because it formats as `YYYY-MM-DD` natively, avoiding manual
 * part assembly. Falls back to the device's local date if the runtime lacks
 * full ICU data for the requested zone — a wrong-by-hours date is far better
 * than a crash on the Today screen.
 */
export function toIsoDateInTimeZone(instant: Date, timeZone: string): IsoDate {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return localIsoDate(instant);
  }
}

/** Device-local calendar date, used only as the fallback above. */
function localIsoDate(instant: Date): IsoDate {
  const year = instant.getFullYear();
  const month = String(instant.getMonth() + 1).padStart(2, '0');
  const day = String(instant.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): IsoDate {
  return toIsoDateInTimeZone(now, timeZone);
}

/**
 * Shifts an ISO date by whole days. Works on the calendar value itself (via
 * UTC arithmetic on a midnight-UTC anchor) so it never crosses a DST boundary
 * or shifts by a partial day.
 */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const anchor = new Date(Date.UTC(year!, month! - 1, day!));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` precedes `from`. */
export function differenceInDays(from: IsoDate, to: IsoDate): number {
  const parse = (d: IsoDate) => {
    const [year, month, day] = d.split('-').map(Number);
    return Date.UTC(year!, month! - 1, day!);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/**
 * Start of the week containing `date`.
 * `weekStartsOn` follows the database convention: 0 = Sunday (Nepal's default).
 */
export function startOfWeek(date: IsoDate, weekStartsOn: number): IsoDate {
  const [year, month, day] = date.split('-').map(Number);
  const anchor = new Date(Date.UTC(year!, month! - 1, day!));
  const shift = (anchor.getUTCDay() - weekStartsOn + 7) % 7;
  return addDays(date, -shift);
}

/** Inclusive list of dates from `start` to `end`. Returns [] if end precedes start. */
export function eachDayInRange(start: IsoDate, end: IsoDate): IsoDate[] {
  const span = differenceInDays(start, end);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, index) => addDays(start, index));
}

/** 0 = Sunday .. 6 = Saturday, matching `habits.by_weekday` / `week_start`. */
export function weekdayOf(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function weekdayLabel(date: IsoDate): string {
  return WEEKDAY_LABELS[weekdayOf(date)]!;
}

/** e.g. "23 Jul 2026". Formatted from the string parts, so no timezone is involved. */
export function formatIsoDate(date: IsoDate): string {
  if (!isIsoDate(date)) return date;
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTH_LABELS[month! - 1]} ${year}`;
}

/**
 * Human-relative day label used across the task and calendar lists —
 * "Today" / "Tomorrow" / "Yesterday", a weekday name within the coming week,
 * and an absolute date beyond that.
 */
export function relativeDayLabel(date: IsoDate, today: IsoDate): string {
  const delta = differenceInDays(today, date);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta > 1 && delta < 7) return weekdayLabel(date);
  if (delta < -1 && delta > -7) return `${Math.abs(delta)} days ago`;
  return formatIsoDate(date);
}

/** A due date is overdue only once its day has fully passed. */
export function isOverdue(dueDate: IsoDate | null, today: IsoDate): boolean {
  if (!dueDate) return false;
  return differenceInDays(today, dueDate) < 0;
}

/** Formats a `HH:MM[:SS]` time column as `HH:MM`. */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  return time.slice(0, 5);
}

/** Local wall-clock `HH:MM` for a timestamptz, in the user's timezone. */
export function formatInstantTime(instant: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant));
  } catch {
    return new Date(instant).toTimeString().slice(0, 5);
  }
}
