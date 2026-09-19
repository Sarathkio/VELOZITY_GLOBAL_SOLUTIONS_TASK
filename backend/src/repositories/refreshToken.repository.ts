import { prisma } from '../config/database.js';
import { RefreshToken } from '@prisma/client';

export const refreshTokenRepository = {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  /**
   * Find all active (non-revoked, non-expired) tokens for a user
   * and compare them against the provided raw token using bcrypt.
   * Returns the matching token record if found.
   */
  async findActiveTokensForUser(userId: string): Promise<RefreshToken[]> {
    return prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async revokeById(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async deleteExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
  },
};
