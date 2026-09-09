require('dotenv').config({ path: '.env' });
const { Redis } = require('@upstash/redis');

async function testRedis() {
  console.log('====================================');
  console.log('Testing Upstash Redis Connection...');
  console.log('====================================\n');

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(' ERROR: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in your .env file.');
    console.log('Please make sure you have added them and saved the file.');
    process.exit(1);
  }

  try {
    const redis = new Redis({
      url: url,
      token: token,
    });

    console.log(` Ping sent to: ${url}`);

    // 1. Write a test key
    console.log(' Writing test data...');
    await redis.set('upstash_test', 'Connection successful! ✅');

    // 2. Read it back
    console.log(' Reading test data...');
    const value = await redis.get('upstash_test');

    if (value) {
      console.log(`\n SUCCESS! Result: ${value}\n`);
    } else {
      console.log(`\n Got null instead of the expected value.\n`);
    }

    // 3. Clean up
    await redis.del('upstash_test');
    console.log('🧹 Cleanup complete. Test key deleted.');

  } catch (error) {
    console.error('\n CONNECTION FAILED:');
    console.error(error.message);
    console.error('\nPlease double check that your REST URL and TOKEN are exactly as copied from the Upstash dashboard.');
  }
}

testRedis();
