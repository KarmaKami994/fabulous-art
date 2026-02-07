/**
 * Preistabelle — FabulousArt Custom Drawing Packages
 * Basierend auf Preistabelle.xlsx
 * 
 * Grössen: A3, A2, A1, A0
 * Verpackung: CHF 20 (immer inkludiert)
 * Versand: Schweiz 12, EU 34, Weltweit 80
 */

export type PaperSize = 'A3' | 'A2' | 'A1' | 'A0';
export type ShippingZone = 'switzerland' | 'europe' | 'worldwide';
export type PersonCount = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// --- Verpackung & Versand (gleich für alle Pakete) ---
export const PACKAGING_COST = 20;

export const shippingCosts: Record<ShippingZone, number> = {
  switzerland: 12,
  europe: 34,
  worldwide: 80,
};

// --- Package 1: Portrait (Einzelperson) ---
export const package1Prices: Record<PaperSize, number> = {
  A3: 870,
  A2: 1750,
  A1: 3500,
  A0: 6500,
};

// --- Package 2: Couple / Family Portrait ---
export const package2Prices: Record<PaperSize, Record<PersonCount, number>> = {
  A3: { 2: 1070, 3: 1270, 4: 1470, 5: 1670, 6: 2070, 7: 2470, 8: 2770, 9: 3070, 10: 3370 },
  A2: { 2: 2140, 3: 2340, 4: 2540, 5: 2740, 6: 3140, 7: 3540, 8: 3840, 9: 4140, 10: 4440 },
  A1: { 2: 4280, 3: 4480, 4: 4680, 5: 4880, 6: 5280, 7: 5680, 8: 5980, 9: 6280, 10: 6580 },
  A0: { 2: 8500, 3: 8700, 4: 8900, 5: 9100, 6: 9500, 7: 9900, 8: 10200, 9: 10500, 10: 10800 },
};

// --- Package 3: Creative Package ---
// Fixkosten immer inkludiert:
export const CREATIVE_FOTOSHOOTING = 150;
export const CREATIVE_SHOOTING_ZUSCHLAG = 100;
export const CREATIVE_EQUIPMENT = 60;
export const CREATIVE_FIXED = CREATIVE_FOTOSHOOTING + CREATIVE_SHOOTING_ZUSCHLAG + CREATIVE_EQUIPMENT; // 310

// Basispreise (Zeichnung) — ⚠️ A2/4P und A1/4P scheinen Tippfehler zu sein, bitte prüfen
type CreativePersonCount = 1 | 2 | 3 | 4;
export const package3Prices: Record<PaperSize, Record<CreativePersonCount, number>> = {
  A3: { 1: 870, 2: 1070, 3: 1270, 4: 1470 },
  A2: { 1: 1750, 2: 2140, 3: 2340, 4: 1680 },  // ⚠️ 4P=1680 evtl. Tippfehler
  A1: { 1: 3500, 2: 4280, 3: 4480, 4: 1890 },   // ⚠️ 4P=1890 evtl. Tippfehler
  A0: { 1: 6500, 2: 8500, 3: 0, 4: 0 },          // 3-4P nicht verfügbar für A0
};

// --- Berechnungsfunktionen ---

export function calcPackage1(size: PaperSize, shipping: ShippingZone): {
  drawing: number; packaging: number; shipping: number; total: number;
} {
  const drawing = package1Prices[size];
  const ship = shippingCosts[shipping];
  return {
    drawing,
    packaging: PACKAGING_COST,
    shipping: ship,
    total: drawing + PACKAGING_COST + ship,
  };
}

export function calcPackage2(size: PaperSize, persons: PersonCount, shipping: ShippingZone): {
  drawing: number; packaging: number; shipping: number; total: number;
} {
  const drawing = package2Prices[size][persons];
  const ship = shippingCosts[shipping];
  return {
    drawing,
    packaging: PACKAGING_COST,
    shipping: ship,
    total: drawing + PACKAGING_COST + ship,
  };
}

export function calcPackage3(size: PaperSize, persons: CreativePersonCount, shipping: ShippingZone): {
  drawing: number; creative: number; packaging: number; shipping: number; total: number;
} | null {
  const drawing = package3Prices[size]?.[persons];
  if (!drawing) return null; // Kombination nicht verfügbar
  const ship = shippingCosts[shipping];
  return {
    drawing,
    creative: CREATIVE_FIXED,
    packaging: PACKAGING_COST,
    shipping: ship,
    total: drawing + CREATIVE_FIXED + PACKAGING_COST + ship,
  };
}

export function formatCHF(amount: number): string {
  return `CHF ${amount.toLocaleString('de-CH')}`;
}
