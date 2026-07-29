/**
 * Azure Entra ID token fetcher for PostgreSQL Managed Identity auth.
 * Calls the Azure Instance Metadata Service (IMDS) — only available inside
 * Azure App Service / VM. Never called on Replit or local dev.
 *
 * Token is cached in-process and refreshed 5 minutes before expiry.
 * pg.Pool calls getEntraToken() as an async password function, so each
 * new connection automatically gets a fresh token when needed.
 */

interface TokenCache {
  token: string;
  expiresAt: number; // unix milliseconds
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const IMDS_URL =
  'http://169.254.169.254/metadata/identity/oauth2/token' +
  '?api-version=2019-08-01' +
  '&resource=https%3A%2F%2Fossrdbms-aad.database.windows.net';

let tokenCache: TokenCache | null = null;

export async function getEntraToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still fresh
  if (tokenCache && tokenCache.expiresAt - now > REFRESH_BUFFER_MS) {
    return tokenCache.token;
  }

  console.log('[EntraToken] Fetching new token from Azure IMDS...');

  const res = await fetch(IMDS_URL, {
    headers: { Metadata: 'true' },
    signal: AbortSignal.timeout(10_000), // 10s timeout
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `[EntraToken] IMDS token fetch failed: HTTP ${res.status} — ${body}`
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_on: string; // unix seconds as string
  };

  tokenCache = {
    token: data.access_token,
    expiresAt: parseInt(data.expires_on, 10) * 1000,
  };

  const expiresInMin = Math.round((tokenCache.expiresAt - now) / 60_000);
  console.log(`[EntraToken] Token fetched. Expires in ~${expiresInMin} minutes.`);

  return tokenCache.token;
}

/** For the admin status panel — returns cache state without fetching */
export function getTokenStatus(): {
  cached: boolean;
  expiresInMs?: number;
  expiresInMin?: number;
} {
  if (!tokenCache) return { cached: false };
  const expiresInMs = tokenCache.expiresAt - Date.now();
  return {
    cached: true,
    expiresInMs,
    expiresInMin: Math.round(expiresInMs / 60_000),
  };
}
