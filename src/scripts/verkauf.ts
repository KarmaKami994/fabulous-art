import { readSheet } from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import type { ProductStatus, ShopProduct, TabularExport } from '../lib/shop/types';

interface ApiSuccess {
  success: true;
  message?: string;
  [key: string]: unknown;
}

interface ApiFailure {
  success: false;
  error: string;
}

type ApiResponse<T extends Record<string, unknown>> = (ApiSuccess & T) | ApiFailure;
type ViewName = 'dashboard' | 'inventory' | 'sales' | 'data';
type CellValue = string | number | boolean | Date | null | undefined;

type ProductAction =
  | 'sell'
  | 'reverse'
  | 'status-available'
  | 'status-unavailable'
  | 'archive'
  | 'reactivate'
  | 'delete';

interface ProductHistorySummary {
  sale_records: number;
  active_sales_count: number;
  revenue_cents: number;
}

const app = document.querySelector<HTMLElement>('#shop-app');
const flash = document.querySelector<HTMLElement>('#shop-flash');
const searchForm = document.querySelector<HTMLFormElement>('#shop-search-form');
const searchInput = document.querySelector<HTMLInputElement>('#shop-search-input');
const productResult = document.querySelector<HTMLElement>('#product-result');
const importForm = document.querySelector<HTMLFormElement>('#shop-import-form');
const importFile = document.querySelector<HTMLInputElement>('#shop-import-file');
const archivedToggle = document.querySelector<HTMLButtonElement>('#inventory-archived-toggle');

let inventoryShowArchived = false;
let currentProduct: { product: ShopProduct; history: ProductHistorySummary } | null = null;

function mustElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element fehlt: ${selector}`);
  return element;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeUid(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function money(cents: unknown): string {
  const amount = Number(cents || 0) / 100;
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
}

function dateTime(value: unknown): string {
  if (!value) return '–';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('de-CH', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function statusLabel(status: ShopProduct['status']): string {
  if (status === 'available') return 'Verfügbar';
  if (status === 'sold') return 'Verkauft';
  return 'Nicht an Lager';
}

function showFlash(type: 'ok' | 'error' | 'info', message: string): void {
  if (!flash) return;
  flash.className = `shop-flash show ${type}`;
  flash.textContent = message;
  flash.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearFlash(): void {
  if (!flash) return;
  flash.className = 'shop-flash';
  flash.textContent = '';
}

function setLoading(loading: boolean): void {
  app?.classList.toggle('shop-loading', loading);
}

async function api<T extends Record<string, unknown>>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/verkauf/${path.replace(/^\//, '')}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  let payload: ApiResponse<T>;
  try {
    payload = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error(`Serverantwort ist ungültig (${response.status}).`);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.success === false ? payload.error : `Anfrage fehlgeschlagen (${response.status}).`);
  }
  return payload as unknown as T;
}

async function loadDashboard(): Promise<void> {
  const data = await api<{
    user: { email: string };
    totals: { skus: number; stock: number; sales_count: number; revenue_cents: number };
  }>('dashboard');
  mustElement<HTMLElement>('#shop-user').textContent = data.user.email;
  mustElement<HTMLElement>('#stat-skus').textContent = String(data.totals.skus || 0);
  mustElement<HTMLElement>('#stat-stock').textContent = String(data.totals.stock || 0);
  mustElement<HTMLElement>('#stat-sales').textContent = String(data.totals.sales_count || 0);
  mustElement<HTMLElement>('#stat-revenue').textContent = money(data.totals.revenue_cents);
}

function productLimited(product: ShopProduct): string {
  return product.limited_no && product.limited_total ? `${product.limited_no}/${product.limited_total}` : '–';
}

function renderProduct(product: ShopProduct, history: ProductHistorySummary): void {
  if (!productResult) return;
  currentProduct = { product, history };

  const archived = Boolean(product.archived_at);
  const canSell = !archived && product.status === 'available' && product.stock_quantity > 0;
  const canReverse = history.active_sales_count > 0;
  const canSetAvailable = !archived && product.status === 'unavailable' && product.stock_quantity > 0;
  const canSetUnavailable = !archived && product.status === 'available';
  const quantity = product.typ === 'Print' ? String(product.stock_quantity) : String(product.stock_quantity);
  const displayStatus = archived ? 'Archiviert' : statusLabel(product.status);
  const badgeClass = archived ? 'archived' : product.status;

  productResult.innerHTML = `
    <div class="shop-product">
      <article class="shop-card">
        <div class="shop-eyebrow">Produktinformation</div>
        <div class="shop-product-id">${escapeHtml(product.uid)}</div>
        <dl class="shop-detail-list">
          <dt>Ware</dt><dd>${escapeHtml(product.ware)}</dd>
          <dt>Bezeichnung</dt><dd>${escapeHtml(product.name)}</dd>
          <dt>Typ</dt><dd>${escapeHtml(product.typ || '–')}</dd>
          <dt>Limited NR</dt><dd>${escapeHtml(productLimited(product))}</dd>
          <dt>Grösse</dt><dd>${escapeHtml(product.size || '–')}</dd>
          <dt>Bestand</dt><dd>${escapeHtml(quantity)}</dd>
          <dt>Preis</dt><dd>${escapeHtml(money(product.price_cents))}</dd>
          <dt>Verkäufe aktiv</dt><dd>${escapeHtml(history.active_sales_count)}</dd>
          <dt>Historischer Umsatz</dt><dd>${escapeHtml(money(history.revenue_cents))}</dd>
          ${archived ? `<dt>Archiviert</dt><dd>${escapeHtml(dateTime(product.archived_at))}</dd>` : ''}
        </dl>
      </article>
      <article class="shop-card shop-status-panel">
        <div>
          <div class="shop-eyebrow">Aktueller Status</div>
          <div class="shop-big-status">${escapeHtml(displayStatus)}</div>
          <span class="shop-badge ${escapeHtml(badgeClass)}">${escapeHtml(displayStatus)}</span>
        </div>
        <div class="shop-stack shop-section">
          <button class="shop-button success full" type="button" data-product-action="sell" data-uid="${escapeHtml(product.uid)}" ${canSell ? '' : 'disabled'}>1 Einheit verkaufen</button>
          <button class="shop-button full" type="button" data-product-action="reverse" data-uid="${escapeHtml(product.uid)}" ${canReverse ? '' : 'disabled'}>Letzten Verkauf rückgängig</button>
          <button class="shop-button full" type="button" data-product-action="status-available" data-uid="${escapeHtml(product.uid)}" ${canSetAvailable ? '' : 'disabled'}>Auf Verfügbar setzen</button>
          <button class="shop-button full" type="button" data-product-action="status-unavailable" data-uid="${escapeHtml(product.uid)}" ${canSetUnavailable ? '' : 'disabled'}>Nicht an Lager setzen</button>
          ${archived
            ? `<button class="shop-button blue full" type="button" data-product-action="reactivate" data-uid="${escapeHtml(product.uid)}">Artikel reaktivieren</button>`
            : `<button class="shop-button full" type="button" data-product-action="archive" data-uid="${escapeHtml(product.uid)}">Artikel archivieren</button>`}
          <div class="shop-danger-zone">
            <strong>Gefahrenzone</strong>
            <small>Endgültiges Löschen entfernt auch die Verkaufshistorie dieses Artikels.</small>
            <button class="shop-button danger full" type="button" data-product-action="delete" data-uid="${escapeHtml(product.uid)}">Artikel endgültig löschen</button>
          </div>
        </div>
      </article>
    </div>`;
}

async function searchProduct(uid: string): Promise<void> {
  const data = await api<{ product: ShopProduct; history: ProductHistorySummary }>(`products/${encodeURIComponent(uid)}`);
  renderProduct(data.product, data.history);
}

async function runSimpleProductAction(
  uid: string,
  endpoint: string,
  question: string,
  body: Record<string, unknown> = {},
): Promise<void> {
  if (!window.confirm(question)) return;
  setLoading(true);
  try {
    const data = await api<{ message: string }>(
      `products/${encodeURIComponent(uid)}/${endpoint}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    await searchProduct(uid);
    showFlash('ok', data.message);
    await loadDashboard();
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Aktion fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
}

async function deleteProduct(uid: string): Promise<void> {
  const context = currentProduct?.product.uid === uid ? currentProduct : null;
  const history = context?.history;
  const warning = history && history.sale_records > 0
    ? `ACHTUNG: ${uid} hat ${history.active_sales_count} aktive verkaufte Einheit(en) mit ${money(history.revenue_cents)} Umsatz und ${history.sale_records} historische Verkaufsbuchung(en).\n\nBeim endgültigen Löschen werden Produkt, Verkäufe und zugehörige Audit-Historie unwiderruflich entfernt.`
    : `ACHTUNG: ${uid} wird endgültig und unwiderruflich gelöscht.`;

  if (!window.confirm(warning)) return;
  const confirmation = window.prompt(`Zur Sicherheitsbestätigung die UID ${uid} exakt eingeben:`);
  if (confirmation === null) return;
  if (normalizeUid(confirmation) !== uid) {
    showFlash('error', 'Die eingegebene UID stimmt nicht überein. Artikel wurde nicht gelöscht.');
    return;
  }

  setLoading(true);
  try {
    const data = await api<{ message: string }>(`products/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm_uid: uid }),
    });
    currentProduct = null;
    if (productResult) productResult.innerHTML = '';
    if (searchInput) searchInput.value = '';
    showFlash('ok', data.message);
    await loadDashboard();
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Löschen fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
}

async function productAction(action: ProductAction, uid: string): Promise<void> {
  if (action === 'sell') {
    await runSimpleProductAction(uid, 'sell', `${uid}: 1 Einheit wirklich als Verkauf erfassen?`);
    return;
  }
  if (action === 'reverse') {
    await runSimpleProductAction(uid, 'reverse', `Letzten Verkauf von ${uid} wirklich rückgängig machen?`);
    return;
  }
  if (action === 'status-available') {
    await runSimpleProductAction(uid, 'status', `${uid} wieder auf Verfügbar setzen?`, { status: 'available' satisfies ProductStatus });
    return;
  }
  if (action === 'status-unavailable') {
    await runSimpleProductAction(
      uid,
      'status',
      `${uid} auf Nicht an Lager setzen? Der vorhandene Bestand bleibt gespeichert, wird aber nicht mehr zum aktuellen Bestand gezählt und kann nicht verkauft werden.`,
      { status: 'unavailable' satisfies ProductStatus },
    );
    return;
  }
  if (action === 'archive') {
    await runSimpleProductAction(
      uid,
      'archive',
      `${uid} archivieren? Der Artikel verschwindet aus dem aktuellen Bestand; frühere Verkäufe und Umsätze bleiben erhalten.`,
    );
    return;
  }
  if (action === 'reactivate') {
    await runSimpleProductAction(uid, 'reactivate', `${uid} wieder in den aktiven Artikelbestand aufnehmen?`);
    return;
  }
  await deleteProduct(uid);
}

async function loadInventory(): Promise<void> {
  const data = await api<{
    products: ShopProduct[];
    archived: boolean;
    totals: { rows: number; stock: number };
  }>(`inventory?archived=${inventoryShowArchived ? '1' : '0'}`);

  mustElement<HTMLElement>('#inventory-stock').textContent = String(data.totals.stock || 0);
  mustElement<HTMLElement>('#inventory-rows').textContent = String(data.totals.rows || 0);
  if (archivedToggle) archivedToggle.textContent = inventoryShowArchived ? 'Aktive Artikel anzeigen' : 'Archivierte anzeigen';
  const mode = document.querySelector<HTMLElement>('#inventory-mode');
  if (mode) mode.textContent = inventoryShowArchived ? 'Archivierte Artikel' : 'Aktive Artikel';

  const body = mustElement<HTMLTableSectionElement>('#inventory-body');
  body.innerHTML = data.products.length
    ? data.products.map((product) => {
      const archived = Boolean(product.archived_at);
      const badgeClass = archived ? 'archived' : product.status;
      const label = archived ? 'Archiviert' : statusLabel(product.status);
      return `
      <tr>
        <td class="mono">${escapeHtml(product.uid)}</td>
        <td>${escapeHtml(product.ware)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.typ || '–')}</td>
        <td>${escapeHtml(productLimited(product))}</td>
        <td>${escapeHtml(product.size || '–')}</td>
        <td>${escapeHtml(product.stock_quantity)}</td>
        <td class="money">${escapeHtml(money(product.price_cents))}</td>
        <td><span class="shop-badge ${escapeHtml(badgeClass)}">${escapeHtml(label)}</span></td>
      </tr>`;
    }).join('')
    : `<tr><td class="shop-empty" colspan="9">${inventoryShowArchived ? 'Keine archivierten Artikel vorhanden.' : 'Noch keine aktive Ware vorhanden.'}</td></tr>`;
}

interface SalesSummaryRow {
  ware: string;
  typ: string;
  quantity: number;
  revenue_cents: number;
}

interface SalesDetailRow {
  sold_at: string;
  uid: string;
  ware: string;
  name: string;
  typ: string;
  limited_no: number | null;
  limited_total: number | null;
  seller_email: string;
  quantity: number;
  unit_price_cents: number;
}

async function loadSales(): Promise<void> {
  const data = await api<{
    summary: SalesSummaryRow[];
    details: SalesDetailRow[];
    total: { quantity: number; revenue_cents: number };
  }>('sales');
  mustElement<HTMLElement>('#sales-quantity').textContent = String(data.total.quantity || 0);
  mustElement<HTMLElement>('#sales-revenue').textContent = money(data.total.revenue_cents);

  const summaryBody = mustElement<HTMLTableSectionElement>('#sales-summary-body');
  const summaryRows = data.summary.map((row) => `
    <tr><td>${escapeHtml(row.ware)}</td><td>${escapeHtml(row.typ || '–')}</td><td>${escapeHtml(row.quantity)}</td><td class="money">${escapeHtml(money(row.revenue_cents))}</td></tr>`).join('');
  summaryBody.innerHTML = `${summaryRows || '<tr><td class="shop-empty" colspan="4">Noch keine Verkäufe erfasst.</td></tr>'}
    <tr class="total"><td colspan="2">Total</td><td>${escapeHtml(data.total.quantity || 0)}</td><td class="money">${escapeHtml(money(data.total.revenue_cents))}</td></tr>`;

  const detailsBody = mustElement<HTMLTableSectionElement>('#sales-detail-body');
  detailsBody.innerHTML = data.details.length
    ? data.details.map((row) => `
      <tr>
        <td>${escapeHtml(dateTime(row.sold_at))}</td>
        <td class="mono">${escapeHtml(row.uid)}</td>
        <td>${escapeHtml(row.ware)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.typ || '–')}</td>
        <td>${row.limited_no && row.limited_total ? `${escapeHtml(row.limited_no)}/${escapeHtml(row.limited_total)}` : '–'}</td>
        <td>${escapeHtml(row.seller_email)}</td>
        <td class="money">${escapeHtml(money(row.unit_price_cents * row.quantity))}</td>
      </tr>`).join('')
    : '<tr><td class="shop-empty" colspan="8">Noch keine Verkäufe erfasst.</td></tr>';
}

async function switchView(view: ViewName): Promise<void> {
  clearFlash();
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((button) => {
    if (button.dataset.viewButton === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  setLoading(true);
  try {
    if (view === 'dashboard') await loadDashboard();
    if (view === 'inventory') await loadInventory();
    if (view === 'sales') await loadSales();
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.');
  } finally {
    setLoading(false);
  }
}

function parseCsv(text: string): CellValue[][] {
  const sample = text.slice(0, 4096);
  const delimiters = [';', ',', '\t'];
  const delimiter = delimiters
    .map((candidate) => ({ candidate, count: sample.split(candidate).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.candidate || ';';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (rows[0]?.[0]?.charCodeAt(0) === 0xfeff) rows[0][0] = rows[0][0].slice(1);
  return rows;
}

async function readImportFile(file: File): Promise<CellValue[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'xlsx') return await readSheet(file) as CellValue[][];
  if (extension === 'csv') return parseCsv(await file.text());
  throw new Error('Erlaubt sind nur CSV- und XLSX-Dateien.');
}

function csvValue(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadExport(kind: string, format: 'csv' | 'xlsx'): Promise<void> {
  setLoading(true);
  try {
    const data = await api<{ export: TabularExport }>(`export/${encodeURIComponent(kind)}`);
    const output = data.export;
    if (format === 'csv') {
      const lines = [output.headers, ...output.rows].map((row) => row.map(csvValue).join(';'));
      const blob = new Blob([`\ufeff${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `${output.filename}.csv`);
    } else {
      const header = output.headers.map((value) => ({
        value,
        fontWeight: 'bold' as const,
        color: '#FFFFFF',
        backgroundColor: '#20231F',
      }));
      const rows = output.rows.map((row) => row.map((value) => ({ value: value ?? '' })));
      const widths = output.headers.map((headerValue, columnIndex) => ({
        width: Math.min(34, Math.max(11, String(headerValue).length + 2, ...output.rows.map((row) => String(row[columnIndex] ?? '').length + 2))),
      }));
      await writeXlsxFile([header, ...rows], {
        sheet: output.sheetName,
        columns: widths,
        stickyRowsCount: 1,
      }).toFile(`${output.filename}.xlsx`);
    }
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Export fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
}

searchInput?.addEventListener('input', () => {
  searchInput.value = normalizeUid(searchInput.value);
});

searchForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFlash();
  const uid = normalizeUid(searchInput?.value || '');
  if (!uid) {
    showFlash('error', 'Bitte eine UID eingeben.');
    return;
  }
  if (searchInput) searchInput.value = uid;
  setLoading(true);
  try {
    await searchProduct(uid);
  } catch (error) {
    currentProduct = null;
    if (productResult) productResult.innerHTML = '';
    showFlash('error', error instanceof Error ? error.message : 'Produkt wurde nicht gefunden.');
  } finally {
    setLoading(false);
  }
});

productResult?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-product-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.productAction as ProductAction | undefined;
  const uid = button.dataset.uid;
  if (action && uid) void productAction(action, uid);
});

archivedToggle?.addEventListener('click', () => {
  inventoryShowArchived = !inventoryShowArchived;
  void loadInventory();
});

document.querySelectorAll<HTMLButtonElement>('[data-view-button], [data-go-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const view = (button.dataset.viewButton || button.dataset.goView) as ViewName | undefined;
    if (view) void switchView(view);
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-export-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.exportKind;
    const format = button.dataset.exportFormat as 'csv' | 'xlsx' | undefined;
    if (kind && format) void downloadExport(kind, format);
  });
});

importForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFlash();
  const file = importFile?.files?.[0];
  if (!file) {
    showFlash('error', 'Bitte eine CSV- oder XLSX-Datei auswählen.');
    return;
  }
  if (!window.confirm('Vorhandene UIDs werden aktualisiert und neue UIDs angelegt. Import starten?')) return;

  setLoading(true);
  try {
    const rows = await readImportFile(file);
    const result = await api<{ message: string }>('import', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, rows }),
    });
    showFlash('ok', result.message);
    importForm.reset();
    await loadDashboard();
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Import fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
});

void switchView('dashboard');
