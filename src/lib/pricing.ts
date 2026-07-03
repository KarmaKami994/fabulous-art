/**
 * Single source of truth for commission pricing.
 *
 * Reads src/data/pricing.json (editable via the CMS "Pricing" collection).
 * Used by:
 *   - the commission wizard (client, bundled)      → live price summary
 *   - functions/api/order.ts (server)              → authoritative recompute
 *   - tests/pricing.test.ts                        → exhaustive combo checks
 *
 * A price of 0 or a missing entry means the combination is NOT available
 * (e.g. Creative A0 with 3–4 people). getQuote() returns null in that case —
 * it never silently prices anything at 0.
 */
import pricing from '../data/pricing.json';

export type PackageId = 'portrait' | 'family' | 'creative';
export type SizeId = 'A3' | 'A2' | 'A1' | 'A0';
export type ShippingZone = 'switzerland' | 'europe' | 'worldwide';

export interface Quote {
  drawing: number;
  creative: number; // 0 for portrait/family
  packaging: number;
  shipping: number;
  total: number;
}

export const SIZES: SizeId[] = ['A3', 'A2', 'A1', 'A0'];
export const SHIPPING_ZONES: ShippingZone[] = ['switzerland', 'europe', 'worldwide'];
export const PACKAGES: PackageId[] = ['portrait', 'family', 'creative'];

const creativeFixed =
  pricing.creative.fixed_costs.photoshoot +
  pricing.creative.fixed_costs.surcharge +
  pricing.creative.fixed_costs.equipment;

function drawingPrice(pkg: PackageId, size: SizeId, people: number): number | null {
  let value: number | undefined;
  if (pkg === 'portrait') {
    value = (pricing.portrait as Record<string, number>)[size];
  } else {
    const table = (pkg === 'family' ? pricing.family : pricing.creative.drawing) as Record<
      string,
      Record<string, number>
    >;
    value = table[size]?.[String(people)];
  }
  return value && value > 0 ? value : null;
}

/** Is a size/people combination orderable for a package? */
export function isAvailable(pkg: PackageId, size: SizeId, people: number): boolean {
  return drawingPrice(pkg, size, people) !== null;
}

/** People choices offered per package (portrait is always 1). */
export function peopleOptions(pkg: PackageId): number[] {
  if (pkg === 'portrait') return [1];
  if (pkg === 'family') return [2, 3, 4, 5, 6, 7, 8, 9, 10];
  return [1, 2, 3, 4];
}

/**
 * Compute the full quote. Returns null if the combination is unavailable
 * or any input is invalid — callers must treat null as "cannot order".
 */
export function getQuote(
  pkg: string,
  size: string,
  people: number | string,
  shipping: string
): Quote | null {
  if (!PACKAGES.includes(pkg as PackageId)) return null;
  if (!SIZES.includes(size as SizeId)) return null;
  if (!SHIPPING_ZONES.includes(shipping as ShippingZone)) return null;

  const p = pkg as PackageId;
  const n = p === 'portrait' ? 1 : parseInt(String(people), 10);
  if (!Number.isInteger(n) || !peopleOptions(p).includes(n)) return null;

  const drawing = drawingPrice(p, size as SizeId, n);
  if (drawing === null) return null;

  const creative = p === 'creative' ? creativeFixed : 0;
  const packaging = pricing.packaging;
  const shippingCost = pricing.shipping[shipping as ShippingZone];

  return {
    drawing,
    creative,
    packaging,
    shipping: shippingCost,
    total: drawing + creative + packaging + shippingCost,
  };
}
