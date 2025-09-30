import rateLimit from 'express-rate-limit';
import { config } from '../utils/config';

export const uploadLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many upload requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const processLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests * 2, // Allow more processing requests
  message: 'Too many processing requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
