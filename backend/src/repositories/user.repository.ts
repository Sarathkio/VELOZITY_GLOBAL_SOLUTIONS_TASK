import { prisma } from '../config/database.js';
import { User, Role } from '@prisma/client';

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findAll(role?: Role): Promise<Omit<User, 'passwordHash'>[]> {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<Omit<User, 'passwordHash'>> {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async update(
    id: string,
    data: Partial<{ name: string; email: string; passwordHash: string; role: Role }>,
  ): Promise<Omit<User, 'passwordHash'>> {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  },

  async findDevelopers(): Promise<Omit<User, 'passwordHash'>[]> {
    return prisma.user.findMany({
      where: { role: Role.DEVELOPER },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  },
};
