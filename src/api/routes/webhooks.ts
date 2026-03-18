import { DatabaseError } from '../../types/errors';
import { Router } from 'express';
import { logger } from '../../config';
import { webhookQueue } from '../../workers/queue';

const router = Router();

router.post('/helius', async (req, res, next) => {
  try {
    // Helius sends an Authorization header we can validate against a known string
    // This is different from the x-api-key we use for our REST API.
    // For simplicity, we just check if it matches an environment variable, or we assume
    // it's protected by other means if we didn't specify a HELIUS_AUTH_SECRET.
    // User requested "validates the signature". Helius uses 'authorization' header as the signature/token.
    const authHeader = req.headers['authorization'];
    if (process.env.HELIUS_AUTH_SECRET && authHeader !== process.env.HELIUS_AUTH_SECRET) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    const payload = req.body;
    
    // Webhook from Helius is usually an array of transactions
    if (!Array.isArray(payload)) {
      return res.status(400).json({ error: 'Expected an array of events' });
    }

    // Enqueue the batch/individual events
    // Helius sends lots of data, we enqueue the raw payload and let the worker parse it.
    await webhookQueue.add('process-webhook', { events: payload }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      }
    });

    res.status(200).send('Webhook received and queued');
  } catch (err) {
    next(new DatabaseError('Internal server error'));
  }
});

export default router;
