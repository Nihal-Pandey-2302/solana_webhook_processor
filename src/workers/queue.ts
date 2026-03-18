import Queue, { Job } from 'bull';
import { config } from '../config';
import { logger } from '../config/logger';
import { insertDeadLetterJob } from '../db/queries/dlqQueries';
import IORedis from 'ioredis';

const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

// We use ioredis for the custom connection
const client = new IORedis(redisConfig);
const subscriber = new IORedis(redisConfig);

const queueOpts = {
  createClient: (type: string) => {
    switch (type) {
      case 'client':
        return client;
      case 'subscriber':
        return subscriber;
      case 'bclient':
        return new IORedis(redisConfig);
      default:
        return new IORedis(redisConfig);
    }
  }
};

export const webhookQueue = new Queue('webhook-queue', queueOpts);
export const alertQueue = new Queue('alert-queue', queueOpts);

const handleFailedJob = async (queueName: string, job: Job, err: Error) => {
  // If no attempts left
  if (job.attemptsMade >= (job.opts.attempts || 1)) {
    try {
      await insertDeadLetterJob(
        queueName,
        job.id ? job.id.toString() : 'unknown',
        job.data,
        err.message,
        job.attemptsMade
      );
      logger.warn({ jobId: job.id, queue: queueName }, 'Job moved to DLQ');
    } catch (dbErr) {
      logger.error({ err: dbErr, jobId: job.id }, 'Failed to insert job into DLQ');
    }
  }
};

webhookQueue.on('error', (error: any) => logger.error({ err: error }, 'Webhook queue error'));
webhookQueue.on('failed', (job: Job, err: Error) => handleFailedJob('webhook-queue', job, err));

alertQueue.on('error', (error: any) => logger.error({ err: error }, 'Alert queue error'));
alertQueue.on('failed', (job: Job, err: Error) => handleFailedJob('alert-queue', job, err));
