import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHENTICATED', 'Authentication token required');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    sendError(res, 401, 'TOKEN_INVALID', 'Invalid or expired access token');
  }
}
