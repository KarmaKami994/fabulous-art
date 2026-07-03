/**
 * Structured-data (JSON-LD) builders shared by both locales.
 *
 * Everything Google can show rich results for on this site:
 *  - VisualArtwork      → portfolio detail pages (image, medium, price)
 *  - NewsArticle        → news posts (publish date, image)
 *  - Service + Offers   → commission page, prices from src/lib/pricing.ts
 *                         (the same single source the wizard and API use)
 *  - BreadcrumbList     → detail pages
 */
import type { Locale } from '../i18n/utils';
import type { PortfolioWork } from './portfolio';
import { getQuote } from './pricing';

const SITE = 'https://www.fabulous-art.ch';

const ARTIST = {
  '@type': 'Person',
  name: 'Fabienne Meyer',
  alternateName: 'FabulousArt',
  url: SITE,
};

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

/** Parses "CHF 15'500" → 15500; returns null for SOLD / unparseable. */
function parsePrice(price: string): number | null {
  const digits = price.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

export function artworkJsonLd(work: PortfolioWork, locale: Locale) {
  const price = work.sold ? null : parsePrice(work.price);
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: work.title,
    url: `${SITE}/${locale}/portfolio/${work.slug}`,
    image: work.imageFull,
    description: work.description[locale],
    creator: ARTIST,
    artMedium: work.medium,
    artform: 'Drawing',
    dateCreated: String(work.year),
    size: work.size,
    ...(price
      ? {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: 'CHF',
            availability: 'https://schema.org/InStock',
            url: `${SITE}/${locale}/portfolio/${work.slug}`,
          },
        }
      : {}),
  };
}

export function newsArticleJsonLd(input: {
  title: string;
  excerpt: string;
  date: string;
  image?: string;
  slug: string;
  locale: Locale;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: input.title,
    description: input.excerpt,
    datePublished: input.date,
    inLanguage: input.locale === 'de' ? 'de-CH' : 'en',
    ...(input.image ? { image: [input.image] } : {}),
    author: ARTIST,
    publisher: ARTIST,
    mainEntityOfPage: `${SITE}/${input.locale}/news/${input.slug}`,
  };
}

/**
 * Commission service with per-package starting prices ("from CHF …"),
 * computed from the live pricing table so schema.org data can never drift
 * from what the wizard charges.
 */
export function commissionServiceJsonLd(locale: Locale) {
  const isDE = locale === 'de';
  // Cheapest configuration per package: smallest size, fewest people, CH shipping — drawing price only.
  const startingPrices = {
    portrait: getQuote('portrait', 'A3', 1, 'switzerland')!.drawing,
    family: getQuote('family', 'A3', 2, 'switzerland')!.drawing,
    creative: (() => {
      const q = getQuote('creative', 'A3', 1, 'switzerland')!;
      return q.drawing + q.creative;
    })(),
  };
  const names = isDE
    ? { portrait: 'Portrait-Zeichnung', family: 'Paar- / Familien-Portrait', creative: 'Creative Package' }
    : { portrait: 'Portrait Drawing', family: 'Couple / Family Portrait', creative: 'Creative Package' };

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: isDE ? 'Individuelle Auftragszeichnung' : 'Custom commissioned drawing',
    name: isDE ? 'Custom Drawing — Auftragszeichnung nach Foto' : 'Custom Drawing — commissioned artwork from photo',
    description: isDE
      ? 'Hyperrealistische Kohlezeichnung nach deinem Foto: Portrait, Familien-Portrait oder Creative Package mit Fotoshooting.'
      : 'Hyperrealistic charcoal drawing from your photo: portrait, family portrait or creative package including photoshoot.',
    provider: ARTIST,
    areaServed: 'Worldwide',
    url: `${SITE}/${locale}/custom-drawing`,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isDE ? 'Zeichnungs-Pakete' : 'Drawing packages',
      itemListElement: (['portrait', 'family', 'creative'] as const).map(pkg => ({
        '@type': 'Offer',
        name: names[pkg],
        price: startingPrices[pkg],
        priceCurrency: 'CHF',
        url: `${SITE}/${locale}/custom-drawing#${pkg}`,
      })),
    },
  };
}
