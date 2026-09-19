import { ApiError, ApiSuccess } from '../types/index.js';
import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): void {
  const response: ApiSuccess<T> = { success: true, data };
  if (meta) response.meta = meta;
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const response: ApiError = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  res.status(statusCode).json(response);
}
