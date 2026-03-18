import app from './api/index';
import { logger } from './config/logger';
import { config } from './config';
import pool from './db/index';
import { webhookQueue, alertQueue } from './workers/queue';
import './workers/webhookProcessor';
import './workers/alertDeliverer';

const server = app.listen(config.PORT, () => {
  logger.info(`API and Workers running on port ${config.PORT}`);
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Force exit fallback timeout
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 30000);

  try {
    // 1. Stop accepting new connections
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 2. Pause Bull queues to stop picking up new jobs
    logger.info('Pausing expected Bull queues...');
    await Promise.all([
      webhookQueue.pause(true, true),
      alertQueue.pause(true, true),
    ]);

    // 3. Wait for active jobs to complete (can use queue.close() to gracefully wait then close connection)
    logger.info('Waiting for active jobs to finish and closing queues (15s timeout internally handled usually, doing standard close)...');
    
    // We wrap queue closure in a timeout to respect the 15-second request per prompt, though close() does wait.
    const closeQueueWithTimeout = (queue: any, timeout: number) => {
      return Promise.race([
        queue.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Queue close timeout')), timeout))
      ]);
    };
    
    await Promise.all([
      closeQueueWithTimeout(webhookQueue, 15000),
      closeQueueWithTimeout(alertQueue, 15000),
    ]);

    // 4. Close PG Pool
    logger.info('Closing Database Pool...');
    await pool.end();

    logger.info('Graceful shutdown complete. Exiting.');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
