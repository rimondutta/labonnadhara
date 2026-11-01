import mongoose from 'mongoose';

import '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import '@/models/Settings';

/**
 * Mongoose global cache.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
  var __mongooseListenersAttached: boolean | undefined;
}

/**
 * Initialize global cache.
 */
const cached: MongooseCache =
  globalThis.mongooseCache ??
  (globalThis.mongooseCache = {
    conn: null,
    promise: null,
  });

/**
 * Connection pool configuration.
 */
const DEFAULT_MAX_POOL_SIZE = 10;
const MAX_ALLOWED_POOL_SIZE = 50;

/**
 * Validate MONGO_MAX_POOL_SIZE.
 */
export function getValidatedMaxPoolSize(): number {
  const rawValue = process.env.MONGO_MAX_POOL_SIZE?.trim();

  if (!rawValue) {
    return DEFAULT_MAX_POOL_SIZE;
  }

  if (!/^\d+$/.test(rawValue)) {
    console.warn(
      '[MongoDB] Invalid MONGO_MAX_POOL_SIZE. Using default: 10.'
    );

    return DEFAULT_MAX_POOL_SIZE;
  }

  const parsed = Number(rawValue);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_ALLOWED_POOL_SIZE
  ) {
    console.warn(
      '[MongoDB] MONGO_MAX_POOL_SIZE must be between 1 and 50. Using default: 10.'
    );

    return DEFAULT_MAX_POOL_SIZE;
  }

  return parsed;
}

/**
 * Sanitize MongoDB connection credentials.
 */
export function sanitizeErrorMessage(error: unknown): string {
  let message =
    error instanceof Error ? error.message : String(error);

  const configuredUri = process.env.MONGODB_URI;

  // Remove the exact configured URI if it appears in an error.
  if (configuredUri) {
    message = message.split(configuredUri).join(
      '[REDACTED_MONGODB_URI]'
    );
  }

  // Mask credentials in mongodb:// and mongodb+srv:// URLs.
  message = message.replace(
    /(mongodb(?:\+srv)?:\/\/)[^@\s]+@/gi,
    '$1[REDACTED]@'
  );

  return message;
}

/**
 * Safely attach Mongoose connection event listeners once.
 */
if (!globalThis.__mongooseListenersAttached) {
  mongoose.connection.on('error', (error) => {
    console.error(
      '[MongoDB] Connection error:',
      sanitizeErrorMessage(error)
    );
  });

  mongoose.connection.on('disconnected', () => {
    // When disconnected, mark cache as null so new requests reconnect
    // rather than attempting queries with bufferCommands: false
    cached.conn = null;
    cached.promise = null;
    console.warn(
      '[MongoDB] Connection lost. Cache cleared for re-connection.'
    );
  });

  mongoose.connection.on('reconnected', () => {
    cached.conn = mongoose;
    console.info('[MongoDB] Connection successfully restored.');
  });

  // Explicit connection closure, not ordinary network disconnection.
  mongoose.connection.on('close', () => {
    cached.conn = null;
    cached.promise = null;

    console.info('[MongoDB] Connection explicitly closed.');
  });

  globalThis.__mongooseListenersAttached = true;
}

/**
 * Create and cache a connection promise.
 *
 * All concurrent requests share the same promise.
 */
function cacheConnectionPromise(
  connectionPromise: Promise<typeof mongoose>
): Promise<typeof mongoose> {
  const attempt = connectionPromise
    .then((connection) => {
      cached.conn = connection;
      cached.promise = null; // Clear in-flight promise once resolved so future reconnects work
      return connection;
    })
    .catch((error: unknown) => {
      cached.conn = null;
      cached.promise = null;

      console.error(
        '[MongoDB] Connection initialization failed:',
        sanitizeErrorMessage(error)
      );

      // Do not expose raw database errors or credentials.
      throw new Error('Database connection failed.');
    });

  cached.promise = attempt;

  return attempt;
}

/**
 * Connect to MongoDB Atlas.
 *
 * Features:
 * - Global connection caching.
 * - Concurrent request deduplication.
 * - Configurable connection pool.
 * - Vercel warm-instance connection reuse.
 * - Safe failed initial connection recovery.
 * - Mongoose automatic reconnection support.
 */
async function connectToDatabase(): Promise<typeof mongoose> {
  const connectionState = mongoose.connection.readyState;

  // 1. Do not initiate a new connection while explicitly disconnecting.
  if (connectionState === 3) {
    throw new Error(
      'MongoDB connection is currently closing. Retry the request.'
    );
  }

  // 2. Reuse an established connection object only when readyState === 1 (connected).
  // If bufferCommands is false and readyState !== 1, returning cached.conn immediately
  // causes model queries to throw MongooseError: bufferCommands = false.
  if (cached.conn && connectionState === 1) {
    return cached.conn;
  }

  // 3. Reuse an in-flight connection attempt.
  if (cached.promise) {
    return await cached.promise;
  }

  // 4. Reuse an already-connected default Mongoose connection.
  if (connectionState === 1) {
    cached.conn = mongoose;
    return mongoose;
  }

  // 5. If another module is already connecting,
  // wait for that existing Mongoose connection.
  if (connectionState === 2) {
    const existingConnection = mongoose.connection
      .asPromise()
      .then(() => mongoose);

    return await cacheConnectionPromise(existingConnection);
  }

  // 6. Initialize a new connection.
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is missing.'
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const maxPoolSize = getValidatedMaxPoolSize();

  const options: mongoose.ConnectOptions = {
    // Mongoose configuration
    bufferCommands: false,
    autoIndex: !isProduction,

    // Connection pool
    maxPoolSize,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 10000,

    // Connection timeout
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  // 7. Start a single connection attempt.
  // Concurrent calls will reuse this promise.
  const connectionPromise = mongoose.connect(
    MONGODB_URI,
    options
  );

  return await cacheConnectionPromise(connectionPromise);
}

export default connectToDatabase;
export { connectToDatabase };
