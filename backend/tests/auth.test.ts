import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const app = createApp();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

let testUserId: string;
let adminUserId: string;

beforeAll(async () => {
  // Create test users
  const hash = await bcrypt.hash('TestPass123!', 10);

  const admin = await prisma.user.create({
    data: { name: 'Test Admin', email: 'testadmin@test.com', passwordHash: hash, role: Role.ADMIN },
  });
  adminUserId = admin.id;

  const user = await prisma.user.create({
    data: { name: 'Test User', email: 'testuser@test.com', passwordHash: hash, role: Role.DEVELOPER },
  });
  testUserId = user.id;
});

afterAll(async () => {
  const ids = [testUserId, adminUserId].filter(Boolean);
  if (ids.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});

describe('Auth — POST /auth/login', () => {
  it('should login with valid credentials and return accessToken + set HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@test.com', password: 'TestPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');

    // Refresh token must be in HttpOnly cookie, NOT in body
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find(c => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeTruthy();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/auth');

    // Ensure refresh token is NOT in the response body
    expect(JSON.stringify(res.body)).not.toContain('refresh_token');
    expect(JSON.stringify(res.body)).not.toContain('refreshToken');
  });

  it('should reject invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject invalid email format with 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Auth — POST /auth/refresh', () => {
  it('should issue new access token using HttpOnly refresh cookie', async () => {
    // Login first
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@test.com', password: 'TestPass123!' });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'] as string[];

    // Wait 1s for JWT iat (second-granularity) to increment
    await new Promise(r => setTimeout(r, 1050));

    // Refresh using cookie
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.accessToken).not.toBe(loginRes.body.data.accessToken);

    // New cookie should be set (rotation)
    const newCookies = refreshRes.headers['set-cookie'] as string[];
    expect(newCookies).toBeDefined();
  });

  it('should reject refresh without cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });
});

describe('Auth — POST /auth/logout', () => {
  it('should logout and clear HttpOnly cookie', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@test.com', password: 'TestPass123!' });

    const cookies = loginRes.headers['set-cookie'] as string[];

    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);
    const logoutCookies = logoutRes.headers['set-cookie'] as string[];
    // Cookie should be cleared (Max-Age=0 or expires in past)
    const clearedCookie = logoutCookies?.find(c => c.startsWith('refresh_token='));
    expect(clearedCookie).toBeTruthy();
    expect(clearedCookie).toMatch(/Max-Age=0|Expires=.*1970/i);
  });
});

describe('Auth — GET /auth/me', () => {
  it('should return current user with valid access token', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'testadmin@test.com', password: 'TestPass123!' });

    const { accessToken } = loginRes.body.data;

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('testadmin@test.com');
    expect(meRes.body.data.role).toBe('ADMIN');
    expect(meRes.body.data).not.toHaveProperty('passwordHash');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
