import { z } from 'zod';
import { Priority, Role, TaskStatus } from '@prisma/client';

// ─── Auth validators ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── User validators ──────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional(),
});

// ─── Client validators ────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name is required').max(200),
  email: z.string().email('Invalid email').optional().or(z.literal('')).transform(v => v || undefined),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

// ─── Project validators ───────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required').max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid('Invalid client ID'),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid('Invalid client ID').optional(),
});

// ─── Task validators ──────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title is required').max(300),
  description: z.string().max(5000).optional(),
  assignedDeveloperId: z.string().uuid('Invalid developer ID').optional().nullable(),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).optional().nullable()
    .transform(v => (v ? new Date(v) : undefined)),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(5000).optional(),
  assignedDeveloperId: z.string().uuid('Invalid developer ID').optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable()
    .transform(v => (v ? new Date(v) : null)),
});

export const developerUpdateTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus, { required_error: 'Status is required' }),
});

// ─── Task filter validators ───────────────────────────────────────────────────

export const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueFrom: z.string().datetime({ offset: true }).optional().transform(v => (v ? new Date(v) : undefined)),
  dueTo: z.string().datetime({ offset: true }).optional().transform(v => (v ? new Date(v) : undefined)),
  isOverdue: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Notification validators ──────────────────────────────────────────────────

export const markNotificationReadSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

// ─── UUID param validator ─────────────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format'),
});
