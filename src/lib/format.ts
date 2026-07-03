/**
 * Shared formatting helpers — single source for date & currency formatting.
 * Replaces the copies previously duplicated across home, news index,
 * news detail and wizard pages (DE + EN each).
 */
import type { Locale } from '../i18n/utils';

const MONTH_NAMES: Record<Locale, string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "5. März 2026" (de) / "March 5, 2026" (en) */
export function formatDate(locale: Locale, dateStr: string): string {
  const d = new Date(dateStr);
  const month = MONTH_NAMES[locale][d.getMonth()];
  return locale === 'de'
    ? `${d.getDate()}. ${month} ${d.getFullYear()}`
    : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "März 2026" / "March 2026" from an archive key like "2026-03" */
export function formatArchiveLabel(locale: Locale, key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[locale][parseInt(month, 10) - 1]} ${year}`;
}

/** "CHF 8'500" (Swiss thousands separator) */
export function formatCHF(amount: number): string {
  return `CHF ${amount.toLocaleString('de-CH')}`;
}
