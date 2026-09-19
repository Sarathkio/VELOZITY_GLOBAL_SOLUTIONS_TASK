import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { TaskStatus } from '@prisma/client';
import { getSocketServer } from '../websocket/socketServer.js';

/**
 * Overdue task background job.
 *
 * Runs every 15 minutes.
 *
 * Logic:
 * 1. Find tasks where dueDate < NOW() AND status NOT IN (DONE) AND isOverdue = false
 * 2. Mark them isOverdue = true in a batch update
 * 3. Create TaskActivity record for each (once per task — not repeated on subsequent runs)
 * 4. Create TASK_OVERDUE notification for the assigned developer (if any)
 * 5. Emit WebSocket notification after DB commit
 *
 * Idempotency: only targets isOverdue = false tasks, so re-running never double-processes.
 */
export function startOverdueJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[OverdueJob] Running overdue task scan...');
    try {
      await processOverdueTasks();
    } catch (err) {
      console.error('[OverdueJob] Failed:', err);
    }
  });

  console.log('[OverdueJob] Scheduled — runs every 15 minutes');
}

export async function processOverdueTasks(): Promise<number> {
  const now = new Date();

  // Find newly overdue tasks (not already flagged, not done, past due date)
  const overdueTasks = await prisma.task.findMany({
    where: {
      isOverdue: false,
      status: { notIn: [TaskStatus.DONE] },
      dueDate: { lt: now, not: null },
    },
    include: {
      project: { select: { id: true, name: true, createdById: true } },
      assignedDeveloper: { select: { id: true, name: true } },
    },
  });

  if (overdueTasks.length === 0) {
    console.log('[OverdueJob] No newly overdue tasks found');
    return 0;
  }

  console.log(`[OverdueJob] Found ${overdueTasks.length} newly overdue task(s)`);

  const io = getSocketServer();

  for (const task of overdueTasks) {
    try {
      await prisma.$transaction(async (tx) => {
        // Mark task as overdue
        await tx.task.update({
          where: { id: task.id },
          data: { isOverdue: true, overdueNotifiedAt: now },
        });

        // Create activity record
        await tx.taskActivity.create({
          data: {
            taskId: task.id,
            projectId: task.projectId,
            userId: task.project.createdById, // PM as system actor for overdue events
            action: 'OVERDUE_FLAGGED',
            metadata: {
              dueDate: task.dueDate?.toISOString(),
              flaggedAt: now.toISOString(),
            },
          },
        });

        // Create notification for assigned developer
        if (task.assignedDeveloperId) {
          await tx.notification.create({
            data: {
              recipientId: task.assignedDeveloperId,
              type: 'TASK_OVERDUE',
              message: `Task "${task.title}" in project "${task.project.name}" is overdue`,
              relatedTaskId: task.id,
              relatedProjectId: task.projectId,
            },
          });
        }

        // Also notify the PM
        await tx.notification.create({
          data: {
            recipientId: task.project.createdById,
            type: 'TASK_OVERDUE',
            message: `Task "${task.title}" is overdue`,
            relatedTaskId: task.id,
            relatedProjectId: task.projectId,
          },
        });
      });

      // Emit notifications after successful commit
      if (task.assignedDeveloperId) {
        const devNotif = await prisma.notification.findFirst({
          where: {
            recipientId: task.assignedDeveloperId,
            relatedTaskId: task.id,
            type: 'TASK_OVERDUE',
          },
          orderBy: { createdAt: 'desc' },
        });
        if (devNotif) {
          io.emitNotificationToUser(task.assignedDeveloperId, {
            id: devNotif.id,
            type: devNotif.type,
            message: devNotif.message,
            relatedTaskId: devNotif.relatedTaskId ?? undefined,
            relatedProjectId: devNotif.relatedProjectId ?? undefined,
            createdAt: devNotif.createdAt.toISOString(),
          });
        }
      }

      const pmNotif = await prisma.notification.findFirst({
        where: {
          recipientId: task.project.createdById,
          relatedTaskId: task.id,
          type: 'TASK_OVERDUE',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (pmNotif) {
        io.emitNotificationToUser(task.project.createdById, {
          id: pmNotif.id,
          type: pmNotif.type,
          message: pmNotif.message,
          relatedTaskId: pmNotif.relatedTaskId ?? undefined,
          relatedProjectId: pmNotif.relatedProjectId ?? undefined,
          createdAt: pmNotif.createdAt.toISOString(),
        });
      }

      console.log(`[OverdueJob] Processed task ${task.id}: "${task.title}"`);
    } catch (err) {
      console.error(`[OverdueJob] Failed to process task ${task.id}:`, err);
      // Continue with other tasks — one failure shouldn't stop the batch
    }
  }

  return overdueTasks.length;
}
