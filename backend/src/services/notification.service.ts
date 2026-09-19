import { prisma } from '../config/database.js';
import { NotificationType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export const notificationService = {
  /**
   * Create a notification and return it.
   * Called within task service transactions.
   */
  async create(data: {
    recipientId: string;
    type: NotificationType;
    message: string;
    relatedTaskId?: string;
    relatedProjectId?: string;
  }) {
    return prisma.notification.create({ data });
  },

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          relatedTask: { select: { id: true, title: true } },
          relatedProject: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
    ]);
    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  },

  async markAsRead(notificationId: string, userId: string) {
    // Verify ownership — user can only mark their own notifications
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'You cannot modify another user\'s notification');
    }

    if (notification.isRead) return notification; // Already read

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: true };
  },
};
