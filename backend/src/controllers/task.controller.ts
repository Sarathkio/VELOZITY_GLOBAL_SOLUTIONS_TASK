import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';
import { sendSuccess } from '../utils/response.js';
import { TaskFilters } from '../types/index.js';

export const taskController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as Record<string, unknown>;
      const filters: TaskFilters = {
        status: query['status'] as TaskFilters['status'],
        priority: query['priority'] as TaskFilters['priority'],
        dueFrom: query['dueFrom'] as Date | undefined,
        dueTo: query['dueTo'] as Date | undefined,
        projectId: query['projectId'] as string | undefined,
        isOverdue: query['isOverdue'] as boolean | undefined,
      };
      const page = Number(query['page']) || 1;
      const limit = Number(query['limit']) || 20;
      const result = await taskService.getAll(req.user!, filters, page, limit);
      sendSuccess(res, result.tasks, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await taskService.getById(req.params['id'] as string, req.user!));
    } catch (err) {
      next(err);
    }
  },

  async createForProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const task = await taskService.create(projectId, req.body, req.user!);
      sendSuccess(res, task, 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await taskService.update(req.params['id'] as string, req.body, req.user!));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await taskService.delete(req.params['id'] as string, req.user!);
      sendSuccess(res, { message: 'Task deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
