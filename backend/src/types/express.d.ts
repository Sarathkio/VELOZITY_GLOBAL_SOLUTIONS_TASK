import { Request } from 'express';
import { AuthPayload } from '../types/index.js';

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};
