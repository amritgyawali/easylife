import {
  completionStats,
  currentStreak,
  isCompleted,
  isScheduledOn,
  type HabitEntry,
  type HabitSchedule,
} from '@/features/habits/streaks';

const DAILY: HabitSchedule = { recurrence: 'daily', by_weekday: null, target_count: 1 };
// 2026-07-23 is a Thursday; weekdays only means Mon–Fri.
const WEEKDAYS_ONLY: HabitSchedule = {
  recurrence: 'weekly',
  by_weekday: [1, 2, 3, 4, 5],
  target_count: 1,
};

const done = (entry_date: string): HabitEntry => ({ entry_date, count: 1, is_skipped: false });
const skipped = (entry_date: string): HabitEntry => ({ entry_date, count: 0, is_skipped: true });

describe('isScheduledOn', () => {
  it('schedules a daily habit every day', () => {
    expect(isScheduledOn(DAILY, '2026-07-25')).toBe(true);
  });

  it('skips the weekend for a weekday-only habit', () => {
    expect(isScheduledOn(WEEKDAYS_ONLY, '2026-07-23')).toBe(true); // Thursday
    expect(isScheduledOn(WEEKDAYS_ONLY, '2026-07-25')).toBe(false); // Saturday
  });

  it('falls back to every day when a weekly habit has no weekdays recorded', () => {
    expect(isScheduledOn({ recurrence: 'weekly', by_weekday: [], target_count: 1 }, '2026-07-25')).toBe(true);
  });
});

describe('isCompleted', () => {
  it('needs the full target count', () => {
    expect(isCompleted({ entry_date: '2026-07-23', count: 1, is_skipped: false }, 2)).toBe(false);
    expect(isCompleted({ entry_date: '2026-07-23', count: 2, is_skipped: false }, 2)).toBe(true);
  });

  it('never counts a skipped day as completed', () => {
    expect(isCompleted(skipped('2026-07-23'), 1)).toBe(false);
  });

  it('treats a missing entry as not completed', () => {
    expect(isCompleted(undefined, 1)).toBe(false);
  });
});

describe('currentStreak', () => {
  const today = '2026-07-23';

  it('is zero with no history at all', () => {
    expect(currentStreak(DAILY, [], today)).toBe(0);
  });

  it('counts consecutive completed days up to and including today', () => {
    const entries = [done('2026-07-21'), done('2026-07-22'), done('2026-07-23')];
    expect(currentStreak(DAILY, entries, today)).toBe(3);
  });

  // An unfinished today is still in progress — the day isn't over, so it
  // must not be treated as a miss.
  it('keeps the streak alive when today has not been done yet', () => {
    const entries = [done('2026-07-21'), done('2026-07-22')];
    expect(currentStreak(DAILY, entries, today)).toBe(2);
  });

  it('breaks on a genuinely missed day', () => {
    const entries = [done('2026-07-20'), done('2026-07-22'), done('2026-07-23')];
    expect(currentStreak(DAILY, entries, today)).toBe(2);
  });

  // Skipping is a deliberate "not today", not a failure.
  it('treats a skipped day as neutral rather than a break', () => {
    const entries = [done('2026-07-21'), skipped('2026-07-22'), done('2026-07-23')];
    expect(currentStreak(DAILY, entries, today)).toBe(2);
  });

  // A weekday habit shouldn't lose its streak over a weekend it was never
  // scheduled for.
  it('ignores unscheduled days', () => {
    const monday = '2026-07-27';
    const entries = [done('2026-07-23'), done('2026-07-24'), done(monday)];
    expect(currentStreak(WEEKDAYS_ONLY, entries, monday)).toBe(3);
  });
});

describe('completionStats', () => {
  it('reports the rate over scheduled days only', () => {
    const entries = [done('2026-07-21'), done('2026-07-22')];
    const stats = completionStats(DAILY, entries, '2026-07-20', '2026-07-23');

    expect(stats).toEqual({ scheduled: 4, completed: 2, rate: 0.5 });
  });

  it('removes skipped days from the denominator instead of counting them as misses', () => {
    const entries = [done('2026-07-21'), skipped('2026-07-22')];
    const stats = completionStats(DAILY, entries, '2026-07-21', '2026-07-22');

    expect(stats).toEqual({ scheduled: 1, completed: 1, rate: 1 });
  });

  it('returns a null rate rather than a meaningless 0% when nothing was scheduled', () => {
    // A Saturday-to-Sunday range for a weekday-only habit.
    const stats = completionStats(WEEKDAYS_ONLY, [], '2026-07-25', '2026-07-26');

    expect(stats).toEqual({ scheduled: 0, completed: 0, rate: null });
  });
});
