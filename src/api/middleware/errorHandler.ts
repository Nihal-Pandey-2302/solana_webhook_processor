import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../types/errors';
import { logger } from '../../config/logger';

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  if (err instanceof AppError) {
    if (err.isOperational) {
      logger.warn({ err, requestId }, err.message);
    } else {
      logger.error({ err, requestId }, 'Unexpected AppError');
    }
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      requestId
    });
  }

  // Unhandled / Unknown errors
  logger.error({ err, requestId }, 'Unhandled Exception');
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Something went wrong',
    requestId
  });
};
