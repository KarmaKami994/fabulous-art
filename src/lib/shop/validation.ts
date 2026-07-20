import type { ImportProduct, ProductStatus, ProductType, ProductWare } from './types';

export const PRODUCT_EXPORT_HEADERS = [
  'UID',
  'Ware',
  'Bezeichnung',
  'Typ',
  'Limited NR',
  'Grösse',
  'Anzahl',
  'Preis',
  'Status',
] as const;

const MAX_IMPORT_ROWS = 300;
const UID_RE = /^[A-Z0-9]{1,6}$/;

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function validateUid(value: unknown): string {
  const uid = String(value ?? '').trim().toUpperCase();
  if (!UID_RE.test(uid)) {
    throw new Error('UID muss aus 1 bis 6 Grossbuchstaben oder Zahlen bestehen.');
  }
  return uid;
}

function normalizeWare(value: unknown): ProductWare {
  const key = normalizeText(value);
  if (['kunstwerk', 'kunst', 'artwork'].includes(key)) return 'Kunstwerk';
  if (['buch', 'book'].includes(key)) return 'Buch';
  throw new Error(`Ware muss Kunstwerk oder Buch sein, erhalten: ${String(value ?? '')}`);
}

function normalizeType(ware: ProductWare, value: unknown): ProductType {
  if (ware === 'Buch') return '';
  const key = normalizeText(value);
  if (['print', 'prints'].includes(key)) return 'Print';
  if (['postkarte', 'postkarten', 'postcard', 'postcards'].includes(key)) return 'Postkarte';
  throw new Error(`Typ muss bei Kunstwerk Print oder Postkarte sein, erhalten: ${String(value ?? '')}`);
}

function normalizeStatus(value: unknown): ProductStatus {
  const key = normalizeText(value);
  if (['', 'available', 'verfugbar', 'lager'].includes(key)) return 'available';
  if (['sold', 'verkauft', 'ausverkauft'].includes(key)) return 'sold';
  if (['unavailable', 'nichtverfugbar', 'gesperrt'].includes(key)) return 'unavailable';
  throw new Error(`Unbekannter Status: ${String(value ?? '')}`);
}

function parseLimited(value: unknown): [number | null, number | null] {
  const text = String(value ?? '').trim();
  if (!text) return [null, null];
  const match = text.match(/^\s*(\d+)\s*(?:\/|von)\s*(\d+)\s*$/i);
  if (!match) throw new Error(`Limited NR '${text}' muss wie 2/10 geschrieben werden.`);
  const number = Number(match[1]);
  const total = Number(match[2]);
  if (number < 1 || total < 1 || number > total) throw new Error(`Ungültige Limited NR: ${text}`);
  return [number, total];
}

function parseInteger(value: unknown, label: string): number {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} fehlt.`);
  const number = Number(text.replace(',', '.'));
  if (!Number.isInteger(number)) throw new Error(`${label} muss eine ganze Zahl sein.`);
  return number;
}

export function parsePriceToCents(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0) throw new Error('Preis darf nicht negativ sein.');
    return Math.round(value * 100);
  }

  let text = String(value ?? '')
    .trim()
    .replace(/CHF/gi, '')
    .replace(/[’'\s]/g, '');
  if (!text) throw new Error('Preis fehlt.');

  if (text.includes(',') && text.includes('.')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }

  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error('Preis ist ungültig.');
  if (number < 0) throw new Error('Preis darf nicht negativ sein.');
  return Math.round(number * 100);
}

interface RowObject {
  _row: number;
  uid?: unknown;
  ware?: unknown;
  name?: unknown;
  typ?: unknown;
  limited?: unknown;
  size?: unknown;
  quantity?: unknown;
  price?: unknown;
  status?: unknown;
}

function rowsToObjects(rows: unknown[][]): RowObject[] {
  const cleaned = rows.filter((row) => Array.isArray(row) && row.some((value) => String(value ?? '').trim()));
  if (cleaned.length < 2) throw new Error('Die Datei enthält keine Produktdaten.');
  if (cleaned.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`Pro Import sind maximal ${MAX_IMPORT_ROWS} Produktzeilen erlaubt.`);
  }

  const aliases: Record<string, keyof Omit<RowObject, '_row'>> = {
    uid: 'uid',
    uniqueid: 'uid',
    ware: 'ware',
    bezeichnung: 'name',
    titel: 'name',
    name: 'name',
    typ: 'typ',
    type: 'typ',
    limitednr: 'limited',
    limitededitionnr: 'limited',
    edition: 'limited',
    grosse: 'size',
    groesse: 'size',
    size: 'size',
    anzahl: 'quantity',
    bestand: 'quantity',
    quantity: 'quantity',
    preis: 'price',
    preischf: 'price',
    price: 'price',
    status: 'status',
  };

  const mappedHeaders = cleaned[0].map((header) => aliases[normalizeText(header)] ?? null);
  const present = new Set(mappedHeaders.filter(Boolean));
  for (const required of ['uid', 'ware', 'name', 'price'] as const) {
    if (!present.has(required)) throw new Error(`Pflichtspalte fehlt: ${required}. Bitte die Importvorlage verwenden.`);
  }

  return cleaned.slice(1).map((row, index) => {
    const result: RowObject = { _row: index + 2 };
    mappedHeaders.forEach((key, columnIndex) => {
      if (key) result[key] = row[columnIndex] ?? '';
    });
    return result;
  });
}

function validateRow(row: RowObject): ImportProduct {
  try {
    const uid = validateUid(row.uid);
    const ware = normalizeWare(row.ware);
    const name = String(row.name ?? '').trim();
    if (!name) throw new Error('Bezeichnung fehlt.');
    if (name.length > 160) throw new Error('Bezeichnung darf maximal 160 Zeichen enthalten.');

    const typ = normalizeType(ware, row.typ);
    const price_cents = parsePriceToCents(row.price);
    let status = normalizeStatus(row.status);
    let size = String(row.size ?? '').trim();
    const [limited_no, limited_total] = parseLimited(row.limited);
    let stock_quantity: number;

    if (ware === 'Kunstwerk' && typ === 'Print') {
      if (!size) throw new Error('Grösse fehlt bei einem Print.');
      if (size.length > 40) throw new Error('Grösse darf maximal 40 Zeichen enthalten.');
      if (limited_no === null || limited_total === null) throw new Error('Limited NR fehlt bei einem Print.');
      stock_quantity = status === 'sold' ? 0 : 1;
    } else {
      if (limited_no !== null || limited_total !== null) throw new Error('Limited NR ist nur bei Prints erlaubt.');
      size = '';
      stock_quantity = parseInteger(row.quantity, 'Anzahl');
      if (stock_quantity < 0) throw new Error('Anzahl darf nicht negativ sein.');
      if (status === 'sold') stock_quantity = 0;
      if (stock_quantity === 0 && status === 'available') status = 'sold';
    }

    return {
      uid,
      ware,
      name,
      typ,
      limited_no,
      limited_total,
      size,
      stock_quantity,
      price_cents,
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ungültige Zeile.';
    throw new Error(`Zeile ${row._row}: ${message}`);
  }
}

export function validateImportRows(rows: unknown[][]): ImportProduct[] {
  const items = rowsToObjects(rows).map(validateRow);
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.uid)) throw new Error(`UID ${item.uid} kommt in der Datei mehrfach vor.`);
    seen.add(item.uid);
  }
  return items;
}

export function limitedLabel(product: Pick<ImportProduct, 'limited_no' | 'limited_total'>): string {
  return product.limited_no && product.limited_total ? `${product.limited_no}/${product.limited_total}` : '';
}

export function exportStatusLabel(status: ProductStatus): string {
  return status === 'available' ? 'Verfügbar' : status === 'sold' ? 'Verkauft' : 'Nicht verfügbar';
}
