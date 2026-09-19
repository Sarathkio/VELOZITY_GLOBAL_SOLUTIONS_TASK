import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSocketStore } from '../../store/socketStore';
import { notificationsApi } from '../../api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relativeTime } from '../../utils/date';
import { cn } from '../../utils/index';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { unreadNotificationCount, setUnreadCount, markNotificationRead, markAllNotificationsRead } = useSocketStore();

  // Fetch notifications from API
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ limit: 20 }),
    select: (res) => res.data.data,
    refetchOnWindowFocus: false,
  });

  // Sync unread count from API on mount
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    select: (res) => res.data.data.count,
  });

  useEffect(() => {
    if (countData !== undefined) {
      setUnreadCount(countData);
    }
  }, [countData, setUnreadCount]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: (_, id) => {
      markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      markAllNotificationsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = data ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications (${unreadNotificationCount} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full font-bold">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadNotificationCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer',
                    !notif.isRead && 'bg-blue-50',
                  )}
                  onClick={() => {
                    if (!notif.isRead) {
                      markReadMutation.mutate(notif.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                        notif.isRead ? 'bg-gray-300' : 'bg-blue-500',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{relativeTime(notif.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
