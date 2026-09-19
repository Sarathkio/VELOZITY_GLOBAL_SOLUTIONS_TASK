import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/project.service.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export const projectController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await projectService.getAll(req.user!));
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await projectService.getById(req.params['id'] as string, req.user!));
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await projectService.create(req.body, req.user!), 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await projectService.update(req.params['id'] as string, req.body, req.user!));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.delete(req.params['id'] as string, req.user!);
      sendSuccess(res, { message: 'Project deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['id'] as string;
      const user = req.user!;

      // Verify access first
      if (user.role === Role.DEVELOPER) {
        throw new AppError(403, 'FORBIDDEN', 'Developers cannot view project activity directly');
      }

      if (user.role === Role.PROJECT_MANAGER) {
        await projectService.assertAccess(projectId, user);
      }

      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;
      const activities = await activityRepository.findForProject(projectId, limit, offset);
      sendSuccess(res, activities);
    } catch (err) {
      next(err);
    }
  },

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await projectService.getDashboardMetrics(req.user!));
    } catch (err) {
      next(err);
    }
  },
};
