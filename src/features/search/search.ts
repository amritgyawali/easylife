import type { TaskRow } from '@/features/tasks/api';
import type { NoteRow } from '@/features/notes/api';
import type { TransactionRow } from '@/features/finance/transactions-api';
import { formatMoney } from '@/utils/money';

/**
 * Cross-feature search over what is already in the TanStack Query cache.
 *
 * Deliberately client-side: the same task, note and transaction lists are
 * already loaded for the screens that show them, so searching them locally
 * is instant and works with no network. The schema does have `gin` full-text
 * indexes for when the data outgrows a single page fetch — at that point this
 * becomes the fallback rather than the implementation.
 */

export type SearchResultKind = 'task' | 'note' | 'transaction';

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  /** Route to open when the result is tapped. */
  href: string;
}

const KIND_LABEL: Record<SearchResultKind, string> = {
  task: 'Task',
  note: 'Note',
  transaction: 'Transaction',
};

export function kindLabel(kind: SearchResultKind): string {
  return KIND_LABEL[kind];
}

export interface SearchSources {
  tasks: TaskRow[];
  notes: NoteRow[];
  transactions: TransactionRow[];
}

/** Results are capped per kind so one noisy feature can't crowd out the rest. */
const PER_KIND_LIMIT = 20;

export function search(query: string, sources: SearchSources): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const matches = (...fields: (string | null | undefined)[]) =>
    fields.some((field) => field?.toLowerCase().includes(needle));

  const tasks: SearchResult[] = sources.tasks
    .filter((task) => matches(task.title, task.description))
    .slice(0, PER_KIND_LIMIT)
    .map((task) => ({
      id: task.id,
      kind: 'task',
      title: task.title,
      subtitle: task.due_date ? `Due ${task.due_date} · ${task.status}` : task.status,
      href: '/tasks',
    }));

  const notes: SearchResult[] = sources.notes
    .filter((note) => matches(note.title, note.content, note.folder))
    .slice(0, PER_KIND_LIMIT)
    .map((note) => ({
      id: note.id,
      kind: 'note',
      title: note.title,
      subtitle: note.content.slice(0, 100).replace(/\s+/g, ' ').trim() || note.note_type,
      href: '/notes',
    }));

  const transactions: SearchResult[] = sources.transactions
    .filter((transaction) => matches(transaction.description, transaction.notes, transaction.reference))
    .slice(0, PER_KIND_LIMIT)
    .map((transaction) => ({
      id: transaction.id,
      kind: 'transaction',
      title: transaction.description || 'Transaction',
      subtitle: `${transaction.transaction_date} · ${formatMoney(
        transaction.amount_minor,
        transaction.currency
      )}`,
      href: '/finance',
    }));

  return [...tasks, ...notes, ...transactions];
}
