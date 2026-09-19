import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Centralized error handler — must be registered last in Express middleware chain.
 * Never exposes stack traces, database errors, or internal paths to clients.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Prisma known errors (constraint violations, not found, etc.)
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as { code?: string; meta?: { cause?: string } };
    if (prismaErr.code === 'P2002') {
      sendError(res, 409, 'CONFLICT', 'A record with this value already exists');
      return;
    }
    if (prismaErr.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'Record not found');
      return;
    }
    // Other Prisma errors — log but don't expose details
    console.error('[Prisma Error]', { code: prismaErr.code, meta: prismaErr.meta });
    sendError(res, 500, 'DATABASE_ERROR', 'A database error occurred');
    return;
  }

  // Unknown errors — log but never expose internals
  console.error('[Unhandled Error]', err.message);
  sendError(res, 500, 'INTERNAL_ERROR', 'An internal server error occurred');
}
