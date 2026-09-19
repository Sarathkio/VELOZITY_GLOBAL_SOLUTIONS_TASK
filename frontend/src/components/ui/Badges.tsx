import { cn, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/index';
import { TaskStatus, Priority } from '../../types';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        PRIORITY_COLORS[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

interface OverdueBadgeProps {
  className?: string;
}

export function OverdueBadge({ className }: OverdueBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200',
        className,
      )}
    >
      ⚠ Overdue
    </span>
  );
}
