import { readSheet } from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import type { ShopProduct, TabularExport } from '../lib/shop/types';

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

const app = document.querySelector<HTMLElement>('#shop-app');
const flash = document.querySelector<HTMLElement>('#shop-flash');
const searchForm = document.querySelector<HTMLFormElement>('#shop-search-form');
const searchInput = document.querySelector<HTMLInputElement>('#shop-search-input');
const productResult = document.querySelector<HTMLElement>('#product-result');
const importForm = document.querySelector<HTMLFormElement>('#shop-import-form');
const importFile = document.querySelector<HTMLInputElement>('#shop-import-file');

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
  if (status === 'sold') return 'Verkauft / ausverkauft';
  return 'Nicht verfügbar';
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

function renderProduct(product: ShopProduct): void {
  if (!productResult) return;
  const canSell = product.status === 'available' && product.stock_quantity > 0;
  const quantity = product.typ === 'Print' ? 'Einzelexemplar' : String(product.stock_quantity);
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
        </dl>
      </article>
      <article class="shop-card shop-status-panel">
        <div>
          <div class="shop-eyebrow">Aktueller Status</div>
          <div class="shop-big-status">${escapeHtml(statusLabel(product.status))}</div>
          <span class="shop-badge ${escapeHtml(product.status)}">${escapeHtml(statusLabel(product.status))}</span>
        </div>
        <div class="shop-stack shop-section">
          <button class="shop-button success full" type="button" data-product-action="sell" data-uid="${escapeHtml(product.uid)}" ${canSell ? '' : 'disabled'}>Als verkauft erfassen</button>
          <button class="shop-button danger full" type="button" data-product-action="reverse" data-uid="${escapeHtml(product.uid)}">Letzten Verkauf rückgängig</button>
        </div>
      </article>
    </div>`;
}

async function searchProduct(uid: string): Promise<void> {
  const data = await api<{ product: ShopProduct }>(`products/${encodeURIComponent(uid)}`);
  renderProduct(data.product);
}

async function productAction(action: 'sell' | 'reverse', uid: string): Promise<void> {
  const question = action === 'sell'
    ? `${uid} wirklich als verkauft erfassen?`
    : `Letzten Verkauf von ${uid} wirklich rückgängig machen?`;
  if (!window.confirm(question)) return;
  setLoading(true);
  try {
    const data = await api<{ product: ShopProduct; message: string }>(
      `products/${encodeURIComponent(uid)}/${action}`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    renderProduct(data.product);
    showFlash('ok', data.message);
    await loadDashboard();
  } catch (error) {
    showFlash('error', error instanceof Error ? error.message : 'Aktion fehlgeschlagen.');
  } finally {
    setLoading(false);
  }
}

async function loadInventory(): Promise<void> {
  const data = await api<{
    products: ShopProduct[];
    totals: { rows: number; stock: number };
  }>('inventory');
  mustElement<HTMLElement>('#inventory-stock').textContent = String(data.totals.stock || 0);
  mustElement<HTMLElement>('#inventory-rows').textContent = String(data.totals.rows || 0);
  const body = mustElement<HTMLTableSectionElement>('#inventory-body');
  body.innerHTML = data.products.length
    ? data.products.map((product) => `
      <tr>
        <td class="mono">${escapeHtml(product.uid)}</td>
        <td>${escapeHtml(product.ware)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.typ || '–')}</td>
        <td>${escapeHtml(productLimited(product))}</td>
        <td>${escapeHtml(product.size || '–')}</td>
        <td>${product.typ === 'Print' ? '–' : escapeHtml(product.stock_quantity)}</td>
        <td class="money">${escapeHtml(money(product.price_cents))}</td>
        <td><span class="shop-badge ${escapeHtml(product.status)}">${escapeHtml(statusLabel(product.status))}</span></td>
      </tr>`).join('')
    : '<tr><td class="shop-empty" colspan="9">Noch keine Ware importiert.</td></tr>';
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
    if (productResult) productResult.innerHTML = '';
    showFlash('error', error instanceof Error ? error.message : 'Produkt wurde nicht gefunden.');
  } finally {
    setLoading(false);
  }
});

productResult?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-product-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.productAction;
  const uid = button.dataset.uid;
  if ((action === 'sell' || action === 'reverse') && uid) void productAction(action, uid);
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
