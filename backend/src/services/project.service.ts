import { prisma } from '../config/database.js';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthPayload } from '../types/index.js';

export const projectService = {
  /**
   * Get projects filtered by authorization scope.
   * Admin: all projects. PM: only their own. Developer: projects where they have tasks assigned.
   */
  async getAll(user: AuthPayload) {
    if (user.role === Role.ADMIN) {
      return prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    if (user.role === Role.PROJECT_MANAGER) {
      return prisma.project.findMany({
        where: { createdById: user.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      });
    }

    // Developer: only projects where at least one task is assigned to them
    return prisma.project.findMany({
      where: {
        tasks: { some: { assignedDeveloperId: user.userId } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: {
          select: {
            tasks: { where: { assignedDeveloperId: user.userId } },
          },
        },
      },
    });
  },

  /**
   * Get a single project, enforcing ownership/access rules.
   */
  async getById(id: string, user: AuthPayload) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          include: {
            assignedDeveloper: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    // Role-based access check at service layer
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
    }

    if (user.role === Role.DEVELOPER) {
      const hasAssignedTask = project.tasks.some(t => t.assignedDeveloperId === user.userId);
      if (!hasAssignedTask) {
        throw new AppError(404, 'NOT_FOUND', 'Project not found'); // 404 to prevent enumeration
      }
      // Filter tasks to only show assigned ones for developer
      project.tasks = project.tasks.filter(t => t.assignedDeveloperId === user.userId);
    }

    return project;
  },

  async create(
    data: { name: string; description?: string; clientId: string },
    user: AuthPayload,
  ) {
    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');

    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        createdById: user.userId, // authoritative ownership
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async update(
    id: string,
    data: Partial<{ name: string; description: string; clientId: string }>,
    user: AuthPayload,
  ) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    // PM can only update their own projects
    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own projects');
    }

    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    }

    return prisma.project.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async delete(id: string, user: AuthPayload) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only delete your own projects');
    }

    await prisma.project.delete({ where: { id } });
  },

  /**
   * Verify that a user has access to a project (used by task service).
   * Returns the project or throws.
   */
  async assertAccess(projectId: string, user: AuthPayload) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
    }

    return project;
  },

  async getDashboardMetrics(user: AuthPayload) {
    if (user.role === Role.ADMIN) {
      const [totalProjects, totalTasks, tasksByStatus, overdueCount] = await Promise.all([
        prisma.project.count(),
        prisma.task.count(),
        prisma.task.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.task.count({ where: { isOverdue: true, status: { not: 'DONE' } } }),
      ]);
      return { totalProjects, totalTasks, tasksByStatus, overdueCount };
    }

    if (user.role === Role.PROJECT_MANAGER) {
      const [totalProjects, totalTasks, tasksByStatus, tasksByPriority, overdueCount, upcomingTasks] = await Promise.all([
        prisma.project.count({ where: { createdById: user.userId } }),
        prisma.task.count({ where: { project: { createdById: user.userId } } }),
        prisma.task.groupBy({
          by: ['status'],
          where: { project: { createdById: user.userId } },
          _count: { id: true },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          where: { project: { createdById: user.userId } },
          _count: { id: true },
        }),
        prisma.task.count({ where: { project: { createdById: user.userId }, isOverdue: true, status: { not: 'DONE' } } }),
        prisma.task.findMany({
          where: {
            project: { createdById: user.userId },
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            status: { not: 'DONE' },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
          include: {
            project: { select: { id: true, name: true } },
            assignedDeveloper: { select: { id: true, name: true } },
          },
        }),
      ]);
      return { totalProjects, totalTasks, tasksByStatus, tasksByPriority, overdueCount, upcomingTasks };
    }

    // Developer dashboard
    const [assignedTasks, tasksByStatus, overdueCount] = await Promise.all([
      prisma.task.findMany({
        where: { assignedDeveloperId: user.userId, status: { not: 'DONE' } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { assignedDeveloperId: user.userId },
        _count: { id: true },
      }),
      prisma.task.count({ where: { assignedDeveloperId: user.userId, isOverdue: true, status: { not: 'DONE' } } }),
    ]);
    return { assignedTasks, tasksByStatus, overdueCount };
  },
};
