import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';

/**
 * Returns relative time string ("2 mins ago", "Just now", "1 hour ago").
 * Derived from persisted timestamp — never stores relative string in DB.
 */
export function relativeTime(timestamp: string): string {
  try {
    const date = parseISO(timestamp);
    if (!isValid(date)) return 'Unknown';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatDate(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  try {
    const date = parseISO(timestamp);
    if (!isValid(date)) return '—';
    return format(date, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function formatDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '—';
  try {
    const date = parseISO(timestamp);
    if (!isValid(date)) return '—';
    return format(date, 'MMM d, yyyy HH:mm');
  } catch {
    return '—';
  }
}

export function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
}

export function getDueDateColor(dueDate: string | null | undefined, isOverdueFlag: boolean): string {
  if (!dueDate) return 'text-gray-400';
  if (isOverdueFlag) return 'text-red-600 font-semibold';
  const daysUntilDue = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue <= 2) return 'text-orange-600 font-medium';
  return 'text-gray-600';
}
