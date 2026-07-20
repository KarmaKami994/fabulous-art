import { describe, expect, it } from 'vitest';
import { parsePriceToCents, validateImportRows, validateUid } from '../src/lib/shop/validation';

describe('shop UID validation', () => {
  it('normalizes valid UIDs', () => {
    expect(validateUid(' k00001 ')).toBe('K00001');
    expect(validateUid('A12Z9')).toBe('A12Z9');
  });

  it('rejects invalid UIDs', () => {
    expect(() => validateUid('K-0001')).toThrow(/1 bis 6/);
    expect(() => validateUid('ABCDEFG')).toThrow(/1 bis 6/);
    expect(() => validateUid('')).toThrow(/1 bis 6/);
  });
});

describe('shop import validation', () => {
  it('validates print, postcard and book rows', () => {
    const products = validateImportRows([
      ['UID', 'Ware', 'Bezeichnung', 'Typ', 'Limited NR', 'Grösse', 'Anzahl', 'Preis', 'Status'],
      ['P00003', 'Kunstwerk', 'Blue Horizon', 'Print', '3/10', 'A3', '', 120, 'Verfügbar'],
      ['K00001', 'Kunstwerk', 'Blue Horizon', 'Postkarte', '', '', 50, '8.00', 'Verfügbar'],
      ['B00001', 'Buch', 'Katalog', '', '', '', 25, 'CHF 39.00', 'Verfügbar'],
    ]);

    expect(products).toHaveLength(3);
    expect(products[0]).toMatchObject({ uid: 'P00003', stock_quantity: 1, limited_no: 3, limited_total: 10 });
    expect(products[1]).toMatchObject({ uid: 'K00001', stock_quantity: 50, price_cents: 800 });
    expect(products[2]).toMatchObject({ uid: 'B00001', typ: '', stock_quantity: 25, price_cents: 3900 });
  });

  it('rejects the entire file on duplicate UIDs', () => {
    expect(() => validateImportRows([
      ['UID', 'Ware', 'Bezeichnung', 'Typ', 'Limited NR', 'Grösse', 'Anzahl', 'Preis'],
      ['P00001', 'Kunstwerk', 'Bild', 'Print', '1/2', 'A3', '', 100],
      ['p00001', 'Kunstwerk', 'Bild', 'Print', '2/2', 'A3', '', 100],
    ])).toThrow(/mehrfach/);
  });

  it('does not allow limited numbers on books', () => {
    expect(() => validateImportRows([
      ['UID', 'Ware', 'Bezeichnung', 'Typ', 'Limited NR', 'Grösse', 'Anzahl', 'Preis'],
      ['B00001', 'Buch', 'Katalog', '', '1/10', '', 2, 39],
    ])).toThrow(/nur bei Prints/);
  });
});

describe('shop price parsing', () => {
  it('supports Swiss and decimal formats', () => {
    expect(parsePriceToCents('CHF 1\'200.50')).toBe(120050);
    expect(parsePriceToCents('39,90')).toBe(3990);
  });
});
