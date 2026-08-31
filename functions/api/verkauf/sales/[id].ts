/// <reference types="@cloudflare/workers-types" />
import { authenticateShopRequest, isLocalDevBypass, type ShopAuthEnv } from '../../../../src/lib/shop/auth';

interface Env extends ShopAuthEnv {
  SHOP_DB: D1Database;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function assertSameOrigin(request: Request, env: Env): void {
  if (isLocalDevBypass(request, env)) return;
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    throw new ApiError(403, 'Ungültige Herkunft der Anfrage.');
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  try {
    if (!env.SHOP_DB) throw new ApiError(503, 'D1-Binding SHOP_DB fehlt.');
    await authenticateShopRequest(request, env);

    if (request.method.toUpperCase() !== 'DELETE') {
      throw new ApiError(405, 'Methode nicht erlaubt.');
    }
    assertSameOrigin(request, env);

    const saleId = Number(params.id);
    if (!Number.isInteger(saleId) || saleId <= 0) {
      throw new ApiError(400, 'Ungültige Verkaufs-ID.');
    }

    const row = await env.SHOP_DB.prepare(`
      SELECT
        s.id AS sale_id,
        s.operation_id AS sale_operation_id,
        s.quantity AS sale_quantity,
        s.unit_price_cents,
        s.sold_at,
        s.reversed_at,
        p.id AS product_id,
        p.uid,
        p.typ,
        p.stock_quantity,
        p.status,
        p.version
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE s.id = ?
    `).bind(saleId).first<Record<string, unknown>>();

    if (!row) throw new ApiError(404, 'Verkaufsbuchung wurde nicht gefunden.');
    if (row.reversed_at) {
      throw new ApiError(409, 'Diese Verkaufsbuchung wurde bereits rückgängig gemacht und beeinflusst Bestand und Umsatz nicht mehr.');
    }

    const productId = Number(row.product_id);
    const quantity = Number(row.sale_quantity || 1);
    const stockQuantity = Number(row.stock_quantity || 0);
    const version = Number(row.version || 0);
    const uid = String(row.uid || '');
    const saleOperationId = String(row.sale_operation_id || '');
    const isPrint = row.typ === 'Print';

    // Ein Print darf maximal Bestand 1 haben. Wenn Bestand bereits 1 ist,
    // wurde die Einheit z.B. durch einen späteren Import schon wiederhergestellt.
    // In diesem Fall löschen wir nur die Fehlbuchung und erhöhen den Bestand nicht nochmals.
    const restoreQuantity = isPrint && stockQuantity >= 1 ? 0 : quantity;
    const resultingStock = stockQuantity + restoreQuantity;
    if (isPrint && resultingStock > 1) {
      throw new ApiError(409, `Bestand von ${uid} ist inkonsistent. Bitte den Artikelbestand zuerst prüfen.`);
    }

    const operationId = crypto.randomUUID();
    const stamp = new Date().toISOString();

    await env.SHOP_DB.batch([
      env.SHOP_DB.prepare(`
        UPDATE products
        SET stock_quantity = stock_quantity + ?,
            status = CASE
              WHEN status = 'unavailable' THEN 'unavailable'
              WHEN stock_quantity + ? > 0 THEN 'available'
              ELSE status
            END,
            version = version + 1,
            last_operation_id = ?,
            updated_at = ?
        WHERE id = ? AND version = ?
          AND EXISTS (
            SELECT 1 FROM sales
            WHERE id = ? AND product_id = ? AND reversed_at IS NULL
          )
      `).bind(restoreQuantity, restoreQuantity, operationId, stamp, productId, version, saleId, productId),
      env.SHOP_DB.prepare(`
        DELETE FROM audit_log
        WHERE product_id = ? AND operation_id = ?
          AND EXISTS (
            SELECT 1 FROM products WHERE id = ? AND last_operation_id = ?
          )
      `).bind(productId, saleOperationId, productId, operationId),
      env.SHOP_DB.prepare(`
        DELETE FROM sales
        WHERE id = ? AND product_id = ? AND reversed_at IS NULL
          AND EXISTS (
            SELECT 1 FROM products WHERE id = ? AND last_operation_id = ?
          )
      `).bind(saleId, productId, productId, operationId),
    ]);

    const remaining = await env.SHOP_DB.prepare('SELECT id FROM sales WHERE id = ?').bind(saleId).first();
    if (remaining) {
      throw new ApiError(409, 'Die Verkaufsbuchung wurde zwischenzeitlich geändert und nicht gelöscht. Bitte erneut laden.');
    }

    const stockMessage = restoreQuantity > 0
      ? `${restoreQuantity} Einheit(en) wurden dem Bestand wieder gutgeschrieben.`
      : 'Der Bestand war bereits wiederhergestellt und wurde deshalb nicht nochmals erhöht.';

    return json(200, {
      success: true,
      message: `${uid}: Fehlbuchung wurde endgültig entfernt. ${stockMessage}`,
      deleted: {
        sale_id: saleId,
        uid,
        quantity,
        restored_quantity: restoreQuantity,
        revenue_cents: quantity * Number(row.unit_price_cents || 0),
        sold_at: String(row.sold_at || ''),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return json(error.status, { success: false, error: error.message });
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('Shop sale deletion error:', error);
    const authError = /Access|Token|JWT|E-Mail-Adresse|signature|audience|issuer/i.test(message);
    return json(authError ? 401 : 500, {
      success: false,
      error: authError ? 'Anmeldung ungültig oder abgelaufen.' : 'Interner Fehler im Verkaufstool.',
    });
  }
};
