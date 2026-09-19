import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { processOverdueTasks } from '../src/jobs/overdueTask.job.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

let pmId: string;
let devId: string;
let clientId: string;
let projectId: string;
let overdueTaskId: string;
let notYetOverdueTaskId: string;
let doneTaskId: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('TestPass123!', 10);
  const pm = await prisma.user.create({ data: { name: 'Job PM', email: 'job_pm@test.com', passwordHash: hash, role: Role.PROJECT_MANAGER } });
  const dev = await prisma.user.create({ data: { name: 'Job Dev', email: 'job_dev@test.com', passwordHash: hash, role: Role.DEVELOPER } });
  pmId = pm.id;
  devId = dev.id;

  const client = await prisma.client.create({ data: { name: 'Job Client' } });
  clientId = client.id;

  const project = await prisma.project.create({ data: { name: 'Job Project', clientId, createdById: pmId } });
  projectId = project.id;

  const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const overdueTask = await prisma.task.create({
    data: { projectId, title: 'Overdue Task', assignedDeveloperId: devId, priority: 'HIGH', status: 'IN_PROGRESS', dueDate: past, isOverdue: false },
  });
  overdueTaskId = overdueTask.id;

  const notYetOverdueTask = await prisma.task.create({
    data: { projectId, title: 'Future Task', assignedDeveloperId: devId, priority: 'MEDIUM', status: 'TODO', dueDate: future, isOverdue: false },
  });
  notYetOverdueTaskId = notYetOverdueTask.id;

  const doneTask = await prisma.task.create({
    data: { projectId, title: 'Done Overdue', priority: 'LOW', status: 'DONE', dueDate: past, isOverdue: false },
  });
  doneTaskId = doneTask.id;
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

describe('Overdue Job', () => {
  it('should flag overdue tasks and create activity records', async () => {
    const count = await processOverdueTasks();
    expect(count).toBeGreaterThanOrEqual(1);

    const overdueTask = await prisma.task.findUnique({ where: { id: overdueTaskId } });
    expect(overdueTask?.isOverdue).toBe(true);

    // Activity should be created
    const activity = await prisma.taskActivity.findFirst({
      where: { taskId: overdueTaskId, action: 'OVERDUE_FLAGGED' },
    });
    expect(activity).toBeTruthy();

    // Developer should get notification
    const devNotif = await prisma.notification.findFirst({
      where: { recipientId: devId, type: 'TASK_OVERDUE', relatedTaskId: overdueTaskId },
    });
    expect(devNotif).toBeTruthy();
  });

  it('should NOT flag tasks that are not yet overdue', async () => {
    const task = await prisma.task.findUnique({ where: { id: notYetOverdueTaskId } });
    expect(task?.isOverdue).toBe(false);
  });

  it('should NOT flag DONE tasks even if past due date', async () => {
    const task = await prisma.task.findUnique({ where: { id: doneTaskId } });
    expect(task?.isOverdue).toBe(false);
  });

  it('should be idempotent — running again does not double-create activity', async () => {
    const activityBefore = await prisma.taskActivity.count({ where: { taskId: overdueTaskId, action: 'OVERDUE_FLAGGED' } });

    // Run again
    await processOverdueTasks();

    const activityAfter = await prisma.taskActivity.count({ where: { taskId: overdueTaskId, action: 'OVERDUE_FLAGGED' } });
    expect(activityAfter).toBe(activityBefore); // No new records created
  });
});
