import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const bootstrap = async () => {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.success(`API ready → ${env.publicUrl}/api`);
    logger.info(`Environment: ${env.nodeEnv}`);
  });

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received — shutting down…`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
  });
};

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});