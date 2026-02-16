/**
 * Cloudflare Pages Function — POST /api/order
 *
 * 1. Empfängt FormData (Auftragsdaten + optionales Bild)
 * 2. Speichert Bild in Cloudflare R2
 * 3. Sendet E-Mail via Mailjet an Fabienne
 *
 * Environment Variables (in Cloudflare Dashboard setzen):
 *   MAILJET_API_KEY      — Mailjet Public Key
 *   MAILJET_SECRET_KEY   — Mailjet Secret Key
 *   MAILJET_FROM_EMAIL   — Absender-Email (z.B. noreply@fabulous-art.ch)
 *   MAILJET_FROM_NAME    — Absender-Name (z.B. "FabulousArt Website")
 *   FABIENNE_EMAIL       — Empfänger (info.fabulousart@gmail.com)
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
}

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.fabulous-art.ch',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const formData = await request.formData();

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
        orderData[field] = value;
      }
    }

    // --- Price data ---
    const priceFields = ['drawingPrice', 'creativePrice', 'packagingPrice', 'shippingPrice', 'totalPrice'];
    for (const field of priceFields) {
      const value = formData.get(field);
      if (value && typeof value === 'string') {
        orderData[field] = value;
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

    // --- Send email via Mailjet ---
    const mailjetResponse = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: env.MAILJET_FROM_EMAIL,
              Name: env.MAILJET_FROM_NAME || 'FabulousArt Website',
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
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.fabulous-art.ch',
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
  let text = `NEUE BESTELLUNG — FabulousArt\n`;
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
