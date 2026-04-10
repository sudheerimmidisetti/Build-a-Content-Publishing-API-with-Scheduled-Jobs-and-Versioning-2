CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('author','public')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft','scheduled','published')),
    author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP NULL,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_revisions (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    title_snapshot TEXT NOT NULL,
    content_snapshot TEXT NOT NULL,
    revision_author_id INT NOT NULL REFERENCES users(id),
    revision_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
      to_tsvector('english', COALESCE(NEW.title,'') || ' ' || COALESCE(NEW.content,''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_search_vector_update
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);

CREATE INDEX IF NOT EXISTS idx_posts_search
ON posts USING GIN(search_vector);

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'author1',
  'author@example.com',
  '$2b$10$EED/AirHDLwIuvgkUj19NO/YK.k18d/U3vA8wyO/Hu4tTBOrB8SMy',
  'author'
)
ON CONFLICT (email) DO NOTHING;
