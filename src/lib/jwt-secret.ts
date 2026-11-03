/**
 * Centralized Auth / JWT Secret Management
 *
 * Enforces strict environment variable validation for JWT signing and verification.
 * Evaluates lazily at runtime when called (NOT at module top level), so `next build` in CI passes.
 * Under no circumstances does this module fall back to a hardcoded or default secret.
 */

export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET environment variable is missing or empty. ' +
      'Authentication, token signing, and token verification cannot proceed without an authoritative secret.'
    );
  }
  return secret.trim();
}

/** Alias for getAuthSecret for backwards compatibility */
export const getJwtSecret = getAuthSecret;

/**
 * Returns the secret as a Uint8Array for JOSE / Web Crypto APIs
 */
export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}
