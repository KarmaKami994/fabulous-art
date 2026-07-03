import de from './de.json';
import en from './en.json';

const translations: Record<string, typeof de> = { de, en };

export type Locale = 'de' | 'en';

/**
 * Build-time-typed translation keys: every dot-path into de.json is a valid
 * key; anything else fails `astro check`. A typo like 'home.heroTitel' is now
 * a compile error instead of literal text shipping to production.
 */
type DotPaths<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? `${K}.${DotPaths<T[K]>}` : K }[keyof T & string]
  : never;

export type TranslationKey = DotPaths<typeof de>;

export function t(locale: Locale, key: TranslationKey): string {
  const keys = key.split('.');
  let value: any = translations[locale];
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split('/');
  if (locale === 'en') return 'en';
  return 'de';
}

export function getLocalizedPath(path: string, locale: Locale): string {
  return `/${locale}${path}`;
}

/**
 * Slugs that differ between locales. Everything not listed here shares its
 * slug across languages.
 */
const SLUG_MAP: Record<string, string> = {
  datenschutz: 'privacy', // de → en
};
const SLUG_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_MAP).map(([deSlug, enSlug]) => [enSlug, deSlug])
);

/**
 * Compute the same page's URL in the other locale, translating
 * locale-specific slugs (/de/datenschutz ↔ /en/privacy).
 * Used by both the Header language switcher and the hreflang alternates —
 * previously each did a naive string replace and produced /en/datenschutz
 * (404) on the privacy page.
 */
export function getAlternatePath(pathname: string, locale: Locale): string {
  const alternate: Locale = locale === 'de' ? 'en' : 'de';
  const prefix = `/${locale}`;
  let rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  if (rest === '' ) rest = '/';

  const map = locale === 'de' ? SLUG_MAP : SLUG_MAP_REVERSE;
  const segments = rest.split('/').map(seg => map[seg] ?? seg);
  rest = segments.join('/');

  return `/${alternate}${rest}`;
}

export const locales: Locale[] = ['de', 'en'];
export const defaultLocale: Locale = 'de';
