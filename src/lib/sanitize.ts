/**
 * HTML escaping — applied AT THE SINK (when interpolating into HTML),
 * never at input time. Shared by the wizard summary renderer (client)
 * and the email template builders (server).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Trim + collapse dangerous control chars + enforce a max length. */
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

/** Field length limits shared between client hints and server enforcement. */
export const FIELD_LIMITS = {
  firstName: 100,
  lastName: 100,
  email: 254,
  phone: 50,
  address: 200,
  zip: 20,
  city: 100,
  country: 100,
  idea: 2000,
  message: 2000,
} as const;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
