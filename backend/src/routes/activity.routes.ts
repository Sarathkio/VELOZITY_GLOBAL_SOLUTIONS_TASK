import { Router, Request, Response, NextFunction } from 'express';
import { activityRepository } from '../repositories/activity.repository.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAnyRole } from '../middleware/authorize.js';
import { sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authenticate, requireAnyRole);

/**
 * GET /activity
 * Returns role-filtered activity feed from PostgreSQL.
 * Admin: global. PM: own projects. Developer: assigned tasks.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    let activities;
    if (user.role === Role.ADMIN) {
      activities = await activityRepository.findGlobal(limit);
    } else if (user.role === Role.PROJECT_MANAGER) {
      activities = await activityRepository.findForPM(user.userId, limit);
    } else if (user.role === Role.DEVELOPER) {
      activities = await activityRepository.findForDeveloper(user.userId, limit);
    } else {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    sendSuccess(res, activities);
  } catch (err) {
    next(err);
  }
});

export default router;
