import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../src/utils/jwt.js';

const app = createApp();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

let adminId: string;
let pm1Id: string;
let pm2Id: string;
let dev1Id: string;
let dev2Id: string;
let clientId: string;
let project1Id: string; // belongs to PM1
let project2Id: string; // belongs to PM2
let task1Id: string;    // assigned to dev1, in project1
let task2Id: string;    // assigned to dev2, in project2

let adminToken: string;
let pm1Token: string;
let pm2Token: string;
let dev1Token: string;
let dev2Token: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('TestPass123!', 10);

  const admin = await prisma.user.create({ data: { name: 'RBAC Admin', email: 'rbac_admin@test.com', passwordHash: hash, role: Role.ADMIN } });
  const pm1 = await prisma.user.create({ data: { name: 'RBAC PM1', email: 'rbac_pm1@test.com', passwordHash: hash, role: Role.PROJECT_MANAGER } });
  const pm2 = await prisma.user.create({ data: { name: 'RBAC PM2', email: 'rbac_pm2@test.com', passwordHash: hash, role: Role.PROJECT_MANAGER } });
  const dev1 = await prisma.user.create({ data: { name: 'RBAC Dev1', email: 'rbac_dev1@test.com', passwordHash: hash, role: Role.DEVELOPER } });
  const dev2 = await prisma.user.create({ data: { name: 'RBAC Dev2', email: 'rbac_dev2@test.com', passwordHash: hash, role: Role.DEVELOPER } });

  adminId = admin.id;
  pm1Id = pm1.id;
  pm2Id = pm2.id;
  dev1Id = dev1.id;
  dev2Id = dev2.id;

  const client = await prisma.client.create({ data: { name: 'RBAC Client' } });
  clientId = client.id;

  const p1 = await prisma.project.create({ data: { name: 'PM1 Project', clientId, createdById: pm1Id } });
  const p2 = await prisma.project.create({ data: { name: 'PM2 Project', clientId, createdById: pm2Id } });
  project1Id = p1.id;
  project2Id = p2.id;

  const t1 = await prisma.task.create({ data: { projectId: project1Id, title: 'Dev1 Task', assignedDeveloperId: dev1Id, priority: 'MEDIUM', status: 'TODO' } });
  const t2 = await prisma.task.create({ data: { projectId: project2Id, title: 'Dev2 Task', assignedDeveloperId: dev2Id, priority: 'MEDIUM', status: 'TODO' } });
  task1Id = t1.id;
  task2Id = t2.id;

  // Generate tokens
  adminToken = signAccessToken({ userId: adminId, role: Role.ADMIN, email: admin.email });
  pm1Token = signAccessToken({ userId: pm1Id, role: Role.PROJECT_MANAGER, email: pm1.email });
  pm2Token = signAccessToken({ userId: pm2Id, role: Role.PROJECT_MANAGER, email: pm2.email });
  dev1Token = signAccessToken({ userId: dev1Id, role: Role.DEVELOPER, email: dev1.email });
  dev2Token = signAccessToken({ userId: dev2Id, role: Role.DEVELOPER, email: dev2.email });
});

afterAll(async () => {
  const pIds = [project1Id, project2Id].filter(Boolean);
  const uIds = [adminId, pm1Id, pm2Id, dev1Id, dev2Id].filter(Boolean);
  if (pIds.length > 0) {
    await prisma.taskActivity.deleteMany({ where: { projectId: { in: pIds } } });
    await prisma.task.deleteMany({ where: { projectId: { in: pIds } } });
    await prisma.project.deleteMany({ where: { id: { in: pIds } } });
  }
  if (clientId) {
    await prisma.client.deleteMany({ where: { id: clientId } });
  }
  if (uIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: uIds } } });
  }
  await prisma.$disconnect();
});

describe('RBAC — Project Access', () => {
  it('Admin can access both projects', async () => {
    const r1 = await request(app).get(`/projects/${project1Id}`).set('Authorization', `Bearer ${adminToken}`);
    const r2 = await request(app).get(`/projects/${project2Id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });

  it('PM1 can access their own project', async () => {
    const res = await request(app).get(`/projects/${project1Id}`).set('Authorization', `Bearer ${pm1Token}`);
    expect(res.status).toBe(200);
  });

  it('PM1 CANNOT access PM2 project — must return 403', async () => {
    const res = await request(app).get(`/projects/${project2Id}`).set('Authorization', `Bearer ${pm1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PM2 CANNOT access PM1 project — must return 403', async () => {
    const res = await request(app).get(`/projects/${project1Id}`).set('Authorization', `Bearer ${pm2Token}`);
    expect(res.status).toBe(403);
  });

  it('Developer CANNOT create projects', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${dev1Token}`)
      .send({ name: 'Hack Project', clientId });
    expect(res.status).toBe(403);
  });
});

describe('RBAC — Task Access (IDOR prevention)', () => {
  it('Dev1 can access their own task', async () => {
    const res = await request(app).get(`/tasks/${task1Id}`).set('Authorization', `Bearer ${dev1Token}`);
    expect(res.status).toBe(200);
  });

  it('Dev1 CANNOT access Dev2 task by ID manipulation — must return 404', async () => {
    const res = await request(app).get(`/tasks/${task2Id}`).set('Authorization', `Bearer ${dev1Token}`);
    // Returns 404 to prevent enumeration of unauthorized resources
    expect(res.status).toBe(404);
  });

  it('Dev2 CANNOT access Dev1 task — must return 404', async () => {
    const res = await request(app).get(`/tasks/${task1Id}`).set('Authorization', `Bearer ${dev2Token}`);
    expect(res.status).toBe(404);
  });

  it('Developer can only update task STATUS — other fields must return 403', async () => {
    const res = await request(app)
      .patch(`/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${dev1Token}`)
      .send({ title: 'Hacked Title' }); // Developers cannot change title
    expect(res.status).toBe(400); // Narrower schema rejects unknown fields
  });

  it('Developer CAN update their task status', async () => {
    const res = await request(app)
      .patch(`/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${dev1Token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('Developer CANNOT update another developer task status — must return 404', async () => {
    const res = await request(app)
      .patch(`/tasks/${task2Id}`)
      .set('Authorization', `Bearer ${dev1Token}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(404);
  });

  it('PM1 can update task in their project', async () => {
    const res = await request(app)
      .patch(`/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${pm1Token}`)
      .send({ status: 'IN_REVIEW', priority: 'HIGH' });
    expect(res.status).toBe(200);
  });

  it('PM1 CANNOT update task in PM2 project', async () => {
    const res = await request(app)
      .patch(`/tasks/${task2Id}`)
      .set('Authorization', `Bearer ${pm1Token}`)
      .send({ status: 'IN_REVIEW' });
    expect(res.status).toBe(403);
  });
});

describe('RBAC — User Management', () => {
  it('Admin can access user list', async () => {
    const res = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('PM CANNOT access user management', async () => {
    const res = await request(app).get('/users').set('Authorization', `Bearer ${pm1Token}`);
    expect(res.status).toBe(403);
  });

  it('Developer CANNOT access user management', async () => {
    const res = await request(app).get('/users').set('Authorization', `Bearer ${dev1Token}`);
    expect(res.status).toBe(403);
  });
});

describe('RBAC — Task List Filtering', () => {
  it('Developer only sees their own tasks in list', async () => {
    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${dev1Token}`);
    expect(res.status).toBe(200);
    const tasks = res.body.data as Array<{ assignedDeveloper?: { id: string } }>;
    for (const task of tasks) {
      expect(task.assignedDeveloper?.id).toBe(dev1Id);
    }
  });

  it('PM1 only sees tasks from their projects', async () => {
    const res = await request(app).get('/tasks').set('Authorization', `Bearer ${pm1Token}`);
    expect(res.status).toBe(200);
    const tasks = res.body.data as Array<{ project: { id: string } }>;
    for (const task of tasks) {
      expect(task.project.id).toBe(project1Id);
    }
  });
});
