import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { verifyPassword, hashRefreshToken, verifyRefreshTokenHash } from '../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthPayload } from '../types/index.js';

export const authService = {
  async login(email: string, password: string): Promise<{
    accessToken: string;
    rawRefreshToken: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Constant-time rejection to prevent user enumeration
      await bcryptTimingGuard();
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const accessPayload: AuthPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    const accessToken = signAccessToken(accessPayload);
    const rawRefreshToken = signRefreshToken({ userId: user.id });
    const tokenHash = await hashRefreshToken(rawRefreshToken);

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken,
      rawRefreshToken, // Only used to set HttpOnly cookie — never stored in DB
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },

  async refresh(rawRefreshToken: string): Promise<{
    accessToken: string;
    rawRefreshToken: string;
  }> {
    // Verify the JWT structure/expiry first
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError(401, 'TOKEN_INVALID', 'Invalid or expired refresh token');
    }

    // Find all active tokens for this user and verify against hash
    const activeTokens = await refreshTokenRepository.findActiveTokensForUser(payload.userId);

    let matchedToken: (typeof activeTokens)[0] | null = null;
    for (const token of activeTokens) {
      const matches = await verifyRefreshTokenHash(rawRefreshToken, token.tokenHash);
      if (matches) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      // Token not found or already revoked — invalidate all tokens for this user (reuse attack)
      await refreshTokenRepository.revokeAllForUser(payload.userId);
      throw new AppError(401, 'TOKEN_REVOKED', 'Refresh token is invalid or has been revoked');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'User not found');
    }

    // Rotate: revoke old token, issue new pair
    await refreshTokenRepository.revokeById(matchedToken.id);

    const accessPayload: AuthPayload = {
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    const newAccessToken = signAccessToken(accessPayload);
    const newRawRefreshToken = signRefreshToken({ userId: user.id });
    const newTokenHash = await hashRefreshToken(newRawRefreshToken);

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken: newAccessToken,
      rawRefreshToken: newRawRefreshToken,
    };
  },

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      const activeTokens = await refreshTokenRepository.findActiveTokensForUser(payload.userId);

      for (const token of activeTokens) {
        const matches = await verifyRefreshTokenHash(rawRefreshToken, token.tokenHash);
        if (matches) {
          await refreshTokenRepository.revokeById(token.id);
          return;
        }
      }
    } catch {
      // If token is invalid/expired, just clear the cookie — logout should not fail
    }
  },

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  },
};

/**
 * Prevents timing attacks during user not found case by burning time equal
 * to a bcrypt comparison. This prevents email enumeration via timing.
 */
async function bcryptTimingGuard(): Promise<void> {
  await verifyPassword('__timing_guard__', '$2b$12$invalidhashfortimingprotection00000');
}
