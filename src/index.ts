import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

import { config } from "./config";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

import prisma from "./config/database";

const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://techfortomorrow.tech",
      "https://dashboard.techfortomorrow.tech",
      "https://00c2656722b6.ngrok-free.app"
    ],
    credentials: true,
  }),
);

// File upload middleware - must come before express.json() for form data
app.use(fileUpload({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  useTempFiles: false, // Don't use temp files, work with memory
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));

// Routes
app.use("/", routes);

app.get("/", (req, res) => {
  res.send("IEEE Hackathon Backend is running!");
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'connected' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({
      db: 'error',
      message: e.message
    });
  }
});

app.get("/debug/env", (_req, res) => {
  res.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    length: process.env.DATABASE_URL?.length ?? 0
  });
});


// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    // ...existing code...
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port: ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
    });

    // Server timeouts
    server.timeout = 15_000; // 15 seconds
    server.keepAliveTimeout = 60_000; // 60 seconds
      // Connect to Database and log success
      setImmediate(async () => {
        try {
          await prisma.$connect();
          console.log('🗄️  Connected to database');
        } catch (err) {
          console.error('⚠️ Unable to connect to database at startup:', err);
        }
      });
    // Graceful shutdown
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
