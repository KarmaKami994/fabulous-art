import { describe, it, expect } from 'vitest';
import { escapeHtml, cleanText, FIELD_LIMITS, EMAIL_RE } from '../src/lib/sanitize';
import { getAlternatePath } from '../src/i18n/utils';

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#x27;xss&#x27;)&quot;&gt;&amp;'
    );
  });

  it('leaves names with umlauts and apostrophes readable', () => {
    expect(escapeHtml('Müller')).toBe('Müller');
    expect(escapeHtml("O'Brien")).toBe('O&#x27;Brien');
  });
});

describe('cleanText', () => {
  it('trims, strips control characters, enforces max length', () => {
    expect(cleanText('  hello\u0000world  ', 100)).toBe('helloworld');
    expect(cleanText('a'.repeat(50), 10)).toHaveLength(10);
  });

  it('keeps newlines (needed for idea/message fields)', () => {
    expect(cleanText('line1\nline2', 100)).toBe('line1\nline2');
  });

  it('returns empty string for non-string input', () => {
    expect(cleanText(null, 10)).toBe('');
    expect(cleanText(42 as unknown, 10)).toBe('');
  });

  it('has limits for every order field', () => {
    for (const field of ['firstName', 'lastName', 'email', 'phone', 'address', 'zip', 'city', 'country', 'idea', 'message'] as const) {
      expect(FIELD_LIMITS[field]).toBeGreaterThan(0);
    }
  });
});

describe('EMAIL_RE', () => {
  it('accepts normal addresses and rejects garbage', () => {
    expect(EMAIL_RE.test('anna@example.ch')).toBe(true);
    expect(EMAIL_RE.test('not-an-email')).toBe(false);
    expect(EMAIL_RE.test('a b@c.d')).toBe(false);
  });
});

describe('getAlternatePath', () => {
  it('switches plain pages between locales', () => {
    expect(getAlternatePath('/de/portfolio', 'de')).toBe('/en/portfolio');
    expect(getAlternatePath('/en/about', 'en')).toBe('/de/about');
    expect(getAlternatePath('/de/', 'de')).toBe('/en/');
  });

  it('translates locale-specific slugs (the /en/datenschutz 404 bug)', () => {
    expect(getAlternatePath('/de/datenschutz', 'de')).toBe('/en/privacy');
    expect(getAlternatePath('/en/privacy', 'en')).toBe('/de/datenschutz');
  });

  it('handles nested paths', () => {
    expect(getAlternatePath('/de/news/mein-artikel', 'de')).toBe('/en/news/mein-artikel');
    expect(getAlternatePath('/de/portfolio/purity', 'de')).toBe('/en/portfolio/purity');
  });
});
