import { jwtVerify } from 'jose';
import { getJwtSecretKey } from './jwt-secret';

export const JWT_ISSUER = 'labonnadhara-api';
export const JWT_AUDIENCE = 'labonnadhara-mobile';

export const ALLOWED_ROLES = ['admin', 'manager', 'customer'] as const;
export type AppRole = (typeof ALLOWED_ROLES)[number];

export interface VerifiedBearerUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

export interface VerifiedBearerSession {
  user: VerifiedBearerUser;
}

/**
 * Verifies a Bearer JWT strictly using HMAC-SHA256 signature, expiration,
 * issuer, audience, and allowed role claims. Edge-runtime safe (uses jose).
 */
export async function verifyBearerJwt(token: string): Promise<VerifiedBearerUser | null> {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (trimmed.length < 16 || trimmed.length > 4096) return null;

  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(trimmed, secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      requiredClaims: ['id', 'role', 'exp', 'iat'],
    });

    const id = typeof payload.id === 'string' ? payload.id.trim() : '';
    const role = typeof payload.role === 'string' ? payload.role : '';
    if (!id || !ALLOWED_ROLES.includes(role as AppRole)) {
      return null;
    }

    return {
      id,
      email: typeof payload.email === 'string' ? payload.email : '',
      name: typeof payload.name === 'string' ? payload.name : '',
      role: role as AppRole,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts raw Bearer token from an Authorization header if formatted as `Bearer <token>`.
 * Case-insensitive scheme per RFC 7235.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token ? token : null;
}

/**
 * Verifies an HTTP Request's Authorization: Bearer token and returns a typed session.
 */
export async function verifyBearerRequest(req: Request): Promise<VerifiedBearerSession | null> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) return null;
  const user = await verifyBearerJwt(token);
  if (!user) return null;
  return { user };
}
