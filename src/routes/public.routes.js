const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/* ==========================================
   🔹 GET PUBLISHED POSTS (Paginated)
========================================== */

router.get("/posts/published", async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    if (page <= 0) {
      return res.status(400).json({ message: "Invalid page number" });
    }

    const { rows } = await pool.query(
      `SELECT id, title, content, published_at
       FROM posts
       WHERE status='published'
       ORDER BY published_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return res.status(200).json({
      page,
      count: rows.length,
      posts: rows
    });

  } catch (err) {
    next(err);
  }
});


/* ==========================================
   🔹 GET SINGLE PUBLISHED POST (Cached)
========================================== */

router.get("/posts/published/:id", async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const redis = req.app.locals.redis;
    const cacheKey = `post:${postId}`;

    /* ✅ Check cache */
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    /* ✅ Fetch from DB */
    const { rows } = await pool.query(
      `SELECT id, title, content, published_at
       FROM posts
       WHERE id=$1 AND status='published'`,
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    /* ✅ Cache for 60 seconds */
    await redis.set(cacheKey, JSON.stringify(rows[0]), "EX", 60);

    return res.status(200).json(rows[0]);

  } catch (err) {
    next(err);
  }
});


/* ==========================================
   🔹 SEARCH PUBLISHED POSTS
========================================== */

router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({ message: "Search query required" });
    }

    const { rows } = await pool.query(
      `SELECT id, title, content, published_at
       FROM posts
       WHERE status='published'
       AND search_vector @@ plainto_tsquery($1)
       ORDER BY published_at DESC`,
      [q]
    );

    return res.status(200).json({
      count: rows.length,
      results: rows
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
