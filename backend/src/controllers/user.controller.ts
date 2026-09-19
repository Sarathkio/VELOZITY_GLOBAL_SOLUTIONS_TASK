import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export const userController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = await userService.getAll(role as any);
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.params['id'] as string);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create(req.body as { name: string; email: string; password: string; role: import('@prisma/client').Role });
      sendSuccess(res, user, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.params['id'] as string, req.body);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.delete(req.params['id'] as string, req.user!.userId);
      sendSuccess(res, { message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
