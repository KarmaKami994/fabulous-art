import de from './de.json';
import en from './en.json';

const translations: Record<string, typeof de> = { de, en };

export type Locale = 'de' | 'en';

export function t(locale: Locale, key: string): string {
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

export const locales: Locale[] = ['de', 'en'];
export const defaultLocale: Locale = 'de';
