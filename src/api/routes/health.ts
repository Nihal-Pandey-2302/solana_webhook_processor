import { Router } from 'express';
import pool from '../../db';
import IORedis from 'ioredis';
import { config } from '../../config/index';
import { webhookQueue, alertQueue } from '../../workers/queue';

const router = Router();
const redisClient = new IORedis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: 1,
});

router.get('/', async (req, res) => {
  let dbStatus = 'up';
  let dbLatency = 0;
  let redisStatus = 'up';
  let redisLatency = 0;
  let queueStatus = 'up';

  let isDegraded = false;

  const startDb = Date.now();
  try {
    await pool.query('SELECT 1');
    dbLatency = Date.now() - startDb;
  } catch (e) {
    dbStatus = 'down';
    isDegraded = true;
  }

  const startRedis = Date.now();
  try {
    await redisClient.ping();
    redisLatency = Date.now() - startRedis;
  } catch (e) {
    redisStatus = 'down';
    isDegraded = true;
  }

  let queueCounts = {};
  try {
    const counts = await webhookQueue.getJobCounts();
    // Bull queue.getJobCounts() works if redis is up, but just to be sure
    queueCounts = counts;
  } catch (e) {
    queueStatus = 'down';
    isDegraded = true;
  }

  const status = isDegraded ? 'degraded' : 'ok';
  
  res.status(isDegraded ? 503 : 200).json({
    status,
    uptime: process.uptime(),
    dependencies: {
      database: { status: dbStatus, latencyMs: dbLatency },
      redis: { status: redisStatus, latencyMs: redisLatency },
      queue: { status: queueStatus, counts: queueCounts }
    }
  });
});

export default router;
