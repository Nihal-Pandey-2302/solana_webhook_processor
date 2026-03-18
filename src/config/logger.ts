import pino from 'pino';

// Need to import NODE_ENV from config, but config depends on logger,
// so we'll just read process.env.NODE_ENV directly to avoid circular dependency.
const env = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (env === 'development' ? 'debug' : 'info'),
  base: {
    service: 'solana-webhook-processor',
    environment: env
  },
  transport: env === 'development' ? {
    target: 'pino-pretty'
  } : undefined,
});
