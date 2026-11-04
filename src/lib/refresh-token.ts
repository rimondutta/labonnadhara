/**
 * Secure Mobile Refresh Token System
 *
 * Architecture:
 * - Access tokens: 7-day JWT (short-lived, stateless)
 * - Refresh tokens: 30-day opaque tokens stored in Redis (revocable, rotatable)
 * - Atomic Token Rotation: each /refresh call consumes the token atomically using Redis GETDEL
 * - Replay Detection: previously consumed tokens are tracked in a 5-minute replay window;
 *   if an already-consumed token is presented again, ALL active sessions for that user
 *   are immediately revoked (RFC 6749 / RFC 6819 BCP compliant)
 * - Revocation: logout and account security events purge all tokens for a user
 *
 * Redis key scheme:
 *   refresh:token:<tokenId>     → JSON { userId, hash }   (TTL: 30 days)
 *   refresh:consumed:<tokenId>  → userId                  (TTL: 5 minutes replay window)
 *   refresh:user:<userId>       → Redis Set of active tokenIds (TTL: 30 days)
 *
 * Security properties:
 * - Only the SHA-256 hash of the raw secret bytes is persisted in Redis
 * - Tokens are single-use with atomic Redis GETDEL consumption (race condition proof)
 * - Graceful degradation: if Redis is unavailable, refresh tokens are skipped;
 *   existing 7-day access tokens continue to work
 */

import { randomBytes, createHash } from 'node:crypto';
import { redis, hasRedis } from '@/lib/redis';

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REPLAY_WINDOW_SECONDS = 5 * 60; // 5 minutes

interface StoredRefreshToken {
  userId: string;
  hash: string; // SHA-256 of the raw secret bytes
}

export type RefreshResult =
  | { success: true; userId: string }
  | { success: false; replay: true; userId?: string }
  | { success: false; replay: false };

/**
 * Creates and persists a new refresh token for the given user.
 *
 * @returns Opaque token string in format `<tokenId>.<rawBytes>`, or null
 *          when Redis is unavailable (graceful degradation).
 */
export async function createRefreshToken(userId: string): Promise<string | null> {
  if (!hasRedis || !redis) return null;

  const tokenId  = randomBytes(16).toString('hex'); // 32 hex chars — the lookup key
  const rawBytes = randomBytes(32).toString('hex'); // 64 hex chars — the secret part
  const hash     = createHash('sha256').update(rawBytes).digest('hex');

  const payload: StoredRefreshToken = { userId, hash };
  const tokenKey = `refresh:token:${tokenId}`;
  const userKey  = `refresh:user:${userId}`;

  try {
    // Store hashed payload with TTL
    await redis.setex(tokenKey, REFRESH_TTL_SECONDS, JSON.stringify(payload));

    // Maintain a user-scoped index for bulk revocation (logout)
    await redis.sadd(userKey, tokenId);
    await redis.expire(userKey, REFRESH_TTL_SECONDS);

    // Return <tokenId>.<rawBytes> as the opaque token shown to the client once
    return `${tokenId}.${rawBytes}`;
  } catch (err) {
    console.error('[refresh-token] Failed to store refresh token:', err);
    return null;
  }
}

/**
 * Validates and consumes a refresh token atomically (single-use rotation).
 *
 * Uses Redis GETDEL to guarantee atomicity. If concurrent requests are sent
 * with the same token, only the first request receives the token data; all
 * subsequent requests receive null.
 *
 * If a token is presented after having already been consumed, a replay attack
 * is identified, triggering automatic revocation of all active sessions for that user.
 *
 * @param opaqueToken  Token returned by createRefreshToken / previous refresh.
 * @returns RefreshResult with status, userId, and replay indicator.
 */
export async function consumeRefreshToken(opaqueToken: string): Promise<string | null> {
  if (!hasRedis || !redis) return null;

  const dot = opaqueToken.indexOf('.');
  if (dot === -1) return null;

  const tokenId  = opaqueToken.slice(0, dot);
  const rawBytes = opaqueToken.slice(dot + 1);
  if (!tokenId || !rawBytes) return null;

  const tokenKey    = `refresh:token:${tokenId}`;
  const consumedKey = `refresh:consumed:${tokenId}`;

  try {
    // 1. Atomic consumption: GETDEL fetches and removes the active token key in one step
    const raw = await redis.getdel<string>(tokenKey);

    // 2. If the active token does not exist, check the replay detection cache
    if (!raw) {
      const replayedUserId = await redis.get<string>(consumedKey);
      if (replayedUserId) {
        // TOKEN REPLAY ATTACK DETECTED!
        // The token was already consumed previously within the replay window.
        // As mandated by RFC 6749 Section 10.4 and RFC 6819 Section 5.2.2.3,
        // revoke all tokens in this user's session family immediately.
        console.warn(
          `[SECURITY ALERT] Refresh token replay detected for tokenId ${tokenId}! Revoking all sessions for user ${replayedUserId}.`
        );
        await revokeAllUserRefreshTokens(replayedUserId);
      }
      return null;
    }

    let stored: StoredRefreshToken;
    try {
      stored = typeof raw === 'object'
        ? (raw as unknown as StoredRefreshToken)
        : (JSON.parse(raw) as StoredRefreshToken);
    } catch {
      return null;
    }

    // Verify hash
    const incomingHash = createHash('sha256').update(rawBytes).digest('hex');
    if (incomingHash !== stored.hash) {
      return null;
    }

    // 3. Record in replay detection window (5 minutes)
    await redis.setex(consumedKey, REPLAY_WINDOW_SECONDS, stored.userId);

    // 4. Remove from the user's active tokens set
    try {
      await redis.srem(`refresh:user:${stored.userId}`, tokenId);
    } catch {
      // Non-critical: token is already deleted via GETDEL
    }

    return stored.userId;
  } catch (err) {
    console.error('[refresh-token] Validation error:', err);
    return null;
  }
}

/**
 * Revokes ALL refresh tokens for a user (logout / account security event / replay mitigation).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  if (!hasRedis || !redis) return;

  const userKey = `refresh:user:${userId}`;
  try {
    const tokenIds = (await redis.smembers(userKey)) as string[];
    if (tokenIds && tokenIds.length > 0) {
      const tokenKeys = tokenIds.map((id) => `refresh:token:${id}`);
      const consumedKeys = tokenIds.map((id) => `refresh:consumed:${id}`);
      await redis.del(...tokenKeys, ...consumedKeys);
    }
    await redis.del(userKey);
  } catch (err) {
    console.error('[refresh-token] Failed to revoke all tokens for user:', userId, err);
  }
}
