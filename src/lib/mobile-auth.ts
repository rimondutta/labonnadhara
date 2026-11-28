import {
  verifyBearerJwt,
  verifyBearerRequest,
  VerifiedBearerUser,
  VerifiedBearerSession,
} from './bearer-token';

export type MobileUserPayload = VerifiedBearerUser;
export type MobileSession = VerifiedBearerSession;

export { verifyBearerJwt };

/**
 * Extracts and verifies a Bearer JWT from the Authorization header.
 * Enforces HS256 signature, expiry, issuer, audience, and valid role claims.
 */
export async function getBearerSession(req: Request): Promise<MobileSession | null> {
  return verifyBearerRequest(req);
}
