import crypto from 'crypto';

/**
 * Returns the secret key for signing invoice access tokens.
 * Uses INVOICE_SECRET if configured, otherwise falls back to NEXTAUTH_SECRET.
 */
function getInvoiceSecret(): string {
  const secret = process.env.INVOICE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Invoice signature secret not configured (requires INVOICE_SECRET or NEXTAUTH_SECRET).');
  }
  return secret;
}

/**
 * Generates an authoritative HMAC-SHA256 signature for an order ID.
 */
export function generateInvoiceToken(orderId: string): string {
  const secret = getInvoiceSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(String(orderId).trim())
    .digest('hex');
}

/**
 * Verifies the invoice token using timing-safe comparison to prevent timing attacks.
 */
export function verifyInvoiceToken(orderId: string, token?: string | null): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const expectedToken = generateInvoiceToken(orderId);
    const expectedBuf = Buffer.from(expectedToken, 'utf-8');
    const providedBuf = Buffer.from(token.trim(), 'utf-8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
