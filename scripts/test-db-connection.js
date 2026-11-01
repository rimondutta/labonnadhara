/**
 * scripts/test-db-connection.js
 *
 * Production verification suite for MongoDB Connection Pool & Cache Architecture.
 * Tests:
 * 1. Environment variable validation (MONGO_MAX_POOL_SIZE)
 * 2. Credential sanitization in error logs (mongodb:// and mongodb+srv://)
 * 3. Connection state handling (readyState 0, 1, 2)
 * 4. Concurrent connection deduplication (race condition prevention)
 * 5. Warm connection reuse
 * 6. Disconnection event handling and re-connect
 * 7. Failed promise recovery & cache reset
 * 8. Driver pool & timeout options verification
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');

// Support '@/...' imports in node without extra dependencies
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const relative = request.slice(2);
    const resolvedPath = path.resolve(__dirname, '../src', relative);
    return originalResolve.call(this, resolvedPath, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

console.log('🧪 Starting MongoDB Connection Pool Verification Tests...\n');

// ── TEST 1: Environment Variable Validation ──────────────────────────────────
console.log('Test 1: Validating MONGO_MAX_POOL_SIZE parsing & boundaries...');
const { getValidatedMaxPoolSize, sanitizeErrorMessage } = require('../src/lib/db.ts');

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
console.log('Test 2: Validating credential sanitization in error messages...');

// mongodb+srv with username and password
const srvUri = 'mongodb+srv://admin_user:SuperSecretPassword123@cluster0.mongodb.net/prod_db';
const srvSanitized = sanitizeErrorMessage(srvUri);
assert.strictEqual(
  srvSanitized,
  'mongodb+srv://****:****@cluster0.mongodb.net/prod_db',
  'Username and password must be masked in mongodb+srv://'
);
assert(!srvSanitized.includes('admin_user'), 'Username must not leak');
assert(!srvSanitized.includes('SuperSecretPassword123'), 'Password must not leak');

// standard mongodb:// with username and password
const standardUri = 'mongodb://dbuser:MySecretPass@10.0.0.1:27017,10.0.0.2:27017/prod_db';
const standardSanitized = sanitizeErrorMessage(standardUri);
assert.strictEqual(
  standardSanitized,
  'mongodb://****:****@10.0.0.1:27017,10.0.0.2:27017/prod_db',
  'Username and password must be masked in mongodb://'
);

// standard error message without URI
const standardError = 'Server selection timed out after 5000 ms';
assert.strictEqual(
  sanitizeErrorMessage(standardError),
  standardError,
  'Non-URI error messages should remain intact'
);

console.log('✅ Test 2 Passed: Credential masking verified for both mongodb:// and mongodb+srv://.\n');

// ── TEST 3: Connection Reuse & Concurrent Call Deduplication ─────────────────
console.log('Test 3: Validating global connection caching & concurrent promise sharing...');
const mongoose = require('mongoose');

// Save original connect
const originalConnect = mongoose.connect;
let connectCallCount = 0;

// Mock mongoose.connect to reflect real Mongoose behavior
mongoose.connect = async function (uri, opts) {
  connectCallCount++;
  // Real Mongoose synchronously sets readyState = 2 (connecting)
  mongoose.connection.readyState = 2;

  // Verify driver options passed
  assert.strictEqual(opts.minPoolSize, 0, 'minPoolSize must be 0 for serverless');
  assert.strictEqual(opts.bufferCommands, false, 'bufferCommands must be false');
  assert.strictEqual(opts.maxIdleTimeMS, 60000, 'maxIdleTimeMS must be 60000');
  assert.strictEqual(opts.waitQueueTimeoutMS, 10000, 'waitQueueTimeoutMS must be 10000');
  assert.strictEqual(opts.serverSelectionTimeoutMS, 5000, 'serverSelectionTimeoutMS must be 5000');
  assert.strictEqual(opts.connectTimeoutMS, 5000, 'connectTimeoutMS must be 5000');
  assert.strictEqual(opts.socketTimeoutMS, 45000, 'socketTimeoutMS must be 45000');
  
  // Simulate network handshake
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  // Transition readyState to 1 (connected)
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

const { connectToDatabase } = require('../src/lib/db.ts');

async function runVerification() {
  // Fire 5 concurrent requests simultaneously while cold
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

  // ── TEST 5: Disconnected Event Recovery ──
  console.log('Test 5: Validating disconnected event & state recovery...');
  // Simulate disconnection event from Atlas
  mongoose.connection.readyState = 0;
  mongoose.connection.emit('disconnected');

  // Next request should detect disconnection, clear stale reference, and re-connect cleanly
  const reconnected = await connectToDatabase();
  assert.strictEqual(reconnected, mongoose);
  assert.strictEqual(
    connectCallCount,
    2,
    'mongoose.connect should be invoked again when connection was previously disconnected'
  );
  console.log('✅ Test 5 Passed: Disconnected event correctly evicted stale cache and triggered fresh connection.\n');

  // ── TEST 6: Failed Promise Recovery ──
  console.log('Test 6: Validating failed connection promise recovery...');
  // Force a failure on connect
  let failureSimulated = false;
  mongoose.connect = async function () {
    failureSimulated = true;
    mongoose.connection.readyState = 0;
    throw new Error('Atlas cluster unreachable (simulated timeout on mongodb+srv://usr:pwd@cluster.net/db)');
  };

  // Reset cache to simulate a cold start failing
  globalThis.mongooseCache.conn = null;
  globalThis.mongooseCache.promise = null;
  mongoose.connection.readyState = 0;

  let failedError = null;
  try {
    await connectToDatabase();
  } catch (err) {
    failedError = err;
  }

  assert(failedError !== null, 'Connection attempt should throw on failure');
  assert(failureSimulated, 'Simulated failure was reached');
  assert(
    !failedError.message.includes('pwd'),
    'Credentials must be sanitized in thrown error'
  );
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
  console.log('✅ Test 6 Passed: Cache cleared on failure and subsequent retry succeeded.\n');

  // Restore original
  mongoose.connect = originalConnect;

  console.log('🎉 ALL 6 COMPREHENSIVE PRODUCTION TESTS PASSED SUCCESSFULLY!\n');
}

runVerification().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
