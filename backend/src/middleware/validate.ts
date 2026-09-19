import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates request input against a Zod schema.
 * Replaces the request's target with the parsed (coerced, transformed) data.
 */
export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = (result.error as ZodError).flatten().fieldErrors;
      sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
      return;
    }

    // Replace with parsed data (includes transforms, defaults, coercions)
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
