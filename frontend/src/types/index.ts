// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_IN_REVIEW' | 'TASK_OVERDUE' | 'PROJECT_CREATED';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { projects: number };
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client?: Pick<Client, 'id' | 'name' | 'company'>;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
  tasks?: Task[];
  _count?: { tasks: number };
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedDeveloperId?: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  project?: Pick<Project, 'id' | 'name'>;
  assignedDeveloper?: Pick<User, 'id' | 'name' | 'email'> | null;
  activities?: TaskActivity[];
}

// ─── Task Activity ────────────────────────────────────────────────────────────

export interface TaskActivity {
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

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientId?: string;
  type: NotificationType;
  message: string;
  relatedTaskId?: string | null;
  relatedProjectId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  relatedTask?: Pick<Task, 'id' | 'title'> | null;
  relatedProject?: Pick<Project, 'id' | 'name'> | null;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface AdminDashboardMetrics {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Array<{ status: TaskStatus; _count: { id: number } }>;
  overdueCount: number;
}

export interface PMDashboardMetrics {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Array<{ status: TaskStatus; _count: { id: number } }>;
  tasksByPriority: Array<{ priority: Priority; _count: { id: number } }>;
  overdueCount: number;
  upcomingTasks: Task[];
}

export interface DeveloperDashboardMetrics {
  assignedTasks: Task[];
  tasksByStatus: Array<{ status: TaskStatus; _count: { id: number } }>;
  overdueCount: number;
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Task Filters ─────────────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  dueFrom?: string;
  dueTo?: string;
  projectId?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
