import express from 'express';
import cors from 'cors';
import { config, logger } from '../config';
import { apiLimiter } from './middleware/rateLimit';
import { requireAuth } from './middleware/auth';

import { requestLogger } from './middleware/requestLogger';
import { globalErrorHandler } from './middleware/errorHandler';

import addressesRouter from './routes/addresses';
import rulesRouter from './routes/rules';
import eventsRouter from './routes/events';
import webhooksRouter from './routes/webhooks';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';
import dlqRouter from './routes/dlq';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Public routes
app.use('/webhooks', webhooksRouter);
app.use('/health', healthRouter);

// Apply rate limiting and auth to all REST endpoints
app.use(apiLimiter);
app.use(requireAuth);

app.use('/addresses', addressesRouter);
app.use('/addresses/:id/rules', rulesRouter);
app.use('/events', eventsRouter);
app.use('/metrics', metricsRouter);
app.use('/dlq', dlqRouter);

// Error handling middleware
app.use(globalErrorHandler);

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`API Server running on port ${config.PORT}`);
  });
}

export default app;
