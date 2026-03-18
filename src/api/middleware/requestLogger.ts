import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTimeMs: duration
    }, 'HTTP Request');
  });

  next();
};
