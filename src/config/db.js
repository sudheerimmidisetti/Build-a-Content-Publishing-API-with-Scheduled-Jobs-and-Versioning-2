const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  user: process.env.DB_USER || "cms_user",
  password: process.env.DB_PASSWORD || "cms_pass",
  database: process.env.DB_NAME || "cms_db",
  port: 5432,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error:", err.message);
});

module.exports = pool;
