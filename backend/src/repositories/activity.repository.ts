import { prisma } from '../config/database.js';
import { TaskStatus } from '@prisma/client';
import { TaskStatusChangedPayload } from '../types/index.js';

export const activityRepository = {
  /**
   * Fetch last N activity records for admin (global scope).
   */
  async findGlobal(limit = 20): Promise<TaskStatusChangedPayload[]> {
    const records = await prisma.taskActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { title: true } },
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    });
    return records.map(mapActivityToPayload);
  },

  /**
   * Fetch last N activity records for a PM (only their projects).
   * Filters at query level — never returns unauthorized records.
   */
  async findForPM(pmUserId: string, limit = 20): Promise<TaskStatusChangedPayload[]> {
    const records = await prisma.taskActivity.findMany({
      where: {
        project: { createdById: pmUserId },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { title: true } },
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    });
    return records.map(mapActivityToPayload);
  },

  /**
   * Fetch last N activity records for a developer (only their assigned tasks).
   * Filters at query level — never returns unauthorized records.
   */
  async findForDeveloper(developerUserId: string, limit = 20): Promise<TaskStatusChangedPayload[]> {
    const records = await prisma.taskActivity.findMany({
      where: {
        task: { assignedDeveloperId: developerUserId },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { title: true } },
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    });
    return records.map(mapActivityToPayload);
  },

  /**
   * Fetch paginated activity for a specific project (authorized PM or Admin).
   */
  async findForProject(projectId: string, limit = 50, offset = 0): Promise<TaskStatusChangedPayload[]> {
    const records = await prisma.taskActivity.findMany({
      where: { projectId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        task: { select: { title: true } },
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    });
    return records.map(mapActivityToPayload);
  },
};

type ActivityWithRelations = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  oldStatus: TaskStatus | null;
  newStatus: TaskStatus | null;
  action: string;
  createdAt: Date;
  task: { title: string };
  user: { name: string };
  project: { name: string };
};

function mapActivityToPayload(record: ActivityWithRelations): TaskStatusChangedPayload {
  return {
    activityId: record.id,
    taskId: record.taskId,
    projectId: record.projectId,
    taskTitle: record.task.title,
    userId: record.userId,
    userName: record.user.name,
    oldStatus: record.oldStatus,
    newStatus: record.newStatus,
    action: record.action,
    timestamp: record.createdAt.toISOString(),
  };
}
