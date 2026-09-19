import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Role, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../src/utils/jwt.js';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

let pmId: string;
let devId: string;
let clientId: string;
let projectId: string;
let taskId: string;
let pmToken: string;
let devToken: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('TestPass123!', 10);
  const pm = await prisma.user.create({ data: { name: 'Task PM', email: 'task_pm@test.com', passwordHash: hash, role: Role.PROJECT_MANAGER } });
  const dev = await prisma.user.create({ data: { name: 'Task Dev', email: 'task_dev@test.com', passwordHash: hash, role: Role.DEVELOPER } });
  pmId = pm.id;
  devId = dev.id;

  const client = await prisma.client.create({ data: { name: 'Task Client' } });
  clientId = client.id;

  const project = await prisma.project.create({ data: { name: 'Task Project', clientId, createdById: pmId } });
  projectId = project.id;

  const task = await prisma.task.create({
    data: { projectId, title: 'Initial Task', assignedDeveloperId: devId, priority: 'MEDIUM', status: TaskStatus.TODO },
  });
  taskId = task.id;

  pmToken = signAccessToken({ userId: pmId, role: Role.PROJECT_MANAGER, email: pm.email });
  devToken = signAccessToken({ userId: devId, role: Role.DEVELOPER, email: dev.email });
});

afterAll(async () => {
  const uIds = [pmId, devId].filter(Boolean);
  if (projectId) {
    await prisma.notification.deleteMany({ where: { relatedProjectId: projectId } });
    await prisma.taskActivity.deleteMany({ where: { projectId } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
  }
  if (clientId) {
    await prisma.client.deleteMany({ where: { id: clientId } });
  }
  if (uIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: uIds } } });
  }
  await prisma.$disconnect();
});

describe('Task — Status Change creates Activity', () => {
  it('should create activity record when developer updates status', async () => {
    const before = await prisma.taskActivity.count({ where: { taskId } });

    const res = await request(app)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');

    const after = await prisma.taskActivity.count({ where: { taskId } });
    expect(after).toBe(before + 1);

    const activity = await prisma.taskActivity.findFirst({
      where: { taskId, action: 'STATUS_CHANGED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();
    expect(activity?.oldStatus).toBe('TODO');
    expect(activity?.newStatus).toBe('IN_PROGRESS');
    expect(activity?.userId).toBe(devId);
  });

  it('should create IN_REVIEW notification for PM when dev moves task to IN_REVIEW', async () => {
    const beforeNotif = await prisma.notification.count({ where: { recipientId: pmId, type: 'TASK_IN_REVIEW' } });

    const res = await request(app)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ status: 'IN_REVIEW' });

    expect(res.status).toBe(200);

    const afterNotif = await prisma.notification.count({ where: { recipientId: pmId, type: 'TASK_IN_REVIEW' } });
    expect(afterNotif).toBe(beforeNotif + 1);

    const notif = await prisma.notification.findFirst({
      where: { recipientId: pmId, type: 'TASK_IN_REVIEW', relatedTaskId: taskId },
      orderBy: { createdAt: 'desc' },
    });
    expect(notif?.message).toContain('In Review');
  });
});

describe('Task — Task Filters', () => {
  it('should filter by status', async () => {
    const res = await request(app)
      .get('/tasks?status=IN_REVIEW')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(200);
    const tasks = res.body.data as Array<{ status: string }>;
    for (const task of tasks) {
      expect(task.status).toBe('IN_REVIEW');
    }
  });

  it('should filter by priority', async () => {
    const res = await request(app)
      .get('/tasks?priority=MEDIUM')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(200);
    const tasks = res.body.data as Array<{ priority: string }>;
    for (const task of tasks) {
      expect(task.priority).toBe('MEDIUM');
    }
  });
});

describe('Task — Assignment creates Notification', () => {
  it('PM assigning developer creates TASK_ASSIGNED notification', async () => {
    const beforeNotif = await prisma.notification.count({ where: { recipientId: devId, type: 'TASK_ASSIGNED' } });

    // Create new task with assignment
    const res = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Newly Assigned Task',
        priority: 'HIGH',
        assignedDeveloperId: devId,
      });

    expect(res.status).toBe(201);

    const afterNotif = await prisma.notification.count({ where: { recipientId: devId, type: 'TASK_ASSIGNED' } });
    expect(afterNotif).toBe(beforeNotif + 1);
  });
});
