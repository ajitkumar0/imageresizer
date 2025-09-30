import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const error = err as AppError;
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  logger.error('Error occurred', {
    error: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Optional: Send to Sentry or other error tracking service
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(err);
  // }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
  });
};
