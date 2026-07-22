import {
  addDays,
  differenceInDays,
  eachDayInRange,
  isOverdue,
  relativeDayLabel,
  startOfWeek,
  toIsoDateInTimeZone,
  weekdayOf,
} from '@/utils/date';

describe('toIsoDateInTimeZone', () => {
  // The whole reason this module exists: Kathmandu is UTC+05:45, so late in
  // the UTC day it is already tomorrow there. Deriving "today" from
  // toISOString() would mark tasks overdue hours early.
  it('is already the next day in Kathmandu late in the UTC day', () => {
    const instant = new Date('2026-07-22T19:00:00Z');

    expect(toIsoDateInTimeZone(instant, 'UTC')).toBe('2026-07-22');
    expect(toIsoDateInTimeZone(instant, 'Asia/Kathmandu')).toBe('2026-07-23');
  });

  it('agrees with UTC in the middle of the UTC day', () => {
    const instant = new Date('2026-07-22T06:00:00Z');
    expect(toIsoDateInTimeZone(instant, 'Asia/Kathmandu')).toBe('2026-07-22');
  });
});

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('crosses a year boundary backwards', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('differenceInDays', () => {
  it('is positive when the target is in the future', () => {
    expect(differenceInDays('2026-07-22', '2026-07-25')).toBe(3);
  });

  it('is negative when the target is in the past', () => {
    expect(differenceInDays('2026-07-25', '2026-07-22')).toBe(-3);
  });

  it('is zero for the same day', () => {
    expect(differenceInDays('2026-07-22', '2026-07-22')).toBe(0);
  });
});

describe('startOfWeek', () => {
  it('starts on Sunday for the Nepali default', () => {
    // 2026-07-23 is a Thursday.
    expect(weekdayOf('2026-07-23')).toBe(4);
    expect(startOfWeek('2026-07-23', 0)).toBe('2026-07-19');
  });

  it('starts on Monday when configured that way', () => {
    expect(startOfWeek('2026-07-23', 1)).toBe('2026-07-20');
  });

  it('returns the day itself when it is already the start of the week', () => {
    expect(startOfWeek('2026-07-19', 0)).toBe('2026-07-19');
  });
});

describe('eachDayInRange', () => {
  it('is inclusive of both ends', () => {
    expect(eachDayInRange('2026-07-22', '2026-07-24')).toEqual(['2026-07-22', '2026-07-23', '2026-07-24']);
  });

  it('returns an empty list when the end precedes the start', () => {
    expect(eachDayInRange('2026-07-24', '2026-07-22')).toEqual([]);
  });
});

describe('isOverdue', () => {
  it('is false on the due date itself — the day is not over yet', () => {
    expect(isOverdue('2026-07-23', '2026-07-23')).toBe(false);
  });

  it('is true once the due date has passed', () => {
    expect(isOverdue('2026-07-22', '2026-07-23')).toBe(true);
  });

  it('is false for a task with no due date', () => {
    expect(isOverdue(null, '2026-07-23')).toBe(false);
  });
});

describe('relativeDayLabel', () => {
  const today = '2026-07-23';

  it.each([
    ['2026-07-23', 'Today'],
    ['2026-07-24', 'Tomorrow'],
    ['2026-07-22', 'Yesterday'],
    ['2026-07-26', 'Sun'],
    ['2026-07-20', '3 days ago'],
    ['2026-09-01', '1 Sep 2026'],
  ])('labels %s as %s', (date, expected) => {
    expect(relativeDayLabel(date, today)).toBe(expected);
  });
});
