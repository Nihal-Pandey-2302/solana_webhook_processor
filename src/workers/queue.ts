import Queue from 'bull';
import { config, logger } from '../config';
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

webhookQueue.on('error', (error) => logger.error({ err: error }, 'Webhook queue error'));
alertQueue.on('error', (error) => logger.error({ err: error }, 'Alert queue error'));
