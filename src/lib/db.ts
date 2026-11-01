import mongoose from 'mongoose';
import '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import '@/models/Settings';

/**
 * Global cache interface for Mongoose connection pooling in Next.js & Vercel Serverless.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

// Retrieve or initialize the cache on globalThis
const cached: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

/**
 * Validates and parses the MONGO_MAX_POOL_SIZE environment variable.
 * Rejects non-numeric, zero, negative, or non-integer values with a safe default of 10.
 */
export function getValidatedMaxPoolSize(): number {
  const rawValue = process.env.MONGO_MAX_POOL_SIZE;
  if (!rawValue) {
    return 10;
  }

  const parsed = Number(rawValue);

  // Must be a safe, positive integer within reasonable serverless bounds (1 to 50)
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 50) {
    return parsed;
  }

  console.warn(
    `[MongoDB] Invalid MONGO_MAX_POOL_SIZE "${rawValue}". Falling back to safe default: 10.`
  );
  return 10;
}

/**
 * Sanitizes connection error messages by masking credentials if a URI is included.
 */
function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/i, '$1****$3');
}

/**
 * Connects to MongoDB Atlas using Mongoose with connection pooling and caching.
 * - Reuses existing ready connections across warm serverless invocations.
 * - Deduplicates concurrent connection attempts by sharing a single in-flight Promise.
 * - Disables buffering and auto-indexing in production for performance.
 * - Closes idle connections after 60s to prevent connection leaks on MongoDB Atlas.
 */
async function connectToDatabase(): Promise<typeof mongoose> {
  // 1. Reuse existing ready connection (readyState === 1: connected)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. If disconnected or broken, reset cache so a fresh connection can be established
  if (cached.conn && mongoose.connection.readyState !== 2) {
    cached.conn = null;
    cached.promise = null;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  // 3. If no connection promise is in-flight, initialize one
  if (!cached.promise) {
    const isProduction = process.env.NODE_ENV === 'production';
    const maxPoolSize = getValidatedMaxPoolSize();

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      autoIndex: !isProduction,         // Disable in production — indexes created via migration script
      maxPoolSize,                     // Configurable via MONGO_MAX_POOL_SIZE (default: 10)
      minPoolSize: 0,                  // Scale down to 0 idle connections in serverless
      maxIdleTimeMS: 60000,            // Close idle connections after 60s
      waitQueueTimeoutMS: 10000,       // Timeout after 10s if connection pool is exhausted
      serverSelectionTimeoutMS: 5000,  // 5s fail-fast for cluster discovery
      connectTimeoutMS: 5000,          // 5s initial connection timeout
      socketTimeoutMS: 45000,          // 45s socket timeout prevents mid-query drops
      heartbeatFrequencyMS: 10000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        return m;
      })
      .catch((err) => {
        // Reset cached promise and conn on failure so subsequent requests can retry
        cached.promise = null;
        cached.conn = null;
        const safeError = sanitizeErrorMessage(err);
        console.error('[MongoDB] Connection initialization failed:', safeError);
        throw new Error(`Database connection failed: ${safeError}`);
      });
  }

  // 4. Await the shared promise (safely handles concurrent requests without race conditions)
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  return cached.conn;
}

export default connectToDatabase;
export { connectToDatabase };
