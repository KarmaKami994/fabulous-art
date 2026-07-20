import { describe, expect, it } from 'vitest';
import { authenticateShopRequest, isLocalDevBypass } from '../src/lib/shop/auth';

describe('Verkaufstool-Authentifizierung', () => {
  it('erlaubt den Entwicklungs-Bypass nur auf localhost', async () => {
    const env = { DEV_AUTH_BYPASS: 'true', DEV_USER_EMAIL: 'LOCAL@EXAMPLE.CH' };
    const request = new Request('http://127.0.0.1:8788/api/verkauf/dashboard');

    expect(isLocalDevBypass(request, env)).toBe(true);
    await expect(authenticateShopRequest(request, env)).resolves.toEqual({
      email: 'local@example.ch',
    });
  });

  it('aktiviert den Entwicklungs-Bypass nicht auf einer öffentlichen Domain', async () => {
    const env = { DEV_AUTH_BYPASS: 'true', DEV_USER_EMAIL: 'local@example.ch' };
    const request = new Request('https://www.fabulous-art.ch/api/verkauf/dashboard');

    expect(isLocalDevBypass(request, env)).toBe(false);
    await expect(authenticateShopRequest(request, env)).rejects.toThrow(
      'Cloudflare Access ist nicht vollständig konfiguriert.',
    );
  });
});
