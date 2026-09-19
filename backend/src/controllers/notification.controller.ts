import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/response.js';

export const notificationController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await notificationService.getForUser(req.user!.userId, page, limit);
      sendSuccess(res, result.notifications, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);
      sendSuccess(res, { count });
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await notificationService.markAsRead(req.params['id'] as string, req.user!.userId);
      sendSuccess(res, notification);
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await notificationService.markAllAsRead(req.user!.userId));
    } catch (err) {
      next(err);
    }
  },
};
