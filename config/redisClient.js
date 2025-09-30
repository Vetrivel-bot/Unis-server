// config/redisClient.js
const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();

async function connectRedis() {
  await pubClient.connect();
  await subClient.connect();
  console.log('✅ Redis connected');
}

module.exports = { pubClient, subClient, connectRedis };
