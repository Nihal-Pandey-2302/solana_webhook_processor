import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';
import { config } from '../../config';

// Redis client for the store
const redisClient = new IORedis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - known issue with rate-limit-redis v3 types
    sendCommand: (...args: string[]) => redisClient.call(...args),
  }),
  message: { error: 'Too many requests, please try again later.' },
});
