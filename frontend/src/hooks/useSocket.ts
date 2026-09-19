import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { TaskActivity, NotificationType } from '../types';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:4000';

interface ServerToClientEvents {
  'task:statusChanged': (payload: TaskActivity) => void;
  'notification:created': (payload: {
    id: string;
    type: NotificationType;
    message: string;
    relatedTaskId?: string;
    relatedProjectId?: string;
    createdAt: string;
  }) => void;
  'notification:countUpdated': (payload: { count: number }) => void;
  'presence:updated': (payload: { onlineCount: number; onlineUsers: Array<{ userId: string; name: string }> }) => void;
  'activity:catchup': (payload: { activities: TaskActivity[] }) => void;
  'error': (payload: { message: string }) => void;
}

interface ClientToServerEvents {
  'presence:ping': () => void;
}

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * useSocket — manages the Socket.io connection lifecycle.
 * Called once in the root app component after authentication.
 * Access token is passed as handshake auth — server verifies it and derives
 * user identity server-side. Client never sends role or userId directly.
 */
export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const {
    setConnected,
    addActivity,
    setCatchupActivities,
    setOnlinePresence,
    setUnreadCount,
    addNotification,
    reset,
  } = useSocketStore();

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance = null;
        reset();
      }
      return;
    }

    // Disconnect existing connection before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken }, // Server verifies and derives identity — never trust client-side role
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time task status changed event
    socket.on('task:statusChanged', (payload) => {
      addActivity(payload);
    });

    // Missed event catch-up on reconnect — from PostgreSQL, not memory
    socket.on('activity:catchup', ({ activities }) => {
      setCatchupActivities(activities);
    });

    // Online presence update
    socket.on('presence:updated', ({ onlineCount, onlineUsers }) => {
      setOnlinePresence(onlineCount, onlineUsers);
    });

    // New notification
    socket.on('notification:created', (payload) => {
      addNotification({
        id: payload.id,
        type: payload.type,
        message: payload.message,
        relatedTaskId: payload.relatedTaskId ?? null,
        relatedProjectId: payload.relatedProjectId ?? null,
        isRead: false,
        createdAt: payload.createdAt,
      });
    });

    // Unread count update
    socket.on('notification:countUpdated', ({ count }) => {
      setUnreadCount(count);
    });

    socket.on('error', ({ message }) => {
      console.error('[Socket] Error:', message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      socketInstance = null;
      reset();
    };
  }, [isAuthenticated, accessToken, addActivity, addNotification, reset, setCatchupActivities, setConnected, setOnlinePresence, setUnreadCount]);

  return socketRef.current;
}

export function getSocket() {
  return socketInstance;
}
