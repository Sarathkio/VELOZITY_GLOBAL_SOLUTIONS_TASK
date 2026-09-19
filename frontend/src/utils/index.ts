import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TaskStatus, Priority } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  DONE: 'bg-green-100 text-green-700 border-green-200',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-600 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function formatActivityMessage(activity: {
  userName: string;
  taskTitle: string;
  oldStatus: string | null;
  newStatus: string | null;
  action: string;
}): string {
  const { userName, taskTitle, oldStatus, newStatus, action } = activity;
  switch (action) {
    case 'STATUS_CHANGED':
      return `${userName} moved "${taskTitle}" from ${STATUS_LABELS[oldStatus as TaskStatus] ?? oldStatus} → ${STATUS_LABELS[newStatus as TaskStatus] ?? newStatus}`;
    case 'CREATED':
      return `${userName} created task "${taskTitle}"`;
    case 'ASSIGNED':
      return `${userName} updated assignment on "${taskTitle}"`;
    case 'OVERDUE_FLAGGED':
      return `"${taskTitle}" was flagged as overdue`;
    default:
      return `${userName} updated "${taskTitle}"`;
  }
}
