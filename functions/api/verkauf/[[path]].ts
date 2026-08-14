/// <reference types="@cloudflare/workers-types" />
import { authenticateShopRequest, isLocalDevBypass, type ShopAuthEnv } from '../../../src/lib/shop/auth';
import {
  PRODUCT_EXPORT_HEADERS,
  assertImportStatusTransition,
  exportStatusLabel,
  limitedLabel,
  validateImportRows,
  validateUid,
} from '../../../src/lib/shop/validation';
import type { ImportProduct, ProductStatus, ShopProduct, TabularExport } from '../../../src/lib/shop/types';

interface Env extends ShopAuthEnv {
  SHOP_DB: D1Database;
}

type JsonRecord = Record<string, unknown>;

interface ProductHistorySummary {
  sale_records: number;
  active_sales_count: number;
  revenue_cents: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(status: number, body: JsonRecord): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function routeParts(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function assertSameOrigin(request: Request, env: Env): void {
  if (isLocalDevBypass(request, env)) return;
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    throw new ApiError(403, 'Ungültige Herkunft der Anfrage.');
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('Content-Length') || '0');
  if (contentLength > 1024 * 1024) throw new ApiError(413, 'Anfrage ist zu gross.');
  try {
    const value = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Ungültige JSON-Anfrage.');
  }
}

function asProduct(row: unknown): ShopProduct {
  return row as ShopProduct;
}

function productExportRows(products: ShopProduct[]): TabularExport['rows'] {
  return products.map((product) => [
    product.uid,
    product.ware,
    product.name,
    product.typ,
    limitedLabel(product),
    product.size,
    product.typ === 'Print' ? '' : product.stock_quantity,
    product.price_cents / 100,
    exportStatusLabel(product.status),
  ]);
}

async function getProductByUid(db: D1Database, uid: string): Promise<ShopProduct | null> {
  const row = await db.prepare('SELECT * FROM products WHERE uid = ? COLLATE NOCASE').bind(uid).first();
  return row ? asProduct(row) : null;
}

async function getProductHistory(db: D1Database, productId: number): Promise<ProductHistorySummary> {
  const row = await db.prepare(`
    SELECT
      COUNT(*) AS sale_records,
      COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN quantity ELSE 0 END), 0) AS active_sales_count,
      COALESCE(SUM(CASE WHEN reversed_at IS NULL THEN quantity * unit_price_cents ELSE 0 END), 0) AS revenue_cents
    FROM sales
    WHERE product_id = ?
  `).bind(productId).first<Record<string, unknown>>();

  return {
    sale_records: Number(row?.sale_records || 0),
    active_sales_count: Number(row?.active_sales_count || 0),
    revenue_cents: Number(row?.revenue_cents || 0),
  };
}

async function productResponse(db: D1Database, uid: string): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  const history = await getProductHistory(db, product.id);
  return json(200, { success: true, product, history });
}

async function handleDashboard(db: D1Database, email: string): Promise<Response> {
  const totals = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM products WHERE archived_at IS NULL) AS skus,
      (SELECT COALESCE(SUM(stock_quantity), 0) FROM products
        WHERE archived_at IS NULL AND status = 'available') AS stock,
      (SELECT COALESCE(SUM(quantity), 0) FROM sales WHERE reversed_at IS NULL) AS sales_count,
      (SELECT COALESCE(SUM(quantity * unit_price_cents), 0) FROM sales WHERE reversed_at IS NULL) AS revenue_cents
  `).first();

  return json(200, { success: true, user: { email }, totals: totals || {} });
}

async function handleInventory(db: D1Database, archived: boolean): Promise<Response> {
  const where = archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
  const result = await db.prepare(`
    SELECT * FROM products
    WHERE ${where}
    ORDER BY ware, typ, name, limited_no, uid
    LIMIT 1000
  `).all();
  const products = (result.results || []).map(asProduct);
  const stock = archived
    ? 0
    : products.reduce(
      (sum, product) => sum + (product.status === 'available' ? Number(product.stock_quantity || 0) : 0),
      0,
    );
  return json(200, { success: true, products, archived, totals: { rows: products.length, stock } });
}

async function handleSales(db: D1Database): Promise<Response> {
  const [summaryResult, detailsResult, total] = await Promise.all([
    db.prepare(`
      SELECT p.ware, p.typ, COALESCE(SUM(s.quantity), 0) AS quantity,
             COALESCE(SUM(s.quantity * s.unit_price_cents), 0) AS revenue_cents
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.reversed_at IS NULL
      GROUP BY p.ware, p.typ
      ORDER BY p.ware, p.typ
    `).all(),
    db.prepare(`
      SELECT s.id, s.quantity, s.unit_price_cents, s.seller_email, s.sold_at,
             p.uid, p.ware, p.name, p.typ, p.size, p.limited_no, p.limited_total
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.reversed_at IS NULL
      ORDER BY s.sold_at DESC, s.id DESC
      LIMIT 1000
    `).all(),
    db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) AS quantity,
             COALESCE(SUM(quantity * unit_price_cents), 0) AS revenue_cents
      FROM sales WHERE reversed_at IS NULL
    `).first(),
  ]);

  return json(200, {
    success: true,
    summary: summaryResult.results || [],
    details: detailsResult.results || [],
    total: total || { quantity: 0, revenue_cents: 0 },
  });
}

async function handleSell(db: D1Database, uid: string, email: string): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  if (product.archived_at) throw new ApiError(409, 'Archivierte Artikel können nicht verkauft werden.');
  if (product.status === 'unavailable') throw new ApiError(409, 'Dieses Produkt ist nicht an Lager.');
  if (product.status === 'sold' || product.stock_quantity <= 0) {
    throw new ApiError(409, 'Kein verfügbarer Bestand vorhanden.');
  }

  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();
  await db.batch([
    db.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity - 1,
          status = CASE WHEN stock_quantity - 1 = 0 THEN 'sold' ELSE 'available' END,
          version = version + 1,
          last_operation_id = ?,
          updated_at = ?
      WHERE id = ? AND version = ? AND archived_at IS NULL
        AND status = 'available' AND stock_quantity > 0
    `).bind(operationId, stamp, product.id, product.version),
    db.prepare(`
      INSERT INTO sales(operation_id, product_id, quantity, unit_price_cents, seller_email, sold_at)
      SELECT ?, id, 1, price_cents, ?, ?
      FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(operationId, email, stamp, product.id, operationId),
    db.prepare(`
      INSERT INTO audit_log(operation_id, product_id, action, details, changed_by, changed_at)
      SELECT ?, id, 'sale', '1 Einheit verkauft', ?, ?
      FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(operationId, email, stamp, product.id, operationId),
  ]);

  const sale = await db.prepare('SELECT id FROM sales WHERE operation_id = ?').bind(operationId).first();
  if (!sale) throw new ApiError(409, 'Der Bestand wurde zwischenzeitlich geändert. Bitte erneut versuchen.');
  const updated = await getProductByUid(db, uid);
  return json(200, { success: true, message: `${uid} wurde als Verkauf erfasst.`, product: updated });
}

async function handleReverse(db: D1Database, uid: string, email: string): Promise<Response> {
  const row = await db.prepare(`
    SELECT p.*,
           s.id AS sale_id,
           s.quantity AS sale_quantity
    FROM products p
    LEFT JOIN sales s ON s.id = (
      SELECT id FROM sales
      WHERE product_id = p.id AND reversed_at IS NULL
      ORDER BY sold_at DESC, id DESC
      LIMIT 1
    )
    WHERE p.uid = ? COLLATE NOCASE
  `).bind(uid).first<Record<string, unknown>>();

  if (!row) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  if (!row.sale_id) throw new ApiError(409, 'Für dieses Produkt gibt es keinen aktiven Verkauf.');

  const product = asProduct(row);
  const saleId = Number(row.sale_id);
  const quantity = Number(row.sale_quantity || 1);
  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();

  await db.batch([
    db.prepare(`
      UPDATE products
      SET stock_quantity = stock_quantity + ?,
          status = CASE WHEN status = 'unavailable' THEN 'unavailable' ELSE 'available' END,
          version = version + 1,
          last_operation_id = ?,
          updated_at = ?
      WHERE id = ? AND version = ?
        AND EXISTS (SELECT 1 FROM sales WHERE id = ? AND reversed_at IS NULL)
    `).bind(quantity, operationId, stamp, product.id, product.version, saleId),
    db.prepare(`
      UPDATE sales
      SET reversed_at = ?, reversed_by = ?, reverse_operation_id = ?
      WHERE id = ? AND reversed_at IS NULL
        AND EXISTS (SELECT 1 FROM products WHERE id = ? AND last_operation_id = ?)
    `).bind(stamp, email, operationId, saleId, product.id, operationId),
    db.prepare(`
      INSERT INTO audit_log(operation_id, product_id, action, details, changed_by, changed_at)
      SELECT ?, id, 'reverse_sale', 'Letzten Verkauf rückgängig gemacht', ?, ?
      FROM products
      WHERE id = ? AND last_operation_id = ?
        AND EXISTS (SELECT 1 FROM sales WHERE id = ? AND reverse_operation_id = ?)
    `).bind(operationId, email, stamp, product.id, operationId, saleId, operationId),
  ]);

  const reversed = await db.prepare('SELECT id FROM sales WHERE reverse_operation_id = ?').bind(operationId).first();
  if (!reversed) throw new ApiError(409, 'Der Verkauf wurde zwischenzeitlich geändert. Bitte erneut laden.');
  const updated = await getProductByUid(db, uid);
  return json(200, { success: true, message: `Letzter Verkauf von ${uid} wurde rückgängig gemacht.`, product: updated });
}

async function handleStatus(
  db: D1Database,
  uid: string,
  request: Request,
  email: string,
): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  if (product.archived_at) throw new ApiError(409, 'Archivierte Artikel müssen zuerst reaktiviert werden.');
  if (product.status === 'sold') {
    throw new ApiError(409, 'Verkaufte Artikel können nicht manuell umgestellt werden. Bestand zuerst durch Rückbuchung oder Import wiederherstellen.');
  }

  const body = await readJson(request);
  const status = String(body.status || '') as ProductStatus;
  if (status !== 'available' && status !== 'unavailable') {
    throw new ApiError(400, 'Manuell erlaubt sind nur Verfügbar und Nicht an Lager. Verkauft wird automatisch gesetzt.');
  }
  if (status === 'available' && product.stock_quantity <= 0) {
    throw new ApiError(409, 'Ein Artikel mit Bestand 0 kann nicht auf Verfügbar gesetzt werden.');
  }
  if (product.status === status) {
    return json(200, { success: true, message: `${uid} hat bereits diesen Status.`, product });
  }

  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();
  const label = status === 'available' ? 'Verfügbar' : 'Nicht an Lager';
  await db.batch([
    db.prepare(`
      UPDATE products
      SET status = ?, version = version + 1, last_operation_id = ?, updated_at = ?
      WHERE id = ? AND version = ? AND archived_at IS NULL AND status <> 'sold'
    `).bind(status, operationId, stamp, product.id, product.version),
    db.prepare(`
      INSERT INTO audit_log(operation_id, product_id, action, details, changed_by, changed_at)
      SELECT ?, id, 'status_change', ?, ?, ?
      FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(operationId, `Status manuell auf ${label} gesetzt`, email, stamp, product.id, operationId),
  ]);

  const changed = await db.prepare('SELECT id FROM products WHERE id = ? AND last_operation_id = ?')
    .bind(product.id, operationId).first();
  if (!changed) throw new ApiError(409, 'Der Artikel wurde zwischenzeitlich geändert. Bitte erneut laden.');
  const updated = await getProductByUid(db, uid);
  return json(200, { success: true, message: `${uid} wurde auf ${label} gesetzt.`, product: updated });
}

async function handleArchive(db: D1Database, uid: string, email: string): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  if (product.archived_at) throw new ApiError(409, 'Dieser Artikel ist bereits archiviert.');

  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();
  await db.batch([
    db.prepare(`
      UPDATE products
      SET archived_at = ?, archived_by = ?, version = version + 1,
          last_operation_id = ?, updated_at = ?
      WHERE id = ? AND version = ? AND archived_at IS NULL
    `).bind(stamp, email, operationId, stamp, product.id, product.version),
    db.prepare(`
      INSERT INTO audit_log(operation_id, product_id, action, details, changed_by, changed_at)
      SELECT ?, id, 'archive', 'Artikel archiviert', ?, ?
      FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(operationId, email, stamp, product.id, operationId),
  ]);

  const changed = await db.prepare('SELECT id FROM products WHERE id = ? AND last_operation_id = ?')
    .bind(product.id, operationId).first();
  if (!changed) throw new ApiError(409, 'Der Artikel wurde zwischenzeitlich geändert. Bitte erneut laden.');
  const updated = await getProductByUid(db, uid);
  return json(200, { success: true, message: `${uid} wurde archiviert. Die Verkaufshistorie bleibt erhalten.`, product: updated });
}

async function handleReactivate(db: D1Database, uid: string, email: string): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');
  if (!product.archived_at) throw new ApiError(409, 'Dieser Artikel ist nicht archiviert.');

  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();
  await db.batch([
    db.prepare(`
      UPDATE products
      SET archived_at = NULL,
          archived_by = NULL,
          status = CASE
            WHEN stock_quantity = 0 AND status = 'available' THEN 'unavailable'
            ELSE status
          END,
          version = version + 1,
          last_operation_id = ?,
          updated_at = ?
      WHERE id = ? AND version = ? AND archived_at IS NOT NULL
    `).bind(operationId, stamp, product.id, product.version),
    db.prepare(`
      INSERT INTO audit_log(operation_id, product_id, action, details, changed_by, changed_at)
      SELECT ?, id, 'reactivate', 'Artikel reaktiviert', ?, ?
      FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(operationId, email, stamp, product.id, operationId),
  ]);

  const changed = await db.prepare('SELECT id FROM products WHERE id = ? AND last_operation_id = ?')
    .bind(product.id, operationId).first();
  if (!changed) throw new ApiError(409, 'Der Artikel wurde zwischenzeitlich geändert. Bitte erneut laden.');
  const updated = await getProductByUid(db, uid);
  return json(200, { success: true, message: `${uid} wurde reaktiviert.`, product: updated });
}

async function handleDelete(
  db: D1Database,
  uid: string,
  request: Request,
): Promise<Response> {
  const product = await getProductByUid(db, uid);
  if (!product) throw new ApiError(404, 'Produkt wurde nicht gefunden.');

  const body = await readJson(request);
  let confirmation: string;
  try {
    confirmation = validateUid(body.confirm_uid);
  } catch {
    throw new ApiError(400, 'Zur Bestätigung muss die vollständige UID eingegeben werden.');
  }
  if (confirmation !== uid) throw new ApiError(400, 'Die eingegebene UID stimmt nicht überein.');

  const history = await getProductHistory(db, product.id);
  const operationId = crypto.randomUUID();
  const stamp = new Date().toISOString();

  // Der Marker schützt die gesamte Löschkette vor konkurrierenden Änderungen.
  // Alle Folgestatements wirken nur, wenn das optimistische Versions-Update erfolgreich war.
  await db.batch([
    db.prepare(`
      UPDATE products
      SET version = version + 1, last_operation_id = ?, updated_at = ?
      WHERE id = ? AND version = ?
    `).bind(operationId, stamp, product.id, product.version),
    db.prepare(`
      DELETE FROM audit_log
      WHERE product_id IN (SELECT id FROM products WHERE id = ? AND last_operation_id = ?)
    `).bind(product.id, operationId),
    db.prepare(`
      DELETE FROM sales
      WHERE product_id IN (SELECT id FROM products WHERE id = ? AND last_operation_id = ?)
    `).bind(product.id, operationId),
    db.prepare(`
      DELETE FROM products WHERE id = ? AND last_operation_id = ?
    `).bind(product.id, operationId),
  ]);

  const remaining = await getProductByUid(db, uid);
  if (remaining) throw new ApiError(409, 'Der Artikel wurde zwischenzeitlich geändert und nicht gelöscht. Bitte erneut versuchen.');

  return json(200, {
    success: true,
    message: `${uid} wurde endgültig gelöscht. Zugehörige Verkaufshistorie wurde ebenfalls entfernt.`,
    deleted: {
      uid,
      sale_records: history.sale_records,
      sales_count: history.active_sales_count,
      revenue_cents: history.revenue_cents,
    },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function existingProductStatuses(db: D1Database, uids: string[]): Promise<Map<string, ProductStatus>> {
  const found = new Map<string, ProductStatus>();
  for (const group of chunk(uids, 100)) {
    const placeholders = group.map(() => '?').join(',');
    const result = await db.prepare(`SELECT uid, status FROM products WHERE uid IN (${placeholders})`)
      .bind(...group)
      .all<{ uid: string; status: ProductStatus }>();
    for (const row of result.results || []) found.set(row.uid.toUpperCase(), row.status);
  }
  return found;
}

function makeUpsertStatement(db: D1Database, items: ImportProduct[], stamp: string): D1PreparedStatement {
  const columns = [
    'uid', 'ware', 'name', 'typ', 'limited_no', 'limited_total',
    'size', 'stock_quantity', 'price_cents', 'status', 'created_at', 'updated_at',
  ];
  const valuesSql = items.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const bindings: unknown[] = [];
  for (const item of items) {
    bindings.push(
      item.uid, item.ware, item.name, item.typ, item.limited_no, item.limited_total,
      item.size, item.stock_quantity, item.price_cents, item.status, stamp, stamp,
    );
  }

  return db.prepare(`
    INSERT INTO products (${columns.join(',')}) VALUES ${valuesSql}
    ON CONFLICT(uid) DO UPDATE SET
      ware = excluded.ware,
      name = excluded.name,
      typ = excluded.typ,
      limited_no = excluded.limited_no,
      limited_total = excluded.limited_total,
      size = excluded.size,
      stock_quantity = excluded.stock_quantity,
      price_cents = excluded.price_cents,
      status = excluded.status,
      version = products.version + 1,
      last_operation_id = NULL,
      updated_at = excluded.updated_at
  `).bind(...bindings);
}

async function handleImport(db: D1Database, request: Request, email: string): Promise<Response> {
  const body = await readJson(request);
  const rawRows = body.rows;
  if (!Array.isArray(rawRows)) throw new ApiError(400, 'Tabellenzeilen fehlen.');
  const rows = rawRows.map((row) => Array.isArray(row) ? row : [row]);
  let products: ImportProduct[];
  try {
    products = validateImportRows(rows);
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Importdatei ist ungültig.');
  }

  const filename = String(body.filename || 'import').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 160);
  const existing = await existingProductStatuses(db, products.map((product) => product.uid));
  try {
    for (const product of products) {
      assertImportStatusTransition(product.uid, existing.get(product.uid) ?? null, product.status);
    }
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Ungültiger Statuswechsel im Import.');
  }
  const created = products.filter((product) => !existing.has(product.uid)).length;
  const updated = products.length - created;
  const stamp = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const statements = chunk(products, 8).map((group) => makeUpsertStatement(db, group, stamp));
  statements.push(
    db.prepare(`
      INSERT INTO imports(operation_id, filename, uploaded_by, created_count, updated_count, row_count, imported_at, status)
      VALUES(?, ?, ?, ?, ?, ?, ?, 'completed')
    `).bind(operationId, filename, email, created, updated, products.length, stamp),
  );

  await db.batch(statements);
  return json(200, {
    success: true,
    message: `Import abgeschlossen: ${created} neu, ${updated} aktualisiert.`,
    created,
    updated,
    rows: products.length,
  });
}

async function allProducts(db: D1Database): Promise<ShopProduct[]> {
  const result = await db.prepare(`
    SELECT * FROM products
    WHERE archived_at IS NULL
    ORDER BY ware, typ, name, limited_no, uid
    LIMIT 1000
  `).all();
  return (result.results || []).map(asProduct);
}

async function handleExport(db: D1Database, kind: string): Promise<Response> {
  let output: TabularExport;
  if (kind === 'products' || kind === 'inventory') {
    const products = await allProducts(db);
    output = {
      filename: kind === 'inventory' ? 'aktueller-bestand' : 'produktdaten',
      sheetName: kind === 'inventory' ? 'Bestand' : 'Produkte',
      headers: [...PRODUCT_EXPORT_HEADERS],
      rows: productExportRows(products),
    };
  } else if (kind === 'template') {
    output = {
      filename: 'import-vorlage',
      sheetName: 'Import Vorlage',
      headers: [...PRODUCT_EXPORT_HEADERS],
      rows: [
        ['P00003', 'Kunstwerk', 'Blue Horizon', 'Print', '3/10', 'A3', '', 120, 'Verfügbar'],
        ['K00001', 'Kunstwerk', 'Blue Horizon', 'Postkarte', '', '', 50, 8, 'Verfügbar'],
        ['B00001', 'Buch', 'Ausstellungskatalog 2026', '', '', '', 25, 39, 'Verfügbar'],
        ['K00002', 'Kunstwerk', 'Temporär nicht lagernd', 'Postkarte', '', '', 10, 8, 'Nicht an Lager'],
      ],
    };
  } else if (kind === 'sales') {
    const result = await db.prepare(`
      SELECT s.sold_at, p.uid, p.ware, p.name, p.typ, p.limited_no, p.limited_total,
             s.quantity, s.unit_price_cents, s.seller_email
      FROM sales s JOIN products p ON p.id = s.product_id
      WHERE s.reversed_at IS NULL
      ORDER BY s.sold_at DESC, s.id DESC
      LIMIT 1000
    `).all<Record<string, unknown>>();
    output = {
      filename: 'verkaufte-waren',
      sheetName: 'Verkäufe',
      headers: ['Verkauft am', 'UID', 'Ware', 'Bezeichnung', 'Typ', 'Limited NR', 'Anzahl', 'Preis', 'Verkäufer'],
      rows: (result.results || []).map((row) => [
        String(row.sold_at || ''),
        String(row.uid || ''),
        String(row.ware || ''),
        String(row.name || ''),
        String(row.typ || ''),
        row.limited_no ? `${row.limited_no}/${row.limited_total}` : '',
        Number(row.quantity || 0),
        Number(row.unit_price_cents || 0) / 100,
        String(row.seller_email || ''),
      ]),
    };
  } else {
    throw new ApiError(404, 'Export wurde nicht gefunden.');
  }
  return json(200, { success: true, export: output });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    if (!env.SHOP_DB) throw new ApiError(503, 'D1-Binding SHOP_DB fehlt.');
    const user = await authenticateShopRequest(request, env);
    const parts = routeParts(params.path);
    const method = request.method.toUpperCase();

    if (method === 'GET' && parts.length === 0) return await handleDashboard(env.SHOP_DB, user.email);
    if (method === 'GET' && parts[0] === 'dashboard') return await handleDashboard(env.SHOP_DB, user.email);
    if (method === 'GET' && parts[0] === 'inventory') {
      const archived = new URL(request.url).searchParams.get('archived') === '1';
      return await handleInventory(env.SHOP_DB, archived);
    }
    if (method === 'GET' && parts[0] === 'sales') return await handleSales(env.SHOP_DB);
    if (method === 'GET' && parts[0] === 'export' && parts[1]) return await handleExport(env.SHOP_DB, parts[1]);

    if (parts[0] === 'products' && parts[1]) {
      let uid: string;
      try {
        uid = validateUid(parts[1]);
      } catch (error) {
        throw new ApiError(400, error instanceof Error ? error.message : 'Ungültige UID.');
      }
      if (method === 'GET' && parts.length === 2) {
        return await productResponse(env.SHOP_DB, uid);
      }
      if (method === 'POST' && parts[2] === 'sell') {
        assertSameOrigin(request, env);
        return await handleSell(env.SHOP_DB, uid, user.email);
      }
      if (method === 'POST' && parts[2] === 'reverse') {
        assertSameOrigin(request, env);
        return await handleReverse(env.SHOP_DB, uid, user.email);
      }
      if (method === 'POST' && parts[2] === 'status') {
        assertSameOrigin(request, env);
        return await handleStatus(env.SHOP_DB, uid, request, user.email);
      }
      if (method === 'POST' && parts[2] === 'archive') {
        assertSameOrigin(request, env);
        return await handleArchive(env.SHOP_DB, uid, user.email);
      }
      if (method === 'POST' && parts[2] === 'reactivate') {
        assertSameOrigin(request, env);
        return await handleReactivate(env.SHOP_DB, uid, user.email);
      }
      if (method === 'DELETE' && parts.length === 2) {
        assertSameOrigin(request, env);
        return await handleDelete(env.SHOP_DB, uid, request);
      }
    }

    if (method === 'POST' && parts[0] === 'import') {
      assertSameOrigin(request, env);
      return await handleImport(env.SHOP_DB, request, user.email);
    }

    throw new ApiError(404, 'API-Endpunkt wurde nicht gefunden.');
  } catch (error) {
    if (error instanceof ApiError) return json(error.status, { success: false, error: error.message });
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Shop API error:', error);
    const authError = /Access|Token|JWT|E-Mail-Adresse|signature|audience|issuer/i.test(message);
    return json(authError ? 401 : 500, {
      success: false,
      error: authError ? 'Anmeldung ungültig oder abgelaufen.' : 'Interner Fehler im Verkaufstool.',
    });
  }
};
