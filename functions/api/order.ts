/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Pages Function — POST /api/order
 *
 * Request flow (order matters — durability first, notification second):
 *   1. Rate-limit per IP (best-effort, per-isolate; the authoritative limit
 *      is a Cloudflare WAF rate-limiting rule — see README "Operations")
 *   2. Verify Cloudflare Turnstile token — FAIL CLOSED if unconfigured
 *   3. Validate + length-cap all fields (raw values kept; HTML-escaping
 *      happens only inside the email templates, at the sink)
 *   4. Recompute the price server-side from src/data/pricing.json —
 *      client-submitted prices are ignored entirely
 *   5. Upload reference image to R2 under orders/{orderId}/
 *   6. Persist orders/{orderId}/order.json to R2  ← system of record
 *   7. Send both emails via Mailjet (one retry). If email still fails, the
 *      order is already durable, so the customer still gets a success
 *      response; the failure is logged for follow-up.
 *
 * Environment variables (Cloudflare Pages dashboard):
 *   MAILJET_API_KEY, MAILJET_SECRET_KEY, MAILJET_FROM_EMAIL,
 *   MAILJET_FROM_NAME, FABIENNE_EMAIL, TURNSTILE_SECRET (required!)
 *
 * R2 binding (wrangler.toml / dashboard): ORDER_IMAGES
 */
import { getQuote, PACKAGES, SIZES, SHIPPING_ZONES, type Quote } from '../../src/lib/pricing';
import { cleanText, FIELD_LIMITS, EMAIL_RE } from '../../src/lib/sanitize';
import {
  buildOwnerSubject,
  buildOwnerHtml,
  buildOwnerText,
  buildCustomerSubject,
  buildCustomerHtml,
  buildCustomerText,
  type OrderEmailInput,
} from './_emails';

interface Env {
  ORDER_IMAGES: R2Bucket;
  MAILJET_API_KEY: string;
  MAILJET_SECRET_KEY: string;
  MAILJET_FROM_EMAIL: string;
  MAILJET_FROM_NAME: string;
  FABIENNE_EMAIL: string;
  TURNSTILE_SECRET: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — keep in sync with CommissionWizards.astro
const MAX_REQUEST_SIZE = 12 * 1024 * 1024; // image + form overhead

// --- Rate limiting (best-effort, per-isolate — see README for the WAF rule) ---
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 3600; // seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  // Evict expired entries so the map cannot grow unboundedly.
  if (rateLimitMap.size > 1000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// --- Turnstile: FAIL CLOSED ---
// A missing secret is a deployment error, not a license to skip bot checks.
async function verifyTurnstile(token: string, secret: string | undefined, ip: string): Promise<boolean> {
  if (!secret) {
    console.error('TURNSTILE_SECRET is not configured — refusing request (fail closed).');
    return false;
  }
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch (err) {
    console.error('Turnstile verification request failed:', err);
    return false;
  }
}

function json(status: number, body: Record<string, unknown>, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function corsHeadersFor(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://www.fabulous-art.ch', 'https://fabulous-art.ch'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const cors = corsHeadersFor(request);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  // --- Total request size cap (cheap early reject) ---
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_REQUEST_SIZE) {
    return json(413, { success: false, error: 'Anfrage zu gross (max. 10 MB Bild)' }, cors);
  }

  // --- Rate limiting (best-effort layer) ---
  if (!checkRateLimit(clientIP)) {
    return json(429, { success: false, error: 'Zu viele Anfragen. Bitte versuche es später erneut.' }, cors);
  }

  try {
    const formData = await request.formData();

    // --- Turnstile ---
    const turnstileToken = (formData.get('cf-turnstile-response') as string) || '';
    const turnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, clientIP);
    if (!turnstileValid) {
      return json(403, { success: false, error: 'Bot-Überprüfung fehlgeschlagen. Bitte versuche es erneut.' }, cors);
    }

    // --- Extract order data (raw, length-capped; NO escaping here) ---
    const orderData: Record<string, string> = {};
    const textFields: Array<keyof typeof FIELD_LIMITS> = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'zip', 'city', 'country', 'idea', 'message',
    ];
    for (const field of textFields) {
      const value = formData.get(field);
      if (value && typeof value === 'string') {
        const cleaned = cleanText(value, FIELD_LIMITS[field]);
        if (cleaned) orderData[field] = cleaned;
      }
    }
    // Enum-like fields: validated against allowlists below.
    for (const field of ['package', 'size', 'format', 'people', 'shipping', 'locale'] as const) {
      const value = formData.get(field);
      if (value && typeof value === 'string') orderData[field] = cleanText(value, 20);
    }

    // --- Validate required fields ---
    const required = ['package', 'size', 'shipping', 'firstName', 'lastName', 'email', 'address', 'zip', 'city', 'country'];
    for (const field of required) {
      if (!orderData[field]) {
        return json(400, { success: false, error: `Pflichtfeld fehlt: ${field}` }, cors);
      }
    }

    // --- Validate enums ---
    if (!(PACKAGES as string[]).includes(orderData.package)) {
      return json(400, { success: false, error: 'Ungültiges Paket' }, cors);
    }
    if (!(SIZES as string[]).includes(orderData.size)) {
      return json(400, { success: false, error: 'Ungültige Grösse' }, cors);
    }
    if (!(SHIPPING_ZONES as string[]).includes(orderData.shipping)) {
      return json(400, { success: false, error: 'Ungültiges Versandziel' }, cors);
    }
    if (orderData.format && !['horizontal', 'vertical'].includes(orderData.format)) {
      delete orderData.format;
    }
    const locale = orderData.locale === 'en' ? 'en' : 'de';
    orderData.locale = locale;

    // --- Validate email ---
    if (!EMAIL_RE.test(orderData.email)) {
      return json(400, { success: false, error: 'Ungültige E-Mail-Adresse' }, cors);
    }

    // --- Authoritative server-side price computation ---
    // Client-submitted prices are deliberately ignored: the emailed quote is
    // always computed here from src/data/pricing.json. getQuote() returns
    // null for unavailable combinations (e.g. Creative A0 with 3–4 people) —
    // those orders are rejected, never priced at CHF 0.
    const quote: Quote | null = getQuote(orderData.package, orderData.size, orderData.people ?? '1', orderData.shipping);
    if (!quote) {
      return json(400, { success: false, error: 'Diese Kombination ist nicht verfügbar.' }, cors);
    }

    // --- Order ID: sortable date prefix + random suffix ---
    const orderId = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;

    // --- Image upload to R2 (orders/{orderId}/...) ---
    let imageKey: string | null = null;
    let imageName: string | null = null;
    const imageFile = formData.get('image') as File | null;

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_TYPES.includes(imageFile.type)) {
        return json(400, { success: false, error: 'Nur JPG, PNG oder WEBP erlaubt' }, cors);
      }
      if (imageFile.size > MAX_FILE_SIZE) {
        return json(400, { success: false, error: 'Datei zu gross (max. 10 MB)' }, cors);
      }

      const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      imageKey = `orders/${orderId}/${sanitizedName}`;

      await env.ORDER_IMAGES.put(imageKey, imageFile.stream(), {
        httpMetadata: { contentType: imageFile.type },
        customMetadata: {
          orderId,
          originalName: imageFile.name.slice(0, 200),
          uploadedAt: new Date().toISOString(),
        },
      });
      imageName = imageFile.name;
    }

    // --- Persist the order to R2 BEFORE emailing (system of record) ---
    const orderRecord = {
      orderId,
      receivedAt: new Date().toISOString(),
      locale,
      data: orderData,
      quote,
      imageKey,
      imageName,
    };
    await env.ORDER_IMAGES.put(`orders/${orderId}/order.json`, JSON.stringify(orderRecord, null, 2), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { orderId, orderEmail: orderData.email },
    });

    // --- Emails via Mailjet (notification layer; one retry) ---
    const emailInput: OrderEmailInput = { data: orderData, quote, imageName, imageKey, orderId, locale };
    const mailjetBody = JSON.stringify({
      Messages: [
        {
          From: { Email: env.MAILJET_FROM_EMAIL, Name: env.MAILJET_FROM_NAME || 'FABulousART' },
          To: [{ Email: env.FABIENNE_EMAIL, Name: 'Fabienne Meyer' }],
          Subject: buildOwnerSubject(emailInput),
          TextPart: buildOwnerText(emailInput),
          HTMLPart: buildOwnerHtml(emailInput),
          ReplyTo: { Email: orderData.email, Name: `${orderData.firstName} ${orderData.lastName}` },
        },
        {
          From: { Email: env.MAILJET_FROM_EMAIL, Name: 'Fabienne Meyer — FABulousART' },
          To: [{ Email: orderData.email, Name: `${orderData.firstName} ${orderData.lastName}` }],
          Subject: buildCustomerSubject(locale),
          TextPart: buildCustomerText(emailInput),
          HTMLPart: buildCustomerHtml(emailInput),
          ReplyTo: { Email: env.FABIENNE_EMAIL, Name: 'Fabienne Meyer' },
        },
      ],
    });

    const sendMail = () =>
      fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)}`,
        },
        body: mailjetBody,
      });

    let mailSent = false;
    try {
      let res = await sendMail();
      if (!res.ok) {
        console.error(`Mailjet attempt 1 failed (${res.status}):`, await res.text());
        res = await sendMail();
        if (!res.ok) console.error(`Mailjet attempt 2 failed (${res.status}):`, await res.text());
      }
      mailSent = res.ok;
    } catch (err) {
      console.error('Mailjet request error:', err);
    }

    if (!mailSent) {
      // The order is durably stored in R2 — do NOT tell the customer it
      // failed (that leads to duplicate submissions). Log loudly instead.
      console.error(`ORDER ${orderId} PERSISTED BUT EMAIL FAILED — check R2 orders/${orderId}/order.json and Mailjet status.`);
    }

    return json(200, { success: true, orderId, message: 'Bestellung erfolgreich übermittelt' }, cors);
  } catch (err) {
    console.error('Order API error:', err);
    return json(500, { success: false, error: 'Interner Serverfehler' }, cors);
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, { status: 204, headers: corsHeadersFor(context.request) });
};
