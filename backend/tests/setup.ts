import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

// Use a test database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://velozity_user:velozity_pass@localhost:5432/velozity_test_db';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long_ok';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long_ok';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_DAYS = '7';
process.env.FRONTEND_URL = 'http://localhost:5173';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'pipe',
    });
  } catch {
    // Migrations may already be applied or DB not yet created
  }
  try {
    await prisma.$connect();
  } catch {
    // DB offline during local test without postgres running
  }
});

afterAll(async () => {
  try {
    await prisma.notification.deleteMany();
    await prisma.taskActivity.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  } catch {
    // Ignore cleanup errors if DB disconnected
  }
});

export { prisma };
