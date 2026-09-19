import { Role, TaskStatus, Priority, NotificationType } from '@prisma/client';

// Re-export Prisma enums for use throughout the codebase
export { Role, TaskStatus, Priority, NotificationType };

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  role: Role;
  email: string;
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── WebSocket event payloads (shared with frontend via types) ────────────────

export interface TaskStatusChangedPayload {
  activityId: string;
  taskId: string;
  projectId: string;
  taskTitle: string;
  userId: string;
  userName: string;
  oldStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  action: string;
  timestamp: string;
}

export interface NotificationCreatedPayload {
  id: string;
  type: NotificationType;
  message: string;
  relatedTaskId?: string | null;
  relatedProjectId?: string | null;
  createdAt: string;
}

export interface NotificationCountPayload {
  count: number;
}

export interface PresencePayload {
  onlineCount: number;
  onlineUsers: Array<{ userId: string; name: string }>;
}

export interface ActivityCatchupPayload {
  activities: TaskStatusChangedPayload[];
}

// ─── Socket.io event map (server → client) ────────────────────────────────────

export interface ServerToClientEvents {
  'task:statusChanged': (payload: TaskStatusChangedPayload) => void;
  'notification:created': (payload: NotificationCreatedPayload) => void;
  'notification:countUpdated': (payload: NotificationCountPayload) => void;
  'presence:updated': (payload: PresencePayload) => void;
  'activity:catchup': (payload: ActivityCatchupPayload) => void;
  'error': (payload: { message: string }) => void;
}

// ─── Socket.io event map (client → server) ────────────────────────────────────

export interface ClientToServerEvents {
  'presence:ping': () => void;
}

// ─── Socket.io inter-server events ───────────────────────────────────────────

export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket data ─────────────────────────────────────────────────────────────

export interface SocketData {
  userId: string;
  role: Role;
  email: string;
  name: string;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  dueFrom?: Date;
  dueTo?: Date;
  projectId?: string;
  assignedDeveloperId?: string;
  isOverdue?: boolean;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
