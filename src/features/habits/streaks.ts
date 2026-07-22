import { addDays, differenceInDays, eachDayInRange, weekdayOf, type IsoDate } from '@/utils/date';

/**
 * Habit scheduling and streak arithmetic, kept pure and UI-free so it can be
 * unit tested without a database or a rendered screen.
 *
 * Streaks here are a **plain factual counter**, deliberately: the product rules
 * forbid points, badges and streak-shaming, so nothing in this file rewards a
 * long streak or penalises a broken one. It reports what happened, and the UI
 * states it without commentary.
 */

export interface HabitSchedule {
  recurrence: 'daily' | 'weekly' | 'custom';
  /** 0 = Sunday .. 6 = Saturday. Null/empty means "every day". */
  by_weekday: number[] | null;
  target_count: number;
}

export interface HabitEntry {
  entry_date: IsoDate;
  count: number;
  is_skipped: boolean;
}

/**
 * Whether the habit is expected on `date`.
 *
 * `daily` is every day. `weekly` and `custom` both honour `by_weekday` when it
 * is set; with no weekdays recorded there is nothing to narrow by, so the
 * habit falls back to every day rather than silently never being due.
 */
export function isScheduledOn(habit: HabitSchedule, date: IsoDate): boolean {
  if (habit.recurrence === 'daily') return true;
  const weekdays = habit.by_weekday;
  if (!weekdays || weekdays.length === 0) return true;
  return weekdays.includes(weekdayOf(date));
}

export function isCompleted(entry: HabitEntry | undefined, targetCount: number): boolean {
  if (!entry || entry.is_skipped) return false;
  return entry.count >= Math.max(1, targetCount);
}

export function indexEntriesByDate(entries: HabitEntry[]): Map<IsoDate, HabitEntry> {
  return new Map(entries.map((entry) => [entry.entry_date, entry]));
}

/** Hard bound on how far back a streak scan will walk (~2 years). */
const MAX_STREAK_LOOKBACK_DAYS = 750;

/**
 * Consecutive scheduled days completed, counting back from `today`.
 *
 * Three rules make this behave the way people actually expect:
 *   - Days the habit isn't scheduled for are **neutral** — a weekday-only
 *     habit doesn't lose its streak over the weekend.
 *   - Explicitly skipped days are **neutral** too. Skipping is a deliberate
 *     "not today" the user recorded, not a failure.
 *   - Today counts once completed, but an incomplete *today* does not break
 *     the streak — the day isn't over yet.
 */
export function currentStreak(habit: HabitSchedule, entries: HabitEntry[], today: IsoDate): number {
  if (entries.length === 0) return 0;

  const byDate = indexEntriesByDate(entries);
  const earliest = entries.reduce<IsoDate>(
    (min, entry) => (entry.entry_date < min ? entry.entry_date : min),
    entries[0]!.entry_date
  );

  let cursor = today;

  // An unfinished today is still in progress, so start the scan yesterday.
  if (isScheduledOn(habit, today) && !isCompleted(byDate.get(today), habit.target_count)) {
    const todayEntry = byDate.get(today);
    if (!todayEntry?.is_skipped) cursor = addDays(today, -1);
  }

  let streak = 0;
  for (let scanned = 0; scanned < MAX_STREAK_LOOKBACK_DAYS; scanned += 1) {
    // Nothing recorded this far back — the streak cannot continue past it.
    if (differenceInDays(earliest, cursor) < 0) break;

    if (!isScheduledOn(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }

    const entry = byDate.get(cursor);
    if (entry?.is_skipped) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!isCompleted(entry, habit.target_count)) break;

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export interface CompletionStats {
  /** Days in range the habit was scheduled for, excluding skipped days. */
  scheduled: number;
  completed: number;
  /** 0–1, or null when nothing was scheduled (avoids a meaningless 0%). */
  rate: number | null;
}

/**
 * Completion over an inclusive date range. Skipped days leave the range
 * entirely rather than counting as misses, so a deliberate pause doesn't
 * drag the percentage down.
 */
export function completionStats(
  habit: HabitSchedule,
  entries: HabitEntry[],
  from: IsoDate,
  to: IsoDate
): CompletionStats {
  const byDate = indexEntriesByDate(entries);
  let scheduled = 0;
  let completed = 0;

  for (const date of eachDayInRange(from, to)) {
    if (!isScheduledOn(habit, date)) continue;
    const entry = byDate.get(date);
    if (entry?.is_skipped) continue;

    scheduled += 1;
    if (isCompleted(entry, habit.target_count)) completed += 1;
  }

  return { scheduled, completed, rate: scheduled === 0 ? null : completed / scheduled };
}
