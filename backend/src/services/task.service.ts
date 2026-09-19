import { prisma } from '../config/database.js';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { AuthPayload, TaskFilters } from '../types/index.js';
import { getSocketServer } from '../websocket/socketServer.js';

export const taskService = {
  /**
   * Get tasks with role-based filtering enforced at query level.
   */
  async getAll(user: AuthPayload, filters: TaskFilters, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = buildWhereClause(user, filters);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          project: { select: { id: true, name: true } },
          assignedDeveloper: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string, user: AuthPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, createdById: true },
        },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    // Authorization
    if (user.role === Role.DEVELOPER && task.assignedDeveloperId !== user.userId) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found'); // 404 to prevent enumeration
    }

    if (user.role === Role.PROJECT_MANAGER && task.project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this task');
    }

    return task;
  },

  async create(
    projectId: string,
    data: {
      title: string;
      description?: string;
      assignedDeveloperId?: string | null;
      priority: Priority;
      dueDate?: Date;
    },
    user: AuthPayload,
  ) {
    // Verify project access
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found');

    if (user.role === Role.PROJECT_MANAGER && project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only create tasks in your own projects');
    }

    // Verify assignee is a developer if provided
    if (data.assignedDeveloperId) {
      const developer = await prisma.user.findUnique({ where: { id: data.assignedDeveloperId } });
      if (!developer || developer.role !== Role.DEVELOPER) {
        throw new AppError(400, 'INVALID_ASSIGNEE', 'Assigned user must be a Developer');
      }
    }

    // Create task + initial activity in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId,
          title: data.title,
          description: data.description,
          assignedDeveloperId: data.assignedDeveloperId ?? null,
          priority: data.priority,
          dueDate: data.dueDate,
          status: TaskStatus.TODO,
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedDeveloper: { select: { id: true, name: true, email: true } },
        },
      });

      // Activity log
      const activity = await tx.taskActivity.create({
        data: {
          taskId: task.id,
          projectId,
          userId: user.userId,
          action: 'CREATED',
          newStatus: TaskStatus.TODO,
          metadata: { taskTitle: data.title },
        },
        include: { user: { select: { name: true } } },
      });

      // Create assignment notification if assigned
      let notification = null;
      if (data.assignedDeveloperId) {
        notification = await tx.notification.create({
          data: {
            recipientId: data.assignedDeveloperId,
            type: 'TASK_ASSIGNED',
            message: `You were assigned task "${data.title}" in project "${task.project.name}"`,
            relatedTaskId: task.id,
            relatedProjectId: projectId,
          },
        });
      }

      return { task, activity, notification };
    });

    const io = getSocketServer();

    // Emit activity event after successful DB commit
    const activityPayload = {
      activityId: result.activity.id,
      taskId: result.task.id,
      projectId,
      taskTitle: result.task.title,
      userId: user.userId,
      userName: result.activity.user.name,
      oldStatus: null,
      newStatus: TaskStatus.TODO,
      action: 'CREATED',
      timestamp: result.activity.createdAt.toISOString(),
    };

    io.emitToProject(projectId, 'task:statusChanged', activityPayload);

    // Emit notification to developer
    if (result.notification && data.assignedDeveloperId) {
      io.emitNotificationToUser(data.assignedDeveloperId, {
        id: result.notification.id,
        type: result.notification.type,
        message: result.notification.message,
        relatedTaskId: result.notification.relatedTaskId ?? undefined,
        relatedProjectId: result.notification.relatedProjectId ?? undefined,
        createdAt: result.notification.createdAt.toISOString(),
      });
    }

    return result.task;
  },

  /**
   * Update task — RBAC-enforced with transactional activity logging.
   * Developers can only update status on assigned tasks.
   * PMs can update any field on their project tasks.
   */
  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      assignedDeveloperId: string | null;
      status: TaskStatus;
      priority: Priority;
      dueDate: Date | null;
    }>,
    user: AuthPayload,
  ) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedDeveloper: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    // Developer authorization
    if (user.role === Role.DEVELOPER) {
      if (task.assignedDeveloperId !== user.userId) {
        throw new AppError(404, 'NOT_FOUND', 'Task not found'); // 404 prevents enumeration
      }
      // Developers can only change status — reject any other fields
      const developerAllowedKeys = ['status'];
      const attemptedKeys = Object.keys(data);
      const disallowedKeys = attemptedKeys.filter(k => !developerAllowedKeys.includes(k));
      if (disallowedKeys.length > 0) {
        throw new AppError(403, 'FORBIDDEN', 'Developers can only update task status');
      }
    }

    // PM authorization
    if (user.role === Role.PROJECT_MANAGER && task.project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update tasks in your own projects');
    }

    const oldStatus = task.status;
    const newStatus = data.status ?? oldStatus;
    const statusChanged = data.status !== undefined && data.status !== oldStatus;

    // Verify new assignee is a developer if changing assignment
    if (data.assignedDeveloperId !== undefined && data.assignedDeveloperId !== null) {
      const developer = await prisma.user.findUnique({ where: { id: data.assignedDeveloperId } });
      if (!developer || developer.role !== Role.DEVELOPER) {
        throw new AppError(400, 'INVALID_ASSIGNEE', 'Assigned user must be a Developer');
      }
    }

    const assigneeChanged =
      data.assignedDeveloperId !== undefined &&
      data.assignedDeveloperId !== task.assignedDeveloperId;

    // Transactional update
    const result = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.assignedDeveloperId !== undefined ? { assignedDeveloperId: data.assignedDeveloperId } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.priority !== undefined ? { priority: data.priority } : {}),
          ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        },
        include: {
          project: { select: { id: true, name: true } },
          assignedDeveloper: { select: { id: true, name: true, email: true } },
        },
      });

      let activity = null;
      let inReviewNotification = null;
      let assignNotification = null;

      // Create activity record for status changes
      if (statusChanged) {
        activity = await tx.taskActivity.create({
          data: {
            taskId: id,
            projectId: task.projectId,
            userId: user.userId,
            oldStatus,
            newStatus,
            action: 'STATUS_CHANGED',
          },
          include: { user: { select: { name: true } } },
        });

        // IN_REVIEW notification to PM
        if (newStatus === TaskStatus.IN_REVIEW) {
          const pm = await tx.project.findUnique({
            where: { id: task.projectId },
            include: { createdBy: { select: { id: true, name: true } } },
          });
          if (pm) {
            inReviewNotification = await tx.notification.create({
              data: {
                recipientId: pm.createdById,
                type: 'TASK_IN_REVIEW',
                message: `Task "${updatedTask.title}" has been moved to In Review and is ready for your review`,
                relatedTaskId: id,
                relatedProjectId: task.projectId,
              },
            });
          }
        }
      }

      // Assignment notification
      if (assigneeChanged && data.assignedDeveloperId) {
        assignNotification = await tx.notification.create({
          data: {
            recipientId: data.assignedDeveloperId,
            type: 'TASK_ASSIGNED',
            message: `You were assigned task "${updatedTask.title}" in project "${task.project.name}"`,
            relatedTaskId: id,
            relatedProjectId: task.projectId,
          },
        });

        // Log assignment activity
        await tx.taskActivity.create({
          data: {
            taskId: id,
            projectId: task.projectId,
            userId: user.userId,
            action: 'ASSIGNED',
            metadata: {
              assignedTo: data.assignedDeveloperId,
              assignedToName: (await tx.user.findUnique({
                where: { id: data.assignedDeveloperId },
                select: { name: true },
              }))?.name ?? 'Unknown',
            },
          },
        });
      }

      return { updatedTask, activity, inReviewNotification, assignNotification };
    });

    const io = getSocketServer();

    // Emit activity event after successful commit
    if (result.activity) {
      const activityPayload = {
        activityId: result.activity.id,
        taskId: id,
        projectId: task.projectId,
        taskTitle: result.updatedTask.title,
        userId: user.userId,
        userName: result.activity.user.name,
        oldStatus,
        newStatus,
        action: 'STATUS_CHANGED',
        timestamp: result.activity.createdAt.toISOString(),
      };

      io.emitToProject(task.projectId, 'task:statusChanged', activityPayload);
    }

    // Emit PM notification for IN_REVIEW
    if (result.inReviewNotification) {
      const pmProject = await prisma.project.findUnique({ where: { id: task.projectId } });
      if (pmProject) {
        io.emitNotificationToUser(pmProject.createdById, {
          id: result.inReviewNotification.id,
          type: result.inReviewNotification.type,
          message: result.inReviewNotification.message,
          relatedTaskId: result.inReviewNotification.relatedTaskId ?? undefined,
          relatedProjectId: result.inReviewNotification.relatedProjectId ?? undefined,
          createdAt: result.inReviewNotification.createdAt.toISOString(),
        });
      }
    }

    // Emit developer assignment notification
    if (result.assignNotification && data.assignedDeveloperId) {
      io.emitNotificationToUser(data.assignedDeveloperId, {
        id: result.assignNotification.id,
        type: result.assignNotification.type,
        message: result.assignNotification.message,
        relatedTaskId: result.assignNotification.relatedTaskId ?? undefined,
        relatedProjectId: result.assignNotification.relatedProjectId ?? undefined,
        createdAt: result.assignNotification.createdAt.toISOString(),
      });
    }

    return result.updatedTask;
  },

  async delete(id: string, user: AuthPayload) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { createdById: true } } },
    });

    if (!task) throw new AppError(404, 'NOT_FOUND', 'Task not found');

    if (user.role === Role.DEVELOPER) {
      throw new AppError(403, 'FORBIDDEN', 'Developers cannot delete tasks');
    }

    if (user.role === Role.PROJECT_MANAGER && task.project.createdById !== user.userId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only delete tasks in your own projects');
    }

    await prisma.task.delete({ where: { id } });
  },
};

/**
 * Build WHERE clause for task queries — enforces authorization scope at database level.
 * Never fetches unauthorized records and filters in memory.
 */
function buildWhereClause(user: AuthPayload, filters: TaskFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Role-based data scope (enforced first, cannot be overridden by filters)
  if (user.role === Role.DEVELOPER) {
    where.assignedDeveloperId = user.userId;
  } else if (user.role === Role.PROJECT_MANAGER) {
    where.project = { createdById: user.userId };
  }
  // Admin: no scope restriction

  // Apply user-provided filters on top of the scope
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.projectId) {
    // PM/Developer: projectId filter is further constrained by their scope
    if (user.role === Role.DEVELOPER) {
      where.projectId = filters.projectId;
      where.assignedDeveloperId = user.userId; // Still enforced
    } else if (user.role === Role.PROJECT_MANAGER) {
      where.projectId = filters.projectId;
      where.project = { createdById: user.userId }; // Still enforced
    } else {
      where.projectId = filters.projectId;
    }
  }
  if (filters.isOverdue !== undefined) where.isOverdue = filters.isOverdue;
  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {
      ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
      ...(filters.dueTo ? { lte: filters.dueTo } : {}),
    };
  }

  return where;
}
