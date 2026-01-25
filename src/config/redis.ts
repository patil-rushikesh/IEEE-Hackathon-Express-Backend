import Redis from 'ioredis';
import { config } from './index'; // or wherever your config lives

const redisUrl = config.redisUrl ?? 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false,
});

// --------------------------------------------------
// Redis Event Handlers
// --------------------------------------------------
redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('ready', () => {
  console.log('🚀 Redis is ready to use');
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error);
});

redis.on('close', () => {
  console.log('📤 Redis connection closed');
});

// --------------------------------------------------
// Connection Helpers
// --------------------------------------------------
export const connectRedis = async (): Promise<void> => {
  if (redis.status === 'ready' || redis.status === 'connecting') {
    return;
  }

  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    // Redis is optional — don't crash the app
  }
};

export const closeRedis = async (): Promise<void> => {
  try {
    if (redis.status !== 'end') {
      await redis.quit();
    }
  } catch (error) {
    console.error('⚠️ Error closing Redis connection:', error);
  }
};

export default redis;
