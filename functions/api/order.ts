/**
 * Cloudflare Pages Function — POST /api/order
 *
 * 1. Rate-limits requests per IP (max 5 orders per hour)
 * 2. Validates Cloudflare Turnstile token (bot protection)
 * 3. Empfängt FormData (Auftragsdaten + optionale Bilder)
 * 4. Speichert Bilder in Cloudflare R2
 * 5. Sendet E-Mails via Mailjet (an Fabienne + Kunde)
 *
 * Environment Variables (in Cloudflare Dashboard setzen):
 *   MAILJET_API_KEY      — Mailjet Public Key
 *   MAILJET_SECRET_KEY   — Mailjet Secret Key
 *   MAILJET_FROM_EMAIL   — Absender-Email
 *   MAILJET_FROM_NAME    — Absender-Name
 *   FABIENNE_EMAIL       — Empfänger
 *   TURNSTILE_SECRET     — Cloudflare Turnstile Secret Key
 *
 * R2 Binding (in wrangler.toml / Cloudflare Dashboard):
 *   ORDER_IMAGES         — R2 Bucket Binding Name
 */

// Type definition for Cloudflare environment
interface Env {
  ORDER_IMAGES: R2Bucket;
  MAILJET_API_KEY: string;
  MAILJET_SECRET_KEY: string;
  MAILJET_FROM_EMAIL: string;
  MAILJET_FROM_NAME: string;
  FABIENNE_EMAIL: string;
  TURNSTILE_SECRET: string;
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// --- Rate Limiting (in-memory, per-isolate) ---
const RATE_LIMIT_MAX = 5;        // Max orders per window
const RATE_LIMIT_WINDOW = 3600;  // Window in seconds (1 hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// --- Turnstile Verification ---
async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  if (!secret) return true; // Skip if no secret configured (dev mode)
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

// --- Input Sanitization ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers (support both www and non-www)
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://www.fabulous-art.ch', 'https://fabulous-art.ch'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // --- Rate Limiting ---
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Zu viele Anfragen. Bitte versuche es später erneut.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const formData = await request.formData();

    // --- Verify Turnstile Token ---
    const turnstileToken = formData.get('cf-turnstile-response') as string || '';
    const turnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, clientIP);
    if (!turnstileValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bot-Überprüfung fehlgeschlagen. Bitte lade die Seite neu.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- Extract order data ---
    const orderData: Record<string, string> = {};
    const fields = [
      'package', 'size', 'format', 'people', 'shipping',
      'idea', 'firstName', 'lastName', 'email', 'phone',
      'address', 'zip', 'city', 'country', 'locale',
    ];

    for (const field of fields) {
      const value = formData.get(field);
      if (value && typeof value === 'string') {
        orderData[field] = escapeHtml(value);
      }
    }

    // --- Price data (only allow digits and dots) ---
    const priceFields = ['drawingPrice', 'creativePrice', 'packagingPrice', 'shippingPrice', 'totalPrice'];
    for (const field of priceFields) {
      const value = formData.get(field);
      if (value && typeof value === 'string') {
        orderData[field] = value.replace(/[^0-9.]/g, '');
      }
    }

    // --- Validate required fields ---
    const required = ['package', 'size', 'shipping', 'firstName', 'lastName', 'email', 'address', 'zip', 'city'];
    for (const field of required) {
      if (!orderData[field]) {
        return new Response(
          JSON.stringify({ success: false, error: `Pflichtfeld fehlt: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // --- Validate email ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ungültige E-Mail-Adresse' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- Handle image upload to R2 ---
    let imageUrl: string | null = null;
    let imageName: string | null = null;
    const imageFile = formData.get('image') as File | null;

    if (imageFile && imageFile.size > 0) {
      // Validate file
      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nur JPG, PNG oder WEBP erlaubt' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ success: false, error: 'Datei zu gross (max. 10 MB)' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = `orders/${timestamp}_${sanitizedName}`;

      // Upload to R2
      await env.ORDER_IMAGES.put(r2Key, imageFile.stream(), {
        httpMetadata: { contentType: imageFile.type },
        customMetadata: {
          originalName: imageFile.name,
          orderEmail: orderData.email,
          uploadedAt: new Date().toISOString(),
        },
      });

      imageUrl = r2Key;
      imageName = imageFile.name;
    }

    // --- Build email content ---
    const locale = orderData.locale || 'de';
    const emailHtml = buildEmailHtml(orderData, imageName, imageUrl, locale);
    const emailText = buildEmailText(orderData, imageName, locale);
    const confirmHtml = buildCustomerConfirmationHtml(orderData, locale);
    const confirmText = buildCustomerConfirmationText(orderData, locale);

    // --- Send emails via Mailjet (both in one request) ---
    const confirmSubject = locale === 'de'
      ? 'Deine Anfrage bei FABulousART — Bestätigung'
      : 'Your FABulousART inquiry — Confirmation';

    const mailjetResponse = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        Messages: [
          // Message 1: Notification to Fabienne
          {
            From: {
              Email: env.MAILJET_FROM_EMAIL,
              Name: env.MAILJET_FROM_NAME || 'FABulousART',
            },
            To: [
              {
                Email: env.FABIENNE_EMAIL,
                Name: 'Fabienne Meyer',
              },
            ],
            Subject: `Neue Bestellung: ${orderData.package} — ${orderData.firstName} ${orderData.lastName}`,
            TextPart: emailText,
            HTMLPart: emailHtml,
            ReplyTo: {
              Email: orderData.email,
              Name: `${orderData.firstName} ${orderData.lastName}`,
            },
          },
          // Message 2: Confirmation to customer
          {
            From: {
              Email: env.MAILJET_FROM_EMAIL,
              Name: 'Fabienne Meyer — FABulousART',
            },
            To: [
              {
                Email: orderData.email,
                Name: `${orderData.firstName} ${orderData.lastName}`,
              },
            ],
            Subject: confirmSubject,
            TextPart: confirmText,
            HTMLPart: confirmHtml,
            ReplyTo: {
              Email: env.FABIENNE_EMAIL,
              Name: 'Fabienne Meyer',
            },
          },
        ],
      }),
    });

    if (!mailjetResponse.ok) {
      const errorBody = await mailjetResponse.text();
      console.error('Mailjet error:', errorBody);
      return new Response(
        JSON.stringify({ success: false, error: 'E-Mail konnte nicht gesendet werden' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- Success ---
    return new Response(
      JSON.stringify({ success: true, message: 'Bestellung erfolgreich übermittelt' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (err) {
    console.error('Order API error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Interner Serverfehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin') || '';
  const allowedOrigins = ['https://www.fabulous-art.ch', 'https://fabulous-art.ch'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

// --- Email Templates ---

function buildEmailHtml(
  data: Record<string, string>,
  imageName: string | null,
  imageUrl: string | null,
  locale: string
): string {
  const packageLabels: Record<string, string> = {
    portrait: 'Portrait',
    family: 'Family Portrait',
    creative: 'Creative Package',
  };

  const shippingLabels: Record<string, string> = {
    switzerland: 'Schweiz',
    europe: 'EU',
    worldwide: 'Weltweit',
  };

  const formatLabels: Record<string, string> = {
    landscape: 'Querformat',
    portrait: 'Hochformat',
  };

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
    .row { display: flex; padding: 6px 0; }
    .label { color: #737373; font-size: 14px; min-width: 140px; }
    .value { font-size: 14px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    table td { padding: 6px 0; font-size: 14px; vertical-align: top; }
    table td:first-child { color: #737373; width: 140px; }
    table td:last-child { font-weight: 500; }
    .price-row td { border-top: 1px solid #e5e5e5; padding-top: 10px; }
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
      <p>${packageLabels[data.package] || data.package}</p>
    </div>
    <div class="body">

      <div class="section">
        <div class="section-title">Auftrag</div>
        <table>
          <tr><td>Paket</td><td>${packageLabels[data.package] || data.package}</td></tr>
          <tr><td>Grösse</td><td>${data.size || '—'}</td></tr>
          ${data.format ? `<tr><td>Format</td><td>${formatLabels[data.format] || data.format}</td></tr>` : ''}
          ${data.people ? `<tr><td>Personen</td><td>${data.people}</td></tr>` : ''}
          <tr><td>Versand</td><td>${shippingLabels[data.shipping] || data.shipping}</td></tr>
        </table>
      </div>

      ${data.drawingPrice ? `
      <div class="section">
        <div class="section-title">Preise</div>
        <table>
          <tr><td>Zeichnung</td><td>CHF ${data.drawingPrice}</td></tr>
          ${data.creativePrice && data.creativePrice !== '0' ? `<tr><td>Creative Package</td><td>CHF ${data.creativePrice}</td></tr>` : ''}
          <tr><td>Verpackung</td><td>CHF ${data.packagingPrice || '20'}</td></tr>
          <tr><td>Versand</td><td>CHF ${data.shippingPrice || '—'}</td></tr>
          <tr class="total-row"><td>Total</td><td>CHF ${data.totalPrice || '—'}</td></tr>
        </table>
      </div>
      ` : ''}

      ${data.idea ? `
      <div class="section">
        <div class="section-title">Idee / Beschreibung</div>
        <div class="idea-box">${data.idea.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      ${imageName ? `
      <div class="section">
        <div class="section-title">Referenzbild</div>
        <div class="image-note">
          📎 <strong>${imageName}</strong><br>
          Gespeichert in R2: <code>${imageUrl}</code>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Kontakt</div>
        <table>
          <tr><td>Name</td><td>${data.firstName} ${data.lastName}</td></tr>
          <tr><td>E-Mail</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>
          ${data.phone ? `<tr><td>Telefon</td><td>${data.phone}</td></tr>` : ''}
          <tr><td>Adresse</td><td>${data.address}, ${data.zip} ${data.city}</td></tr>
          ${data.country ? `<tr><td>Land</td><td>${data.country}</td></tr>` : ''}
        </table>
      </div>

    </div>
    <div class="footer">
      Diese E-Mail wurde automatisch über fabulous-art.ch gesendet.<br>
      Antworten geht direkt an den Kunden (Reply-To: ${data.email}).
    </div>
  </div>
</body>
</html>`.trim();
}

function buildEmailText(
  data: Record<string, string>,
  imageName: string | null,
  locale: string
): string {
  let text = `NEUE BESTELLUNG — FABulousART\n`;
  text += `${'='.repeat(40)}\n\n`;
  text += `Paket: ${data.package}\n`;
  text += `Grösse: ${data.size}\n`;
  if (data.format) text += `Format: ${data.format}\n`;
  if (data.people) text += `Personen: ${data.people}\n`;
  text += `Versand: ${data.shipping}\n\n`;

  if (data.totalPrice) {
    text += `PREISE\n${'-'.repeat(20)}\n`;
    text += `Zeichnung: CHF ${data.drawingPrice}\n`;
    if (data.creativePrice && data.creativePrice !== '0') text += `Creative: CHF ${data.creativePrice}\n`;
    text += `Verpackung: CHF ${data.packagingPrice || '20'}\n`;
    text += `Versand: CHF ${data.shippingPrice}\n`;
    text += `Total: CHF ${data.totalPrice}\n\n`;
  }

  if (data.idea) text += `IDEE\n${'-'.repeat(20)}\n${data.idea}\n\n`;
  if (imageName) text += `REFERENZBILD: ${imageName}\n\n`;

  text += `KONTAKT\n${'-'.repeat(20)}\n`;
  text += `${data.firstName} ${data.lastName}\n`;
  text += `${data.email}\n`;
  if (data.phone) text += `${data.phone}\n`;
  text += `${data.address}, ${data.zip} ${data.city}\n`;
  if (data.country) text += `${data.country}\n`;

  return text;
}

// --- Customer Confirmation Email Templates ---

function buildCustomerConfirmationHtml(
  data: Record<string, string>,
  locale: string
): string {
  const isDE = locale === 'de';

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
    greeting: isDE
      ? `Liebe/r ${data.firstName},`
      : `Dear ${data.firstName},`,
    thankYou: isDE
      ? 'Vielen Dank für deine Anfrage! Ich freue mich sehr über dein Interesse an einer individuellen Zeichnung.'
      : 'Thank you so much for your inquiry! I\'m thrilled about your interest in a custom drawing.',
    received: isDE
      ? 'Ich habe deine Anfrage erhalten und werde mich innerhalb von 2–3 Werktagen bei dir melden, um die Details zu besprechen.'
      : 'I\'ve received your inquiry and will get back to you within 2–3 business days to discuss the details.',
    summary: isDE ? 'Zusammenfassung deiner Anfrage' : 'Summary of your inquiry',
    package: isDE ? 'Paket' : 'Package',
    size: isDE ? 'Grösse' : 'Size',
    people: isDE ? 'Personen' : 'People',
    shipping: isDE ? 'Versand' : 'Shipping',
    drawing: isDE ? 'Zeichnung' : 'Drawing',
    packaging: isDE ? 'Verpackung' : 'Packaging',
    total: isDE ? 'Geschätzter Gesamtpreis' : 'Estimated total',
    idea: isDE ? 'Deine Idee' : 'Your idea',
    image: isDE ? 'Referenzbild hochgeladen' : 'Reference image uploaded',
    questions: isDE
      ? 'Falls du Fragen hast, antworte einfach auf diese E-Mail — ich bin gerne für dich da.'
      : 'If you have any questions, simply reply to this email — I\'m happy to help.',
    closing: isDE ? 'Herzliche Grüsse,' : 'Warm regards,',
    note: isDE
      ? 'Dies ist eine automatische Bestätigung. Bitte beachte, dass die genannten Preise unverbindlich sind und im persönlichen Gespräch finalisiert werden.'
      : 'This is an automated confirmation. Please note that the prices mentioned are non-binding and will be finalized during our personal consultation.',
  };

  return `
<!DOCTYPE html>
<html lang="${locale}">
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
      <p class="greeting">${t.greeting}</p>
      <p class="text">${t.thankYou}</p>
      <p class="text">${t.received}</p>

      <div class="summary-card">
        <div class="summary-title">${t.summary}</div>
        <table>
          <tr><td>${t.package}</td><td>${pkg}</td></tr>
          <tr><td>${t.size}</td><td>${data.size || '—'}</td></tr>
          ${data.people ? `<tr><td>${t.people}</td><td>${data.people}</td></tr>` : ''}
          <tr><td>${t.shipping}</td><td>${ship}</td></tr>
        </table>

        ${data.totalPrice ? `
        <table style="margin-top: 16px;">
          <tr><td>${t.drawing}</td><td>CHF ${data.drawingPrice}</td></tr>
          ${data.creativePrice && data.creativePrice !== '0' ? `<tr><td>Creative</td><td>CHF ${data.creativePrice}</td></tr>` : ''}
          <tr><td>${t.packaging}</td><td>CHF ${data.packagingPrice || '20'}</td></tr>
          <tr><td>${t.shipping}</td><td>CHF ${data.shippingPrice || '—'}</td></tr>
          <tr class="total-row"><td>${t.total}</td><td>CHF ${data.totalPrice}</td></tr>
        </table>
        ` : ''}

        ${data.idea ? `
        <div style="margin-top: 16px;">
          <div class="summary-title">${t.idea}</div>
          <div class="idea-box">${data.idea.replace(/\n/g, '<br>')}</div>
        </div>
        ` : ''}

        ${data.image ? `<p style="font-size: 13px; color: #737373; margin-top: 12px;">📎 ${t.image}</p>` : ''}
      </div>

      <p class="text">${t.questions}</p>

      <div class="closing">
        <p>${t.closing}</p>
        <p class="signature">Fabienne Meyer</p>
        <p style="font-size: 13px; color: #737373;">FABulousART — fabulous-art.ch</p>
      </div>
    </div>
    <div class="footer">
      ${t.note}<br><br>
      FABulousART &middot; Fabienne Meyer &middot; Zürich, Switzerland<br>
      <a href="https://www.fabulous-art.ch" style="color: #737373;">www.fabulous-art.ch</a>
    </div>
  </div>
</body>
</html>`.trim();
}

function buildCustomerConfirmationText(
  data: Record<string, string>,
  locale: string
): string {
  const isDE = locale === 'de';
  const pkg = data.package;

  let text = isDE
    ? `Liebe/r ${data.firstName},\n\nVielen Dank für deine Anfrage bei FABulousART!\n\n`
    : `Dear ${data.firstName},\n\nThank you for your inquiry at FABulousART!\n\n`;

  text += isDE ? `ZUSAMMENFASSUNG\n${'-'.repeat(30)}\n` : `SUMMARY\n${'-'.repeat(30)}\n`;
  text += `${isDE ? 'Paket' : 'Package'}: ${pkg}\n`;
  text += `${isDE ? 'Grösse' : 'Size'}: ${data.size}\n`;
  if (data.people) text += `${isDE ? 'Personen' : 'People'}: ${data.people}\n`;
  text += `${isDE ? 'Versand' : 'Shipping'}: ${data.shipping}\n`;

  if (data.totalPrice) {
    text += `\n${isDE ? 'Geschätzter Gesamtpreis' : 'Estimated total'}: CHF ${data.totalPrice}\n`;
  }

  if (data.idea) text += `\n${isDE ? 'Deine Idee' : 'Your idea'}:\n${data.idea}\n`;

  text += isDE
    ? `\nIch werde mich innerhalb von 2–3 Werktagen bei dir melden.\n\nHerzliche Grüsse,\nFabienne Meyer\nFABulousART — fabulous-art.ch`
    : `\nI'll get back to you within 2–3 business days.\n\nWarm regards,\nFabienne Meyer\nFABulousART — fabulous-art.ch`;

  return text;
}