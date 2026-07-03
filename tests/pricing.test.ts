import { describe, it, expect } from 'vitest';
import { getQuote, isAvailable, peopleOptions, SIZES, SHIPPING_ZONES } from '../src/lib/pricing';
import pricing from '../src/data/pricing.json';

describe('getQuote — portrait', () => {
  it('prices every size', () => {
    expect(getQuote('portrait', 'A3', 1, 'switzerland')?.drawing).toBe(870);
    expect(getQuote('portrait', 'A2', 1, 'switzerland')?.drawing).toBe(1750);
    expect(getQuote('portrait', 'A1', 1, 'switzerland')?.drawing).toBe(3500);
    expect(getQuote('portrait', 'A0', 1, 'switzerland')?.drawing).toBe(6500);
  });

  it('ignores the people parameter (portraits are always 1 person)', () => {
    expect(getQuote('portrait', 'A3', 7, 'switzerland')?.drawing).toBe(870);
  });

  it('computes total = drawing + packaging + shipping', () => {
    const q = getQuote('portrait', 'A3', 1, 'europe')!;
    expect(q.creative).toBe(0);
    expect(q.total).toBe(870 + 20 + 34);
  });
});

describe('getQuote — family', () => {
  it('prices every size/people combination from pricing.json', () => {
    for (const size of SIZES) {
      for (const people of peopleOptions('family')) {
        const q = getQuote('family', size, people, 'switzerland');
        const expected = (pricing.family as Record<string, Record<string, number>>)[size][String(people)];
        expect(q, `family ${size} ${people}P`).not.toBeNull();
        expect(q!.drawing).toBe(expected);
        expect(q!.total).toBe(expected + 20 + 12);
      }
    }
  });

  it('rejects people counts outside 2–10', () => {
    expect(getQuote('family', 'A3', 1, 'switzerland')).toBeNull();
    expect(getQuote('family', 'A3', 11, 'switzerland')).toBeNull();
  });
});

describe('getQuote — creative', () => {
  it('adds the fixed creative costs (photoshoot + surcharge + equipment)', () => {
    const q = getQuote('creative', 'A3', 1, 'switzerland')!;
    expect(q.creative).toBe(150 + 100 + 60);
    expect(q.total).toBe(870 + 310 + 20 + 12);
  });

  it('never returns a larger group cheaper than a smaller one (the CHF 1680/1890 typo class)', () => {
    for (const size of SIZES) {
      let prev = 0;
      for (const people of [1, 2, 3, 4]) {
        const q = getQuote('creative', size, people, 'switzerland');
        if (q === null) continue; // unavailable combos are allowed to be missing
        expect(q.drawing, `creative ${size} ${people}P should cost >= ${people - 1}P`).toBeGreaterThanOrEqual(prev);
        prev = q.drawing;
      }
    }
  });

  it('returns null — NOT CHF 0 — for unavailable combinations (A0 with 3–4 people)', () => {
    // This is the exact bug the review found: these used to be priced at 0.
    expect(getQuote('creative', 'A0', 3, 'switzerland')).toBeNull();
    expect(getQuote('creative', 'A0', 4, 'switzerland')).toBeNull();
    expect(isAvailable('creative', 'A0', 3)).toBe(false);
    expect(isAvailable('creative', 'A0', 4)).toBe(false);
    // ...while the neighbours stay available:
    expect(isAvailable('creative', 'A0', 2)).toBe(true);
    expect(isAvailable('creative', 'A1', 4)).toBe(true);
  });

  it('no available combination ever totals CHF 0 or negative', () => {
    for (const size of SIZES) {
      for (const people of peopleOptions('creative')) {
        const q = getQuote('creative', size, people, 'worldwide');
        if (q !== null) expect(q.total).toBeGreaterThan(0);
      }
    }
  });
});

describe('getQuote — shipping and input validation', () => {
  it('applies each shipping zone', () => {
    expect(getQuote('portrait', 'A3', 1, 'switzerland')!.shipping).toBe(12);
    expect(getQuote('portrait', 'A3', 1, 'europe')!.shipping).toBe(34);
    expect(getQuote('portrait', 'A3', 1, 'worldwide')!.shipping).toBe(80);
  });

  it('rejects unknown enums instead of guessing', () => {
    expect(getQuote('sculpture', 'A3', 1, 'switzerland')).toBeNull();
    expect(getQuote('portrait', 'A9', 1, 'switzerland')).toBeNull();
    expect(getQuote('portrait', 'A3', 1, 'moon')).toBeNull();
    expect(getQuote('family', 'A3', 'abc', 'switzerland')).toBeNull();
  });

  it('accepts people as a numeric string (FormData sends strings)', () => {
    expect(getQuote('family', 'A2', '4', 'switzerland')?.drawing).toBe(2540);
  });

  it('every shipping zone exists in pricing.json', () => {
    for (const zone of SHIPPING_ZONES) {
      expect(pricing.shipping[zone]).toBeTypeOf('number');
    }
  });
});
