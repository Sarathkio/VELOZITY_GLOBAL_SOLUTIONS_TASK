import api from './client';
import {
  LoginResponse,
  AuthUser,
  Project,
  Task,
  TaskFilters,
  Notification,
  Client,
  User,
  TaskActivity,
  AdminDashboardMetrics,
  PMDashboardMetrics,
  DeveloperDashboardMetrics,
  TaskStatus,
  Priority,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: true; data: LoginResponse }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ success: true; data: AuthUser }>('/auth/me'),

  refresh: () =>
    api.post<{ success: true; data: { accessToken: string } }>('/auth/refresh'),
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const projectsApi = {
  getAll: () =>
    api.get<{ success: true; data: Project[] }>('/projects'),

  getById: (id: string) =>
    api.get<{ success: true; data: Project }>(`/projects/${id}`),

  create: (data: { name: string; description?: string; clientId: string }) =>
    api.post<{ success: true; data: Project }>('/projects', data),

  update: (id: string, data: Partial<{ name: string; description: string; clientId: string }>) =>
    api.patch<{ success: true; data: Project }>(`/projects/${id}`, data),

  delete: (id: string) => api.delete(`/projects/${id}`),

  getActivity: (id: string, params?: { limit?: number; offset?: number }) =>
    api.get<{ success: true; data: TaskActivity[] }>(`/projects/${id}/activity`, { params }),

  getDashboardMetrics: () =>
    api.get<{
      success: true;
      data: AdminDashboardMetrics | PMDashboardMetrics | DeveloperDashboardMetrics;
    }>('/projects/dashboard'),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const tasksApi = {
  getAll: (filters?: TaskFilters) =>
    api.get<{ success: true; data: Task[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/tasks',
      { params: filters },
    ),

  getById: (id: string) =>
    api.get<{ success: true; data: Task }>(`/tasks/${id}`),

  createForProject: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      assignedDeveloperId?: string | null;
      priority: Priority;
      dueDate?: string | null;
    },
  ) => api.post<{ success: true; data: Task }>(`/projects/${projectId}/tasks`, data),

  update: (
    id: string,
    data: Partial<{
      title: string;
      description: string;
      assignedDeveloperId: string | null;
      status: TaskStatus;
      priority: Priority;
      dueDate: string | null;
    }>,
  ) => api.patch<{ success: true; data: Task }>(`/tasks/${id}`, data),

  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<{
      success: true;
      data: Notification[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/notifications', { params }),

  getUnreadCount: () =>
    api.get<{ success: true; data: { count: number } }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch<{ success: true; data: Notification }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<{ success: true; data: { updated: boolean } }>('/notifications/read-all'),
};

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  getAll: () => api.get<{ success: true; data: Client[] }>('/clients'),

  getById: (id: string) => api.get<{ success: true; data: Client }>(`/clients/${id}`),

  create: (data: { name: string; email?: string; phone?: string; company?: string; notes?: string }) =>
    api.post<{ success: true; data: Client }>('/clients', data),

  update: (id: string, data: Partial<{ name: string; email: string; phone: string; company: string; notes: string }>) =>
    api.patch<{ success: true; data: Client }>(`/clients/${id}`, data),

  delete: (id: string) => api.delete(`/clients/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  getAll: (role?: string) =>
    api.get<{ success: true; data: User[] }>('/users', { params: role ? { role } : undefined }),

  getById: (id: string) => api.get<{ success: true; data: User }>(`/users/${id}`),

  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<{ success: true; data: User }>('/users', data),

  update: (id: string, data: Partial<{ name: string; email: string; password: string; role: string }>) =>
    api.patch<{ success: true; data: User }>(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};

// ─── Activity ─────────────────────────────────────────────────────────────────

export const activityApi = {
  getAll: (params?: { limit?: number }) =>
    api.get<{ success: true; data: TaskActivity[] }>('/activity', { params }),
};
