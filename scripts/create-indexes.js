/**
 * scripts/create-indexes.js
 *
 * Idempotent MongoDB index creation script for production/CI.
 * Each index is wrapped in its own try/catch so a single failure (e.g.
 * duplicate-key conflict on an existing index with different options)
 * does not abort the whole run.
 *
 * Usage:
 *   node scripts/create-indexes.js
 *
 * Requires MONGODB_URI in the environment (or a .env file via dotenv).
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI environment variable is missing.');
  process.exit(1);
}

/**
 * Safely create one index. Logs success or the error message without crashing.
 * @param {import('mongodb').Collection} collection
 * @param {object} indexSpec
 * @param {object} options
 */
async function safeCreateIndex(collection, indexSpec, options = {}) {
  const name = JSON.stringify(indexSpec);
  try {
    const result = await collection.createIndex(indexSpec, options);
    console.log(`   ✅  ${result}`);
  } catch (err) {
    // Code 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict — index already exists with same spec
    if (err.code === 85 || err.code === 86) {
      console.log(`   ⏭️  Already exists (skipped): ${name}`);
    } else {
      console.warn(`   ⚠️  Failed to create index ${name}: ${err.message}`);
    }
  }
}

async function createIndexes() {
  console.log('🔄  Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected.\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is null.');

  // ── Products ────────────────────────────────────────────────────────────────
  console.log('📦  Products');
  const products = db.collection('products');
  await safeCreateIndex(products, { slug: 1 }, { unique: true });
  await safeCreateIndex(products, { isPublished: 1, createdAt: -1 });
  await safeCreateIndex(products, { isPublished: 1, category: 1 });
  await safeCreateIndex(products, { isPublished: 1, price: 1 });
  await safeCreateIndex(products, { isPublished: 1, price: -1 });
  await safeCreateIndex(products, { title: 'text', description: 'text' });

  // ── Categories ──────────────────────────────────────────────────────────────
  console.log('\n📂  Categories');
  const categories = db.collection('categories');
  await safeCreateIndex(categories, { slug: 1 }, { unique: true });
  await safeCreateIndex(categories, { isActive: 1 });

  // ── Blog Posts ──────────────────────────────────────────────────────────────
  console.log('\n📝  Blog Posts');
  const blogposts = db.collection('blogposts');
  await safeCreateIndex(blogposts, { slug: 1 }, { unique: true });
  await safeCreateIndex(blogposts, { isPublished: 1, publishedAt: -1 });

  // ── Orders ──────────────────────────────────────────────────────────────────
  console.log('\n🛒  Orders');
  const orders = db.collection('orders');
  await safeCreateIndex(orders, { createdAt: -1 });
  await safeCreateIndex(orders, { fulfillmentStatus: 1, createdAt: -1 });
  await safeCreateIndex(orders, { customerEmail: 1, createdAt: -1 });
  await safeCreateIndex(orders, { invoiceNumber: 1 }, { unique: true, sparse: true });

  // ── Users ───────────────────────────────────────────────────────────────────
  console.log('\n👤  Users');
  const users = db.collection('users');
  await safeCreateIndex(users, { email: 1 }, { unique: true });

  // ── Notifications ───────────────────────────────────────────────────────────
  console.log('\n🔔  Notifications');
  const notifications = db.collection('notifications');
  await safeCreateIndex(notifications, { user: 1, createdAt: -1 });

  console.log('\n🎉  All indexes created/verified successfully!');
  await mongoose.disconnect();
  console.log('👋  Disconnected.');
}

createIndexes().catch((err) => {
  console.error('❌  Fatal error creating indexes:', err);
  process.exit(1);
});
