import express from 'express';
import cors from 'cors';
import { config, logger } from '../config';
import { apiLimiter } from './middleware/rateLimit';
import { requireAuth } from './middleware/auth';

import addressesRouter from './routes/addresses';
import rulesRouter from './routes/rules';
import eventsRouter from './routes/events';
import webhooksRouter from './routes/webhooks';

const app = express();

app.use(cors());
app.use(express.json());

// Public webhook route (it has its own token validation)
app.use('/webhooks', webhooksRouter);

// Apply rate limiting and auth to all REST endpoints
app.use(apiLimiter);
app.use(requireAuth);

app.use('/addresses', addressesRouter);
app.use('/addresses/:id/rules', rulesRouter);
app.use('/events', eventsRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled API error');
  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`API Server running on port ${config.PORT}`);
  });
}

export default app;
