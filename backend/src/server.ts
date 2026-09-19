import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initSocketServer } from './websocket/socketServer.js';
import { startOverdueJob } from './jobs/overdueTask.job.js';
import { prisma } from './config/database.js';

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initSocketServer(httpServer);
  console.log('✅ WebSocket server initialized');

  // Start background jobs
  startOverdueJob();

  httpServer.listen(env.PORT, () => {
    console.log(`✅ Server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
