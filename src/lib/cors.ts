/**
 * CORS utility for Labonnadhara API routes.
 *
 * Strategy:
 * - Web browser origins are validated against an env-controlled allowlist.
 * - Native mobile app requests (no Origin header) are passed through; auth is
 *   handled by Bearer JWT, not CORS.
 * - Wildcard '*' is never returned — origins are always explicitly echoed.
 * - CORS is not treated as an authentication mechanism; every sensitive route
 *   still requires a valid session / Bearer token.
 */

const ALLOWED_ORIGINS: readonly string[] = (() => {
  const origins: string[] = [];

  // Always allow the canonical site URL(s)
  if (process.env.NEXTAUTH_URL)
    origins.push(process.env.NEXTAUTH_URL.replace(/\/$/, ''));
  if (process.env.NEXT_PUBLIC_SITE_URL)
    origins.push(process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''));

  // Explicitly authorised additional origins (comma-separated env var)
  const extra = process.env.CORS_ALLOWED_ORIGINS ?? '';
  extra
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => origins.push(o));

  // Hard-coded production domain as a safe fallback
  origins.push('https://labonnadhara.shop');
  origins.push('https://www.labonnadhara.shop');

  return [...new Set(origins)];
})();

type HeaderRecord = Record<string, string>;

/**
 * Returns CORS response headers for the given Request.
 *
 * @param request    The incoming Request object.
 * @param methods    Allowed HTTP methods (default: "GET,POST,OPTIONS").
 * @param credentialed  Set true for cookie / NextAuth-session routes.
 */
export function getCorsHeaders(
  request: Request,
  methods = 'GET,POST,OPTIONS',
  credentialed = false,
): HeaderRecord {
  const origin = request.headers.get('origin');

  // No Origin header → native mobile / server-to-server call.
  // These don't need CORS headers; auth is enforced by Bearer JWT.
  if (!origin) {
    return {
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };
  }

  const normalised = origin.replace(/\/$/, '');
  const isAllowed = ALLOWED_ORIGINS.includes(normalised);

  // Echo the specific origin when allowed; fall back to primary domain otherwise.
  const allowOrigin = isAllowed
    ? normalised
    : (ALLOWED_ORIGINS[0] ?? 'https://labonnadhara.shop');

  const headers: HeaderRecord = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
    'Access-Control-Max-Age': '86400',
  };

  if (credentialed && isAllowed) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * CORS headers for mobile API endpoints (non-credentialed, Bearer-JWT auth).
 * Native app clients typically send no Origin header — that case is handled
 * gracefully without CORS headers.
 */
export function mobileCorsHeaders(request: Request): HeaderRecord {
  return getCorsHeaders(
    request,
    'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    false,
  );
}

/**
 * CORS headers for browser-only endpoints (credentialed, NextAuth sessions).
 */
export function webCorsHeaders(request: Request): HeaderRecord {
  return getCorsHeaders(request, 'GET,POST,OPTIONS', true);
}

