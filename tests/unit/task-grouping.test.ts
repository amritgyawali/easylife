import { bucketOf, compareTasks, groupTasks, isOpen, tasksDueToday } from '@/features/tasks/grouping';
import type { TaskRow } from '@/features/tasks/types';

const TODAY = '2026-07-23';

function task(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: 'task',
    user_id: 'user',
    title: 'Task',
    description: null,
    status: 'inbox',
    priority: 'none',
    due_date: null,
    due_time: null,
    start_date: null,
    project_id: null,
    parent_task_id: null,
    list_name: null,
    waiting_for: null,
    source: 'manual',
    estimated_minutes: null,
    actual_minutes: null,
    completed_at: null,
    cancelled_at: null,
    archived_at: null,
    device_id: null,
    created_at: '2026-07-20T00:00:00Z',
    updated_at: '2026-07-20T00:00:00Z',
    deleted_at: null,
    version: 1,
    ...overrides,
  };
}

describe('isOpen', () => {
  it.each([
    ['inbox', true],
    ['planned', true],
    ['in_progress', true],
    ['waiting', true],
    ['completed', false],
    ['cancelled', false],
  ] as const)('treats %s as open=%s', (status, expected) => {
    expect(isOpen(task({ status }))).toBe(expected);
  });
});

describe('bucketOf', () => {
  it.each([
    ['2026-07-20', 'overdue'],
    ['2026-07-23', 'today'],
    ['2026-07-26', 'upcoming'],
    ['2026-07-30', 'upcoming'],
    ['2026-09-01', 'someday'],
    [null, 'someday'],
  ] as const)('puts a task due %s in %s', (due_date, expected) => {
    expect(bucketOf(task({ due_date }), TODAY)).toBe(expected);
  });
});

describe('compareTasks', () => {
  it('puts an earlier due date first', () => {
    const sorted = [task({ due_date: '2026-07-25' }), task({ due_date: '2026-07-24' })].sort(compareTasks);
    expect(sorted[0]!.due_date).toBe('2026-07-24');
  });

  it('sinks undated tasks below dated ones', () => {
    const sorted = [task({ due_date: null }), task({ due_date: '2026-08-30' })].sort(compareTasks);
    expect(sorted[0]!.due_date).toBe('2026-08-30');
  });

  it('breaks a due-date tie by priority', () => {
    const sorted = [
      task({ id: 'low', due_date: TODAY, priority: 'low' }),
      task({ id: 'urgent', due_date: TODAY, priority: 'urgent' }),
    ].sort(compareTasks);

    expect(sorted[0]!.id).toBe('urgent');
  });

  it('falls back to title so the order is stable rather than insertion-dependent', () => {
    const sorted = [task({ title: 'Beta' }), task({ title: 'Alpha' })].sort(compareTasks);
    expect(sorted[0]!.title).toBe('Alpha');
  });
});

describe('groupTasks', () => {
  it('drops empty sections and closed tasks', () => {
    const sections = groupTasks(
      [
        task({ id: 'a', due_date: '2026-07-20' }),
        task({ id: 'b', due_date: TODAY }),
        task({ id: 'c', due_date: TODAY, status: 'completed' }),
      ],
      TODAY
    );

    expect(sections.map((section) => section.bucket)).toEqual(['overdue', 'today']);
    expect(sections[1]!.tasks).toHaveLength(1);
  });
});

describe('tasksDueToday', () => {
  // The point of Today is a finite, finishable list — folding the whole
  // undated backlog into it would defeat that.
  it('includes overdue and today but never undated work', () => {
    const result = tasksDueToday(
      [
        task({ id: 'overdue', due_date: '2026-07-20' }),
        task({ id: 'today', due_date: TODAY }),
        task({ id: 'later', due_date: '2026-08-30' }),
        task({ id: 'undated', due_date: null }),
      ],
      TODAY
    );

    expect(result.map((row) => row.id)).toEqual(['overdue', 'today']);
  });
});
