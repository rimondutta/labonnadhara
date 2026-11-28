/**
 * Centralized, Edge-safe client IP extraction and IPv4/IPv6 validation.
 *
 * Proxy trust model:
 * - On Vercel (VERCEL=1 / VERCEL_ENV set), Vercel overwrites `x-vercel-forwarded-for`
 *   and `x-real-ip` at the edge from the real TCP socket address.
 * - Behind Cloudflare (`TRUST_PROXY_PROVIDER=cloudflare`), `cf-connecting-ip` is set by Cloudflare edge.
 * - Behind a standard single reverse proxy (`TRUST_PROXY_PROVIDER=nginx` or fallback), `x-real-ip` is
 *   preferred over attacker-prependable `x-forwarded-for`. When falling back to `x-forwarded-for`,
 *   take the rightmost valid non-spoofable proxy hop only when explicitly configured, or validate carefully.
 */

const IPV4_SEGMENT = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_REGEX = new RegExp(`^${IPV4_SEGMENT}(\\.${IPV4_SEGMENT}){3}$`);

// Validates standard, compressed (::), and IPv4-mapped IPv6 literals
const IPV6_REGEX =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}\d){0,1}\d)\.){3}(25[0-5]|(2[0-4]|1{0,1}\d){0,1}\d))$/;

export function isValidIpAddress(candidate: string): boolean {
  if (!candidate || candidate.length > 64) return false;
  return IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate);
}

/**
 * Normalizes a raw IP candidate (strips brackets, zones, or IPv4 :port) and validates IPv4/IPv6 syntax.
 */
export function normalizeIpCandidate(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;

  // Strip IPv6 bracket wrapper `[::1]:1234` -> `::1`
  if (value.startsWith('[')) {
    const closeIdx = value.indexOf(']');
    if (closeIdx > 1) {
      value = value.slice(1, closeIdx);
    }
  } else {
    // Strip optional IPv4 :port (single colon, no other colons)
    const firstColon = value.indexOf(':');
    const lastColon = value.lastIndexOf(':');
    if (firstColon > 0 && firstColon === lastColon) {
      const maybeHost = value.slice(0, firstColon);
      const maybePort = value.slice(firstColon + 1);
      if (/^\d+$/.test(maybePort) && IPV4_REGEX.test(maybeHost)) {
        value = maybeHost;
      }
    }
  }

  // Strip optional IPv6 scope zone ID (e.g. fe80::1%eth0)
  const zoneIdx = value.indexOf('%');
  if (zoneIdx > 0) {
    value = value.slice(0, zoneIdx);
  }

  // Unwrap IPv4-mapped IPv6 prefix ::ffff:192.0.2.1
  if (value.toLowerCase().startsWith('::ffff:')) {
    const v4Part = value.slice(7);
    if (IPV4_REGEX.test(v4Part)) {
      return v4Part;
    }
  }

  return isValidIpAddress(value) ? value : null;
}

function getHeaderCaseInsensitive(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string
): string | null {
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const map = headers as Record<string, string | string[] | undefined>;
  const raw = map[name] ?? map[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === 'string' ? raw : null;
}

/**
 * Resolves the trusted client IP address from a Request or Headers object.
 * Prioritizes platform-authenticated headers over attacker-controllable X-Forwarded-For values.
 */
export function getClientIpFromHeaders(
  headers: Headers | Record<string, string | string[] | undefined>
): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_REGION);
  const proxyProvider = (process.env.TRUST_PROXY_PROVIDER || '').toLowerCase();

  // 1. Vercel platform-populated headers (stripped/set by Vercel edge network)
  const vercelForwarded = getHeaderCaseInsensitive(headers, 'x-vercel-forwarded-for');
  if (isVercel && vercelForwarded) {
    const first = normalizeIpCandidate(vercelForwarded.split(',')[0]);
    if (first) return first;
  }

  // 2. Cloudflare edge header (only when configured on Cloudflare, or if x-vercel-forwarded-for absent + CF)
  if (proxyProvider === 'cloudflare') {
    const cfIp = normalizeIpCandidate(getHeaderCaseInsensitive(headers, 'cf-connecting-ip'));
    if (cfIp) return cfIp;
  }

  // 3. Even when running behind Vercel in production (without VERCEL=1 in custom preview mocks),
  // x-vercel-forwarded-for and x-real-ip are single-hop headers set by trusted edge proxies.
  if (vercelForwarded && isVercel) {
    const ip = normalizeIpCandidate(vercelForwarded.split(',')[0]);
    if (ip) return ip;
  }

  const realIp = normalizeIpCandidate(getHeaderCaseInsensitive(headers, 'x-real-ip'));
  if (realIp) {
    return realIp;
  }

  // 4. Rightmost vs leftmost X-Forwarded-For handling:
  // A proxy appends the true peer IP to the right of any spoofed client X-Forwarded-For header.
  // Taking the rightmost valid IP prevents bypassing rate limits by prepending `X-Forwarded-For: 1.2.3.4`.
  const xff = getHeaderCaseInsensitive(headers, 'x-forwarded-for');
  if (xff) {
    const hops = xff.split(',').map((part) => normalizeIpCandidate(part)).filter((ip): ip is string => Boolean(ip));
    if (hops.length > 0) {
      return isVercel ? hops[0] : hops[hops.length - 1];
    }
  }

  return '127.0.0.1';
}

export function getClientIp(req: Request | { headers: Headers | Record<string, string | string[] | undefined> }): string {
  return getClientIpFromHeaders(req.headers);
}
