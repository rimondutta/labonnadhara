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
  var __mongoListenersAttached: boolean | undefined;
}

// Retrieve or initialize the cache on globalThis
const cached: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

// Attach event listeners once across development hot-reloads and warm serverless containers
if (!globalThis.__mongoListenersAttached) {
  mongoose.connection.on('disconnected', () => {
    cached.conn = null;
    cached.promise = null;
  });
  mongoose.connection.on('close', () => {
    cached.conn = null;
    cached.promise = null;
  });
  globalThis.__mongoListenersAttached = true;
}

/**
 * Validates and parses the MONGO_MAX_POOL_SIZE environment variable.
 * Rejects non-numeric, zero, negative, float, or out-of-range values with a safe default of 10.
 * Caps at 50 to prevent exhausting MongoDB Atlas connection limits in serverless.
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
 * Sanitizes connection error messages by masking credentials in MongoDB URIs.
 * Supports both mongodb:// and mongodb+srv:// connection schemes.
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /(mongodb(?:\+srv)?:\/\/)(?:[^:@\s]+(?::[^@\s]+)?@)/gi,
    '$1****:****@'
  );
}

/**
 * Connects to MongoDB Atlas using Mongoose with production-ready connection pooling.
 *
 * Architecture Highlights:
 * 1. Warm Reusability: Reuses existing ready connections (readyState === 1) across warm invocations.
 * 2. Concurrency Deduplication: Shares a single in-flight Promise to prevent connection race conditions.
 * 3. State Awareness: Responds to connection events (disconnected, close) to cleanly evict stale references.
 * 4. Resource Safety: minPoolSize=0 and maxIdleTimeMS=60000 allow idle serverless connections to close.
 * 5. Production Performance: bufferCommands=false and autoIndex=false eliminate startup stalls.
 */
async function connectToDatabase(): Promise<typeof mongoose> {
  // 1. If connection is already open and ready, return it immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. If a connection attempt is actively in-flight, await the existing promise
  if (cached.promise) {
    return await cached.promise;
  }

  // 3. Clear stale reference if connection dropped
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    cached.conn = null;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  // 4. Initialize a single connection promise
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
  };

  cached.promise = mongoose
    .connect(MONGODB_URI, opts)
    .then((m) => {
      cached.conn = m;
      return m;
    })
    .catch((err) => {
      // Clear cached promise on failure so subsequent requests can retry
      cached.promise = null;
      cached.conn = null;
      const safeError = sanitizeErrorMessage(err);
      console.error('[MongoDB] Connection initialization failed:', safeError);
      throw new Error(`Database connection failed: ${safeError}`);
    });

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
