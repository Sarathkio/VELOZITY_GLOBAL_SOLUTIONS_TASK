import { Request, Response, NextFunction } from 'express';
import { clientService } from '../services/client.service.js';
import { sendSuccess } from '../utils/response.js';

export const clientController = {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await clientService.getAll());
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await clientService.getById(req.params['id'] as string));
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await clientService.create(req.body), 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await clientService.update(req.params['id'] as string, req.body));
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await clientService.delete(req.params['id'] as string);
      sendSuccess(res, { message: 'Client deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
