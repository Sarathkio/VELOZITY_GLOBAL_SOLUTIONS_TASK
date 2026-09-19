import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { activityRepository } from '../repositories/activity.repository.js';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  NotificationCreatedPayload,
  TaskStatusChangedPayload,
} from '../types/index.js';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// ─── Presence Tracking ────────────────────────────────────────────────────────
// Map userId → Set of socketIds (handles multiple tabs/connections)
const presenceMap = new Map<string, Set<string>>();

// ─── Socket Server Singleton ──────────────────────────────────────────────────
let _io: AppServer | null = null;

const noOpSocketServer = {
  emitToProject: (_projectId: string, _event: string, _payload: TaskStatusChangedPayload) => { /* no-op in test/build */ },
  emitNotificationToUser: (_userId: string, _payload: NotificationCreatedPayload) => { /* no-op */ },
  emitPresenceUpdate: () => { /* no-op */ },
  getOnlineCount: () => 0,
  getOnlineUsers: (): Array<{ userId: string; name: string }> => [],
};

export function getSocketServer(): {
  emitToProject: (projectId: string, event: string, payload: TaskStatusChangedPayload) => void;
  emitNotificationToUser: (userId: string, payload: NotificationCreatedPayload) => void;
  emitPresenceUpdate: () => void;
  getOnlineCount: () => number;
  getOnlineUsers: () => Array<{ userId: string; name: string }>;
} {
  if (!_io) {
    // Return no-op in test environment or when socket not yet initialized
    return noOpSocketServer;
  }

  return {
    emitToProject(projectId, event, payload) {
      _io!.to(`project:${projectId}`).emit(event as 'task:statusChanged', payload);
      _io!.to('admin:global').emit(event as 'task:statusChanged', payload);
    },

    emitNotificationToUser(userId, payload) {
      _io!.to(`user:${userId}`).emit('notification:created', payload);
      // Also update unread count
      prisma.notification
        .count({ where: { recipientId: userId, isRead: false } })
        .then(count => {
          _io!.to(`user:${userId}`).emit('notification:countUpdated', { count });
        })
        .catch(err => console.error('[Socket] Failed to get unread count:', err));
    },

    emitPresenceUpdate() {
      const onlineUsers = getOnlineUsersList();
      _io!.emit('presence:updated', {
        onlineCount: presenceMap.size,
        onlineUsers,
      });
    },

    getOnlineCount() {
      return presenceMap.size;
    },

    getOnlineUsers() {
      return getOnlineUsersList();
    },
  };
}

// ─── Socket Server Initialization ─────────────────────────────────────────────

export function initSocketServer(httpServer: HttpServer): AppServer {
  const io: AppServer = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  _io = io;

  // ─── Authentication Middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth['token'] ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);

      // Fetch user to get name and verify existence
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, role: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach authenticated user data to socket — derived from DB, not client
      socket.data.userId = user.id;
      socket.data.role = user.role;
      socket.data.email = user.email;
      socket.data.name = user.name;

      cacheUserName(user.id, user.name);

      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', async (socket: AppSocket) => {
    const { userId, role, name } = socket.data;
    cacheUserName(userId, name);

    // ── Join user-specific room for notifications ──
    await socket.join(`user:${userId}`);

    // ── Join role-appropriate rooms ────────────────
    if (role === Role.ADMIN) {
      await socket.join('admin:global');
    } else if (role === Role.PROJECT_MANAGER) {
      // Join all rooms for projects this PM owns
      const projects = await prisma.project.findMany({
        where: { createdById: userId },
        select: { id: true },
      });
      for (const project of projects) {
        await socket.join(`project:${project.id}`);
      }
    } else if (role === Role.DEVELOPER) {
      // Developer gets their own personal room — events are forwarded to them specifically
      await socket.join(`developer:${userId}`);
    }

    // ── Presence: track connection ─────────────────
    if (!presenceMap.has(userId)) {
      presenceMap.set(userId, new Set());
    }
    presenceMap.get(userId)!.add(socket.id);

    // Broadcast presence update
    broadcastPresence(io);

    // ── Missed event catch-up ─────────────────────
    // Query DB for last 20 authorized events and send to this socket
    try {
      let activities: TaskStatusChangedPayload[];

      if (role === Role.ADMIN) {
        activities = await activityRepository.findGlobal(20);
      } else if (role === Role.PROJECT_MANAGER) {
        activities = await activityRepository.findForPM(userId, 20);
      } else {
        activities = await activityRepository.findForDeveloper(userId, 20);
      }

      socket.emit('activity:catchup', { activities });
    } catch (err) {
      console.error('[Socket] Catch-up query failed:', err);
    }

    // ── Presence ping handler ──────────────────────
    socket.on('presence:ping', () => {
      // Client can ping to confirm presence; handled passively via socket state
    });

    // ── Disconnect handler ─────────────────────────
    socket.on('disconnect', () => {
      const sockets = presenceMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          presenceMap.delete(userId); // All connections closed
        }
      }
      broadcastPresence(io);
    });
  });

  return io;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcastPresence(io: AppServer): void {
  const onlineUsers = getOnlineUsersList();
  io.emit('presence:updated', {
    onlineCount: presenceMap.size,
    onlineUsers,
  });
}

// Cache user names for presence — populated during auth
const userNameCache = new Map<string, string>();

function getOnlineUsersList(): Array<{ userId: string; name: string }> {
  const users: Array<{ userId: string; name: string }> = [];
  for (const userId of presenceMap.keys()) {
    users.push({
      userId,
      name: userNameCache.get(userId) ?? 'Unknown',
    });
  }
  return users;
}

// Called during socket auth to populate name cache
export function cacheUserName(userId: string, name: string): void {
  userNameCache.set(userId, name);
}

/**
 * Emit an event to a specific developer's socket room.
 * Used by task service to deliver developer-scoped activity events.
 */
export function emitToDeveloper(
  io: AppServer,
  developerId: string,
  event: 'task:statusChanged',
  payload: TaskStatusChangedPayload,
): void {
  io.to(`developer:${developerId}`).emit(event, payload);
}
