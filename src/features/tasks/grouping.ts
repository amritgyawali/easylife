import { differenceInDays, isOverdue, type IsoDate } from '@/utils/date';
import type { TaskPriority } from '@/types/database';
import { CLOSED_TASK_STATUSES, type TaskRow } from '@/features/tasks/types';

/**
 * Task ordering and bucketing, kept pure so the rules that decide what lands
 * on "Today" are unit-testable without a database or a rendered screen.
 */

/** Highest first — matches how the list is read, most urgent at the top. */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export function isOpen(task: TaskRow): boolean {
  return !CLOSED_TASK_STATUSES.includes(task.status);
}

/**
 * Sort order used by every task list: overdue and dated work first (earliest
 * due date wins), then by priority, then alphabetically so the order is
 * stable rather than dependent on insertion time.
 */
export function compareTasks(a: TaskRow, b: TaskRow): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }

  const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDelta !== 0) return priorityDelta;

  return a.title.localeCompare(b.title);
}

export type TaskBucket = 'overdue' | 'today' | 'upcoming' | 'someday';

/**
 * Which section of the planner a task belongs to.
 *
 * "Upcoming" deliberately stops at 7 days: beyond that a due date is planning,
 * not a call to action, and mixing the two makes the list unreadable.
 */
export function bucketOf(task: TaskRow, today: IsoDate): TaskBucket {
  if (!task.due_date) return 'someday';
  if (isOverdue(task.due_date, today)) return 'overdue';

  const daysAway = differenceInDays(today, task.due_date);
  if (daysAway === 0) return 'today';
  return daysAway <= 7 ? 'upcoming' : 'someday';
}

export interface TaskSection {
  bucket: TaskBucket;
  title: string;
  tasks: TaskRow[];
}

const BUCKET_TITLES: Record<TaskBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Next 7 days',
  someday: 'Later & undated',
};

const BUCKET_ORDER: TaskBucket[] = ['overdue', 'today', 'upcoming', 'someday'];

/** Groups open tasks into the planner's four sections, dropping empty ones. */
export function groupTasks(tasks: TaskRow[], today: IsoDate): TaskSection[] {
  const byBucket = new Map<TaskBucket, TaskRow[]>(BUCKET_ORDER.map((bucket) => [bucket, []]));

  for (const task of tasks.filter(isOpen)) {
    byBucket.get(bucketOf(task, today))!.push(task);
  }

  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    title: BUCKET_TITLES[bucket],
    tasks: (byBucket.get(bucket) ?? []).sort(compareTasks),
  })).filter((section) => section.tasks.length > 0);
}

/**
 * What belongs on the Today screen: everything due today or already overdue.
 *
 * Undated tasks are excluded on purpose — the point of Today is a finite,
 * finishable list, and folding the whole backlog into it defeats that.
 */
export function tasksDueToday(tasks: TaskRow[], today: IsoDate): TaskRow[] {
  return tasks
    .filter(isOpen)
    .filter((task) => {
      const bucket = bucketOf(task, today);
      return bucket === 'today' || bucket === 'overdue';
    })
    .sort(compareTasks);
}

export function completedOn(tasks: TaskRow[], date: IsoDate): TaskRow[] {
  return tasks.filter((task) => task.status === 'completed' && task.completed_at?.startsWith(date));
}
