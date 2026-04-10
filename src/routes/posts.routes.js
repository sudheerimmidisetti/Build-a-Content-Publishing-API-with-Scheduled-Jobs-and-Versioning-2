const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const pool = require("../config/db");
const generateUniqueSlug = require("../utils/slugify");

/* CREATE POST */
router.post("/", auth, role("author"), async (req, res, next) => {
  try {
    const { title, content, scheduled_for } = req.body;
    const status = 'draft';

    const slug = await generateUniqueSlug(title, pool);

    const { rows } = await pool.query(
      `INSERT INTO posts (title, slug, content, status, author_id, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        slug,
        content,
        status,
        req.user.id,
        scheduled_for || null
      ]
    );

    res.status(201).json(rows[0]);

  } catch (err) {
    next(err);
  }
});

/* UPDATE POST */
router.put("/:id", auth, role("author"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const postId = Number(req.params.id);
    const { title, content } = req.body;

    await client.query("BEGIN");

    const postRes = await client.query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (postRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Post not found" });
    }

    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Forbidden: Not the author" });
    }

    await client.query(
      `INSERT INTO post_revisions (post_id, title_snapshot, content_snapshot, revision_author_id)
       VALUES ($1, $2, $3, $4)`,
      [postId, post.title, post.content, req.user.id]
    );

    let slug = post.slug;
    if (title && title !== post.title) {
        slug = await generateUniqueSlug(title, client);
    }

    const updateRes = await client.query(
      `UPDATE posts SET title = COALESCE($1, title), slug = $2, content = COALESCE($3, content), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [title, slug, content, postId]
    );

    await client.query("COMMIT");

    if (req.app.locals.redis) {
      await req.app.locals.redis.del(`post:${postId}`);
    }

    res.status(200).json(updateRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

/* DELETE POST */
router.delete("/:id", auth, role("author"), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    
    const postRes = await pool.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not the author" });
    }

    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);

    if (req.app.locals.redis) {
      await req.app.locals.redis.del(`post:${postId}`);
    }

    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    next(err);
  }
});

/* PUBLISH POST */
router.post("/:id/publish", auth, role("author"), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    const postRes = await pool.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not the author" });
    }

    const updateRes = await pool.query(
      `UPDATE posts SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [postId]
    );

    if (req.app.locals.redis) {
      await req.app.locals.redis.del(`post:${postId}`);
    }

    res.status(200).json(updateRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* SCHEDULE POST */
router.post("/:id/schedule", auth, role("author"), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const { scheduled_for } = req.body;

    const postRes = await pool.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not the author" });
    }

    const updateRes = await pool.query(
      `UPDATE posts SET status = 'scheduled', scheduled_for = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [scheduled_for, postId]
    );

    if (req.app.locals.redis) {
      await req.app.locals.redis.del(`post:${postId}`);
    }

    res.status(200).json(updateRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* GET REVISIONS */
router.get("/:id/revisions", auth, role("author"), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    const postRes = await pool.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
    if (postRes.rows.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }
    const post = postRes.rows[0];
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: Not the author" });
    }

    const { rows } = await pool.query(
      "SELECT * FROM post_revisions WHERE post_id = $1 ORDER BY revision_timestamp DESC",
      [postId]
    );
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
