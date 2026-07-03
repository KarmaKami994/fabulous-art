/**
 * Email templates for POST /api/order — extracted from order.ts so the
 * request-handling logic stays reviewable.
 *
 * Contract:
 *  - `data` contains RAW (length-capped, control-char-stripped) user input.
 *  - HTML builders escape every interpolated value AT THE SINK via escapeHtml.
 *  - Plain-text builders and subjects use the raw values (no HTML entities
 *    in inbox subjects like "O&#x27;Brien &amp; Söhne" anymore).
 *  - Prices come from the server-side Quote (src/lib/pricing.ts), never from
 *    the client.
 */
import { escapeHtml } from '../../src/lib/sanitize';
import type { Quote } from '../../src/lib/pricing';

export interface OrderEmailInput {
  data: Record<string, string>;
  quote: Quote;
  imageName: string | null;
  imageKey: string | null;
  orderId: string;
  locale: string;
}

const chf = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;

const OWNER_PKG_LABELS: Record<string, string> = {
  portrait: 'Portrait',
  family: 'Family Portrait',
  creative: 'Creative Package',
};
const OWNER_SHIP_LABELS: Record<string, string> = {
  switzerland: 'Schweiz',
  europe: 'EU',
  worldwide: 'Weltweit',
};
const OWNER_FORMAT_LABELS: Record<string, string> = {
  horizontal: 'Horizontal',
  vertical: 'Vertikal',
};

export function buildOwnerSubject(input: OrderEmailInput): string {
  const { data, orderId } = input;
  return `Neue Bestellung ${orderId}: ${OWNER_PKG_LABELS[data.package] || data.package} — ${data.firstName} ${data.lastName}`;
}

export function buildOwnerHtml(input: OrderEmailInput): string {
  const { data, quote, imageName, imageKey, orderId } = input;
  const e = escapeHtml;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #171717; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #0a0a0a; color: #fff; padding: 32px; text-align: center; }
    .header h1 { font-size: 24px; font-weight: 300; letter-spacing: 0.1em; margin: 0; }
    .header p { font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #a3a3a3; margin: 8px 0 0; }
    .body { padding: 32px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #737373; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    table td { padding: 6px 0; font-size: 14px; vertical-align: top; }
    table td:first-child { color: #737373; width: 140px; }
    table td:last-child { font-weight: 500; }
    .total-row td { border-top: 2px solid #0a0a0a; font-size: 16px; font-weight: 600; padding-top: 12px; }
    .idea-box { background: #fafafa; border-left: 3px solid #0a0a0a; padding: 16px; margin: 12px 0; font-style: italic; color: #525252; }
    .image-note { background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #0369a1; }
    .footer { padding: 24px 32px; background: #fafafa; text-align: center; font-size: 12px; color: #a3a3a3; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Neue Bestellung</h1>
      <p>${e(OWNER_PKG_LABELS[data.package] || data.package)} &middot; ${e(orderId)}</p>
    </div>
    <div class="body">

      <div class="section">
        <div class="section-title">Auftrag</div>
        <table>
          <tr><td>Paket</td><td>${e(OWNER_PKG_LABELS[data.package] || data.package)}</td></tr>
          <tr><td>Grösse</td><td>${e(data.size || '—')}</td></tr>
          ${data.format ? `<tr><td>Format</td><td>${e(OWNER_FORMAT_LABELS[data.format] || data.format)}</td></tr>` : ''}
          ${data.people ? `<tr><td>Personen</td><td>${e(data.people)}</td></tr>` : ''}
          <tr><td>Versand</td><td>${e(OWNER_SHIP_LABELS[data.shipping] || data.shipping)}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Preise (serverseitig berechnet)</div>
        <table>
          <tr><td>Zeichnung</td><td>${chf(quote.drawing)}</td></tr>
          ${quote.creative > 0 ? `<tr><td>Creative Package</td><td>${chf(quote.creative)}</td></tr>` : ''}
          <tr><td>Verpackung</td><td>${chf(quote.packaging)}</td></tr>
          <tr><td>Versand</td><td>${chf(quote.shipping)}</td></tr>
          <tr class="total-row"><td>Total</td><td>${chf(quote.total)}</td></tr>
        </table>
      </div>

      ${data.idea ? `
      <div class="section">
        <div class="section-title">Idee / Beschreibung</div>
        <div class="idea-box">${e(data.idea).replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      ${data.message ? `
      <div class="section">
        <div class="section-title">Nachricht des Kunden</div>
        <div class="idea-box">${e(data.message).replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      ${imageName ? `
      <div class="section">
        <div class="section-title">Referenzbild</div>
        <div class="image-note">
          📎 <strong>${e(imageName)}</strong><br>
          Gespeichert in R2: <code>${e(imageKey || '')}</code>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Kontakt</div>
        <table>
          <tr><td>Name</td><td>${e(data.firstName)} ${e(data.lastName)}</td></tr>
          <tr><td>E-Mail</td><td><a href="mailto:${e(data.email)}">${e(data.email)}</a></td></tr>
          ${data.phone ? `<tr><td>Telefon</td><td>${e(data.phone)}</td></tr>` : ''}
          <tr><td>Adresse</td><td>${e(data.address)}, ${e(data.zip)} ${e(data.city)}</td></tr>
          ${data.country ? `<tr><td>Land</td><td>${e(data.country)}</td></tr>` : ''}
        </table>
      </div>

    </div>
    <div class="footer">
      Diese E-Mail wurde automatisch über fabulous-art.ch gesendet.<br>
      Bestell-ID: ${e(orderId)} (vollständige Daten in R2 unter orders/${e(orderId)}/order.json)<br>
      Antworten geht direkt an den Kunden (Reply-To: ${e(data.email)}).
    </div>
  </div>
</body>
</html>`.trim();
}

export function buildOwnerText(input: OrderEmailInput): string {
  const { data, quote, imageName, orderId } = input;
  let text = `NEUE BESTELLUNG ${orderId} — FABulousART\n`;
  text += `${'='.repeat(40)}\n\n`;
  text += `Paket: ${data.package}\n`;
  text += `Grösse: ${data.size}\n`;
  if (data.format) text += `Format: ${data.format}\n`;
  if (data.people) text += `Personen: ${data.people}\n`;
  text += `Versand: ${data.shipping}\n\n`;

  text += `PREISE (serverseitig berechnet)\n${'-'.repeat(20)}\n`;
  text += `Zeichnung: ${chf(quote.drawing)}\n`;
  if (quote.creative > 0) text += `Creative: ${chf(quote.creative)}\n`;
  text += `Verpackung: ${chf(quote.packaging)}\n`;
  text += `Versand: ${chf(quote.shipping)}\n`;
  text += `Total: ${chf(quote.total)}\n\n`;

  if (data.idea) text += `IDEE\n${'-'.repeat(20)}\n${data.idea}\n\n`;
  if (data.message) text += `NACHRICHT\n${'-'.repeat(20)}\n${data.message}\n\n`;
  if (imageName) text += `REFERENZBILD: ${imageName}\n\n`;

  text += `KONTAKT\n${'-'.repeat(20)}\n`;
  text += `${data.firstName} ${data.lastName}\n`;
  text += `${data.email}\n`;
  if (data.phone) text += `${data.phone}\n`;
  text += `${data.address}, ${data.zip} ${data.city}\n`;
  if (data.country) text += `${data.country}\n`;

  return text;
}

export function buildCustomerSubject(locale: string): string {
  return locale === 'de'
    ? 'Deine Anfrage bei FABulousART — Bestätigung'
    : 'Your FABulousART inquiry — Confirmation';
}

export function buildCustomerHtml(input: OrderEmailInput): string {
  const { data, quote, locale } = input;
  const isDE = locale === 'de';
  const e = escapeHtml;

  const packageLabels: Record<string, Record<string, string>> = {
    de: { portrait: 'Portrait', family: 'Familien-Portrait', creative: 'Creative Package' },
    en: { portrait: 'Portrait', family: 'Family Portrait', creative: 'Creative Package' },
  };
  const shippingLabels: Record<string, Record<string, string>> = {
    de: { switzerland: 'Schweiz', europe: 'EU', worldwide: 'Weltweit' },
    en: { switzerland: 'Switzerland', europe: 'EU', worldwide: 'Worldwide' },
  };

  const pkg = packageLabels[locale]?.[data.package] || data.package;
  const ship = shippingLabels[locale]?.[data.shipping] || data.shipping;

  const t = {
    greeting: isDE ? `Liebe/r ${data.firstName},` : `Dear ${data.firstName},`,
    thankYou: isDE
      ? 'Vielen Dank für deine Anfrage! Ich freue mich sehr über dein Interesse an einer individuellen Zeichnung.'
      : "Thank you so much for your inquiry! I'm thrilled about your interest in a custom drawing.",
    received: isDE
      ? 'Ich habe deine Anfrage erhalten und werde mich innerhalb von 2–3 Werktagen bei dir melden, um die Details zu besprechen.'
      : "I've received your inquiry and will get back to you within 2–3 business days to discuss the details.",
    summary: isDE ? 'Zusammenfassung deiner Anfrage' : 'Summary of your inquiry',
    package: isDE ? 'Paket' : 'Package',
    size: isDE ? 'Grösse' : 'Size',
    people: isDE ? 'Personen' : 'People',
    shipping: isDE ? 'Versand' : 'Shipping',
    drawing: isDE ? 'Zeichnung' : 'Drawing',
    packaging: isDE ? 'Verpackung' : 'Packaging',
    total: isDE ? 'Geschätzter Gesamtpreis' : 'Estimated total',
    idea: isDE ? 'Deine Idee' : 'Your idea',
    message: isDE ? 'Deine Nachricht' : 'Your message',
    image: isDE ? 'Referenzbild hochgeladen' : 'Reference image uploaded',
    questions: isDE
      ? 'Falls du Fragen hast, antworte einfach auf diese E-Mail — ich bin gerne für dich da.'
      : "If you have any questions, simply reply to this email — I'm happy to help.",
    closing: isDE ? 'Herzliche Grüsse,' : 'Warm regards,',
    note: isDE
      ? 'Dies ist eine automatische Bestätigung. Bitte beachte, dass die genannten Preise unverbindlich sind und im persönlichen Gespräch finalisiert werden.'
      : 'This is an automated confirmation. Please note that the prices mentioned are non-binding and will be finalized during our personal consultation.',
  };

  return `
<!DOCTYPE html>
<html lang="${locale === 'en' ? 'en' : 'de'}">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #171717; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #0a0a0a; color: #fff; padding: 40px 32px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; margin: 0; }
    .header p { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #a3a3a3; margin: 12px 0 0; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 16px; margin-bottom: 20px; }
    .text { font-size: 14px; line-height: 1.7; color: #404040; margin-bottom: 16px; }
    .summary-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; margin: 28px 0; }
    .summary-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #737373; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    table td { padding: 8px 0; font-size: 14px; vertical-align: top; }
    table td:first-child { color: #737373; width: 140px; }
    table td:last-child { font-weight: 500; }
    .total-row td { border-top: 2px solid #0a0a0a; font-size: 15px; font-weight: 600; padding-top: 14px; margin-top: 8px; }
    .idea-box { background: #fff; border-left: 3px solid #0a0a0a; padding: 14px 16px; margin: 12px 0; font-style: italic; color: #525252; font-size: 14px; }
    .closing { font-size: 14px; line-height: 1.7; color: #404040; margin-top: 28px; }
    .signature { margin-top: 8px; font-weight: 500; font-size: 14px; }
    .footer { padding: 24px 32px; background: #fafafa; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #a3a3a3; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FABulousART</h1>
      <p>Hyperrealistic Charcoal Art</p>
    </div>
    <div class="body">
      <p class="greeting">${e(t.greeting)}</p>
      <p class="text">${e(t.thankYou)}</p>
      <p class="text">${e(t.received)}</p>

      <div class="summary-card">
        <div class="summary-title">${e(t.summary)}</div>
        <table>
          <tr><td>${e(t.package)}</td><td>${e(pkg)}</td></tr>
          <tr><td>${e(t.size)}</td><td>${e(data.size || '—')}</td></tr>
          ${data.people ? `<tr><td>${e(t.people)}</td><td>${e(data.people)}</td></tr>` : ''}
          <tr><td>${e(t.shipping)}</td><td>${e(ship)}</td></tr>
        </table>

        <table style="margin-top: 16px;">
          <tr><td>${e(t.drawing)}</td><td>${chf(quote.drawing)}</td></tr>
          ${quote.creative > 0 ? `<tr><td>Creative</td><td>${chf(quote.creative)}</td></tr>` : ''}
          <tr><td>${e(t.packaging)}</td><td>${chf(quote.packaging)}</td></tr>
          <tr><td>${e(t.shipping)}</td><td>${chf(quote.shipping)}</td></tr>
          <tr class="total-row"><td>${e(t.total)}</td><td>${chf(quote.total)}</td></tr>
        </table>

        ${data.idea ? `
        <div style="margin-top: 16px;">
          <div class="summary-title">${e(t.idea)}</div>
          <div class="idea-box">${e(data.idea).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        ${data.message ? `
        <div style="margin-top: 16px;">
          <div class="summary-title">${e(t.message)}</div>
          <div class="idea-box">${e(data.message).replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        ${input.imageName ? `<p style="font-size: 13px; color: #737373; margin-top: 12px;">📎 ${e(t.image)}</p>` : ''}
      </div>

      <p class="text">${e(t.questions)}</p>

      <div class="closing">
        <p>${e(t.closing)}</p>
        <p class="signature">Fabienne Meyer</p>
        <p style="font-size: 13px; color: #737373;">FABulousART — fabulous-art.ch</p>
      </div>
    </div>
    <div class="footer">
      ${e(t.note)}<br><br>
      FABulousART &middot; Fabienne Meyer &middot; Zürich, Switzerland<br>
      <a href="https://www.fabulous-art.ch" style="color: #737373;">www.fabulous-art.ch</a>
    </div>
  </div>
</body>
</html>`.trim();
}

export function buildCustomerText(input: OrderEmailInput): string {
  const { data, quote, locale } = input;
  const isDE = locale === 'de';

  let text = isDE
    ? `Liebe/r ${data.firstName},\n\nVielen Dank für deine Anfrage bei FABulousART!\n\n`
    : `Dear ${data.firstName},\n\nThank you for your inquiry at FABulousART!\n\n`;

  text += isDE ? `ZUSAMMENFASSUNG\n${'-'.repeat(30)}\n` : `SUMMARY\n${'-'.repeat(30)}\n`;
  text += `${isDE ? 'Paket' : 'Package'}: ${data.package}\n`;
  text += `${isDE ? 'Grösse' : 'Size'}: ${data.size}\n`;
  if (data.people) text += `${isDE ? 'Personen' : 'People'}: ${data.people}\n`;
  text += `${isDE ? 'Versand' : 'Shipping'}: ${data.shipping}\n`;
  text += `\n${isDE ? 'Geschätzter Gesamtpreis' : 'Estimated total'}: ${chf(quote.total)}\n`;

  if (data.idea) text += `\n${isDE ? 'Deine Idee' : 'Your idea'}:\n${data.idea}\n`;
  if (data.message) text += `\n${isDE ? 'Deine Nachricht' : 'Your message'}:\n${data.message}\n`;

  text += isDE
    ? `\nIch werde mich innerhalb von 2–3 Werktagen bei dir melden.\n\nHerzliche Grüsse,\nFabienne Meyer\nFABulousART — fabulous-art.ch`
    : `\nI'll get back to you within 2–3 business days.\n\nWarm regards,\nFabienne Meyer\nFABulousART — fabulous-art.ch`;

  return text;
}
