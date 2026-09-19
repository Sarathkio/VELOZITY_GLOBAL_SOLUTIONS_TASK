import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env } from '../config/env.js';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: '/auth', // Scope cookie to /auth path only
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/auth',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}

export const authController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const { accessToken, rawRefreshToken, user } = await authService.login(email, password);

      setRefreshTokenCookie(res, rawRefreshToken);

      sendSuccess(res, { accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;

      if (!rawRefreshToken) {
        sendError(res, 401, 'TOKEN_MISSING', 'Refresh token not found');
        return;
      }

      const { accessToken, rawRefreshToken: newRawRefreshToken } =
        await authService.refresh(rawRefreshToken);

      setRefreshTokenCookie(res, newRawRefreshToken);

      sendSuccess(res, { accessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;

      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      clearRefreshTokenCookie(res);
      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },
};
