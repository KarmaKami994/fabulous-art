PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE COLLATE NOCASE
    CHECK (length(uid) BETWEEN 1 AND 6 AND uid NOT GLOB '*[^A-Z0-9]*'),
  ware TEXT NOT NULL CHECK (ware IN ('Kunstwerk', 'Buch')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 160),
  typ TEXT NOT NULL DEFAULT '' CHECK (typ IN ('', 'Print', 'Postkarte')),
  limited_no INTEGER,
  limited_total INTEGER,
  size TEXT NOT NULL DEFAULT '' CHECK (length(size) <= 40),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'sold', 'unavailable')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  last_operation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (ware = 'Buch' AND typ = '' AND limited_no IS NULL AND limited_total IS NULL AND size = '')
    OR
    (ware = 'Kunstwerk' AND typ = 'Postkarte' AND limited_no IS NULL AND limited_total IS NULL AND size = '')
    OR
    (ware = 'Kunstwerk' AND typ = 'Print' AND limited_no > 0 AND limited_total > 0
      AND limited_no <= limited_total AND size <> '' AND stock_quantity BETWEEN 0 AND 1)
  )
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_ware_type ON products(ware, typ);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  seller_email TEXT NOT NULL,
  sold_at TEXT NOT NULL,
  reversed_at TEXT,
  reversed_by TEXT,
  reverse_operation_id TEXT UNIQUE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_active ON sales(product_id, reversed_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_product ON audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON audit_log(changed_at);

CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_imports_imported_at ON imports(imported_at);
