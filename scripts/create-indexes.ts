/**
 * scripts/create-indexes.ts
 *
 * One-time / CI script to create MongoDB production indexes offline.
 * Disables runtime autoIndex in serverless to eliminate cold-start stalls.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/create-indexes.ts
 *   or:
 *   node scripts/create-indexes.js
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is missing.');
  process.exit(1);
}

async function createIndexes() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  console.log('\n📊 Creating Product indexes...');
  const products = db.collection('products');
  await products.createIndex({ slug: 1 }, { unique: true, background: true });
  await products.createIndex({ isPublished: 1, createdAt: -1 }, { background: true });
  await products.createIndex({ isPublished: 1, category: 1 }, { background: true });
  await products.createIndex({ isPublished: 1, price: 1 }, { background: true });
  await products.createIndex({ isPublished: 1, price: -1 }, { background: true });
  await products.createIndex({ title: 'text', description: 'text' }, { background: true });
  console.log('✅ Product indexes verified.');

  console.log('\n📊 Creating Category indexes...');
  const categories = db.collection('categories');
  await categories.createIndex({ slug: 1 }, { unique: true, background: true });
  await categories.createIndex({ isActive: 1 }, { background: true });
  console.log('✅ Category indexes verified.');

  console.log('\n📊 Creating BlogPost indexes...');
  const blogposts = db.collection('blogposts');
  await blogposts.createIndex({ slug: 1 }, { unique: true, background: true });
  await blogposts.createIndex({ isPublished: 1, publishedAt: -1 }, { background: true });
  console.log('✅ BlogPost indexes verified.');

  console.log('\n🎉 All indexes successfully created/verified!');
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB.');
}

createIndexes().catch((err) => {
  console.error('❌ Error creating indexes:', err);
  process.exit(1);
});

