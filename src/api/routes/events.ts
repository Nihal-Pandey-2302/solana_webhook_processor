import { Router } from 'express';
import { logger } from '../../config';
import { getEventsQuery } from '../../db/queries/eventQueries';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const address = req.query.address as string;
    const limit = parseInt((req.query.limit as string) || '50', 10);

    if (!address) {
      return res.status(400).json({ error: 'Address query parameter is required' });
    }

    const events = await getEventsQuery(address, limit);
    res.json(events);
  } catch (err) {
    logger.error({ err }, 'Error fetching events');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
