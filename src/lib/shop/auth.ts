import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface ShopAuthEnv {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_AUTH_BYPASS?: string;
  DEV_USER_EMAIL?: string;
}

export interface AuthenticatedUser {
  email: string;
  payload?: JWTPayload;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function isLocalDevBypass(request: Request, env: ShopAuthEnv): boolean {
  if (env.DEV_AUTH_BYPASS !== 'true') return false;
  const hostname = new URL(request.url).hostname.toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function normalizeTeamDomain(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
}

export async function authenticateShopRequest(
  request: Request,
  env: ShopAuthEnv,
): Promise<AuthenticatedUser> {
  if (isLocalDevBypass(request, env)) {
    return { email: (env.DEV_USER_EMAIL?.trim() || 'lokal@fabulous-art.ch').toLowerCase() };
  }

  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN || '');
  const audience = env.ACCESS_AUD?.trim();
  if (!teamDomain || !audience) {
    throw new Error('Cloudflare Access ist nicht vollständig konfiguriert.');
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new Error('Cloudflare-Access-Token fehlt.');

  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer: teamDomain,
    audience,
  });

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) throw new Error('Im Access-Token fehlt die E-Mail-Adresse.');
  return { email, payload };
}
