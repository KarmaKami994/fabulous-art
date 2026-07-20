-- Nur für die lokale Entwicklung. Nicht auf der Produktionsdatenbank ausführen.
DELETE FROM audit_log;
DELETE FROM sales;
DELETE FROM imports;
DELETE FROM products;

INSERT INTO products
  (uid, ware, name, typ, limited_no, limited_total, size, stock_quantity, price_cents, status, version, created_at, updated_at)
VALUES
  ('P00001', 'Kunstwerk', 'Blue Horizon', 'Print', 1, 10, 'A3', 0, 12000, 'sold', 1, datetime('now'), datetime('now')),
  ('P00002', 'Kunstwerk', 'Blue Horizon', 'Print', 2, 10, 'A3', 0, 12000, 'sold', 1, datetime('now'), datetime('now')),
  ('P00003', 'Kunstwerk', 'Blue Horizon', 'Print', 3, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00004', 'Kunstwerk', 'Blue Horizon', 'Print', 4, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00005', 'Kunstwerk', 'Blue Horizon', 'Print', 5, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00006', 'Kunstwerk', 'Blue Horizon', 'Print', 6, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00007', 'Kunstwerk', 'Blue Horizon', 'Print', 7, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00008', 'Kunstwerk', 'Blue Horizon', 'Print', 8, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00009', 'Kunstwerk', 'Blue Horizon', 'Print', 9, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('P00010', 'Kunstwerk', 'Blue Horizon', 'Print', 10, 10, 'A3', 1, 12000, 'available', 1, datetime('now'), datetime('now')),
  ('K00001', 'Kunstwerk', 'Blue Horizon', 'Postkarte', NULL, NULL, '', 48, 800, 'available', 1, datetime('now'), datetime('now')),
  ('B00001', 'Buch', 'Ausstellungskatalog 2026', '', NULL, NULL, '', 24, 3900, 'available', 1, datetime('now'), datetime('now'));

INSERT INTO sales (operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
SELECT 'seed-sale-p1', id, 1, price_cents, 'demo@fabulous-art.ch', datetime('now') FROM products WHERE uid = 'P00001';
INSERT INTO sales (operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
SELECT 'seed-sale-p2', id, 1, price_cents, 'demo@fabulous-art.ch', datetime('now') FROM products WHERE uid = 'P00002';
INSERT INTO sales (operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
SELECT 'seed-sale-k1', id, 1, price_cents, 'demo@fabulous-art.ch', datetime('now') FROM products WHERE uid = 'K00001';
INSERT INTO sales (operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
SELECT 'seed-sale-k2', id, 1, price_cents, 'demo@fabulous-art.ch', datetime('now') FROM products WHERE uid = 'K00001';
INSERT INTO sales (operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
SELECT 'seed-sale-b1', id, 1, price_cents, 'demo@fabulous-art.ch', datetime('now') FROM products WHERE uid = 'B00001';
