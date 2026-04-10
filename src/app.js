require("dotenv").config();
const express = require("express");
const Redis = require("ioredis");

const app = express();

/* ==============================
   🔹 REDIS CONNECTION (Docker Safe)
============================== */

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  maxRetriesPerRequest: null
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

// Make redis accessible in routes
app.locals.redis = redis;

/* ==============================
   🔹 MIDDLEWARE
============================== */

app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ==============================
   🔹 ROUTES
============================== */

const authRoutes = require("./routes/auth.routes");
const postsRoutes = require("./routes/posts.routes");
const mediaRoutes = require("./routes/media.routes");
const publicRoutes = require("./routes/public.routes");

app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);
app.use("/media", mediaRoutes);
app.use("/", publicRoutes);

/* ==============================
   🔹 GLOBAL ERROR HANDLER
============================== */

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

/* ==============================
   🔹 HEALTH CHECK
============================== */

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

module.exports = app;
