import mongoose from 'mongoose';
import '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import '@/models/Settings';

/**
 * Cache Mongoose connection on globalThis across hot reloads in development
 * and function reuse in serverless environments.
 */
let cached = (globalThis as any).mongoose;

if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  if (!cached.promise) {
    const isProduction = process.env.NODE_ENV === 'production';
    const opts = {
      bufferCommands: false,
      autoIndex: !isProduction, // Disable in production — indexes created via script
      maxPoolSize: 10,
      minPoolSize: 0,           // 0 in serverless prevents zombie connection pooling
      serverSelectionTimeoutMS: 5000, // 5s fail-fast for cold starts
      socketTimeoutMS: 20000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
