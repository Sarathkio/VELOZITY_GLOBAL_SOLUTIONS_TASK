import { prisma } from '../config/database.js';
import { Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/crypto.js';

export const userService = {
  async getAll(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    return user;
  },

  async create(data: { name: string; email: string; password: string; role: Role }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'CONFLICT', 'A user with this email already exists');

    const passwordHash = await hashPassword(data.password);
    return prisma.user.create({
      data: { name: data.name, email: data.email, passwordHash, role: data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async update(id: string, data: Partial<{ name: string; email: string; password: string; role: Role }>) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError(409, 'CONFLICT', 'Email already in use');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.passwordHash = await hashPassword(data.password);

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async delete(id: string, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
    await prisma.user.delete({ where: { id } });
  },
};
