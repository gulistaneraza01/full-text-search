-- Generated tsvector: name weighted highest (A), then description (B), then type (C).
-- Postgres keeps it up to date on every insert/update.
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce("type", '')), 'C')
  ) STORED;

-- CreateIndex
CREATE INDEX "products_search_vector_idx" ON "products" USING GIN ("search_vector");
