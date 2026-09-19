import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthPayload } from '../types/index.js';

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS}d` as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
}

export function getRefreshTokenExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + env.JWT_REFRESH_EXPIRES_DAYS);
  return date;
}
