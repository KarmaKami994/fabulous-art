ALTER TABLE products ADD COLUMN archived_at TEXT;
ALTER TABLE products ADD COLUMN archived_by TEXT;

CREATE INDEX IF NOT EXISTS idx_products_archived_at ON products(archived_at);
