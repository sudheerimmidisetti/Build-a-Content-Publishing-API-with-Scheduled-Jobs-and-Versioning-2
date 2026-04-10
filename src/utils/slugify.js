const slugify = require("slugify");

module.exports = async (title, pool) => {
  let baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { rows } = await pool.query(
      "SELECT id FROM posts WHERE slug=$1",
      [slug]
    );
    if (rows.length === 0) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
};
