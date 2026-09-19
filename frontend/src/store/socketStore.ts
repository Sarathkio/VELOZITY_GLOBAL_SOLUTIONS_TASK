import { create } from 'zustand';
import { TaskActivity, Notification } from '../types';

interface SocketState {
  isConnected: boolean;
  activityFeed: TaskActivity[];
  onlineCount: number;
  onlineUsers: Array<{ userId: string; name: string }>;
  unreadNotificationCount: number;
  notifications: Notification[];

  setConnected: (connected: boolean) => void;
  addActivity: (activity: TaskActivity) => void;
  setCatchupActivities: (activities: TaskActivity[]) => void;
  setOnlinePresence: (count: number, users: Array<{ userId: string; name: string }>) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  reset: () => void;
}

/**
 * WebSocket state store — all real-time state lives here.
 * Activity feed is deduplicated by activityId to prevent duplicates on reconnect.
 */
export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  activityFeed: [],
  onlineCount: 0,
  onlineUsers: [],
  unreadNotificationCount: 0,
  notifications: [],

  setConnected: (isConnected) => set({ isConnected }),

  addActivity: (activity) =>
    set((state) => {
      // Deduplicate by activityId
      const exists = state.activityFeed.some((a) => a.activityId === activity.activityId);
      if (exists) return state;
      return {
        activityFeed: [activity, ...state.activityFeed].slice(0, 100), // Keep last 100
      };
    }),

  setCatchupActivities: (activities) =>
    set((state) => {
      // Merge catch-up with existing live feed, deduplicate
      const existingIds = new Set(state.activityFeed.map((a) => a.activityId));
      const newActivities = activities.filter((a) => !existingIds.has(a.activityId));
      const merged = [...state.activityFeed, ...newActivities];
      // Sort by timestamp descending
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return { activityFeed: merged.slice(0, 100) };
    }),

  setOnlinePresence: (onlineCount, onlineUsers) => set({ onlineCount, onlineUsers }),

  setUnreadCount: (unreadNotificationCount) => set({ unreadNotificationCount }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadNotificationCount: state.unreadNotificationCount + (notification.isRead ? 0 : 1),
    })),

  setNotifications: (notifications) => set({ notifications }),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
      unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1),
    })),

  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
      unreadNotificationCount: 0,
    })),

  reset: () =>
    set({
      isConnected: false,
      activityFeed: [],
      onlineCount: 0,
      onlineUsers: [],
      unreadNotificationCount: 0,
      notifications: [],
    }),
}));
