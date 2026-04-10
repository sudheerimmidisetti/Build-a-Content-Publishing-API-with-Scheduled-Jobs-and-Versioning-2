const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  maxRetriesPerRequest: null
});

const publishQueue = new Queue("publishQueue", {
  connection,
});

module.exports = publishQueue;
