import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response.js';

/**
 * Role-based access control middleware factory.
 * Authorization is checked server-side — never rely on frontend role hiding.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        403,
        'FORBIDDEN',
        'You do not have permission to access this resource',
      );
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN);
export const requireAdminOrPM = requireRole(Role.ADMIN, Role.PROJECT_MANAGER);
export const requireAnyRole = requireRole(Role.ADMIN, Role.PROJECT_MANAGER, Role.DEVELOPER);
