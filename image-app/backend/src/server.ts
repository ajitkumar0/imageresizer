import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './utils/config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { StorageService } from './services/storage';
import imageRoutes from './routes/image';

const app = express();
const storage = new StorageService();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Logging
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', imageRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
let server: any;
let cleanupInterval: NodeJS.Timeout;

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize storage
    await storage.initialize();

    // Start cleanup job
    cleanupInterval = setInterval(
      async () => {
        logger.info('Running cleanup job');
        await storage.cleanupOldFiles(config.cleanupTtlHours);
      },
      config.cleanupIntervalHours * 60 * 60 * 1000
    );

    // Start server
    server = app.listen(config.port, config.host, () => {
      logger.info(`Server running on ${config.host}:${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`CORS origin: ${config.corsOrigin}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

export default app;
