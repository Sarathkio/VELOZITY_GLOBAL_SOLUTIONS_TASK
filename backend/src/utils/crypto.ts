import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a refresh token for secure database storage.
 * We use 10 rounds (not 12) for refresh tokens since they are random UUIDs,
 * not user-chosen passwords, so we only need collision resistance.
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
