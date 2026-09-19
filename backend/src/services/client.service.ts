import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const clientService = {
  async getAll() {
    return prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { projects: true } } },
    });
  },

  async getById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: { id: true, name: true, description: true, createdAt: true, createdById: true },
        },
        _count: { select: { projects: true } },
      },
    });
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    return client;
  },

  async create(data: { name: string; email?: string; phone?: string; company?: string; notes?: string }) {
    return prisma.client.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; email: string; phone: string; company: string; notes: string }>) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    return prisma.client.update({ where: { id }, data });
  },

  async delete(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });
    if (!client) throw new AppError(404, 'NOT_FOUND', 'Client not found');
    if (client._count.projects > 0) {
      throw new AppError(409, 'HAS_PROJECTS', 'Cannot delete a client that has associated projects');
    }
    await prisma.client.delete({ where: { id } });
  },
};
