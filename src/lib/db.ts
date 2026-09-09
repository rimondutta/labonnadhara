import mongoose from 'mongoose';
import '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import '@/models/Settings';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000, // 10s — enough for cold starts and brief network hiccups
      socketTimeoutMS: 45000,          // 45s — prevents mid-query drops
      connectTimeoutMS: 10000,         // 10s connection timeout
      heartbeatFrequencyMS: 10000,     // keep-alive ping every 10s
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      return mongoose;
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
