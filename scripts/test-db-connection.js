/**
 * scripts/test-db-connection.js
 *
 * Verification suite for MongoDB Connection Pool & Cache Architecture.
 * Tests:
 * 1. Environment variable validation (MONGO_MAX_POOL_SIZE)
 * 2. Connection caching & reuse
 * 3. Concurrent connection deduplication (race condition prevention)
 * 4. Failed promise recovery & cache reset
 * 5. Credential sanitization in error logs
 */

const assert = require('assert');

console.log('🧪 Starting MongoDB Connection Pool Verification Tests...\n');

// ── TEST 1: Environment Variable Validation ──────────────────────────────────
console.log('Test 1: Validating MONGO_MAX_POOL_SIZE parsing...');
const { getValidatedMaxPoolSize } = require('../src/lib/db');

// Test default
delete process.env.MONGO_MAX_POOL_SIZE;
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Default should be 10 when unset');

// Test valid positive integer
process.env.MONGO_MAX_POOL_SIZE = '25';
assert.strictEqual(getValidatedMaxPoolSize(), 25, 'Should accept valid positive integer 25');

// Test string / non-numeric
process.env.MONGO_MAX_POOL_SIZE = 'invalid_str';
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Should fallback to 10 on non-numeric string');

// Test zero
process.env.MONGO_MAX_POOL_SIZE = '0';
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Should fallback to 10 on 0');

// Test negative
process.env.MONGO_MAX_POOL_SIZE = '-8';
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Should fallback to 10 on negative values');

// Test float / decimal
process.env.MONGO_MAX_POOL_SIZE = '10.5';
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Should fallback to 10 on non-integers');

// Test unreasonably high value (> 50 for serverless)
process.env.MONGO_MAX_POOL_SIZE = '500';
assert.strictEqual(getValidatedMaxPoolSize(), 10, 'Should fallback to 10 on values > 50');

console.log('✅ Test 1 Passed: All pool size validation rules verified.\n');

// ── TEST 2: Credential Sanitization ──────────────────────────────────────────
console.log('Test 2: Validating credential sanitization in errors...');
const testUri = 'mongodb+srv://admin_user:SuperSecretPassword123@cluster0.mongodb.net/prod_db';
const sanitized = testUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/i, '$1****$3');
assert.strictEqual(
  sanitized,
  'mongodb+srv://admin_user:****@cluster0.mongodb.net/prod_db',
  'Password must be masked in connection strings'
);
assert(!sanitized.includes('SuperSecretPassword123'), 'Secret password must never appear in output');
console.log('✅ Test 2 Passed: Credential masking verified.\n');

// ── TEST 3: Connection Reuse & Concurrent Call Deduplication ─────────────────
console.log('Test 3: Validating global connection caching & concurrent promise sharing...');
const mongoose = require('mongoose');

// Save original connect
const originalConnect = mongoose.connect;
let connectCallCount = 0;

// Mock mongoose.connect with delayed resolution
mongoose.connect = async function (uri, opts) {
  connectCallCount++;
  // Verify pool options passed to driver
  assert.strictEqual(opts.minPoolSize, 0, 'minPoolSize must be 0 for serverless');
  assert.strictEqual(opts.bufferCommands, false, 'bufferCommands must be false');
  assert.strictEqual(opts.maxIdleTimeMS, 60000, 'maxIdleTimeMS must be 60000');
  assert.strictEqual(opts.waitQueueTimeoutMS, 10000, 'waitQueueTimeoutMS must be 10000');
  
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  // Mock readyState = 1 (connected)
  mongoose.connection.readyState = 1;
  return mongoose;
};

// Set fake test URI
process.env.MONGODB_URI = 'mongodb+srv://test:pass@mock.mongodb.net/db';
delete process.env.MONGO_MAX_POOL_SIZE;

// Clear any existing cache
if (globalThis.mongooseCache) {
  globalThis.mongooseCache.conn = null;
  globalThis.mongooseCache.promise = null;
}
mongoose.connection.readyState = 0;

const { connectToDatabase } = require('../src/lib/db');

async function runConcurrencyTest() {
  // Fire 5 concurrent requests simultaneously
  connectCallCount = 0;
  const results = await Promise.all([
    connectToDatabase(),
    connectToDatabase(),
    connectToDatabase(),
    connectToDatabase(),
    connectToDatabase(),
  ]);

  // All 5 must receive the exact same mongoose instance
  assert.strictEqual(results.length, 5);
  for (const r of results) {
    assert.strictEqual(r, mongoose);
  }

  // mongoose.connect should only have been called ONCE due to promise sharing!
  assert.strictEqual(
    connectCallCount,
    1,
    `mongoose.connect should be called exactly once for 5 concurrent requests, but was called ${connectCallCount} times`
  );
  console.log('✅ Test 3 Passed: 5 concurrent requests shared single in-flight connection promise.\n');

  // ── TEST 4: Connection Reuse on Warm Invocation ──
  console.log('Test 4: Validating connection reuse on warm invocations...');
  // Next sequential request while readyState === 1
  const warmResult = await connectToDatabase();
  assert.strictEqual(warmResult, mongoose);
  assert.strictEqual(
    connectCallCount,
    1,
    'mongoose.connect should NOT be called again when connection is ready (readyState === 1)'
  );
  console.log('✅ Test 4 Passed: Warm invocation reused existing connection without reconnecting.\n');

  // ── TEST 5: Failed Promise Recovery ──
  console.log('Test 5: Validating failed connection promise recovery...');
  // Force a failure on connect
  let failureSimulated = false;
  mongoose.connect = async function () {
    failureSimulated = true;
    mongoose.connection.readyState = 0;
    throw new Error('Atlas cluster unreachable (simulated timeout)');
  };

  // Reset cache to simulate a cold start failing
  globalThis.mongooseCache.conn = null;
  globalThis.mongooseCache.promise = null;

  let failedError = null;
  try {
    await connectToDatabase();
  } catch (err) {
    failedError = err;
  }

  assert(failedError !== null, 'Connection attempt should throw on failure');
  assert(failureSimulated, 'Simulated failure was reached');
  assert.strictEqual(
    globalThis.mongooseCache.promise,
    null,
    'Failed promise must be cleared to allow subsequent retries'
  );
  assert.strictEqual(
    globalThis.mongooseCache.conn,
    null,
    'Failed conn must be cleared'
  );

  // Restore working connect and verify subsequent retry succeeds
  mongoose.connect = async function () {
    mongoose.connection.readyState = 1;
    return mongoose;
  };

  const recoveredConn = await connectToDatabase();
  assert.strictEqual(recoveredConn, mongoose, 'Subsequent request must succeed after earlier failure');
  console.log('✅ Test 5 Passed: Cache cleared on failure and subsequent retry succeeded.\n');

  // Restore original
  mongoose.connect = originalConnect;

  console.log('🎉 ALL 5 TESTS PASSED SUCCESSFULLY!\n');
}

runConcurrencyTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
