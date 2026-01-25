import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { connectRedis, closeRedis } from './config/redis';
import prisma from './config/database';

const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin) return callback(null, true);

      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Length'],
    credentials: true,
    maxAge: 12 * 60 * 60, // 12 hours
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Routes
app.use('/', routes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server Startup & Graceful Shutdown
const startServer = async (): Promise<void> => {
  try {
    // Connect to Redis (optional – won't crash app if unavailable)
    await connectRedis();
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port: ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
    });

    // Server timeouts
    server.timeout = 15_000; // 15 seconds
    server.keepAliveTimeout = 60_000; // 60 seconds

    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n📤 Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
          await prisma.$disconnect();
          console.log('📤 Disconnected from database');
        } catch (err) {
          console.error('⚠️ Error disconnecting from database:', err);
        }

        try {
          await closeRedis();
          console.log('📤 Disconnected from Redis');
        } catch (err) {
          console.error('⚠️ Error disconnecting from Redis:', err);
        }

        process.exit(0);
      });

      // Force shutdown if cleanup hangs
      setTimeout(() => {
        console.error('❌ Could not close connections in time. Forcefully shutting down.');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
