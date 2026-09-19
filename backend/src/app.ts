import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import clientRoutes from './routes/client.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import activityRoutes from './routes/activity.routes.js';

export function createApp() {
  const app = express();

  // ─── Security middleware ───────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    }),
  );

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true, // Required for HttpOnly cookies
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ─── Body & cookie parsing ─────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ─── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/clients', clientRoutes);
  app.use('/projects', projectRoutes);
  app.use('/tasks', taskRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/activity', activityRoutes);

  // ─── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ─── Centralized error handler (must be last) ──────────────────────────────
  app.use(errorHandler);

  return app;
}
